import { db } from "./db";
import {
  users,
  formSubmissions,
  sessions,
  appointments,
  retentionPolicies,
  retentionAuditLogs,
} from "@shared/schema";
import { sql, lt, and, isNull, or, eq } from "drizzle-orm";

export interface RetentionPolicy {
  name: string;
  dataType: "users" | "sessions" | "form_submissions" | "appointments";
  retentionDays: number;
  enabled: boolean;
  softDeleteFirst?: boolean;
  gracePeriodDays?: number;
}

export interface RetentionResult {
  dataType: string;
  softDeleted: number;
  hardDeleted: number;
  skipped: number;
  errors: string[];
}

export interface RetentionLog {
  timestamp: Date;
  dataType: string;
  recordId: string;
  action: "soft_delete" | "hard_delete" | "skip";
  reason: string;
  dryRun: boolean;
}

const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    name: "Inactive Unverified Users",
    dataType: "users",
    retentionDays: 180, // 6 months
    enabled: true,
    softDeleteFirst: true,
    gracePeriodDays: 30,
  },
  {
    name: "Old Sessions",
    dataType: "sessions",
    retentionDays: 90, // 3 months
    enabled: true,
    softDeleteFirst: false,
  },
  {
    name: "Old Form Submissions",
    dataType: "form_submissions",
    retentionDays: 365, // 1 year
    enabled: true,
    softDeleteFirst: true,
    gracePeriodDays: 30,
  },
  {
    name: "Cancelled Appointments",
    dataType: "appointments",
    retentionDays: 180, // 6 months
    enabled: true,
    softDeleteFirst: true,
    gracePeriodDays: 30,
  },
];

export class DataRetentionService {
  private retentionLogs: RetentionLog[] = [];
  private policies: RetentionPolicy[];

  constructor(customPolicies?: RetentionPolicy[]) {
    this.policies = customPolicies || DEFAULT_RETENTION_POLICIES;
  }

  /**
   * Run data retention process for all enabled policies
   */
  async runRetention(dryRun: boolean = false): Promise<RetentionResult[]> {
    console.log(`🗑️ Starting data retention process (${dryRun ? "DRY RUN" : "LIVE"})...`);

    const results: RetentionResult[] = [];

    for (const policy of this.policies) {
      if (!policy.enabled) {
        console.log(`⏭️ Skipping disabled policy: ${policy.name}`);
        continue;
      }

      console.log(`📋 Processing policy: ${policy.name} (${policy.dataType})`);

      try {
        const result = await this.processPolicy(policy, dryRun);
        results.push(result);
      } catch (error) {
        console.error(`❌ Error processing policy ${policy.name}:`, error);
        results.push({
          dataType: policy.dataType,
          softDeleted: 0,
          hardDeleted: 0,
          skipped: 0,
          errors: [error instanceof Error ? error.message : String(error)],
        });
      }
    }

    console.log(`✅ Data retention complete. Summary:`, results);
    return results;
  }

  /**
   * Process a single retention policy
   */
  private async processPolicy(policy: RetentionPolicy, dryRun: boolean): Promise<RetentionResult> {
    const result: RetentionResult = {
      dataType: policy.dataType,
      softDeleted: 0,
      hardDeleted: 0,
      skipped: 0,
      errors: [],
    };

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    console.log(`📅 Retention cutoff date for ${policy.name}: ${cutoffDate.toISOString()}`);

    switch (policy.dataType) {
      case "users":
        return await this.processUsers(policy, cutoffDate, dryRun);

      case "sessions":
        return await this.processSessions(policy, cutoffDate, dryRun);

      case "form_submissions":
        return await this.processFormSubmissions(policy, cutoffDate, dryRun);

      case "appointments":
        return await this.processAppointments(policy, cutoffDate, dryRun);

      default:
        throw new Error(`Unknown data type: ${policy.dataType}`);
    }
  }

  /**
   * Process user retention - only delete unverified/inactive users
   */
  private async processUsers(
    policy: RetentionPolicy,
    cutoffDate: Date,
    dryRun: boolean
  ): Promise<RetentionResult> {
    const result: RetentionResult = {
      dataType: "users",
      softDeleted: 0,
      hardDeleted: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // Find unverified users created before cutoff date
      const eligibleUsers = await db
        .select()
        .from(users)
        .where(
          and(
            lt(users.createdAt, cutoffDate),
            or(sql`${users.isVerified} = false`, sql`${users.isActive} = false`),
            isNull(users.deletedAt)
          )
        );

      console.log(`👤 Found ${eligibleUsers.length} eligible users for retention`);

      for (const user of eligibleUsers) {
        // Skip admin users and verified active users
        if (user.role === "admin" || (user.isVerified && user.isActive)) {
          result.skipped++;
          this.logRetention({
            timestamp: new Date(),
            dataType: "users",
            recordId: user.id,
            action: "skip",
            reason: "Admin or active verified user",
            dryRun,
          });
          continue;
        }

        if (policy.softDeleteFirst) {
          // Soft delete first
          if (!dryRun) {
            await db
              .update(users)
              .set({ deletedAt: new Date() })
              .where(sql`${users.id} = ${user.id}`);
          }
          result.softDeleted++;

          this.logRetention({
            timestamp: new Date(),
            dataType: "users",
            recordId: user.id,
            action: "soft_delete",
            reason: `Unverified/inactive user older than ${policy.retentionDays} days`,
            dryRun,
          });

          console.log(
            `🗑️ ${dryRun ? "[DRY RUN] Would soft delete" : "Soft deleted"} user: ${user.email}`
          );
        }
      }

      // Hard delete users that have been soft-deleted past grace period
      if (policy.gracePeriodDays) {
        const hardDeleteCutoff = new Date();
        hardDeleteCutoff.setDate(hardDeleteCutoff.getDate() - policy.gracePeriodDays);

        const softDeletedUsers = await db
          .select()
          .from(users)
          .where(and(lt(users.deletedAt!, hardDeleteCutoff), sql`${users.deletedAt} IS NOT NULL`));

        console.log(
          `🗑️ Found ${softDeletedUsers.length} users past grace period for hard deletion`
        );

        for (const user of softDeletedUsers) {
          if (!dryRun) {
            await db.delete(users).where(sql`${users.id} = ${user.id}`);
          }
          result.hardDeleted++;

          this.logRetention({
            timestamp: new Date(),
            dataType: "users",
            recordId: user.id,
            action: "hard_delete",
            reason: `Grace period expired (${policy.gracePeriodDays} days)`,
            dryRun,
          });

          console.log(
            `💀 ${dryRun ? "[DRY RUN] Would hard delete" : "Hard deleted"} user: ${user.email}`
          );
        }
      }
    } catch (error) {
      console.error("Error processing users:", error);
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  /**
   * Process session retention - delete expired sessions
   */
  private async processSessions(
    policy: RetentionPolicy,
    cutoffDate: Date,
    dryRun: boolean
  ): Promise<RetentionResult> {
    const result: RetentionResult = {
      dataType: "sessions",
      softDeleted: 0,
      hardDeleted: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // Find sessions that expired before cutoff date
      const expiredSessions = await db
        .select()
        .from(sessions)
        .where(lt(sessions.expireDate, cutoffDate));

      console.log(`🔐 Found ${expiredSessions.length} expired sessions for deletion`);

      if (!dryRun && expiredSessions.length > 0) {
        await db.delete(sessions).where(lt(sessions.expireDate, cutoffDate));
      }

      result.hardDeleted = expiredSessions.length;

      for (const session of expiredSessions) {
        this.logRetention({
          timestamp: new Date(),
          dataType: "sessions",
          recordId: session.sid,
          action: "hard_delete",
          reason: `Session expired more than ${policy.retentionDays} days ago`,
          dryRun,
        });
      }

      console.log(
        `🗑️ ${dryRun ? "[DRY RUN] Would delete" : "Deleted"} ${expiredSessions.length} expired sessions`
      );
    } catch (error) {
      console.error("Error processing sessions:", error);
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  /**
   * Process form submission retention
   */
  private async processFormSubmissions(
    policy: RetentionPolicy,
    cutoffDate: Date,
    dryRun: boolean
  ): Promise<RetentionResult> {
    const result: RetentionResult = {
      dataType: "form_submissions",
      softDeleted: 0,
      hardDeleted: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // Find old form submissions
      const oldSubmissions = await db
        .select()
        .from(formSubmissions)
        .where(and(lt(formSubmissions.createdAt, cutoffDate), isNull(formSubmissions.deletedAt)));

      console.log(`📝 Found ${oldSubmissions.length} old form submissions`);

      for (const submission of oldSubmissions) {
        if (policy.softDeleteFirst) {
          if (!dryRun) {
            await db
              .update(formSubmissions)
              .set({ deletedAt: new Date() })
              .where(sql`${formSubmissions.id} = ${submission.id}`);
          }
          result.softDeleted++;

          this.logRetention({
            timestamp: new Date(),
            dataType: "form_submissions",
            recordId: submission.id,
            action: "soft_delete",
            reason: `Form submission older than ${policy.retentionDays} days`,
            dryRun,
          });
        }
      }

      // Hard delete after grace period
      if (policy.gracePeriodDays) {
        const hardDeleteCutoff = new Date();
        hardDeleteCutoff.setDate(hardDeleteCutoff.getDate() - policy.gracePeriodDays);

        const softDeletedSubmissions = await db
          .select()
          .from(formSubmissions)
          .where(
            and(
              lt(formSubmissions.deletedAt!, hardDeleteCutoff),
              sql`${formSubmissions.deletedAt} IS NOT NULL`
            )
          );

        if (!dryRun && softDeletedSubmissions.length > 0) {
          for (const submission of softDeletedSubmissions) {
            await db.delete(formSubmissions).where(sql`${formSubmissions.id} = ${submission.id}`);
          }
        }

        result.hardDeleted = softDeletedSubmissions.length;
      }

      console.log(
        `🗑️ ${dryRun ? "[DRY RUN] Would process" : "Processed"} form submissions: ${result.softDeleted} soft deleted, ${result.hardDeleted} hard deleted`
      );
    } catch (error) {
      console.error("Error processing form submissions:", error);
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  /**
   * Process appointment retention - only cancelled/completed appointments
   */
  private async processAppointments(
    policy: RetentionPolicy,
    cutoffDate: Date,
    dryRun: boolean
  ): Promise<RetentionResult> {
    const result: RetentionResult = {
      dataType: "appointments",
      softDeleted: 0,
      hardDeleted: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // Find old cancelled appointments
      // IMPORTANT: Never delete appointments with financial records
      const oldAppointments = await db
        .select()
        .from(appointments)
        .where(
          and(
            lt(appointments.createdAt, cutoffDate),
            or(sql`${appointments.status} = 'cancelled'`, sql`${appointments.status} = 'no_show'`),
            isNull(appointments.deletedAt)
          )
        );

      console.log(`📅 Found ${oldAppointments.length} old cancelled appointments`);

      for (const appointment of oldAppointments) {
        // Skip appointments with payment records (for financial compliance)
        if (appointment.paymentStatus !== "pending" && appointment.price && appointment.price > 0) {
          result.skipped++;
          this.logRetention({
            timestamp: new Date(),
            dataType: "appointments",
            recordId: appointment.id,
            action: "skip",
            reason: "Has payment record - must be retained for compliance",
            dryRun,
          });
          continue;
        }

        if (policy.softDeleteFirst) {
          if (!dryRun) {
            await db
              .update(appointments)
              .set({ deletedAt: new Date() })
              .where(sql`${appointments.id} = ${appointment.id}`);
          }
          result.softDeleted++;

          this.logRetention({
            timestamp: new Date(),
            dataType: "appointments",
            recordId: appointment.id,
            action: "soft_delete",
            reason: `Cancelled appointment older than ${policy.retentionDays} days`,
            dryRun,
          });
        }
      }

      console.log(
        `🗑️ ${dryRun ? "[DRY RUN] Would process" : "Processed"} appointments: ${result.softDeleted} soft deleted, ${result.skipped} skipped`
      );
    } catch (error) {
      console.error("Error processing appointments:", error);
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  /**
   * Get users scheduled for deletion in the next N days (for warning emails)
   */
  async getUsersScheduledForDeletion(daysAhead: number = 7): Promise<any[]> {
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + daysAhead);

    const policy = this.policies.find((p) => p.dataType === "users");
    if (!policy || !policy.enabled) {
      return [];
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (policy.retentionDays - daysAhead));

    try {
      const usersAtRisk = await db
        .select()
        .from(users)
        .where(
          and(
            lt(users.createdAt, cutoffDate),
            or(eq(users.isVerified, false), eq(users.isActive, false)),
            isNull(users.deletedAt)
          )
        );

      console.log(
        `⚠️ Found ${usersAtRisk.length} users scheduled for deletion in ${daysAhead} days`
      );
      return usersAtRisk;
    } catch (error) {
      console.error("Error finding users scheduled for deletion:", error);
      return [];
    }
  }

  /**
   * Log a retention action
   */
  private logRetention(log: RetentionLog): void {
    this.retentionLogs.push(log);
  }

  /**
   * Get retention logs
   */
  getRetentionLogs(): RetentionLog[] {
    return this.retentionLogs;
  }

  /**
   * Clear retention logs
   */
  clearLogs(): void {
    this.retentionLogs = [];
  }

  /**
   * Get current retention policies
   */
  getPolicies(): RetentionPolicy[] {
    return this.policies;
  }

  /**
   * Update retention policies
   */
  setPolicies(policies: RetentionPolicy[]): void {
    this.policies = policies;
  }
}

// Export singleton instance
export const dataRetentionService = new DataRetentionService();
