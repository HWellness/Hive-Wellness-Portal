import { MailService } from "@sendgrid/mail";
import type { IStorage } from "./storage";

interface TherapistEnquiry {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialisations: string[];
  experience: string;
  motivation: string;
  availability: string;
  status:
    | "enquiry"
    | "intro_call_scheduled"
    | "intro_call_completed"
    | "onboarding_sent"
    | "onboarding_completed";
  createdAt: string;
  updatedAt: string;
}

export class TherapistOnboardingService {
  constructor(
    private storage: IStorage,
    private mailService: MailService
  ) {}

  // Step 1: Handle initial therapist enquiry from website
  async handleTherapistEnquiry(enquiryData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    specialisations: string[];
    experience: string;
    motivation: string;
    availability: string;
  }): Promise<TherapistEnquiry> {
    const enquiry: TherapistEnquiry = {
      id: `therapist_enquiry_${Date.now()}`,
      ...enquiryData,
      status: "enquiry",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to database
    await this.storage.createTherapistEnquiry(enquiry);

    // Send welcome email with intro call scheduling (optional - don't fail if email fails)
    try {
      await this.sendIntroCallInvitation(enquiry);
    } catch (error: any) {
      console.log("Email sending failed (non-blocking):", error.message);
    }

    return enquiry;
  }

  // Step 2: Send email inviting therapist to book intro call with admin team
  async sendIntroCallInvitation(enquiry: TherapistEnquiry): Promise<void> {
    const bookingLink = `https://api.hive-wellness.co.uk/book-admin-call?therapist=${encodeURIComponent(enquiry.email)}`;

    const emailTemplate = {
      to: enquiry.email,
      from: {
        email: "support@hive-wellness.co.uk",
        name: "Hive Wellness Team",
      },
      replyTo: "support@hive-wellness.co.uk",
      subject: "Welcome to Hive Wellness - Book Your Introduction Call",
      categories: ["therapist-onboarding", "introduction-call"],
      customArgs: {
        stage: "introduction-call",
        therapist_id: enquiry.id,
        email_type: "onboarding",
      },
      text: `Welcome to Hive Wellness, ${enquiry.firstName}!

Thank you for your interest in joining our therapy team. We're excited to learn more about your experience and how you can help our clients on their mental health journey.

The next step is to schedule a 50-minute introduction call with our team. During this call, we'll discuss:
- Your therapeutic approach and specialisations
- How Hive Wellness supports therapists
- Our client referral process
- Technology platform walkthrough
- Next steps in the onboarding process

Book Your Introduction Call: ${bookingLink}

Next Steps:
1. Click the link above to view available times with our team
2. Select a convenient time slot for your introduction call
3. You'll receive a confirmation email with meeting details
4. After the call, we'll send your complete onboarding information

Questions? Reply to this email or call us at 020 7946 0958
Visit: https://hive-wellness.co.uk

--
Hive Wellness Team
Connecting you with qualified mental health professionals`,
      html: `
        <div style="font-family: 'Open Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          

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
          
          <h1 style="color: #9306B1; font-family: 'Century Old Style', serif; font-size: 28px; text-align: center; margin-bottom: 20px;">
            Complete Your Onboarding
          </h1>
          
          <div style="background: linear-gradient(135deg, #F2F3FB 0%, #E5E7F5 100%); padding: 25px; border-radius: 15px; margin-bottom: 25px;">
            <p style="font-size: 16px; line-height: 1.6; color: #161D38; margin-bottom: 15px;">
              Hi ${enquiry.firstName},
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #161D38; margin-bottom: 20px;">
              Thank you for the wonderful conversation during our introduction call. We're excited to welcome you to the Hive Wellness team!
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #161D38; margin-bottom: 20px;">
              To complete your onboarding, please click the link below to access our secure onboarding portal and provide your professional details:
            </p>
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
          
          <h1 style="color: #9306B1; font-family: 'Century Old Style', serif; font-size: 24px; text-align: center; margin-bottom: 20px;">
            Your Introduction Call is Booked!
          </h1>
          
          <div style="background-color: #F7F8FB; padding: 20px; border-radius: 8px; border-left: 4px solid #9306B1; margin: 20px 0;">
            <h3 style="color: #9306B1; margin-top: 0;">Meeting Details</h3>
            <p><strong>Date:</strong> ${data.date || "TBD"}</p>
            <p><strong>Time:</strong> ${data.time || "TBD"}</p>
            <p><strong>Duration:</strong> 50 minutes</p>
            ${notes ? `<p><strong>Notes:</strong> ${data.notes || ""}</p>` : ""}
          </div>
          
          <p style="color: #333; line-height: 1.6;">
            Hello ${data.therapistName || "team member"},<br><br>
            Your introduction call with Hive Wellness has been successfully booked. During this call, we'll discuss:
          </p>
          
          <ul style="color: #333; line-height: 1.6; margin: 15px 0;">
            <li>Your therapy experience and approach</li>
            <li>Hive Wellness platform overview</li>
            <li>Next steps in the onboarding process</li>
            <li>Any questions you might have</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.meetingLink || "#"}" style="background-color: #9306B1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Join Video Call
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; text-align: center;">
            Please join the video call at the scheduled time using the link above.<br>
            If you need to reschedule, please reply to this email.
          </p>
          
          <div style="border-top: 2px solid #E5E7F5; padding-top: 20px; margin-top: 30px;">
            <p style="font-size: 14px; color: #666; text-align: center;">
              Questions? Reply to this email or call us at 020 7946 0958<br>
              <a href="https://hive-wellness.co.uk" style="color: #9306B1;">hive-wellness.co.uk</a>
            </p>
          </div>
        </div>
      `,
    };

    // Email to admin
    const adminEmailMsg = {
      to: "support@hive-wellness.co.uk",
      from: "support@hive-wellness.co.uk",
      subject: `New Introduction Call Booked - ${data.therapistName || "team member"}`,
      html: `
        <div style="font-family: 'Open Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #9306B1;">New Introduction Call Booked</h2>
          
          <div style="background-color: #F7F8FB; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #9306B1; margin-top: 0;">Therapist Details</h3>
            <p><strong>Name:</strong> ${data.therapistName || "team member"}</p>
            <p><strong>Email:</strong> ${callData.therapistEmail}</p>
          </div>
          
          <div style="background-color: #F7F8FB; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #9306B1; margin-top: 0;">Meeting Details</h3>
            <p><strong>Date:</strong> ${data.date || "TBD"}</p>
            <p><strong>Time:</strong> ${data.time || "TBD"}</p>
            <p><strong>Meeting Link:</strong> <a href="${data.meetingLink || "#"}">${data.meetingLink || "#"}</a></p>
            ${notes ? `<p><strong>Notes:</strong> ${data.notes || ""}</p>` : ""}
          </div>
          
          <p>Please ensure you're available for this introduction call and prepare the standard onboarding materials.</p>
        </div>
      `,
    };

    try {
      // Send both emails
      await Promise.all([
        this.mailService.send(therapistEmailMsg),
        this.mailService.send(adminEmailMsg),
      ]);

      console.log(
        `Introduction call emails sent to ${data.therapistName || "team member"} (${callData.therapistEmail}) and admin`
      );
    } catch (error) {
      console.error("Failed to send introduction call emails:", error);
      // Don't throw - this is non-blocking
    }
  }
}
