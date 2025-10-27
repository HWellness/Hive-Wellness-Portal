/**
 * Therapist Calendar Onboarding Service
 *
 * Comprehensive calendar setup automation for new therapists including:
 * - Automatic calendar creation during registration
 * - Permission management and sharing
 * - Email notifications and instructions
 * - Error handling and rollback capabilities
 * - Integration with existing onboarding workflow
 */

import { nanoid } from "nanoid";
import { CalendarService, CalendarServiceError, CalendarNotFoundError } from "./calendar-service";
import { emailService } from "./email-service";
import type { IStorage } from "../storage";
import type { TherapistProfile, User } from "../../shared/schema";

export interface CalendarSetupResult {
  success: boolean;
  calendarId?: string;
  googleCalendarId?: string;
  setupStep?: string;
  error?: string;
  retryable?: boolean;
  rollbackRequired?: boolean;
}

export interface CalendarSetupStatus {
  therapistId: string;
  calendarExists: boolean;
  permissionsConfigured: boolean;
  integrationStatus: "pending" | "active" | "error";
  sharePermissions?: {
    therapistEmail: string;
    role: string;
    verified: boolean;
  };
  lastSetupAttempt?: Date;
  errorDetails?: string;
}

export interface BatchSetupResult {
  totalTherapists: number;
  successful: number;
  failed: number;
  skipped: number;
  results: Array<{
    therapistId: string;
    therapistName: string;
    therapistEmail: string;
    success: boolean;
    error?: string;
    calendarId?: string;
  }>;
}

export interface CalendarWelcomeEmailData {
  therapistName: string;
  therapistEmail: string;
  calendarName: string;
  calendarUrl: string;
  googleCalendarId: string;
  accessInstructions: string;
  supportEmail: string;
}

export class TherapistCalendarOnboardingService {
  private calendarService: CalendarService;
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 2000;
  private readonly concurrencyLimit = 3;

  constructor(private storage: IStorage) {
    this.calendarService = new CalendarService();
  }

  /**
   * Delay utility for retry logic
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if an error is retryable
   */
  private isRetryable(error: any): boolean {
    if (error instanceof CalendarServiceError) {
      return error.retryable;
    }

    // Check for specific retryable error patterns
    const retryablePatterns = [
      "quota exceeded",
      "rate limit",
      "temporarily unavailable",
      "internal error",
      "service unavailable",
      "timeout",
      "connection reset",
      "network error",
    ];

    const errorMessage = error.message?.toLowerCase() || "";
    return retryablePatterns.some((pattern) => errorMessage.includes(pattern));
  }

  /**
   * Execute function with retry logic and exponential backoff
   */
  private async setupWithRetry<T>(
    setupFn: () => Promise<T>,
    step: string,
    operationId?: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await setupFn();
        if (attempt > 1) {
          console.log(
            `✅ ${step} succeeded on attempt ${attempt}${operationId ? ` (${operationId})` : ""}`
          );
        }
        return result;
      } catch (error: any) {
        lastError = error;

        if (attempt < this.maxRetries && this.isRetryable(error)) {
          const backoffMs = this.retryDelayMs * Math.pow(2, attempt - 1);
          console.warn(
            `⚠️ ${step} failed on attempt ${attempt}${operationId ? ` (${operationId})` : ""}: ${error.message}. Retrying in ${backoffMs}ms...`
          );
          await this.delay(backoffMs);
          continue;
        }

        // Log final failure without sensitive info
        const sanitizedError = error.message
          ? error.message.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email]")
          : "Unknown error";
        console.error(
          `❌ ${step} failed after ${attempt} attempts${operationId ? ` (${operationId})` : ""}: ${sanitizedError}`
        );
        throw error;
      }
    }

    throw lastError!;
  }

  /**
   * Reconcile existing calendar that's not in active state
   */
  private async reconcileExistingCalendar(
    existingCalendar: any,
    therapistEmail: string
  ): Promise<CalendarSetupResult> {
    console.log(
      `🔄 Reconciling existing calendar ${existingCalendar.id} for therapist ${existingCalendar.therapistId}`
    );

    try {
      // Try to verify the calendar still exists in Google
      const calendarExists = await this.setupWithRetry(
        () => this.calendarService.verifyCalendarAccess(existingCalendar.googleCalendarId),
        "Calendar verification",
        existingCalendar.therapistId
      );

      if (calendarExists) {
        // Calendar exists, update status to active
        await this.storage.updateTherapistCalendar(existingCalendar.id, {
          integrationStatus: "active",
          updatedAt: new Date(),
        });

        console.log(
          `✅ Reconciled existing calendar for therapist ${existingCalendar.therapistId}`
        );
        return {
          success: true,
          calendarId: existingCalendar.id,
          googleCalendarId: existingCalendar.googleCalendarId,
          setupStep: "reconciled",
        };
      } else {
        // Calendar doesn't exist, mark as error and create new one
        await this.storage.updateTherapistCalendar(existingCalendar.id, {
          integrationStatus: "error",
          updatedAt: new Date(),
        });

        // Create new calendar
        return await this.createNewCalendar(existingCalendar.therapistId, therapistEmail);
      }
    } catch (error: any) {
      console.error(
        `❌ Calendar reconciliation failed for therapist ${existingCalendar.therapistId}:`,
        error
      );
      return {
        success: false,
        error: error.message,
        retryable: this.isRetryable(error),
        setupStep: "reconciliation_failed",
      };
    }
  }

  /**
   * Create new calendar with retry logic
   */
  private async createNewCalendar(
    therapistId: string,
    therapistEmail: string
  ): Promise<CalendarSetupResult> {
    const result: CalendarSetupResult = {
      success: false,
      setupStep: "calendar_creation",
    };

    try {
      const calendarData = await this.setupWithRetry(
        () => this.calendarService.createManagedCalendar(therapistId, therapistEmail),
        "Calendar creation",
        therapistId
      );

      result.calendarId = calendarData.id;
      result.googleCalendarId = calendarData.googleCalendarId;

      return {
        success: true,
        calendarId: calendarData.id,
        googleCalendarId: calendarData.googleCalendarId,
        setupStep: "calendar_created",
      };
    } catch (error: any) {
      result.error = error.message;
      result.retryable = this.isRetryable(error);
      result.rollbackRequired = true;
      return result;
    }
  }

  /**
   * Main calendar setup workflow for new therapists
   * Called during therapist registration/approval process
   */
  async setupTherapistCalendar(
    therapistId: string,
    therapistEmail: string
  ): Promise<CalendarSetupResult> {
    // Sanitize email for logging
    const sanitizedEmail = therapistEmail.replace(/(.{2}).*(@.*)/, "$1***$2");
    console.log(`🗓️ Starting calendar setup for therapist ${therapistId} (${sanitizedEmail})`);

    const result: CalendarSetupResult = {
      success: false,
      setupStep: "initialization",
    };

    try {
      // Step 1: Validate therapist exists and get details
      result.setupStep = "validation";
      const therapist = await this.setupWithRetry(
        () => this.validateTherapist(therapistId),
        "Therapist validation",
        therapistId
      );

      if (!therapist) {
        return {
          ...result,
          error: `Therapist not found`,
          retryable: false,
        };
      }

      // Step 2: Check if calendar already exists and handle idempotency
      result.setupStep = "existence_check";
      const existingCalendar = await this.storage.getTherapistCalendar(therapistId);

      if (existingCalendar) {
        if (existingCalendar.integrationStatus === "active") {
          console.log(`📅 Active calendar already exists for therapist ${therapistId}`);
          return {
            success: true,
            calendarId: existingCalendar.id,
            googleCalendarId: existingCalendar.googleCalendarId || undefined,
            setupStep: "already_exists",
          };
        } else {
          // Reconcile existing calendar that's not active
          console.log(
            `🔄 Found existing calendar in ${existingCalendar.integrationStatus} state, reconciling...`
          );
          const reconcileResult = await this.reconcileExistingCalendar(
            existingCalendar,
            therapistEmail
          );
          if (reconcileResult.success) {
            // Continue with profile update and notifications
            result.calendarId = reconcileResult.calendarId;
            result.googleCalendarId = reconcileResult.googleCalendarId;
          } else {
            return reconcileResult;
          }
        }
      } else {
        // Step 3: Create new managed calendar
        result.setupStep = "calendar_creation";
        const createResult = await this.createNewCalendar(therapistId, therapistEmail);
        if (!createResult.success) {
          return createResult;
        }

        result.calendarId = createResult.calendarId;
        result.googleCalendarId = createResult.googleCalendarId;
      }

      // Step 4: Update therapist profile with calendar ID
      result.setupStep = "profile_update";
      await this.setupWithRetry(
        () =>
          this.updateTherapistProfileWithCalendar(therapistId, {
            googleCalendarId: result.googleCalendarId,
          }),
        "Profile update",
        therapistId
      );

      // Step 5: Send welcome email with calendar instructions (non-critical)
      result.setupStep = "email_notification";
      try {
        await this.sendCalendarWelcomeEmail(therapist, {
          googleCalendarId: result.googleCalendarId,
        });
      } catch (emailError: any) {
        console.warn(`⚠️ Welcome email failed for therapist ${therapistId}: ${emailError.message}`);
        // Don't fail the whole setup for email issues
      }

      // Step 6: Send admin notification (non-critical)
      try {
        await this.sendAdminNotification(
          therapist,
          { googleCalendarId: result.googleCalendarId },
          true
        );
      } catch (notificationError: any) {
        console.warn(
          `⚠️ Admin notification failed for therapist ${therapistId}: ${notificationError.message}`
        );
      }

      result.success = true;
      result.setupStep = "completed";

      console.log(`✅ Calendar setup completed for therapist ${therapistId}`);
      return result;
    } catch (error: any) {
      // Sanitize error message
      const sanitizedError = error.message
        ? error.message.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email]")
        : "Unknown error";
      console.error(
        `❌ Calendar setup failed for therapist ${therapistId} at step ${result.setupStep}: ${sanitizedError}`
      );

      result.error = sanitizedError;
      result.retryable = this.isRetryable(error);
      result.rollbackRequired = ["calendar_creation", "profile_update"].includes(
        result.setupStep || ""
      );

      // Perform rollback if required
      if (result.rollbackRequired && result.calendarId) {
        console.log(`🔄 Performing rollback for therapist ${therapistId}`);
        try {
          await this.performRollback(therapistId, result.calendarId, result.googleCalendarId);
        } catch (rollbackError: any) {
          console.error(
            `❌ Rollback failed for therapist ${therapistId}: ${rollbackError.message}`
          );
        }
      }

      // Send admin notification about failure
      try {
        await this.sendAdminNotification(therapist, null, false, result.error);
      } catch (notificationError) {
        console.error("Failed to send failure notification (non-critical)");
      }

      return result;
    }
  }

  /**
   * Perform rollback of calendar setup on failure
   */
  private async performRollback(
    therapistId: string,
    calendarId?: string,
    googleCalendarId?: string
  ): Promise<void> {
    console.log(`🔄 Starting rollback for therapist ${therapistId}`);

    const rollbackActions = [];

    // 1. Delete Google Calendar if it was created
    if (googleCalendarId) {
      rollbackActions.push(
        this.setupWithRetry(
          async () => {
            try {
              await this.calendarService.deleteCalendar(googleCalendarId);
              console.log(`✅ Deleted Google calendar ${googleCalendarId}`);
            } catch (error: any) {
              // Don't fail rollback if calendar doesn't exist
              if (error.message.includes("not found")) {
                console.log(
                  `📝 Google calendar ${googleCalendarId} already deleted or doesn't exist`
                );
              } else {
                throw error;
              }
            }
          },
          "Google calendar deletion",
          therapistId
        )
      );
    }

    // 2. Remove calendar record from database
    if (calendarId) {
      rollbackActions.push(
        this.storage
          .deleteTherapistCalendar(calendarId)
          .then(() => console.log(`✅ Deleted calendar record ${calendarId}`))
          .catch((error: any) =>
            console.warn(`⚠️ Failed to delete calendar record: ${error.message}`)
          )
      );
    }

    // 3. Clear calendar reference from therapist profile
    rollbackActions.push(
      this.storage
        .updateTherapistProfile(therapistId, {
          primaryCalendarId: null,
          calendarPermissionsConfigured: false,
        })
        .then(() => console.log(`✅ Cleared calendar reference from therapist profile`))
        .catch((error: any) =>
          console.warn(`⚠️ Failed to clear profile calendar reference: ${error.message}`)
        )
    );

    // Execute all rollback actions concurrently (best effort)
    await Promise.allSettled(rollbackActions);

    console.log(`✅ Rollback completed for therapist ${therapistId}`);
  }

  /**
   * Simple semaphore implementation for concurrency control
   */
  private createSemaphore(limit: number) {
    let count = 0;
    const waiting: Array<() => void> = [];

    return {
      async acquire<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
          const execute = async () => {
            count++;
            try {
              const result = await fn();
              resolve(result);
            } catch (error) {
              reject(error);
            } finally {
              count--;
              if (waiting.length > 0) {
                const next = waiting.shift()!;
                next();
              }
            }
          };

          if (count < limit) {
            execute();
          } else {
            waiting.push(execute);
          }
        });
      },
    };
  }

  /**
   * Get calendar setup status for a therapist
   */
  async getCalendarStatus(therapistId: string): Promise<CalendarSetupStatus> {
    try {
      const therapist = await this.validateTherapist(therapistId);
      if (!therapist) {
        throw new Error(`Therapist not found`);
      }

      const calendar = await this.storage.getTherapistCalendar(therapistId);

      const status: CalendarSetupStatus = {
        therapistId,
        calendarExists: !!calendar,
        permissionsConfigured:
          calendar?.aclRole === "writer" && calendar?.integrationStatus === "active",
        integrationStatus: calendar?.integrationStatus || "pending",
      };

      if (calendar && therapist.email) {
        status.sharePermissions = {
          therapistEmail: calendar.therapistSharedEmail || therapist.email,
          role: calendar.aclRole || "writer",
          verified: calendar.integrationStatus === "active",
        };
        // Ensure consistent JSON serialization - convert Date to ISO string
        status.lastSetupAttempt = calendar.updatedAt
          ? new Date(calendar.updatedAt).toISOString()
          : undefined;
      }

      return status;
    } catch (error: any) {
      return {
        therapistId,
        calendarExists: false,
        permissionsConfigured: false,
        integrationStatus: "error",
        errorDetails: error.message,
      };
    }
  }

  /**
   * Batch setup calendars for multiple therapists (admin operation)
   */
  async batchSetupCalendars(therapistIds?: string[]): Promise<BatchSetupResult> {
    console.log("🔄 Starting batch calendar setup operation");

    const result: BatchSetupResult = {
      totalTherapists: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      results: [],
    };

    try {
      // Get all therapists or specified ones
      const therapists = therapistIds
        ? await Promise.all(therapistIds.map((id) => this.validateTherapist(id)))
        : await this.getAllTherapistsNeedingCalendars();

      const validTherapists = therapists.filter(Boolean) as (User & {
        therapistProfile?: TherapistProfile;
      })[];
      result.totalTherapists = validTherapists.length;

      console.log(`📊 Found ${result.totalTherapists} therapists for batch calendar setup`);

      if (validTherapists.length === 0) {
        console.log("ℹ️ No therapists need calendar setup");
        return result;
      }

      // Process with concurrency control and rate limiting
      const semaphore = this.createSemaphore(this.concurrencyLimit);
      const batchStartTime = Date.now();

      const promises = validTherapists.map((therapist, index) =>
        semaphore.acquire(async () => {
          // Stagger requests to avoid hitting rate limits
          const delayMs = Math.floor(index / this.concurrencyLimit) * 1500; // 1.5 seconds between batches
          if (delayMs > 0) {
            await this.delay(delayMs);
          }

          const therapistName = `${therapist.firstName} ${therapist.lastName}`;
          const sanitizedEmail = therapist.email?.replace(/(.{2}).*(@.*)/, "$1***$2") || "";

          try {
            // Check if calendar already exists
            const existingCalendar = await this.storage.getTherapistCalendar(therapist.id);

            if (existingCalendar && existingCalendar.integrationStatus === "active") {
              console.log(`⏭️ Skipped ${sanitizedEmail} - calendar already active`);
              return {
                therapistId: therapist.id,
                therapistName,
                therapistEmail: therapist.email || "",
                success: true,
                skipped: true,
                calendarId: existingCalendar.googleCalendarId || undefined,
              };
            }

            // Setup calendar with progress logging
            console.log(`🔄 Processing ${index + 1}/${validTherapists.length}: ${sanitizedEmail}`);
            const setupResult = await this.setupTherapistCalendar(
              therapist.id,
              therapist.email || ""
            );

            // Add rate limiting between individual operations
            await this.delay(1200); // 1.2 seconds minimum between operations

            return {
              therapistId: therapist.id,
              therapistName,
              therapistEmail: therapist.email || "",
              success: setupResult.success,
              error: setupResult.error,
              calendarId: setupResult.googleCalendarId,
              skipped: false,
            };
          } catch (error: any) {
            // Sanitize error message
            const sanitizedError = error.message
              ? error.message.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email]")
              : "Unknown error";
            console.error(`❌ Error processing ${sanitizedEmail}: ${sanitizedError}`);

            return {
              therapistId: therapist.id,
              therapistName,
              therapistEmail: therapist.email || "",
              success: false,
              error: sanitizedError,
              skipped: false,
            };
          }
        })
      );

      // Wait for all operations to complete
      const results = await Promise.all(promises);

      // Aggregate results
      results.forEach((res) => {
        if (res.skipped) {
          result.skipped++;
        } else if (res.success) {
          result.successful++;
        } else {
          result.failed++;
        }

        result.results.push({
          therapistId: res.therapistId,
          therapistName: res.therapistName,
          therapistEmail: res.therapistEmail,
          success: res.success,
          error: res.error,
          calendarId: res.calendarId,
        });
      });

      const duration = Math.round((Date.now() - batchStartTime) / 1000);
      console.log(
        `🎯 Batch calendar setup completed in ${duration}s: ${result.successful} successful, ${result.failed} failed, ${result.skipped} skipped`
      );

      // Send admin summary email
      try {
        await this.sendBatchSetupSummaryEmail(result);
      } catch (emailError: any) {
        console.warn(`⚠️ Failed to send batch summary email: ${emailError.message}`);
      }

      return result;
    } catch (error: any) {
      const sanitizedError = error.message
        ? error.message.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email]")
        : "Unknown error";
      console.error(`❌ Batch calendar setup failed: ${sanitizedError}`);

      // Mark all as failed if we couldn't even start
      return {
        ...result,
        failed: result.totalTherapists,
        results:
          result.results.length > 0
            ? result.results
            : [
                {
                  therapistId: "batch",
                  therapistName: "Batch Operation",
                  therapistEmail: "",
                  success: false,
                  error: sanitizedError,
                },
              ],
      };
    }
  }

  /**
   * Rollback calendar setup (for error recovery)
   */
  async rollbackCalendarSetup(therapistId: string, calendarId?: string): Promise<boolean> {
    try {
      console.log(`🔄 Rolling back calendar setup for therapist ${therapistId}`);

      // Remove calendar record from database
      if (calendarId) {
        const calendar = await this.storage.getTherapistCalendar(therapistId);
        if (calendar && calendar.googleCalendarId) {
          // Note: We don't delete the actual Google calendar to avoid data loss
          // Instead, we mark it as error status
          await this.storage.updateTherapistCalendar(calendar.id, {
            integrationStatus: "error",
          });
        }
      }

      // Clear calendar reference from therapist profile
      const profile = await this.storage.getTherapistProfile(therapistId);
      if (profile) {
        await this.storage.updateTherapistProfile(therapistId, {
          primaryCalendarId: null,
        });
      }

      console.log(`✅ Calendar setup rollback completed for therapist ${therapistId}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Calendar rollback failed for therapist ${therapistId}:`, error);
      return false;
    }
  }

  /**
   * Validate therapist exists and get details
   */
  private async validateTherapist(
    therapistId: string
  ): Promise<(User & { therapistProfile?: TherapistProfile }) | null> {
    try {
      const user = await this.storage.getUser(therapistId);
      if (!user || user.role !== "therapist") {
        return null;
      }

      const profile = await this.storage.getTherapistProfile(therapistId);
      return { ...user, therapistProfile: profile };
    } catch (error) {
      console.error(`Error validating therapist ${therapistId}:`, error);
      return null;
    }
  }

  /**
   * Get all therapists who need calendar setup
   */
  private async getAllTherapistsNeedingCalendars(): Promise<
    (User & { therapistProfile?: TherapistProfile })[]
  > {
    try {
      // Get all active therapists
      const users = await this.storage.getAllUsers();
      const therapists = users.filter((user) => user.role === "therapist" && user.isActive);

      const therapistsWithProfiles = await Promise.all(
        therapists.map(async (therapist) => {
          const profile = await this.storage.getTherapistProfile(therapist.id);
          return { ...therapist, therapistProfile: profile };
        })
      );

      // Filter to only those without active calendars
      const therapistsNeedingCalendars = [];
      for (const therapist of therapistsWithProfiles) {
        const calendar = await this.storage.getTherapistCalendar(therapist.id);
        if (!calendar || calendar.integrationStatus !== "active") {
          therapistsNeedingCalendars.push(therapist);
        }
      }

      return therapistsNeedingCalendars;
    } catch (error: any) {
      console.error("Error getting therapists needing calendars:", error);
      return [];
    }
  }

  /**
   * Update therapist profile with calendar information
   */
  private async updateTherapistProfileWithCalendar(
    therapistId: string,
    calendarData: any
  ): Promise<void> {
    try {
      await this.storage.updateTherapistProfile(therapistId, {
        primaryCalendarId: calendarData.googleCalendarId,
        calendarPermissionsConfigured: true,
      });

      console.log(
        `✅ Updated therapist profile ${therapistId} with calendar ${calendarData.googleCalendarId}`
      );
    } catch (error: any) {
      console.error(`❌ Failed to update therapist profile ${therapistId}:`, error);
      throw new Error(`Failed to update therapist profile: ${error.message}`);
    }
  }

  /**
   * Send welcome email to therapist with calendar access instructions
   */
  private async sendCalendarWelcomeEmail(therapist: User, calendarData: any): Promise<void> {
    try {
      const calendarName = `Dr. ${therapist.firstName} ${therapist.lastName} - Therapy Sessions`;
      const calendarUrl = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarData.googleCalendarId)}`;

      const emailData: CalendarWelcomeEmailData = {
        therapistName: `${therapist.firstName} ${therapist.lastName}`,
        therapistEmail: therapist.email || "",
        calendarName,
        calendarUrl,
        googleCalendarId: calendarData.googleCalendarId,
        accessInstructions: this.generateAccessInstructions(
          therapist.email || "",
          calendarData.googleCalendarId
        ),
        supportEmail: "support@hive-wellness.co.uk",
      };

      const emailResult = await emailService.sendEmail({
        to: therapist.email || "",
        subject: "📅 Your Therapy Calendar is Ready - Hive Wellness",
        body: this.generateCalendarWelcomeEmailTemplate(emailData),
        isHtml: true,
        templateId: "therapist_calendar_welcome",
        metadata: {
          therapistId: therapist.id,
          calendarId: calendarData.googleCalendarId,
          type: "calendar_setup_welcome",
        },
      });

      if (emailResult.success) {
        console.log(`📧 Calendar welcome email sent to ${therapist.email}`);
      } else {
        console.error(`❌ Failed to send welcome email to ${therapist.email}:`, emailResult.error);
      }
    } catch (error: any) {
      console.error(`❌ Error sending calendar welcome email to ${therapist.email}:`, error);
      // Don't throw - email failure shouldn't stop the calendar setup
    }
  }

  /**
   * Send admin notification about calendar setup
   */
  private async sendAdminNotification(
    therapist: User,
    calendarData: any | null,
    success: boolean,
    error?: string
  ): Promise<void> {
    try {
      const subject = success
        ? `✅ Calendar Setup Successful - ${therapist.firstName} ${therapist.lastName}`
        : `❌ Calendar Setup Failed - ${therapist.firstName} ${therapist.lastName}`;

      const body = success
        ? this.generateSuccessAdminNotification(therapist, calendarData)
        : this.generateFailureAdminNotification(therapist, error || "Unknown error");

      await emailService.sendAdminNotification(subject, body, true);

      console.log(`📧 Admin notification sent for ${therapist.email} calendar setup`);
    } catch (error: any) {
      console.error(`❌ Failed to send admin notification:`, error);
    }
  }

  /**
   * Send batch setup summary email to admins
   */
  private async sendBatchSetupSummaryEmail(result: BatchSetupResult): Promise<void> {
    try {
      const subject = `📊 Batch Calendar Setup Summary - ${result.successful}/${result.totalTherapists} Successful`;
      const body = this.generateBatchSummaryEmailTemplate(result);

      await emailService.sendAdminNotification(subject, body, true);

      console.log("📧 Batch setup summary email sent to admins");
    } catch (error: any) {
      console.error("❌ Failed to send batch summary email:", error);
    }
  }

  /**
   * Generate calendar access instructions
   */
  private generateAccessInstructions(therapistEmail: string, googleCalendarId: string): string {
    return `
1. Open Google Calendar (calendar.google.com) in your browser
2. Sign in with your personal Google account (${therapistEmail})
3. Your Hive Wellness therapy calendar should appear in your "Other calendars" section
4. If you don't see it, click the "+" next to "Other calendars" and select "Subscribe to calendar"
5. Enter this calendar ID: ${googleCalendarId}

You can now view and manage your therapy appointments from your personal Google Calendar!
    `.trim();
  }

  /**
   * Generate calendar welcome email template
   */
  private generateCalendarWelcomeEmailTemplate(data: CalendarWelcomeEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Therapy Calendar is Ready - Hive Wellness</title>
  <style>
    body { font-family: 'Open Sans', Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #9306B1, #B237D1); padding: 40px 30px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 28px; font-family: 'Century Old Style', serif; }
    .content { padding: 40px 30px; }
    .calendar-info { background: linear-gradient(135deg, #fef7ff, #f3e8ff); padding: 25px; border-radius: 12px; border-left: 4px solid #9306B1; margin: 25px 0; }
    .instructions { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .button { background: linear-gradient(135deg, #9306B1, #B237D1); color: white; padding: 15px 30px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 600; margin: 20px 0; }
    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Your Therapy Calendar is Ready!</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Hive Wellness</p>
    </div>
    <div class="content">
      <h2 style="color: #9306B1;">Hello ${data.therapistName},</h2>
      
      <p>Great news! We've successfully set up your dedicated therapy calendar. You can now manage your appointments seamlessly from your personal Google Calendar.</p>
      
      <div class="calendar-info">
        <h3 style="color: #9306B1; margin: 0 0 15px 0;">📋 Calendar Details</h3>
        <p><strong>Calendar Name:</strong> ${data.calendarName}</p>
        <p><strong>Shared with:</strong> ${data.therapistEmail}</p>
        <p><strong>Access Level:</strong> Writer (full editing permissions)</p>
      </div>
      
      <div class="instructions">
        <h3 style="color: #9306B1; margin: 0 0 15px 0;">🔗 How to Access Your Calendar</h3>
        <pre style="white-space: pre-wrap; font-size: 14px; line-height: 1.5;">${data.accessInstructions}</pre>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.calendarUrl}" class="button">Open Your Calendar</a>
      </div>
      
      <h3 style="color: #9306B1;">📝 What's Next?</h3>
      <ul style="line-height: 1.6;">
        <li>Your calendar is automatically synced with the Hive Wellness booking system</li>
        <li>Client appointments will appear automatically in your calendar</li>
        <li>You can add personal events and they won't conflict with bookings</li>
        <li>All Google Meet links are generated automatically for virtual sessions</li>
      </ul>
      
      <p style="margin-top: 30px;">If you have any questions or need assistance accessing your calendar, please don't hesitate to contact our support team.</p>
      
      <p>Welcome to the Hive Wellness team!<br>
      <strong>The Hive Wellness Team</strong></p>
    </div>
    <div class="footer">
      <p>Questions? Contact us at <a href="mailto:${data.supportEmail}" style="color: #9306B1;">${data.supportEmail}</a></p>
      <p>This is an automated message from Hive Wellness.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate success admin notification
   */
  private generateSuccessAdminNotification(therapist: User, calendarData: any): string {
    return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #28a745;">✅ Therapist Calendar Setup Successful</h2>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3>Therapist Details</h3>
    <p><strong>Name:</strong> ${therapist.firstName} ${therapist.lastName}</p>
    <p><strong>Email:</strong> ${therapist.email}</p>
    <p><strong>Therapist ID:</strong> ${therapist.id}</p>
  </div>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3>Calendar Details</h3>
    <p><strong>Google Calendar ID:</strong> ${calendarData.googleCalendarId}</p>
    <p><strong>Calendar Name:</strong> Dr. ${therapist.firstName} ${therapist.lastName} - Therapy Sessions</p>
    <p><strong>Integration Status:</strong> Active</p>
    <p><strong>Permissions:</strong> Writer access granted to ${therapist.email}</p>
  </div>
  
  <p>The therapist has been sent welcome instructions and can now access their calendar from their personal Google account.</p>
</div>
    `.trim();
  }

  /**
   * Generate failure admin notification
   */
  private generateFailureAdminNotification(therapist: User, error: string): string {
    return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #dc3545;">❌ Therapist Calendar Setup Failed</h2>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3>Therapist Details</h3>
    <p><strong>Name:</strong> ${therapist.firstName} ${therapist.lastName}</p>
    <p><strong>Email:</strong> ${therapist.email}</p>
    <p><strong>Therapist ID:</strong> ${therapist.id}</p>
  </div>
  
  <div style="background: #fff5f5; border: 1px solid #feb2b2; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #dc3545;">Error Details</h3>
    <p><strong>Error Message:</strong> ${error}</p>
    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
  </div>
  
  <div style="background: #fffbf0; border: 1px solid #fbbf24; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #f59e0b;">Manual Action Required</h3>
    <p>Please manually set up the calendar for this therapist using the admin panel.</p>
    <p>Navigate to: Admin Dashboard → Therapist Management → Calendar Setup</p>
  </div>
</div>
    `.trim();
  }

  /**
   * Generate batch setup summary email template
   */
  private generateBatchSummaryEmailTemplate(result: BatchSetupResult): string {
    const successRows = result.results
      .filter((r) => r.success)
      .map(
        (r) =>
          `<tr><td>${r.therapistName}</td><td>${r.therapistEmail}</td><td style="color: #28a745;">✅ Success</td><td>${r.calendarId || "N/A"}</td></tr>`
      )
      .join("\n");

    const failureRows = result.results
      .filter((r) => !r.success)
      .map(
        (r) =>
          `<tr><td>${r.therapistName}</td><td>${r.therapistEmail}</td><td style="color: #dc3545;">❌ Failed</td><td>${r.error || "Unknown error"}</td></tr>`
      )
      .join("\n");

    return `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
  <h2>📊 Batch Calendar Setup Summary</h2>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3>Summary Statistics</h3>
    <p><strong>Total Therapists:</strong> ${result.totalTherapists}</p>
    <p><strong>Successful Setups:</strong> ${result.successful}</p>
    <p><strong>Failed Setups:</strong> ${result.failed}</p>
    <p><strong>Skipped (Already Set Up):</strong> ${result.skipped}</p>
    <p><strong>Success Rate:</strong> ${result.totalTherapists > 0 ? Math.round((result.successful / result.totalTherapists) * 100) : 0}%</p>
  </div>
  
  ${
    result.successful > 0
      ? `
  <div style="margin: 30px 0;">
    <h3 style="color: #28a745;">✅ Successful Setups (${result.successful})</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
      <thead>
        <tr style="background: #f8f9fa;">
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Therapist</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Email</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Status</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Calendar ID</th>
        </tr>
      </thead>
      <tbody>
        ${successRows}
      </tbody>
    </table>
  </div>
  `
      : ""
  }
  
  ${
    result.failed > 0
      ? `
  <div style="margin: 30px 0;">
    <h3 style="color: #dc3545;">❌ Failed Setups (${result.failed})</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
      <thead>
        <tr style="background: #f8f9fa;">
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Therapist</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Email</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Status</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Error</th>
        </tr>
      </thead>
      <tbody>
        ${failureRows}
      </tbody>
    </table>
  </div>
  `
      : ""
  }
  
  <p><strong>Completed:</strong> ${new Date().toISOString()}</p>
</div>
    `.trim();
  }
}

import { storage } from "../storage";
export const therapistCalendarOnboardingService = new TherapistCalendarOnboardingService(storage);
