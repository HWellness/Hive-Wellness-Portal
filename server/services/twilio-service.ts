import twilio, { Twilio } from 'twilio';
import { db } from '../db.js';
import { notifications, twilioWebhooks, userCommunicationPreferences, optOutLogs } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  whatsappNumber: string;
}

export interface SendMessageOptions {
  to: string;
  body: string;
  channel: 'sms' | 'whatsapp';
  userId?: string;
  templateId?: string;
  appointmentId?: string;
  fallbackToSms?: boolean;
}

export interface MessageResponse {
  success: boolean;
  messageSid?: string;
  error?: string;
  fallbackUsed?: boolean;
  channel: 'sms' | 'whatsapp';
}

export class TwilioService {
  private client: Twilio | null = null;
  private config: TwilioConfig | null = null;
  private initialized = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;
      const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || fromNumber;

      if (!accountSid || !authToken || !fromNumber) {
        console.warn('Twilio credentials not configured. SMS and WhatsApp services will be disabled.');
        return;
      }

      this.config = {
        accountSid,
        authToken,
        fromNumber,
        whatsappNumber: whatsappNumber || fromNumber,
      };

      this.client = twilio(accountSid, authToken);
      this.initialized = true;
      console.log('Twilio service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Twilio service:', error);
    }
  }

  async sendMessage(options: SendMessageOptions): Promise<MessageResponse> {
    if (!this.initialized || !this.client || !this.config) {
      return {
        success: false,
        error: 'Twilio service not initialized',
        channel: options.channel,
      };
    }

    try {
      // Check user preferences and opt-out status
      if (options.userId) {
        const hasOptedOut = await this.checkOptOutStatus(options.userId, options.channel);
        if (hasOptedOut) {
          return {
            success: false,
            error: 'User has opted out of this communication channel',
            channel: options.channel,
          };
        }
      }

      // Format phone number for international use
      const formattedNumber = this.formatPhoneNumber(options.to);
      
      // Determine from number based on channel
      const fromNumber = options.channel === 'whatsapp' 
        ? `whatsapp:${this.config.whatsappNumber}`
        : this.config.fromNumber;
      
      const toNumber = options.channel === 'whatsapp' 
        ? `whatsapp:${formattedNumber}`
        : formattedNumber;

      // Create notification record
      const notificationId = nanoid();
      await db.insert(notifications).values({
        id: notificationId,
        userId: options.userId || 'system',
        channel: options.channel,
        type: 'custom',
        templateId: options.templateId,
        recipient: options.to,
        message: options.body,
        status: 'pending',
        appointmentId: options.appointmentId,
        sentBy: 'system',
        createdAt: new Date(),
      });

      // Send message via Twilio
      const message = await this.client.messages.create({
        body: options.body,
        from: fromNumber,
        to: toNumber,
        statusCallback: `${process.env.BASE_URL || 'https://localhost:5000'}/api/twilio/webhook`,
      });

      // Update notification with success status
      await db.update(notifications)
        .set({
          status: 'sent',
          sentAt: new Date(),
          metadata: {
            messageSid: message.sid,
            accountSid: message.accountSid,
            price: message.price,
            priceUnit: message.priceUnit,
          },
        })
        .where(eq(notifications.id, notificationId));

      return {
        success: true,
        messageSid: message.sid,
        channel: options.channel,
      };

    } catch (error: any) {
      console.error(`Failed to send ${options.channel} message:`, error);

      // Update notification with error status
      if (options.userId) {
        await db.update(notifications)
          .set({
            status: 'failed',
            errorMessage: error.message,
            updatedAt: new Date(),
          })
          .where(and(
            eq(notifications.userId, options.userId),
            eq(notifications.message, options.body)
          ));
      }

      // Try fallback to SMS if WhatsApp fails
      if (options.channel === 'whatsapp' && options.fallbackToSms) {
        console.log('WhatsApp failed, attempting SMS fallback...');
        const fallbackResult = await this.sendMessage({
          ...options,
          channel: 'sms',
          fallbackToSms: false, // Prevent infinite recursion
        });

        if (fallbackResult.success) {
          return {
            ...fallbackResult,
            fallbackUsed: true,
          };
        }
      }

      return {
        success: false,
        error: error.message,
        channel: options.channel,
      };
    }
  }

  async sendBulkMessage(recipients: string[], message: string, channel: 'sms' | 'whatsapp'): Promise<MessageResponse[]> {
    const results: MessageResponse[] = [];
    
    for (const recipient of recipients) {
      const result = await this.sendMessage({
        to: recipient,
        body: message,
        channel,
      });
      results.push(result);
      
      // Add delay between messages to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  async processWebhook(webhookData: any): Promise<void> {
    try {
      const {
        MessageSid,
        AccountSid,
        From,
        To,
        Body,
        NumSegments,
        MessageStatus,
        ErrorCode,
        ErrorMessage,
        Price,
        PriceUnit,
        Direction,
      } = webhookData;

      // Store webhook data
      await db.insert(twilioWebhooks).values({
        id: nanoid(),
        messageSid: MessageSid,
        accountSid: AccountSid,
        from: From,
        to: To,
        body: Body,
        numSegments: NumSegments ? parseInt(NumSegments) : null,
        status: MessageStatus,
        errorCode: ErrorCode,
        errorMessage: ErrorMessage,
        price: Price ? parseFloat(Price) : null,
        priceUnit: PriceUnit,
        direction: Direction,
        webhookData: webhookData,
        createdAt: new Date(),
      });

      // Update notification status
      const notification = await db.query.notifications.findFirst({
        where: (notifications, { eq }) => eq(notifications.metadata, { messageSid: MessageSid }),
      });

      if (notification) {
        let status = 'sent';
        if (MessageStatus === 'delivered') status = 'delivered';
        if (MessageStatus === 'failed' || MessageStatus === 'undelivered') status = 'failed';

        await db.update(notifications)
          .set({
            status: status as any,
            deliveredAt: MessageStatus === 'delivered' ? new Date() : null,
            errorMessage: ErrorMessage,
            updatedAt: new Date(),
          })
          .where(eq(notifications.id, notification.id));
      }

      // Handle opt-out requests
      if (Body && (Body.toLowerCase().includes('stop') || Body.toLowerCase().includes('unsubscribe'))) {
        await this.handleOptOut(From, Body, 'sms_reply');
      }

    } catch (error) {
      console.error('Error processing Twilio webhook:', error);
    }
  }

  private async checkOptOutStatus(userId: string, channel: 'sms' | 'whatsapp'): Promise<boolean> {
    try {
      const preferences = await db.query.userCommunicationPreferences.findFirst({
        where: (prefs, { eq }) => eq(prefs.userId, userId),
      });

      if (!preferences) return false;

      return channel === 'sms' ? preferences.smsOptOut : preferences.whatsappOptOut;
    } catch (error) {
      console.error('Error checking opt-out status:', error);
      return false;
    }
  }

  private async handleOptOut(phoneNumber: string, originalMessage: string, method: string): Promise<void> {
    try {
      // Find user by phone number
      const preferences = await db.query.userCommunicationPreferences.findFirst({
        where: (prefs, { or, eq }) => or(
          eq(prefs.phoneNumber, phoneNumber),
          eq(prefs.whatsappNumber, phoneNumber)
        ),
      });

      if (!preferences) {
        console.log(`No user found for phone number: ${phoneNumber}`);
        return;
      }

      // Determine channel based on phone number format
      const channel = phoneNumber.includes('whatsapp:') ? 'whatsapp' : 'sms';

      // Update preferences
      await db.update(userCommunicationPreferences)
        .set({
          [channel === 'sms' ? 'smsOptOut' : 'whatsappOptOut']: true,
          lastOptOutDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userCommunicationPreferences.userId, preferences.userId));

      // Log opt-out
      await db.insert(optOutLogs).values({
        id: nanoid(),
        userId: preferences.userId,
        channel,
        action: 'opt_out',
        method: method as any,
        originalMessage,
        createdAt: new Date(),
      });

      console.log(`User ${preferences.userId} opted out of ${channel} notifications`);
    } catch (error) {
      console.error('Error handling opt-out:', error);
    }
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters except + 
    let formatted = phoneNumber.replace(/[^\d+]/g, '');
    
    // Add + if not present and doesn't start with country code
    if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }
    
    return formatted;
  }

  async getDeliveryStatus(messageSid: string): Promise<any> {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const message = await this.client.messages(messageSid).fetch();
      return {
        sid: message.sid,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        price: message.price,
        priceUnit: message.priceUnit,
        direction: message.direction,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated,
        dateSent: message.dateSent,
      };
    } catch (error) {
      console.error('Error fetching message status:', error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const twilioService = new TwilioService();