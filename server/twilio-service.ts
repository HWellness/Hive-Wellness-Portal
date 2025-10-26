import twilio from 'twilio';

interface MessageOptions {
  to: string;
  body: string;
  from?: string;
}

interface WhatsAppMessageOptions extends MessageOptions {
  mediaUrl?: string;
}

class TwilioService {
  private client: twilio.Twilio | null = null;
  private isConfigured = false;
  private phoneNumber: string = '';

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

      if (accountSid && authToken && phoneNumber) {
        this.client = twilio(accountSid, authToken);
        this.phoneNumber = phoneNumber;
        this.isConfigured = true;
        console.log('Twilio service initialized successfully');
      } else {
        console.log('Twilio credentials not configured - SMS/WhatsApp services disabled');
        this.isConfigured = false;
      }
    } catch (error) {
      console.error('Error initializing Twilio service:', error);
      this.isConfigured = false;
    }
  }

  async sendSMS(options: MessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured || !this.client) {
      return { success: false, error: 'Twilio not configured' };
    }

    try {
      const message = await this.client.messages.create({
        body: options.body,
        from: options.from || this.phoneNumber,
        to: options.to
      });

      console.log(`SMS sent successfully. Message ID: ${message.sid}`);
      return { success: true, messageId: message.sid };
    } catch (error) {
      console.error('Error sending SMS:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async sendWhatsApp(options: WhatsAppMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured || !this.client) {
      return { success: false, error: 'Twilio not configured' };
    }

    try {
      const whatsAppFrom = options.from?.startsWith('whatsapp:') ? options.from : `whatsapp:${this.phoneNumber}`;
      const whatsAppTo = options.to.startsWith('whatsapp:') ? options.to : `whatsapp:${options.to}`;

      const messageOptions: any = {
        body: options.body,
        from: whatsAppFrom,
        to: whatsAppTo
      };

      if (options.mediaUrl) {
        messageOptions.mediaUrl = [options.mediaUrl];
      }

      const message = await this.client.messages.create(messageOptions);

      console.log(`WhatsApp message sent successfully. Message ID: ${message.sid}`);
      return { success: true, messageId: message.sid };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async sendAppointmentReminder(clientPhone: string, appointmentDetails: {
    therapistName: string;
    date: string;
    time: string;
    type: 'sms' | 'whatsapp';
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `Hive Wellness Reminder: You have an appointment with ${appointmentDetails.therapistName} on ${appointmentDetails.date} at ${appointmentDetails.time}. Join via: https://api.hive-wellness.co.uk/portal#/video-sessions`;

    if (appointmentDetails.type === 'whatsapp') {
      return this.sendWhatsApp({ to: clientPhone, body: message });
    } else {
      return this.sendSMS({ to: clientPhone, body: message });
    }
  }

  async sendTherapistNotification(therapistPhone: string, notificationDetails: {
    clientName: string;
    message: string;
    type: 'sms' | 'whatsapp';
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `Hive Wellness: ${notificationDetails.message} from ${notificationDetails.clientName}. Check your portal: https://api.hive-wellness.co.uk/portal`;

    if (notificationDetails.type === 'whatsapp') {
      return this.sendWhatsApp({ to: therapistPhone, body: message });
    } else {
      return this.sendSMS({ to: therapistPhone, body: message });
    }
  }

  getStatus(): { configured: boolean; phoneNumber?: string } {
    return {
      configured: this.isConfigured,
      phoneNumber: this.isConfigured ? this.phoneNumber : undefined
    };
  }
}

export const twilioService = new TwilioService();