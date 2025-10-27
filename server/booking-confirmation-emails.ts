import { MailService } from "@sendgrid/mail";

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface BookingDetails {
  name: string;
  email: string;
  phone?: string;
  preferredDate: string;
  preferredTime: string;
  message?: string;
  bookingId: string;
  videoSessionLink?: string;
}

// Generate public access video meeting link for introduction calls
function generateVideoMeetingLink(
  bookingId: string,
  email: string,
  role: "admin" | "client" = "client"
): string {
  const baseUrl = "https://api.hive-wellness.co.uk/api/video-sessions";
  return `${baseUrl}/introduction-call/${bookingId}/access?email=${encodeURIComponent(email)}`;
}

// Brand-compliant email template structure
function createBrandedEmailTemplate(params: { headingText: string; bodyContent: string }) {
  const { headingText, bodyContent } = params;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Hive Wellness</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap');
        /* Fallback font stack for email client compatibility */
        @media all {
          .heading-font {
            font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, 'Times New Roman', Georgia, serif !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: 'Open Sans', Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Main Email Container -->
        <div style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          
          <!-- Hive Wellness Branding -->
          <div style="padding: 40px 40px 20px; text-align: center;">
            <p style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; font-size: 20px; color: #333; margin: 0; font-weight: 400;">
              Hive Wellness
            </p>
          </div>
          
          <!-- Purple Heading with Divider -->
          <div style="padding: 0 40px 30px;">
            <h1 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; font-size: 26px; text-align: center; margin: 0 0 15px 0; font-weight: 600; line-height: 1.3;">
              ${headingText}
            </h1>
            <!-- Purple Divider -->
            <div style="width: 100px; height: 3px; background-color: #9306B1; margin: 0 auto;"></div>
          </div>
          
          <!-- Email Body Content -->
          <div style="padding: 0 40px 40px;">
            ${bodyContent}
          </div>
          
          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0 0 10px 0; font-size: 13px; color: #666;">
              © 2025 Hive Wellness. Connecting clients with the right therapist.
            </p>
            <p style="margin: 0; font-size: 12px;">
              <a href="https://hive-wellness.co.uk" style="color: #9306B1; text-decoration: none;">Visit our website</a>
              <span style="color: #999; margin: 0 8px;">|</span>
              <a href="mailto:support@hive-wellness.co.uk" style="color: #9306B1; text-decoration: none;">Contact Support</a>
            </p>
          </div>
          
        </div>
      </div>
    </body>
    </html>
  `;
}

export class BookingEmailService {
  // Send immediate confirmation email to user
  async sendUserConfirmation(booking: BookingDetails): Promise<boolean> {
    const clientVideoLink =
      booking.videoSessionLink ||
      generateVideoMeetingLink(booking.bookingId, booking.email, "client");

    const bodyContent = `
      <!-- Rounded Content Box -->
      <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
        <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; font-size: 16px; margin: 0;">
          Hello <strong>${booking.name}</strong>,
        </p>
        <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; font-size: 16px; margin: 20px 0 0 0;">
          Your initial chat with our team has been confirmed! We're excited to speak with you about how Hive Wellness can support your mental health journey.
        </p>
      </div>
      
      <!-- Rounded Content Box -->
      <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
        <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
          Your Appointment Details
        </h3>
        <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; margin: 0;">
          <strong>Date:</strong> ${booking.preferredDate}<br>
          <strong>Time:</strong> ${booking.preferredTime}<br>
          <strong>Duration:</strong> 15-30 minutes<br>
          <strong>Type:</strong> Initial consultation call<br>
          <strong>Booking Reference:</strong> ${booking.bookingId}
        </p>
      </div>
      
      <!-- Video Meeting Link Box with Purple Background -->
      <div style="background: #9306B1; padding: 25px; border-radius: 12px; margin-bottom: 25px; text-align: center;">
        <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: white; margin: 0 0 15px 0; font-size: 18px;">
          Your Video Meeting Link
        </h3>
        <p style="font-family: 'Open Sans', sans-serif; color: white; margin-bottom: 20px; line-height: 1.6;">
          Click the button below to join your consultation at the scheduled time:
        </p>
        <div style="margin: 20px 0;">
          <a href="${clientVideoLink}" style="background: white; color: #9306B1; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-family: 'Open Sans', sans-serif; font-weight: 600; display: inline-block; font-size: 16px;">
            Join Video Call
          </a>
        </div>
        <p style="font-family: 'Open Sans', sans-serif; color: white; margin: 15px 0 0 0; font-size: 14px;">
          Link will be active 15 minutes before your appointment time
        </p>
      </div>
      
      <!-- Rounded Content Box -->
      <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
        <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
          What happens next?
        </h3>
        <ul style="font-family: 'Open Sans', sans-serif; line-height: 1.8; color: #333; margin: 0; padding-left: 20px;">
          <li><strong>Meeting link:</strong> Use the video call button above (available 15 minutes before your appointment)</li>
          <li><strong>Preparation:</strong> Think about what you'd like to achieve with therapy</li>
          <li><strong>Questions:</strong> Feel free to prepare any questions about our services</li>
          <li><strong>Flexibility:</strong> Need to reschedule? Just reply to this email</li>
        </ul>
      </div>
      
      ${
        booking.message
          ? `
      <!-- Rounded Content Box -->
      <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
        <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
          Your Message:
        </h3>
        <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; font-style: italic; margin: 0;">
          "${booking.message}"
        </p>
      </div>
      `
          : ""
      }
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://hive-wellness.co.uk/contact" style="background: #9306B1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-family: 'Open Sans', sans-serif; font-weight: 600; display: inline-block; font-size: 16px;">
          Questions? Contact Us
        </a>
      </div>
      
      <p style="font-family: 'Open Sans', sans-serif; line-height: 1.6; color: #333; font-size: 16px; margin: 25px 0 0 0;">
        We're looking forward to speaking with you! If you need to make any changes to your appointment, 
        please don't hesitate to contact us at <a href="mailto:support@hive-wellness.co.uk" style="color: #9306B1; text-decoration: underline;">support@hive-wellness.co.uk</a> or reply to this email.
      </p>
    `;

    const userEmailHtml = createBrandedEmailTemplate({
      headingText: "Your Initial Chat is Confirmed!",
      bodyContent,
    });

    const userEmailText = `
      HIVE WELLNESS - BOOKING CONFIRMATION
      
      Hello ${booking.name},
      
      Your initial chat with our team has been CONFIRMED!
      
      APPOINTMENT DETAILS:
      - Date: ${booking.preferredDate}
      - Time: ${booking.preferredTime}
      - Duration: 15-30 minutes
      - Booking Reference: ${booking.bookingId}
      
      WHAT'S NEXT:
      • VIDEO MEETING LINK: ${clientVideoLink} (available 15 minutes before appointment)
      • Think about what you'd like to achieve with therapy
      • Prepare any questions about our services
      • Need to reschedule? Just reply to this email
      
      ${booking.message ? `YOUR MESSAGE: "${booking.message}"` : ""}
      
      Questions? Contact us at support@hive-wellness.co.uk
      
      Looking forward to speaking with you!
      
      Hive Wellness Team
      support@hive-wellness.co.uk
      hive-wellness.co.uk
    `;

    try {
      await mailService.send({
        to: booking.email,
        from: {
          email: "support@hive-wellness.co.uk",
          name: "Hive Wellness",
        },
        subject: `Your Initial Chat is Confirmed - ${booking.preferredDate} at ${booking.preferredTime}`,
        text: userEmailText,
        html: userEmailHtml,
      });
      return true;
    } catch (error) {
      console.error("Failed to send user confirmation email:", error);
      return false;
    }
  }

  // Send admin notification email
  async sendAdminNotification(booking: BookingDetails): Promise<boolean> {
    const sharedVideoLink =
      booking.videoSessionLink ||
      generateVideoMeetingLink(booking.bookingId, booking.email, "client");

    const bodyContent = `
      <!-- Rounded Content Box -->
      <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
        <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
          Action Required
        </h3>
        <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; margin: 0;">
          A new booking has been made through the WordPress widget. User has received automatic confirmation.
        </p>
      </div>
      
      <!-- Rounded Content Box -->
      <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
        <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
          Booking Details
        </h3>
        <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; margin: 0;">
          <strong>Name:</strong> ${booking.name}<br>
          <strong>Email:</strong> ${booking.email}<br>
          <strong>Phone:</strong> ${booking.phone || "Not provided"}<br>
          <strong>Preferred Date:</strong> ${booking.preferredDate}<br>
          <strong>Preferred Time:</strong> ${booking.preferredTime}<br>
          <strong>Booking ID:</strong> ${booking.bookingId}<br>
          <strong>Source:</strong> WordPress Widget
          ${booking.message ? `<br><strong>Message:</strong> "${booking.message}"` : ""}
        </p>
      </div>
      
      <!-- Video Meeting Link Box with Purple Background -->
      <div style="background: #9306B1; padding: 25px; border-radius: 12px; margin-bottom: 25px; text-align: center;">
        <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: white; margin: 0 0 15px 0; font-size: 18px;">
          Shared Video Meeting Link
        </h3>
        <p style="font-family: 'Open Sans', sans-serif; color: white; margin-bottom: 20px; line-height: 1.6;">
          Both you and the client will use the same video link:
        </p>
        <div style="margin: 20px 0;">
          <a href="${sharedVideoLink}" style="background: white; color: #9306B1; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-family: 'Open Sans', sans-serif; font-weight: 600; display: inline-block; font-size: 16px;">
            Join Video Meeting
          </a>
        </div>
        <p style="font-family: 'Open Sans', sans-serif; color: white; margin: 15px 0 0 0; font-size: 14px;">
          Meeting room active 15 minutes before appointment time
        </p>
      </div>
      
      <!-- Rounded Content Box -->
      <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
        <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
          Next Actions & Video Session
        </h3>
        <ul style="font-family: 'Open Sans', sans-serif; line-height: 1.8; color: #333; margin: 0; padding-left: 20px;">
          <li><strong>Shared video meeting:</strong> <a href="${sharedVideoLink}" style="color: #9306B1; text-decoration: underline;">${sharedVideoLink}</a></li>
          <li><strong>Video session created in admin dashboard</strong> - Session ID: ${booking.bookingId}</li>
          <li><strong>Client received same video link</strong> in their confirmation email</li>
          <li>Add to admin calendar (automatically done)</li>
          <li>Prepare consultation notes</li>
          <li>Update CRM with new lead</li>
        </ul>
      </div>
      
      <!-- Rounded Content Box -->
      <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
        <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
          System Updates Complete
        </h3>
        <ul style="font-family: 'Open Sans', sans-serif; line-height: 1.8; color: #333; margin: 0; padding-left: 20px;">
          <li><strong>Video session created</strong> in admin dashboard with ID: ${booking.bookingId}</li>
          <li><strong>Client received confirmation</strong> with same shared video link</li>
          <li><strong>Calendar automatically blocked</strong> to prevent double bookings</li>
          <li><strong>Both parties join same meeting</strong> - no separate links needed</li>
          <li><strong>Meeting room available</strong> 15 minutes before appointment</li>
        </ul>
      </div>
    `;

    const adminEmailHtml = createBrandedEmailTemplate({
      headingText: "New Booking Alert",
      bodyContent,
    });

    try {
      await mailService.send({
        to: ["admin@hive-wellness.co.uk", "support@hive-wellness.co.uk"],
        from: {
          email: "support@hive-wellness.co.uk",
          name: "Hive Wellness Booking System",
        },
        subject: `New Booking: ${booking.name} - ${booking.preferredDate} ${booking.preferredTime}`,
        html: adminEmailHtml,
      });
      return true;
    } catch (error) {
      console.error("Failed to send admin notification email:", error);
      return false;
    }
  }

  // Send both confirmation emails
  async sendBookingConfirmations(
    booking: BookingDetails
  ): Promise<{ userSent: boolean; adminSent: boolean }> {
    const [userSent, adminSent] = await Promise.all([
      this.sendUserConfirmation(booking),
      this.sendAdminNotification(booking),
    ]);

    return { userSent, adminSent };
  }
}

export const bookingEmailService = new BookingEmailService();
