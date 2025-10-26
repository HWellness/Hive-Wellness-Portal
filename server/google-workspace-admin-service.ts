import { google } from 'googleapis';
import { nanoid } from 'nanoid';
import { storage } from './storage';
import { currencyService, type CurrencyAmount } from './currency-service';
import type { InsertWorkspaceAccount } from '@shared/schema';

export interface TherapistAccountData {
  firstName: string;
  lastName: string;
  email: string;
  tempPassword?: string;
}

export interface TherapistWorkspaceResult {
  workspaceEmail: string;
  calendarId: string;
  accountCreated: boolean;
  tempPassword?: string;
}

export class GoogleWorkspaceAdminService {
  private adminSDK: any;
  private calendar: any;
  private gmail: any;
  private domain: string;
  private adminEmail: string;
  private readonly maxRetries = 3;
  private readonly baseRetryDelay = 1000;
  private isReady = false;
  private readyPromise: Promise<void>;
  private initializationError: Error | null = null;

  constructor() {
    console.log('🚀 GoogleWorkspaceAdminService constructor called');
    this.domain = process.env.GOOGLE_WORKSPACE_DOMAIN || 'hive-wellness.co.uk';
    this.adminEmail = process.env.GOOGLE_ADMIN_EMAIL || 'support@hive-wellness.co.uk';
    this.readyPromise = this.initializeServices();
  }

  /**
   * Wait for the service to be fully initialized
   */
  async ready(): Promise<void> {
    await this.readyPromise;
    if (this.initializationError) {
      throw this.initializationError;
    }
    if (!this.isReady) {
      throw new Error('Google Workspace Admin SDK failed to initialize');
    }
  }

  /**
   * Check if the service is ready without throwing
   */
  isInitialized(): boolean {
    return this.isReady && !this.initializationError;
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryWithBackoff<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        const isLastAttempt = attempt === this.maxRetries - 1;
        const isRetryableError = error?.status === 429 || error?.status >= 500 || 
                                error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT';
        
        if (isLastAttempt || !isRetryableError) {
          console.error(`❌ ${operationName} failed after ${attempt + 1} attempts:`, error?.message || error);
          throw error;
        }
        
        const delay = this.baseRetryDelay * Math.pow(2, attempt);
        console.warn(`⚠️ ${operationName} attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error?.message || error);
        await this.delay(delay);
      }
    }
    
    throw new Error(`${operationName} exhausted all ${this.maxRetries} retry attempts`);
  }

  /**
   * Delay for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if user already exists in workspace
   */
  private async checkUserExists(email: string): Promise<boolean> {
    try {
      await this.ready();
      if (!this.adminSDK) return false;
      
      await this.adminSDK.users.get({ userKey: email });
      return true;
    } catch (error: any) {
      if (error?.code === 404) {
        return false;
      }
      // Re-throw non-404 errors
      throw error;
    }
  }

  /**
   * Check if calendar already exists for user
   */
  private async checkCalendarExists(userEmail: string, calendarName: string): Promise<string | null> {
    try {
      await this.ready();
      if (!this.calendar) return null;
      
      const calendarList = await this.calendar.calendarList.list();
      const existingCalendar = calendarList.data.items?.find((cal: any) => 
        cal.summary?.includes(calendarName) && cal.id?.includes(userEmail.split('@')[0])
      );
      
      return existingCalendar?.id || null;
    } catch (error) {
      console.warn('⚠️ Error checking calendar existence:', error);
      return null;
    }
  }

  private async initializeServices(): Promise<void> {
    try {
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        
        // Configure auth with domain-wide delegation using JWT
        const auth = new google.auth.JWT({
          email: serviceAccountKey.client_email,
          key: serviceAccountKey.private_key,
          scopes: [
            'https://www.googleapis.com/auth/admin.directory.user',
            'https://www.googleapis.com/auth/admin.directory.group',
            'https://www.googleapis.com/auth/admin.directory.orgunit',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/gmail.send'
          ],
          // Subject is required for domain-wide delegation
          subject: this.adminEmail
        });

        // Initialize Google Admin SDK APIs
        this.adminSDK = google.admin({ version: 'directory_v1', auth });
        this.calendar = google.calendar({ version: 'v3', auth });
        this.gmail = google.gmail({ version: 'v1', auth });

        console.log('✅ Google Workspace Admin SDK initialized successfully');
        console.log(`📧 Using admin email: ${this.adminEmail}`);
        console.log(`🌐 Workspace domain: ${this.domain}`);
        
        // Test the admin access
        await this.testAdminAccess();
        
        // Mark as ready only after all initialization is complete
        this.isReady = true;
        console.log('🎯 Google Workspace Admin Service is ready');
      } else {
        console.log('⚠️ Google Workspace Admin SDK not initialized - no service account key found');
        // Still mark as ready but with limited functionality
        this.isReady = true;
      }
    } catch (error) {
      console.error('❌ Error initializing Google Workspace Admin SDK:', error);
      this.initializationError = error instanceof Error ? error : new Error(String(error));
      this.isReady = false;
      throw error;
    }
  }

  private async testAdminAccess() {
    try {
      if (!this.adminSDK) {
        console.log('⚠️ Admin SDK not initialized, skipping access test');
        return;
      }

      // Test admin access by listing users (limited to 1)
      const response = await this.adminSDK.users.list({
        domain: this.domain,
        maxResults: 1
      });

      console.log('✅ Admin SDK access verified');
      console.log(`📊 Total users in domain: ${response.data.users?.length || 0}`);
      
      // Test calendar access
      const calendarResponse = await this.calendar.calendarList.list({
        maxResults: 1
      });
      
      console.log('✅ Calendar API access verified');
      console.log(`📅 Accessible calendars: ${calendarResponse.data.items?.length || 0}`);
      
    } catch (error: any) {
      console.error('❌ Admin access test failed:', error?.message || error);
      if (error?.code === 403) {
        console.error('🔒 Domain-wide delegation may not be configured properly');
        console.error('💡 Ensure service account has domain-wide delegation enabled');
      }
    }
  }

  /**
   * Create a complete Google Workspace account for a therapist
   */
  async createTherapistAccount(therapistData: TherapistAccountData): Promise<TherapistWorkspaceResult> {
    try {
      console.log(`🚀 Creating therapist account for: ${therapistData.firstName} ${therapistData.lastName}`);
      
      // Wait for service to be ready
      await this.ready();
      
      if (!this.adminSDK) {
        throw new Error('Google Workspace Admin SDK not initialized');
      }

      // Generate workspace email and temporary password
      const username = this.generateUsername(therapistData.firstName, therapistData.lastName);
      const workspaceEmail = `${username}@${this.domain}`;
      const tempPassword = therapistData.tempPassword || this.generateTempPassword();

      // Check for existing account (idempotency)
      const userExists = await this.checkUserExists(workspaceEmail);
      if (userExists) {
        console.log(`⚠️ User account already exists: ${workspaceEmail}`);
        const existingCalendarId = await this.checkCalendarExists(workspaceEmail, `Dr. ${therapistData.firstName} ${therapistData.lastName}`);
        return {
          workspaceEmail,
          calendarId: existingCalendarId || workspaceEmail,
          accountCreated: true,
          tempPassword: 'EXISTING_ACCOUNT'
        };
      }

      // Track resources for potential rollback
      let createdUser = false;
      let createdCalendar: string | null = null;
      
      try {
        // Create the user account with retry logic
        createdUser = await this.retryWithBackoff(
          () => this.createUserAccount({
            ...therapistData,
            workspaceEmail,
            tempPassword
          }),
          'User Account Creation'
        );

        if (!createdUser) {
          throw new Error('Failed to create user account');
        }

        // Create dedicated calendar for the therapist with retry
        createdCalendar = await this.retryWithBackoff(
          () => this.createTherapistCalendar(workspaceEmail, therapistData),
          'Calendar Creation'
        );

        // Set up calendar permissions with retry
        await this.retryWithBackoff(
          () => this.setupCalendarPermissions(createdCalendar!, workspaceEmail),
          'Calendar Permissions Setup'
        );

        // Send welcome email with retry (non-critical, don't rollback on failure)
        try {
          await this.retryWithBackoff(
            () => this.sendWelcomeEmail(workspaceEmail, tempPassword, therapistData),
            'Welcome Email'
          );
        } catch (emailError) {
          console.warn('⚠️ Welcome email failed, but account creation succeeded:', emailError);
        }

        console.log(`✅ Successfully created therapist workspace account: ${workspaceEmail}`);

        // Create workspace account record for cost tracking
        try {
          await this.createWorkspaceAccountRecord(therapistData, workspaceEmail);
          console.log(`💰 Created cost tracking record for ${workspaceEmail}`);
        } catch (costTrackingError) {
          console.warn('⚠️ Failed to create cost tracking record, but account creation succeeded:', costTrackingError);
          // Don't rollback the account creation for cost tracking failures
        }

        return {
          workspaceEmail,
          calendarId: createdCalendar,
          accountCreated: true,
          tempPassword
        };
        
      } catch (error) {
        console.error(`❌ Error during account creation for ${workspaceEmail}, attempting rollback:`, error);
        
        // Compensating actions (rollback)
        if (createdCalendar) {
          try {
            await this.calendar.calendars.delete({ calendarId: createdCalendar });
            console.log(`🔄 Rollback: Deleted calendar ${createdCalendar}`);
          } catch (rollbackError) {
            console.error(`❌ Failed to rollback calendar deletion:`, rollbackError);
          }
        }
        
        if (createdUser) {
          try {
            await this.adminSDK.users.delete({ userKey: workspaceEmail });
            console.log(`🔄 Rollback: Deleted user account ${workspaceEmail}`);
          } catch (rollbackError) {
            console.error(`❌ Failed to rollback user deletion:`, rollbackError);
          }
        }
        
        throw error;
      }

    } catch (error) {
      console.error('❌ Error creating therapist account:', error);
      return {
        workspaceEmail: '',
        calendarId: '',
        accountCreated: false
      };
    }
  }

  /**
   * Create a user account in Google Workspace
   */
  private async createUserAccount(userData: {
    firstName: string;
    lastName: string;
    workspaceEmail: string;
    tempPassword: string;
  }): Promise<boolean> {
    try {
      const userResource = {
        primaryEmail: userData.workspaceEmail,
        name: {
          givenName: userData.firstName,
          familyName: userData.lastName
        },
        password: userData.tempPassword,
        changePasswordAtNextLogin: true,
        orgUnitPath: process.env.GOOGLE_WORKSPACE_OU || '/Therapists', // Organizational unit
        includeInGlobalAddressList: false, // Privacy for therapists
      };

      const response = await this.adminSDK.users.insert({
        requestBody: userResource
      });

      console.log(`✅ Created user account: ${userData.workspaceEmail}`);
      return !!response.data.primaryEmail;

    } catch (error: any) {
      if (error?.code === 409) {
        console.log('⚠️ User account already exists, treating as success');
        return true; // Account exists, continue with calendar creation
      }
      
      // Re-throw other errors for retry logic
      console.error('❌ Error creating user account:', error?.message || error);
      throw error;
    }
  }

  /**
   * Create a dedicated calendar for the therapist
   */
  async createTherapistCalendar(userEmail: string, therapistData: TherapistAccountData): Promise<string> {
    try {
      // Wait for service to be ready
      await this.ready();
      
      const calendarResource = {
        summary: `Dr. ${therapistData.firstName} ${therapistData.lastName} - Therapy Sessions`,
        description: `Professional calendar for therapy appointments - ${userEmail}`,
        timeZone: 'Europe/London',
        // Set calendar to be visible in the domain but not public
        accessRole: 'freeBusyReader'
      };

      const response = await this.calendar.calendars.insert({
        requestBody: calendarResource
      });

      const calendarId = response.data.id;
      console.log(`✅ Created calendar: ${calendarId} for ${userEmail}`);

      return calendarId;

    } catch (error) {
      console.error('❌ Error creating therapist calendar:', error);
      // Fallback to primary calendar
      return userEmail; // Primary calendar ID is usually the email
    }
  }

  /**
   * Set up proper permissions for the therapist calendar
   */
  async setupCalendarPermissions(calendarId: string, userEmail: string): Promise<void> {
    try {
      // Wait for service to be ready
      await this.ready();
      
      // Give the therapist owner access to their calendar
      await this.calendar.acl.insert({
        calendarId: calendarId,
        requestBody: {
          role: 'owner',
          scope: {
            type: 'user',
            value: userEmail
          }
        }
      });

      // Give admin read access for scheduling coordination
      await this.calendar.acl.insert({
        calendarId: calendarId,
        requestBody: {
          role: 'reader',
          scope: {
            type: 'user',
            value: this.adminEmail
          }
        }
      });

      console.log(`✅ Set up calendar permissions for: ${calendarId}`);

    } catch (error) {
      console.error('❌ Error setting up calendar permissions:', error);
    }
  }

  /**
   * Send welcome email to new therapist with account details
   */
  async sendWelcomeEmail(therapistEmail: string, tempPassword: string, therapistData: TherapistAccountData): Promise<void> {
    try {
      // Wait for service to be ready
      await this.ready();
      
      if (!this.gmail) {
        console.log('⚠️ Gmail API not available, skipping welcome email');
        return;
      }

      const emailContent = this.generateWelcomeEmailContent(therapistEmail, tempPassword, therapistData);
      
      const message = {
        to: therapistEmail,
        subject: 'Welcome to Hive Wellness - Your Google Workspace Account is Ready',
        html: emailContent
      };

      // Convert to RFC 2822 format
      const rawMessage = this.createEmailMessage(message);

      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawMessage
        }
      });

      console.log(`✅ Welcome email sent to: ${therapistEmail}`);

    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
    }
  }

  /**
   * Delete a therapist's Google Workspace account
   */
  async deleteTherapistAccount(userEmail: string): Promise<boolean> {
    try {
      // Wait for service to be ready
      await this.ready();
      
      if (!this.adminSDK) {
        console.log('⚠️ Admin SDK not initialized, cannot delete account');
        return false;
      }

      // First, delete the user's calendars (except primary)
      await this.deleteTherapistCalendars(userEmail);

      // Delete the user account
      await this.adminSDK.users.delete({
        userKey: userEmail
      });

      console.log(`✅ Successfully deleted therapist account: ${userEmail}`);
      return true;

    } catch (error: any) {
      console.error('❌ Error deleting therapist account:', error);
      if (error?.code === 404) {
        console.log('⚠️ User account not found (may already be deleted)');
        return true;
      }
      return false;
    }
  }

  /**
   * Delete therapist's calendars before account deletion
   */
  private async deleteTherapistCalendars(userEmail: string): Promise<void> {
    try {
      // Get list of calendars for the user
      const calendarList = await this.calendar.calendarList.list();
      
      for (const calendar of calendarList.data.items || []) {
        // Skip primary calendar and shared calendars
        if (calendar.id !== userEmail && calendar.id?.includes(userEmail)) {
          await this.calendar.calendars.delete({
            calendarId: calendar.id
          });
          console.log(`🗑️ Deleted calendar: ${calendar.id}`);
        }
      }

    } catch (error) {
      console.error('❌ Error deleting therapist calendars:', error);
    }
  }

  /**
   * Generate a unique username from therapist name
   */
  private generateUsername(firstName: string, lastName: string): string {
    const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/[^a-z.]/g, '');
    // Add random suffix to ensure uniqueness
    return `${baseUsername}.${nanoid(4).toLowerCase()}`;
  }

  /**
   * Generate a secure temporary password
   */
  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Generate welcome email content
   */
  private generateWelcomeEmailContent(email: string, password: string, therapistData: TherapistAccountData): string {
    return `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to Hive Wellness</h1>
          <p style="color: white; margin: 10px 0 0 0;">Your Google Workspace Account is Ready</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2>Hello Dr. ${therapistData.firstName} ${therapistData.lastName},</h2>
          
          <p>Welcome to the Hive Wellness team! Your Google Workspace account has been created and is ready to use.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Your Account Details:</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> <code style="background: #e9ecef; padding: 2px 6px;">${password}</code></p>
            <p><em>You will be prompted to change this password on first login.</em></p>
          </div>
          
          <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Getting Started:</h3>
            <ol>
              <li>Visit <a href="https://accounts.google.com">accounts.google.com</a></li>
              <li>Sign in with your new credentials</li>
              <li>Set up your new password when prompted</li>
              <li>Access your dedicated therapy calendar</li>
              <li>Configure your availability settings</li>
            </ol>
          </div>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Important Notes:</h3>
            <ul>
              <li>Your calendar is private and only accessible to you and admin staff</li>
              <li>All client appointments will be scheduled through your dedicated calendar</li>
              <li>You'll receive email notifications for new bookings</li>
              <li>Please keep your credentials secure and change your password regularly</li>
            </ul>
          </div>
          
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          
          <p>Best regards,<br>The Hive Wellness Team</p>
        </div>
        
        <div style="background: #6c757d; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>© 2025 Hive Wellness. All rights reserved.</p>
          <p>This email contains sensitive information. Please handle with care.</p>
        </div>
      </div>
    `;
  }

  /**
   * Create RFC 2822 email message
   */
  private createEmailMessage(message: { to: string; subject: string; html: string }): string {
    const messageParts = [
      `To: ${message.to}`,
      `Subject: ${message.subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      message.html
    ];
    
    return Buffer.from(messageParts.join('\r\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  }

  /**
   * Test account creation with a test user
   */
  async testAccountCreation(): Promise<boolean> {
    try {
      console.log('🧪 Testing Google Workspace account creation...');
      
      const testData: TherapistAccountData = {
        firstName: 'Test',
        lastName: 'Therapist',
        email: 'test.therapist@example.com'
      };

      const result = await this.createTherapistAccount(testData);
      
      if (result.accountCreated) {
        console.log('✅ Test account creation successful');
        // Clean up test account
        await this.deleteTherapistAccount(result.workspaceEmail);
        return true;
      }
      
      return false;

    } catch (error) {
      console.error('❌ Test account creation failed:', error);
      return false;
    }
  }

  /**
   * Get account status for a therapist
   */
  async getAccountStatus(userEmail: string): Promise<{
    exists: boolean;
    active: boolean;
    calendars: string[];
    lastLogin?: string;
  }> {
    try {
      // Wait for service to be ready
      await this.ready();
      
      if (!this.adminSDK) {
        return { exists: false, active: false, calendars: [] };
      }

      // Get user info
      const userResponse = await this.adminSDK.users.get({
        userKey: userEmail
      });

      // Get user's calendars
      const calendarList = await this.calendar.calendarList.list();
      const userCalendars = calendarList.data.items?.filter((cal: any) => 
        cal.id?.includes(userEmail.split('@')[0]) || cal.id === userEmail
      ).map((cal: any) => cal.id) || [];

      return {
        exists: true,
        active: !userResponse.data.suspended,
        calendars: userCalendars,
        lastLogin: userResponse.data.lastLoginTime
      };

    } catch (error: any) {
      if (error?.code === 404) {
        return { exists: false, active: false, calendars: [] };
      }
      
      console.error('❌ Error getting account status:', error);
      return { exists: false, active: false, calendars: [] };
    }
  }

  /**
   * Create workspace account record for cost tracking
   */
  private async createWorkspaceAccountRecord(
    therapistData: TherapistAccountData, 
    workspaceEmail: string
  ): Promise<void> {
    try {
      // Determine plan type based on configuration or default to business-standard
      const planType = process.env.GOOGLE_WORKSPACE_PLAN_TYPE || 'business-standard';
      
      // Use currency service for GBP pricing
      const workspaceCostsGBP = currencyService.getWorkspacePlanCosts('GBP');
      const workspaceCostsUSD = currencyService.getWorkspacePlanCosts('USD');
      
      const monthlyCostGBP = workspaceCostsGBP[planType as keyof typeof workspaceCostsGBP] || 9.60;
      const monthlyCostUSD = workspaceCostsUSD[planType as keyof typeof workspaceCostsUSD] || 12.00;
      
      // Find therapist ID from email
      const existingUser = await storage.getUserByEmail(therapistData.email);
      if (!existingUser) {
        throw new Error(`Therapist not found in database: ${therapistData.email}`);
      }

      // Create workspace account record with proper currency fields
      const workspaceAccountData: InsertWorkspaceAccount = {
        id: nanoid(),
        therapistId: existingUser.id,
        workspaceEmail,
        planType,
        currency: 'GBP',
        monthlyCostGBP: monthlyCostGBP.toString(),
        monthlyCostUSD: monthlyCostUSD.toString(),
        monthlyCost: monthlyCostGBP.toString(), // Legacy field for backward compatibility
        accountStatus: 'active',
        billingCycle: 'monthly',
        lastBillingDate: new Date(),
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await storage.createWorkspaceAccount(workspaceAccountData);
      
      // Initialize usage metrics for current month
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      const initialUsageMetrics = {
        id: nanoid(),
        therapistId: existingUser.id,
        month: currentMonth,
        appointmentsScheduled: 0,
        calendarEventsCreated: 1, // Account for initial calendar setup
        googleMeetSessionsGenerated: 0,
        storageUsedGB: '0.1', // Initial account setup storage
        emailsSent: 1, // Welcome email
        collaboratorsAdded: 0,
        apiCallsUsed: 5, // Initial API calls for account setup
        documentsCreated: 0,
        videosRecorded: 0,
        sharedDriveUsageGB: '0',
        adminAPIRequests: 3, // Account creation API calls
        calendarAPIRequests: 2, // Calendar creation API calls
        meetAPIRequests: 0,
        utilizationScore: 0, // Will be calculated as usage accumulates
        recordedAt: new Date()
      };

      await storage.createUsageMetrics(initialUsageMetrics);
      
      console.log(`💰 Created cost tracking records for therapist ${existingUser.id} with workspace ${workspaceEmail}`);
      
    } catch (error) {
      console.error('❌ Failed to create workspace account record for cost tracking:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const googleWorkspaceAdminService = new GoogleWorkspaceAdminService();