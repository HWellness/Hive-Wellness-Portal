import { TOTP, Secret } from "otpauth";
import { createHash, randomBytes } from "crypto";
import QRCode from "qrcode";

export interface TOTPSetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

export interface TOTPVerificationResult {
  success: boolean;
  error?: string;
}

export class TOTPService {
  private readonly issuer = "Hive Wellness";
  private readonly algorithm = "SHA1";
  private readonly digits = 6;
  private readonly period = 30;

  /**
   * Generate a new TOTP secret and setup data for a user
   */
  async generateTOTPSetup(userEmail: string): Promise<TOTPSetupResult> {
    try {
      // Generate a random secret
      const secret = new Secret();

      // Create TOTP instance
      const totp = new TOTP({
        issuer: this.issuer,
        label: userEmail,
        algorithm: this.algorithm,
        digits: this.digits,
        period: this.period,
        secret: secret,
      });

      // Generate the provisioning URI for QR code
      const uri = totp.toString();

      // Generate QR code as data URL
      const qrCodeUrl = await QRCode.toDataURL(uri, {
        errorCorrectionLevel: "M",
        type: "image/png",
        quality: 0.92,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        width: 256,
      });

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Return the manual entry key (base32 secret)
      const manualEntryKey = secret.base32;

      return {
        secret: secret.base32,
        qrCodeUrl,
        backupCodes,
        manualEntryKey,
      };
    } catch (error) {
      console.error("Error generating TOTP setup:", error);
      throw new Error("Failed to generate TOTP setup data");
    }
  }

  /**
   * Verify a TOTP code against a secret
   */
  verifyTOTP(token: string, secret: string): TOTPVerificationResult {
    try {
      // Clean the token (remove spaces, etc.)
      const cleanToken = token.replace(/\s/g, "");

      // Validate token format
      if (!/^\d{6}$/.test(cleanToken)) {
        return {
          success: false,
          error: "Invalid token format. Please enter a 6-digit code.",
        };
      }

      // Create TOTP instance from secret
      const totp = new TOTP({
        issuer: this.issuer,
        algorithm: this.algorithm,
        digits: this.digits,
        period: this.period,
        secret: Secret.fromBase32(secret),
      });

      // Verify the token with a window of ±1 period (30 seconds)
      // This allows for small clock drift between devices
      const delta = totp.validate({
        token: cleanToken,
        window: 1, // Allow ±30 seconds
      });

      if (delta !== null) {
        return { success: true };
      } else {
        return {
          success: false,
          error: "Invalid or expired verification code. Please try again.",
        };
      }
    } catch (error) {
      console.error("Error verifying TOTP:", error);
      return {
        success: false,
        error: "Failed to verify code. Please try again.",
      };
    }
  }

  /**
   * Verify a backup code against stored hashed codes
   */
  verifyBackupCode(
    code: string,
    hashedCodes: string[]
  ): { success: boolean; remainingCodes: string[]; error?: string } {
    try {
      // Clean the code (remove spaces and hyphens, convert to uppercase for base32)
      const cleanCode = code.replace(/[\s-]/g, "").toUpperCase();

      // Validate format (12 characters, base32)
      if (!/^[A-Z2-7]{12}$/.test(cleanCode)) {
        return {
          success: false,
          remainingCodes: hashedCodes,
          error: "Invalid backup code format. Codes are 12 characters in base32 format.",
        };
      }

      // Hash the provided code
      const providedHash = this.hashBackupCode(cleanCode);

      // Check if the hash matches any stored code
      const matchIndex = hashedCodes.findIndex((hash) => hash === providedHash);

      if (matchIndex !== -1) {
        // Remove the used code from the list
        const remainingCodes = hashedCodes.filter((_, index) => index !== matchIndex);

        return {
          success: true,
          remainingCodes,
        };
      } else {
        return {
          success: false,
          remainingCodes: hashedCodes,
          error: "Invalid backup code or code already used.",
        };
      }
    } catch (error) {
      console.error("Error verifying backup code:", error);
      return {
        success: false,
        remainingCodes: hashedCodes,
        error: "Failed to verify backup code. Please try again.",
      };
    }
  }

  /**
   * Generate new backup codes (typically when user runs out)
   * Increased to 12-character base32 codes for ~60-bit entropy
   */
  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; // Base32 charset

    for (let i = 0; i < count; i++) {
      // Generate 12-character base32 code (~60-bit entropy) using crypto-secure randomness
      const bytes = randomBytes(12);
      let code = "";

      // Convert bytes to base32 using unbiased selection
      for (let j = 0; j < 12; j++) {
        const randomIndex = bytes[j] % charset.length;
        code += charset[randomIndex];
      }
      // Format as XXXX-XXXX-XXXX for better readability
      const formattedCode = code.match(/.{1,4}/g)?.join("-") || code;
      codes.push(formattedCode);
    }

    return codes;
  }

  /**
   * Hash backup codes for secure storage
   */
  hashBackupCodes(codes: string[]): string[] {
    return codes.map((code) => this.hashBackupCode(code));
  }

  /**
   * Hash a single backup code
   * Normalizes code by removing hyphens and converting to uppercase
   */
  private hashBackupCode(code: string): string {
    const normalizedCode = code.replace(/[-\s]/g, "").toUpperCase();
    return createHash("sha256").update(normalizedCode).digest("hex");
  }

  /**
   * Generate a current TOTP code (for testing purposes)
   */
  generateCurrentCode(secret: string): string {
    const totp = new TOTP({
      issuer: this.issuer,
      algorithm: this.algorithm,
      digits: this.digits,
      period: this.period,
      secret: Secret.fromBase32(secret),
    });

    return totp.generate();
  }

  /**
   * Get time remaining until next code
   */
  getTimeRemaining(): number {
    const now = Math.floor(Date.now() / 1000);
    return this.period - (now % this.period);
  }

  /**
   * Validate secret format
   */
  isValidSecret(secret: string): boolean {
    try {
      Secret.fromBase32(secret);
      return true;
    } catch {
      return false;
    }
  }
}

export const totpService = new TOTPService();
