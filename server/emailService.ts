import { MailService } from "@sendgrid/mail";

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface FormSubmissionNotificationParams {
  submissionId: string;
  formId: string;
  submissionData: any;
  userEmail: string;
  submittedAt: Date;
}

export async function sendTestEmailToAllAdmins(
  subject: string,
  htmlContent: string
): Promise<boolean> {
  const adminEmails = ["support@hive-wellness.co.uk", "support@hivewellness.nl"];

  try {
    for (const adminEmail of adminEmails) {
      await mailService.send({
        to: adminEmail,
        from: "support@hive-wellness.co.uk",
        subject: `[ADMIN TEST] ${subject}`,
        html: htmlContent,
      });
      console.log(`Test email sent successfully to ${adminEmail}`);
    }
    return true;
  } catch (error) {
    console.error("Failed to send test emails to admin addresses:", error);
    return false;
  }
}

// Send welcome email to new clients with admin copy
export async function sendClientWelcomeEmail(
  clientEmail: string,
  clientName: string
): Promise<boolean> {
  try {
    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap');
              body { 
                  font-family: 'Open Sans', Arial, sans-serif; 
                  line-height: 1.6; 
                  color: #333; 
                  margin: 0; 
                  padding: 0; 
                  background-color: #f8f9fa;
              }
              .email-container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  background: white; 
                  border-radius: 12px; 
                  overflow: hidden; 
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              }
              .header { 
                  background: linear-gradient(135deg, #9306B1 0%, #7A1B8B 100%); 
                  color: white; 
                  padding: 40px 20px; 
                  text-align: center; 
              }
              .logo { 
                  font-size: 32px; 
                  font-weight: 700; 
                  margin-bottom: 12px; 
                  letter-spacing: 3px;
              }
              .tagline { 
                  font-size: 14px; 
                  opacity: 0.9; 
                  font-weight: 300;
              }
              .content { 
                  padding: 40px 30px; 
              }
              .welcome-message { 
                  background: linear-gradient(135deg, #f8f4ff 0%, #fff 100%); 
                  padding: 30px; 
                  border-radius: 15px; 
                  margin: 25px 0; 
                  border: 2px solid #9306B1;
              }
              .cta-button {
                  display: inline-block;
                  background: linear-gradient(135deg, #9306B1, #7A1B8B);
                  color: white;
                  padding: 15px 30px;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: 600;
                  margin: 20px 0;
              }
              .footer { 
                  background: #f8f9fa; 
                  padding: 20px; 
                  text-align: center; 
                  font-size: 12px; 
                  color: #666;
                  border-top: 1px solid #e9ecef;
              }
          </style>
      </head>
      <body>
          <div class="email-container">
              <div class="header">
                  <div class="logo">HIVE WELLNESS</div>
                  <div class="tagline">Professional Therapy Services</div>
              </div>
              <div class="content">
                  <h2 style="color: #9306B1;">Welcome ${clientName}!</h2>
                  <div class="welcome-message">
                      <p>Thank you for joining Hive Wellness. We're delighted to support you on your mental wellness journey.</p>
                      <p><strong>What happens next:</strong></p>
                      <ul>
                          <li>Complete your profile to help us match you with the right therapist</li>
                          <li>Browse our therapeutic services and specialisations</li>
                          <li>Book your first consultation when you're ready</li>
                      </ul>
                      <p>Our team of qualified therapists is here to provide professional support tailored to your needs.</p>
                  </div>
                  <div style="text-align: center;">
                      <a href="https://hive-wellness-platform.replit.app/portal" class="cta-button">Access Your Portal</a>
                  </div>
              </div>
              <div class="footer">
                  <p>© 2025 Hive Wellness. All rights reserved.</p>
                  <p>Professional therapy services connecting you to qualified mental health professionals.</p>
                  <p>support@hive-wellness.co.uk | support@hivewellness.nl</p>
              </div>
          </div>
      </body>
      </html>
    `;

    // Send to client
    await mailService.send({
      to: clientEmail,
      from: "support@hive-wellness.co.uk",
      subject: "Welcome to Hive Wellness - Your Journey Begins Here",
      html: emailContent,
    });

    // Send copy to Holly
    await mailService.send({
      to: "support@hive-wellness.co.uk",

      from: "support@hive-wellness.co.uk",
      subject: `[COPY] Client Welcome Email Sent to ${clientName} (${clientEmail})`,
      html: emailContent,
    });

    console.log(`Welcome email sent to client ${clientEmail} with copy to Holly`);
    return true;
  } catch (error) {
    console.error("❌ Error sending client welcome email:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      clientEmail,
      clientName,
    });
    return false;
  }
}

// Send welcome email to new therapists with admin copy
export async function sendTherapistWelcomeEmail(
  therapistEmail: string,
  therapistName: string
): Promise<boolean> {
  try {
    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap');
              body { 
                  font-family: 'Open Sans', Arial, sans-serif; 
                  line-height: 1.6; 
                  color: #333; 
                  margin: 0; 
                  padding: 0; 
                  background-color: #f8f9fa;
              }
              .email-container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  background: white; 
                  border-radius: 12px; 
                  overflow: hidden; 
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              }
              .header { 
                  background: linear-gradient(135deg, #9306B1 0%, #7A1B8B 100%); 
                  color: white; 
                  padding: 40px 20px; 
                  text-align: center; 
              }
              .logo { 
                  font-size: 32px; 
                  font-weight: 700; 
                  margin-bottom: 12px; 
                  letter-spacing: 3px;
              }
              .content { 
                  padding: 40px 30px; 
              }
              .welcome-message { 
                  background: linear-gradient(135deg, #f8f4ff 0%, #fff 100%); 
                  padding: 30px; 
                  border-radius: 15px; 
                  margin: 25px 0; 
                  border: 2px solid #9306B1;
              }
              .highlight-box {
                  background: #e8f5e8;
                  border: 2px solid #28a745;
                  padding: 20px;
                  border-radius: 8px;
                  margin: 20px 0;
                  text-align: center;
              }
              .cta-button {
                  display: inline-block;
                  background: linear-gradient(135deg, #9306B1, #7A1B8B);
                  color: white;
                  padding: 15px 30px;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: 600;
                  margin: 20px 0;
              }
              .footer { 
                  background: #f8f9fa; 
                  padding: 20px; 
                  text-align: center; 
                  font-size: 12px; 
                  color: #666;
              }
          </style>
      </head>
      <body>
          <div class="email-container">
              <div class="header">
                  <div class="logo">HIVE WELLNESS</div>
                  <div style="font-size: 14px; opacity: 0.9; font-weight: 300;">Professional Therapy Platform</div>
              </div>
              <div class="content">
                  <h2 style="color: #9306B1;">Welcome ${therapistName}!</h2>
                  <div class="welcome-message">
                      <p>We're excited to have you join the Hive Wellness therapist community. You're now part of a platform dedicated to connecting qualified professionals with clients who need support.</p>
                      
                      <div class="highlight-box">
                          <h3 style="color: #28a745; margin: 0 0 10px 0;">🎯 You receive 85% of every session fee!</h3>
                          <p style="margin: 0; font-weight: bold;">Hive Wellness covers ALL Stripe processing fees</p>
                          <p style="margin: 5px 0 0 0; color: #666;">Example: £80 session = £68.00 direct to you</p>
                      </div>
                      
                      <p><strong>Getting started:</strong></p>
                      <ul>
                          <li>Complete your professional profile</li>
                          <li>Set your availability and session rates</li>
                          <li>Review client matching preferences</li>
                          <li>Set up your payment details for instant payouts</li>
                      </ul>
                  </div>
                  <div style="text-align: center;">
                      <a href="https://hive-wellness-platform.replit.app/portal" class="cta-button">Access Therapist Portal</a>
                  </div>
              </div>
              <div class="footer">
                  <p>© 2025 Hive Wellness. All rights reserved.</p>
                  <p>Professional therapy platform connecting qualified therapists with clients.</p>
                  <p>support@hive-wellness.co.uk | support@hivewellness.nl</p>
              </div>
          </div>
      </body>
      </html>
    `;

    // Send to therapist
    await mailService.send({
      to: therapistEmail,
      from: "support@hive-wellness.co.uk",
      subject: "Welcome to Hive Wellness - Start Connecting with Clients",
      html: emailContent,
    });

    // Send copy to Holly
    await mailService.send({
      to: "support@hive-wellness.co.uk",

      from: "support@hive-wellness.co.uk",
      subject: `[COPY] Therapist Welcome Email Sent to ${therapistName} (${therapistEmail})`,
      html: emailContent,
    });

    console.log(`Welcome email sent to therapist ${therapistEmail} with copy to Holly`);
    return true;
  } catch (error) {
    console.error("Error sending therapist welcome email:", error);
    return false;
  }
}

// Send session booking confirmation with admin copy
export async function sendSessionBookingConfirmation(
  clientEmail: string,
  therapistEmail: string,
  sessionDetails: {
    clientName: string;
    therapistName: string;
    sessionDate: string;
    sessionTime: string;
    sessionType: string;
    sessionFee: string;
    sessionUrl?: string;
  }
): Promise<boolean> {
  try {
    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap');
              body { 
                  font-family: 'Open Sans', Arial, sans-serif; 
                  line-height: 1.6; 
                  color: #333; 
                  margin: 0; 
                  padding: 0; 
                  background-color: #f8f9fa;
              }
              .email-container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  background: white; 
                  border-radius: 12px; 
                  overflow: hidden; 
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              }
              .header { 
                  background: linear-gradient(135deg, #9306B1 0%, #7A1B8B 100%); 
                  color: white; 
                  padding: 40px 20px; 
                  text-align: center; 
              }
              .content { 
                  padding: 40px 30px; 
              }
              .booking-details { 
                  background: linear-gradient(135deg, #f8f4ff 0%, #fff 100%); 
                  padding: 30px; 
                  border-radius: 15px; 
                  margin: 25px 0; 
                  border: 2px solid #9306B1;
              }
              .detail-row {
                  display: flex;
                  justify-content: space-between;
                  padding: 10px 0;
                  border-bottom: 1px solid #eee;
              }
              .detail-row:last-child {
                  border-bottom: none;
              }
              .cta-button {
                  display: inline-block;
                  background: linear-gradient(135deg, #9306B1, #7A1B8B);
                  color: white;
                  padding: 15px 30px;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: 600;
                  margin: 20px 0;
              }
              .footer { 
                  background: #f8f9fa; 
                  padding: 20px; 
                  text-align: center; 
                  font-size: 12px; 
                  color: #666;
              }
          </style>
      </head>
      <body>
          <div class="email-container">
              <div class="header">
                  <div style="font-size: 32px; font-weight: 700; letter-spacing: 3px;">HIVE WELLNESS</div>
                  <div style="font-size: 18px; margin-top: 10px;">Session Booking Confirmed</div>
              </div>
              <div class="content">
                  <h2 style="color: #9306B1;">Your therapy session is confirmed</h2>
                  <div class="booking-details">
                      <div class="detail-row">
                          <strong>Client:</strong>
                          <span>${sessionDetails.clientName}</span>
                      </div>
                      <div class="detail-row">
                          <strong>Therapist:</strong>
                          <span>${sessionDetails.therapistName}</span>
                      </div>
                      <div class="detail-row">
                          <strong>Date:</strong>
                          <span>${sessionDetails.sessionDate}</span>
                      </div>
                      <div class="detail-row">
                          <strong>Time:</strong>
                          <span>${sessionDetails.sessionTime}</span>
                      </div>
                      <div class="detail-row">
                          <strong>Session Type:</strong>
                          <span>${sessionDetails.sessionType}</span>
                      </div>
                      <div class="detail-row">
                          <strong>Session Fee:</strong>
                          <span>${sessionDetails.sessionFee}</span>
                      </div>
                  </div>
                  
                  <p><strong>Important reminders:</strong></p>
                  <ul>
                      <li>Please join the session 5 minutes early</li>
                      <li>Ensure you have a stable internet connection</li>
                      <li>Find a quiet, private space for your session</li>
                      <li>Have any relevant notes or questions ready</li>
                  </ul>
                  
                  ${
                    sessionDetails.sessionUrl
                      ? `
                  <div style="text-align: center;">
                      <a href="${sessionDetails.sessionUrl}" class="cta-button">Join Video Session</a>
                  </div>
                  `
                      : ""
                  }
              </div>
              <div class="footer">
                  <p>© 2025 Hive Wellness. All rights reserved.</p>
                  <p>If you need to reschedule, please contact us at least 24 hours in advance.</p>
                  <p>support@hive-wellness.co.uk | support@hivewellness.nl</p>
              </div>
          </div>
      </body>
      </html>
    `;

    // Send to client
    await mailService.send({
      to: clientEmail,
      from: "support@hive-wellness.co.uk",
      subject: "Session Booking Confirmed - Hive Wellness",
      html: emailContent,
    });

    // Send to therapist
    await mailService.send({
      to: therapistEmail,
      from: "support@hive-wellness.co.uk",
      subject: "Session Booking Confirmed - Hive Wellness",
      html: emailContent,
    });

    // Send copy to Holly
    await mailService.send({
      to: "support@hive-wellness.co.uk",

      from: "support@hive-wellness.co.uk",
      subject: `[COPY] Session Booking Confirmation - ${sessionDetails.clientName} & ${sessionDetails.therapistName}`,
      html: emailContent,
    });

    console.log(
      `Session booking confirmation sent to ${clientEmail}, ${therapistEmail} with copy to Holly`
    );
    return true;
  } catch (error) {
    console.error("Error sending session booking confirmation:", error);
    return false;
  }
}

export async function sendTestEmail(
  to: string,
  subject: string,
  message: string,
  fromDomain: string = "hive-wellness.co.uk"
): Promise<boolean> {
  try {
    const fromEmail =
      fromDomain === "hivewellness.nl" ? "support@hivewellness.nl" : "support@hive-wellness.co.uk";

    await mailService.send({
      to,
      from: fromEmail,
      subject,
      text: message,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap');
                body { 
                    font-family: 'Open Sans', Arial, sans-serif; 
                    line-height: 1.6; 
                    color: #333; 
                    margin: 0; 
                    padding: 0; 
                    background-color: #f8f9fa;
                }
                .email-container { 
                    max-width: 600px; 
                    margin: 0 auto; 
                    background: white; 
                    border-radius: 12px; 
                    overflow: hidden; 
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .header { 
                    background: linear-gradient(135deg, #9306B1 0%, #7A1B8B 100%); 
                    color: white; 
                    padding: 40px 20px; 
                    text-align: center; 
                    position: relative;
                }
                .header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="40" r="1.5" fill="rgba(255,255,255,0.1)"/><circle cx="40" cy="80" r="1" fill="rgba(255,255,255,0.1)"/></svg>');
                }
                .logo { 
                    font-size: 32px; 
                    font-weight: 700; 
                    margin-bottom: 12px; 
                    position: relative; 
                    z-index: 1;
                    letter-spacing: 3px;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                }
                .tagline { 
                    font-size: 14px; 
                    opacity: 0.9; 
                    position: relative; 
                    z-index: 1;
                    font-weight: 300;
                }
                .content { 
                    padding: 40px 30px; 
                }
                .message { 
                    background: linear-gradient(135deg, #f8f4ff 0%, #fff 100%); 
                    padding: 30px; 
                    border-radius: 15px; 
                    margin: 25px 0; 
                    border: 2px solid #9306B1;
                    box-shadow: 0 4px 15px rgba(147, 6, 177, 0.15);
                }
                .status-badge {
                    display: inline-block;
                    background: linear-gradient(135deg, #9306B1, #7A1B8B);
                    color: white;
                    padding: 8px 16px;
                    border-radius: 25px;
                    font-size: 13px;
                    font-weight: 600;
                    margin: 15px 0;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .cta-button {
                    display: inline-block;
                    background: linear-gradient(135deg, #9306B1, #7A1B8B);
                    color: white;
                    padding: 15px 30px;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    margin: 20px 0;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(147, 6, 177, 0.3);
                }
                .cta-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(147, 6, 177, 0.4);
                }
                .footer { 
                    background: #f8f9fa; 
                    padding: 20px; 
                    text-align: center; 
                    font-size: 12px; 
                    color: #666;
                    border-top: 1px solid #e9ecef;
                }
                .footer a { 
                    color: #9306B1; 
                    text-decoration: none; 
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <div class="logo">HIVE WELLNESS</div>
                    <div class="tagline">Connecting You to Better Mental Health</div>
                </div>
                <div class="content">
                    <div class="message">
                        <p style="margin-top: 0;">${message}</p>
                        <div class="status-badge">✓ System Operational</div>
                        <p style="margin-bottom: 0;"><strong>Sent:</strong> ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })}</p>
                    </div>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} Hive Wellness. All rights reserved.</p>
                    <p>Professional therapy services connecting you to qualified mental health professionals.</p>
                    <p><a href="mailto:support@hive-wellness.co.uk">support@hive-wellness.co.uk</a> | <a href="mailto:support@hivewellness.nl">support@hivewellness.nl</a></p>
                </div>
            </div>
        </body>
        </html>
      `,
    });
    return true;
  } catch (error) {
    console.error("Test email error:", error);
    return false;
  }
}

export async function sendFormSubmissionNotification(
  params: FormSubmissionNotificationParams
): Promise<boolean> {
  try {
    const { submissionId, formId, submissionData, userEmail, submittedAt } = params;

    // Send to all admin email addresses to ensure notifications are received
    const adminEmails = ["support@hive-wellness.co.uk", "support@hivewellness.nl"];

    // Format the submission data for email
    const formatSubmissionData = (data: any): string => {
      let formatted = "";
      for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined && value !== "") {
          const formattedKey = key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase());

          if (Array.isArray(value)) {
            formatted += `${formattedKey}: ${value.join(", ")}\n`;
          } else {
            formatted += `${formattedKey}: ${value}\n`;
          }
        }
      }
      return formatted;
    };

    const formattedData = formatSubmissionData(submissionData);

    // Create email content with Hive Wellness branding
    const emailContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Open Sans', Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: linear-gradient(135deg, #9306B1 0%, #7A1B8B 100%); color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .submission-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { background: #333; color: white; padding: 15px; text-align: center; font-size: 12px; }
        .badge { background: #9306B1; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 HIVE WELLNESS</h1>
        <h2>New Form Submission Received</h2>
    </div>
    
    <div class="content">
        <div class="submission-details">
            <h3>📝 Submission Details</h3>
            <p><strong>Submission ID:</strong> <span class="badge">${submissionId}</span></p>
            <p><strong>Form Type:</strong> ${formId}</p>
            <p><strong>User Email:</strong> ${userEmail}</p>
            <p><strong>Submitted At:</strong> ${submittedAt.toLocaleString("en-GB", {
              timeZone: "Europe/London",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}</p>
            
            <h4>📋 Form Data:</h4>
            <pre style="background: #f5f5f5; padding: 15px; border-radius: 4px; white-space: pre-wrap;">${formattedData}</pre>
        </div>
        
        <div style="text-align: center; margin: 20px 0;">
            <p><strong>Action Required:</strong> Please review this submission in the admin dashboard.</p>
            <a href="https://api.hive-wellness.co.uk/admin-dashboard" 
               style="background: #9306B1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
               View in Admin Dashboard →
            </a>
        </div>
    </div>
    
    <div class="footer">
        <p>This is an automated notification from Hive Wellness Portal</p>
        <p>© 2025 Hive Wellness. All rights reserved.</p>
    </div>
</body>
</html>`;

    const textContent = `
🎯 HIVE WELLNESS - New Form Submission

Submission Details:
- Submission ID: ${submissionId}
- Form Type: ${formId}
- User Email: ${userEmail}
- Submitted At: ${submittedAt.toLocaleString("en-GB", { timeZone: "Europe/London" })}

Form Data:
${formattedData}

Please review this submission in the admin dashboard: https://api.hive-wellness.co.uk/admin-dashboard

This is an automated notification from Hive Wellness Portal.
`;

    // Send to both admin email addresses for redundancy
    for (const adminEmail of adminEmails) {
      await mailService.send({
        to: adminEmail,
        from: "support@hivewellness.nl",
        subject: `🎯 New Form Submission: ${formId} - ${userEmail}`,
        text: textContent,
        html: emailContent,
      });
    }

    console.log(`✅ Form submission notification sent to both admin emails for ${submissionId}`);
    return true;
  } catch (error) {
    console.error("SendGrid email error:", error);
    return false;
  }
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text || "",
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error("SendGrid email error:", error);
    return false;
  }
}

interface SessionBookingNotificationParams {
  sessionId: string;
  clientEmail: string;
  clientName: string;
  therapistName: string;
  sessionType: string;
  scheduledAt: Date;
  duration: number;
  price?: number;
  sessionNotes?: string;
}

export async function sendSessionBookingNotification(
  params: SessionBookingNotificationParams
): Promise<boolean> {
  try {
    const {
      sessionId,
      clientEmail,
      clientName,
      therapistName,
      sessionType,
      scheduledAt,
      duration,
      price,
      sessionNotes,
    } = params;

    // Send to all admin email addresses to ensure notifications are received
    const adminEmails = ["support@hive-wellness.co.uk", "support@hivewellness.nl"];

    // Create email content for session booking notification
    const emailContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Open Sans', Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: linear-gradient(135deg, #9306B1 0%, #7A1B8B 100%); color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .session-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { background: #333; color: white; padding: 15px; text-align: center; font-size: 12px; }
        .badge { background: #9306B1; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .amount { background: #e8f5e8; color: #2d5a3d; padding: 8px 12px; border-radius: 6px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 HIVE WELLNESS</h1>
        <h2>New Session Booking Confirmed</h2>
    </div>
    
    <div class="content">
        <div class="session-details">
            <h3>📅 Session Booking Details</h3>
            <p><strong>Session ID:</strong> <span class="badge">${sessionId}</span></p>
            <p><strong>Client:</strong> ${clientName} (${clientEmail})</p>
            <p><strong>Therapist:</strong> ${therapistName}</p>
            <p><strong>Session Type:</strong> ${sessionType}</p>
            <p><strong>Scheduled:</strong> ${scheduledAt.toLocaleString("en-GB", {
              timeZone: "Europe/London",
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}</p>
            <p><strong>Duration:</strong> ${duration} minutes</p>
            ${price ? `<p><strong>Session Fee:</strong> <span class="amount">£${(price / 100).toFixed(2)}</span></p>` : ""}
            ${price ? `<p><strong>Therapist Earnings:</strong> <span class="amount">£${((price * 0.85) / 100).toFixed(2)} (85% split)</span></p>` : ""}
            ${sessionNotes ? `<p><strong>Notes:</strong> ${sessionNotes}</p>` : ""}
        </div>
        
        <div class="session-details">
            <h3>🎯 Action Required</h3>
            <p>A new therapy session has been booked on the platform. Please ensure:</p>
            <ul>
                <li>Both client and therapist have received their booking confirmations</li>
                <li>Video session room is properly configured</li>
                <li>Session payment is processed correctly (85% to therapist, 15% platform fee)</li>
                <li>Therapist payout will be processed within 2-3 business days</li>
                <li>Any special requirements are noted and addressed</li>
            </ul>
        </div>
    </div>
    
    <div class="footer">
        <p>This is an automated notification from Hive Wellness Portal</p>
        <p>Professional therapy platform • Connecting communities with qualified therapists</p>
    </div>
</body>
</html>`;

    // Send email to both admin addresses for redundancy
    for (const adminEmail of adminEmails) {
      await mailService.send({
        to: adminEmail,
        from: "support@hivewellness.nl",
        subject: `🎯 New Session Booking: ${clientName} with ${therapistName}`,
        html: emailContent,
        text: `New session booking confirmed:
        
Session ID: ${sessionId}
Client: ${clientName} (${clientEmail})
Therapist: ${therapistName}
Session Type: ${sessionType}
Scheduled: ${scheduledAt.toLocaleString("en-GB")}
Duration: ${duration} minutes
${price ? `Session Fee: £${(price / 100).toFixed(2)}` : ""}
${sessionNotes ? `Notes: ${sessionNotes}` : ""}

This booking requires verification and support oversight.`,
      });
    }

    console.log(
      `✅ Session booking notification sent to both admin emails for session ${sessionId}`
    );
    return true;
  } catch (error) {
    console.error("SendGrid session booking notification error:", error);
    return false;
  }
}

// Send password reset email
export async function sendPasswordResetEmail(params: {
  to: string;
  firstName: string;
  resetToken: string;
  userId: string;
}): Promise<boolean> {
  try {
    // Use production URL to avoid security software blocking development domains
    const baseUrl = process.env.PRODUCTION_URL || "https://api.hive-wellness.co.uk";
    const resetUrl = `${baseUrl}/reset-password?token=${params.resetToken}&uid=${params.userId}`;

    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap');
              body { 
                  font-family: 'Open Sans', Arial, sans-serif; 
                  line-height: 1.6; 
                  color: #333; 
                  margin: 0; 
                  padding: 0; 
                  background-color: #f8f9fa;
              }
              .email-container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  background: white; 
                  border-radius: 12px; 
                  overflow: hidden; 
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              }
              .header { 
                  background: linear-gradient(135deg, #9306B1 0%, #7A1B8B 100%); 
                  color: white; 
                  padding: 40px 20px; 
                  text-align: center; 
              }
              .logo { 
                  font-size: 32px; 
                  font-weight: 700; 
                  margin-bottom: 12px; 
                  letter-spacing: 3px;
              }
              .tagline { 
                  font-size: 14px; 
                  opacity: 0.9; 
                  font-weight: 300;
              }
              .content { 
                  padding: 40px 30px; 
              }
              .reset-section { 
                  background: linear-gradient(135deg, #f8f4ff 0%, #fff 100%); 
                  padding: 30px; 
                  border-radius: 12px; 
                  border: 2px solid #e8d8ff; 
                  margin: 25px 0; 
                  text-align: center;
              }
              .reset-button {
                  display: inline-block;
                  background: linear-gradient(135deg, #9306B1 0%, #7A1B8B 100%);
                  color: white;
                  padding: 16px 32px;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: 600;
                  font-size: 16px;
                  margin: 20px 0;
                  transition: transform 0.2s ease;
              }
              .reset-button:hover {
                  transform: translateY(-2px);
              }
              .security-notice {
                  background: #fff3cd;
                  border: 1px solid #ffeaa7;
                  border-radius: 8px;
                  padding: 20px;
                  margin: 25px 0;
              }
              .footer { 
                  background: #f8f9fa; 
                  padding: 30px; 
                  text-align: center; 
                  color: #666; 
                  font-size: 14px;
              }
              .social-links { 
                  margin: 20px 0; 
              }
              .social-links a { 
                  color: #9306B1; 
                  text-decoration: none; 
                  margin: 0 10px; 
                  font-weight: 500;
              }
          </style>
      </head>
      <body>
          <div class="email-container">
              <div class="header">
                  <div class="logo">HIVE WELLNESS</div>
                  <div class="tagline">Professional Therapy Platform</div>
              </div>
              
              <div class="content">
                  <h2 style="color: #9306B1; font-size: 28px; margin-bottom: 20px; font-weight: 600;">
                      Password Reset Request
                  </h2>
                  
                  <p style="font-size: 16px; color: #333; margin-bottom: 25px;">
                      Hello ${params.firstName},
                  </p>
                  
                  <p style="font-size: 16px; color: #333; margin-bottom: 25px;">
                      We received a request to reset your password for your Hive Wellness therapist account. 
                      If you made this request, please click the button below to reset your password.
                  </p>
                  
                  <div class="reset-section">
                      <h3 style="color: #9306B1; margin-bottom: 15px;">Reset Your Password</h3>
                      <p style="margin-bottom: 25px; color: #666;">
                          Click the button below to create a new password for your account.
                      </p>
                      <a href="${resetUrl}" class="reset-button">
                          Reset Password
                      </a>
                  </div>
                  
                  <div class="security-notice">
                      <h4 style="margin-top: 0; color: #856404;">🔒 Security Notice</h4>
                      <ul style="margin: 10px 0; padding-left: 20px; color: #856404;">
                          <li>This reset link will expire in 1 hour for security reasons</li>
                          <li>If you didn't request this reset, please ignore this email</li>
                          <li>Your account remains secure until you complete the reset process</li>
                      </ul>
                  </div>
                  
                  <p style="font-size: 14px; color: #666; margin-top: 30px;">
                      If the button doesn't work, you can copy and paste this link into your browser:
                  </p>
                  <p style="font-size: 14px; color: #9306B1; word-break: break-all; background: #f8f9fa; padding: 15px; border-radius: 6px;">
                      ${resetUrl}
                  </p>
                  
                  <p style="font-size: 16px; color: #333; margin-top: 30px;">
                      If you have any questions or concerns, please don't hesitate to contact our support team.
                  </p>
                  
                  <p style="font-size: 16px; color: #333; margin-top: 20px;">
                      Best regards,<br>
                      <strong style="color: #9306B1;">The Hive Wellness Team</strong>
                  </p>
              </div>
              
              <div class="footer">
                  <div class="social-links">
                      <a href="https://hive-wellness.co.uk">Website</a>
                      <a href="mailto:support@hive-wellness.co.uk">Support</a>
                  </div>
                  <p style="margin: 10px 0;">
                      Hive Wellness - Professional Therapy Platform<br>
                      Therapy Tailored to You
                  </p>
                  <p style="margin: 10px 0; font-size: 12px; color: #999;">
                      This email was sent to ${params.to}. If you received this email in error, please ignore it.
                  </p>
              </div>
          </div>
      </body>
      </html>
    `;

    await mailService.send({
      to: params.to,
      from: {
        email: "support@hive-wellness.co.uk",
        name: "Hive Wellness",
      },
      replyTo: {
        email: "support@hive-wellness.co.uk",
        name: "Hive Wellness Support",
      },
      subject: "Reset Your Hive Wellness Password",
      html: emailContent,
      text: `Password Reset Request
      
Hello ${params.firstName},

We received a request to reset your password for your Hive Wellness account.

To reset your password, please visit this link:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you did not request this password reset, please ignore this email and your password will remain unchanged.

Best regards,
The Hive Wellness Team
      
Support: support@hive-wellness.co.uk
Website: https://hive-wellness.co.uk`,
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false },
      },
      mailSettings: {
        bypassListManagement: { enable: false },
      },
    });

    console.log(`✅ Password reset email sent successfully to ${params.to}`);
    console.log(`📧 Reset link: ${resetUrl}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to send password reset email:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
    }
    return false;
  }
}

// Send welcome email after questionnaire completion with PDF attachment
export async function sendQuestionnaireWelcomeEmail(params: {
  email: string;
  firstName: string;
}): Promise<boolean> {
  try {
    const { email, firstName } = params;

    // Read the PDF file and convert to base64
    const fs = await import("fs");
    const path = await import("path");
    const pdfPath = path.join(
      process.cwd(),
      "attached_assets",
      "HW-Client-Information-Pack_1760973440335.pdf"
    );
    const pdfContent = fs.readFileSync(pdfPath);
    const pdfBase64 = pdfContent.toString("base64");

    const emailContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap');
              body { 
                  font-family: 'Open Sans', Arial, sans-serif; 
                  line-height: 1.7; 
                  color: #333; 
                  margin: 0; 
                  padding: 0; 
                  background-color: #f8f9fa;
              }
              .email-container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  background: white; 
                  border-radius: 0; 
                  overflow: hidden;
              }
              .header { 
                  background: #9306B1; 
                  color: white; 
                  padding: 30px 20px; 
                  text-align: center; 
              }
              .logo { 
                  font-size: 28px; 
                  font-weight: 700; 
                  margin-bottom: 8px; 
                  letter-spacing: 2px;
              }
              .tagline { 
                  font-size: 13px; 
                  opacity: 0.95; 
                  font-weight: 300;
                  font-style: italic;
              }
              .content { 
                  padding: 35px 30px; 
                  background: #ffffff;
              }
              .greeting {
                  font-size: 18px;
                  font-weight: 600;
                  color: #333;
                  margin-bottom: 20px;
              }
              .message-text {
                  font-size: 15px;
                  line-height: 1.7;
                  color: #555;
                  margin-bottom: 18px;
              }
              .highlight-box {
                  background: linear-gradient(135deg, #f8f4ff 0%, #fff 100%); 
                  padding: 25px; 
                  border-radius: 8px; 
                  margin: 25px 0; 
                  border-left: 4px solid #9306B1;
              }
              .footer { 
                  background: #f8f9fa; 
                  padding: 30px 20px; 
                  text-align: center; 
                  font-size: 13px; 
                  color: #666;
                  border-top: 1px solid #e9ecef;
              }
              .footer-address {
                  margin: 15px 0;
                  line-height: 1.6;
              }
              .footer-tagline {
                  font-style: italic;
                  margin: 15px 0;
                  color: #9306B1;
                  font-weight: 600;
              }
              .social-icons {
                  margin: 20px 0;
              }
              .social-icons a {
                  display: inline-block;
                  margin: 0 8px;
              }
              .social-icons img {
                  width: 28px;
                  height: 28px;
                  vertical-align: middle;
              }
              @media only screen and (max-width: 600px) {
                  .content {
                      padding: 25px 20px;
                  }
                  .greeting {
                      font-size: 16px;
                  }
                  .message-text {
                      font-size: 14px;
                  }
              }
          </style>
      </head>
      <body>
          <div class="email-container">
              <div class="header">
                  <div class="logo">HIVE WELLNESS</div>
                  <div class="tagline">Therapy Tailored to You</div>
              </div>
              <div class="content">
                  <div class="greeting">Hi ${firstName},</div>
                  
                  <p class="message-text">
                      Thank you for completing your Hive Wellness questionnaire and sharing more about what you're looking for. Your information has now been received by our team.
                  </p>
                  
                  <p class="message-text">
                      We're carefully reviewing your responses to find the therapist who best fits your needs and preferences. This process can take up to 48 hours, as we ensure every match is made thoughtfully and with care.
                  </p>
                  
                  <div class="highlight-box">
                      <p class="message-text" style="margin-bottom: 12px;"><strong>What happens next:</strong></p>
                      <p class="message-text" style="margin-bottom: 0;">
                          Once your therapist has been confirmed, you'll receive an email with your secure login details to access your Hive Wellness client portal. From there, you'll be able to view your therapist's profile, book sessions, and manage all aspects of your therapy journey.
                      </p>
                  </div>
                  
                  <p class="message-text">
                      In the meantime, we've attached a short Client Information Pack (PDF) with details about what to expect next and how Hive Wellness supports you at every step.
                  </p>
                  
                  <p class="message-text">
                      Thank you again for choosing Hive Wellness. We're so pleased to have you with us and look forward to supporting you on your wellbeing journey.
                  </p>
                  
                  <p class="message-text" style="margin-top: 25px;">
                      <strong>Warm regards,</strong><br>
                      The Hive Wellness Team
                  </p>
              </div>
              <div class="footer">
                  <p style="margin: 5px 0;"><strong><a href="https://hive-wellness.co.uk" style="color: #9306B1; text-decoration: none;">www.hive-wellness.co.uk</a></strong></p>
                  
                  <div class="footer-address">
                      167-169 Great Portland Street<br>
                      5th Floor, Fitzrovia, London, W1W 5PF
                  </div>
                  
                  <div class="footer-tagline">
                      Therapy Tailored to You
                  </div>
                  
                  <div class="social-icons">
                      <a href="https://www.instagram.com/hivewellness.uk/" target="_blank" title="Instagram">
                          <img src="https://cdn-icons-png.flaticon.com/32/2111/2111463.png" alt="Instagram">
                      </a>
                      <a href="https://www.linkedin.com/company/hive-wellness" target="_blank" title="LinkedIn">
                          <img src="https://cdn-icons-png.flaticon.com/32/174/174857.png" alt="LinkedIn">
                      </a>
                      <a href="https://www.facebook.com/profile.php?id=61566986090353" target="_blank" title="Facebook">
                          <img src="https://cdn-icons-png.flaticon.com/32/3046/3046121.png" alt="Facebook">
                      </a>
                  </div>
                  
                  <p style="font-size: 11px; color: #999; margin-top: 15px;">
                      © 2025 Hive Wellness. All rights reserved.
                  </p>
              </div>
          </div>
      </body>
      </html>
    `;

    // Send to client with PDF attachment
    await mailService.send({
      to: email,
      from: {
        email: "support@hive-wellness.co.uk",
        name: "Hive Wellness Team",
      },
      subject: "Thank you for joining Hive Wellness - we're finding your perfect therapist",
      html: emailContent,
      attachments: [
        {
          content: pdfBase64,
          filename: "Hive-Wellness-Client-Information-Pack.pdf",
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
    });

    // Send copy to admin
    await mailService.send({
      to: "support@hive-wellness.co.uk",
      from: "support@hive-wellness.co.uk",
      subject: `[COPY] Questionnaire Welcome Email Sent to ${firstName} (${email})`,
      html: emailContent,
      attachments: [
        {
          content: pdfBase64,
          filename: "Hive-Wellness-Client-Information-Pack.pdf",
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
    });

    console.log(`✅ Questionnaire welcome email sent to ${email} with PDF attachment`);
    return true;
  } catch (error) {
    console.error("Error sending questionnaire welcome email:", error);
    return false;
  }
}

// Send session notes backup to admin
interface SessionNotesBackupParams {
  noteId: string;
  therapistName: string;
  therapistEmail: string;
  clientName: string;
  sessionDate: Date;
  sessionType?: string;
  subjectiveFeedback?: string;
  objectiveObservations?: string;
  assessment?: string;
  planAndGoals?: string;
  sessionFocus?: string[];
  interventionsUsed?: string[];
  homeworkAssigned?: string;
  nextSessionGoals?: string;
  progressScore?: number;
  clientEngagement?: string;
  riskLevel?: string;
}

export async function sendSessionNotesBackup(params: SessionNotesBackupParams): Promise<boolean> {
  try {
    const {
      noteId,
      therapistName,
      therapistEmail,
      clientName,
      sessionDate,
      sessionType,
      subjectiveFeedback,
      objectiveObservations,
      assessment,
      planAndGoals,
      sessionFocus,
      interventionsUsed,
      homeworkAssigned,
      nextSessionGoals,
      progressScore,
      clientEngagement,
      riskLevel,
    } = params;

    // Send to support email for backup
    const adminEmail = "support@hive-wellness.co.uk";

    // Create email content with Hive branding
    const emailContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap');
        body { 
            font-family: 'Open Sans', Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0;
            background-color: #f8f9fa;
        }
        .container { 
            max-width: 700px; 
            margin: 20px auto; 
            background: white; 
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header { 
            background: #9306B1; 
            color: white; 
            padding: 30px; 
            text-align: center; 
        }
        .header h1 {
            font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
            margin: 0;
            font-size: 32px;
            font-weight: 600;
        }
        .header h2 {
            margin: 10px 0 0 0;
            font-size: 18px;
            font-weight: 400;
            opacity: 0.95;
        }
        .divider {
            height: 3px;
            background: #9306B1;
            margin: 0;
        }
        .content { 
            padding: 30px; 
        }
        .info-box { 
            background: #F2F3FB; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0;
            border-left: 4px solid #9306B1;
        }
        .info-box h3 {
            color: #9306B1;
            margin-top: 0;
            font-size: 16px;
            font-weight: 600;
        }
        .info-box p {
            margin: 8px 0;
        }
        .label { 
            font-weight: 600; 
            color: #666;
            display: inline-block;
            min-width: 140px;
        }
        .badge { 
            background: #9306B1; 
            color: white; 
            padding: 4px 10px; 
            border-radius: 4px; 
            font-size: 12px;
            display: inline-block;
            margin: 0 5px;
        }
        .badge.risk-low { background: #28a745; }
        .badge.risk-moderate { background: #ffc107; color: #333; }
        .badge.risk-high { background: #dc3545; }
        .badge.risk-critical { background: #000; }
        .section {
            margin: 25px 0;
        }
        .section-title {
            color: #9306B1;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #F2F3FB;
        }
        .footer { 
            background: #f8f9fa; 
            color: #666; 
            padding: 20px; 
            text-align: center; 
            font-size: 12px;
            border-top: 3px solid #9306B1;
        }
        .footer p {
            margin: 5px 0;
        }
        ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        ul li {
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Hive Wellness</h1>
            <h2>📋 Session Notes Backup</h2>
        </div>
        <div class="divider"></div>
        
        <div class="content">
            <div class="info-box">
                <h3>Session Information</h3>
                <p><span class="label">Note ID:</span> <span class="badge">${noteId}</span></p>
                <p><span class="label">Client:</span> ${clientName}</p>
                <p><span class="label">Therapist:</span> ${therapistName} (${therapistEmail})</p>
                <p><span class="label">Session Date:</span> ${sessionDate.toLocaleString("en-GB", {
                  timeZone: "Europe/London",
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}</p>
                ${sessionType ? `<p><span class="label">Session Type:</span> ${sessionType}</p>` : ""}
                ${progressScore ? `<p><span class="label">Progress Score:</span> ${progressScore}/10</p>` : ""}
                ${clientEngagement ? `<p><span class="label">Client Engagement:</span> ${clientEngagement}</p>` : ""}
                ${riskLevel ? `<p><span class="label">Risk Level:</span> <span class="badge risk-${riskLevel}">${riskLevel.toUpperCase()}</span></p>` : ""}
            </div>

            ${
              subjectiveFeedback
                ? `
            <div class="section">
                <div class="section-title">Subjective Feedback (Client's Experience)</div>
                <p>${subjectiveFeedback}</p>
            </div>
            `
                : ""
            }

            ${
              objectiveObservations
                ? `
            <div class="section">
                <div class="section-title">Objective Observations (Therapist's Clinical Notes)</div>
                <p>${objectiveObservations}</p>
            </div>
            `
                : ""
            }

            ${
              assessment
                ? `
            <div class="section">
                <div class="section-title">Clinical Assessment</div>
                <p>${assessment}</p>
            </div>
            `
                : ""
            }

            ${
              planAndGoals
                ? `
            <div class="section">
                <div class="section-title">Treatment Plan & Goals</div>
                <p>${planAndGoals}</p>
            </div>
            `
                : ""
            }

            ${
              sessionFocus && sessionFocus.length > 0
                ? `
            <div class="section">
                <div class="section-title">Session Focus Areas</div>
                <ul>
                    ${sessionFocus.map((focus) => `<li>${focus}</li>`).join("")}
                </ul>
            </div>
            `
                : ""
            }

            ${
              interventionsUsed && interventionsUsed.length > 0
                ? `
            <div class="section">
                <div class="section-title">Therapeutic Interventions Used</div>
                <ul>
                    ${interventionsUsed.map((intervention) => `<li>${intervention}</li>`).join("")}
                </ul>
            </div>
            `
                : ""
            }

            ${
              homeworkAssigned
                ? `
            <div class="section">
                <div class="section-title">Homework Assigned</div>
                <p>${homeworkAssigned}</p>
            </div>
            `
                : ""
            }

            ${
              nextSessionGoals
                ? `
            <div class="section">
                <div class="section-title">Next Session Goals</div>
                <p>${nextSessionGoals}</p>
            </div>
            `
                : ""
            }

            <div class="info-box" style="margin-top: 30px; border-left-color: #97A5D0;">
                <h3>ℹ️ Backup Information</h3>
                <p>This is an automated backup of session notes uploaded by the therapist. The notes are securely stored in the database and can be accessed via the Admin Portal > Session Notes Viewer.</p>
                <p style="margin-top: 15px; font-size: 12px; color: #666;">This email provides redundancy in case of technical issues with the therapist's access.</p>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Hive Wellness</strong> | Professional Therapy Platform</p>
            <p>This is an automated backup notification • Confidential session information</p>
            <p style="margin-top: 10px; color: #999;">HIPAA Compliant • Secure Storage • Access Controlled</p>
        </div>
    </div>
</body>
</html>`;

    // Plain text version for email clients that don't support HTML
    const textContent = `
SESSION NOTES BACKUP - HIVE WELLNESS

Note ID: ${noteId}
Client: ${clientName}
Therapist: ${therapistName} (${therapistEmail})
Session Date: ${sessionDate.toLocaleString("en-GB")}
${sessionType ? `Session Type: ${sessionType}` : ""}
${progressScore ? `Progress Score: ${progressScore}/10` : ""}
${clientEngagement ? `Client Engagement: ${clientEngagement}` : ""}
${riskLevel ? `Risk Level: ${riskLevel.toUpperCase()}` : ""}

${
  subjectiveFeedback
    ? `
SUBJECTIVE FEEDBACK:
${subjectiveFeedback}
`
    : ""
}

${
  objectiveObservations
    ? `
OBJECTIVE OBSERVATIONS:
${objectiveObservations}
`
    : ""
}

${
  assessment
    ? `
CLINICAL ASSESSMENT:
${assessment}
`
    : ""
}

${
  planAndGoals
    ? `
TREATMENT PLAN & GOALS:
${planAndGoals}
`
    : ""
}

${
  sessionFocus && sessionFocus.length > 0
    ? `
SESSION FOCUS AREAS:
${sessionFocus.map((f) => `- ${f}`).join("\n")}
`
    : ""
}

${
  interventionsUsed && interventionsUsed.length > 0
    ? `
THERAPEUTIC INTERVENTIONS:
${interventionsUsed.map((i) => `- ${i}`).join("\n")}
`
    : ""
}

${
  homeworkAssigned
    ? `
HOMEWORK ASSIGNED:
${homeworkAssigned}
`
    : ""
}

${
  nextSessionGoals
    ? `
NEXT SESSION GOALS:
${nextSessionGoals}
`
    : ""
}

---
This is an automated backup of therapist session notes.
Access via: Admin Portal > Session Notes Viewer
HIPAA Compliant • Secure Storage • Confidential Information
`;

    await mailService.send({
      to: adminEmail,
      from: "support@hive-wellness.co.uk",
      subject: `📋 Session Notes Backup: ${clientName} with ${therapistName}`,
      html: emailContent,
      text: textContent,
    });

    console.log(`✅ Session notes backup email sent to ${adminEmail} for note ${noteId}`);
    return true;
  } catch (error) {
    console.error("SendGrid session notes backup error:", error);
    return false;
  }
}
