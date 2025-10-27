import { google } from "googleapis";

/**
 * Gmail API Service for sending emails via Google Workspace
 * Uses service account with domain-wide delegation
 */
export class GmailService {
  private static gmail: any = null;

  /**
   * Initialize Gmail API client
   */
  private static async getGmailClient() {
    if (!this.gmail && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      try {
        const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        const auth = new google.auth.GoogleAuth({
          credentials: serviceAccountKey,
          scopes: ["https://www.googleapis.com/auth/gmail.send"],
        });

        const client = await auth.getClient();

        // Create a new JWT client for domain-wide delegation
        const jwtClient = new google.auth.JWT(
          serviceAccountKey.client_email,
          null,
          serviceAccountKey.private_key,
          ["https://www.googleapis.com/auth/gmail.send"],
          "support@hive-wellness.co.uk" // Subject for domain-wide delegation
        );

        this.gmail = google.gmail({ version: "v1", auth: jwtClient });
        console.log("Gmail service initialized with domain-wide delegation");
        return this.gmail;
      } catch (error) {
        console.log(
          "Gmail service initialization failed:",
          error instanceof Error ? error.message : "Unknown error"
        );
        return null;
      }
    }
    return this.gmail;
  }

  /**
   * Send email via Gmail API
   */
  static async sendEmail({
    to,
    subject,
    htmlContent,
    textContent,
  }: {
    to: string[];
    subject: string;
    htmlContent: string;
    textContent?: string;
  }): Promise<boolean> {
    try {
      const gmail = await this.getGmailClient();
      if (!gmail) {
        throw new Error("Gmail service not available");
      }

      // Create email message
      const message = [
        `From: Hive Wellness <support@hive-wellness.co.uk>`,
        `To: ${to.join(", ")}`,
        `Subject: ${subject}`,
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=utf-8",
        "",
        htmlContent,
      ].join("\n");

      // Encode message
      const encodedMessage = Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      // Send email
      const response = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedMessage,
        },
      });

      console.log("Email sent successfully via Gmail API:", response.data.id);
      return true;
    } catch (error) {
      console.error("Gmail send error:", error instanceof Error ? error.message : "Unknown error");
      return false;
    }
  }

  /**
   * Send test emails to all account types
   */
  static async sendTestEmails(): Promise<void> {
    const testEmails = [
      // Admin Test Email
      {
        to: ["admin@demo.hive"],
        subject: "🔔 New Booking: Sarah Johnson - Monday, 26 August 2025 at 10:30",
        htmlContent: `
          <div style="font-family: 'Open Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
            <div style="background: #9306B1; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-family: 'Century Old Style Std', serif;">New Booking Notification</h1>
              <p style="margin: 10px 0 0;">Hive Wellness Admin Portal</p>
            </div>
            
            <div style="background: white; padding: 30px; margin: 20px 0;">
              <h2 style="color: #9306B1; font-family: 'Century Old Style Std', serif;">Booking Details</h2>
              <div style="background: #f1f8ff; padding: 15px; border-left: 4px solid #9306B1; margin: 20px 0;">
                <p><strong>Client:</strong> Sarah Johnson</p>
                <p><strong>Email:</strong> sarah.johnson@example.com</p>
                <p><strong>Phone:</strong> +44 7700 900123</p>
                <p><strong>Date & Time:</strong> Monday, 26 August 2025 at 10:30 AM</p>
                <p><strong>Duration:</strong> 60 minutes</p>
                <p><strong>Session Type:</strong> Introduction Call</p>
                <p><strong>Meeting URL:</strong> <a href="https://meet.google.com/hfw-odrg-wsx" style="color: #9306B1;">https://meet.google.com/hfw-odrg-wsx</a></p>
              </div>
              
              <div style="background: #fef7ff; padding: 15px; border-left: 4px solid #9306B1; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #9306B1;">✓ Calendar Integration Status</h3>
                <p><strong>Calendar Event Created:</strong> Yes</p>
                <p><strong>Event ID:</strong> 58d4o2b0h1hvb070iu5spmkmds</p>
                <p><strong>Google Meet Room:</strong> Generated automatically</p>
                <p><strong>Added to:</strong> support@hive-wellness.co.uk calendar</p>
              </div>

              <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #856404;">Manual Calendar Entry Instructions (Fallback)</h3>
                <p>If needed, manually add to support@hive-wellness.co.uk:</p>
                <p><strong>Title:</strong> Introduction Call - Sarah Johnson</p>
                <p><strong>Time:</strong> Mon 26 Aug 2025, 10:30 - 11:30 AM</p>
                <p><strong>Attendees:</strong> sarah.johnson@example.com</p>
                <p><strong>Meeting:</strong> meet.google.com/hfw-odrg-wsx</p>
              </div>
              
              <p style="color: #666; font-size: 14px;">This booking was processed automatically via the Hive Wellness platform.</p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
              <p>© 2025 Hive Wellness. All rights reserved.</p>
            </div>
          </div>
        `,
      },

      // Client Test Email
      {
        to: ["sarah.johnson@example.com"],
        subject: "✅ Your Hive Wellness Session is Confirmed - Monday, 26 August at 10:30 AM",
        htmlContent: `
          <div style="font-family: 'Open Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
            <div style="background: #9306B1; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-family: 'Century Old Style Std', serif;">Session Confirmed</h1>
              <p style="margin: 10px 0 0;">Your Hive Wellness Appointment</p>
            </div>
            
            <div style="background: white; padding: 30px; margin: 20px 0;">
              <p>Dear Sarah,</p>
              <p>Your therapy session has been successfully booked and confirmed. We're looking forward to supporting you on your wellness journey.</p>
              
              <div style="background: #9306B1; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 3px solid #7A05A3;">
                <h2 style="margin: 0 0 10px; font-family: 'Century Old Style Std', serif;">🎥 Join Your Video Session</h2>
                <p style="margin: 0 0 15px; font-size: 16px;"><strong>Monday, 26 August 2025 at 10:30 AM</strong></p>
                <a href="https://meet.google.com/hfw-odrg-wsx" style="background: white; color: #9306B1; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">Join Meeting Now</a>
                <p style="margin: 15px 0 0; font-size: 14px;">Meeting ID: hfw-odrg-wsx</p>
              </div>
              
              <div style="background: #f1f8ff; padding: 15px; border-left: 4px solid #9306B1; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #9306B1;">Session Details</h3>
                <p><strong>Session Type:</strong> Introduction Call</p>
                <p><strong>Duration:</strong> 60 minutes</p>
                <p><strong>Your Notes:</strong> Initial consultation for anxiety therapy. Client prefers morning appointments.</p>
              </div>

              <div style="background: #fef7ff; padding: 15px; border-left: 4px solid #9306B1; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #9306B1;">Getting Ready for Your Session</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>Test your camera and microphone beforehand</li>
                  <li>Find a quiet, private space</li>
                  <li>Have a glass of water nearby</li>
                  <li>Join the meeting 2-3 minutes early</li>
                </ul>
              </div>
              
              <p>If you have any questions or need to reschedule, please contact us at support@hive-wellness.co.uk</p>
              <p>Best regards,<br>The Hive Wellness Team</p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
              <p>© 2025 Hive Wellness. All rights reserved.</p>
            </div>
          </div>
        `,
      },

      // Therapist Test Email
      {
        to: ["therapist@demo.hive"],
        subject: "📅 New Client Session: Michael Thompson - Tuesday, 27 August at 3:00 PM",
        htmlContent: `
          <div style="font-family: 'Open Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
            <div style="background: #9306B1; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-family: 'Century Old Style Std', serif;">New Client Session</h1>
              <p style="margin: 10px 0 0;">Hive Wellness Therapist Portal</p>
            </div>
            
            <div style="background: white; padding: 30px; margin: 20px 0;">
              <p>Dear Therapist,</p>
              <p>A new therapy session has been scheduled and added to your calendar. Please review the client information below.</p>
              
              <div style="background: #007bff; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 3px solid #0056b3;">
                <h2 style="margin: 0 0 10px; font-family: 'Century Old Style Std', serif;">🎥 Session Meeting Room</h2>
                <p style="margin: 0 0 15px; font-size: 16px;"><strong>Tuesday, 27 August 2025 at 3:00 PM</strong></p>
                <a href="https://meet.google.com/fpc-zufn-ptb" style="background: white; color: #007bff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">Join Meeting Room</a>
                <p style="margin: 15px 0 0; font-size: 14px;">Meeting ID: fpc-zufn-ptb</p>
              </div>
              
              <div style="background: #f1f8ff; padding: 15px; border-left: 4px solid #9306B1; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #9306B1;">Client Information</h3>
                <p><strong>Name:</strong> Michael Thompson</p>
                <p><strong>Email:</strong> michael.thompson@example.com</p>
                <p><strong>Phone:</strong> +44 7700 900456</p>
                <p><strong>Session Type:</strong> Therapy Session</p>
                <p><strong>Duration:</strong> 90 minutes</p>
                <p><strong>Notes:</strong> Follow-up session for CBT treatment. Client has shown good progress.</p>
              </div>

              <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #856404;">Session Preparation</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>Review previous session notes if applicable</li>
                  <li>Prepare session materials and worksheets</li>
                  <li>Test audio/video setup 10 minutes before</li>
                  <li>Ensure private, professional environment</li>
                </ul>
              </div>
              
              <p>This session has been automatically added to the support@hive-wellness.co.uk calendar for coordination.</p>
              <p>Best regards,<br>The Hive Wellness Platform</p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
              <p>© 2025 Hive Wellness. All rights reserved.</p>
            </div>
          </div>
        `,
      },

      // Institution Test Email
      {
        to: ["institution@demo.hive"],
        subject: "📊 Hive Wellness Activity Summary - 2 New Sessions Booked",
        htmlContent: `
          <div style="font-family: 'Open Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
            <div style="background: #9306B1; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-family: 'Century Old Style Std', serif;">Activity Summary</h1>
              <p style="margin: 10px 0 0;">Hive Wellness Institutional Portal</p>
            </div>
            
            <div style="background: white; padding: 30px; margin: 20px 0;">
              <h2 style="color: #9306B1; font-family: 'Century Old Style Std', serif;">Recent Platform Activity</h2>
              <p>This summary shows recent bookings and activity on your Hive Wellness institutional account.</p>
              
              <div style="background: #fef7ff; padding: 15px; border-left: 4px solid #9306B1; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #9306B1;">✓ New Bookings (Today)</h3>
                <div style="margin: 15px 0;">
                  <p><strong>1. Sarah Johnson</strong> - Introduction Call</p>
                  <p style="color: #666; font-size: 14px;">Monday, 26 Aug 2025 at 10:30 AM • 60 minutes</p>
                  <p style="color: #666; font-size: 14px;">Meeting: meet.google.com/hfw-odrg-wsx</p>
                </div>
                <div style="margin: 15px 0;">
                  <p><strong>2. Michael Thompson</strong> - Therapy Session</p>
                  <p style="color: #666; font-size: 14px;">Tuesday, 27 Aug 2025 at 3:00 PM • 90 minutes</p>
                  <p style="color: #666; font-size: 14px;">Meeting: meet.google.com/fpc-zufn-ptb</p>
                </div>
              </div>

              <div style="background: #f1f8ff; padding: 15px; border-left: 4px solid #9306B1; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #9306B1;">Platform Statistics</h3>
                <div style="display: flex; justify-content: space-between;">
                  <div style="text-align: center;">
                    <p style="font-size: 24px; font-weight: bold; margin: 0; color: #9306B1;">33</p>
                    <p style="margin: 0; color: #666;">Total Users</p>
                  </div>
                  <div style="text-align: center;">
                    <p style="font-size: 24px; font-weight: bold; margin: 0; color: #9306B1;">26</p>
                    <p style="margin: 0; color: #666;">Total Sessions</p>
                  </div>
                  <div style="text-align: center;">
                    <p style="font-size: 24px; font-weight: bold; margin: 0; color: #007bff;">12</p>
                    <p style="margin: 0; color: #666;">Scheduled</p>
                  </div>
                </div>
              </div>

              <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #856404;">Google Integration Status</h3>
                <p>✅ Calendar synchronization active</p>
                <p>✅ Automatic meeting room creation</p>
                <p>✅ Email notifications working</p>
                <p>✅ Double booking prevention enabled</p>
              </div>
              
              <p>For detailed analytics and management, please log in to your institutional dashboard.</p>
              <p>Best regards,<br>The Hive Wellness Team</p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
              <p>© 2025 Hive Wellness. All rights reserved.</p>
            </div>
          </div>
        `,
      },
    ];

    console.log("Sending test emails to all account types...");
    for (const email of testEmails) {
      const success = await this.sendEmail(email);
      console.log(`Test email sent to ${email.to[0]}: ${success ? "SUCCESS" : "FAILED"}`);
    }
  }
}
