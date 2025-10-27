// Enhanced Therapist Onboarding Service
// Handles complete therapist onboarding workflow including Google Workspace provisioning

import { nanoid } from "nanoid";
import type { IStorage } from "./storage";
import {
  GoogleWorkspaceAdminService,
  type TherapistAccountData,
} from "./google-workspace-admin-service";
import { therapistCalendarOnboardingService } from "./services/therapist-calendar-onboarding";
import { emailService } from "./services/email-service";
import bcrypt from "bcrypt";

export interface TherapistProvisioningResult {
  success: boolean;
  workspaceEmail?: string;
  calendarId?: string;
  tempPassword?: string;
  error?: string;
  rollbackRequired?: boolean;
}

export interface OnboardingWorkflowResult {
  applicationCreated: boolean;
  workspaceProvisioned: boolean;
  userAccountCreated: boolean;
  calendarSetupCompleted: boolean;
  error?: string;
  details: {
    applicationId?: string;
    workspaceEmail?: string;
    calendarId?: string;
    userId?: string;
    therapistCalendarId?: string;
    calendarSetupError?: string;
  };
}

export class TherapistOnboardingService {
  private googleWorkspaceService: GoogleWorkspaceAdminService;

  constructor(private storage: IStorage) {
    this.googleWorkspaceService = new GoogleWorkspaceAdminService();
  }

  // Convert approved therapist enquiries to onboarding applications
  async convertApprovedEnquiriesToApplications(): Promise<{
    converted: number;
    errors: string[];
    applications: any[];
  }> {
    console.log("🔄 Converting approved therapist enquiries to onboarding applications...");

    const errors: string[] = [];
    const applications: any[] = [];
    let converted = 0;

    try {
      // Get all approved therapist enquiries
      const approvedEnquiries = await this.storage.getTherapistEnquiriesByStatus("approved");

      console.log(`📊 Found ${approvedEnquiries.length} approved therapist enquiries`);

      for (const enquiry of approvedEnquiries) {
        try {
          // Check if onboarding application already exists
          const existingApplication = await this.storage.getTherapistOnboardingApplicationByEmail(
            enquiry.email
          );

          if (existingApplication) {
            console.log(`⏭️ Onboarding application already exists for ${enquiry.email}`);
            continue;
          }

          // Create onboarding application from enquiry data
          const applicationData = {
            id: nanoid(),
            firstName: enquiry.firstName || "",
            lastName: enquiry.lastName || "",
            email: enquiry.email,
            dateOfBirth: "", // Will be filled during onboarding
            phoneNumber: enquiry.phoneNumber || enquiry.phone || "",
            profilePhoto: "",
            streetAddress: enquiry.location || "",
            postCode: "",
            emergencyFirstName: "",
            emergencyLastName: "",
            emergencyRelationship: "",
            emergencyPhoneNumber: "",
            jobTitle: "",
            qualifications: this.parseQualifications(enquiry),
            yearsOfExperience: this.parseExperience(enquiry.experience),
            registrationNumber: "",
            enhancedDbsCertificate: "",
            workingWithOtherPlatforms: "",
            availability: this.parseAvailability(enquiry.availability),
            sessionsPerWeek: "",
            selfEmploymentAcknowledgment: false,
            taxResponsibilityAcknowledgment: false,
            cvDocument: "",
            dbsCertificate: "",
            professionalInsurance: "",
            membershipProof: "",
            rightToWorkProof: "",
            policiesAgreement: false,
            signature: "",
            stripeConnectConsent: false,
            status: "pending", // Start as pending for onboarding
            adminNotes: `Converted from approved enquiry ID: ${enquiry.id}`,
            stripeConnectAccountId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Create the onboarding application
          const application =
            await this.storage.createTherapistOnboardingApplication(applicationData);

          converted++;
          applications.push(application);

          console.log(
            `✅ Created onboarding application for ${enquiry.email} (ID: ${application.id})`
          );
        } catch (error) {
          const errorMsg = `Failed to convert enquiry ${enquiry.id} (${enquiry.email}): ${error}`;
          console.error("❌", errorMsg);
          errors.push(errorMsg);
        }
      }

      console.log(
        `🎯 Conversion complete: ${converted}/${approvedEnquiries.length} enquiries converted to applications`
      );

      return { converted, errors, applications };
    } catch (error) {
      const errorMsg = `Fatal error in enquiry conversion: ${error}`;
      console.error("❌", errorMsg);
      errors.push(errorMsg);

      return { converted, errors, applications };
    }
  }

  // Parse qualifications from enquiry data
  private parseQualifications(enquiry: any): any {
    try {
      if (enquiry.qualifications) {
        if (typeof enquiry.qualifications === "string") {
          return [{ qualification: enquiry.qualifications, institution: "", year: "" }];
        }
        return enquiry.qualifications;
      }

      if (enquiry.highestQualification) {
        return [{ qualification: enquiry.highestQualification, institution: "", year: "" }];
      }

      return [];
    } catch (error) {
      console.log("Could not parse qualifications:", error);
      return [];
    }
  }

  // Parse experience years
  private parseExperience(experience: any): number {
    try {
      if (typeof experience === "number") {
        return experience;
      }

      if (typeof experience === "string") {
        const match = experience.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      }

      return 0;
    } catch (error) {
      console.log("Could not parse experience:", error);
      return 0;
    }
  }

  // Parse availability from enquiry data
  private parseAvailability(availability: any): any {
    try {
      if (typeof availability === "object") {
        return availability;
      }

      if (typeof availability === "string") {
        return { preferred: availability, notes: "" };
      }

      return { preferred: "flexible", notes: "" };
    } catch (error) {
      console.log("Could not parse availability:", error);
      return { preferred: "flexible", notes: "" };
    }
  }

  // Get onboarding progress for HubSpot tracking
  async getOnboardingProgress(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    applications: any[];
  }> {
    try {
      const applications = await this.storage.getAllTherapistOnboardingApplications();

      const pending = applications.filter((app) => app.status === "pending").length;
      const inProgress = applications.filter((app) => app.status === "in_progress").length;
      const completed = applications.filter((app) => app.status === "completed").length;

      return {
        total: applications.length,
        pending,
        inProgress,
        completed,
        applications: applications.map((app) => ({
          id: app.id,
          name: `${app.firstName} ${app.lastName}`,
          email: app.email,
          status: app.status,
          createdAt: app.createdAt,
          updatedAt: app.updatedAt,
        })),
      };
    } catch (error) {
      console.error("Error getting onboarding progress:", error);
      return {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        applications: [],
      };
    }
  }

  // Update application status for tracking
  async updateApplicationStatus(
    applicationId: string,
    status: string,
    notes?: string
  ): Promise<boolean> {
    try {
      await this.storage.updateTherapistOnboardingApplication(applicationId, {
        status,
        adminNotes: notes,
        updatedAt: new Date(),
      });

      console.log(`✅ Updated application ${applicationId} status to ${status}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to update application ${applicationId}:`, error);
      return false;
    }
  }

  /**
   * Complete therapist onboarding workflow with automated Google Workspace provisioning
   * This is the main method called when a therapist application is approved
   */
  async processTherapistApproval(enquiryId: string): Promise<OnboardingWorkflowResult> {
    console.log(`🚀 Starting complete therapist onboarding workflow for enquiry: ${enquiryId}`);

    const result: OnboardingWorkflowResult = {
      applicationCreated: false,
      workspaceProvisioned: false,
      userAccountCreated: false,
      calendarSetupCompleted: false,
      details: {},
    };

    try {
      // Step 1: Get the approved enquiry
      const enquiry = await this.storage.getTherapistEnquiryById(enquiryId);
      if (!enquiry) {
        throw new Error(`Therapist enquiry ${enquiryId} not found`);
      }

      console.log(
        `📋 Processing approval for ${enquiry.firstName} ${enquiry.lastName} (${enquiry.email})`
      );

      // Step 2: Create/Update onboarding application
      let application = await this.storage.getTherapistOnboardingApplicationByEmail(enquiry.email);

      if (!application) {
        const applicationData = {
          id: nanoid(),
          firstName: enquiry.firstName || "",
          lastName: enquiry.lastName || "",
          email: enquiry.email,
          dateOfBirth: "",
          phoneNumber: enquiry.phoneNumber || enquiry.phone || "",
          profilePhoto: "",
          streetAddress: enquiry.location || "",
          postCode: "",
          emergencyFirstName: "",
          emergencyLastName: "",
          emergencyRelationship: "",
          emergencyPhoneNumber: "",
          jobTitle: "",
          qualifications: this.parseQualifications(enquiry),
          yearsOfExperience: this.parseExperience(enquiry.experience),
          registrationNumber: "",
          enhancedDbsCertificate: "",
          workingWithOtherPlatforms: "",
          availability: this.parseAvailability(enquiry.availability),
          sessionsPerWeek: "",
          selfEmploymentAcknowledgment: false,
          taxResponsibilityAcknowledgment: false,
          cvDocument: "",
          dbsCertificate: "",
          professionalInsurance: "",
          membershipProof: "",
          rightToWorkProof: "",
          policiesAgreement: false,
          signature: "",
          stripeConnectConsent: false,
          status: "approved", // Directly approved
          adminNotes: `Auto-approved from enquiry ID: ${enquiry.id}`,
          stripeConnectAccountId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        application = await this.storage.createTherapistOnboardingApplication(applicationData);
        console.log(`✅ Created onboarding application: ${application.id}`);
      }

      result.applicationCreated = true;
      result.details.applicationId = application.id;

      // Step 3: Provision Google Workspace account
      const workspaceResult = await this.provisionGoogleWorkspaceAccount(enquiry);

      if (workspaceResult.success) {
        result.workspaceProvisioned = true;
        result.details.workspaceEmail = workspaceResult.workspaceEmail;
        result.details.calendarId = workspaceResult.calendarId;
        console.log(`✅ Google Workspace account provisioned: ${workspaceResult.workspaceEmail}`);
      } else {
        console.warn(`⚠️ Google Workspace provisioning failed: ${workspaceResult.error}`);
      }

      // Step 4: Create therapist user account
      const userResult = await this.createTherapistUserAccount(enquiry, workspaceResult);

      if (userResult.success) {
        result.userAccountCreated = true;
        result.details.userId = userResult.userId;
        console.log(`✅ Therapist user account created: ${userResult.userId}`);
      } else {
        console.warn(`⚠️ User account creation failed: ${userResult.error}`);
      }

      // Step 5: Set up automated calendar system
      let calendarSetupResult = null;
      if (userResult.success && userResult.userId) {
        try {
          console.log(`📅 Setting up automated calendar for therapist ${userResult.userId}`);
          calendarSetupResult = await therapistCalendarOnboardingService.setupTherapistCalendar(
            userResult.userId,
            enquiry.email
          );

          if (calendarSetupResult.success) {
            result.calendarSetupCompleted = true;
            result.details.therapistCalendarId = calendarSetupResult.googleCalendarId;
            console.log(
              `✅ Calendar setup completed for therapist ${userResult.userId}: ${calendarSetupResult.googleCalendarId}`
            );
          } else {
            console.warn(
              `⚠️ Calendar setup failed for therapist ${userResult.userId}: ${calendarSetupResult.error}`
            );
            result.details.calendarSetupError = calendarSetupResult.error;
          }
        } catch (calendarError: any) {
          console.error(
            `❌ Calendar setup error for therapist ${userResult.userId}:`,
            calendarError
          );
          result.details.calendarSetupError = calendarError.message;
        }
      }

      // Step 6: Send professional welcome email (now includes calendar info)
      if (workspaceResult.success) {
        await this.sendTherapistWelcomeEmail(enquiry, workspaceResult, calendarSetupResult);
      }

      console.log(`🎯 Therapist onboarding workflow completed for ${enquiry.email}`);
      console.log(
        `📊 Results: Workspace: ${result.workspaceProvisioned}, User: ${result.userAccountCreated}, Calendar: ${result.calendarSetupCompleted}`
      );
      return result;
    } catch (error) {
      console.error(`❌ Therapist onboarding workflow failed for ${enquiryId}:`, error);
      result.error = error instanceof Error ? error.message : "Unknown error";

      // Attempt rollback if necessary
      if (result.workspaceProvisioned && result.details.workspaceEmail) {
        console.log(`🔄 Attempting rollback for ${result.details.workspaceEmail}`);
        await this.rollbackWorkspaceAccount(result.details.workspaceEmail);
      }

      return result;
    }
  }

  /**
   * Provision Google Workspace account and calendar for approved therapist
   */
  async provisionGoogleWorkspaceAccount(enquiry: any): Promise<TherapistProvisioningResult> {
    try {
      console.log(
        `📧 Provisioning Google Workspace account for ${enquiry.firstName} ${enquiry.lastName}`
      );

      const accountData: TherapistAccountData = {
        firstName: enquiry.firstName,
        lastName: enquiry.lastName,
        email: enquiry.email, // Original contact email for reference
      };

      const workspaceResult = await this.googleWorkspaceService.createTherapistAccount(accountData);

      if (workspaceResult.accountCreated) {
        // Update therapist profile with workspace details
        const existingProfile = await this.storage.getTherapistProfileByUserId(enquiry.email);

        const workspaceUpdateData = {
          googleWorkspaceEmail: workspaceResult.workspaceEmail,
          googleCalendarId: workspaceResult.calendarId,
          workspaceAccountCreated: true,
          workspaceCreatedAt: new Date(),
          workspaceAccountStatus: "active" as const,
          workspaceTempPassword: workspaceResult.tempPassword
            ? await bcrypt.hash(workspaceResult.tempPassword, 10)
            : null,
          calendarPermissionsConfigured: true,
          workspaceAccountNotes: `Account auto-provisioned on ${new Date().toISOString()}`,
        };

        if (existingProfile) {
          await this.storage.updateTherapistProfile(existingProfile.id, workspaceUpdateData);
        }

        return {
          success: true,
          workspaceEmail: workspaceResult.workspaceEmail,
          calendarId: workspaceResult.calendarId,
          tempPassword: workspaceResult.tempPassword,
        };
      } else {
        return {
          success: false,
          error: "Google Workspace account creation failed",
        };
      }
    } catch (error) {
      console.error("❌ Error provisioning Google Workspace account:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        rollbackRequired: true,
      };
    }
  }

  /**
   * Create therapist user account in the main application
   */
  async createTherapistUserAccount(
    enquiry: any,
    workspaceResult: TherapistProvisioningResult
  ): Promise<{
    success: boolean;
    userId?: string;
    error?: string;
  }> {
    try {
      // Check if user already exists
      const existingUser = await this.storage.getUserByEmail(enquiry.email);

      if (existingUser) {
        console.log(`👤 User account already exists for ${enquiry.email}`);
        return { success: true, userId: existingUser.id };
      }

      // Generate secure temporary password
      const tempPassword = this.generateSecurePassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      // Create therapist user account
      const userData = {
        id: nanoid(),
        email: enquiry.email,
        password: hashedPassword,
        firstName: enquiry.firstName,
        lastName: enquiry.lastName,
        role: "therapist" as const,
        profileData: {
          specializations: enquiry.specializations || [],
          experience: enquiry.experience,
          motivation: enquiry.motivation,
          availability: enquiry.availability,
        },
        therapyCategories: enquiry.specializations || [],
        isActive: true,
        profileComplete: false,
        isEmailVerified: true, // Pre-verified through onboarding process
        forcePasswordChange: true, // Force password change on first login
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const user = await this.storage.createUser(userData);

      // Create therapist profile
      const profileData = {
        id: nanoid(),
        userId: user.id,
        specializations: enquiry.specializations || [],
        experience: this.parseExperience(enquiry.experience),
        availability: this.parseAvailability(enquiry.availability),
        bio: enquiry.motivation || "",
        isVerified: false, // Will be verified after document submission
        therapyCategories: enquiry.specializations || [],
        // Google Workspace fields
        googleWorkspaceEmail: workspaceResult.workspaceEmail || null,
        googleCalendarId: workspaceResult.calendarId || null,
        workspaceAccountCreated: workspaceResult.success || false,
        workspaceCreatedAt: workspaceResult.success ? new Date() : null,
        workspaceAccountStatus: workspaceResult.success
          ? ("active" as const)
          : ("pending" as const),
        workspaceTempPassword: workspaceResult.tempPassword
          ? await bcrypt.hash(workspaceResult.tempPassword, 10)
          : null,
        calendarPermissionsConfigured: workspaceResult.success || false,
        workspaceAccountNotes: workspaceResult.success
          ? `Account auto-provisioned on ${new Date().toISOString()}`
          : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.storage.createTherapistProfile(profileData);

      console.log(`✅ Created therapist user account and profile for ${enquiry.email}`);
      return { success: true, userId: user.id };
    } catch (error) {
      console.error("❌ Error creating therapist user account:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send professional welcome email with Google Workspace credentials and calendar info
   */
  async sendTherapistWelcomeEmail(
    enquiry: any,
    workspaceResult: TherapistProvisioningResult,
    calendarSetupResult?: any
  ): Promise<void> {
    try {
      const emailData = {
        to: enquiry.email,
        template: "therapist_workspace_welcome",
        variables: {
          firstName: enquiry.firstName,
          lastName: enquiry.lastName,
          workspaceEmail: workspaceResult.workspaceEmail,
          tempPassword: workspaceResult.tempPassword,
          calendarUrl: `https://calendar.google.com/calendar?cid=${workspaceResult.calendarId}`,
          therapistCalendarId: calendarSetupResult?.googleCalendarId || "",
          therapistCalendarUrl: calendarSetupResult?.googleCalendarId
            ? `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarSetupResult.googleCalendarId)}`
            : "",
          calendarSetupSuccess: calendarSetupResult?.success || false,
          portalUrl: process.env.CLIENT_URL || "https://api.hive-wellness.co.uk",
          supportEmail: "support@hive-wellness.co.uk",
        },
      };

      await emailService.sendTemplatedEmail(emailData);
      console.log(
        `📧 Welcome email sent to ${enquiry.email} (includes calendar setup: ${calendarSetupResult?.success ? "Yes" : "No"})`
      );
    } catch (error) {
      console.error(`❌ Failed to send welcome email to ${enquiry.email}:`, error);
      // Don't throw - email failure shouldn't stop the workflow
    }
  }

  /**
   * Rollback Google Workspace account in case of failure
   */
  async rollbackWorkspaceAccount(workspaceEmail: string): Promise<void> {
    try {
      console.log(`🔄 Rolling back Google Workspace account: ${workspaceEmail}`);

      // Note: Actual account deletion should be handled carefully
      // For now, we'll just log and potentially disable the account
      console.log(`⚠️ Rollback logged for ${workspaceEmail} - manual cleanup may be required`);

      // TODO: Implement actual account deletion/suspension if needed
    } catch (error) {
      console.error(`❌ Rollback failed for ${workspaceEmail}:`, error);
    }
  }

  /**
   * Generate secure temporary password
   */
  private generateSecurePassword(): string {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
    let password = "";

    // Ensure at least one of each character type
    password += "ABCDEFGHJKMNPQRSTUVWXYZ"[Math.floor(Math.random() * 23)]; // Uppercase
    password += "abcdefghijkmnpqrstuvwxyz"[Math.floor(Math.random() * 23)]; // Lowercase
    password += "23456789"[Math.floor(Math.random() * 8)]; // Number
    password += "!@#$%&*"[Math.floor(Math.random() * 7)]; // Special

    // Fill remainder with random characters
    for (let i = 4; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }

    // Shuffle the password
    return password
      .split("")
      .sort(() => 0.5 - Math.random())
      .join("");
  }
}

export const createTherapistOnboardingService = (storage: Storage) =>
  new TherapistOnboardingService(storage);
