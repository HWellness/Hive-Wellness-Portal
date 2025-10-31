import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { MFAService } from "../services/mfa-service";
import { SMSMFAService } from "../services/sms-mfa-service";
import { EmailMFAService } from "../services/email-mfa-service";

const router = Router();

// MFA Verification during login flow
router.post("/verify-login", async (req: Request, res: Response) => {
  try {
    const { token, method } = req.body;
    const session = req.session as any;

    // Check if MFA verification is needed
    if (!session.needsMfaVerification || !session.mfaUserId) {
      return res.status(400).json({
        success: false,
        message: "MFA verification not required",
      });
    }

    // Get user from database
    const user = await storage.getUserById(session.mfaUserId);
    if (!user || !user.mfaEnabled) {
      return res.status(400).json({
        success: false,
        message: "MFA not enabled for this user",
      });
    }

    // Initialize MFA services
    const mfaService = new MFAService();
    const smsMfaService = new SMSMFAService();
    const emailMfaService = new EmailMFAService();

    // Verify the token
    const verificationResult = await mfaService.verifyMultiMethodMFA(
      user,
      token,
      method as any,
      smsMfaService,
      emailMfaService
    );

    if (!verificationResult.isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid MFA code",
      });
    }

    // If backup code was used, remove it from the database
    if (verificationResult.usedBackupCode) {
      await mfaService.removeUsedBackupCode(user.id, token, storage);
    }

    // Update last login timestamp
    await storage.updateUserLastLogin(user.id);

    // Create authenticated session (excluding password)
    const sessionUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      profileComplete: user.profileComplete,
      profileData: user.profileData,
    };

    // Set session user for email/password authentication
    session.emailAuthUser = sessionUser;

    // Clear the MFA requirement flags and set verification timestamp
    delete session.needsMfaVerification;
    delete session.mfaUserId;
    session.mfaVerifiedAt = Date.now();

    res.json({
      success: true,
      message: "MFA verification successful",
      user: sessionUser,
      usedBackupCode: verificationResult.usedBackupCode || false,
    });
  } catch (error) {
    console.error("MFA verification error:", error);
    res.status(500).json({
      success: false,
      message: "MFA verification failed",
    });
  }
});

// Get MFA status for current session
router.get("/status", async (req: Request, res: Response) => {
  try {
    const session = req.session as any;

    if (!session.needsMfaVerification) {
      return res.json({
        required: false,
        verified: true,
      });
    }

    const user = await storage.getUserById(session.mfaUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      required: true,
      verified: false,
      availableMethods: user.mfaMethods || ["totp"],
      preferredMethod: user.mfaMethods?.[0] || "totp",
    });
  } catch (error) {
    console.error("MFA status check error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check MFA status",
    });
  }
});

export default router;
