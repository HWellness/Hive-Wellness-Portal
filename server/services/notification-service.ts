import { db } from "../db.js";
import {
  notifications,
  notificationTemplates,
  userCommunicationPreferences,
  notificationAutomationRules,
  notificationLogs,
  users,
  appointments,
} from "@shared/schema";
import { eq, and, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { twilioService } from "./twilio-service.js";
import { emailService } from "./email-service.js";

export interface NotificationOptions {
  userId: string;
  type:
    | "appointment_confirmation"
    | "appointment_reminder"
    | "session_followup"
    | "welcome"
    | "therapist_connection"
    | "payment_confirmation"
    | "custom";
  channels?: ("email" | "sms" | "whatsapp")[];
  templateId?: string;
  subject?: string;
  message: string;
  appointmentId?: string;
  metadata?: Record<string, any>;
  priority?: "low" | "normal" | "high" | "urgent";
  scheduledFor?: Date;
  fallbackChannels?: ("email" | "sms" | "whatsapp")[];
}

export interface BulkNotificationOptions {
  userIds: string[];
  type: NotificationOptions["type"];
  channels: ("email" | "sms" | "whatsapp")[];
  templateId?: string;
  subject?: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface TemplateVariables {
  client_name?: string;
  therapist_name?: string;
  appointment_date?: string;
  appointment_time?: string;
  appointment_location?: string;
  session_type?: string;
  amount?: string;
  currency?: string;
  [key: string]: any;
}

export class NotificationService {
  constructor() {}

  async sendNotification(
    options: NotificationOptions
  ): Promise<{ success: boolean; results: any[] }> {
    try {
      // CRITICAL: Service Guard - check if this is for a past appointment and skip reminders/confirmations
      if (
        options.appointmentId &&
        (options.type === "appointment_reminder" || options.type === "appointment_confirmation")
      ) {
        const appointment = await db.query.appointments.findFirst({
          where: (appointments, { eq }) => eq(appointments.id, options.appointmentId),
        });

        if (appointment) {
          const now = new Date();
          const appointmentTimeUTC = new Date(appointment.scheduledAt.toISOString());
          const nowUTC = new Date(now.toISOString());
          const isPastDate = appointmentTimeUTC <= nowUTC;

          if (isPastDate || appointment.backdated) {
            console.log("🔙 SERVICE GUARD: Skipping notification for past/backdated appointment", {
              appointmentId: options.appointmentId,
              type: options.type,
              isPastDate,
              backdated: appointment.backdated,
              scheduledAt: appointment.scheduledAt,
            });
            return { success: true, results: [] }; // Skip notification for past appointments
          }
        }
      }

      // Get user preferences
      const userPrefs = await this.getUserPreferences(options.userId);
      const user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, options.userId),
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Determine channels to use
      const channels = options.channels || ["email"];
      const availableChannels = this.getAvailableChannels(userPrefs, channels);

      if (availableChannels.length === 0) {
        throw new Error("No available channels for user");
      }

      const results = [];

      // Send notification on each channel
      for (const channel of availableChannels) {
        try {
          const result = await this.sendOnChannel(channel, {
            ...options,
            user,
            userPrefs,
          });
          results.push(result);
        } catch (error) {
          console.error(`Failed to send ${channel} notification:`, error);
          results.push({
            channel,
            success: false,
            error: error.message,
          });
        }
      }

      // Try fallback channels if primary failed
      if (options.fallbackChannels && results.every((r) => !r.success)) {
        for (const fallbackChannel of options.fallbackChannels) {
          if (!availableChannels.includes(fallbackChannel)) {
            try {
              const result = await this.sendOnChannel(fallbackChannel, {
                ...options,
                user,
                userPrefs,
              });
              results.push({
                ...result,
                fallbackUsed: true,
              });
              break; // Stop after first successful fallback
            } catch (error) {
              console.error(`Fallback ${fallbackChannel} also failed:`, error);
            }
          }
        }
      }

      return {
        success: results.some((r) => r.success),
        results,
      };
    } catch (error) {
      console.error("Error sending notification:", error);
      return {
        success: false,
        results: [{ error: error.message }],
      };
    }
  }

  private async sendOnChannel(channel: string, options: any): Promise<any> {
    const { user, userPrefs, userId, type, templateId, subject, message, appointmentId, metadata } =
      options;

    // Get template if specified
    let templateMessage = message;
    let templateSubject = subject;

    if (templateId) {
      const template = await db.query.notificationTemplates.findFirst({
        where: (templates, { and, eq }) =>
          and(eq(templates.id, templateId), eq(templates.channel, channel)),
      });

      if (template) {
        templateMessage = this.replaceTemplateVariables(template.body, metadata || {});
        templateSubject = template.subject
          ? this.replaceTemplateVariables(template.subject, metadata || {})
          : subject;
      }
    }

    // Create notification record
    const notificationId = nanoid();
    await db.insert(notifications).values({
      id: notificationId,
      userId,
      channel: channel as any,
      type,
      templateId,
      recipient: this.getRecipientForChannel(channel, user, userPrefs),
      subject: templateSubject,
      message: templateMessage,
      status: "pending",
      appointmentId,
      metadata,
      sentBy: "system",
      createdAt: new Date(),
    });

    // Send via appropriate service
    let result;
    switch (channel) {
      case "email":
        result = await emailService.sendEmail({
          to: user.email,
          subject: templateSubject || "Notification",
          body: templateMessage,
          userId,
          notificationId,
        });
        break;

      case "sms":
        result = await twilioService.sendMessage({
          to: userPrefs?.phoneNumber || user.profileData?.phoneNumber,
          body: templateMessage,
          channel: "sms",
          userId,
          templateId,
          appointmentId,
        });
        break;

      case "whatsapp":
        result = await twilioService.sendMessage({
          to: userPrefs?.whatsappNumber || userPrefs?.phoneNumber || user.profileData?.phoneNumber,
          body: templateMessage,
          channel: "whatsapp",
          userId,
          templateId,
          appointmentId,
          fallbackToSms: true,
        });
        break;

      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }

    // Update notification status
    await db
      .update(notifications)
      .set({
        status: result.success ? "sent" : "failed",
        sentAt: result.success ? new Date() : null,
        errorMessage: result.error,
        metadata: {
          ...metadata,
          ...result.metadata,
        },
        updatedAt: new Date(),
      })
      .where(eq(notifications.id, notificationId));

    // Log the result
    await this.logNotification(
      notificationId,
      userId,
      channel,
      type,
      result.success ? "sent" : "failed",
      result.error
    );

    return {
      channel,
      success: result.success,
      notificationId,
      messageSid: result.messageSid,
      error: result.error,
    };
  }

  private getRecipientForChannel(channel: string, user: any, userPrefs: any): string {
    switch (channel) {
      case "email":
        return user.email;
      case "sms":
        return userPrefs?.phoneNumber || user.profileData?.phoneNumber;
      case "whatsapp":
        return userPrefs?.whatsappNumber || userPrefs?.phoneNumber || user.profileData?.phoneNumber;
      default:
        return user.email;
    }
  }

  private getAvailableChannels(userPrefs: any, requestedChannels: string[]): string[] {
    const available = [];

    for (const channel of requestedChannels) {
      switch (channel) {
        case "email":
          if (userPrefs?.emailEnabled !== false) {
            available.push(channel);
          }
          break;
        case "sms":
          if (userPrefs?.smsEnabled !== false && userPrefs?.phoneNumber) {
            available.push(channel);
          }
          break;
        case "whatsapp":
          if (
            userPrefs?.whatsappEnabled !== false &&
            (userPrefs?.whatsappNumber || userPrefs?.phoneNumber)
          ) {
            available.push(channel);
          }
          break;
      }
    }

    return available;
  }

  private async getUserPreferences(userId: string): Promise<any> {
    try {
      const prefs = await db.query.userCommunicationPreferences.findFirst({
        where: (preferences, { eq }) => eq(preferences.userId, userId),
      });

      return (
        prefs || {
          emailEnabled: true,
          smsEnabled: false,
          whatsappEnabled: false,
          marketingEmailsEnabled: true,
          appointmentReminders: true,
          therapyUpdates: true,
          emergencyContactsOnly: false,
          preferredLanguage: "en",
          timezone: "Europe/London",
        }
      );
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      return {
        emailEnabled: true,
        smsEnabled: false,
        whatsappEnabled: false,
        marketingEmailsEnabled: true,
        appointmentReminders: true,
        therapyUpdates: true,
        emergencyContactsOnly: false,
        preferredLanguage: "en",
        timezone: "Europe/London",
      };
    }
  }

  private replaceTemplateVariables(template: string, variables: TemplateVariables): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{${key}}`, "g");
      result = result.replace(regex, String(value || ""));
    }

    return result;
  }

  private async logNotification(
    notificationId: string,
    userId: string,
    channel: string,
    type: string,
    status: string,
    errorDetails?: string
  ): Promise<void> {
    try {
      await db.insert(notificationLogs).values({
        id: nanoid(),
        notificationId,
        userId,
        channel,
        type,
        status,
        errorDetails,
        metadata: {},
        processedAt: new Date(),
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("Error logging notification:", error);
    }
  }

  async sendBulkNotification(
    options: BulkNotificationOptions
  ): Promise<{ success: boolean; results: any[] }> {
    const results = [];

    for (const userId of options.userIds) {
      const result = await this.sendNotification({
        userId,
        type: options.type,
        channels: options.channels,
        templateId: options.templateId,
        subject: options.subject,
        message: options.message,
        metadata: options.metadata,
      });

      results.push({
        userId,
        ...result,
      });

      // Add small delay to avoid overwhelming services
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return {
      success: results.some((r) => r.success),
      results,
    };
  }

  async processAutomationRules(trigger: string, triggerData: Record<string, any>): Promise<void> {
    try {
      const rules = await db.query.notificationAutomationRules.findMany({
        where: (rules, { and, eq }) => and(eq(rules.trigger, trigger), eq(rules.isActive, true)),
      });

      for (const rule of rules) {
        try {
          // Check if conditions are met
          if (rule.conditions && !this.evaluateConditions(rule.conditions, triggerData)) {
            continue;
          }

          // Get template IDs for each channel
          const templateIds = rule.templateIds as Record<string, string>;

          // Send notification for each channel
          for (const channel of rule.channels) {
            const templateId = templateIds[channel];

            await this.sendNotification({
              userId: triggerData.userId,
              type: "custom",
              channels: [channel],
              templateId,
              message: `Automated ${trigger} notification`,
              metadata: triggerData,
              appointmentId: triggerData.appointmentId,
            });
          }

          // Update rule statistics
          await db
            .update(notificationAutomationRules)
            .set({
              triggerCount: rule.triggerCount + 1,
              lastTriggered: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(notificationAutomationRules.id, rule.id));
        } catch (error) {
          console.error(`Error processing automation rule ${rule.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Error processing automation rules:", error);
    }
  }

  private evaluateConditions(conditions: any, triggerData: Record<string, any>): boolean {
    // Simple condition evaluation - can be enhanced for complex logic
    if (!conditions || typeof conditions !== "object") {
      return true;
    }

    for (const [key, value] of Object.entries(conditions)) {
      if (triggerData[key] !== value) {
        return false;
      }
    }

    return true;
  }
}

export const notificationService = new NotificationService();
