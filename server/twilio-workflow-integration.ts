import { notificationService } from './services/notification-service.js';
import { twilioService } from './services/twilio-service.js';
import { db } from './db.js';
import { appointments, users, therapistOnboardingProgress } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { format } from 'date-fns';

/**
 * Twilio Workflow Integration
 * Integrates SMS/WhatsApp notifications with Hive Wellness booking and onboarding workflows
 */

export interface BookingNotificationOptions {
  appointmentId: string;
  clientId: string;
  therapistId: string;
  notificationType: 'confirmation' | 'reminder_24h' | 'reminder_2h' | 'payment_confirmation';
  channels?: ('sms' | 'whatsapp' | 'email')[];
  paymentAmount?: number;
}

export interface TherapistOnboardingNotificationOptions {
  therapistId: string;
  onboardingStep: 'welcome' | 'completion' | 'assignment' | 'first_client';
  clientId?: string;
  additionalData?: Record<string, any>;
}

export class TwilioWorkflowIntegration {
  constructor() {}

  /**
   * Send booking-related notifications (confirmations, reminders, payment confirmations)
   */
  async sendBookingNotification(options: BookingNotificationOptions): Promise<{ success: boolean; results: any[] }> {
    try {
      // Fetch appointment details
      const appointment = await db.query.appointments.findFirst({
        where: eq(appointments.id, options.appointmentId),
        with: {
          client: true,
          therapist: true
        }
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      const client = await db.query.users.findFirst({
        where: eq(users.id, options.clientId)
      });

      const therapist = await db.query.users.findFirst({
        where: eq(users.id, options.therapistId)
      });

      if (!client || !therapist) {
        throw new Error('Client or therapist not found');
      }

      // Prepare template variables
      const baseUrl = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000';
      const templateVariables = {
        client_name: `${client.firstName} ${client.lastName}`,
        therapist_name: `${therapist.firstName} ${therapist.lastName}`,
        appointment_date: format(new Date(appointment.scheduledAt), 'EEEE, dd MMMM yyyy'),
        appointment_time: format(new Date(appointment.scheduledAt), 'HH:mm'),
        meeting_link: appointment.googleMeetLink || `${baseUrl}/video-session/${appointment.id}`,
        portal_link: `${baseUrl}/portal`,
        amount: options.paymentAmount?.toFixed(2) || appointment.price || '80.00',
        receipt_url: `${baseUrl}/receipt/${appointment.id}`,
      };

      // Determine notification type and template
      let notificationType: any;
      let templateNames: { sms: string; whatsapp: string; email?: string } = {
        sms: '',
        whatsapp: '',
      };

      switch (options.notificationType) {
        case 'confirmation':
          notificationType = 'appointment_confirmation';
          templateNames = {
            sms: 'SMS Booking Confirmation',
            whatsapp: 'WhatsApp Booking Confirmation',
          };
          break;
        case 'reminder_24h':
          notificationType = 'appointment_reminder';
          templateNames = {
            sms: 'SMS Appointment Reminder - 24h',
            whatsapp: 'WhatsApp Appointment Reminder - 24h',
          };
          break;
        case 'reminder_2h':
          notificationType = 'appointment_reminder';
          templateNames = {
            sms: 'SMS Appointment Reminder - 2h',
            whatsapp: 'WhatsApp Appointment Reminder - 2h',
          };
          break;
        case 'payment_confirmation':
          notificationType = 'payment_confirmation';
          templateNames = {
            sms: 'SMS Payment Confirmation',
            whatsapp: 'WhatsApp Payment Confirmation',
          };
          break;
        default:
          throw new Error(`Unknown notification type: ${options.notificationType}`);
      }

      // Send notifications through the notification service
      const channels = options.channels || ['sms', 'whatsapp'];
      const results = [];

      for (const channel of channels) {
        if (channel === 'sms' || channel === 'whatsapp') {
          try {
            // Get the appropriate template
            const template = await db.query.notificationTemplates.findFirst({
              where: (templates, { and, eq }) => and(
                eq(templates.name, templateNames[channel]),
                eq(templates.channel, channel),
                eq(templates.isActive, true)
              ),
            });

            if (!template) {
              console.warn(`No template found for ${channel} ${options.notificationType}`);
              continue;
            }

            // Replace template variables in the message
            let message = template.body;
            for (const [key, value] of Object.entries(templateVariables)) {
              message = message.replace(new RegExp(`{${key}}`, 'g'), String(value));
            }

            // Send via notification service
            const result = await notificationService.sendNotification({
              userId: client.id,
              type: notificationType,
              channels: [channel],
              templateId: template.id,
              subject: template.subject,
              message,
              appointmentId: options.appointmentId,
              metadata: templateVariables,
            });

            results.push({
              channel,
              templateId: template.id,
              ...result,
            });

          } catch (error) {
            console.error(`Failed to send ${channel} notification:`, error);
            results.push({
              channel,
              success: false,
              error: error.message,
            });
          }
        }
      }

      return {
        success: results.some(r => r.success),
        results,
      };

    } catch (error) {
      console.error('Error sending booking notification:', error);
      return {
        success: false,
        results: [{ error: error.message }],
      };
    }
  }

  /**
   * Send therapist onboarding notifications
   */
  async sendTherapistOnboardingNotification(options: TherapistOnboardingNotificationOptions): Promise<{ success: boolean; results: any[] }> {
    try {
      const therapist = await db.query.users.findFirst({
        where: eq(users.id, options.therapistId)
      });

      if (!therapist) {
        throw new Error('Therapist not found');
      }

      let client;
      if (options.clientId) {
        client = await db.query.users.findFirst({
          where: eq(users.id, options.clientId)
        });
      }

      // Prepare template variables
      const baseUrl = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000';
      const templateVariables = {
        therapist_name: `${therapist.firstName} ${therapist.lastName}`,
        client_name: client ? `${client.firstName} ${client.lastName}` : '',
        portal_link: `${baseUrl}/therapist-dashboard`,
        settings_link: `${baseUrl}/settings/notifications`,
      };

      // Determine template based on onboarding step
      let templateNames: { sms: string; whatsapp: string } = { sms: '', whatsapp: '' };
      let notificationType: any = 'welcome';

      switch (options.onboardingStep) {
        case 'welcome':
        case 'completion':
          templateNames = {
            sms: 'SMS Therapist Welcome',
            whatsapp: 'WhatsApp Therapist Welcome',
          };
          notificationType = 'welcome';
          break;
        case 'assignment':
        case 'first_client':
          templateNames = {
            sms: 'SMS Therapist Assignment',
            whatsapp: 'WhatsApp Therapist Assignment Notification',
          };
          notificationType = 'therapist_connection';
          break;
        default:
          throw new Error(`Unknown onboarding step: ${options.onboardingStep}`);
      }

      // Send notifications
      const channels = ['sms', 'whatsapp'];
      const results = [];

      for (const channel of channels) {
        try {
          const template = await db.query.notificationTemplates.findFirst({
            where: (templates, { and, eq }) => and(
              eq(templates.name, templateNames[channel]),
              eq(templates.channel, channel),
              eq(templates.isActive, true)
            ),
          });

          if (!template) {
            console.warn(`No template found for ${channel} ${options.onboardingStep}`);
            continue;
          }

          // Replace template variables
          let message = template.body;
          for (const [key, value] of Object.entries(templateVariables)) {
            message = message.replace(new RegExp(`{${key}}`, 'g'), String(value));
          }

          // Send notification
          const result = await notificationService.sendNotification({
            userId: therapist.id,
            type: notificationType,
            channels: [channel],
            templateId: template.id,
            subject: template.subject,
            message,
            metadata: templateVariables,
          });

          results.push({
            channel,
            templateId: template.id,
            ...result,
          });

        } catch (error) {
          console.error(`Failed to send ${channel} onboarding notification:`, error);
          results.push({
            channel,
            success: false,
            error: error.message,
          });
        }
      }

      return {
        success: results.some(r => r.success),
        results,
      };

    } catch (error) {
      console.error('Error sending therapist onboarding notification:', error);
      return {
        success: false,
        results: [{ error: error.message }],
      };
    }
  }

  /**
   * Send bulk reminder notifications for appointments in the next 24 hours
   */
  async sendBulkAppointmentReminders(): Promise<{ success: boolean; processed: number; results: any[] }> {
    try {
      console.log('📬 Starting bulk appointment reminder process...');

      // Get appointments in the next 24 hours that haven't received reminders
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const now = new Date();

      const upcomingAppointments = await db.query.appointments.findMany({
        where: (appointments, { and, eq, gte, lte }) => and(
          eq(appointments.status, 'confirmed'),
          gte(appointments.scheduledAt, now),
          lte(appointments.scheduledAt, tomorrow),
          eq(appointments.reminderSent, false)
        ),
      });

      console.log(`📋 Found ${upcomingAppointments.length} appointments needing reminders`);

      const results = [];
      let processed = 0;

      for (const appointment of upcomingAppointments) {
        try {
          const result = await this.sendBookingNotification({
            appointmentId: appointment.id,
            clientId: appointment.clientId!,
            therapistId: appointment.primaryTherapistId!,
            notificationType: 'reminder_24h',
            channels: ['sms', 'whatsapp'],
          });

          if (result.success) {
            // Mark reminder as sent
            await db.update(appointments)
              .set({
                reminderSent: true,
                updatedAt: new Date(),
              })
              .where(eq(appointments.id, appointment.id));
          }

          results.push({
            appointmentId: appointment.id,
            ...result,
          });

          processed++;

          // Add delay between reminders to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          console.error(`Failed to send reminder for appointment ${appointment.id}:`, error);
          results.push({
            appointmentId: appointment.id,
            success: false,
            error: error.message,
          });
        }
      }

      console.log(`✅ Bulk reminder process completed: ${processed} processed`);

      return {
        success: results.some(r => r.success),
        processed,
        results,
      };

    } catch (error) {
      console.error('Error in bulk appointment reminders:', error);
      return {
        success: false,
        processed: 0,
        results: [{ error: error.message }],
      };
    }
  }
}

export const twilioWorkflowIntegration = new TwilioWorkflowIntegration();