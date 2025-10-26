import { MailService } from '@sendgrid/mail';
import { nanoid } from 'nanoid';

// Initialize SendGrid mail service
const sgMail = new MailService();
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export function generateTherapistToken(email: string): string {
  // Generate unique token for therapist onboarding link
  return `therapist_${nanoid(32)}_${Buffer.from(email).toString('base64')}`;
}

// Brand-compliant email template structure following Hive Wellness Brand Guidelines 2025
function createBrandedEmailTemplate(params: {
  headingText: string;
  bodyContent: string;
}) {
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
            <p class="heading-font" style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, 'Times New Roman', Georgia, serif; font-size: 20px; color: #333; margin: 0; font-weight: 400;">
              Hive Wellness
            </p>
          </div>
          
          <!-- Purple Heading with Divider -->
          <div style="padding: 0 40px 30px;">
            <h1 class="heading-font" style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, 'Times New Roman', Georgia, serif; color: #9306B1; font-size: 26px; text-align: center; margin: 0 0 15px 0; font-weight: 600; line-height: 1.3;">
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

export async function sendTherapistEnquiryEmail(enquiryData: any) {
  const { firstName, lastName, email, phone, specializations, experience } = enquiryData;
  
  // Admin notification email
  const adminBodyContent = `
    <p style="font-family: 'Open Sans', sans-serif; line-height: 1.6; color: #333; font-size: 16px; margin: 0 0 25px 0;">
      A new therapist has submitted an application through the website.
    </p>
    
    <!-- Rounded Content Box -->
    <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
      <p style="font-family: 'Open Sans', sans-serif; line-height: 1.8; color: #333; margin: 0;">
        <strong>Name:</strong> ${firstName} ${lastName}<br>
        <strong>Email:</strong> ${email}<br>
        <strong>Phone:</strong> ${phone}<br>
        <strong>Experience Level:</strong> ${experience}<br>
        <strong>Specialisations:</strong> ${specializations.join(', ')}
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="mailto:${email}" style="background: #9306B1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-family: 'Open Sans', sans-serif; font-weight: 600; display: inline-block; font-size: 16px;">
        Contact Therapist
      </a>
    </div>
    
    <!-- Rounded Content Box -->
    <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-top: 25px; border: 1px solid #e9ecef;">
      <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
        Next Steps:
      </h3>
      <ol style="font-family: 'Open Sans', sans-serif; line-height: 1.8; color: #333; margin: 0; padding-left: 20px;">
        <li>Schedule introduction call with therapist</li>
        <li>Send onboarding link after call</li>
        <li>Complete Stripe Connect setup</li>
      </ol>
    </div>
  `;

  const adminEmailTemplate = createBrandedEmailTemplate({
    headingText: 'New Therapist Application',
    bodyContent: adminBodyContent
  });

  // Send to admin team
  await sgMail.send({
    to: 'admin@hive-wellness.co.uk',
    from: 'noreply@hive-wellness.co.uk',
    subject: `New Therapist Application - ${firstName} ${lastName}`,
    html: adminEmailTemplate
  });

  // Confirmation email to therapist
  const therapistBodyContent = `
    <!-- Rounded Content Box -->
    <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
      <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; font-size: 16px; margin: 0;">
        Thank you for completing your therapist questionnaire! We've received your application and our team is genuinely excited to learn more about your qualifications, experience, and unique approach to therapy.
      </p>
      <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; font-size: 16px; margin: 20px 0 0 0;">
        Your expertise and dedication to mental health is exactly what makes the Hive Wellness community thrive. We're honoured you're considering joining us.
      </p>
    </div>
    
    <!-- Rounded Content Box -->
    <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
      <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
        What happens next?
      </h3>
      <ol style="font-family: 'Open Sans', sans-serif; line-height: 1.8; color: #333; margin: 0; padding-left: 20px;">
        <li><strong>Introduction Call:</strong> We'll contact you within 2 business days to schedule a brief introduction call</li>
        <li><strong>Onboarding:</strong> After our call, you'll receive a link to complete your profile</li>
        <li><strong>Payment Setup:</strong> Configure your details to receive 85% of all session fees</li>
        <li><strong>Go Live:</strong> Start connecting with clients who need your expertise</li>
      </ol>
    </div>
    
    <p style="font-family: 'Open Sans', sans-serif; line-height: 1.6; color: #333; font-size: 16px; margin: 25px 0 0 0;">
      If you have any questions in the meantime, please don't hesitate to contact us.
    </p>
  `;

  const therapistConfirmationTemplate = createBrandedEmailTemplate({
    headingText: `Welcome to Our Professional Network, ${firstName}!`,
    bodyContent: therapistBodyContent
  });

  await sgMail.send({
    to: email,
    from: 'noreply@hive-wellness.co.uk',
    subject: 'Application Received - Welcome to Hive Wellness!',
    html: therapistConfirmationTemplate
  });
}

export async function sendTherapistWelcomeEmail(therapistData: any) {
  const { firstName, lastName, email } = therapistData;
  
  const bodyContent = `
    <!-- Rounded Content Box -->
    <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
      <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; font-size: 16px; margin: 0;">
        Congratulations! Your onboarding is now complete and you're officially part of the Hive Wellness family.
      </p>
    </div>
    
    <!-- Rounded Content Box -->
    <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
      <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
        Your Next Steps:
      </h3>
      <ul style="font-family: 'Open Sans', sans-serif; line-height: 1.8; color: #333; margin: 0; padding-left: 20px;">
        <li>Access your therapist dashboard to complete your profile</li>
        <li>Set your availability and session preferences</li>
        <li>Review client matching requests</li>
        <li>Start helping clients achieve their therapy goals</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://portal.hive-wellness.co.uk/therapist-login" style="background: #9306B1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-family: 'Open Sans', sans-serif; font-weight: 600; display: inline-block; font-size: 16px;">
        Access Your Dashboard
      </a>
    </div>
    
    <!-- Rounded Content Box -->
    <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-top: 25px; border: 1px solid #e9ecef;">
      <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
        Payment Information:
      </h3>
      <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; margin: 0;">
        Your Stripe Connect account is set up to receive <strong>85% of all session fees</strong>. 
        Payments are processed automatically after each session, with optional instant payouts available.
      </p>
    </div>
  `;

  const welcomeTemplate = createBrandedEmailTemplate({
    headingText: `Welcome to Hive Wellness, ${firstName}!`,
    bodyContent
  });

  await sgMail.send({
    to: email,
    from: 'noreply@hive-wellness.co.uk',
    subject: 'Welcome to Hive Wellness - You\'re All Set!',
    html: welcomeTemplate
  });
}

export async function sendTherapistConfirmationWithBookingLink(therapistData: {
  firstName: string;
  lastName: string;
  email: string;
  bookingUrl: string;
}) {
  const { firstName, lastName, email, bookingUrl } = therapistData;
  
  const bodyContent = `
    <!-- Rounded Content Box -->
    <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
      <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; font-size: 16px; margin: 0;">
        We've received your application to join Hive Wellness and are excited about the possibility of working together.
      </p>
    </div>
    
    <!-- Rounded Content Box -->
    <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
      <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
        Next Step: Book Your Introduction Call
      </h3>
      <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; margin-bottom: 20px;">
        Please book a 15-minute introduction call with our team at a time that suits you. 
        This is an opportunity for us to get to know each other and discuss how we can work together.
      </p>
      
      <div style="text-align: center; margin: 20px 0;">
        <a href="${bookingUrl}" style="background: #9306B1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-family: 'Open Sans', sans-serif; font-weight: 600; display: inline-block; font-size: 16px;">
          Book Your Introduction Call
        </a>
      </div>
    </div>
    
    <!-- Rounded Content Box -->
    <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
      <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
        What to Expect:
      </h3>
      <ul style="font-family: 'Open Sans', sans-serif; line-height: 1.8; color: #333; margin: 0; padding-left: 20px;">
        <li>30-minute video call via Google Meet</li>
        <li>Discussion of your experience and specialisations</li>
        <li>Overview of the Hive Wellness platform</li>
        <li>Revenue sharing model (85% to you, 15% platform fee)</li>
        <li>Next steps in the onboarding process</li>
      </ul>
    </div>
    
    <p style="font-family: 'Open Sans', sans-serif; line-height: 1.6; color: #333; font-size: 16px; margin: 25px 0 0 0;">
      If you have any questions before our call, please don't hesitate to contact us.
    </p>
  `;

  const confirmationTemplate = createBrandedEmailTemplate({
    headingText: `Thank You for Your Application, ${firstName}!`,
    bodyContent
  });

  await sgMail.send({
    to: email,
    from: 'noreply@hive-wellness.co.uk',
    subject: `${firstName}, Book Your Hive Wellness Introduction Call`,
    html: confirmationTemplate
  });
}

export async function sendPostCallOnboardingEmail(therapistData: {
  firstName: string;
  lastName: string;
  email: string;
  onboardingFormUrl: string;
  infoPdfUrl?: string;
  infoPdfBase64?: string;
}) {
  const { firstName, lastName, email, onboardingFormUrl, infoPdfUrl, infoPdfBase64 } = therapistData;
  
  const bodyContent = `
    <!-- Rounded Content Box -->
    <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
      <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; font-size: 16px; margin: 0;">
        Thank you for taking the time to speak with us today. We're excited to move forward with your onboarding process.
      </p>
    </div>
    
    <!-- Rounded Content Box -->
    <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
      <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
        Action Required: Complete Your Onboarding Form
      </h3>
      <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; margin-bottom: 20px;">
        Please complete the onboarding form using the button below. This collects essential information 
        for us to set up your therapist profile and begin the verification process.
      </p>
      
      <div style="text-align: center; margin: 20px 0;">
        <a href="${onboardingFormUrl}" style="background: #9306B1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-family: 'Open Sans', sans-serif; font-weight: 600; display: inline-block; font-size: 16px;">
          Complete Onboarding Form
        </a>
      </div>
    </div>
    
    <!-- Rounded Content Box -->
    <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
      <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
        Enhanced DBS Certificate Requirements
      </h3>
      <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; margin-bottom: 15px;">
        All therapists working with Hive Wellness must have a valid Enhanced DBS Certificate. Here's what you need to know:
      </p>
      <ul style="font-family: 'Open Sans', sans-serif; line-height: 1.8; color: #333; margin: 0 0 15px 0; padding-left: 20px;">
        <li><strong>Required:</strong> Enhanced DBS Certificate (not Basic)</li>
        <li><strong>Validity:</strong> Certificate must be dated within the last 3 years</li>
        <li><strong>Upload:</strong> You'll upload a copy as part of the onboarding form</li>
        <li><strong>Renewal:</strong> If your certificate is expired, you'll need to apply for a new one</li>
        <li><strong>Cost:</strong> Approximately £44 (therapist responsibility)</li>
      </ul>
      <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; margin: 0;">
        <strong>How to Apply:</strong> Visit <a href="https://www.gov.uk/dbs-check-applicant-criminal-record" style="color: #9306B1; text-decoration: underline;">gov.uk/dbs-check</a> 
        or contact us if you need assistance with the application process.
      </p>
    </div>
    
    ${infoPdfUrl ? `
    <!-- Rounded Content Box -->
    <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
      <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
        Hive Wellness Information Pack
      </h3>
      <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; margin-bottom: 15px;">
        We've attached our information pack which includes:
      </p>
      <ul style="font-family: 'Open Sans', sans-serif; line-height: 1.8; color: #333; margin: 0 0 15px 0; padding-left: 20px;">
        <li>Platform overview and how it works</li>
        <li>Payment structure and revenue sharing details</li>
        <li>Client matching process</li>
        <li>Support resources for therapists</li>
        <li>Frequently asked questions</li>
      </ul>
      <div style="text-align: center; margin: 15px 0;">
        <a href="${infoPdfUrl}" style="background: white; color: #9306B1; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-family: 'Open Sans', sans-serif; font-weight: 600; display: inline-block; border: 2px solid #9306B1;">
          Download Information Pack (PDF)
        </a>
      </div>
    </div>
    ` : ''}
    
    <!-- Rounded Content Box -->
    <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
      <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
        Timeline & What Happens Next
      </h3>
      <ol style="font-family: 'Open Sans', sans-serif; line-height: 1.8; color: #333; margin: 0; padding-left: 20px;">
        <li><strong>Complete the onboarding form</strong> - Please submit within 7 days</li>
        <li><strong>Document verification</strong> - Our team will review your submissions (1-2 business days)</li>
        <li><strong>Contract & login details</strong> - You'll receive your therapist portal access</li>
        <li><strong>Profile setup</strong> - Complete your therapist profile in the portal</li>
        <li><strong>Go live</strong> - Start receiving client matches!</li>
      </ol>
    </div>
    
    <p style="font-family: 'Open Sans', sans-serif; line-height: 1.6; color: #333; font-size: 16px; margin: 25px 0 0 0;">
      If you have any questions about the DBS process, the onboarding form, or anything else, 
      please don't hesitate to contact us at <a href="mailto:support@hive-wellness.co.uk" style="color: #9306B1; text-decoration: underline;">support@hive-wellness.co.uk</a>
    </p>
  `;

  const postCallTemplate = createBrandedEmailTemplate({
    headingText: `Great Speaking With You, ${firstName}!`,
    bodyContent
  });

  const emailOptions: any = {
    to: email,
    from: 'noreply@hive-wellness.co.uk',
    subject: `${firstName}, Complete Your Hive Wellness Onboarding`,
    html: postCallTemplate
  };

  if (infoPdfBase64) {
    emailOptions.attachments = [
      {
        filename: 'Hive-Wellness-Information-Pack.pdf',
        type: 'application/pdf',
        content: infoPdfBase64,
        disposition: 'attachment'
      }
    ];
  }

  await sgMail.send(emailOptions);
}

export async function sendContractAndLoginCredentials(therapistData: {
  firstName: string;
  lastName: string;
  email: string;
  workspaceEmail: string;
  tempPassword: string;
  portalUrl: string;
  contractUrl?: string;
  contractBase64?: string;
}) {
  const { firstName, lastName, email, workspaceEmail, tempPassword, portalUrl, contractUrl, contractBase64 } = therapistData;
  
  const bodyContent = `
    <!-- Rounded Content Box -->
    <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
      <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; font-size: 16px; margin: 0;">
        Your application has been approved and your therapist account is now active. 
        We're thrilled to have you join the Hive Wellness community!
      </p>
    </div>
    
    ${contractUrl ? `
    <!-- Rounded Content Box -->
    <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
      <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
        Your Therapist Contract
      </h3>
      <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; margin-bottom: 15px;">
        Please review and sign your therapist contract. This outlines:
      </p>
      <ul style="font-family: 'Open Sans', sans-serif; line-height: 1.8; color: #333; margin: 0 0 15px 0; padding-left: 20px;">
        <li>Revenue sharing agreement (85% therapist / 15% platform)</li>
        <li>Self-employment status and responsibilities</li>
        <li>Professional conduct guidelines</li>
        <li>Data protection and confidentiality</li>
      </ul>
      <div style="text-align: center; margin: 15px 0;">
        <a href="${contractUrl}" style="background: #9306B1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-family: 'Open Sans', sans-serif; font-weight: 600; display: inline-block; font-size: 16px;">
          View & Sign Contract
        </a>
      </div>
    </div>
    ` : ''}
    
    <!-- Rounded Content Box with Purple Background -->
    <div style="background: #9306B1; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
      <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: white; margin: 0 0 15px 0; font-size: 18px;">
        Your Login Credentials
      </h3>
      <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 8px; margin: 15px 0; border: 1px solid rgba(255,255,255,0.2);">
        <p style="font-family: 'Open Sans', sans-serif; color: white; margin: 0 0 12px 0; line-height: 1.6;">
          <strong>Portal URL:</strong><br>
          <a href="${portalUrl}" style="color: white; text-decoration: underline; font-size: 15px;">${portalUrl}</a>
        </p>
        <p style="font-family: 'Open Sans', sans-serif; color: white; margin: 12px 0; line-height: 1.6;">
          <strong>Your Workspace Email:</strong><br>
          <span style="font-size: 15px; font-family: 'Courier New', monospace;">${workspaceEmail}</span>
        </p>
        <p style="font-family: 'Open Sans', sans-serif; color: white; margin: 12px 0 0 0; line-height: 1.6;">
          <strong>Temporary Password:</strong><br>
          <span style="font-size: 15px; font-family: 'Courier New', monospace; background: rgba(0,0,0,0.2); padding: 6px 12px; border-radius: 4px; display: inline-block; margin-top: 5px;">${tempPassword}</span>
        </p>
      </div>
      <p style="font-family: 'Open Sans', sans-serif; color: white; margin: 15px 0 0 0; font-size: 14px; line-height: 1.6;">
        <strong>Important:</strong> Please change this temporary password when you first log in for security reasons.
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${portalUrl}" style="background: #9306B1; color: white; padding: 16px 38px; text-decoration: none; border-radius: 6px; font-family: 'Open Sans', sans-serif; font-weight: 600; display: inline-block; font-size: 17px;">
        Access Therapist Portal
      </a>
    </div>
    
    <!-- Rounded Content Box -->
    <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
      <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
        Next Steps in Your Portal:
      </h3>
      <ol style="font-family: 'Open Sans', sans-serif; line-height: 1.8; color: #333; margin: 0; padding-left: 20px;">
        <li>Log in with your credentials above</li>
        <li>Change your temporary password</li>
        <li>Complete any remaining profile information</li>
        <li>Set your availability and session preferences</li>
        <li>Review and configure your Stripe Connect payment settings</li>
        <li>Start receiving client match requests!</li>
      </ol>
    </div>
    
    <!-- Rounded Content Box -->
    <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
      <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
        Payment Information
      </h3>
      <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; margin: 0;">
        Your Stripe Connect account is configured to receive <strong>85% of all session fees</strong>. 
        Payments are processed automatically after each session. You can enable instant payouts or use the standard 
        2-business-day transfer schedule. All Stripe processing fees are absorbed by Hive Wellness.
      </p>
    </div>
    
    <p style="font-family: 'Open Sans', sans-serif; line-height: 1.6; color: #333; font-size: 16px; margin: 25px 0 0 0;">
      We're here to support you every step of the way. If you have any questions or need assistance, 
      please contact us at <a href="mailto:support@hive-wellness.co.uk" style="color: #9306B1; text-decoration: underline;">support@hive-wellness.co.uk</a>
    </p>
  `;

  const credentialsTemplate = createBrandedEmailTemplate({
    headingText: `Congratulations, ${firstName}!`,
    bodyContent
  });

  const emailOptions: any = {
    to: email,
    from: 'noreply@hive-wellness.co.uk',
    subject: `${firstName}, Your Hive Wellness Account Is Ready - Login Details Inside`,
    html: credentialsTemplate
  };

  if (contractBase64) {
    emailOptions.attachments = [
      {
        filename: 'Hive-Wellness-Therapist-Contract.pdf',
        type: 'application/pdf',
        content: contractBase64,
        disposition: 'attachment'
      }
    ];
  }

  await sgMail.send(emailOptions);
}
