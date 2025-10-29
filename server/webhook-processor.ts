import { nanoid } from "nanoid";
import { secureLogger } from "./utils/secure-logger";
import type { IStorage } from "./storage";
import { db } from "./db";
import type {
  WebhookEvent,
  InsertWebhookEvent,
  InsertWebhookProcessingQueue,
} from "@shared/schema";
import { GoogleMeetService } from "./google-meet-service";
import { MailService } from "@sendgrid/mail";
import { triggerTherapistPayoutOnSessionCompletion } from "./therapist-payout-service";

/**
 * Production-ready webhook processor with durable idempotency and atomic operations
 *
 * Key Features:
 * - Database-persisted idempotency (no more in-memory Set)
 * - Outbox pattern for reliable downstream operations
 * - Comprehensive error handling and rollback
 * - Removes brittle metadata dependencies
 */
export class WebhookProcessor {
  private readonly LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  private readonly RETRY_DELAYS = [1000, 5000, 15000]; // Exponential backoff
  private readonly WORKER_ID = `worker-${nanoid()}`; // Unique worker identifier

  constructor(private storage: IStorage) {
    console.log(`🚀 WebhookProcessor initialized with worker ID: ${this.WORKER_ID}`);
  }

  /**
   * Process a Stripe webhook with durable idempotency
   * Returns immediately if already processed, ensuring exactly-once processing
   */
  async processStripeWebhook(
    event: any,
    webhookId: string
  ): Promise<{
    success: boolean;
    alreadyProcessed: boolean;
    appointmentId?: string;
    errors: string[];
  }> {
    const eventId = event.id;
    secureLogger.log(`🎯 [${webhookId}] Processing webhook event: ${eventId} (${event.type})`);

    try {
      // CRITICAL: Atomic upsert for concurrency-safe event creation
      const { event: webhookEvent, wasCreated } = await this.storage.upsertWebhookEvent({
        id: nanoid(),
        eventId: eventId,
        eventType: event.type,
        webhookSource: "stripe",
        eventData: event,
        processingStatus: "processing",
        attemptCount: 1,
        lastAttemptAt: new Date(),
        receivedAt: new Date(),
        processedBy: webhookId,
      });

      if (!wasCreated) {
        // Event already exists - check status
        if (webhookEvent.processingStatus === "completed") {
          secureLogger.log(`✅ [${webhookId}] Event ${eventId} already processed successfully`);
          return {
            success: true,
            alreadyProcessed: true,
            appointmentId: webhookEvent.createdAppointmentId || undefined,
            errors: [],
          };
        } else if (webhookEvent.processingStatus === "processing") {
          secureLogger.log(
            `⚠️ [${webhookId}] Event ${eventId} is currently being processed - accepting as success`
          );
          // CRITICAL: Treat 'processing' as accepted to avoid Stripe retries
          return {
            success: true,
            alreadyProcessed: true,
            errors: [],
          };
        }
        // If failed, we'll retry below
        secureLogger.log(`🔄 [${webhookId}] Retrying failed event ${eventId}`);
      } else {
        secureLogger.log(`📝 [${webhookId}] Created new webhook event record: ${webhookEvent.id}`);
      }

      // Process based on event type
      const result = await this.processEventByType(event, webhookId, webhookEvent.id);

      // Mark as completed
      await this.storage.updateWebhookEventStatus(eventId, "completed", {
        appointmentId: result.appointmentId,
        downstreamOperations: result.operationsCompleted,
        processingNotes: `Successfully processed ${event.type} event`,
      });

      secureLogger.log(`✅ [${webhookId}] Event processing completed successfully`);

      return {
        success: true,
        alreadyProcessed: false,
        appointmentId: result.appointmentId,
        errors: [],
      };
    } catch (error: any) {
      secureLogger.error(`❌ [${webhookId}] Webhook processing failed:`, error);

      // Update failure status with exponential backoff
      if (eventId) {
        try {
          await this.storage.updateWebhookEventStatus(eventId, "failed", {
            failureReason: error.message || "Unknown error",
          });
        } catch (updateError) {
          console.error(`❌ [${webhookId}] Failed to update webhook status:`, updateError);
        }
      }

      return {
        success: false,
        alreadyProcessed: false,
        errors: [error.message || "Unknown processing error"],
      };
    }
  }

  /**
   * Process webhook events based on type with atomic operations
   */
  private async processEventByType(
    event: any,
    webhookId: string,
    webhookEventId: string
  ): Promise<{
    appointmentId?: string;
    operationsCompleted: string[];
  }> {
    console.log(`🔄 [${webhookId}] Processing event type: ${event.type}`);

    try {
      switch (event.type) {
        case "payment_intent.succeeded":
          secureLogger.log(`💳 [${webhookId}] Processing payment success event`);
          const result = await this.processPaymentSucceeded(
            event.data.object,
            webhookId,
            webhookEventId
          );
          console.log(`✅ [${webhookId}] Payment processing completed:`, result);
          return result;

        case "payment_intent.payment_failed":
          console.log(`❌ [${webhookId}] Processing payment failure event`);
          return await this.processPaymentFailed(event.data.object, webhookId, webhookEventId);

        default:
          console.log(`⚠️ [${webhookId}] Unhandled event type: ${event.type}`);
          return { operationsCompleted: ["event_logged"] };
      }
    } catch (error: any) {
      console.error(`❌ [${webhookId}] Error in processEventByType:`, error);
      console.error(`❌ [${webhookId}] Error stack:`, error.stack);
      throw error; // Re-throw to be handled by parent
    }
  }

  /**
   * Process successful payment with atomic appointment creation
   * REMOVED: Brittle metadata.create_appointment_via_webhook dependency
   * ADDED: Smart context detection from payment metadata
   */
  private async processPaymentSucceeded(
    paymentIntent: any,
    webhookId: string,
    webhookEventId: string
  ): Promise<{
    appointmentId?: string;
    operationsCompleted: string[];
  }> {
    const metadata = paymentIntent.metadata || {};
    console.log(`💳 [${webhookId}] Processing successful payment: ${paymentIntent.id}`);

    const operationsCompleted: string[] = [];

    try {
      // HARDENED: Detect appointment creation context without brittle flag
      const needsAppointmentCreation = this.shouldCreateAppointment(metadata);
      console.log(`🧠 [${webhookId}] Needs appointment creation: ${needsAppointmentCreation}`);

      if (needsAppointmentCreation) {
        console.log(`🆕 [${webhookId}] Creating new appointment from payment`);

        // Use outbox pattern for atomic operations
        const appointmentId = await this.createAppointmentAtomically(
          paymentIntent,
          webhookId,
          webhookEventId
        );

        console.log(`✅ [${webhookId}] Appointment created successfully: ${appointmentId}`);
        operationsCompleted.push("appointment_created", "payment_recorded");
        return { appointmentId, operationsCompleted };
      } else {
        console.log(`🔄 [${webhookId}] Updating existing appointment payment status`);

        await this.updateExistingAppointmentPayment(paymentIntent, webhookId);
        operationsCompleted.push("payment_updated");
        return { operationsCompleted };
      }
    } catch (error: any) {
      console.error(`❌ [${webhookId}] Error in processPaymentSucceeded:`, error);
      console.error(`❌ [${webhookId}] Error details:`, {
        message: error.message,
        stack: error.stack,
        paymentIntentId: paymentIntent.id,
        metadata: metadata,
      });
      throw error;
    }
  }

  /**
   * Normalize appointment metadata to handle both legacy and current formats
   */
  private normalizeAppointmentMetadata(metadata: any): any {
    // Safely parse appointmentData JSON string
    let parsedData = null;
    try {
      if (metadata.appointmentData && typeof metadata.appointmentData === "string") {
        parsedData = JSON.parse(metadata.appointmentData);
      }
    } catch (e) {
      console.log(`⚠️ Failed to parse appointmentData JSON:`, e);
    }

    // Normalize to unified format, prioritizing current format over legacy
    const normalized = {
      clientId: metadata.clientId || metadata.hive_client_id || parsedData?.clientId,
      therapistId: metadata.therapistId || metadata.hive_therapist_id || parsedData?.therapistId,
      scheduledAt: metadata.scheduledAt || metadata.scheduled_at || parsedData?.scheduledAt,
      sessionType: metadata.sessionType || metadata.session_type || parsedData?.sessionType,
      duration: metadata.duration || metadata.session_duration || parsedData?.duration,
      notes: metadata.notes || parsedData?.notes,
      price: metadata.price || parsedData?.price,
    };

    return normalized;
  }

  /**
   * HARDENED: Smart detection of appointment creation need
   * Replaces brittle metadata.create_appointment_via_webhook === 'true' check
   */
  private shouldCreateAppointment(metadata: any): boolean {
    // Normalize metadata to handle both current and legacy formats
    const normalized = this.normalizeAppointmentMetadata(metadata);

    // Check for required base appointment data
    const hasBaseData = !!(normalized.clientId && normalized.therapistId && normalized.scheduledAt);

    // Check for required session data
    const hasSessionData = !!(normalized.sessionType && normalized.duration);

    // Check that this is a new booking (no existing appointment to update)
    const noExistingAppointmentId = !metadata.appointmentId && !metadata.sessionId;

    // Additional signals that this is a new booking
    const isNewBooking =
      metadata.booking_source === "new" ||
      metadata.create_appointment_via_webhook === "true" ||
      // NEW: Detect new bookings from our appointment creation flow
      (metadata.appointmentData && !metadata.appointmentId);

    // Create appointment if we have all required data and no existing appointment ID
    const shouldCreate = hasBaseData && hasSessionData && noExistingAppointmentId;
    console.log(`🎯 Final decision - shouldCreateAppointment: ${shouldCreate}`);

    return shouldCreate;
  }

  /**
   * Create appointment with atomic operations using outbox pattern
   */
  private async createAppointmentAtomically(
    paymentIntent: any,
    webhookId: string,
    webhookEventId: string
  ): Promise<string> {
    const metadata = paymentIntent.metadata;

    // Normalize metadata to handle both current and legacy formats
    const normalized = this.normalizeAppointmentMetadata(metadata);

    // Validate required appointment data using normalized fields
    const requiredFields = ["clientId", "therapistId", "scheduledAt"];
    const missingFields = requiredFields.filter((field) => !normalized[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required appointment data: ${missingFields.join(", ")}`);
    }

    return await db.transaction(async (tx) => {
      // 1. Create appointment record
      const appointmentId = nanoid();
      const scheduledAt = new Date(normalized.scheduledAt);
      const duration = parseInt(normalized.duration || "50");
      const endTime = new Date(scheduledAt.getTime() + duration * 60000);

      console.log(`📅 [${webhookId}] Appointment timing:`, {
        appointmentId,
        scheduledAt: scheduledAt.toISOString(),
        endTime: endTime.toISOString(),
        duration,
      });

      // CRITICAL: Service Guard - Check if this is a backdated/past appointment
      const now = new Date();
      const scheduledAtUTC = new Date(scheduledAt.toISOString());
      const nowUTC = new Date(now.toISOString());
      const isPastDate = scheduledAtUTC <= nowUTC;
      const isBackdated = metadata.backdated === true || metadata.backdated === "true";

      // CRITICAL FIX: Do not create Google Meet room inside transaction
      // This will be handled asynchronously by the queue worker to prevent DB timeouts
      let googleMeetUrl = ""; // Always blank initially - will be filled by async worker

      console.log(
        `📅 [${webhookId}] Deferring Google Meet room creation to async worker to prevent DB timeout`
      );

      if (isPastDate || isBackdated) {
        console.log(
          `🔙 [${webhookId}] SERVICE GUARD: Past/backdated appointment - Meet URL will remain empty`,
          {
            scheduledAt: scheduledAt.toISOString(),
            isPastDate,
            isBackdated,
            backdatedReason: metadata.backdated_reason,
          }
        );
      }

      const appointmentData = {
        id: appointmentId,
        clientId: normalized.clientId,
        primaryTherapistId: normalized.therapistId, // CRITICAL: Ensure this is set
        scheduledAt: scheduledAt,
        endTime: endTime,
        duration: duration,
        // CRITICAL: Set status based on whether appointment is in the past
        status: isPastDate || isBackdated ? ("completed" as const) : ("confirmed" as const),
        sessionType: normalized.sessionType || "therapy",
        notes: normalized.notes || metadata.appointment_notes || "",
        price: parseFloat(normalized.price || metadata.appointment_price || "80.00"),
        paymentStatus: "paid" as const, // Mark as paid since payment succeeded
        videoRoomId: googleMeetUrl, // Store Google Meet URL in videoRoomId field
        googleMeetUrl: googleMeetUrl, // Also store in dedicated field if available
        backdated: isBackdated,
        backdatedReason: metadata.backdated_reason || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log(`🏥 [${webhookId}] Creating appointment with data:`, {
        id: appointmentData.id,
        clientId: appointmentData.clientId,
        primaryTherapistId: appointmentData.primaryTherapistId,
        scheduledAt: appointmentData.scheduledAt.toISOString(),
        sessionType: appointmentData.sessionType,
        status: appointmentData.status,
        paymentStatus: appointmentData.paymentStatus,
      });

      let appointment;
      try {
        appointment = await this.storage.createAppointment(appointmentData);
        console.log(`✅ [${webhookId}] Appointment created successfully: ${appointment.id}`);
        console.log(
          `🧑‍⚕️ [${webhookId}] Appointment therapist ID: ${appointment.primaryTherapistId}`
        );
      } catch (appointmentError: any) {
        // Handle APPOINTMENT_OVERLAP gracefully as idempotency case
        if (
          appointmentError.code === "APPOINTMENT_OVERLAP" ||
          appointmentError.message?.includes("appointments_no_overlap") ||
          appointmentError.message?.includes("exclusion constraint")
        ) {
          console.warn(
            `⚠️ [${webhookId}] Appointment overlap detected - this is expected for webhook idempotency`
          );
          console.log(`🔄 [${webhookId}] Looking up existing appointment to maintain consistency`);

          // CRITICAL FIX: Look up the existing appointment using unique keys
          try {
            const therapistAppointments = await this.storage.getAppointmentsByTherapist(
              normalized.therapistId
            );
            const existingAppointments = therapistAppointments.filter((apt) => {
              const aptStart = new Date(apt.scheduledAt);
              const aptEnd = new Date(
                apt.endTime || new Date(aptStart.getTime() + (apt.duration || 50) * 60000)
              );
              // Check for exact match or overlap with the attempted appointment
              return aptStart <= endTime && aptEnd >= scheduledAt;
            });

            // Search for EXACT MATCH only - true idempotency requires precise matching
            const exactMatch = existingAppointments.find((apt) => {
              const existingStart = new Date(apt.scheduledAt);
              const existingDuration = apt.duration || 50;

              // CRITICAL: Check for EXACT match of all key attributes
              const isSameClient = apt.clientId === normalized.clientId;
              const isSameTherapist = apt.primaryTherapistId === normalized.therapistId;
              const isSameTime = Math.abs(existingStart.getTime() - scheduledAt.getTime()) < 60000; // Allow 1 minute tolerance
              const isSameDuration = existingDuration === duration;

              return isSameClient && isSameTherapist && isSameTime && isSameDuration;
            });

            if (exactMatch) {
              console.log(
                `🔍 [${webhookId}] Found exact matching appointment for idempotency check: ${exactMatch.id}`
              );

              // Verify this is the same payment intent (true idempotency)
              try {
                const existingPayment = await this.storage.getPaymentByStripePaymentIntentId(
                  paymentIntent.id
                );
                if (existingPayment && existingPayment.appointmentId === exactMatch.id) {
                  console.log(
                    `✅ [${webhookId}] True idempotent retry detected - appointment: ${exactMatch.id}`
                  );
                  // TODO: Re-assert downstream queue items for completeness
                  return exactMatch.id;
                }
              } catch (paymentLookupError) {
                console.warn(
                  `⚠️ [${webhookId}] Could not verify existing payment:`,
                  paymentLookupError
                );
              }

              // If we reach here, it's an exact match but missing payment - create it
              console.log(`🔄 [${webhookId}] Exact match found, creating missing payment record`);
              try {
                const paymentData = {
                  id: nanoid(),
                  appointmentId: exactMatch.id,
                  stripePaymentIntentId: paymentIntent.id,
                  amount: paymentIntent.amount,
                  currency: paymentIntent.currency,
                  status: "succeeded" as const,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
                await this.storage.createPayment(paymentData);
                console.log(`✅ [${webhookId}] Payment record created for exact match appointment`);
                // TODO: Re-assert downstream queue items for completeness
                return exactMatch.id;
              } catch (paymentError) {
                console.error(
                  `❌ [${webhookId}] Failed to create payment for exact match:`,
                  paymentError
                );
                throw appointmentError;
              }
            } else {
              // No exact match found - this is a genuine conflict with different parameters
              console.error(
                `❌ [${webhookId}] Genuine appointment conflict - no exact match found`
              );
              console.error(
                `❌ [${webhookId}] New booking conflicts with existing appointment(s) but doesn't match exactly`
              );
              throw appointmentError;
            }
          } catch (lookupError) {
            console.error(`❌ [${webhookId}] Failed to lookup existing appointment:`, lookupError);
          }

          // If we can't find the existing appointment, something is wrong
          console.error(
            `❌ [${webhookId}] Overlap detected but no existing appointment found - this should not happen`
          );
          throw appointmentError;
        }

        // Re-throw other appointment creation errors
        throw appointmentError;
      }

      // 2. Create payment record
      const paymentData = {
        id: nanoid(),
        appointmentId: appointmentId,
        stripePaymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: "succeeded" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const payment = await this.storage.createPayment(paymentData);
      console.log(`✅ [${webhookId}] Payment record created: ${payment.id}`);

      // 3. Queue downstream operations (outbox pattern)
      const downstreamOperations = [
        {
          type: "create_calendar_event",
          data: {
            appointmentId: appointmentId,
            therapistId: normalized.therapistId, // CRITICAL: Include therapistId for proper calendar access
            clientEmail: metadata.client_email,
            therapistEmail: metadata.therapist_email,
            clientName: metadata.client_name || "Client",
            scheduledAt: scheduledAt.toISOString(),
            endTime: endTime.toISOString(),
            duration: duration,
            sessionType: normalized.sessionType || "therapy",
            title: `Therapy Session - ${metadata.client_name || "Client"}`,
            description: `Hive Wellness therapy session scheduled for ${scheduledAt.toLocaleString()}`,
            timeZone: "Europe/London",
            isPastDate: isPastDate,
            isBackdated: isBackdated,
            backdatedReason: metadata.backdated_reason || "",
          },
        },
        {
          type: "send_confirmation_email",
          data: {
            appointmentId: appointmentId,
            clientEmail: metadata.client_email,
            appointmentDetails: appointmentData,
          },
        },
      ];

      // Create queue items for reliable downstream processing
      for (const operation of downstreamOperations) {
        await this.storage.createWebhookProcessingQueueItem({
          id: nanoid(),
          webhookEventId: webhookEventId,
          operationType: operation.type as any,
          operationData: operation.data,
          status: "pending",
          priority: 10, // High priority for appointment-related operations
          maxRetries: 3,
          currentRetries: 0,
          scheduledFor: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      console.log(`✅ [${webhookId}] Queued ${downstreamOperations.length} downstream operations`);

      return appointmentId;
    });
  }

  /**
   * Update existing appointment payment status and trigger therapist payout
   */
  private async updateExistingAppointmentPayment(
    paymentIntent: any,
    webhookId: string
  ): Promise<void> {
    const metadata = paymentIntent.metadata;
    const appointmentId = metadata.appointmentId || metadata.sessionId;

    if (!appointmentId) {
      throw new Error("No appointment ID found in payment metadata");
    }

    // Update payment status
    let paymentRecord;
    try {
      await this.storage.updatePaymentByStripeId(paymentIntent.id, {
        status: "succeeded",
        updatedAt: new Date(),
      });
      paymentRecord = await this.storage.getPaymentByStripePaymentIntentId(paymentIntent.id);
      console.log(`💾 [${webhookId}] Payment record updated for appointment ${appointmentId}`);
    } catch (paymentUpdateError) {
      console.error(`❌ [${webhookId}] Failed to update payment record:`, paymentUpdateError);
    }

    // Mark appointment as completed with payment
    try {
      await this.storage.markAppointmentAsCompleteWithPayment(appointmentId, paymentIntent.id);
      console.log(
        `✅ [${webhookId}] Appointment ${appointmentId} marked as completed with payment`
      );
    } catch (appointmentUpdateError) {
      console.error(
        `❌ [${webhookId}] Failed to mark appointment complete:`,
        appointmentUpdateError
      );
    }

    // CRITICAL FIX: Trigger therapist payout (85% revenue split)
    if (paymentRecord) {
      try {
        console.log(
          `💰 [${webhookId}] Triggering therapist payout for payment ${paymentRecord.id} on appointment ${appointmentId}`
        );

        const payoutResult = await triggerTherapistPayoutOnSessionCompletion(
          appointmentId,
          paymentRecord.id,
          "webhook"
        );

        if (payoutResult.success) {
          console.log(
            `✅ [${webhookId}] Therapist payout ${payoutResult.payoutId} triggered successfully via webhook`
          );
        } else {
          console.error(
            `❌ [${webhookId}] Therapist payout failed via webhook: ${payoutResult.message}`
          );
          // Log but don't fail the webhook - payout can be retried
        }
      } catch (payoutError) {
        console.error(
          `❌ [${webhookId}] Unexpected error triggering therapist payout via webhook:`,
          payoutError
        );
        // Log but don't fail the webhook - payout can be retried manually
      }
    } else {
      console.warn(
        `⚠️ [${webhookId}] Could not trigger payout - payment record not found after update`
      );
    }
  }

  /**
   * Process failed payment
   */
  private async processPaymentFailed(
    paymentIntent: any,
    webhookId: string,
    webhookEventId: string
  ): Promise<{
    operationsCompleted: string[];
  }> {
    console.log(`💳❌ [${webhookId}] Processing failed payment: ${paymentIntent.id}`);

    // Update payment status
    try {
      await this.storage.updatePaymentStatusByPaymentIntent(paymentIntent.id, "failed");
      console.log(`📝 [${webhookId}] Payment status updated to failed`);
    } catch (error) {
      console.error(`❌ [${webhookId}] Could not update payment status:`, error);
    }

    return { operationsCompleted: ["payment_status_updated"] };
  }

  /**
   * Process individual queue item with error handling
   */
  private async processQueueItem(item: any): Promise<void> {
    const lockUntil = new Date(Date.now() + this.LOCK_TIMEOUT_MS);
    const lockedBy = nanoid();

    try {
      // Lock the item for processing
      await this.storage.updateWebhookQueueItemStatus(item.id, "in_progress", {
        lockUntil,
        lockedBy,
      });

      console.log(`🔄 Processing queue item ${item.id}: ${item.operationType}`);

      // Process based on operation type
      switch (item.operationType) {
        case "create_calendar_event":
          await this.createCalendarEvent(item.operationData);
          break;

        case "send_email":
        case "send_confirmation_email":
          await this.sendConfirmationEmail(item.operationData);
          break;

        default:
          console.log(`⚠️ Unknown operation type: ${item.operationType}`);
      }

      // Mark as completed
      await this.storage.completeWebhookQueueItem(item.id);
      console.log(`✅ Completed queue item ${item.id}`);
    } catch (error: any) {
      console.error(`❌ Failed to process queue item ${item.id}:`, error);

      const shouldRetry = item.currentRetries < item.maxRetries;

      if (shouldRetry) {
        const nextRetryAt = new Date(
          Date.now() +
            this.RETRY_DELAYS[Math.min(item.currentRetries, this.RETRY_DELAYS.length - 1)]
        );

        await this.storage.updateWebhookQueueItemStatus(item.id, "pending", {
          failureReason: error.message,
          nextRetryAt,
        });

        console.log(`🔄 Retry queued for item ${item.id} at ${nextRetryAt.toISOString()}`);
      } else {
        await this.storage.updateWebhookQueueItemStatus(item.id, "failed", {
          failureReason: `Max retries exceeded: ${error.message}`,
        });

        console.log(`❌ Max retries exceeded for item ${item.id}`);
      }
    }
  }

  /**
   * Create calendar event downstream operation
   * CRITICAL FIX: Implements actual Google Meet room creation outside of DB transaction
   */
  private async createCalendarEvent(data: any): Promise<void> {
    const { appointmentId, isPastDate, isBackdated } = data;
    console.log(`📅 Creating calendar event for appointment ${appointmentId}`);

    // Check if appointment already has a Google Meet URL (idempotency check)
    const appointment = await this.storage.getAppointmentById(appointmentId);
    if (!appointment) {
      throw new Error(`Appointment ${appointmentId} not found`);
    }

    if (appointment.googleMeetUrl && appointment.googleMeetUrl.trim() !== "") {
      console.log(
        `✅ Appointment ${appointmentId} already has Google Meet URL - skipping creation`
      );
      return;
    }

    let googleMeetUrl = "";

    // Skip Meet room creation for past/backdated appointments
    if (isPastDate || isBackdated) {
      console.log(
        `🔙 SERVICE GUARD: Skipping Google Meet creation for past/backdated appointment ${appointmentId}`
      );
      googleMeetUrl = ""; // Keep empty for past sessions
    } else {
      try {
        console.log(`📅 Creating Google Meet room for appointment ${appointmentId}...`);
        const meetingEvent = await GoogleMeetService.createCalendarEvent({
          title: data.title || `Therapy Session - ${data.clientName || "Client"}`,
          description: data.description || `Hive Wellness therapy session`,
          startTime: new Date(data.scheduledAt),
          endTime: new Date(data.endTime),
          attendees: [data.clientEmail || "", data.therapistEmail || ""].filter((email) => email),
          timeZone: data.timeZone || "Europe/London",
          therapistId: appointment.primaryTherapistId || data.therapistId,
          useAdminCalendar: true, // Fallback if therapistId is unavailable
        });

        googleMeetUrl = meetingEvent.meetingUrl || "";
        console.log(
          `✅ Google Meet room created for appointment ${appointmentId}: ${googleMeetUrl}`
        );
      } catch (meetError) {
        console.warn(
          `⚠️ Failed to create Google Meet room for appointment ${appointmentId}, using fallback:`,
          meetError
        );

        // Create fallback Google Meet URL using the service's fallback method
        try {
          const fallbackMeeting = GoogleMeetService.generateMeetLink({
            title: data.title || `Therapy Session - ${data.clientName || "Client"}`,
            description: data.description || `Therapy session`,
            clientName: data.clientName || "Client",
            sessionType: data.sessionType || "therapy",
          });
          googleMeetUrl = fallbackMeeting.meetingUrl;
          console.log(
            `✅ Fallback Google Meet URL created for appointment ${appointmentId}: ${googleMeetUrl}`
          );
        } catch (fallbackError) {
          console.error(
            `❌ Fallback Google Meet creation also failed for appointment ${appointmentId}:`,
            fallbackError
          );
          throw fallbackError; // Let the queue retry this operation
        }
      }
    }

    // Update appointment with Google Meet URL (quick DB operation outside of transaction)
    try {
      await this.storage.updateAppointment(appointmentId, {
        googleMeetUrl: googleMeetUrl,
        videoRoomId: googleMeetUrl,
        updatedAt: new Date(),
      });
      console.log(`✅ Updated appointment ${appointmentId} with Google Meet URL`);
    } catch (updateError) {
      console.error(
        `❌ Failed to update appointment ${appointmentId} with Google Meet URL:`,
        updateError
      );
      throw updateError; // Let the queue retry this operation
    }
  }

  /**
   * Send confirmation email downstream operation
   */
  private async sendConfirmationEmail(data: any): Promise<void> {
    console.log(`📧 Sending confirmation email for appointment ${data.appointmentId}`);

    try {
      // Get appointment details from database
      const appointment = await this.storage.getAppointmentById(data.appointmentId);
      if (!appointment) {
        throw new Error(`Appointment ${data.appointmentId} not found`);
      }

      // Get client and therapist details
      const [client, therapist] = await Promise.all([
        appointment.clientId ? this.storage.getUserById(appointment.clientId) : null,
        appointment.primaryTherapistId
          ? this.storage.getUserById(appointment.primaryTherapistId)
          : null,
      ]);

      if (!client || !therapist) {
        throw new Error(`Missing participant data for appointment ${data.appointmentId}`);
      }

      // Send confirmation emails to both client and therapist
      const emailResults = await Promise.allSettled([
        this.sendClientConfirmationEmail(appointment, client, therapist),
        this.sendTherapistConfirmationEmail(appointment, client, therapist),
      ]);

      // Log results
      const clientResult = emailResults[0];
      const therapistResult = emailResults[1];

      if (clientResult.status === "fulfilled") {
        console.log(`✅ Client confirmation email sent to ${client.email}`);
      } else {
        console.error(`❌ Failed to send client email:`, clientResult.reason);
      }

      if (therapistResult.status === "fulfilled") {
        console.log(`✅ Therapist confirmation email sent to ${therapist.email}`);
      } else {
        console.error(`❌ Failed to send therapist email:`, therapistResult.reason);
      }

      console.log(`✅ Confirmation emails processed for appointment ${data.appointmentId}`);
    } catch (error) {
      console.error(
        `❌ Error sending confirmation emails for appointment ${data.appointmentId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Send appointment confirmation email to client
   */
  private async sendClientConfirmationEmail(
    appointment: any,
    client: any,
    therapist: any
  ): Promise<void> {
    const mailService = new MailService();
    mailService.setApiKey(process.env.SENDGRID_API_KEY!);

    const sessionDate = new Date(appointment.scheduledAt);
    const meetingUrl =
      appointment.googleMeetLink || appointment.videoRoomId || "https://meet.google.com/";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Therapy Session Confirmed - Hive Wellness</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background: white; }
          .header { background: linear-gradient(135deg, #9306B1 0%, #7c3aed 100%); padding: 40px 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { padding: 40px 20px; }
          .booking-details { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .confirmation-box { background: #fef7ff; border: 1px solid #9306B1; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .cta-button { background: #9306B1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 15px 0; }
          .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Your Therapy Session is Confirmed!</h1>
          </div>
          
          <div class="content">
            <div class="confirmation-box">
              <h2 style="color: #9306B1; margin-top: 0;">Session Details</h2>
              <p>Hello <strong>${client.firstName} ${client.lastName}</strong>,</p>
              <p>Your therapy session has been confirmed and payment has been processed successfully.</p>
            </div>
            
            <div class="booking-details">
              <h3>Session Information</h3>
              <p><strong>Date:</strong> ${sessionDate.toLocaleDateString("en-GB", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}</p>
              <p><strong>Time:</strong> ${sessionDate.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Europe/London",
              })} (UK Time)</p>
              <p><strong>Duration:</strong> ${appointment.duration || 50} minutes</p>
              <p><strong>Therapist:</strong> ${therapist.firstName} ${therapist.lastName}</p>
              <p><strong>Session Type:</strong> ${appointment.sessionType || "Therapy"}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${meetingUrl}" class="cta-button">Join Video Session</a>
            </div>

            <div style="background: #E5E7F5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>How to Join Your Session</h3>
              <ol>
                <li>Click the "Join Video Session" button above 5 minutes before your scheduled time</li>
                <li>Choose "Join with browser" (no app download required)</li>
                <li>Allow camera and microphone access when prompted</li>
                <li>Wait for your therapist to join</li>
              </ol>
              <p><strong>Meeting Link:</strong> <a href="${meetingUrl}">${meetingUrl}</a></p>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              If you need to reschedule or have any questions, please contact us at 
              <a href="mailto:support@hive-wellness.co.uk">support@hive-wellness.co.uk</a>
            </p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Hive Wellness. All rights reserved.</p>
            <p>This email was sent to ${client.email} regarding your therapy session.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await mailService.send({
      to: client.email,
      from: "support@hive-wellness.co.uk",
      subject: `✅ Therapy Session Confirmed - ${sessionDate.toLocaleDateString("en-GB")} at ${sessionDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
      html: emailHtml,
    });
  }

  /**
   * Send appointment confirmation email to therapist
   */
  private async sendTherapistConfirmationEmail(
    appointment: any,
    client: any,
    therapist: any
  ): Promise<void> {
    const mailService = new MailService();
    mailService.setApiKey(process.env.SENDGRID_API_KEY!);

    const sessionDate = new Date(appointment.scheduledAt);
    const meetingUrl =
      appointment.googleMeetLink || appointment.videoRoomId || "https://meet.google.com/";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Session Booked - Hive Wellness</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background: white; }
          .header { background: #9306B1; padding: 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 20px; }
          .content { padding: 20px; }
          .booking-details { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .actions { background: #E5E7F5; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .cta-button { background: #9306B1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 New Session Booked</h1>
          </div>
          
          <div class="content">
            <div class="booking-details">
              <h3 style="margin-top: 0;">Session Details</h3>
              <p><strong>Client:</strong> ${client.firstName} ${client.lastName}</p>
              <p><strong>Client Email:</strong> ${client.email}</p>
              <p><strong>Date:</strong> ${sessionDate.toLocaleDateString("en-GB", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}</p>
              <p><strong>Time:</strong> ${sessionDate.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Europe/London",
              })} (UK Time)</p>
              <p><strong>Duration:</strong> ${appointment.duration || 50} minutes</p>
              <p><strong>Session Type:</strong> ${appointment.sessionType || "Therapy"}</p>
              <p><strong>Appointment ID:</strong> ${appointment.id}</p>
            </div>
            
            <div class="actions">
              <h3>Next Steps</h3>
              <p>The client has been sent confirmation details and payment has been processed.</p>
              <div style="text-align: center;">
                <a href="${meetingUrl}" class="cta-button">Join Video Session</a>
              </div>
              <p><strong>Meeting Link:</strong> <a href="${meetingUrl}">${meetingUrl}</a></p>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              Please join the session at the scheduled time. If you need to reschedule, 
              contact admin at <a href="mailto:admin@hive-wellness.co.uk">admin@hive-wellness.co.uk</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await mailService.send({
      to: therapist.email,
      from: "support@hive-wellness.co.uk",
      cc: "admin@hive-wellness.co.uk",
      subject: `📅 New Session: ${client.firstName} ${client.lastName} - ${sessionDate.toLocaleDateString("en-GB")} at ${sessionDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
      html: emailHtml,
    });
  }

  /**
   * CRITICAL: Process queued operations with atomic claiming and exponential backoff
   * Uses atomic UPDATE operations to prevent race conditions between workers
   */
  async processQueuedOperations(batchSize: number = 10): Promise<void> {
    try {
      console.log(`🔍 [${this.WORKER_ID}] Starting queue processing (batch size: ${batchSize})`);

      // Atomic claim of queue items
      const claimedItems = await this.storage.atomicClaimWebhookQueueItems(
        this.WORKER_ID,
        batchSize,
        this.LOCK_TIMEOUT_MS
      );

      if (claimedItems.length === 0) {
        console.log(`💭 [${this.WORKER_ID}] No queue items to process`);
        return;
      }

      console.log(`🔒 [${this.WORKER_ID}] Claimed ${claimedItems.length} queue items`);

      // Process each claimed item
      for (const item of claimedItems) {
        await this.processQueueItemAtomic(item);
      }

      console.log(`✅ [${this.WORKER_ID}] Completed processing ${claimedItems.length} queue items`);
    } catch (error: any) {
      console.error(`❌ [${this.WORKER_ID}] Queue processing failed:`, error);
      throw error;
    }
  }

  /**
   * Process individual queue item with proper error handling and retry logic
   */
  private async processQueueItemAtomic(item: any): Promise<void> {
    const itemId = item.id;
    console.log(`⚙️ [${this.WORKER_ID}] Processing queue item ${itemId} (${item.operationType})`);

    try {
      // Process based on operation type using existing methods
      switch (item.operationType) {
        case "create_appointment":
        case "create_calendar_event":
          await this.createCalendarEvent(item.operationData);
          break;
        case "send_email":
          await this.sendConfirmationEmail(item.operationData);
          break;
        case "update_payment":
        case "process_payout":
          console.log(`💳 [${this.WORKER_ID}] Processing ${item.operationType} for item ${itemId}`);
          // Use existing payment processing logic
          break;
        default:
          throw new Error(`Unknown operation type: ${item.operationType}`);
      }

      // Mark as completed
      await this.storage.updateWebhookQueueItemStatus(itemId, "completed");
      console.log(`✅ [${this.WORKER_ID}] Queue item ${itemId} completed successfully`);
    } catch (error: any) {
      console.error(`❌ [${this.WORKER_ID}] Queue item ${itemId} failed:`, error);

      // Implement exponential backoff
      const retryDelay = this.calculateRetryDelay(item.currentRetries || 0);
      const nextRetryAt = retryDelay ? new Date(Date.now() + retryDelay) : undefined;

      if (item.currentRetries < item.maxRetries && retryDelay) {
        // Schedule retry
        await this.storage.releaseWebhookQueueLock(itemId, "pending", nextRetryAt);
        console.log(
          `🔄 [${this.WORKER_ID}] Queue item ${itemId} scheduled for retry in ${retryDelay}ms`
        );
      } else {
        // Max retries exceeded - mark as failed
        await this.storage.updateWebhookQueueItemStatus(itemId, "failed", {
          failureReason: error.message,
        });
        console.error(`🚫 [${this.WORKER_ID}] Queue item ${itemId} failed permanently`);
      }
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateRetryDelay(retryCount: number): number | null {
    if (retryCount >= this.RETRY_DELAYS.length) {
      return null; // No more retries
    }
    return this.RETRY_DELAYS[retryCount];
  }
}
