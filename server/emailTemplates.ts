// Hive Wellness Email Templates - Brand Guidelines Compliant (2025)
// Following brand guidelines: Purple headings (#9306B1), rounded content boxes, clean typography

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

export const hiveWellnessEmailTemplates = {
  welcomeClient: {
    subject: "Welcome to Hive Wellness - Your Therapy Journey Begins",
    template: (firstName: string) => {
      const bodyContent = `
        <!-- Rounded Content Box -->
        <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
          <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; font-size: 16px; margin: 0;">
            Thank you for choosing Hive Wellness. We're honoured to support you on your mental health journey.
          </p>
        </div>
        
        <!-- Rounded Content Box -->
        <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
          <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
            What happens next?
          </h3>
          <ul style="font-family: 'Open Sans', sans-serif; line-height: 1.8; color: #333; margin: 0; padding-left: 20px;">
            <li>We'll carefully match you with a qualified therapist based on your needs</li>
            <li>Your therapist will contact you within 24 hours to arrange your first session</li>
            <li>You'll receive session reminders and have access to our secure portal</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://portal.hive-wellness.co.uk/portal" style="background: #9306B1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-family: 'Open Sans', sans-serif; font-weight: 600; display: inline-block; font-size: 16px;">
            Access Your Portal
          </a>
        </div>
        
        <p style="font-family: 'Open Sans', sans-serif; line-height: 1.6; color: #333; font-size: 16px; margin: 25px 0 0 0;">
          If you have any questions, our support team is here to help at 
          <a href="mailto:support@hive-wellness.co.uk" style="color: #9306B1; text-decoration: underline;">support@hive-wellness.co.uk</a>
        </p>
      `;

      return createBrandedEmailTemplate({
        headingText: `Welcome to Your Therapy Journey, ${firstName}!`,
        bodyContent,
      });
    },
  },

  therapistOnboardingNext: {
    subject: "Welcome to the Hive Wellness Therapist Network",
    template: (therapistName: string, applicationReference: string) => {
      const bodyContent = `
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
            Your Journey Ahead
          </h3>
          <ol style="font-family: 'Open Sans', sans-serif; line-height: 1.8; color: #333; margin: 0; padding-left: 20px;">
            <li><strong>Application Review:</strong> Our clinical team carefully reviews your qualifications and experience</li>
            <li><strong>Introduction Call:</strong> Personal discussion about your goals and how we can support your practice</li>
            <li><strong>Comprehensive Onboarding:</strong> Complete training, verification, and platform setup</li>
            <li><strong>Start Practising:</strong> Launch your enhanced practice with full platform access</li>
          </ol>
        </div>
        
        <!-- Rounded Content Box -->
        <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
          <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
            What Happens Next?
          </h3>
          <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; margin: 0;">
            We've received your introduction call booking and will be in touch shortly to confirm your appointment. During our call, we'll discuss your experience, therapeutic approach, and how Hive Wellness can support your practice.
          </p>
        </div>
      `;

      return createBrandedEmailTemplate({
        headingText: `Welcome to Our Professional Network, ${therapistName}!`,
        bodyContent,
      });
    },
  },

  therapistWelcomeNext: {
    subject: "Welcome to the Hive Wellness Therapist Network",
    template: (firstName: string) => {
      const bodyContent = `
        <!-- Rounded Content Box -->
        <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
          <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; font-size: 16px; margin: 0;">
            Congratulations on joining the Hive Wellness therapist network. We're excited to have you aboard.
          </p>
        </div>
        
        <!-- Rounded Content Box -->
        <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
          <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
            Getting Started
          </h3>
          <ul style="font-family: 'Open Sans', sans-serif; line-height: 1.8; color: #333; margin: 0; padding-left: 20px;">
            <li>Complete your professional profile</li>
            <li>Set up your availability calendar</li>
            <li>Connect your payment details via Stripe</li>
            <li>Review our clinical guidelines and policies</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://portal.hive-wellness.co.uk/therapist-login" style="background: #9306B1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-family: 'Open Sans', sans-serif; font-weight: 600; display: inline-block; font-size: 16px;">
            Access Therapist Portal
          </a>
        </div>
        
        <p style="font-family: 'Open Sans', sans-serif; line-height: 1.6; color: #333; font-size: 16px; margin: 25px 0 0 0;">
          Need support? Contact our therapist liaison team at 
          <a href="mailto:therapists@hive-wellness.co.uk" style="color: #9306B1; text-decoration: underline;">therapists@hive-wellness.co.uk</a>
        </p>
      `;

      return createBrandedEmailTemplate({
        headingText: `Welcome to Our Professional Network, ${firstName}!`,
        bodyContent,
      });
    },
  },

  appointmentReminder: {
    subject: "Session Reminder - Tomorrow",
    template: (
      clientName: string,
      therapistName: string,
      sessionTime: string,
      sessionLink: string
    ) => {
      const bodyContent = `
        <!-- Rounded Content Box -->
        <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
          <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; font-size: 16px; margin: 0;">
            This is a friendly reminder about your upcoming therapy session.
          </p>
        </div>
        
        <!-- Rounded Content Box -->
        <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
          <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
            Session Details
          </h3>
          <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; margin: 0;">
            <strong>Therapist:</strong> ${therapistName}<br>
            <strong>Date & Time:</strong> ${sessionTime}<br>
            <strong>Duration:</strong> 50 minutes
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${sessionLink}" style="background: #9306B1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-family: 'Open Sans', sans-serif; font-weight: 600; display: inline-block; font-size: 16px;">
            Join Session
          </a>
        </div>
        
        <p style="font-family: 'Open Sans', sans-serif; line-height: 1.6; color: #333; font-size: 14px; margin: 25px 0 0 0;">
          Please join the session 5 minutes early to ensure a smooth start. If you need to reschedule, 
          please contact us at least 24 hours in advance.
        </p>
      `;

      return createBrandedEmailTemplate({
        headingText: "Session Reminder",
        bodyContent,
      });
    },
  },

  therapistPostCallCredentials: {
    subject: "Your Hive Wellness Account is Ready - Access Your Therapist Portal",
    template: (therapistName: string, tempPassword: string, loginEmail: string) => {
      const bodyContent = `
        <!-- Rounded Content Box -->
        <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
          <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; font-size: 16px; margin: 0;">
            Thank you for your introduction call with our team. We're excited to have you join the Hive Wellness therapist network.
          </p>
        </div>
        
        <!-- Rounded Content Box with Purple Background -->
        <div style="background: #9306B1; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
          <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: white; margin: 0 0 15px 0; font-size: 18px;">
            Your Login Credentials
          </h3>
          <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 8px; margin: 15px 0; border: 1px solid rgba(255,255,255,0.2);">
            <p style="font-family: 'Open Sans', sans-serif; color: white; margin: 0 0 12px 0; line-height: 1.6;">
              <strong>Email:</strong> <span style="font-family: 'Courier New', monospace;">${loginEmail}</span>
            </p>
            <p style="font-family: 'Open Sans', sans-serif; color: white; margin: 0; line-height: 1.6;">
              <strong>Temporary Password:</strong> <span style="font-family: 'Courier New', monospace;">${tempPassword}</span>
            </p>
          </div>
          <p style="font-family: 'Open Sans', sans-serif; color: white; margin: 15px 0 0 0; font-size: 14px; line-height: 1.6;">
            <strong>Important:</strong> Please change this temporary password immediately after your first login for security purposes.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://portal.hive-wellness.co.uk/therapist-login" style="background: #9306B1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-family: 'Open Sans', sans-serif; font-weight: 600; display: inline-block; font-size: 16px;">
            Access Therapist Portal
          </a>
        </div>
        
        <!-- Rounded Content Box -->
        <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
          <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
            Next Steps
          </h3>
          <ol style="font-family: 'Open Sans', sans-serif; line-height: 1.8; color: #333; margin: 0; padding-left: 20px;">
            <li>Log in and change your password</li>
            <li>Complete your professional profile and qualifications</li>
            <li>Set up your availability calendar</li>
            <li>Connect your Stripe account for payments (85% revenue share)</li>
            <li>Review and accept our clinical guidelines</li>
          </ol>
        </div>
        
        <p style="font-family: 'Open Sans', sans-serif; line-height: 1.6; color: #333; font-size: 16px; margin: 25px 0 0 0;">
          Our team is here to support you every step of the way. If you have any questions during setup, 
          please contact us at <a href="mailto:therapists@hive-wellness.co.uk" style="color: #9306B1; text-decoration: underline;">therapists@hive-wellness.co.uk</a>
        </p>
      `;

      return createBrandedEmailTemplate({
        headingText: `Welcome to Hive Wellness, ${therapistName}!`,
        bodyContent,
      });
    },
  },

  therapist_workspace_welcome: (variables: {
    firstName: string;
    lastName: string;
    workspaceEmail: string;
    tempPassword: string;
    calendarUrl: string;
    portalUrl: string;
    supportEmail: string;
  }) => {
    const bodyContent = `
      <!-- Rounded Content Box -->
      <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
        <p style="font-family: 'Open Sans', sans-serif; line-height: 1.7; color: #333; font-size: 16px; margin: 0;">
          Congratulations! Your therapist application has been approved and we're excited to welcome you to the Hive Wellness team. We've created your professional Google Workspace account and dedicated calendar system to support your practice.
        </p>
      </div>
      
      <!-- Rounded Content Box with Purple Background -->
      <div style="background: #9306B1; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
        <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: white; margin: 0 0 15px 0; font-size: 18px;">
          Your Professional Account Details
        </h3>
        <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 8px; margin: 15px 0; border: 1px solid rgba(255,255,255,0.2);">
          <p style="font-family: 'Open Sans', sans-serif; color: white; margin: 0 0 12px 0; line-height: 1.6;">
            <strong>Professional Email:</strong><br>
            <span style="font-family: 'Courier New', monospace;">${variables.workspaceEmail}</span>
          </p>
          <p style="font-family: 'Open Sans', sans-serif; color: white; margin: 0; line-height: 1.6;">
            <strong>Temporary Password:</strong><br>
            <span style="font-family: 'Courier New', monospace;">${variables.tempPassword}</span>
          </p>
        </div>
        <p style="font-family: 'Open Sans', sans-serif; color: white; margin: 15px 0 0 0; font-size: 14px; line-height: 1.6;">
          <strong>Security Notice:</strong> You'll be required to change this password on your first login for security.
        </p>
      </div>
      
      <!-- Rounded Content Box -->
      <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
        <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
          What's Been Set Up For You
        </h3>
        <ul style="font-family: 'Open Sans', sans-serif; line-height: 1.8; color: #333; margin: 0; padding-left: 20px;">
          <li>Professional email account (@hive-wellness.co.uk)</li>
          <li>Dedicated therapy calendar for client bookings</li>
          <li>Secure Google Workspace access</li>
          <li>Integration with Hive Wellness booking system</li>
          <li>Professional email signature setup</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://mail.google.com" style="background: #9306B1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-family: 'Open Sans', sans-serif; font-weight: 600; display: inline-block; font-size: 15px; margin: 5px;">
          Access Your Email
        </a>
        <a href="${variables.calendarUrl}" style="background: #9306B1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-family: 'Open Sans', sans-serif; font-weight: 600; display: inline-block; font-size: 15px; margin: 5px;">
          View Your Calendar
        </a>
      </div>
      
      <!-- Rounded Content Box -->
      <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e9ecef;">
        <h3 style="font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; color: #9306B1; margin: 0 0 15px 0; font-size: 18px;">
          Next Steps to Complete Your Setup
        </h3>
        <ol style="font-family: 'Open Sans', sans-serif; line-height: 1.8; color: #333; margin: 0; padding-left: 20px;">
          <li>Log into your Google Workspace account and change your password</li>
          <li>Complete your therapist profile in the <a href="${variables.portalUrl}" style="color: #9306B1; text-decoration: underline;">Hive Wellness portal</a></li>
          <li>Upload your professional documents and certifications</li>
          <li>Set your availability preferences in your calendar</li>
          <li>Review and accept our therapist agreement</li>
          <li>Complete Stripe Connect setup for payments</li>
        </ol>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${variables.portalUrl}" style="background: #9306B1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-family: 'Open Sans', sans-serif; font-weight: 600; display: inline-block; font-size: 16px;">
          Complete Your Setup
        </a>
      </div>
      
      <p style="font-family: 'Open Sans', sans-serif; line-height: 1.6; color: #333; font-size: 16px; margin: 25px 0 0 0; text-align: center;">
        We're thrilled to have you join our network of professional therapists. Together, we're making mental health support more accessible and effective for everyone.
      </p>
    `;

    return createBrandedEmailTemplate({
      headingText: `Welcome to Your Professional Workspace, Dr. ${variables.firstName} ${variables.lastName}!`,
      bodyContent,
    });
  },
};
