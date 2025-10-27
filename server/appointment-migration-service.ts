import { db } from "./db";
import { appointments, users, therapistProfiles } from "@shared/schema";
import { eq, and, isNotNull, lt, gte, ne, or, isNull } from "drizzle-orm";
import { googleCalendarService } from "./google-calendar-service";
import { nanoid } from "nanoid";

// Migration plan for individual appointments
export interface MigrationPlan {
  appointmentId: string;
  therapistId: string;
  clientId: string | null;
  originalEventId: string | null;
  newEventId?: string;
  migrationStatus: "pending" | "migrated" | "failed" | "skipped" | "rollback_needed";
  migrationDate: Date;
  preservedData: {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    attendees: Array<{ email: string; name: string; role: "client" | "therapist" }>;
    googleMeetUrl: string;
    sessionType: string;
    therapyCategory?: string;
    notes?: string;
  };
  riskAssessment: {
    hasTherapistCalendar: boolean;
    hasConflicts: boolean;
    isUpcoming: boolean;
    riskLevel: "low" | "medium" | "high";
    warnings: string[];
  };
  backup?: {
    originalEventData: any;
    originalDbRecord: any;
  };
}

// Results for individual migration
export interface MigrationResult {
  appointmentId: string;
  success: boolean;
  newEventId?: string;
  error?: string;
  warnings: string[];
  timeElapsed: number;
}

// Summary for batch migrations
export interface MigrationSummary {
  totalAppointments: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{ appointmentId: string; error: string; type: string }>;
  warnings: string[];
  timeElapsed: number;
  apiCallsUsed: number;
  successRate: number;
}

// Migration configuration
export interface MigrationConfig {
  batchSize: number;
  delayBetweenBatches: number;
  maxRetries: number;
  dryRun: boolean;
  enableNotifications: boolean;
  skipConflicts: boolean;
  migrationCutoffDate?: Date;
  onlyFutureAppointments: boolean;
}

export class AppointmentMigrationService {
  private readonly defaultConfig: MigrationConfig = {
    batchSize: 5,
    delayBetweenBatches: 2000, // 2 seconds
    maxRetries: 3,
    dryRun: false,
    enableNotifications: false,
    skipConflicts: true,
    onlyFutureAppointments: true,
  };

  private migrationStats = {
    apiCalls: 0,
    startTime: Date.now(),
  };

  constructor(private config: Partial<MigrationConfig> = {}) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Get the current migration configuration
   */
  public getConfig(): MigrationConfig {
    return this.config as MigrationConfig;
  }

  /**
   * Assess which appointments need migration from admin calendar to therapist calendars
   */
  async assessMigrationNeeds(therapistId?: string): Promise<MigrationPlan[]> {
    try {
      console.log("🔍 Assessing migration needs for appointments...");

      const plans: MigrationPlan[] = [];
      const now = new Date();

      // Build query conditions
      const whereConditions = [
        ne(appointments.status, "cancelled"),
        isNotNull(appointments.primaryTherapistId), // Must have therapist assigned
      ];

      // Only future appointments if configured
      if (this.config.onlyFutureAppointments) {
        whereConditions.push(gte(appointments.scheduledAt, now));
      }

      // Specific therapist if provided
      if (therapistId) {
        whereConditions.push(eq(appointments.primaryTherapistId, therapistId));
      }

      // Migration cutoff date if provided
      if (this.config.migrationCutoffDate) {
        whereConditions.push(lt(appointments.createdAt, this.config.migrationCutoffDate));
      }

      // Get appointments that potentially need migration
      const appointmentsToCheck = await db
        .select({
          id: appointments.id,
          clientId: appointments.clientId,
          primaryTherapistId: appointments.primaryTherapistId,
          scheduledAt: appointments.scheduledAt,
          endTime: appointments.endTime,
          sessionType: appointments.sessionType,
          therapyCategory: appointments.therapyCategory,
          notes: appointments.notes,
          googleMeetLink: appointments.googleMeetLink,
          calendarEventId: appointments.calendarEventId,
          googleEventId: appointments.googleEventId,
          status: appointments.status,
          createdAt: appointments.createdAt,
        })
        .from(appointments)
        .where(and(...whereConditions));

      console.log(`📊 Found ${appointmentsToCheck.length} appointments to assess`);

      // Process each appointment to determine if migration is needed
      for (const appointment of appointmentsToCheck) {
        try {
          const plan = await this.createMigrationPlan(appointment);
          if (plan) {
            plans.push(plan);
          }
        } catch (error: any) {
          console.error(`❌ Error creating plan for appointment ${appointment.id}:`, error.message);
        }
      }

      console.log(`📋 Created ${plans.length} migration plans`);
      this.logMigrationAssessment(plans);

      return plans;
    } catch (error: any) {
      console.error("❌ Error assessing migration needs:", error);
      throw new Error(`Migration assessment failed: ${error.message}`);
    }
  }

  /**
   * Create a migration plan for a single appointment
   */
  private async createMigrationPlan(appointment: any): Promise<MigrationPlan | null> {
    try {
      // Skip if no therapist assigned
      if (!appointment.primaryTherapistId) {
        return null;
      }

      // Get therapist calendar info
      const therapistCalendarInfo = await googleCalendarService.getTherapistCalendarInfo(
        appointment.primaryTherapistId
      );

      // Check if appointment needs migration
      const needsMigration = await this.needsMigration(appointment, therapistCalendarInfo);
      if (!needsMigration) {
        return null;
      }

      // Get client and therapist details
      const [clientDetails, therapistDetails] = await Promise.all([
        appointment.clientId ? this.getUserDetails(appointment.clientId) : null,
        this.getUserDetails(appointment.primaryTherapistId),
      ]);

      if (!therapistDetails) {
        throw new Error(`Therapist ${appointment.primaryTherapistId} not found`);
      }

      // Prepare attendees
      const attendees: Array<{ email: string; name: string; role: "client" | "therapist" }> = [];

      if (clientDetails && clientDetails.email) {
        attendees.push({
          email: clientDetails.email,
          name: `${clientDetails.firstName || "Client"} ${clientDetails.lastName || ""}`.trim(),
          role: "client",
        });
      }

      if (therapistDetails.email) {
        attendees.push({
          email: therapistDetails.email,
          name: `${therapistDetails.firstName || "Therapist"} ${therapistDetails.lastName || ""}`.trim(),
          role: "therapist",
        });
      }

      // Perform risk assessment
      const riskAssessment = await this.assessMigrationRisk(appointment, therapistCalendarInfo);

      // Generate session title
      const sessionTitle = `${appointment.sessionType === "consultation" ? "Consultation" : "Therapy Session"}${appointment.therapyCategory ? ` - ${appointment.therapyCategory}` : ""}`;

      const plan: MigrationPlan = {
        appointmentId: appointment.id,
        therapistId: appointment.primaryTherapistId,
        clientId: appointment.clientId,
        originalEventId: appointment.calendarEventId || appointment.googleEventId,
        migrationStatus: "pending",
        migrationDate: new Date(),
        preservedData: {
          title: sessionTitle,
          description: `Therapy session migrated to therapist calendar.\n\nOriginal Notes: ${appointment.notes || "No additional notes"}`,
          startTime: appointment.scheduledAt,
          endTime: appointment.endTime,
          attendees: attendees,
          googleMeetUrl: appointment.googleMeetLink || "", // Will be properly generated via Calendar API
          sessionType: appointment.sessionType,
          therapyCategory: appointment.therapyCategory,
          notes: appointment.notes,
        },
        riskAssessment,
      };

      return plan;
    } catch (error: any) {
      console.error(
        `❌ Error creating migration plan for appointment ${appointment.id}:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Determine if an appointment needs migration
   */
  private async needsMigration(appointment: any, therapistCalendarInfo: any): Promise<boolean> {
    // CRITICAL FIX: Handle appointments with missing event IDs - they may need recreation
    if (!appointment.calendarEventId && !appointment.googleEventId) {
      console.log(`⚠️ Appointment ${appointment.id} has no event ID - may need recreation`);

      // If appointment has therapist assigned and is in the past cutoff, it likely needs recreation
      if (
        appointment.primaryTherapistId &&
        this.config.migrationCutoffDate &&
        appointment.createdAt < this.config.migrationCutoffDate
      ) {
        console.log(
          `📋 Appointment ${appointment.id} needs recreation - created before migration cutoff`
        );
        return true;
      }

      // Also include future appointments without event IDs for assessment
      if (appointment.scheduledAt > new Date()) {
        console.log(`📋 Future appointment ${appointment.id} without event ID - may need creation`);
        return true;
      }

      return false;
    }

    // Skip if therapist calendar not configured
    if (!therapistCalendarInfo.isConfigured) {
      return false;
    }

    // Check if event is currently on admin calendar
    const eventId = appointment.calendarEventId || appointment.googleEventId;

    try {
      // Try to find event on admin calendar
      const adminCalendarId = "support@hive-wellness.co.uk";
      this.migrationStats.apiCalls++;

      const adminEvent = await googleCalendarService.getSessionEvent(
        eventId,
        appointment.primaryTherapistId,
        true
      );

      if (adminEvent) {
        // Event exists on admin calendar - needs migration
        return true;
      }

      // Check if already on therapist calendar
      this.migrationStats.apiCalls++;
      const therapistEvent = await googleCalendarService.getSessionEvent(
        eventId,
        appointment.primaryTherapistId,
        false
      );

      if (therapistEvent) {
        // Already on therapist calendar - no migration needed
        return false;
      }

      // Event not found on either calendar - may need recreation
      return true;
    } catch (error: any) {
      console.warn(
        `⚠️ Could not verify calendar location for appointment ${appointment.id}:`,
        error.message
      );
      // Assume needs migration if we can't verify location
      return true;
    }
  }

  /**
   * Assess migration risk for an appointment
   */
  private async assessMigrationRisk(
    appointment: any,
    therapistCalendarInfo: any
  ): Promise<MigrationPlan["riskAssessment"]> {
    const warnings: string[] = [];
    let riskLevel: "low" | "medium" | "high" = "low";

    // Check if therapist has calendar configured
    const hasTherapistCalendar = therapistCalendarInfo.isConfigured;
    if (!hasTherapistCalendar) {
      warnings.push("Therapist calendar not properly configured");
      riskLevel = "high";
    }

    // Check for scheduling conflicts on therapist calendar - CRITICAL FIX
    let hasConflicts = false;
    if (hasTherapistCalendar) {
      try {
        console.log(
          `🔍 Checking conflicts for appointment ${appointment.id} on therapist calendar`
        );
        const busyTimes = await googleCalendarService.getTherapistBusyTimes(
          appointment.primaryTherapistId,
          {
            startTime: new Date(appointment.scheduledAt.getTime() - 15 * 60 * 1000), // 15 min buffer
            endTime: new Date(appointment.endTime.getTime() + 15 * 60 * 1000), // 15 min buffer
          }
        );

        // Check for actual conflicts
        hasConflicts = busyTimes.some((busyTime) => {
          const appointmentStart = appointment.scheduledAt.getTime();
          const appointmentEnd = appointment.endTime.getTime();
          const busyStart = busyTime.start.getTime();
          const busyEnd = busyTime.end.getTime();

          return (
            (appointmentStart >= busyStart && appointmentStart < busyEnd) ||
            (appointmentEnd > busyStart && appointmentEnd <= busyEnd) ||
            (appointmentStart <= busyStart && appointmentEnd >= busyEnd)
          );
        });

        if (hasConflicts) {
          warnings.push("Calendar conflict detected on therapist calendar");
          riskLevel = "high";
          console.log(`⚠️ Conflict detected for appointment ${appointment.id}:`, busyTimes);
        } else {
          console.log(`✅ No conflicts found for appointment ${appointment.id}`);
        }
      } catch (error: any) {
        warnings.push(`Could not check for scheduling conflicts: ${error.message}`);
        riskLevel = riskLevel === "high" ? "high" : "medium";
        console.error(`❌ Conflict check failed for appointment ${appointment.id}:`, error.message);
      }
    }

    // Check if appointment is soon (less than 24 hours)
    const now = new Date();
    const appointmentTime = new Date(appointment.scheduledAt);
    const isUpcoming = appointmentTime.getTime() - now.getTime() < 24 * 60 * 60 * 1000;

    if (isUpcoming) {
      warnings.push("Appointment is within 24 hours");
      riskLevel = riskLevel === "high" ? "high" : "medium";
    }

    // Check if appointment has Google Meet link
    if (!appointment.googleMeetLink) {
      warnings.push("No Google Meet link - will generate new one");
    }

    return {
      hasTherapistCalendar,
      hasConflicts,
      isUpcoming,
      riskLevel,
      warnings,
    };
  }

  /**
   * Migrate a single appointment from admin calendar to therapist calendar
   */
  async migrateAppointment(plan: MigrationPlan, retryCount = 0): Promise<MigrationResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      console.log(`🔄 Migrating appointment ${plan.appointmentId} (attempt ${retryCount + 1})`);

      // Skip if dry run
      if (this.config.dryRun) {
        console.log(`🧪 DRY RUN: Would migrate appointment ${plan.appointmentId}`);
        return {
          appointmentId: plan.appointmentId,
          success: true,
          warnings: ["Dry run - no actual migration performed"],
          timeElapsed: Date.now() - startTime,
        };
      }

      // Skip high-risk migrations if configured
      if (plan.riskAssessment.riskLevel === "high" && this.config.skipConflicts) {
        console.log(`⚠️ Skipping high-risk migration for appointment ${plan.appointmentId}`);
        plan.migrationStatus = "skipped";
        return {
          appointmentId: plan.appointmentId,
          success: false,
          error: "Skipped due to high risk level",
          warnings: plan.riskAssessment.warnings,
          timeElapsed: Date.now() - startTime,
        };
      }

      // Step 1: Backup original data
      await this.backupOriginalData(plan);

      // Step 2: Create event on therapist calendar with proper Google Meet integration
      this.migrationStats.apiCalls++;
      const newEventResult = await googleCalendarService.createSessionEvent({
        title: plan.preservedData.title,
        description: plan.preservedData.description,
        startTime: plan.preservedData.startTime,
        endTime: plan.preservedData.endTime,
        attendees: plan.preservedData.attendees,
        appointmentId: plan.appointmentId,
        therapistId: plan.therapistId,
        useAdminCalendar: false, // Force therapist calendar usage
      });

      if (!newEventResult || typeof newEventResult !== "object") {
        throw new Error("Failed to create event on therapist calendar - invalid response");
      }

      // Extract event details - Calendar API returns proper Google Meet URL
      const newEventId = newEventResult.eventId;
      const meetingUrl = newEventResult.meetingUrl; // Proper Google Meet URL from Calendar API
      const meetingId = newEventResult.meetingId;

      if (!newEventId) {
        throw new Error("Failed to create event - no event ID returned");
      }

      if (!meetingUrl || !meetingUrl.includes("meet.google.com")) {
        warnings.push("Google Meet URL not properly generated");
      }

      plan.newEventId = newEventId;

      // Step 3: Update database record with proper Google Meet URL
      await db
        .update(appointments)
        .set({
          calendarEventId: newEventId,
          googleEventId: newEventId,
          googleMeetLink: meetingUrl || plan.preservedData.googleMeetUrl, // Use Calendar API generated URL
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, plan.appointmentId));

      // Update plan with actual meeting URL for verification
      plan.preservedData.googleMeetUrl = meetingUrl || plan.preservedData.googleMeetUrl;

      // Step 4: Verify migration success
      const verificationResult = await this.verifyMigration(plan.appointmentId, newEventId);
      if (!verificationResult.success) {
        throw new Error(`Migration verification failed: ${verificationResult.error}`);
      }

      // Step 5: Clean up original event (if it exists and was on admin calendar)
      if (plan.originalEventId) {
        try {
          this.migrationStats.apiCalls++;
          await googleCalendarService.deleteEvent(plan.originalEventId, undefined, true);
          console.log(`🗑️ Cleaned up original event ${plan.originalEventId} from admin calendar`);
        } catch (cleanupError: any) {
          warnings.push(`Could not clean up original event: ${cleanupError.message}`);
        }
      }

      plan.migrationStatus = "migrated";

      console.log(
        `✅ Successfully migrated appointment ${plan.appointmentId} to event ${newEventId}`
      );

      return {
        appointmentId: plan.appointmentId,
        success: true,
        newEventId,
        warnings,
        timeElapsed: Date.now() - startTime,
      };
    } catch (error: any) {
      console.error(`❌ Migration failed for appointment ${plan.appointmentId}:`, error.message);

      plan.migrationStatus = "failed";

      // Attempt rollback if we created an event
      if (plan.newEventId) {
        try {
          await this.rollbackMigration(plan.appointmentId, plan.newEventId);
          plan.migrationStatus = "rollback_needed";
        } catch (rollbackError: any) {
          console.error(
            `❌ Rollback failed for appointment ${plan.appointmentId}:`,
            rollbackError.message
          );
        }
      }

      // Retry if configured and attempts remaining
      if (retryCount < (this.config.maxRetries || 3)) {
        console.log(`🔄 Retrying migration for appointment ${plan.appointmentId}...`);
        await this.delay(1000 * (retryCount + 1)); // Exponential backoff
        return this.migrateAppointment(plan, retryCount + 1);
      }

      return {
        appointmentId: plan.appointmentId,
        success: false,
        error: error.message,
        warnings,
        timeElapsed: Date.now() - startTime,
      };
    }
  }

  /**
   * Migrate appointments in batches
   */
  async migrateBatch(plans: MigrationPlan[]): Promise<MigrationSummary> {
    const summary: MigrationSummary = {
      totalAppointments: plans.length,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      warnings: [],
      timeElapsed: 0,
      apiCallsUsed: 0,
      successRate: 0,
    };

    if (plans.length === 0) {
      console.log("ℹ️ No appointments to migrate");
      return summary;
    }

    const startTime = Date.now();
    this.migrationStats.startTime = startTime;
    this.migrationStats.apiCalls = 0;

    console.log(`🚀 Starting batch migration of ${plans.length} appointments...`);
    console.log(
      `📋 Configuration: batchSize=${this.config.batchSize}, dryRun=${this.config.dryRun}`
    );

    // Process appointments in batches
    const batches = this.chunk(plans, this.config.batchSize || 5);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(
        `📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} appointments)`
      );

      // Process batch concurrently
      const batchPromises = batch.map((plan) => this.migrateAppointment(plan));
      const batchResults = await Promise.allSettled(batchPromises);

      // Process results
      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i];
        const plan = batch[i];

        summary.processed++;

        if (result.status === "fulfilled") {
          const migrationResult = result.value;

          if (migrationResult.success) {
            summary.successful++;
          } else {
            if (migrationResult.error?.includes("Skipped")) {
              summary.skipped++;
            } else {
              summary.failed++;
              summary.errors.push({
                appointmentId: plan.appointmentId,
                error: migrationResult.error || "Unknown error",
                type: "migration",
              });
            }
          }

          summary.warnings.push(...migrationResult.warnings);
        } else {
          summary.failed++;
          summary.errors.push({
            appointmentId: plan.appointmentId,
            error: result.reason?.message || "Promise rejected",
            type: "promise",
          });
        }
      }

      // Rate limiting delay between batches
      if (batchIndex < batches.length - 1) {
        console.log(`⏳ Waiting ${this.config.delayBetweenBatches || 2000}ms before next batch...`);
        await this.delay(this.config.delayBetweenBatches || 2000);
      }
    }

    summary.timeElapsed = Date.now() - startTime;
    summary.apiCallsUsed = this.migrationStats.apiCalls;
    summary.successRate =
      summary.processed > 0 ? (summary.successful / summary.processed) * 100 : 0;

    console.log("🎯 Migration batch completed:");
    console.log(`  📊 Total: ${summary.totalAppointments}`);
    console.log(`  ✅ Successful: ${summary.successful}`);
    console.log(`  ❌ Failed: ${summary.failed}`);
    console.log(`  ⏭️ Skipped: ${summary.skipped}`);
    console.log(`  📈 Success Rate: ${summary.successRate.toFixed(1)}%`);
    console.log(`  ⏱️ Time: ${(summary.timeElapsed / 1000).toFixed(1)}s`);
    console.log(`  🔗 API Calls: ${summary.apiCallsUsed}`);

    return summary;
  }

  /**
   * ENHANCED: Verify that a migration was successful with comprehensive checks
   */
  async verifyMigration(
    appointmentId: string,
    newEventId: string
  ): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      console.log(
        `🔍 Verifying migration for appointment ${appointmentId} with event ${newEventId}`
      );

      // Check database record
      const appointment = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, appointmentId))
        .limit(1);

      if (appointment.length === 0) {
        return { success: false, error: "Appointment not found in database" };
      }

      const appt = appointment[0];

      // Verify event ID was updated
      if (appt.calendarEventId !== newEventId && appt.googleEventId !== newEventId) {
        return { success: false, error: "Database record not updated with new event ID" };
      }

      // Verify therapist is assigned
      if (!appt.primaryTherapistId) {
        return { success: false, error: "No therapist assigned to appointment" };
      }

      // Verify event exists on therapist calendar
      this.migrationStats.apiCalls++;
      const event = await googleCalendarService.getSessionEvent(
        newEventId,
        appt.primaryTherapistId,
        false
      );

      if (!event) {
        return { success: false, error: "Event not found on therapist calendar" };
      }

      // CRITICAL: Verify Google Meet URL is valid
      const meetUrl = appt.googleMeetLink;
      if (!meetUrl || !meetUrl.includes("meet.google.com")) {
        return { success: false, error: "Invalid or missing Google Meet URL in database" };
      }

      // Get client details for attendee verification
      if (appt.clientId) {
        const clientDetails = await this.getUserDetails(appt.clientId);
        if (clientDetails && clientDetails.email) {
          // Note: We would verify attendees here if event object provided attendee info
          console.log(`👥 Client email for verification: ${clientDetails.email}`);
        }
      }

      console.log(`✅ Migration verification successful for appointment ${appointmentId}`);
      return {
        success: true,
        details: {
          eventId: newEventId,
          meetingUrl: meetUrl,
          therapistId: appt.primaryTherapistId,
          scheduledAt: appt.scheduledAt,
        },
      };
    } catch (error: any) {
      console.error(
        `❌ Migration verification failed for appointment ${appointmentId}:`,
        error.message
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Rollback a failed migration
   */
  async rollbackMigration(appointmentId: string, newEventId?: string): Promise<void> {
    try {
      console.log(`🔄 Rolling back migration for appointment ${appointmentId}`);

      // Delete the newly created event if it exists
      if (newEventId) {
        try {
          const appointment = await db
            .select()
            .from(appointments)
            .where(eq(appointments.id, appointmentId))
            .limit(1);

          if (appointment.length > 0 && appointment[0].primaryTherapistId) {
            this.migrationStats.apiCalls++;
            await googleCalendarService.deleteEvent(
              newEventId,
              appointment[0].primaryTherapistId,
              false
            );
            console.log(`🗑️ Deleted failed event ${newEventId}`);
          }
        } catch (deleteError) {
          console.warn(`⚠️ Could not delete failed event ${newEventId}:`, deleteError);
        }
      }

      // Restore original database record if we have backup
      // This would need to be implemented based on backup strategy

      console.log(`✅ Rollback completed for appointment ${appointmentId}`);
    } catch (error: any) {
      console.error(`❌ Rollback failed for appointment ${appointmentId}:`, error.message);
      throw error;
    }
  }

  /**
   * Backup original appointment data before migration
   */
  private async backupOriginalData(plan: MigrationPlan): Promise<void> {
    try {
      // Get current database record
      const appointment = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, plan.appointmentId))
        .limit(1);

      if (appointment.length > 0) {
        plan.backup = {
          originalDbRecord: appointment[0],
          originalEventData: null,
        };

        // Try to get original calendar event data
        if (plan.originalEventId) {
          try {
            this.migrationStats.apiCalls++;
            const originalEvent = await googleCalendarService.getSessionEvent(
              plan.originalEventId,
              undefined,
              true
            );
            if (originalEvent) {
              plan.backup.originalEventData = originalEvent;
            }
          } catch (error) {
            console.warn(`⚠️ Could not backup original event data for ${plan.appointmentId}`);
          }
        }
      }
    } catch (error: any) {
      console.warn(
        `⚠️ Could not backup original data for appointment ${plan.appointmentId}:`,
        error.message
      );
    }
  }

  /**
   * Get user details for attendees
   */
  private async getUserDetails(userId: string): Promise<any> {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user;
  }

  /**
   * Log migration assessment summary
   */
  private logMigrationAssessment(plans: MigrationPlan[]): void {
    const riskCounts = {
      low: plans.filter((p) => p.riskAssessment.riskLevel === "low").length,
      medium: plans.filter((p) => p.riskAssessment.riskLevel === "medium").length,
      high: plans.filter((p) => p.riskAssessment.riskLevel === "high").length,
    };

    console.log("📊 Migration Assessment Summary:");
    console.log(`  📋 Total plans: ${plans.length}`);
    console.log(`  🟢 Low risk: ${riskCounts.low}`);
    console.log(`  🟡 Medium risk: ${riskCounts.medium}`);
    console.log(`  🔴 High risk: ${riskCounts.high}`);

    if (riskCounts.high > 0) {
      console.log("⚠️ High-risk appointments detected - review before proceeding");
    }
  }

  /**
   * Utility: Split array into chunks
   */
  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get migration statistics
   */
  getMigrationStats(): { apiCalls: number; timeElapsed: number } {
    return {
      apiCalls: this.migrationStats.apiCalls,
      timeElapsed: Date.now() - this.migrationStats.startTime,
    };
  }
}

// Export singleton instance with default configuration
export const appointmentMigrationService = new AppointmentMigrationService();

// Named exports for different configurations
export const createMigrationService = (config: Partial<MigrationConfig>) =>
  new AppointmentMigrationService(config);

export const dryRunMigrationService = new AppointmentMigrationService({ dryRun: true });
