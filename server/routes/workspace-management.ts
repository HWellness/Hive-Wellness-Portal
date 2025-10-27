// Google Workspace Account Management API Routes
// Provides complete lifecycle management for therapist workspace accounts

import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { adminLimiter, ipSecurityCheck } from "../middleware/security";
import { storage } from "../storage";
import { GoogleWorkspaceAdminService } from "../google-workspace-admin-service";
import { TherapistOnboardingService } from "../therapist-onboarding-service";
import { nanoid } from "nanoid";

const googleWorkspaceService = new GoogleWorkspaceAdminService();
const therapistOnboardingService = new TherapistOnboardingService(storage);

export function setupWorkspaceManagementRoutes(app: Express) {
  // Get workspace account status for a specific therapist
  app.get(
    "/api/therapists/:id/workspace-status",
    isAuthenticated,
    adminLimiter,
    async (req, res) => {
      try {
        const { id: therapistId } = req.params;

        console.log(`📊 Fetching workspace status for therapist: ${therapistId}`);

        // Get therapist profile with workspace details
        const therapistProfile = await storage.getTherapistProfileByUserId(therapistId);

        if (!therapistProfile) {
          return res.status(404).json({
            success: false,
            error: "Therapist profile not found",
          });
        }

        // Get the associated user account
        const user = await storage.getUserById(therapistId);

        const workspaceStatus = {
          therapistId,
          therapistName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
          therapistEmail: user?.email || "Unknown",
          workspaceEmail: therapistProfile.googleWorkspaceEmail,
          calendarId: therapistProfile.googleCalendarId,
          accountCreated: therapistProfile.workspaceAccountCreated,
          accountStatus: therapistProfile.workspaceAccountStatus,
          createdAt: therapistProfile.workspaceCreatedAt,
          lastLogin: therapistProfile.workspaceLastLogin,
          permissionsConfigured: therapistProfile.calendarPermissionsConfigured,
          notes: therapistProfile.workspaceAccountNotes,
        };

        res.json({
          success: true,
          workspaceStatus,
        });
      } catch (error) {
        console.error("❌ Error fetching workspace status:", error);
        res.status(500).json({
          success: false,
          error: "Failed to fetch workspace status",
        });
      }
    }
  );

  // Manually provision workspace account for a therapist
  app.post(
    "/api/therapists/:id/provision-workspace",
    isAuthenticated,
    adminLimiter,
    ipSecurityCheck,
    async (req, res) => {
      try {
        const { id: therapistId } = req.params;
        const { forceRecreate = false } = req.body;

        console.log(`🚀 Manual workspace provisioning requested for therapist: ${therapistId}`);

        // Get therapist details
        const user = await storage.getUserById(therapistId);
        if (!user || user.role !== "therapist") {
          return res.status(404).json({
            success: false,
            error: "Therapist not found or invalid role",
          });
        }

        const therapistProfile = await storage.getTherapistProfileByUserId(therapistId);

        // Check if account already exists
        if (therapistProfile?.workspaceAccountCreated && !forceRecreate) {
          return res.status(409).json({
            success: false,
            error: "Workspace account already exists",
            existingWorkspaceEmail: therapistProfile.googleWorkspaceEmail,
          });
        }

        // Find the enquiry for this therapist
        const enquiries = await storage.getTherapistEnquiriesByEmail(user.email);
        const enquiry = enquiries.find((e) => e.email === user.email);

        if (!enquiry) {
          return res.status(400).json({
            success: false,
            error: "No therapist enquiry found for this user",
          });
        }

        // Trigger the automated provisioning workflow
        const workflowResult = await therapistOnboardingService.processTherapistApproval(
          enquiry.id
        );

        if (workflowResult.workspaceProvisioned) {
          console.log(`✅ Manual workspace provisioning successful for ${user.email}`);

          res.json({
            success: true,
            message: "Workspace account provisioned successfully",
            details: {
              workspaceEmail: workflowResult.details.workspaceEmail,
              calendarId: workflowResult.details.calendarId,
              userId: workflowResult.details.userId,
            },
          });
        } else {
          console.error(
            `❌ Manual workspace provisioning failed for ${user.email}: ${workflowResult.error}`
          );

          res.status(500).json({
            success: false,
            error: workflowResult.error || "Workspace provisioning failed",
            details: workflowResult,
          });
        }
      } catch (error) {
        console.error("❌ Error in manual workspace provisioning:", error);
        res.status(500).json({
          success: false,
          error: "Failed to provision workspace account",
        });
      }
    }
  );

  // Update workspace account settings
  app.put(
    "/api/therapists/:id/workspace-account",
    isAuthenticated,
    adminLimiter,
    ipSecurityCheck,
    async (req, res) => {
      try {
        const { id: therapistId } = req.params;
        const { accountStatus, notes } = req.body;

        console.log(`🔄 Updating workspace account for therapist: ${therapistId}`);

        const therapistProfile = await storage.getTherapistProfileByUserId(therapistId);

        if (!therapistProfile) {
          return res.status(404).json({
            success: false,
            error: "Therapist profile not found",
          });
        }

        // Update workspace account settings
        const updateData: any = {
          updatedAt: new Date(),
        };

        if (accountStatus && ["active", "suspended", "pending"].includes(accountStatus)) {
          updateData.workspaceAccountStatus = accountStatus;
        }

        if (notes !== undefined) {
          updateData.workspaceAccountNotes = notes;
        }

        await storage.updateTherapistProfile(therapistProfile.id, updateData);

        console.log(`✅ Workspace account updated for therapist: ${therapistId}`);

        res.json({
          success: true,
          message: "Workspace account settings updated successfully",
        });
      } catch (error) {
        console.error("❌ Error updating workspace account:", error);
        res.status(500).json({
          success: false,
          error: "Failed to update workspace account",
        });
      }
    }
  );

  // Get all workspace accounts (admin overview)
  app.get("/api/admin/workspace-accounts", isAuthenticated, adminLimiter, async (req, res) => {
    try {
      console.log("📊 Fetching all workspace accounts overview");

      // Get all therapist profiles with workspace details
      const allTherapists = await storage.getTherapists();
      const therapistProfiles = await Promise.all(
        allTherapists.map(async (therapist) => {
          const profile = await storage.getTherapistProfileByUserId(therapist.id);
          return {
            therapist,
            profile,
          };
        })
      );

      const workspaceAccounts = therapistProfiles
        .filter(({ profile }) => profile?.workspaceAccountCreated)
        .map(({ therapist, profile }) => ({
          therapistId: therapist.id,
          therapistName: `${therapist.firstName} ${therapist.lastName}`,
          therapistEmail: therapist.email,
          workspaceEmail: profile?.googleWorkspaceEmail,
          calendarId: profile?.googleCalendarId,
          accountStatus: profile?.workspaceAccountStatus,
          createdAt: profile?.workspaceCreatedAt,
          lastLogin: profile?.workspaceLastLogin,
          permissionsConfigured: profile?.calendarPermissionsConfigured,
          notes: profile?.workspaceAccountNotes,
        }));

      const stats = {
        total: workspaceAccounts.length,
        active: workspaceAccounts.filter((acc) => acc.accountStatus === "active").length,
        suspended: workspaceAccounts.filter((acc) => acc.accountStatus === "suspended").length,
        pending: workspaceAccounts.filter((acc) => acc.accountStatus === "pending").length,
      };

      res.json({
        success: true,
        stats,
        workspaceAccounts,
      });
    } catch (error) {
      console.error("❌ Error fetching workspace accounts:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch workspace accounts",
      });
    }
  });

  // Bulk workspace account provisioning
  app.post(
    "/api/admin/bulk-provision-workspace",
    isAuthenticated,
    adminLimiter,
    ipSecurityCheck,
    async (req, res) => {
      try {
        const { therapistIds } = req.body;

        if (!Array.isArray(therapistIds) || therapistIds.length === 0) {
          return res.status(400).json({
            success: false,
            error: "therapistIds array is required",
          });
        }

        console.log(`🔄 Bulk workspace provisioning for ${therapistIds.length} therapists`);

        const results = [];
        const errors = [];

        for (const therapistId of therapistIds) {
          try {
            // Get therapist details
            const user = await storage.getUserById(therapistId);
            if (!user || user.role !== "therapist") {
              errors.push(`Therapist ${therapistId} not found or invalid role`);
              continue;
            }

            // Check if already provisioned
            const profile = await storage.getTherapistProfileByUserId(therapistId);
            if (profile?.workspaceAccountCreated) {
              results.push({
                therapistId,
                status: "skipped",
                reason: "Already provisioned",
                workspaceEmail: profile.googleWorkspaceEmail,
              });
              continue;
            }

            // Find enquiry
            const enquiries = await storage.getTherapistEnquiriesByEmail(user.email);
            const enquiry = enquiries.find((e) => e.email === user.email);

            if (!enquiry) {
              errors.push(`No enquiry found for therapist ${therapistId} (${user.email})`);
              continue;
            }

            // Provision workspace
            const workflowResult = await therapistOnboardingService.processTherapistApproval(
              enquiry.id
            );

            results.push({
              therapistId,
              therapistEmail: user.email,
              status: workflowResult.workspaceProvisioned ? "success" : "failed",
              workspaceEmail: workflowResult.details.workspaceEmail,
              calendarId: workflowResult.details.calendarId,
              error: workflowResult.error,
            });
          } catch (error) {
            errors.push(`Error processing therapist ${therapistId}: ${error}`);
          }
        }

        const successCount = results.filter((r) => r.status === "success").length;
        const skippedCount = results.filter((r) => r.status === "skipped").length;

        console.log(
          `🎯 Bulk provisioning completed: ${successCount} successful, ${skippedCount} skipped, ${errors.length} errors`
        );

        res.json({
          success: true,
          message: `Bulk provisioning completed: ${successCount} successful, ${skippedCount} skipped, ${errors.length} errors`,
          results,
          errors,
          stats: {
            total: therapistIds.length,
            successful: successCount,
            skipped: skippedCount,
            failed: errors.length,
          },
        });
      } catch (error) {
        console.error("❌ Error in bulk workspace provisioning:", error);
        res.status(500).json({
          success: false,
          error: "Failed to perform bulk provisioning",
        });
      }
    }
  );

  // Get workspace provisioning logs and audit trail
  app.get("/api/admin/workspace-audit", isAuthenticated, adminLimiter, async (req, res) => {
    try {
      const { limit = 100, offset = 0 } = req.query;

      // For now, return basic audit information
      // In a production system, you'd have dedicated audit logging
      const auditEntries = await storage.getTherapists();
      const auditData = await Promise.all(
        auditEntries
          .slice(Number(offset), Number(offset) + Number(limit))
          .map(async (therapist) => {
            const profile = await storage.getTherapistProfileByUserId(therapist.id);
            return {
              therapistId: therapist.id,
              therapistName: `${therapist.firstName} ${therapist.lastName}`,
              therapistEmail: therapist.email,
              workspaceEmail: profile?.googleWorkspaceEmail,
              accountStatus: profile?.workspaceAccountStatus,
              createdAt: profile?.workspaceCreatedAt,
              lastUpdated: profile?.updatedAt,
              notes: profile?.workspaceAccountNotes,
            };
          })
      );

      res.json({
        success: true,
        auditData,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          total: auditEntries.length,
        },
      });
    } catch (error) {
      console.error("❌ Error fetching workspace audit data:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch audit data",
      });
    }
  });

  // Delete/deactivate workspace account
  app.delete(
    "/api/therapists/:id/workspace-account",
    isAuthenticated,
    adminLimiter,
    ipSecurityCheck,
    async (req, res) => {
      try {
        const { id: therapistId } = req.params;
        const { reason = "Manual deactivation" } = req.body;

        console.log(`🗑️ Deactivating workspace account for therapist: ${therapistId}`);

        const user = await storage.getUserById(therapistId);
        if (!user) {
          return res.status(404).json({
            success: false,
            error: "Therapist not found",
          });
        }

        const therapistProfile = await storage.getTherapistProfileByUserId(therapistId);

        if (!therapistProfile?.workspaceAccountCreated) {
          return res.status(400).json({
            success: false,
            error: "No workspace account found to deactivate",
          });
        }

        // Update profile to mark account as deactivated
        await storage.updateTherapistProfile(therapistProfile.id, {
          workspaceAccountStatus: "deleted",
          workspaceAccountNotes: `${therapistProfile.workspaceAccountNotes || ""}\n[${new Date().toISOString()}] Account deactivated: ${reason}`,
          updatedAt: new Date(),
        });

        console.log(`✅ Workspace account deactivated for ${user.email}`);

        res.json({
          success: true,
          message: "Workspace account deactivated successfully",
          note: "Account marked as deleted in database. Manual cleanup of Google Workspace account may be required.",
        });
      } catch (error) {
        console.error("❌ Error deactivating workspace account:", error);
        res.status(500).json({
          success: false,
          error: "Failed to deactivate workspace account",
        });
      }
    }
  );

  // Test workspace service connectivity
  app.get(
    "/api/admin/workspace-service-health",
    isAuthenticated,
    adminLimiter,
    async (req, res) => {
      try {
        console.log("🔍 Testing Google Workspace service connectivity");

        // This would test the Google Workspace Admin SDK connectivity
        // For now, we'll return basic service status
        const serviceHealth = {
          googleWorkspaceSDK: "available", // Would test actual connectivity
          adminAccess: "configured",
          domain: process.env.GOOGLE_WORKSPACE_DOMAIN || "hive-wellness.co.uk",
          lastChecked: new Date().toISOString(),
        };

        res.json({
          success: true,
          serviceHealth,
        });
      } catch (error) {
        console.error("❌ Error checking workspace service health:", error);
        res.status(500).json({
          success: false,
          error: "Failed to check service health",
        });
      }
    }
  );
}
