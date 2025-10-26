// Reminder Automation Service for Hive Wellness
// Automatically creates and processes reminder queue items based on admin configurations

import { nanoid } from 'nanoid';
import type { DatabaseStorage } from '../storage.js';

export class ReminderAutomationService {
  private storage: DatabaseStorage;

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
  }

  /**
   * Check appointments and create reminder queue items based on active configurations
   * This should run periodically (e.g., every hour)
   */
  async createRemindersFromAppointments(): Promise<{ created: number; errors: number }> {
    try {
      console.log('📋 Checking appointments for reminder creation...');

      // Get all active reminder configurations
      const configs = await this.storage.getReminderConfigurations();
      const activeConfigs = configs.filter(c => c.isEnabled);

      if (activeConfigs.length === 0) {
        console.log('⚠️ No active reminder configurations found');
        return { created: 0, errors: 0 };
      }

      console.log(`✅ Found ${activeConfigs.length} active reminder configuration(s)`);

      // Get all upcoming appointments (next 7 days)
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      
      const appointments = await this.storage.getAppointmentsInTimeRange(
        new Date(),
        sevenDaysFromNow
      );

      console.log(`📅 Found ${appointments.length} upcoming appointments`);

      let created = 0;
      let errors = 0;

      // For each configuration, check if reminders need to be created
      for (const config of activeConfigs) {
        for (const appointment of appointments) {
          try {
            // Calculate when the reminder should be sent
            const reminderTime = new Date(appointment.scheduledAt);
            reminderTime.setMinutes(reminderTime.getMinutes() - config.timeBefore);

            // Only create if reminder time is in the future and within the next 48 hours
            const now = new Date();
            const twoDaysFromNow = new Date();
            twoDaysFromNow.setHours(twoDaysFromNow.getHours() + 48);

            if (reminderTime > now && reminderTime <= twoDaysFromNow) {
              // Get user details for recipient info
              const therapist = await this.storage.getUser(appointment.primaryTherapistId);
              const client = appointment.clientId ? await this.storage.getUser(appointment.clientId) : null;

              if (!therapist || !client) {
                console.warn(`⚠️ Missing user data for appointment ${appointment.id}`);
                continue;
              }

              // Check and create reminder for client if this config targets clients
              if (config.recipientRole === 'client' || config.recipientRole === 'both') {
                const existingClientReminder = await this.storage.getReminderByAppointmentAndConfig(
                  appointment.id,
                  config.id,
                  client.id
                );

                if (!existingClientReminder) {
                  await this.createReminderQueueItem(
                    config,
                    appointment,
                    client,
                    therapist,
                    reminderTime
                  );
                  created++;
                  console.log(`✅ Created client reminder for appointment ${appointment.id} (${config.timeBefore} min before)`);
                }
              }

              // Check and create reminder for therapist if this config targets therapists
              if (config.recipientRole === 'therapist' || config.recipientRole === 'both') {
                const existingTherapistReminder = await this.storage.getReminderByAppointmentAndConfig(
                  appointment.id,
                  config.id,
                  therapist.id
                );

                if (!existingTherapistReminder) {
                  await this.createReminderQueueItem(
                    config,
                    appointment,
                    therapist,
                    client,
                    reminderTime
                  );
                  created++;
                  console.log(`✅ Created therapist reminder for appointment ${appointment.id} (${config.timeBefore} min before)`);
                }
              }
            }
          } catch (error) {
            console.error(`❌ Error creating reminder for appointment ${appointment.id}:`, error);
            errors++;
          }
        }
      }

      console.log(`✅ Reminder creation completed: ${created} created, ${errors} errors`);
      return { created, errors };

    } catch (error) {
      console.error('❌ Error in createRemindersFromAppointments:', error);
      throw error;
    }
  }

  /**
   * Create a single reminder queue item
   */
  private async createReminderQueueItem(
    config: any,
    appointment: any,
    recipient: any,
    otherParty: any,
    scheduledAt: Date
  ) {
    // Build message with variable substitution
    let message = config.message;
    message = message.replace(/\{\{client_name\}\}/g, recipient.role === 'client' ? recipient.fullName || 'Client' : otherParty.fullName || 'Client');
    message = message.replace(/\{\{therapist_name\}\}/g, recipient.role === 'therapist' ? recipient.fullName || 'Therapist' : otherParty.fullName || 'Therapist');
    message = message.replace(/\{\{session_date\}\}/g, new Date(appointment.scheduledAt).toLocaleDateString('en-GB'));
    message = message.replace(/\{\{session_time\}\}/g, new Date(appointment.scheduledAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));

    await this.storage.createReminderQueueItem({
      id: nanoid(),
      configurationId: config.id,
      appointmentId: appointment.id,
      userId: recipient.id,
      reminderType: config.reminderType,
      recipientEmail: config.reminderType === 'email' ? recipient.email : null,
      recipientPhone: config.reminderType === 'sms' ? recipient.phoneNumber : null,
      subject: config.subject || `Appointment Reminder - ${new Date(appointment.scheduledAt).toLocaleDateString('en-GB')}`,
      message: message,
      scheduledAt: scheduledAt,
      status: 'pending',
      retryCount: 0
    });
  }

  /**
   * Process pending reminders and send them via SMS/Email
   * This should run frequently (e.g., every 15 minutes)
   */
  async processPendingReminders(): Promise<{ sent: number; failed: number }> {
    try {
      console.log('📬 Processing pending reminders...');

      const pendingReminders = await this.storage.getPendingReminders();
      const now = new Date();

      // Filter reminders that are due to be sent (scheduled time has passed)
      const dueReminders = pendingReminders.filter(r => new Date(r.scheduledAt) <= now);

      console.log(`📨 Found ${dueReminders.length} reminders due for sending`);

      let sent = 0;
      let failed = 0;

      for (const reminder of dueReminders) {
        try {
          if (reminder.reminderType === 'sms') {
            await this.sendSMS(reminder);
          } else if (reminder.reminderType === 'email') {
            await this.sendEmail(reminder);
          }

          // Mark as sent
          await this.storage.updateReminderStatus(reminder.id, 'sent', new Date());
          sent++;
          console.log(`✅ Sent ${reminder.reminderType} reminder ${reminder.id}`);

        } catch (error) {
          console.error(`❌ Failed to send reminder ${reminder.id}:`, error);
          
          // Update retry count and mark as failed if max retries exceeded
          const retryCount = (reminder.retryCount || 0) + 1;
          if (retryCount >= 3) {
            await this.storage.updateReminderStatus(reminder.id, 'failed', undefined, retryCount);
          } else {
            // Keep as pending but increment retry count
            await this.storage.updateReminderStatus(reminder.id, 'pending', undefined, retryCount);
          }
          failed++;
        }
      }

      console.log(`✅ Reminder processing completed: ${sent} sent, ${failed} failed`);
      return { sent, failed };

    } catch (error) {
      console.error('❌ Error in processPendingReminders:', error);
      throw error;
    }
  }

  /**
   * Send SMS reminder via Twilio
   */
  private async sendSMS(reminder: any) {
    if (!reminder.recipientPhone) {
      throw new Error('No phone number available for SMS reminder');
    }

    // Import Twilio service
    const { twilioService } = await import('../services/twilio-service.js');
    
    await twilioService.sendMessage({
      to: reminder.recipientPhone,
      body: reminder.message,
      channel: 'sms',
      userId: reminder.userId,
      appointmentId: reminder.appointmentId
    });
  }

  /**
   * Send Email reminder
   */
  private async sendEmail(reminder: any) {
    if (!reminder.recipientEmail) {
      throw new Error('No email address available for email reminder');
    }

    // Import SendGrid directly for simple email sending
    const SendGridMail = await import('@sendgrid/mail');
    const mailService = new SendGridMail.default();
    
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SendGrid API key not configured');
    }
    
    mailService.setApiKey(process.env.SENDGRID_API_KEY);
    
    await mailService.send({
      to: reminder.recipientEmail,
      from: process.env.FROM_EMAIL || 'support@hive-wellness.co.uk',
      subject: reminder.subject || 'Appointment Reminder',
      html: `<p>${reminder.message.replace(/\n/g, '<br>')}</p>`
    });
  }
}
