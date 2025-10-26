import { nanoid } from "nanoid";
import { 
  usageMetrics,
  workspaceAccounts,
  appointments,
  users,
  therapistProfiles,
  type UsageMetric,
  type InsertUsageMetric,
  type WorkspaceAccount
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, count, sql } from "drizzle-orm";
import { google } from 'googleapis';
import cron from 'node-cron';

export interface UsageCollectionResult {
  therapistId: string;
  month: string;
  dataCollected: boolean;
  dataSource: 'api' | 'database' | 'estimated';
  collectionTimestamp: Date;
  metrics: {
    appointmentsScheduled: number;
    calendarEventsCreated: number;
    googleMeetSessionsGenerated: number;
    storageUsedGB: number;
    emailsSent: number;
    collaboratorsAdded: number;
    apiCallsUsed: number;
    documentsCreated: number;
    videosRecorded: number;
    sharedDriveUsageGB: number;
    adminAPIRequests: number;
    calendarAPIRequests: number;
    meetAPIRequests: number;
  };
  utilizationScore: number;
}

export interface SystemUsageSummary {
  month: string;
  totalTherapists: number;
  activeTherapists: number;
  totalAppointments: number;
  totalCalendarEvents: number;
  totalStorageUsedGB: number;
  totalAPICallsUsed: number;
  averageUtilizationScore: number;
  topPerformers: string[];
  underutilizedAccounts: string[];
  collectionCompleteness: number;
}

export interface GoogleWorkspaceUsageData {
  therapistId: string;
  workspaceEmail: string;
  reports: {
    user: any;
    customer: any;
    usage: any;
  };
  collectedAt: Date;
}

export class UsageMetricsCollector {
  private googleAdminSDK: any;
  private calendarAPI: any;
  private driveAPI: any;
  private gmailAPI: any;
  private initialized = false;
  private readonly maxRetries = 3;
  private readonly retryDelay = 2000;

  constructor() {
    this.initializeGoogleAPIs();
    this.scheduleAutomaticCollection();
  }

  /**
   * Initialize Google APIs for usage data collection
   */
  private async initializeGoogleAPIs(): Promise<void> {
    try {
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        
        const auth = new google.auth.JWT({
          email: serviceAccountKey.client_email,
          key: serviceAccountKey.private_key,
          scopes: [
            'https://www.googleapis.com/auth/admin.reports.usage.readonly',
            'https://www.googleapis.com/auth/admin.reports.audit.readonly',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/gmail.readonly'
          ],
          subject: process.env.GOOGLE_ADMIN_EMAIL || 'support@hive-wellness.co.uk'
        });

        this.googleAdminSDK = google.admin({ version: 'reports_v1', auth });
        this.calendarAPI = google.calendar({ version: 'v3', auth });
        this.driveAPI = google.drive({ version: 'v3', auth });
        this.gmailAPI = google.gmail({ version: 'v1', auth });
        
        this.initialized = true;
        console.log('✅ Usage Metrics Collector: Google APIs initialized');
      } else {
        console.log('⚠️ Usage Metrics Collector: No Google service account key found');
      }
    } catch (error) {
      console.error('❌ Usage Metrics Collector: Failed to initialize Google APIs:', error);
    }
  }

  /**
   * Collect usage metrics for a specific therapist and month
   */
  async collectTherapistUsage(
    therapistId: string, 
    month?: string
  ): Promise<UsageCollectionResult> {
    const targetMonth = month || this.getCurrentMonth();
    console.log(`📊 Collecting usage metrics for therapist ${therapistId}, month ${targetMonth}`);

    try {
      // Get workspace account info
      const [workspaceAccount] = await db
        .select()
        .from(workspaceAccounts)
        .where(eq(workspaceAccounts.therapistId, therapistId))
        .limit(1);

      if (!workspaceAccount) {
        throw new Error(`No workspace account found for therapist ${therapistId}`);
      }

      // Collect metrics from various sources
      const metrics = await this.collectComprehensiveMetrics(
        therapistId, 
        workspaceAccount, 
        targetMonth
      );

      // Calculate utilization score
      const utilizationScore = this.calculateUtilizationScore(metrics);

      // Store or update usage metrics in database
      await this.storeUsageMetrics(therapistId, targetMonth, metrics, utilizationScore);

      return {
        therapistId,
        month: targetMonth,
        dataCollected: true,
        dataSource: this.initialized ? 'api' : 'database',
        collectionTimestamp: new Date(),
        metrics,
        utilizationScore
      };

    } catch (error) {
      console.error(`❌ Failed to collect usage for therapist ${therapistId}:`, error);
      
      // Return estimated metrics based on available data
      const estimatedMetrics = await this.getEstimatedMetrics(therapistId, targetMonth);
      
      return {
        therapistId,
        month: targetMonth,
        dataCollected: false,
        dataSource: 'estimated',
        collectionTimestamp: new Date(),
        metrics: estimatedMetrics,
        utilizationScore: 0
      };
    }
  }

  /**
   * Collect comprehensive metrics from all available sources
   */
  private async collectComprehensiveMetrics(
    therapistId: string,
    workspaceAccount: WorkspaceAccount,
    month: string
  ): Promise<UsageCollectionResult['metrics']> {
    const [startDate, endDate] = this.getMonthDateRange(month);

    // Database-based metrics (always available)
    const appointmentsScheduled = await this.getAppointmentCount(therapistId, startDate, endDate);
    
    // Google API-based metrics (if available)
    let calendarEventsCreated = 0;
    let googleMeetSessionsGenerated = 0;
    let storageUsedGB = 0;
    let emailsSent = 0;
    let collaboratorsAdded = 0;
    let documentsCreated = 0;
    let videosRecorded = 0;
    let sharedDriveUsageGB = 0;
    let adminAPIRequests = 0;
    let calendarAPIRequests = 0;
    let meetAPIRequests = 0;

    if (this.initialized) {
      try {
        // Calendar events from Google Calendar API
        calendarEventsCreated = await this.getCalendarEventCount(
          workspaceAccount.workspaceEmail, 
          startDate, 
          endDate
        );

        // Storage usage from Google Admin API
        storageUsedGB = await this.getStorageUsage(workspaceAccount.workspaceEmail);

        // Drive documents and collaboration
        const driveMetrics = await this.getDriveMetrics(workspaceAccount.workspaceEmail, startDate, endDate);
        documentsCreated = driveMetrics.documentsCreated;
        collaboratorsAdded = driveMetrics.collaboratorsAdded;
        sharedDriveUsageGB = driveMetrics.sharedDriveUsageGB;

        // Email metrics from Gmail API
        emailsSent = await this.getEmailCount(workspaceAccount.workspaceEmail, startDate, endDate);

        // Meet sessions generated (1:1 with appointments for now)
        googleMeetSessionsGenerated = appointmentsScheduled;

        // API usage tracking from our internal monitoring
        const apiMetrics = await this.getAPIUsageMetrics(therapistId, startDate, endDate);
        adminAPIRequests = apiMetrics.adminAPIRequests;
        calendarAPIRequests = apiMetrics.calendarAPIRequests;
        meetAPIRequests = apiMetrics.meetAPIRequests;

      } catch (error) {
        console.warn(`⚠️ Some Google API metrics unavailable for ${workspaceAccount.workspaceEmail}:`, error);
      }
    }

    // Internal API usage tracking
    const apiCallsUsed = await this.getInternalAPIUsage(therapistId, startDate, endDate);

    return {
      appointmentsScheduled,
      calendarEventsCreated,
      googleMeetSessionsGenerated,
      storageUsedGB,
      emailsSent,
      collaboratorsAdded,
      apiCallsUsed,
      documentsCreated,
      videosRecorded,
      sharedDriveUsageGB,
      adminAPIRequests,
      calendarAPIRequests,
      meetAPIRequests
    };
  }

  /**
   * Get appointment count for therapist within date range
   */
  private async getAppointmentCount(
    therapistId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(appointments)
      .where(
        and(
          eq(appointments.primaryTherapistId, therapistId),
          gte(appointments.scheduledAt, startDate),
          lte(appointments.scheduledAt, endDate)
        )
      );

    return result?.count || 0;
  }

  /**
   * Get calendar event count from Google Calendar API
   */
  private async getCalendarEventCount(
    workspaceEmail: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    if (!this.calendarAPI) return 0;

    try {
      const response = await this.retryWithBackoff(() =>
        this.calendarAPI.events.list({
          calendarId: workspaceEmail,
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          maxResults: 2500, // High limit to get accurate count
          singleEvents: true,
          orderBy: 'startTime'
        })
      );

      return response.data.items?.length || 0;
    } catch (error) {
      console.warn(`⚠️ Failed to get calendar events for ${workspaceEmail}:`, error);
      return 0;
    }
  }

  /**
   * Get storage usage from Google Admin API
   */
  private async getStorageUsage(workspaceEmail: string): Promise<number> {
    if (!this.googleAdminSDK) return 0;

    try {
      const response = await this.retryWithBackoff(() =>
        this.googleAdminSDK.userUsageReport.get({
          userKey: workspaceEmail,
          date: this.formatDateForAPI(new Date()),
          parameters: 'accounts:total_quota_in_mb,accounts:used_quota_in_mb'
        })
      );

      const usageReports = response.data.usageReports || [];
      if (usageReports.length > 0) {
        const usedQuotaMB = usageReports[0].parameters?.find(
          (p: any) => p.name === 'accounts:used_quota_in_mb'
        )?.intValue || 0;
        
        return usedQuotaMB / 1024; // Convert MB to GB
      }

      return 0;
    } catch (error) {
      console.warn(`⚠️ Failed to get storage usage for ${workspaceEmail}:`, error);
      return 0;
    }
  }

  /**
   * Get Drive metrics (documents, collaborators, shared drive usage)
   */
  private async getDriveMetrics(
    workspaceEmail: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ documentsCreated: number; collaboratorsAdded: number; sharedDriveUsageGB: number }> {
    if (!this.driveAPI) return { documentsCreated: 0, collaboratorsAdded: 0, sharedDriveUsageGB: 0 };

    try {
      // Get files created in date range
      const filesResponse = await this.retryWithBackoff(() =>
        this.driveAPI.files.list({
          q: `createdTime >= '${startDate.toISOString()}' and createdTime <= '${endDate.toISOString()}'`,
          pageSize: 1000,
          fields: 'files(id,name,createdTime,size,mimeType,owners)'
        })
      );

      const files = filesResponse.data.files || [];
      const documentsCreated = files.filter((file: any) => 
        file.mimeType?.includes('document') || 
        file.mimeType?.includes('spreadsheet') ||
        file.mimeType?.includes('presentation')
      ).length;

      // Calculate shared drive usage (simplified)
      const totalSizeBytes = files.reduce((sum: number, file: any) => 
        sum + (parseInt(file.size || '0', 10)), 0
      );
      const sharedDriveUsageGB = totalSizeBytes / (1024 * 1024 * 1024);

      // Collaborators added (simplified - would need permissions API for accuracy)
      const collaboratorsAdded = 0; // Placeholder - requires additional API calls

      return { documentsCreated, collaboratorsAdded, sharedDriveUsageGB };
    } catch (error) {
      console.warn(`⚠️ Failed to get Drive metrics for ${workspaceEmail}:`, error);
      return { documentsCreated: 0, collaboratorsAdded: 0, sharedDriveUsageGB: 0 };
    }
  }

  /**
   * Get email count from Gmail API
   */
  private async getEmailCount(
    workspaceEmail: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    if (!this.gmailAPI) return 0;

    try {
      const query = `in:sent after:${this.formatDateForGmail(startDate)} before:${this.formatDateForGmail(endDate)}`;
      
      const response = await this.retryWithBackoff(() =>
        this.gmailAPI.users.messages.list({
          userId: workspaceEmail,
          q: query,
          maxResults: 500
        })
      );

      return response.data.messages?.length || 0;
    } catch (error) {
      console.warn(`⚠️ Failed to get email count for ${workspaceEmail}:`, error);
      return 0;
    }
  }

  /**
   * Get API usage metrics from our internal tracking
   */
  private async getAPIUsageMetrics(
    therapistId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ adminAPIRequests: number; calendarAPIRequests: number; meetAPIRequests: number }> {
    // This would integrate with our API monitoring/logging system
    // For now, return placeholder values based on appointment count
    const appointmentCount = await this.getAppointmentCount(therapistId, startDate, endDate);
    
    return {
      adminAPIRequests: appointmentCount * 2, // Estimate based on appointment creation
      calendarAPIRequests: appointmentCount * 5, // Calendar operations per appointment
      meetAPIRequests: appointmentCount * 3 // Meet link generation and management
    };
  }

  /**
   * Get internal API usage count from our system
   */
  private async getInternalAPIUsage(
    therapistId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // This would track our internal API calls
    // For now, estimate based on activities
    const appointmentCount = await this.getAppointmentCount(therapistId, startDate, endDate);
    return appointmentCount * 10; // Estimate: 10 API calls per appointment
  }

  /**
   * Calculate utilization score based on usage metrics
   */
  private calculateUtilizationScore(metrics: UsageCollectionResult['metrics']): number {
    // Weight different metrics for overall utilization score
    const appointmentWeight = 0.4;
    const calendarWeight = 0.2;
    const storageWeight = 0.2;
    const collaborationWeight = 0.2;

    // Normalize scores (0-100)
    const appointmentScore = Math.min(100, metrics.appointmentsScheduled * 5); // 20 appointments = 100%
    const calendarScore = Math.min(100, metrics.calendarEventsCreated * 2); // 50 events = 100%
    const storageScore = Math.min(100, metrics.storageUsedGB * 3.33); // 30GB = 100%
    const collaborationScore = Math.min(100, (metrics.documentsCreated + metrics.emailsSent) * 0.5);

    const utilizationScore = 
      (appointmentScore * appointmentWeight) +
      (calendarScore * calendarWeight) +
      (storageScore * storageWeight) +
      (collaborationScore * collaborationWeight);

    return Math.round(utilizationScore);
  }

  /**
   * Store usage metrics in database
   */
  private async storeUsageMetrics(
    therapistId: string,
    month: string,
    metrics: UsageCollectionResult['metrics'],
    utilizationScore: number
  ): Promise<void> {
    const usageData: InsertUsageMetric = {
      id: nanoid(),
      therapistId,
      month,
      appointmentsScheduled: metrics.appointmentsScheduled,
      calendarEventsCreated: metrics.calendarEventsCreated,
      googleMeetSessionsGenerated: metrics.googleMeetSessionsGenerated,
      storageUsedGB: metrics.storageUsedGB.toString(),
      emailsSent: metrics.emailsSent,
      collaboratorsAdded: metrics.collaboratorsAdded,
      apiCallsUsed: metrics.apiCallsUsed,
      documentsCreated: metrics.documentsCreated,
      videosRecorded: metrics.videosRecorded,
      sharedDriveUsageGB: metrics.sharedDriveUsageGB.toString(),
      adminAPIRequests: metrics.adminAPIRequests,
      calendarAPIRequests: metrics.calendarAPIRequests,
      meetAPIRequests: metrics.meetAPIRequests,
      utilizationScore: utilizationScore.toString(),
      recordedAt: new Date(),
      collectedBy: 'automated',
      dataSource: this.initialized ? 'api' : 'database'
    };

    // Upsert usage metrics (update if exists, insert if not)
    await db
      .insert(usageMetrics)
      .values(usageData)
      .onConflictDoUpdate({
        target: [usageMetrics.therapistId, usageMetrics.month],
        set: {
          appointmentsScheduled: usageData.appointmentsScheduled,
          calendarEventsCreated: usageData.calendarEventsCreated,
          googleMeetSessionsGenerated: usageData.googleMeetSessionsGenerated,
          storageUsedGB: usageData.storageUsedGB,
          emailsSent: usageData.emailsSent,
          collaboratorsAdded: usageData.collaboratorsAdded,
          apiCallsUsed: usageData.apiCallsUsed,
          documentsCreated: usageData.documentsCreated,
          videosRecorded: usageData.videosRecorded,
          sharedDriveUsageGB: usageData.sharedDriveUsageGB,
          adminAPIRequests: usageData.adminAPIRequests,
          calendarAPIRequests: usageData.calendarAPIRequests,
          meetAPIRequests: usageData.meetAPIRequests,
          utilizationScore: usageData.utilizationScore,
          recordedAt: usageData.recordedAt
        }
      });

    console.log(`✅ Stored usage metrics for therapist ${therapistId}, month ${month}`);
  }

  /**
   * Collect usage for all active therapists
   */
  async collectAllTherapistUsage(month?: string): Promise<SystemUsageSummary> {
    const targetMonth = month || this.getCurrentMonth();
    console.log(`📊 Collecting usage metrics for all therapists, month ${targetMonth}`);

    // Get all active workspace accounts
    const activeAccounts = await db
      .select()
      .from(workspaceAccounts)
      .where(eq(workspaceAccounts.accountStatus, 'active'));

    const results: UsageCollectionResult[] = [];
    const batchSize = 5; // Process in batches to avoid rate limits

    // Process therapists in batches
    for (let i = 0; i < activeAccounts.length; i += batchSize) {
      const batch = activeAccounts.slice(i, i + batchSize);
      const batchPromises = batch.map(account => 
        this.collectTherapistUsage(account.therapistId, targetMonth)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`❌ Failed to collect usage for therapist ${batch[index].therapistId}:`, result.reason);
        }
      });

      // Add delay between batches to respect rate limits
      if (i + batchSize < activeAccounts.length) {
        await this.delay(2000);
      }
    }

    // Calculate system summary
    const summary = this.calculateSystemSummary(targetMonth, results);
    
    console.log(`✅ Collected usage for ${results.length}/${activeAccounts.length} therapists`);
    return summary;
  }

  /**
   * Calculate system-wide usage summary
   */
  private calculateSystemSummary(
    month: string, 
    results: UsageCollectionResult[]
  ): SystemUsageSummary {
    const totalTherapists = results.length;
    const activeTherapists = results.filter(r => r.metrics.appointmentsScheduled > 0).length;
    const totalAppointments = results.reduce((sum, r) => sum + r.metrics.appointmentsScheduled, 0);
    const totalCalendarEvents = results.reduce((sum, r) => sum + r.metrics.calendarEventsCreated, 0);
    const totalStorageUsedGB = results.reduce((sum, r) => sum + r.metrics.storageUsedGB, 0);
    const totalAPICallsUsed = results.reduce((sum, r) => sum + r.metrics.apiCallsUsed, 0);
    const averageUtilizationScore = totalTherapists > 0 
      ? results.reduce((sum, r) => sum + r.utilizationScore, 0) / totalTherapists 
      : 0;

    // Identify top performers (top 20% by utilization)
    const sortedByUtilization = [...results].sort((a, b) => b.utilizationScore - a.utilizationScore);
    const topPerformersCount = Math.max(1, Math.ceil(totalTherapists * 0.2));
    const topPerformers = sortedByUtilization.slice(0, topPerformersCount).map(r => r.therapistId);

    // Identify underutilized accounts (bottom 20% by utilization)
    const underutilizedCount = Math.max(1, Math.ceil(totalTherapists * 0.2));
    const underutilizedAccounts = sortedByUtilization
      .slice(-underutilizedCount)
      .map(r => r.therapistId);

    // Collection completeness
    const successfulCollections = results.filter(r => r.dataCollected).length;
    const collectionCompleteness = totalTherapists > 0 
      ? (successfulCollections / totalTherapists) * 100 
      : 100;

    return {
      month,
      totalTherapists,
      activeTherapists,
      totalAppointments,
      totalCalendarEvents,
      totalStorageUsedGB,
      totalAPICallsUsed,
      averageUtilizationScore,
      topPerformers,
      underutilizedAccounts,
      collectionCompleteness
    };
  }

  /**
   * Schedule automatic monthly usage collection
   */
  private scheduleAutomaticCollection(): void {
    // Run on the 1st of each month at 2 AM
    cron.schedule('0 2 1 * *', async () => {
      console.log('🕒 Running scheduled usage metrics collection...');
      
      try {
        const lastMonth = this.getLastMonth();
        const summary = await this.collectAllTherapistUsage(lastMonth);
        
        console.log(`✅ Scheduled collection completed for ${lastMonth}:`, {
          totalTherapists: summary.totalTherapists,
          activeTherapists: summary.activeTherapists,
          totalAppointments: summary.totalAppointments,
          collectionCompleteness: summary.collectionCompleteness
        });
        
        // Trigger cost report generation after usage collection
        // This would integrate with the cost monitoring service
        
      } catch (error) {
        console.error('❌ Scheduled usage collection failed:', error);
      }
    }, {
      timezone: 'Europe/London'
    });

    console.log('⏰ Scheduled automatic usage metrics collection (1st of each month at 2 AM)');
  }

  /**
   * Get estimated metrics when API collection fails
   */
  private async getEstimatedMetrics(
    therapistId: string, 
    month: string
  ): Promise<UsageCollectionResult['metrics']> {
    const [startDate, endDate] = this.getMonthDateRange(month);
    const appointmentsScheduled = await this.getAppointmentCount(therapistId, startDate, endDate);
    
    // Provide estimates based on appointment count
    return {
      appointmentsScheduled,
      calendarEventsCreated: appointmentsScheduled * 2, // Estimate
      googleMeetSessionsGenerated: appointmentsScheduled,
      storageUsedGB: Math.min(30, appointmentsScheduled * 0.5), // Estimate
      emailsSent: appointmentsScheduled * 3, // Estimate
      collaboratorsAdded: 0,
      apiCallsUsed: appointmentsScheduled * 10, // Estimate
      documentsCreated: appointmentsScheduled * 0.5, // Estimate
      videosRecorded: 0,
      sharedDriveUsageGB: 0,
      adminAPIRequests: appointmentsScheduled * 2,
      calendarAPIRequests: appointmentsScheduled * 5,
      meetAPIRequests: appointmentsScheduled * 3
    };
  }

  // Utility methods
  private async retryWithBackoff<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        if (attempt === this.maxRetries - 1) throw error;
        
        const delay = this.retryDelay * Math.pow(2, attempt);
        console.warn(`⚠️ API call failed, retrying in ${delay}ms:`, error?.message);
        await this.delay(delay);
      }
    }
    throw new Error('Max retries exceeded');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private getLastMonth(): string {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    return `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  }

  private getMonthDateRange(month: string): [Date, Date] {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
    return [startDate, endDate];
  }

  private formatDateForAPI(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatDateForGmail(date: Date): string {
    return date.toISOString().split('T')[0].replace(/-/g, '/');
  }
}

// Export singleton instance
export const usageCollector = new UsageMetricsCollector();