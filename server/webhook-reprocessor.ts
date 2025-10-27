import { storage } from "./storage";
import { WebhookProcessor } from "./webhook-processor";
import { nanoid } from "nanoid";

/**
 * Script to reprocess stuck webhook events with proper idempotency
 *
 * This script handles the 5 webhook events that are stuck in 'processing' status
 * and ensures they're completed with proper appointment assignments
 */

const STUCK_WEBHOOK_EVENTS = [
  {
    dbId: "WK9nlbS_1GeH5nXtXkZMo",
    stripeEventId: "evt_3S8J5XIEJYdqjxzJ09Yc0t0w",
    scheduledAt: "2025-09-23T08:00",
    sessionType: "introduction",
  },
  {
    dbId: "-jnpxgnAOURmt1yeocZGI",
    stripeEventId: "evt_3S8JbcIEJYdqjxzJ0zsIAl27",
    scheduledAt: "2025-09-25T11:30",
    sessionType: "therapy",
  },
  {
    dbId: "an7sQKC5X3KSM340gXFkL",
    stripeEventId: "evt_3S8Jh6IEJYdqjxzJ0GdTmPjl",
    scheduledAt: "2025-09-17T12:00",
    sessionType: "therapy",
  },
  {
    dbId: "jcjGwhQaN6zSgdhZoVxW2",
    stripeEventId: "evt_3S8LlhIEJYdqjxzJ16ohxbRq",
    scheduledAt: "2025-09-17T14:00",
    sessionType: "introduction",
  },
  {
    dbId: "7F2EiJusRf4pdUtE9wzC9",
    stripeEventId: "evt_3S8PwoIEJYdqjxzJ0N2YWrO8",
    scheduledAt: "2025-09-18T12:00",
    sessionType: "therapy",
  },
];

export class WebhookReprocessor {
  private webhookProcessor: WebhookProcessor;

  constructor() {
    this.webhookProcessor = new WebhookProcessor(storage);
  }

  /**
   * Reprocess all stuck webhook events
   */
  async reprocessStuckWebhooks(): Promise<void> {
    console.log("🔄 Starting reprocessing of stuck webhook events...");
    console.log(`📊 Processing ${STUCK_WEBHOOK_EVENTS.length} webhook events`);

    const results = [];

    for (const webhookInfo of STUCK_WEBHOOK_EVENTS) {
      try {
        console.log(`\n🎯 Processing webhook: ${webhookInfo.dbId} (${webhookInfo.stripeEventId})`);
        console.log(`   📅 ${webhookInfo.scheduledAt} - ${webhookInfo.sessionType} session`);

        // Get the webhook event data from storage using Stripe event ID
        const webhookEvent = await storage.getWebhookEvent(webhookInfo.stripeEventId);

        if (!webhookEvent) {
          console.error(`❌ Webhook event not found: ${webhookInfo.stripeEventId}`);
          results.push({
            webhookId: webhookInfo.dbId,
            stripeEventId: webhookInfo.stripeEventId,
            success: false,
            error: "Event not found",
          });
          continue;
        }

        console.log(`📋 Event details:`, {
          eventId: webhookEvent.eventId,
          eventType: webhookEvent.eventType,
          currentStatus: webhookEvent.processingStatus,
          attemptCount: webhookEvent.attemptCount,
        });

        // Extract metadata for analysis
        const eventData = webhookEvent.eventData as any;
        const metadata = eventData?.data?.object?.metadata || {};

        console.log(`🔍 Metadata preview:`, {
          hive_client_id: metadata.hive_client_id,
          hive_therapist_id: metadata.hive_therapist_id,
          scheduled_at: metadata.scheduled_at,
          session_type: metadata.session_type,
          hive_appointment_id: metadata.hive_appointment_id,
        });

        // Skip appointment checking for now - the webhook processor will handle idempotency
        console.log(`📅 Scheduled time: ${metadata.scheduled_at}`);

        // Webhook processor will handle appointment discovery during processing

        // Reprocess the webhook using the fixed processor
        const reprocessingId = `reprocess-${nanoid()}`;
        const result = await this.webhookProcessor.processStripeWebhook(eventData, reprocessingId);

        console.log(`✅ Reprocessing result:`, {
          success: result.success,
          alreadyProcessed: result.alreadyProcessed,
          appointmentId: result.appointmentId,
          errors: result.errors,
        });

        results.push({
          webhookId: webhookInfo.dbId,
          stripeEventId: webhookInfo.stripeEventId,
          eventId: webhookEvent.eventId,
          success: result.success,
          alreadyProcessed: result.alreadyProcessed,
          appointmentId: result.appointmentId,
          errors: result.errors,
        });
      } catch (error: any) {
        console.error(`❌ Error processing webhook ${webhookInfo.dbId}:`, error);
        results.push({
          webhookId: webhookInfo.dbId,
          stripeEventId: webhookInfo.stripeEventId,
          success: false,
          error: error.message || "Unknown error",
        });
      }
    }

    // Summary report
    console.log("\n📊 REPROCESSING SUMMARY:");
    console.log("====================================");

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log(`✅ Successfully processed: ${successful.length}/${results.length}`);
    console.log(`❌ Failed to process: ${failed.length}/${results.length}`);

    if (successful.length > 0) {
      console.log("\n✅ SUCCESSFUL REPROCESSING:");
      successful.forEach((result) => {
        console.log(
          `  - ${result.webhookId}: ${result.alreadyProcessed ? "Already processed" : "Newly processed"}`
        );
        if (result.appointmentId) {
          console.log(`    → Appointment ID: ${result.appointmentId}`);
        }
      });
    }

    if (failed.length > 0) {
      console.log("\n❌ FAILED REPROCESSING:");
      failed.forEach((result) => {
        console.log(`  - ${result.webhookId}: ${result.error || "Unknown error"}`);
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach((err) => console.log(`    → ${err}`));
        }
      });
    }

    // Verification step
    await this.verifyCompletionStatus();
  }

  /**
   * Verify that all webhook events are now completed
   */
  async verifyCompletionStatus(): Promise<void> {
    console.log("\n🔍 VERIFICATION: Checking final webhook statuses...");

    for (const webhookInfo of STUCK_WEBHOOK_EVENTS) {
      try {
        const webhookEvent = await storage.getWebhookEvent(webhookInfo.stripeEventId);

        if (!webhookEvent) {
          console.log(`❌ ${webhookInfo.dbId} (${webhookInfo.stripeEventId}): Event not found`);
          continue;
        }

        console.log(
          `📋 ${webhookInfo.dbId}: ${webhookEvent.processingStatus}${
            webhookEvent.createdAppointmentId ? ` → ${webhookEvent.createdAppointmentId}` : ""
          }`
        );
      } catch (error: any) {
        console.log(`❌ ${webhookInfo.dbId}: Error checking status - ${error.message}`);
      }
    }
  }
}

/**
 * Main execution function
 */
export async function reprocessStuckWebhooks(): Promise<void> {
  const reprocessor = new WebhookReprocessor();
  await reprocessor.reprocessStuckWebhooks();
}

// Auto-execute when run directly
reprocessStuckWebhooks()
  .then(() => {
    console.log("🎉 Webhook reprocessing completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error during reprocessing:", error);
    process.exit(1);
  });
