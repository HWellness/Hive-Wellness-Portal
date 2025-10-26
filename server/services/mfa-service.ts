import { TOTP, Secret } from 'otpauth';
import * as base32 from 'hi-base32';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

export type MFAMethod = 'totp' | 'sms' | 'email';

export interface MFASetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  hashedBackupCodes: string[];
}

export interface MFAVerificationResult {
  isValid: boolean;
  usedBackupCode?: boolean;
  method?: MFAMethod;
}

export interface MFAStatusResult {
  enabled: boolean;
  availableMethods: MFAMethod[];
  preferredMethod?: MFAMethod;
  hasBackupCodes: boolean;
  backupCodesCount: number;
}

export class MFAService {
  private readonly issuer = 'Hive Wellness';
  
  /**
   * Generate a new TOTP secret and QR code for MFA setup
   */
  async generateMFASetup(userEmail: string, userName?: string): Promise<MFASetupResult> {
    // Generate cryptographically secure secret
    const secret = new Secret();
    const secretBase32 = secret.base32;
    
    // Create TOTP instance
    const totp = new TOTP({
      issuer: this.issuer,
      label: userName || userEmail,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secretBase32,
    });
    
    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(totp.toString());
    
    // Generate backup codes with hashing
    const { codes: backupCodes, hashedCodes } = this.generateBackupCodes();
    
    return {
      secret: secretBase32,
      qrCodeUrl,
      backupCodes, // Return cleartext codes to user for download
      hashedBackupCodes: hashedCodes // Return hashed codes for database storage
    };
  }
  
  /**
   * Verify a TOTP token or backup code using hashed backup codes (TOTP-specific method)
   */
  verifyTOTPToken(secret: string, token: string, hashedBackupCodes: string[] = []): MFAVerificationResult {
    // First try TOTP verification
    const totp = new TOTP({
      secret,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });
    
    // Allow 1 time step before/after for clock drift tolerance
    const totpResult = totp.validate({ 
      token: token.replace(/\s/g, ''), // Remove any spaces
      window: 1 
    });
    
    if (totpResult !== null) {
      return { isValid: true, usedBackupCode: false, method: 'totp' };
    }
    
    // If TOTP fails, try backup codes (compare against hashed values)
    const normalizedToken = token.replace(/\s|-/g, '').toLowerCase();
    const tokenHash = crypto.createHash('sha256').update(normalizedToken).digest('hex');
    
    const isBackupCodeValid = hashedBackupCodes.some(hashedCode => hashedCode === tokenHash);
    
    if (isBackupCodeValid) {
      return { isValid: true, usedBackupCode: true, method: 'totp' };
    }
    
    return { isValid: false };
  }

  /**
   * Legacy method for backward compatibility
   */
  verifyMFAToken(secret: string, token: string, hashedBackupCodes: string[] = []): MFAVerificationResult {
    return this.verifyTOTPToken(secret, token, hashedBackupCodes);
  }

  /**
   * Verify MFA token using multiple methods - core multi-method verification
   */
  async verifyMultiMethodMFA(
    user: any, 
    token: string, 
    method?: MFAMethod,
    smsMfaService?: any,
    emailMfaService?: any
  ): Promise<MFAVerificationResult> {
    const availableMethods = this.getAvailableMethods(user);
    
    if (availableMethods.length === 0) {
      return { isValid: false };
    }

    // If specific method requested, try that first
    if (method && availableMethods.includes(method)) {
      const result = await this.verifySingleMethod(user, token, method, smsMfaService, emailMfaService);
      if (result.isValid) {
        return result;
      }
    }

    // Try preferred method if no specific method or if specific method failed
    const preferredMethod = this.getPreferredMethod(user);
    if (preferredMethod && (!method || method !== preferredMethod)) {
      const result = await this.verifySingleMethod(user, token, preferredMethod, smsMfaService, emailMfaService);
      if (result.isValid) {
        return result;
      }
    }

    // Try all other available methods
    for (const availableMethod of availableMethods) {
      if (availableMethod !== method && availableMethod !== preferredMethod) {
        const result = await this.verifySingleMethod(user, token, availableMethod, smsMfaService, emailMfaService);
        if (result.isValid) {
          return result;
        }
      }
    }

    return { isValid: false };
  }

  /**
   * Verify token for a single specific method
   */
  private async verifySingleMethod(
    user: any, 
    token: string, 
    method: MFAMethod,
    smsMfaService?: any,
    emailMfaService?: any
  ): Promise<MFAVerificationResult> {
    switch (method) {
      case 'totp':
        if (user.totpSecret) {
          return this.verifyTOTPToken(user.totpSecret, token, user.backupCodes || []);
        }
        break;

      case 'sms':
        if (smsMfaService && user.smsVerificationCode && user.smsCodeExpires) {
          const isValid = smsMfaService.verifySMSCode(token, user.smsVerificationCode);
          const isExpired = smsMfaService.isCodeExpired(new Date(user.smsCodeExpires));
          
          if (isValid && !isExpired) {
            return { isValid: true, method: 'sms' };
          }
        }
        break;

      case 'email':
        if (emailMfaService && user.emailVerificationCode && user.emailCodeExpires) {
          const isValid = emailMfaService.verifyEmailCode(token, user.emailVerificationCode);
          const isExpired = emailMfaService.isCodeExpired(new Date(user.emailCodeExpires));
          
          if (isValid && !isExpired) {
            return { isValid: true, method: 'email' };
          }
        }
        break;
    }

    return { isValid: false };
  }
  
  /**
   * Generate secure backup recovery codes with hashing
   */
  generateBackupCodes(count: number = 10): { codes: string[], hashedCodes: string[] } {
    const codes = Array.from({ length: count }, () => {
      // Generate 8-character codes in format: XXXX-XXXX
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      return `${part1}-${part2}`;
    });
    
    // Hash all codes for secure storage
    const hashedCodes = codes.map(code => 
      crypto.createHash('sha256').update(code.toLowerCase().replace(/-/g, '')).digest('hex')
    );
    
    return { codes, hashedCodes };
  }
  
  /**
   * Remove a used backup code hash from the array atomically
   */
  removeUsedBackupCode(hashedBackupCodes: string[], usedCode: string): string[] {
    const normalizedUsedCode = usedCode.replace(/\s|-/g, '').toLowerCase();
    const usedCodeHash = crypto.createHash('sha256').update(normalizedUsedCode).digest('hex');
    
    // Filter out the used code hash
    return hashedBackupCodes.filter(hashedCode => hashedCode !== usedCodeHash);
  }
  
  /**
   * Validate that a secret is properly formatted
   */
  isValidSecret(secret: string): boolean {
    try {
      // Try to create TOTP with the secret
      new TOTP({ secret });
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Generate current TOTP code for testing/demo purposes
   */
  generateCurrentCode(secret: string): string {
    const totp = new TOTP({ secret });
    return totp.generate();
  }

  /**
   * Get available MFA methods for a user based on their actual configuration
   */
  getAvailableMethods(user: any): MFAMethod[] {
    // Create a copy to avoid mutating the original user data
    const enabledMethods = [...(user.mfaMethods || [])];
    const availableMethods: MFAMethod[] = [];
    
    // Legacy support: If user has TOTP enabled but no mfaMethods array, infer TOTP
    // This doesn't mutate the original user object
    const hasLegacyTOTP = enabledMethods.length === 0 && user.mfaEnabled && user.totpSecret;
    if (hasLegacyTOTP) {
      enabledMethods.push('totp');
    }
    
    // Check each enabled method and verify it's properly configured
    for (const method of enabledMethods) {
      switch (method) {
        case 'totp':
          // TOTP is available if user has a secret (legacy or explicit)
          if (user.totpSecret && (user.mfaEnabled || enabledMethods.includes('totp'))) {
            availableMethods.push('totp');
          }
          break;
        case 'sms':
          // SMS is available if user has a verified phone number
          if (user.phoneNumber && user.phoneVerified) {
            availableMethods.push('sms');
          }
          break;
        case 'email':
          // Email is available only if explicitly enabled AND verified
          // Check for proper verification state
          if (user.email && enabledMethods.includes('email') && this.isEmailMFAVerified(user)) {
            availableMethods.push('email');
          }
          break;
      }
    }
    
    return availableMethods;
  }

  /**
   * Check if email MFA is properly verified for a user
   */
  private isEmailMFAVerified(user: any): boolean {
    // Email MFA is verified if:
    // 1. User has emailMfaVerified flag set to true, OR
    // 2. User is in the middle of verification process (has pending codes)
    return user.emailMfaVerified === true || 
           (user.emailVerificationCode && user.emailCodeExpires);
  }

  /**
   * Get potentially configurable MFA methods for a user (what they could enable)
   */
  getConfigurableMethods(user: any): MFAMethod[] {
    const methods: MFAMethod[] = [];
    
    // TOTP can be configured if user doesn't already have it or if they do
    methods.push('totp');
    
    // SMS can be configured if user has or can add a phone number
    methods.push('sms');
    
    // Email can always be configured (all users have email)
    methods.push('email');
    
    return methods;
  }

  /**
   * Get preferred MFA method for a user, fallback to first available
   */
  getPreferredMethod(user: any): MFAMethod | null {
    const availableMethods = this.getAvailableMethods(user);
    
    if (availableMethods.length === 0) {
      return null;
    }
    
    // Use user's preferred method if it's available
    if (user.preferredMfaMethod && availableMethods.includes(user.preferredMfaMethod)) {
      return user.preferredMfaMethod;
    }
    
    // Default preference order: TOTP > SMS > Email
    const preferenceOrder: MFAMethod[] = ['totp', 'sms', 'email'];
    
    for (const method of preferenceOrder) {
      if (availableMethods.includes(method)) {
        return method;
      }
    }
    
    return availableMethods[0] || null;
  }

  /**
   * Check if a user has any MFA methods configured
   */
  hasAnyMFAMethods(user: any): boolean {
    return this.getAvailableMethods(user).length > 0;
  }

  /**
   * Get MFA status for a user
   */
  getMFAStatus(user: any): MFAStatusResult {
    const availableMethods = this.getAvailableMethods(user);
    const preferredMethod = this.getPreferredMethod(user);
    
    // MFA is enabled if user has any available methods
    // This supports multi-method MFA beyond just TOTP
    const isEnabled = availableMethods.length > 0;
    
    return {
      enabled: isEnabled,
      availableMethods,
      preferredMethod: preferredMethod || undefined,
      hasBackupCodes: !!(user.backupCodes?.length),
      backupCodesCount: user.backupCodes?.length || 0
    };
  }

  /**
   * Verify if a specific MFA method is enabled for a user
   */
  isMethodEnabled(user: any, method: MFAMethod): boolean {
    const availableMethods = this.getAvailableMethods(user);
    return availableMethods.includes(method);
  }

  /**
   * Get display name for MFA method
   */
  getMethodDisplayName(method: MFAMethod): string {
    switch (method) {
      case 'totp':
        return 'Authenticator App (TOTP)';
      case 'sms':
        return 'SMS Text Message';
      case 'email':
        return 'Email Verification';
      default:
        return method.toUpperCase();
    }
  }

  /**
   * Validate MFA method combination
   */
  validateMethodCombination(methods: MFAMethod[]): { isValid: boolean; message?: string } {
    if (methods.length === 0) {
      return { isValid: false, message: 'At least one MFA method must be enabled' };
    }

    // Check for valid method names
    const validMethods: MFAMethod[] = ['totp', 'sms', 'email'];
    const invalidMethods = methods.filter(m => !validMethods.includes(m));
    
    if (invalidMethods.length > 0) {
      return { 
        isValid: false, 
        message: `Invalid MFA methods: ${invalidMethods.join(', ')}` 
      };
    }

    return { isValid: true };
  }
}