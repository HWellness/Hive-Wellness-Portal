import { db } from "../db.js";
import {
  userConsents,
  consentAuditLog,
  type InsertUserConsent,
  type InsertConsentAuditLog,
  type UserConsent,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { logger } from "../lib/logger.js";

export type ConsentType =
  | "essential"
  | "functional"
  | "analytics"
  | "marketing"
  | "medical_data_processing";

export interface ConsentPreferences {
  essential: boolean; // Always true, required for platform
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  medical_data_processing: boolean;
}

export interface ConsentContext {
  ipAddress?: string;
  userAgent?: string;
  triggeredBy?: string; // 'user' or admin user ID
  metadata?: Record<string, any>;
}

export interface ConsentUpdateOptions {
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  context: ConsentContext;
  consentVersion?: string;
}

export interface ConsentHistoryEntry {
  id: string;
  consentType: ConsentType;
  action: "granted" | "withdrawn" | "updated";
  previousValue: boolean | null;
  newValue: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  consentVersion: string | null;
  timestamp: Date;
}

export class ConsentService {
  /**
   * Initialize default consents for a new user
   * By default, only essential services are granted
   */
  async initializeUserConsents(userId: string, context: ConsentContext): Promise<void> {
    try {
      const consentTypes: ConsentType[] = [
        "essential",
        "functional",
        "analytics",
        "marketing",
        "medical_data_processing",
      ];

      const defaultConsents: ConsentUpdateOptions[] = consentTypes.map((type) => ({
        userId,
        consentType: type,
        granted: type === "essential", // Only essential is granted by default
        context,
        consentVersion: "1.0",
      }));

      // Create all default consents
      for (const consentOpt of defaultConsents) {
        await this.recordConsent(consentOpt);
      }

      logger.info("User consents initialized", { userId });
    } catch (error) {
      logger.error("Failed to initialize user consents", { userId, error });
      throw error;
    }
  }

  /**
   * Record or update a single consent
   */
  async recordConsent(options: ConsentUpdateOptions): Promise<UserConsent> {
    const { userId, consentType, granted, context, consentVersion = "1.0" } = options;

    try {
      // Check if consent already exists
      const existing = await db.query.userConsents.findFirst({
        where: and(eq(userConsents.userId, userId), eq(userConsents.consentType, consentType)),
      });

      const now = new Date();

      // Determine if there's an actual change to log
      const hasChanged = !existing || existing.granted !== granted;

      if (!hasChanged) {
        // No change in consent value, skip update and logging
        logger.debug("Consent unchanged, skipping update", { userId, consentType, granted });
        return existing!;
      }

      // Determine the correct action for audit trail
      let action: "granted" | "withdrawn" | "updated";
      if (!existing) {
        // New consent record - always logged as 'granted' (even if initially denied)
        action = "granted";
      } else if (existing.granted && !granted) {
        // Was granted, now withdrawn
        action = "withdrawn";
      } else if (!existing.granted && granted) {
        // Was denied/withdrawn, now granted
        action = "granted";
      } else {
        // Should not reach here due to hasChanged check, but handle as update
        action = "updated";
      }

      const consentData: InsertUserConsent = {
        id: existing?.id || nanoid(),
        userId,
        consentType,
        granted,
        grantedAt: granted ? now : existing?.grantedAt || null,
        withdrawnAt: !granted && existing?.granted ? now : existing?.withdrawnAt || null,
        ipAddress: context.ipAddress || null,
        userAgent: context.userAgent || null,
        consentVersion,
        metadata: context.metadata || null,
        updatedAt: now,
      };

      // Log to audit trail ONLY if there's a real change
      await this.logConsentChange({
        userId,
        consentType,
        action,
        previousValue: existing?.granted || null,
        newValue: granted,
        ipAddress: context.ipAddress || null,
        userAgent: context.userAgent || null,
        consentVersion,
        triggeredBy: context.triggeredBy || "user",
        metadata: context.metadata || null,
      });

      if (existing) {
        // Update existing consent
        const [updated] = await db
          .update(userConsents)
          .set(consentData)
          .where(eq(userConsents.id, existing.id))
          .returning();

        logger.info("Consent updated", { userId, consentType, granted, action });
        return updated;
      } else {
        // Insert new consent
        const [inserted] = await db.insert(userConsents).values(consentData).returning();

        logger.info("Consent recorded", { userId, consentType, granted, action });
        return inserted;
      }
    } catch (error) {
      logger.error("Failed to record consent", { userId, consentType, error });
      throw error;
    }
  }

  /**
   * Update multiple consents at once (e.g., from consent banner)
   */
  async updateUserConsents(
    userId: string,
    preferences: Partial<ConsentPreferences>,
    context: ConsentContext
  ): Promise<UserConsent[]> {
    try {
      const updates: ConsentUpdateOptions[] = [];

      // Essential consent cannot be withdrawn
      const consentTypes = Object.entries(preferences) as [ConsentType, boolean][];

      for (const [consentType, granted] of consentTypes) {
        if (consentType === "essential" && !granted) {
          logger.warn("Attempted to withdraw essential consent", { userId });
          continue; // Skip - essential cannot be withdrawn
        }

        updates.push({
          userId,
          consentType,
          granted,
          context,
        });
      }

      const results: UserConsent[] = [];
      for (const update of updates) {
        const result = await this.recordConsent(update);
        results.push(result);
      }

      logger.info("User consents updated", { userId, count: results.length });
      return results;
    } catch (error) {
      logger.error("Failed to update user consents", { userId, error });
      throw error;
    }
  }

  /**
   * Get current consent status for a user
   */
  async getUserConsents(userId: string): Promise<ConsentPreferences> {
    try {
      const consents = await db.query.userConsents.findMany({
        where: eq(userConsents.userId, userId),
      });

      // Convert to preferences object
      const preferences: ConsentPreferences = {
        essential: true, // Always true
        functional: false,
        analytics: false,
        marketing: false,
        medical_data_processing: false,
      };

      for (const consent of consents) {
        if (consent.consentType in preferences) {
          preferences[consent.consentType as keyof ConsentPreferences] = consent.granted;
        }
      }

      return preferences;
    } catch (error) {
      logger.error("Failed to get user consents", { userId, error });
      throw error;
    }
  }

  /**
   * Check if a user has responded to the consent banner
   * Returns true if the user has ANY consent records (even if all are false)
   */
  async hasUserResponded(userId: string): Promise<boolean> {
    try {
      const consents = await db.query.userConsents.findMany({
        where: eq(userConsents.userId, userId),
        limit: 1, // We only need to know if at least one exists
      });

      return consents.length > 0;
    } catch (error) {
      logger.error("Failed to check user consent response status", { userId, error });
      return false; // Default to false on error to show banner
    }
  }

  /**
   * Check if user has granted a specific consent
   */
  async hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    try {
      const consent = await db.query.userConsents.findFirst({
        where: and(eq(userConsents.userId, userId), eq(userConsents.consentType, consentType)),
      });

      return consent?.granted || false;
    } catch (error) {
      logger.error("Failed to check consent", { userId, consentType, error });
      return false;
    }
  }

  /**
   * Get consent history for a user (for transparency/audit)
   */
  async getConsentHistory(
    userId: string,
    consentType?: ConsentType
  ): Promise<ConsentHistoryEntry[]> {
    try {
      let query = db.query.consentAuditLog.findMany({
        where: consentType
          ? and(eq(consentAuditLog.userId, userId), eq(consentAuditLog.consentType, consentType))
          : eq(consentAuditLog.userId, userId),
        orderBy: [desc(consentAuditLog.timestamp)],
        limit: 100,
      });

      const history = await query;

      return history.map((entry) => ({
        id: entry.id,
        consentType: entry.consentType as ConsentType,
        action: entry.action as "granted" | "withdrawn" | "updated",
        previousValue: entry.previousValue,
        newValue: entry.newValue,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        consentVersion: entry.consentVersion,
        timestamp: entry.timestamp!,
      }));
    } catch (error) {
      logger.error("Failed to get consent history", { userId, error });
      throw error;
    }
  }

  /**
   * Get consent statistics (for admin analytics)
   */
  async getConsentStatistics(): Promise<
    {
      consentType: ConsentType;
      totalUsers: number;
      granted: number;
      withdrawn: number;
      grantRate: number;
    }[]
  > {
    try {
      const allConsents = await db.query.userConsents.findMany();

      const consentTypes: ConsentType[] = [
        "essential",
        "functional",
        "analytics",
        "marketing",
        "medical_data_processing",
      ];

      const stats = consentTypes.map((type) => {
        const typeConsents = allConsents.filter((c) => c.consentType === type);
        const granted = typeConsents.filter((c) => c.granted).length;
        const withdrawn = typeConsents.filter((c) => !c.granted).length;
        const total = typeConsents.length;

        return {
          consentType: type,
          totalUsers: total,
          granted,
          withdrawn,
          grantRate: total > 0 ? Math.round((granted / total) * 100) : 0,
        };
      });

      return stats;
    } catch (error) {
      logger.error("Failed to get consent statistics", { error });
      throw error;
    }
  }

  /**
   * Log consent change to audit trail
   */
  private async logConsentChange(data: InsertConsentAuditLog): Promise<void> {
    try {
      await db.insert(consentAuditLog).values({
        id: nanoid(),
        ...data,
      });
    } catch (error) {
      logger.error("Failed to log consent change", { error });
      // Don't throw - audit logging failure shouldn't break consent recording
    }
  }

  /**
   * Withdraw all non-essential consents (e.g., before account deletion)
   */
  async withdrawAllConsents(userId: string, context: ConsentContext): Promise<void> {
    try {
      const consents = await db.query.userConsents.findMany({
        where: eq(userConsents.userId, userId),
      });

      for (const consent of consents) {
        // Skip essential consent
        if (consent.consentType === "essential") {
          continue;
        }

        await this.recordConsent({
          userId,
          consentType: consent.consentType as ConsentType,
          granted: false,
          context,
        });
      }

      logger.info("All non-essential consents withdrawn", { userId });
    } catch (error) {
      logger.error("Failed to withdraw all consents", { userId, error });
      throw error;
    }
  }
}

// Export singleton instance
export const consentService = new ConsentService();
