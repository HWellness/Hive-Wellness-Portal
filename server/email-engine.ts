import { MailService } from '@sendgrid/mail';
import { db } from './db';
import { emailQueue, users, appointments } from '@shared/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

// Email templates
type EmailTemplate = {
  subject: string;
  template: (data: any) => string;
};

const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  welcome: {
    subject: 'Welcome to Hive Wellness - Your Therapy Journey Begins',
    template: (data: any) => `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        

<div style="text-align: center; margin-bottom: 30px;">
  <div style="padding: 20px; background: linear-gradient(135deg, #9306B1 0%, #B237D1 100%); border-radius: 10px; box-shadow: 0 4px 12px rgba(147, 6, 177, 0.3);">
    <h1 style="color: white; font-family: 'Century Old Style', serif; font-size: 32px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); letter-spacing: 1px;">
      HIVE WELLNESS
    </h1>
    <p style="color: #F0E6FF; font-size: 16px; margin: 8px 0 0 0; font-weight: 300;">
      Your professional therapy platform
    </p>
  </div>
</div>
</div>
        
        <div style="background: linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%); padding: 25px; border-radius: 12px; margin-bottom: 25px;">
          <h2 style="color: #374151; font-size: 20px; margin-bottom: 15px;">Hello ${data.firstName || 'there'}!</h2>
          <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
            Welcome to Hive Wellness, where professional mental health support meets cutting-edge technology. 
            We're committed to helping you achieve your therapeutic goals through our comprehensive platform.
          </p>
        </div>

        <div style="margin-bottom: 25px;">
          <h3 style="color: #374151; font-size: 18px; margin-bottom: 15px;">Your Next Steps:</h3>
          <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; border-left: 4px solid #9306B1;">
            <ul style="color: #4B5563; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Complete your comprehensive therapy profile</li>
              <li style="margin-bottom: 8px;">Browse our network of verified, licensed therapists</li>
              <li style="margin-bottom: 8px;">Schedule your initial consultation session</li>
              <li>Explore our secure video therapy platform</li>
            </ul>
          </div>
        </div>

        

<div style="text-align: center; margin-bottom: 30px;">
  <div style="padding: 20px; background: linear-gradient(135deg, #9306B1 0%, #B237D1 100%); border-radius: 10px; box-shadow: 0 4px 12px rgba(147, 6, 177, 0.3);">
    <h1 style="color: white; font-family: 'Century Old Style', serif; font-size: 32px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); letter-spacing: 1px;">
      HIVE WELLNESS
    </h1>
    <p style="color: #F0E6FF; font-size: 16px; margin: 8px 0 0 0; font-weight: 300;">
      Your professional therapy platform
    </p>
  </div>
</div>
</div>
        
        <div style="background: linear-gradient(135deg, #fef7ff 0%, #fef3ff 100%); padding: 20px; border-radius: 12px; margin-bottom: 25px;">
          <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">Hi ${data.clientName || 'there'},</p>
          <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin: 0;">
            This is a friendly reminder about your upcoming therapy session. We're looking forward to supporting your continued progress.
          </p>
        </div>

        <div style="background: #ffffff; border: 2px solid #E5E7EB; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
          <h3 style="color: #374151; font-size: 18px; margin-bottom: 15px;">📅 Session Details</h3>
          <div style="display: grid; gap: 12px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F3F4F6;">
              <span style="color: #6B7280; font-weight: 500;">Date:</span>
              <span style="color: #374151; font-weight: 600;">${data.date}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F3F4F6;">
              <span style="color: #6B7280; font-weight: 500;">Time:</span>
              <span style="color: #374151; font-weight: 600;">${data.time}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F3F4F6;">
              <span style="color: #6B7280; font-weight: 500;">Therapist:</span>
              <span style="color: #374151; font-weight: 600;">${data.therapistName}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
              <span style="color: #6B7280; font-weight: 500;">Session Type:</span>
              <span style="color: #374151; font-weight: 600;">${data.sessionType || 'Individual Therapy'}</span>
            </div>
          </div>
        </div>

        

<div style="text-align: center; margin-bottom: 30px;">
  <div style="padding: 20px; background: linear-gradient(135deg, #9306B1 0%, #B237D1 100%); border-radius: 10px; box-shadow: 0 4px 12px rgba(147, 6, 177, 0.3);">
    <h1 style="color: white; font-family: 'Century Old Style', serif; font-size: 32px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); letter-spacing: 1px;">
      HIVE WELLNESS
    </h1>
    <p style="color: #F0E6FF; font-size: 16px; margin: 8px 0 0 0; font-weight: 300;">
      Your professional therapy platform
    </p>
  </div>
</div>
</div>
        
        <div style="background: #F9FAFB; padding: 25px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #9306B1;">
          ${data.body || data.content || 'Thank you for using Hive Wellness.'}
        </div>

        

<div style="text-align: center; margin-bottom: 30px;">
  <div style="padding: 20px; background: linear-gradient(135deg, #9306B1 0%, #B237D1 100%); border-radius: 10px; box-shadow: 0 4px 12px rgba(147, 6, 177, 0.3);">
    <h1 style="color: white; font-family: 'Century Old Style', serif; font-size: 32px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); letter-spacing: 1px;">
      HIVE WELLNESS
    </h1>
    <p style="color: #F0E6FF; font-size: 16px; margin: 8px 0 0 0; font-weight: 300;">
      Your professional therapy platform
    </p>
  </div>
</div>
</div>
        
        <div style="background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); padding: 20px; border-radius: 12px; margin-bottom: 25px;">
          <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">Hi ${data.clientName || 'there'},</p>
          <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin: 0;">
            Thank you for completing your therapy session with ${data.therapistName || 'your therapist'}. We hope it was helpful and supportive.
          </p>
        </div>

        <div style="background: #ffffff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
          <h3 style="color: #374151; font-size: 18px; margin-bottom: 15px;">📋 Session Summary</h3>
          <div style="display: grid; gap: 10px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F3F4F6;">
              <span style="color: #6B7280; font-weight: 500;">Date:</span>
              <span style="color: #374151; font-weight: 600;">${data.date}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F3F4F6;">
              <span style="color: #6B7280; font-weight: 500;">Duration:</span>
              <span style="color: #374151; font-weight: 600;">${data.duration || '50'} minutes</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
              <span style="color: #6B7280; font-weight: 500;">Focus:</span>
              <span style="color: #374151; font-weight: 600;">${data.sessionFocus || 'Individual Therapy'}</span>
            </div>
          </div>
        </div>

        <div style="background: #fef7ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h4 style="color: #9306B1; font-size: 16px; margin-bottom: 12px;">🌱 What's Next</h4>
          <ul style="color: #9306B1; font-size: 14px; margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 6px;">Review session notes in your portal</li>
            <li style="margin-bottom: 6px;">Complete any homework or exercises discussed</li>
            <li style="margin-bottom: 6px;">Reflect on insights from today's session</li>
            <li>Schedule your next session when ready</li>
          </ul>
        </div>

        

<div style="text-align: center; margin-bottom: 30px;">
  <div style="padding: 20px; background: linear-gradient(135deg, #9306B1 0%, #B237D1 100%); border-radius: 10px; box-shadow: 0 4px 12px rgba(147, 6, 177, 0.3);">
    <h1 style="color: white; font-family: 'Century Old Style', serif; font-size: 32px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); letter-spacing: 1px;">
      HIVE WELLNESS
    </h1>
    <p style="color: #F0E6FF; font-size: 16px; margin: 8px 0 0 0; font-weight: 300;">
      Your professional therapy platform
    </p>
  </div>
</div>
</div>
        <h1 style="color: #9306B1;">Welcome to Hive Wellness, Dr. ${data.lastName}!</h1>
        <p>Congratulations! Your therapist application has been approved. Welcome to our professional therapy network.</p>
        <div style="background: #fef7ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Your Profile Details:</h3>
          <p><strong>Specialisations:</strong> ${data.specialisations}</p>
          <p><strong>Session Rate:</strong> £${data.hourlyRate}/hour</p>
          <p><strong>Platform Fee:</strong> 15% (You receive 85%)</p>
        </div>
        <p><strong>Getting Started:</strong></p>
        <ul>
          <li>Complete your Stripe Connect setup for payments</li>
          <li>Configure your availability calendar</li>
          <li>Review client matching preferences</li>
          <li>Explore the therapist dashboard</li>
        </ul>
        <a href="${data.portalUrl}" style="background: #9306B1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Access Therapist Portal</a>
        <p>We're excited to have you on our team!</p>
        <p>Best regards,<br>The Hive Wellness Team</p>
      </div>
    `
  },
  connectingComplete: {
    subject: 'Great News - You\'ve Been Connected with a Therapist!',
    template: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        

<div style="text-align: center; margin-bottom: 30px;">
  <div style="padding: 20px; background: linear-gradient(135deg, #9306B1 0%, #B237D1 100%); border-radius: 10px; box-shadow: 0 4px 12px rgba(147, 6, 177, 0.3);">
    <h1 style="color: white; font-family: 'Century Old Style', serif; font-size: 32px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); letter-spacing: 1px;">
      HIVE WELLNESS
    </h1>
    <p style="color: #F0E6FF; font-size: 16px; margin: 8px 0 0 0; font-weight: 300;">
      Your professional therapy platform
    </p>
  </div>
</div>
</div>
        <h1 style="color: #9306B1;">You've Been Connected!</h1>
        <p>Hi ${data.clientName},</p>
        <p>Wonderful news! Our AI connecting system and clinical team have found an excellent therapist connection for you.</p>
        <div style="background: #fef7ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Your Connected Therapist:</h3>
          <p><strong>Name:</strong> ${data.therapistName}</p>
          <p><strong>Specialisations:</strong> ${data.specialisations}</p>
          <p><strong>Experience:</strong> ${data.experience} years</p>
          <p><strong>Connection Score:</strong> ${data.compatibilityScore}% compatibility</p>
        </div>
        <p><strong>Why This Connection:</strong></p>
        <p>${data.connectingReasoning || data.matchReasoning}</p>
        <a href="${data.bookingUrl}" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Book Your First Session</a>
        <p>We're confident this will be a great therapeutic partnership. If you have any questions, please don't hesitate to reach out.</p>
        <p>Best regards,<br>Hive Wellness Clinical Team</p>
      </div>
    `
  }
};

export class EmailEngine {
  private mailService: MailService | null = null;
  private fromEmail: string;

  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'support@hive-wellness.co.uk';
    
    if (process.env.SENDGRID_API_KEY) {
      this.mailService = new MailService();
      this.mailService.setApiKey(process.env.SENDGRID_API_KEY);
    } else {
      console.warn("SENDGRID_API_KEY not found. Email functionality will be limited.");
    }
  }

  // Queue an email for sending
  async queueEmail(
    type: keyof typeof EMAIL_TEMPLATES,
    to: string,
    data: any,
    priority: 'high' | 'normal' | 'low' = 'normal',
    scheduledFor?: Date
  ) {
    try {
      const template = EMAIL_TEMPLATES[type];
      const subject = this.replaceVariables(template.subject, data);
      const htmlContent = template.template(data);

      const [emailRecord] = await db.insert(emailQueue).values({
        id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        to,
        subject,
        htmlContent,
        data: JSON.stringify(data),
        priority,
        status: 'queued',
        scheduledFor: scheduledFor || new Date(),
        createdAt: new Date()
      }).returning();

      return emailRecord;
    } catch (error) {
      console.error('Error queueing email:', error);
      throw error;
    }
  }

  // Process email queue
  async processEmailQueue(batchSize: number = 10) {
    try {
      // Get pending emails sorted by priority and schedule time
      const pendingEmails = await db
        .select()
        .from(emailQueue)
        .where(
          and(
            eq(emailQueue.status, 'queued'),
            sql`${emailQueue.scheduledFor} <= NOW()`
          )
        )
        .orderBy(
          sql`CASE ${emailQueue.priority} WHEN 'high' THEN 1 WHEN 'normal' THEN 2 WHEN 'low' THEN 3 END`,
          emailQueue.scheduledFor
        )
        .limit(batchSize);

      const results = [];

      for (const email of pendingEmails) {
        try {
          // Mark as processing
          await db
            .update(emailQueue)
            .set({ 
              status: 'processing',
              attempts: sql`${emailQueue.attempts} + 1`,
              lastAttempt: new Date()
            })
            .where(eq(emailQueue.id, email.id));

          // Send email
          if (this.mailService) {
            await this.mailService.send({
              to: email.to,
              from: this.fromEmail,
              subject: email.subject,
              html: email.htmlContent
            });
          } else {
            throw new Error('Email service not configured');
          }

          // Mark as sent
          await db
            .update(emailQueue)
            .set({ 
              status: 'sent',
              sentAt: new Date()
            })
            .where(eq(emailQueue.id, email.id));

          results.push({ id: email.id, status: 'sent' });

        } catch (sendError) {
          console.error(`Error sending email ${email.id}:`, sendError);
          
          // Mark as failed or retry
          const shouldRetry = (email.attempts || 0) < 3;
          await db
            .update(emailQueue)
            .set({ 
              status: shouldRetry ? 'queued' : 'failed',
              error: sendError instanceof Error ? sendError.message : 'Unknown error',
              scheduledFor: shouldRetry ? new Date(Date.now() + 30 * 60 * 1000) : undefined // Retry in 30 minutes
            })
            .where(eq(emailQueue.id, email.id));

          results.push({ 
            id: email.id, 
            status: shouldRetry ? 'retrying' : 'failed',
            error: sendError instanceof Error ? sendError.message : 'Unknown error'
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error processing email queue:', error);
      throw error;
    }
  }

  // Get email queue statistics
  async getEmailStats() {
    try {
      const stats = await db
        .select({
          status: emailQueue.status,
          priority: emailQueue.priority,
          count: sql<number>`COUNT(*)`
        })
        .from(emailQueue)
        .groupBy(emailQueue.status, emailQueue.priority);

      const summary = {
        total: 0,
        queued: 0,
        processing: 0,
        sent: 0,
        failed: 0,
        byPriority: {
          high: 0,
          normal: 0,
          low: 0
        }
      };

      stats.forEach(stat => {
        summary.total += stat.count;
        const statusKey = stat.status as 'total' | 'queued' | 'processing' | 'sent' | 'failed';
        if (statusKey !== 'total') {
          (summary as any)[statusKey] = ((summary as any)[statusKey] || 0) + stat.count;
        }
        summary.byPriority[stat.priority as keyof typeof summary.byPriority] += stat.count;
      });

      return summary;
    } catch (error) {
      console.error('Error getting email stats:', error);
      throw error;
    }
  }

  // Automated email triggers
  async triggerWelcomeEmail(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.email) return;

    await this.queueEmail('welcome', user.email, {
      firstName: user.firstName || 'there',
      portalUrl: `${process.env.BASE_URL || 'https://hivewellness.com'}/portal`
    }, 'high');
  }

  async triggerAppointmentReminder(appointmentId: string) {
    // Simplified approach - get appointment and user data separately
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId));

    if (!appointment) return;

    if (!appointment.clientId || !appointment.therapistId) return;

    const [clientUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, appointment.clientId));

    const [therapistUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, appointment.therapistId));

    if (!clientUser?.email) return;

    const sessionDate = new Date(appointment.scheduledAt);
    
    await this.queueEmail('appointmentReminder', clientUser.email, {
      clientName: `${clientUser.firstName} ${clientUser.lastName}`,
      date: sessionDate.toLocaleDateString('en-GB'),
      time: sessionDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      therapistName: `${therapistUser?.firstName || 'Dr.'} ${therapistUser?.lastName || 'Therapist'}`,
      sessionType: appointment.sessionType,
      sessionUrl: `${process.env.BASE_URL}/portal/video-session/${appointment.id}`,
      rescheduleUrl: `${process.env.BASE_URL}/portal/appointments`
    }, 'high', new Date(sessionDate.getTime() - 24 * 60 * 60 * 1000)); // 24 hours before
  }

  async triggerSessionCompleteEmail(appointmentId: string) {
    // Similar to appointment reminder but for post-session
    // Implementation would fetch appointment details and send completion email
  }

  // Schedule automated reminder checking
  async scheduleAutomatedReminders() {
    // Get appointments in the next 25 hours that haven't had reminders sent
    const upcomingAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          sql`${appointments.scheduledAt} BETWEEN NOW() + INTERVAL '23 HOURS' AND NOW() + INTERVAL '25 HOURS'`,
          eq(appointments.status, 'confirmed'),
          isNull(sql`reminder_sent`) // Assuming we add this column
        )
      );

    for (const appointment of upcomingAppointments) {
      await this.triggerAppointmentReminder(appointment.id);
    }
  }

  // Send direct email without queuing
  async sendDirectEmail(params: {
    to: string[];
    cc?: string[];
    subject: string;
    body: string;
    priority?: string;
    template?: string;
    from?: string;
  }) {
    try {
      if (!this.mailService) {
        throw new Error('Email service not configured. Please check SENDGRID_API_KEY environment variable.');
      }

      const { to, cc, subject, body, template, from } = params;
      
      // Use template if provided, otherwise use plain body
      let htmlContent = body;
      if (template && EMAIL_TEMPLATES[template]) {
        const templateData = typeof params === 'object' ? params : {};
        htmlContent = EMAIL_TEMPLATES[template].template(templateData);
      }

      // Send email immediately through SendGrid
      const emailData = {
        to: to,
        cc: cc || [],
        from: from || this.fromEmail,
        subject: subject,
        html: htmlContent
      };

      await this.mailService.send(emailData);
      
      return {
        success: true,
        message: 'Email sent successfully',
        recipients: to.length + (cc ? cc.length : 0)
      };
    } catch (error) {
      console.error('Error sending direct email:', error);
      throw error;
    }
  }

  private replaceVariables(template: string, data: any): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] || match;
    });
  }
}

// Export singleton instance
export const emailEngine = new EmailEngine();