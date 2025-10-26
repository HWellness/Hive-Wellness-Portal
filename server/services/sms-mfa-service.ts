import * as crypto from 'crypto';
import twilio, { Twilio } from 'twilio';

export interface SMSMFASetupResult {
  phoneNumber: string;
  verificationCodeSent: boolean;
}

export interface SMSMFAVerificationResult {
  isValid: boolean;
  phoneVerified?: boolean;
}

export interface SMSSendResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  messageSid?: string;
}

export class SMSMFAService {
  private twilio: Twilio | null = null;
  private initialized: boolean = false;
  private initError: string | null = null;
  
  constructor() {
    this.initializeTwilio();
  }

  private initializeTwilio() {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !fromNumber) {
        this.initError = 'Twilio credentials not configured. Missing: ' +
          (!accountSid ? 'TWILIO_ACCOUNT_SID ' : '') +
          (!authToken ? 'TWILIO_AUTH_TOKEN ' : '') +
          (!fromNumber ? 'TWILIO_PHONE_NUMBER' : '');
        console.error('🚨 SMS MFA Service initialization failed:', this.initError);
        return;
      }

      this.twilio = twilio(accountSid, authToken);
      this.initialized = true;
      console.log('✅ SMS MFA Service initialized successfully with number:', fromNumber);
    } catch (error: any) {
      this.initError = `Twilio initialization error: ${error.message}`;
      console.error('🚨 SMS MFA Service initialization failed:', error);
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getInitError(): string | null {
    return this.initError;
  }

  /**
   * Generate a 6-digit SMS verification code
   */
  generateSMSCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Hash a verification code for secure storage
   */
  hashCode(code: string): string {
    return crypto.createHash('sha256').update(code.toLowerCase()).digest('hex');
  }

  /**
   * Normalize phone number to E.164 format
   */
  normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except +
    let normalized = phoneNumber.replace(/[^\d+]/g, '');
    
    // If no country code, assume UK (+44)
    if (!normalized.startsWith('+')) {
      if (normalized.startsWith('0')) {
        // UK mobile number starting with 0
        normalized = '+44' + normalized.substring(1);
      } else {
        // Assume it needs UK country code
        normalized = '+44' + normalized;
      }
    }
    
    return normalized;
  }

  /**
   * Send SMS verification code to phone number
   * Returns detailed result including success status and error information
   */
  async sendSMSCode(phoneNumber: string, code: string): Promise<SMSSendResult> {
    try {
      // Check if service is initialized
      if (!this.initialized || !this.twilio) {
        const error = this.initError || 'SMS service not initialized';
        console.error('🚨 Cannot send SMS:', error);
        return {
          success: false,
          error: error,
          errorCode: 'SERVICE_NOT_INITIALIZED'
        };
      }

      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      console.log(`📱 Sending SMS to ${normalizedPhone}...`);

      // Always send real SMS via Twilio
      const message = await this.twilio.messages.create({
        body: `Your Hive Wellness verification code is: ${code}. This code expires in 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: normalizedPhone,
      });

      console.log(`✅ SMS sent successfully to ${normalizedPhone}: ${message.sid}`);
      return {
        success: true,
        messageSid: message.sid
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      const errorCode = error.code || 'UNKNOWN_ERROR';
      
      console.error('🚨 SMS sending error:', {
        error: errorMessage,
        code: errorCode,
        status: error.status,
        moreInfo: error.moreInfo
      });

      return {
        success: false,
        error: `Twilio error: ${errorMessage}`,
        errorCode: errorCode
      };
    }
  }

  /**
   * Verify SMS code against stored hash
   */
  verifySMSCode(providedCode: string, storedHashedCode: string): boolean {
    const providedHash = this.hashCode(providedCode.replace(/\s/g, ''));
    return providedHash === storedHashedCode;
  }

  /**
   * Check if SMS code has expired
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

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phoneNumber: string): boolean {
    try {
      const normalized = this.normalizePhoneNumber(phoneNumber);
      // Basic E.164 validation: starts with +, 7-15 digits total
      return /^\+[1-9]\d{6,14}$/.test(normalized);
    } catch {
      return false;
    }
  }
}