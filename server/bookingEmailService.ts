import { MailService } from "@sendgrid/mail";
import { GmailService } from "./gmail-service.js";

// Initialize SendGrid mail service as fallback
const sgMail = new MailService();
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Initialize Gmail service
const gmailService = new GmailService();

export interface BookingConfirmationData {
  name: string;
  email: string;
  phone?: string;
  preferredDate: string;
  preferredTime: string;
  message?: string;
  bookingId: string;
  videoSessionLink?: string;
  videoSessionId?: string;
  googleMeetUrl?: string;
  calendarUrl?: string;
  joinInstructions?: string;
  meetingInstructions?: string;
}

export interface EmailResults {
  userSent: boolean;
  adminSent: boolean;
  userError?: string;
  adminError?: string;
}

class BookingEmailService {
  private readonly adminRecipients = [
    "support@hive-wellness.co.uk",
    "admin@hive-wellness.co.uk",
    "robert@taxstatscloud.co.uk",
  ];

  async sendBookingConfirmations(bookingData: BookingConfirmationData): Promise<EmailResults> {
    const results: EmailResults = {
      userSent: false,
      adminSent: false,
    };

    // Send confirmation email to user
    try {
      await this.sendUserConfirmationEmail(bookingData);
      results.userSent = true;
      console.log(`✅ User confirmation email sent to ${bookingData.email}`);
    } catch (error) {
      results.userError = error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Failed to send user confirmation email:`, error);
    }

    // Send notification email to admin
    try {
      await this.sendAdminNotificationEmail(bookingData);
      results.adminSent = true;
      console.log(`✅ Admin notification email sent to ${this.adminRecipients.join(", ")}`);
    } catch (error) {
      results.adminError = error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Failed to send admin notification email:`, error);
    }

    return results;
  }

  private async sendEmailWithGmailFallback(emailData: any): Promise<void> {
    try {
      // Try Gmail API first
      await GmailService.sendEmail(emailData);
    } catch (gmailError) {
      console.error("Gmail error:", gmailError);

      // Fallback to SendGrid
      const sendGridData = {
        to: emailData.to,
        from: "Hive Wellness <support@hive-wellness.co.uk>",
        subject: emailData.subject,
        html: emailData.html,
      };

      await sgMail.send(sendGridData);
    }
  }

  private async sendUserConfirmationEmail(bookingData: BookingConfirmationData): Promise<void> {
    const {
      name,
      email,
      preferredDate,
      preferredTime,
      message,
      bookingId,
      googleMeetUrl,
      calendarUrl,
    } = bookingData;

    const formattedDate = new Date(preferredDate).toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const confirmationEmail = {
      to: email,
      from: "Hive Wellness <support@hive-wellness.co.uk>",
      subject: "Enhanced Instructions: Your Video Session with Clear Steps!",
      html: `
        <div style="font-family: 'Open Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #9306B1 0%, #7A05A3 100%); padding: 30px; text-align: center;">
            <h1 style="font-family: 'Century Old Style Std', serif; color: white; margin: 0; font-size: 28px; font-weight: 600;">
              Hive Wellness
            </h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
              Your Mental Health Journey Starts Here
            </p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: #F3E8FF; border-radius: 50px; width: 60px; height: 60px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 30px;">✅</span>
              </div>
              <h2 style="font-family: 'Century Old Style Std', serif; color: #9306B1; margin: 0 0 10px 0; font-size: 24px;">
                Your Free Initial Chat is Confirmed!
              </h2>
              <p style="color: #666; margin: 0; font-size: 16px;">
                We're excited to speak with you
              </p>
            </div>

            <!-- Personal Greeting -->
            <div style="margin-bottom: 25px;">
              <h3 style="color: #9306B1; margin: 0 0 10px 0; font-size: 18px;">
                Hello ${name},
              </h3>
              <p style="color: #333; margin: 0; line-height: 1.6; font-size: 16px;">
                Thank you for booking your free initial chat with Hive Wellness. We've received your request and will be in touch shortly to confirm your appointment.
              </p>
            </div>

            <!-- Booking Details -->
            <div style="background: #F8F9FA; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 4px solid #9306B1;">
              <h3 style="font-family: 'Century Old Style Std', serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
                Your Appointment Details
              </h3>
              <div style="line-height: 1.8; color: #333;">
                <p style="margin: 8px 0;"><strong>Name:</strong> ${name}</p>
                <p style="margin: 8px 0;"><strong>Date:</strong> ${formattedDate}</p>
                <p style="margin: 8px 0;"><strong>Time:</strong> ${preferredTime}</p>
                <p style="margin: 8px 0;"><strong>Booking Reference:</strong> ${bookingId}</p>
                ${message ? `<p style="margin: 8px 0;"><strong>Your Message:</strong> ${message}</p>` : ""}
              </div>
            </div>

            ${
              googleMeetUrl
                ? `
            <!-- Enhanced Video Call Section -->
            <div style="background: #F3E8FF; border: 2px solid #9306B1; border-radius: 15px; padding: 25px; margin: 25px 0; text-align: center;">
              <div style="margin-bottom: 15px;">
                <span style="font-size: 24px;">🎥</span>
                <h3 style="color: #9306B1; margin: 10px 0 5px 0; font-size: 20px; font-weight: 600;">
                  Your Video Call is Ready!
                </h3>
              </div>
              
              <p style="color: #6B2C91; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                Your Google Meet session has been automatically created and added to your calendar.
              </p>
              
              <!-- Meeting Instructions -->
              <div style="background: #F8F9FA; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #DEE2E6; text-align: left;">
                <h4 style="color: #495057; margin: 0 0 15px 0; font-size: 16px; text-align: center;">
                  📋 How to Join Your Video Call
                </h4>
                
                <div style="background: #FFFFFF; padding: 15px; border-radius: 8px; border: 1px solid #E9ECEF; margin-bottom: 15px; text-align: center;">
                  <p style="margin: 0 0 10px 0; color: #495057; font-weight: 600;">Meeting Code:</p>
                  <p style="font-family: 'Courier New', monospace; background: #F8F9FA; padding: 10px; border-radius: 5px; margin: 0; font-size: 18px; font-weight: 600; color: #9306B1; border: 2px solid #9306B1;">
                    ${googleMeetUrl.split("/").pop()}
                  </p>
                </div>
                
                <div style="color: #6C757D; font-size: 14px; line-height: 1.6;">
                  <p style="margin: 0 0 10px 0;"><strong>Step 1:</strong> Go to <a href="https://meet.google.com/landing" style="color: #9306B1; text-decoration: none;">meet.google.com/landing</a></p>
                  <p style="margin: 0 0 10px 0;"><strong>Step 2:</strong> Click "Enter a code or nickname"</p>
                  <p style="margin: 0 0 10px 0;"><strong>Step 3:</strong> Enter the meeting code above</p>
                  <p style="margin: 0 0 15px 0;"><strong>Step 4:</strong> Click "Join" to connect with your therapist</p>
                  
                  <div style="background: #FFF3CD; border: 1px solid #FFEAA7; border-radius: 6px; padding: 12px; margin-top: 15px;">
                    <p style="margin: 0; color: #856404; font-size: 13px;">
                      <strong>💡 Tip:</strong> Add this to your calendar now and the meeting link will be ready when it's time for your session!
                    </p>
                  </div>
                </div>
              </div>
              
              <p style="color: #6B2C91; margin: 15px 0 0 0; font-size: 14px;">
                Calendar invitation sent to <strong>${email}</strong>
              </p>
            </div>
            `
                : ""
            }

            <!-- What Happens Next -->
            <div style="background: #F3E8FF; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
              <h3 style="font-family: 'Century Old Style Std', serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
                What Happens Next?
              </h3>
              <div style="color: #6B2C91; line-height: 1.8; margin: 0;">
                <p style="margin-bottom: 12px;">Use the information above to join the Video call for the time you booked.</p>
                <p style="margin-bottom: 12px;">A member of our team will join you on the call to get to know you and to get a better understanding of how we may best support you.</p>
                <p style="margin-bottom: 12px;">We'll match you with the perfect therapist for your needs.</p>
                <p style="margin: 0;">Once you are matched with a Therapist, you will be able to book sessions with them. Your Therapist may also choose to message you to help further.</p>
              </div>
            </div>

            <!-- Contact Information -->
            <p style="color: #666; margin: 25px 0; text-align: center; font-size: 14px; line-height: 1.6;">
              If you have any questions or need to reschedule, please don't hesitate to contact us.
            </p>

            <!-- Thank You Message -->
            <div style="text-align: center; margin: 30px 0;">
              <h3 style="font-family: 'Century Old Style Std', serif; color: #9306B1; margin: 0 0 10px 0; font-size: 18px;">
                Thank you for choosing Hive Wellness
              </h3>
              <p style="color: #666; margin: 0; line-height: 1.6; font-size: 14px;">
                Therapy tailored to you.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #2C3E50; padding: 20px; text-align: center; color: white; font-size: 12px; line-height: 1.5;">
            <p style="margin: 0 0 5px 0;">© 2025 Hive Wellness. All rights reserved.</p>
            <p style="margin: 0;">This email was sent regarding your booking request.</p>
          </div>
        </div>
      `,
    };

    await this.sendEmailWithGmailFallback({
      to: email,
      subject: confirmationEmail.subject,
      html: confirmationEmail.html,
    });
  }

  private async sendAdminNotificationEmail(bookingData: BookingConfirmationData): Promise<void> {
    const {
      name,
      email,
      phone,
      preferredDate,
      preferredTime,
      message,
      bookingId,
      googleMeetUrl,
      calendarUrl,
    } = bookingData;

    const formattedDate = new Date(preferredDate).toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const notificationEmail = {
      to: this.adminRecipients,
      from: "Hive Wellness <support@hive-wellness.co.uk>",
      subject: `🔔 New Booking: ${name} - ${formattedDate} at ${preferredTime}`,
      html: `
        <div style="font-family: 'Open Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #9306B1 0%, #7A05A3 100%); padding: 30px; text-align: center;">
            <h1 style="font-family: 'Century Old Style Std', serif; color: white; margin: 0; font-size: 24px; font-weight: 600;">
              🔔 New Booking Alert
            </h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
              Immediate Action Required
            </p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 30px;">
            <!-- Urgent Notice -->
            <div style="background: #FFF3CD; border: 2px solid #FFC107; padding: 20px; border-radius: 10px; margin-bottom: 25px; text-align: center;">
              <h2 style="color: #856404; margin: 0 0 10px 0; font-size: 20px;">
                ⚡ Immediate Booking Confirmation Required
              </h2>
              <p style="color: #856404; margin: 0; font-weight: bold;">
                Client has been sent confirmation email and is expecting contact within 2 hours
              </p>
            </div>

            <!-- Client Details -->
            <div style="background: #F8F9FA; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 4px solid #9306B1;">
              <h3 style="font-family: 'Century Old Style Std', serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
                Client Information
              </h3>
              <div style="line-height: 1.8; color: #333;">
                <p style="margin: 8px 0;"><strong>Name:</strong> ${name}</p>
                <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #9306B1;">${email}</a></p>
                <p style="margin: 8px 0;"><strong>Phone:</strong> ${phone || "Not provided"}</p>
                <p style="margin: 8px 0;"><strong>Preferred Date:</strong> ${formattedDate}</p>
                <p style="margin: 8px 0;"><strong>Preferred Time:</strong> ${preferredTime}</p>
                <p style="margin: 8px 0;"><strong>Booking ID:</strong> ${bookingId}</p>
                <p style="margin: 8px 0;"><strong>Source:</strong> WordPress Booking Widget</p>
                ${message ? `<p style="margin: 8px 0;"><strong>Client Message:</strong><br><em>"${message}"</em></p>` : ""}
              </div>
            </div>

            <!-- Action Items -->
            <div style="background: #F3E8FF; padding: 25px; border-radius: 10px; margin-bottom: 25px; border-left: 4px solid #9306B1;">
              <h3 style="color: #6B2C91; margin: 0 0 15px 0; font-size: 18px;">
                Required Actions
              </h3>
              <ol style="color: #6B2C91; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;"><strong>Verify calendar availability</strong> for ${formattedDate} at ${preferredTime}</li>
                <li style="margin-bottom: 8px;"><strong>Contact client within 2 hours</strong> to confirm final details</li>
                <li style="margin-bottom: 8px;"><strong>Assign appropriate therapist</strong> based on client needs</li>
                <li style="margin-bottom: 8px;"><strong>Send calendar invite</strong> with video call link</li>
                <li><strong>Update booking status</strong> in admin portal</li>
              </ol>
            </div>

            ${
              googleMeetUrl
                ? `
            <!-- Video Call Section for Admin -->
            <div style="background: #F3E8FF; border: 2px solid #9306B1; border-radius: 15px; padding: 25px; margin: 25px 0; text-align: center;">
              <div style="margin-bottom: 15px;">
                <span style="font-size: 24px;">🎥</span>
                <h3 style="color: #9306B1; margin: 10px 0 5px 0; font-size: 20px; font-weight: 600;">
                  Video Call Ready - Same Room as Client
                </h3>
              </div>
              
              <p style="color: #6B2C91; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                The client has been sent the same Google Meet code. Follow the instructions below to join.
              </p>
              
              <!-- Admin Meeting Instructions -->
              <div style="background: #F8F9FA; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #DEE2E6; text-align: left;">
                <h4 style="color: #495057; margin: 0 0 15px 0; font-size: 16px; text-align: center;">
                  📋 Join the Same Meeting Room
                </h4>
                
                <div style="background: #FFFFFF; padding: 15px; border-radius: 8px; border: 1px solid #E9ECEF; margin-bottom: 15px; text-align: center;">
                  <p style="margin: 0 0 10px 0; color: #495057; font-weight: 600;">Meeting Code (Same as Client):</p>
                  <p style="font-family: 'Courier New', monospace; background: #F8F9FA; padding: 10px; border-radius: 5px; margin: 0; font-size: 18px; font-weight: 600; color: #9306B1; border: 2px solid #9306B1;">
                    ${googleMeetUrl.split("/").pop()}
                  </p>
                </div>
                
                <div style="color: #6C757D; font-size: 14px; line-height: 1.6;">
                  <p style="margin: 0 0 10px 0;"><strong>Step 1:</strong> Go to <a href="https://meet.google.com/landing" style="color: #9306B1; text-decoration: none;">meet.google.com/landing</a></p>
                  <p style="margin: 0 0 10px 0;"><strong>Step 2:</strong> Enter the meeting code above and click "Join"</p>
                  
                  <div style="background: #E3F2FD; border: 1px solid #BBDEFB; border-radius: 6px; padding: 12px; margin-top: 15px;">
                    <p style="margin: 0; color: #1565C0; font-size: 13px;">
                      <strong>✓ Confirmed:</strong> Both you and the client will join the exact same meeting room using this code.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            `
                : `
            <!-- Manual Calendar Instructions (Fallback) -->
            <div style="background: #FFF3CD; border: 2px solid #FFC107; border-radius: 15px; padding: 25px; margin: 25px 0;">
              <div style="margin-bottom: 15px; text-align: center;">
                <span style="font-size: 24px;">📅</span>
                <h3 style="color: #856404; margin: 10px 0 5px 0; font-size: 20px; font-weight: 600;">
                  Manual Calendar Entry Required
                </h3>
              </div>
              
              <p style="color: #856404; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                Please add this appointment to support@hive-wellness.co.uk calendar manually:
              </p>
              
              <div style="background: #FFFFFF; padding: 20px; border-radius: 8px; border: 1px solid #FFC107; margin-bottom: 15px;">
                <div style="color: #856404; font-size: 14px; line-height: 1.6;">
                  <p style="margin: 0 0 8px 0;"><strong>Title:</strong> Introduction Call - ${name}</p>
                  <p style="margin: 0 0 8px 0;"><strong>Date:</strong> ${formattedDate}</p>
                  <p style="margin: 0 0 8px 0;"><strong>Time:</strong> ${preferredTime}</p>
                  <p style="margin: 0 0 8px 0;"><strong>Duration:</strong> 60 minutes</p>
                  <p style="margin: 0 0 8px 0;"><strong>Client Email:</strong> ${email}</p>
                  <p style="margin: 0 0 8px 0;"><strong>Meeting Type:</strong> Google Meet</p>
                  <p style="margin: 0 0 8px 0;"><strong>Notes:</strong> Free initial consultation - ${message || "No additional notes"}</p>
                </div>
              </div>
              
              <div style="background: #E3F2FD; border: 1px solid #BBDEFB; border-radius: 6px; padding: 12px;">
                <p style="margin: 0; color: #1565C0; font-size: 13px;">
                  <strong>📋 Steps:</strong> 1) Add to calendar 2) Create Google Meet 3) Invite ${email} 4) Send meeting details to client
                </p>
              </div>
            </div>
            `
            }

            <!-- Quick Actions -->
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; margin-right: 15px;">
                <a href="mailto:${email}" style="background: #9306B1; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: 600; display: inline-block;">
                  Email Client
                </a>
              </div>
              <div style="display: inline-block;">
                <a href="https://api.hive-wellness.co.uk/admin/calendar" style="background: #9306B1; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: 600; display: inline-block;">
                  Admin Calendar
                </a>
              </div>
            </div>

            <!-- Booking Statistics -->
            <div style="background: #F8F9FA; padding: 20px; border-radius: 10px; text-align: center;">
              <p style="color: #666; margin: 0; font-size: 14px;">
                <strong>Booking Time:</strong> ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })}<br>
                <strong>Response Required By:</strong> ${new Date(Date.now() + 2 * 60 * 60 * 1000).toLocaleString("en-GB", { timeZone: "Europe/London" })}
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #F2F3FB; padding: 20px; text-align: center; color: #666; font-size: 12px; line-height: 1.5;">
            <p style="margin: 0 0 5px 0;">© 2025 Hive Wellness Admin System</p>
            <p style="margin: 0;">This is an automated booking notification - please take immediate action</p>
          </div>
        </div>
      `,
    };

    await this.sendEmailWithGmailFallback({
      to: this.adminRecipients.join(","),
      subject: notificationEmail.subject,
      html: notificationEmail.html,
    });
  }
}

export const bookingEmailService = new BookingEmailService();
