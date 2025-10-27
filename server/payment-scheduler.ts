import { processScheduledPaymentReleases } from "./stripe-payment-holds";

/**
 * Automated payment release scheduler
 * Runs every hour to check for payments ready to be released to therapists
 */
export class PaymentScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start() {
    if (this.isRunning) {
      console.log("Payment scheduler already running");
      return;
    }

    console.log("🚀 Starting payment release scheduler...");
    this.isRunning = true;

    // Run immediately on start
    this.processPayments();

    // Then run every hour
    this.intervalId = setInterval(
      () => {
        this.processPayments();
      },
      60 * 60 * 1000
    ); // 1 hour in milliseconds

    console.log("✅ Payment scheduler started - checking every hour");
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("🛑 Payment scheduler stopped");
  }

  private async processPayments() {
    try {
      console.log("🔄 Checking for payments ready for release...");

      const result = await processScheduledPaymentReleases();

      if (result.processed > 0) {
        console.log(`💰 Released ${result.processed} payments to therapists`);

        if (result.failed > 0) {
          console.warn(`⚠️ Failed to process ${result.failed} payments`);
        }
      } else {
        console.log("ℹ️ No payments ready for release");
      }
    } catch (error) {
      console.error("❌ Error in payment scheduler:", error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      nextCheck: this.intervalId ? new Date(Date.now() + 60 * 60 * 1000) : null,
    };
  }
}

// Global scheduler instance
export const paymentScheduler = new PaymentScheduler();
