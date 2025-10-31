import sgMail from "@sendgrid/mail";
import { db } from "../db.js";
import { notifications, sendgridWebhooks, emailTemplates } from "@shared/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  userId?: string;
  notificationId?: string;
  templateId?: string;
  metadata?: Record<string, any>;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export class EmailService {
  private initialized = false;
  private fromEmail: string = "support@hivewellness.nl";

  constructor() {
    this.initializeService();
  }

  private initializeService() {
    try {
      const apiKey = process.env.SENDGRID_API_KEY;
      this.fromEmail = process.env.FROM_EMAIL || "support@hivewellness.nl";

      if (!apiKey) {
        console.warn("SendGrid API key not configured. Email services will be disabled.");
        return;
      }

      sgMail.setApiKey(apiKey);
      this.initialized = true;
      console.log("SendGrid email service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize SendGrid service:", error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailResponse> {
    if (!this.initialized) {
      return {
        success: false,
        error: "SendGrid service not initialized",
      };
    }

    try {
      const msg = {
        to: options.to,
        from: this.fromEmail,
        subject: options.subject,
        ...(options.isHtml !== false ? { html: options.body } : { text: options.body }),
        trackingSettings: {
          clickTracking: {
            enable: true,
            enableText: true,
          },
          openTracking: {
            enable: true,
          },
          subscriptionTracking: {
            enable: true,
          },
        },
        customArgs: {
          notificationId: options.notificationId || "",
          userId: options.userId || "",
          templateId: options.templateId || "",
        },
      };

      const response = await sgMail.send(msg);

      // Extract message ID from response
      const messageId = response[0]?.headers?.["x-message-id"] || nanoid();

      return {
        success: true,
        messageId,
        metadata: {
          messageId,
          response: response[0]?.statusCode,
        },
      };
    } catch (error: any) {
      console.error("Failed to send email:", error);

      return {
        success: false,
        error: error.message || "Failed to send email",
        metadata: {
          errorCode: error.code,
          errorMessage: error.message,
        },
      };
    }
  }

  // Helper method to send admin notifications to all admin email addresses
  async sendAdminNotification(
    subject: string,
    body: string,
    isHtml = true
  ): Promise<EmailResponse[]> {
    const adminEmails = ["support@hive-wellness.co.uk", "support@hivewellness.nl"];
    return this.sendBulkEmail(adminEmails, subject, body, isHtml);
  }

  // Helper method to send therapist assignment notifications
  async sendAssignmentNotification(
    clientEmail: string,
    clientName: string,
    therapistFirstName: string,
    therapistLastName: string,
    therapistEmail: string,
    sessionFee?: number
  ): Promise<EmailResponse[]> {
    // Format therapist name as "First Name, Surname Initial"
    const therapistSurnameInitial = therapistLastName.charAt(0).toUpperCase();
    const therapistDisplayName = `${therapistFirstName} ${therapistSurnameInitial}`;
    const therapistFullName = `${therapistFirstName} ${therapistLastName}`;
    const baseUrl =
      process.env.CLIENT_URL || process.env.BASE_URL
        ? process.env.CLIENT_URL || process.env.BASE_URL
        : "http://localhost:5000";
    const clientTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>You've Been Connected with a Therapist - Hive Wellness</title>
        <style>
          body { font-family: 'Open Sans', sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #9306B1, #9306B1); padding: 40px 30px; text-align: center; color: white; }
          .content { padding: 40px 30px; }
          .info-box { background: linear-gradient(135deg, #fef7ff, #f3e8ff); padding: 25px; border-radius: 12px; border-left: 4px solid #9306B1; margin: 25px 0; }
          .info-row { margin: 10px 0; color: #555; }
          .info-label { font-weight: 600; color: #9306B1; }
          .button { background: linear-gradient(135deg, #9306B1, #9306B1); color: white; padding: 15px 30px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 600; margin: 20px 0; }
          .reminder-box { background: #fff9e6; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">You've Been Connected with a Therapist</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Hive Wellness</p>
          </div>
          <div class="content">
            <h2 style="color: #9306B1;">Hello ${clientName.split(" ")[0]},</h2>
            <p>We're pleased to let you know that you've been connected with a Hive Wellness therapist who's best suited to support your needs.</p>
            
            <div class="info-box">
              <div class="info-row">
                <span class="info-label">Therapist:</span> ${therapistDisplayName}
              </div>
              <div class="info-row">
                <span class="info-label">Type:</span> Online one-to-one therapy
              </div>
              ${
                sessionFee
                  ? `<div class="info-row">
                <span class="info-label">Fee:</span> £${sessionFee} per session
              </div>`
                  : ""
              }
              <div class="info-row">
                <span class="info-label">Duration:</span> 50 minutes
              </div>
            </div>

            <p>To confirm your first session, please log in to your Hive Wellness account and book your sessions. If you have not done so already, please also complete any existing information in your profile and add your payment method type.</p>

            <div class="reminder-box">
              <p style="margin: 0; color: #856404;"><strong>💡 Payment reminder:</strong> Session fees are payable prior to the first appointment (see payments section in your dashboard).</p>
            </div>

            <p>If you feel your therapist isn't the right fit, please email us at <a href="mailto:admin@hive-wellness.co.uk" style="color: #9306B1;">admin@hive-wellness.co.uk</a>. We carefully connect clients with therapists based on multiple factors, but if it's not the right match, we'll arrange an alternative therapist promptly.</p>

            <a href="${baseUrl}/portal" class="button" style="color: #ffffff !important;">Access Your Portal</a>

            <p style="margin-top: 30px;">We look forward to supporting you on your wellbeing journey 😊</p>
            <p style="margin-top: 20px;"><strong>Warm regards,<br>The Hive Wellness Team</strong></p>
            <p style="margin-top: 30px; color: #9306B1; font-style: italic; text-align: center;">Therapy tailored to you</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const therapistTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Client Assignment - Hive Wellness</title>
        <style>
          body { font-family: 'Open Sans', sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #9306B1, #9306B1); padding: 40px 30px; text-align: center; color: white; }
          .content { padding: 40px 30px; }
          .highlight { background: linear-gradient(135deg, #fef7ff, #f3e8ff); padding: 25px; border-radius: 12px; border-left: 4px solid #9306B1; margin: 25px 0; }
          .button { background: linear-gradient(135deg, #9306B1, #9306B1); color: white; padding: 15px 30px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 600; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">👥 New Client Assignment</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Hive Wellness</p>
          </div>
          <div class="content">
            <h2 style="color: #9306B1;">Hello ${therapistFirstName},</h2>
            <p>You've been assigned a new client who is ready to begin their therapy journey with you.</p>
            <div class="highlight">
              <h3 style="color: #9306B1; margin: 0 0 10px 0;">Client Details:</h3>
              <p style="font-size: 18px; font-weight: 600; margin: 0; color: #9306B1;">${clientName}</p>
              <p style="margin: 5px 0; color: #97A5D0;">Email: ${clientEmail}</p>
              <p style="margin: 10px 0 0 0; color: #97A5D0;">Please review their profile and reach out to schedule the first session.</p>
            </div>
            <p>You can access the client's profile, questionnaire responses, and schedule appointments through your therapist dashboard.</p>
            <a href="${baseUrl}/therapist-dashboard" class="button" style="color: #ffffff !important;">View Client Dashboard</a>
            <p style="font-size: 14px; color: #97A5D0; margin-top: 30px;">If you have any questions, please contact support at support@hive-wellness.co.uk</p>
            <p style="margin-top: 20px; color: #9306B1; font-style: italic; text-align: center;">Therapy tailored to you</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const results = await Promise.all([
      this.sendEmail({
        to: clientEmail,
        subject: "🎉 Your Therapist Assignment - Hive Wellness",
        body: clientTemplate,
        isHtml: true,
        templateId: "client_assignment",
      }),
      this.sendEmail({
        to: therapistEmail,
        subject: "👥 New Client Assignment - Hive Wellness",
        body: therapistTemplate,
        isHtml: true,
        templateId: "therapist_assignment",
      }),
    ]);

    return results;
  }

  // Helper method to send therapist onboarding email with messaging examples
  async sendTherapistOnboardingEmail(
    therapistEmail: string,
    therapistName: string
  ): Promise<EmailResponse> {
    const baseUrl =
      process.env.CLIENT_URL || process.env.BASE_URL
        ? process.env.CLIENT_URL || process.env.BASE_URL
        : "http://localhost:5000";

    const template = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Hive Wellness - Messaging Guide</title>
        <style>
          body { font-family: 'Open Sans', sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
          .container { max-width: 650px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #9306B1, #9306B1); padding: 40px 30px; text-align: center; color: white; }
          .content { padding: 40px 30px; }
          .section { margin: 25px 0; }
          .example-box { background: linear-gradient(135deg, #fef7ff, #f3e8ff); padding: 20px; border-radius: 12px; border-left: 4px solid #9306B1; margin: 15px 0; }
          .example-title { color: #9306B1; font-weight: 600; margin-bottom: 8px; font-size: 14px; }
          .example-text { color: #555; font-style: italic; line-height: 1.6; font-size: 14px; }
          .button { background: linear-gradient(135deg, #9306B1, #9306B1); color: white; padding: 15px 30px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 600; margin: 20px 0; }
          .tip-box { background: #e8f4ff; padding: 15px; border-radius: 8px; border-left: 3px solid #3b82f6; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">💬 Welcome to Hive Wellness</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your Secure Messaging Guide</p>
          </div>
          <div class="content">
            <h2 style="color: #9306B1;">Hello ${therapistName},</h2>
            <p>Welcome to Hive Wellness! We're excited to have you join our therapy platform. One of your key tools is our secure messaging system, which allows you to communicate with clients between sessions.</p>
            
            <div class="section">
              <h3 style="color: #9306B1; margin-bottom: 15px;">📱 How to Use Messaging</h3>
              <p>Our messaging service helps you stay connected with clients for quick check-ins, appointment changes, and follow-ups. Here are some practical examples:</p>
            </div>

            <div class="example-box">
              <div class="example-title">📅 Session Rescheduling</div>
              <div class="example-text">"Hi John, I am sorry but I need to rearrange our session. Can you do 5pm tomorrow instead? If so, please just book in for the new time through the portal."</div>
            </div>

            <div class="example-box">
              <div class="example-title">✨ Session Follow-up</div>
              <div class="example-text">"Hi Sarah, thank you for our session today. Remember to practice the breathing techniques we discussed. How are you feeling about implementing them?"</div>
            </div>

            <div class="example-box">
              <div class="example-title">🔔 Appointment Reminder</div>
              <div class="example-text">"Hi Emma, looking forward to seeing you tomorrow at 3pm. Please let me know if you need to reschedule or have any questions before we meet."</div>
            </div>

            <div class="example-box">
              <div class="example-title">📝 Resource Sharing</div>
              <div class="example-text">"Hi Michael, I wanted to share some resources about cognitive behavioural techniques. I'll upload the materials to your portal - they might be helpful before our next session."</div>
            </div>

            <div class="tip-box">
              <p style="margin: 0; font-size: 13px; color: #1e40af;"><strong>💡 Pro Tip:</strong> Keep messages professional and concise. Avoid including sensitive clinical details or personal information in messages for security and privacy reasons.</p>
            </div>

            <div class="section">
              <h3 style="color: #9306B1; margin-bottom: 15px;">🔒 Privacy & Security</h3>
              <ul style="color: #555; line-height: 1.8;">
                <li>All messages are encrypted and monitored for quality assurance</li>
                <li>Never include sensitive clinical notes in messages</li>
                <li>Use the secure portal for detailed therapy documentation</li>
                <li>Clients receive email notifications when you send a message</li>
              </ul>
            </div>

            <div class="section" style="background: linear-gradient(135deg, #fef7ff, #f3e8ff); padding: 25px; border-radius: 12px; border: 2px solid #9306B1; margin: 30px 0;">
              <h3 style="color: #9306B1; margin-bottom: 15px;">🔐 Important: Account Security Setup Required</h3>
              <p style="color: #333; margin-bottom: 15px;">As a therapist handling sensitive client information and payments, your account requires two-factor authentication (2FA) for enhanced security.</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 15px 0;">
                <h4 style="color: #9306B1; margin-top: 0; font-size: 16px;">📱 Before Your First Login - Download an Authenticator App</h4>
                <p style="color: #555; margin-bottom: 10px;">You'll need one of these free apps on your mobile device:</p>
                <ul style="color: #555; line-height: 1.8; margin: 10px 0;">
                  <li><strong>Google Authenticator</strong> - <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" style="color: #9306B1;">Android</a> | <a href="https://apps.apple.com/app/google-authenticator/id388497605" style="color: #9306B1;">iPhone</a></li>
                  <li><strong>Microsoft Authenticator</strong> - <a href="https://play.google.com/store/apps/details?id=com.azure.authenticator" style="color: #9306B1;">Android</a> | <a href="https://apps.apple.com/app/microsoft-authenticator/id983156458" style="color: #9306B1;">iPhone</a></li>
                  <li><strong>Authy</strong> - <a href="https://authy.com/download/" style="color: #9306B1;">All Devices</a></li>
                </ul>
              </div>

              <div style="background: #fff9e6; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 15px 0;">
                <p style="margin: 0; color: #856404;"><strong>⏰ What to Expect:</strong> When you log in for the first time, you'll be guided through a simple setup process to scan a QR code with your authenticator app. This takes less than 2 minutes!</p>
              </div>

              <div style="margin-top: 20px;">
                <p style="color: #555; margin: 5px 0;"><strong>Why this matters:</strong></p>
                <ul style="color: #555; line-height: 1.6; margin-top: 5px;">
                  <li>Protects sensitive client data and therapy notes</li>
                  <li>Secures your payment and payout information</li>
                  <li>Meets professional data protection standards</li>
                  <li>Required for GDPR compliance</li>
                </ul>
              </div>
            </div>

            <a href="${baseUrl}/portal?service=messaging" class="button" style="color: #ffffff !important;">Access Messaging Portal</a>
            
            <p style="font-size: 14px; color: #97A5D0; margin-top: 30px;">If you have any questions about using the messaging system, please contact our support team at support@hive-wellness.co.uk</p>
            <p style="margin-top: 20px; color: #9306B1; font-style: italic; text-align: center;">Therapy tailored to you</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: therapistEmail,
      subject: "💬 Welcome to Hive Wellness - Your Messaging Guide",
      body: template,
      isHtml: true,
      templateId: "therapist_onboarding_messaging",
    });
  }

  async sendBulkEmail(
    recipients: string[],
    subject: string,
    body: string,
    isHtml = true
  ): Promise<EmailResponse[]> {
    if (!this.initialized) {
      return [
        {
          success: false,
          error: "SendGrid service not initialized",
        },
      ];
    }

    try {
      const msg = {
        from: this.fromEmail,
        subject,
        ...(isHtml ? { html: body } : { text: body }),
        personalizations: recipients.map((email) => ({
          to: [{ email }],
          customArgs: {
            bulkEmail: "true",
            timestamp: new Date().toISOString(),
          },
        })),
        trackingSettings: {
          clickTracking: {
            enable: true,
            enableText: true,
          },
          openTracking: {
            enable: true,
          },
          subscriptionTracking: {
            enable: true,
          },
        },
      };

      const response = await sgMail.send(msg);

      return recipients.map((email, index) => ({
        success: true,
        messageId: (response as any)[index]?.headers?.["x-message-id"] || nanoid(),
        metadata: {
          recipient: email,
          response: (response as any)[index]?.statusCode,
        },
      }));
    } catch (error: any) {
      console.error("Failed to send bulk email:", error);

      return recipients.map((email) => ({
        success: false,
        error: error.message || "Failed to send email",
        metadata: {
          recipient: email,
          errorCode: error.code,
          errorMessage: error.message,
        },
      }));
    }
  }

  async sendTemplatedEmail(
    templateId: string,
    to: string,
    variables: Record<string, any>
  ): Promise<EmailResponse> {
    try {
      // Get template from database
      const template = await db.query.emailTemplates.findFirst({
        where: (templates, { eq }) => eq(templates.id, templateId),
      });

      if (!template) {
        return {
          success: false,
          error: "Template not found",
        };
      }

      // Replace variables in template
      let subject = template.subject;
      let body = template.content;

      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{${key}}`, "g");
        subject = subject.replace(regex, String(value || ""));
        body = body.replace(regex, String(value || ""));
      }

      // Send email
      const result = await this.sendEmail({
        to,
        subject,
        body,
        isHtml: true,
        templateId,
        metadata: {
          templateId,
          variables,
        },
      });

      // Update template usage
      if (result.success) {
        await db
          .update(emailTemplates)
          .set({
            usage: template.usage + 1,
            lastUsed: new Date(),
          })
          .where(eq(emailTemplates.id, templateId));
      }

      return result;
    } catch (error: any) {
      console.error("Failed to send templated email:", error);

      return {
        success: false,
        error: error.message || "Failed to send templated email",
      };
    }
  }

  async processWebhook(webhookData: any): Promise<void> {
    try {
      const events = Array.isArray(webhookData) ? webhookData : [webhookData];

      for (const event of events) {
        const {
          email,
          event: eventType,
          timestamp,
          "smtp-id": smtpId,
          category,
          sg_event_id,
          sg_message_id,
          reason,
          status,
          response,
          url,
          url_offset,
          useragent,
          ip,
        } = event;

        // Store webhook data
        await db.insert(sendgridWebhooks).values({
          id: nanoid(),
          messageId: sg_message_id || smtpId || nanoid(),
          email,
          event: eventType,
          timestamp: new Date(timestamp * 1000),
          smtpId,
          category,
          sg_event_id,
          sg_message_id,
          reason,
          status,
          response,
          url,
          urlOffset: url_offset ? { offset: url_offset } : null,
          useragent,
          ip,
          webhookData: event,
          createdAt: new Date(),
        });

        // Update notification status if we can find it
        const notification = await db.query.notifications.findFirst({
          where: (notifications, { eq }) =>
            eq(notifications.metadata, { messageId: sg_message_id }),
        });

        if (notification) {
          let status = "sent";
          let deliveredAt = null;
          let readAt = null;

          switch (eventType) {
            case "delivered":
              status = "delivered";
              deliveredAt = new Date(timestamp * 1000);
              break;
            case "open":
              status = "read";
              readAt = new Date(timestamp * 1000);
              break;
            case "bounce":
            case "dropped":
            case "spamreport":
              status = "failed";
              break;
          }

          await db
            .update(notifications)
            .set({
              status: status as any,
              deliveredAt,
              readAt,
              errorMessage: reason,
              updatedAt: new Date(),
            })
            .where(eq(notifications.id, notification.id));
        }
      }
    } catch (error) {
      console.error("Error processing SendGrid webhook:", error);
    }
  }

  async getEmailStats(userId?: string): Promise<any> {
    try {
      const query = userId
        ? db.query.notifications.findMany({
            where: (notifications, { and, eq }) =>
              and(eq(notifications.userId, userId), eq(notifications.channel, "email")),
          })
        : db.query.notifications.findMany({
            where: (notifications, { eq }) => eq(notifications.channel, "email"),
          });

      const emailNotifications = await query;

      const stats = {
        total: emailNotifications.length,
        sent: emailNotifications.filter((n) => n.status === "sent").length,
        delivered: emailNotifications.filter((n) => n.status === "delivered").length,
        read: emailNotifications.filter((n) => n.status === "read").length,
        failed: emailNotifications.filter((n) => n.status === "failed").length,
        pending: emailNotifications.filter((n) => n.status === "pending").length,
      };

      return {
        ...stats,
        deliveryRate: stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0,
        openRate: stats.delivered > 0 ? (stats.read / stats.delivered) * 100 : 0,
        failureRate: stats.total > 0 ? (stats.failed / stats.total) * 100 : 0,
      };
    } catch (error) {
      console.error("Error getting email stats:", error);
      return {
        total: 0,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
        pending: 0,
        deliveryRate: 0,
        openRate: 0,
        failureRate: 0,
      };
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async sendPasswordResetEmail(options: {
    to: string;
    firstName: string;
    resetToken: string;
    resetUrl: string;
    expiresIn: string;
  }): Promise<EmailResponse> {
    const subject = "Reset Your Hive Wellness Password";
    const body = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset - Hive Wellness</title>
        <style>
          body { font-family: 'Open Sans', Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { background: linear-gradient(135deg, #9306B1 0%, #7B4397 100%); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-family: 'Century Old Style Std', serif; font-size: 28px; }
          .content { padding: 40px 30px; }
          .content h2 { color: #9306B1; margin-bottom: 20px; font-family: 'Century Old Style Std', serif; }
          .reset-button { 
            display: inline-block; 
            background: linear-gradient(135deg, #9306B1 0%, #7B4397 100%); 
            color: white; 
            text-decoration: none; 
            padding: 15px 30px; 
            border-radius: 6px; 
            margin: 20px 0; 
            font-weight: bold;
          }
          .token-box { 
            background-color: #f8f9fa; 
            border: 2px solid #9306B1; 
            padding: 15px; 
            margin: 20px 0; 
            border-radius: 6px; 
            font-family: monospace; 
            font-size: 14px;
            word-break: break-all;
          }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hello ${options.firstName},</h2>
            <p>We received a request to reset your password for your Hive Wellness therapist account.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${options.resetUrl}" 
                 style="background-color: #9306B1; color: #ffffff !important; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Reset Your Password
              </a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #9306B1;">${options.resetUrl}</p>
            
            <p><strong>This link expires in ${options.expiresIn}.</strong></p>
            
            <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
            
            <p style="margin-top: 30px; color: #9306B1; font-style: italic; text-align: center;">Therapy tailored to you</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Hive Wellness. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: options.to,
      subject,
      body,
      isHtml: true,
      metadata: {
        type: "password_reset",
        resetToken: options.resetToken,
        expiresIn: options.expiresIn,
      },
    });
  }

  /**
   * Send client activation email with therapist introduction
   */
  async sendClientActivationEmail(options: {
    to: string;
    clientFirstName: string;
    therapistName: string;
    therapistCredentials: string;
    activationUrl: string;
    expiresIn: string;
  }): Promise<EmailResponse> {
    const subject = "Welcome to Hive Wellness - Create Your Account";

    const body = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Hive Wellness</title>
        <style>
          body { font-family: 'Open Sans', 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #9306B1 0%, #7B05A0 100%); color: white; padding: 40px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
          .content { padding: 40px 30px; }
          .content h2 { color: #9306B1; font-size: 22px; margin-bottom: 20px; }
          .content p { margin: 15px 0; color: #555; }
          .therapist-intro { 
            background-color: #f8f4fc; 
            border-left: 4px solid #9306B1; 
            padding: 20px; 
            margin: 25px 0; 
            border-radius: 4px;
          }
          .therapist-intro h3 { color: #9306B1; margin: 0 0 10px 0; font-size: 18px; }
          .therapist-intro p { margin: 5px 0; color: #666; }
          .cta-button { 
            text-align: center; 
            margin: 35px 0; 
          }
          .cta-button a { 
            background-color: #9306B1; 
            color: white; 
            padding: 16px 40px; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: 600; 
            font-size: 16px;
            display: inline-block;
            box-shadow: 0 4px 6px rgba(147, 6, 177, 0.2);
          }
          .cta-button a:hover { background-color: #7B05A0; }
          .steps { 
            background-color: #f8f9fa; 
            padding: 20px; 
            margin: 25px 0; 
            border-radius: 6px;
          }
          .steps h3 { color: #333; margin-top: 0; }
          .steps ol { margin: 10px 0; padding-left: 20px; }
          .steps li { margin: 8px 0; color: #555; }
          .link-box { 
            background-color: #f8f9fa; 
            border: 2px dashed #9306B1; 
            padding: 15px; 
            margin: 20px 0; 
            border-radius: 6px; 
            font-size: 12px;
            word-break: break-all;
            color: #666;
          }
          .expiry-notice { 
            background-color: #fff9e6; 
            border-left: 4px solid #ffc107; 
            padding: 12px; 
            margin: 20px 0; 
            border-radius: 4px;
            font-size: 14px;
          }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
          .footer p { margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌟 Welcome to Hive Wellness</h1>
          </div>
          
          <div class="content">
            <h2>Hi ${options.clientFirstName},</h2>
            
            <p>Great news! We've successfully matched you with a therapist who we believe will be a perfect fit for your therapeutic journey.</p>
            
            <div class="therapist-intro">
              <h3>👤 Your Matched Therapist</h3>
              <p><strong>${options.therapistName}</strong></p>
              <p>${options.therapistCredentials}</p>
            </div>
            
            <p>To get started with your therapy sessions, you'll need to create your secure client portal account.</p>
            
            <div class="steps">
              <h3>Next Steps:</h3>
              <ol>
                <li>Click the "Create My Account" button below</li>
                <li>Set up your secure password</li>
                <li>Complete your profile</li>
                <li>Book your first session with ${options.therapistName.split(" ")[0]}</li>
              </ol>
            </div>
            
            <div class="cta-button">
              <a href="${options.activationUrl}" style="color: #ffffff !important;">Create My Account</a>
            </div>
            
            <div class="expiry-notice">
              <strong>⏰ Important:</strong> This secure link is valid for ${options.expiresIn}. Please create your account soon to begin your therapy journey.
            </div>
            
            <p style="font-size: 13px; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
            <div class="link-box">${options.activationUrl}</div>
            
            <p>Once your account is set up, you'll be able to:</p>
            <ul style="color: #555;">
              <li>Schedule therapy sessions</li>
              <li>Message your therapist securely</li>
              <li>Access therapy resources</li>
              <li>Track your progress</li>
            </ul>
            
            <p style="margin-top: 30px;">We're excited to support you on your journey to better mental health.</p>
            
            <p style="margin-top: 30px; color: #9306B1; font-style: italic; text-align: center; font-size: 16px;">Therapy tailored to you</p>
          </div>
          
          <div class="footer">
            <p><strong>Need help?</strong> Contact us at <a href="mailto:support@hive-wellness.co.uk" style="color: #9306B1;">support@hive-wellness.co.uk</a></p>
            <p style="margin-top: 10px;">This is an automated message from Hive Wellness.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: options.to,
      subject,
      body,
      isHtml: true,
      metadata: {
        type: "client_activation",
        therapistName: options.therapistName,
        expiresIn: options.expiresIn,
      },
    });
  }
}

export const emailService = new EmailService();
