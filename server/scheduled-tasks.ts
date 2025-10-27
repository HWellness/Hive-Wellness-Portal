// Scheduled Tasks Service for Hive Wellness
// Handles automatic HubSpot imports and other recurring tasks

import cron from "node-cron";
import { nanoid } from "nanoid";
import type { DatabaseStorage } from "./storage.js";

export class ScheduledTasksService {
  private storage: DatabaseStorage;
  private isInitialized = false;

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
  }

  // Initialize all scheduled tasks
  initialize() {
    if (this.isInitialized) {
      console.log("⚠️ Scheduled tasks already initialized");
      return;
    }

    console.log("🚀 Initializing scheduled tasks...");

    // Schedule HubSpot import every hour
    this.scheduleHubSpotImport();

    // Schedule Gravity Forms sync every 30 minutes
    this.scheduleGravityFormsSync();

    // Schedule data cleanup daily at 2 AM
    this.scheduleDataCleanup();

    // Schedule appointment reminder queue creation every hour
    this.scheduleAppointmentReminders();

    // Schedule reminder processing every 15 minutes
    this.scheduleReminderProcessing();

    // Schedule retention warning emails daily at 10 AM
    this.scheduleRetentionWarnings();

    this.isInitialized = true;
    console.log("✅ All scheduled tasks initialized successfully");
  }

  // Import from HubSpot every hour
  private scheduleHubSpotImport() {
    // Run every hour at minute 0 (e.g., 10:00, 11:00, 12:00)
    cron.schedule("0 * * * *", async () => {
      console.log("🔄 Starting scheduled HubSpot import...");
      console.log("📅 Current time:", new Date().toISOString());

      if (!process.env.HUBSPOT_API_KEY) {
        console.log("⚠️ HubSpot API key not configured, skipping import");
        return;
      }

      try {
        const { HubSpotIntegrationService } = await import("./hubspot-integration-service.js");
        const hubspotService = new HubSpotIntegrationService(this.storage);

        const results = await hubspotService.importAllRealData();

        console.log("✅ Scheduled HubSpot import completed:", {
          clientQuestionnaires: results.clientQuestionnaires.imported,
          therapistApplications: results.therapistApplications.imported,
          timestamp: new Date().toISOString(),
        });

        // Log successful import to system notifications
        if (
          results.clientQuestionnaires.imported > 0 ||
          results.therapistApplications.imported > 0
        ) {
          await this.storage.createNotification({
            id: nanoid(),
            userId: "system",
            type: "custom",
            recipient: "system",
            subject: "Scheduled HubSpot Import",
            message: `Imported ${results.clientQuestionnaires.imported} client questionnaires and ${results.therapistApplications.imported} therapist applications`,
            channel: "email",
            status: "delivered",
            metadata: {
              source: "scheduled_task",
              results: results,
            },
          });
        }
      } catch (error) {
        console.error("❌ Scheduled HubSpot import failed:", error);

        // Log error to system notifications
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await this.storage.createNotification({
          id: nanoid(),
          userId: "system",
          type: "custom",
          recipient: "system",
          subject: "Scheduled HubSpot Import Failed",
          message: `HubSpot import error: ${errorMessage}`,
          channel: "email",
          status: "failed",
          metadata: {
            source: "scheduled_task",
            error: errorMessage,
          },
        });
      }
    });

    console.log("⏰ HubSpot import scheduled: Every hour at minute 0");
  }

  // Sync Gravity Forms every 30 minutes
  private scheduleGravityFormsSync() {
    cron.schedule("*/30 * * * *", async () => {
      console.log("🔄 Starting scheduled Gravity Forms sync...");

      try {
        const { wordpressIntegration } = await import("./wordpress-integration.js");
        const wpService = wordpressIntegration;

        // Trigger sync to process new entries
        const result = await wpService.triggerSync();
        const totalProcessed = result.processed;

        console.log(
          `✅ Scheduled Gravity Forms sync completed: ${totalProcessed} entries processed`
        );

        if (totalProcessed > 0) {
          await this.storage.createNotification({
            id: nanoid(),
            userId: "system",
            type: "custom",
            recipient: "system",
            subject: "Scheduled Gravity Forms Sync",
            message: `Processed ${totalProcessed} new form entries`,
            channel: "email",
            status: "delivered",
            metadata: {
              source: "scheduled_task",
              entriesProcessed: totalProcessed,
            },
          });
        }
      } catch (error) {
        console.error("❌ Scheduled Gravity Forms sync failed:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await this.storage.createNotification({
          id: nanoid(),
          userId: "system",
          type: "custom",
          recipient: "system",
          subject: "Scheduled Gravity Forms Sync Failed",
          message: `Gravity Forms sync error: ${errorMessage}`,
          channel: "email",
          status: "failed",
          metadata: {
            source: "scheduled_task",
            error: errorMessage,
          },
        });
      }
    });

    console.log("⏰ Gravity Forms sync scheduled: Every 30 minutes");
  }

  // Daily data cleanup at 2 AM (includes HIPAA-compliant data retention)
  private scheduleDataCleanup() {
    cron.schedule("0 2 * * *", async () => {
      console.log("🧹 Starting scheduled data cleanup and retention...");

      try {
        // HIPAA-compliant data retention automation
        const { dataRetentionService } = await import("./data-retention-service.js");

        console.log("🗑️ Running data retention policies...");
        const retentionResults = await dataRetentionService.runRetention(false);

        // Summarize retention results
        let totalSoftDeleted = 0;
        let totalHardDeleted = 0;
        let totalSkipped = 0;
        const errors: string[] = [];

        for (const result of retentionResults) {
          totalSoftDeleted += result.softDeleted;
          totalHardDeleted += result.hardDeleted;
          totalSkipped += result.skipped;
          errors.push(...result.errors);
        }

        console.log(`✅ Data retention completed:`, {
          softDeleted: totalSoftDeleted,
          hardDeleted: totalHardDeleted,
          skipped: totalSkipped,
          errors: errors.length,
        });

        // Save retention logs to database for HIPAA audit trail
        const retentionLogs = dataRetentionService.getRetentionLogs();
        for (const log of retentionLogs) {
          await this.storage.createRetentionAuditLog({
            id: nanoid(),
            timestamp: log.timestamp,
            dataType: log.dataType,
            recordId: log.recordId,
            action: log.action,
            reason: log.reason,
            dryRun: log.dryRun,
            executedBy: "system",
            metadata: {},
          });
        }

        // Clear in-memory logs
        dataRetentionService.clearLogs();

        // GDPR compliance: cleanup old exports and process deletion requests
        console.log("🔒 Running GDPR cleanup tasks...");
        const { gdprService } = await import("./gdpr-service.js");

        // Cleanup old export files (>7 days)
        const exportsDeleted = await gdprService.deleteExpiredExports();
        console.log(`✅ GDPR export cleanup: ${exportsDeleted} old exports deleted`);

        // Process pending deletion requests (grace period expired)
        const accountsDeleted = await gdprService.processScheduledDeletions();
        console.log(`✅ GDPR deletion processing: ${accountsDeleted} accounts deleted`);

        console.log("✅ Scheduled data cleanup and retention completed");

        await this.storage.createNotification({
          id: nanoid(),
          userId: "system",
          type: "custom",
          recipient: "system",
          subject: "Scheduled Data Cleanup & Retention",
          message: `Daily maintenance completed: ${totalSoftDeleted} soft deleted, ${totalHardDeleted} hard deleted, ${totalSkipped} skipped. GDPR: ${exportsDeleted} exports deleted, ${accountsDeleted} accounts deleted.`,
          channel: "email",
          status: "delivered",
          metadata: {
            source: "scheduled_task",
            cleanupDate: new Date().toISOString(),
            retentionResults: retentionResults,
            gdprExportsDeleted: exportsDeleted,
            gdprAccountsDeleted: accountsDeleted,
            errors: errors,
          },
        });
      } catch (error) {
        console.error("❌ Scheduled data cleanup failed:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await this.storage.createNotification({
          id: nanoid(),
          userId: "system",
          type: "custom",
          recipient: "system",
          subject: "Data Cleanup Failed",
          message: `Data cleanup error: ${errorMessage}`,
          channel: "email",
          status: "failed",
          metadata: {
            source: "scheduled_task",
            error: errorMessage,
          },
        });
      }
    });

    console.log("⏰ Data cleanup & retention scheduled: Daily at 2:00 AM (UK time)");
  }

  // Schedule appointment reminders every hour
  private scheduleAppointmentReminders() {
    // Check for upcoming appointments and create reminder queue items every hour at minute 30
    cron.schedule("30 * * * *", async () => {
      console.log("📬 Creating reminder queue items from appointments...");

      try {
        const { ReminderAutomationService } = await import(
          "./services/reminder-automation-service.js"
        );
        const reminderService = new ReminderAutomationService(this.storage);

        // Create reminder queue items based on active configurations
        const createResult = await reminderService.createRemindersFromAppointments();

        console.log(
          `✅ Reminder queue creation completed: ${createResult.created} created, ${createResult.errors} errors`
        );

        if (createResult.created > 0) {
          await this.storage.createNotification({
            id: nanoid(),
            userId: "system",
            type: "custom",
            recipient: "system",
            subject: "Reminder Queue Updated",
            message: `Created ${createResult.created} reminder queue items from upcoming appointments`,
            channel: "email",
            status: "delivered",
            metadata: {
              source: "scheduled_task",
              remindersCreated: createResult.created,
              errors: createResult.errors,
            },
          });
        }
      } catch (error) {
        console.error("❌ Scheduled reminder queue creation failed:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await this.storage.createNotification({
          id: nanoid(),
          userId: "system",
          type: "custom",
          recipient: "system",
          subject: "Reminder Queue Creation Failed",
          message: `Reminder queue creation error: ${errorMessage}`,
          channel: "email",
          status: "failed",
          metadata: {
            source: "scheduled_task",
            error: errorMessage,
          },
        });
      }
    });

    console.log("⏰ Reminder queue creation scheduled: Every hour at minute 30");
  }

  // Schedule reminder processing every 15 minutes
  private scheduleReminderProcessing() {
    // Process pending reminders every 15 minutes
    cron.schedule("*/15 * * * *", async () => {
      console.log("📨 Processing pending reminders...");

      try {
        const { ReminderAutomationService } = await import(
          "./services/reminder-automation-service.js"
        );
        const reminderService = new ReminderAutomationService(this.storage);

        // Process and send pending reminders
        const sendResult = await reminderService.processPendingReminders();

        console.log(
          `✅ Reminder processing completed: ${sendResult.sent} sent, ${sendResult.failed} failed`
        );

        if (sendResult.sent > 0) {
          await this.storage.createNotification({
            id: nanoid(),
            userId: "system",
            type: "custom",
            recipient: "system",
            subject: "Reminders Sent",
            message: `Sent ${sendResult.sent} appointment reminders via SMS and email`,
            channel: "email",
            status: "delivered",
            metadata: {
              source: "scheduled_task",
              remindersSent: sendResult.sent,
              failed: sendResult.failed,
            },
          });
        }
      } catch (error) {
        console.error("❌ Scheduled reminder processing failed:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await this.storage.createNotification({
          id: nanoid(),
          userId: "system",
          type: "custom",
          recipient: "system",
          subject: "Reminder Processing Failed",
          message: `Reminder processing error: ${errorMessage}`,
          channel: "email",
          status: "failed",
          metadata: {
            source: "scheduled_task",
            error: errorMessage,
          },
        });
      }
    });

    console.log("⏰ Reminder processing scheduled: Every 15 minutes");
  }

  // Schedule retention warning emails daily at 10 AM
  private scheduleRetentionWarnings() {
    cron.schedule("0 10 * * *", async () => {
      console.log("📧 Checking for users requiring deletion warnings...");

      try {
        const { dataRetentionService } = await import("./data-retention-service.js");
        const gmailServiceModule = await import("./gmail-service.js");
        const gmailService = gmailServiceModule.gmailService;

        // Get users scheduled for deletion in 7 days
        const usersAtRisk = await dataRetentionService.getUsersScheduledForDeletion(7);

        console.log(`⚠️ Found ${usersAtRisk.length} users requiring deletion warning`);

        let emailsSent = 0;
        let emailsFailed = 0;

        for (const user of usersAtRisk) {
          try {
            // Skip if user has no email
            if (!user.email) {
              console.log(`⏭️ Skipping user ${user.id} - no email address`);
              continue;
            }

            // Prepare deletion warning email
            const deletionDate = new Date();
            deletionDate.setDate(deletionDate.getDate() + 7);

            const emailSubject = "⚠️ Account Deletion Notice - Hive Wellness";
            const emailBody = `
              <div style="font-family: 'Open Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #9306B1;">Account Deletion Notice</h2>
                
                <p>Dear ${user.firstName || "User"},</p>
                
                <p>This is a notice that your Hive Wellness account is scheduled for deletion on <strong>${deletionDate.toLocaleDateString(
                  "en-GB",
                  {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }
                )}</strong> due to inactivity.</p>
                
                <h3>Why is this happening?</h3>
                <p>As part of our HIPAA compliance and data retention policy, we automatically remove inactive accounts after 6 months of inactivity to protect your privacy and data security.</p>
                
                <h3>How to keep your account</h3>
                <p>If you would like to keep your account active, simply log in to your Hive Wellness portal within the next 7 days:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://hive-wellness.co.uk"}" 
                     style="background-color: #9306B1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Log In to Your Account
                  </a>
                </div>
                
                <h3>What happens if I don't act?</h3>
                <p>If no action is taken within 7 days, your account and all associated data will be permanently deleted. This includes:</p>
                <ul>
                  <li>Your profile information</li>
                  <li>Session history</li>
                  <li>Messages and conversations</li>
                  <li>Any saved preferences</li>
                </ul>
                
                <p style="margin-top: 30px;">If you have any questions or need assistance, please contact our support team at <a href="mailto:support@hive-wellness.co.uk">support@hive-wellness.co.uk</a>.</p>
                
                <p>Best regards,<br>
                <strong>The Hive Wellness Team</strong></p>
                
                <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
                <p style="font-size: 12px; color: #666; text-align: center;">
                  This is an automated security notice from Hive Wellness. 
                  If you did not create this account, you can safely ignore this email.
                </p>
              </div>
            `;

            // Send warning email
            await gmailService.sendEmail(user.email, emailSubject, emailBody);

            emailsSent++;
            console.log(`✅ Deletion warning sent to ${user.email}`);
          } catch (emailError) {
            console.error(`❌ Failed to send deletion warning to ${user.email}:`, emailError);
            emailsFailed++;
          }
        }

        console.log(
          `✅ Deletion warning emails completed: ${emailsSent} sent, ${emailsFailed} failed`
        );

        // Log the notification activity
        if (emailsSent > 0 || emailsFailed > 0) {
          await this.storage.createNotification({
            id: nanoid(),
            userId: "system",
            type: "custom",
            recipient: "system",
            subject: "Retention Warning Emails Sent",
            message: `Sent ${emailsSent} deletion warning emails to users at risk. ${emailsFailed} failed.`,
            channel: "email",
            status: emailsFailed > 0 ? "failed" : "delivered",
            metadata: {
              source: "scheduled_task",
              emailsSent,
              emailsFailed,
              usersAtRisk: usersAtRisk.length,
            },
          });
        }
      } catch (error) {
        console.error("❌ Scheduled retention warning emails failed:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await this.storage.createNotification({
          id: nanoid(),
          userId: "system",
          type: "custom",
          recipient: "system",
          subject: "Retention Warning Emails Failed",
          message: `Retention warning email error: ${errorMessage}`,
          channel: "email",
          status: "failed",
          metadata: {
            source: "scheduled_task",
            error: errorMessage,
          },
        });
      }
    });

    console.log("⏰ Retention warning emails scheduled: Daily at 10:00 AM");
  }

  // Manual trigger for HubSpot import
  async triggerHubSpotImport(): Promise<any> {
    console.log("🔄 Manual HubSpot import triggered...");

    try {
      const { HubSpotIntegrationService } = await import("./hubspot-integration-service.js");
      const hubspotService = new HubSpotIntegrationService(this.storage);

      const results = await hubspotService.importAllRealData();
      console.log("✅ Manual HubSpot import completed:", results);

      return results;
    } catch (error) {
      console.error("❌ Manual HubSpot import failed:", error);
      throw error;
    }
  }

  // Get task status
  getStatus() {
    return {
      initialized: this.isInitialized,
      tasks: {
        hubspotImport: {
          schedule: "Every hour",
          description: "Import client questionnaires and therapist applications from HubSpot",
        },
        gravityFormsSync: {
          schedule: "Every 30 minutes",
          description: "Sync new form submissions from WordPress Gravity Forms",
        },
        dataCleanup: {
          schedule: "Daily at 2:00 AM",
          description:
            "HIPAA data retention, GDPR export cleanup (>7 days), and deletion request processing",
        },
        reminderQueueCreation: {
          schedule: "Every hour at minute 30",
          description:
            "Create reminder queue items from appointments based on admin configurations",
        },
        reminderProcessing: {
          schedule: "Every 15 minutes",
          description: "Process and send pending reminders via SMS and email",
        },
        retentionWarnings: {
          schedule: "Daily at 10:00 AM",
          description: "Send warning emails to users scheduled for account deletion",
        },
      },
    };
  }

  // Stop all scheduled tasks
  destroy() {
    cron.getTasks().forEach((task) => {
      task.stop();
    });
    this.isInitialized = false;
    console.log("🛑 All scheduled tasks stopped");
  }
}
