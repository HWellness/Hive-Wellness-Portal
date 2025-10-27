import cron from "node-cron";
import { WebhookProcessor } from "./webhook-processor";
import { storage } from "./storage";

/**
 * Background queue processor for webhook downstream operations
 * Processes queued operations using the outbox pattern
 */
export class WebhookQueueProcessor {
  private webhookProcessor: WebhookProcessor;
  private isProcessing = false;
  private processInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.webhookProcessor = new WebhookProcessor(storage);
  }

  /**
   * Start the background queue processor
   */
  start(): void {
    console.log("🚀 Starting webhook queue processor...");

    // Process queue every 30 seconds
    this.processInterval = setInterval(() => {
      this.processQueue();
    }, 30000);

    // Also run a cron job every minute for reliability
    cron.schedule("*/1 * * * *", () => {
      this.processQueue();
    });

    console.log("✅ Webhook queue processor started");
  }

  /**
   * Stop the background queue processor
   */
  stop(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    console.log("⏹️ Webhook queue processor stopped");
  }

  /**
   * Process queued webhook operations
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return; // Prevent concurrent processing
    }

    this.isProcessing = true;

    try {
      await this.webhookProcessor.processQueuedOperations(20); // Process up to 20 items
    } catch (error) {
      console.error("❌ Error processing webhook queue:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Manual queue processing (for testing)
   */
  async processQueueManually(): Promise<void> {
    await this.processQueue();
  }
}

// Export singleton instance
export const webhookQueueProcessor = new WebhookQueueProcessor();

// Auto-start in production
if (process.env.NODE_ENV === "production") {
  webhookQueueProcessor.start();
}
