import express from "express";
import { googleWorkspaceAdminService } from "../google-workspace-admin-service";
import { storage } from "../storage";
import { nanoid } from "nanoid";
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";

const router = express.Router();

// Validation schemas
const createAccountSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  tempPassword: z.string().optional()
});

const deleteAccountSchema = z.object({
  workspaceEmail: z.string().email()
});

/**
 * Test Google Admin SDK authentication and permissions
 */
router.get("/test-auth", isAuthenticated, async (req, res) => {
  try {
    console.log("🧪 Testing Google Admin SDK authentication...");
    
    // Basic account creation test
    const testSuccess = await googleWorkspaceAdminService.testAccountCreation();
    
    res.json({
      success: true,
      authenticated: testSuccess,
      message: testSuccess 
        ? "Google Admin SDK authentication successful"
        : "Google Admin SDK authentication failed",
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error("❌ Auth test failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Create a Google Workspace account for a therapist
 */
router.post("/create-account", isAuthenticated, async (req, res) => {
  try {
    const { firstName, lastName, email, tempPassword } = createAccountSchema.parse(req.body);
    
    console.log(`🚀 Creating workspace account for: ${firstName} ${lastName}`);
    
    // Create the workspace account
    const result = await googleWorkspaceAdminService.createTherapistAccount({
      firstName,
      lastName,
      email,
      tempPassword
    });
    
    if (result.accountCreated) {
      // Store the result in database if we have a therapist profile
      // This would typically be done as part of therapist onboarding
      console.log(`✅ Workspace account created: ${result.workspaceEmail}`);
      
      res.json({
        success: true,
        data: {
          workspaceEmail: result.workspaceEmail,
          calendarId: result.calendarId,
          accountCreated: result.accountCreated,
          tempPassword: result.tempPassword // Only for testing - remove in production
        },
        message: "Therapist workspace account created successfully"
      });
    } else {
      res.status(400).json({
        success: false,
        error: "Failed to create workspace account",
        message: "Account creation failed - check logs for details"
      });
    }
    
  } catch (error: any) {
    console.error("❌ Account creation failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to create therapist workspace account"
    });
  }
});

/**
 * Delete a therapist's Google Workspace account
 */
router.delete("/delete-account", isAuthenticated, async (req, res) => {
  try {
    const { workspaceEmail } = deleteAccountSchema.parse(req.body);
    
    console.log(`🗑️ Deleting workspace account: ${workspaceEmail}`);
    
    const deleted = await googleWorkspaceAdminService.deleteTherapistAccount(workspaceEmail);
    
    if (deleted) {
      res.json({
        success: true,
        message: `Workspace account ${workspaceEmail} deleted successfully`
      });
    } else {
      res.status(400).json({
        success: false,
        error: "Failed to delete workspace account",
        message: "Account deletion failed - check logs for details"
      });
    }
    
  } catch (error: any) {
    console.error("❌ Account deletion failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to delete workspace account"
    });
  }
});

/**
 * Get account status for a therapist
 */
router.get("/account-status/:email", isAuthenticated, async (req, res) => {
  try {
    const email = req.params.email;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: "Invalid email parameter"
      });
    }
    
    console.log(`📊 Getting account status for: ${email}`);
    
    const status = await googleWorkspaceAdminService.getAccountStatus(email);
    
    res.json({
      success: true,
      data: status,
      message: `Account status retrieved for ${email}`
    });
    
  } catch (error: any) {
    console.error("❌ Failed to get account status:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to retrieve account status"
    });
  }
});

/**
 * Test endpoint for environment configuration check
 */
router.get("/environment-check", isAuthenticated, async (req, res) => {
  try {
    const requiredEnvVars = [
      'GOOGLE_SERVICE_ACCOUNT_KEY',
      'GOOGLE_WORKSPACE_DOMAIN',
      'GOOGLE_ADMIN_EMAIL'
    ];
    
    const envStatus = requiredEnvVars.reduce((acc, envVar) => {
      acc[envVar] = !!process.env[envVar];
      return acc;
    }, {} as Record<string, boolean>);
    
    const allConfigured = Object.values(envStatus).every(Boolean);
    
    res.json({
      success: allConfigured,
      environment: {
        ...envStatus,
        domain: process.env.GOOGLE_WORKSPACE_DOMAIN || 'Not configured',
        adminEmail: process.env.GOOGLE_ADMIN_EMAIL || 'Not configured'
      },
      message: allConfigured 
        ? "All required environment variables are configured" 
        : "Some required environment variables are missing",
      requiredVariables: requiredEnvVars
    });
    
  } catch (error: any) {
    console.error("❌ Environment check failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to check environment configuration"
    });
  }
});

/**
 * Initialize Google Admin SDK services
 */
router.post("/initialize", isAuthenticated, async (req, res) => {
  try {
    console.log("🚀 Initializing Google Admin SDK services...");
    
    // This would reinitialize the service (useful for config changes)
    // For now, just test the current initialization
    const testSuccess = await googleWorkspaceAdminService.testAccountCreation();
    
    res.json({
      success: testSuccess,
      message: testSuccess 
        ? "Google Admin SDK services initialized successfully"
        : "Google Admin SDK initialization failed",
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error("❌ Service initialization failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to initialize Google Admin SDK services"
    });
  }
});

export default router;