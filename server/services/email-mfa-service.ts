import * as crypto from 'crypto';
import sgMail from '@sendgrid/mail';

export interface EmailMFASetupResult {
  email: string;
  verificationCodeSent: boolean;
}

export interface EmailMFAVerificationResult {
  isValid: boolean;
}

export class EmailMFAService {
  
  constructor() {
    // Initialize SendGrid with API key
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  /**
   * Generate a 6-digit email verification code
   */
  generateEmailCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Hash a verification code for secure storage
   */
  hashCode(code: string): string {
    return crypto.createHash('sha256').update(code.toLowerCase()).digest('hex');
  }

  /**
   * Send email verification code
   */
  async sendEmailCode(email: string, code: string, firstName?: string): Promise<boolean> {
    try {
      const msg = {
        to: email,
        from: {
          email: 'noreply@hive-wellness.co.uk',
          name: 'Hive Wellness Security'
        },
        subject: 'Your Hive Wellness Verification Code',
        html: this.generateEmailTemplate(code, firstName),
        text: `Your Hive Wellness verification code is: ${code}. This code expires in 10 minutes.`
      };

      await sgMail.send(msg);
      console.log(`📧 Email verification code sent to ${email}`);
      return true;
    } catch (error: any) {
      console.error('Email sending error:', error);
      
      // Fallback: Log code for development (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔑 Development mode - Email code for ${email}: ${code}`);
      }
      
      return false;
    }
  }

  /**
   * Generate HTML email template for verification code
   */
  private generateEmailTemplate(code: string, firstName?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Hive Wellness Verification</title>
        <style>
          body {
            font-family: 'Open Sans', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #9306B1, #7B1FA2);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .content {
            background: white;
            padding: 30px;
            border: 1px solid #ddd;
            border-radius: 0 0 8px 8px;
          }
          .code-container {
            background: #f8f9fa;
            border: 2px solid #9306B1;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
          }
          .code {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 4px;
            color: #9306B1;
            font-family: monospace;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 14px;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🐝 Hive Wellness</div>
          <p>Multi-Factor Authentication</p>
        </div>
        
        <div class="content">
          ${firstName ? `<p>Hello ${firstName},</p>` : '<p>Hello,</p>'}
          
          <p>You've requested a verification code for your Hive Wellness account. Please use the code below to complete your authentication:</p>
          
          <div class="code-container">
            <div class="code">${code}</div>
            <p style="margin: 10px 0 0 0; color: #666;">Enter this code in the verification window</p>
          </div>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <ul style="margin: 10px 0;">
              <li>This code expires in 10 minutes</li>
              <li>Never share this code with anyone</li>
              <li>Hive Wellness will never ask for this code via phone or email</li>
            </ul>
          </div>
          
          <p>If you didn't request this code, please contact our support team immediately at <a href="mailto:support@hive-wellness.co.uk">support@hive-wellness.co.uk</a>.</p>
          
          <p>Thank you for keeping your account secure.</p>
          
          <p>Best regards,<br>
          The Hive Wellness Security Team</p>
        </div>
        
        <div class="footer">
          <p>This is an automated security message from Hive Wellness.<br>
          Please do not reply to this email.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Verify email code against stored hash
   */
  verifyEmailCode(providedCode: string, storedHashedCode: string): boolean {
    const providedHash = this.hashCode(providedCode.replace(/\s/g, ''));
    return providedHash === storedHashedCode;
  }

  /**
   * Check if email code has expired
   */
  isCodeExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Get code expiration time (10 minutes from now)
   */
  getCodeExpiration(): Date {
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 10);
    return expiration;
  }
}