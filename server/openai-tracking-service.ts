import { nanoid } from 'nanoid';
import { db } from './db';
import { 
  openaiUsageLogs, 
  openaiUsageAlerts, 
  openaiUsageThresholds,
  type InsertOpenAIUsageLog,
  type InsertOpenAIUsageAlert 
} from '@shared/schema';
import { eq, and, gte, lte, sql, desc, asc } from 'drizzle-orm';
import { logger } from './lib/logger';
import { emailService } from './services/email-service.js';
import OpenAI from 'openai';

// GPT-4o pricing (as of 2024) - prices per 1M tokens
const PRICING = {
  'gpt-4o': {
    prompt: 2.50,      // $2.50 per 1M prompt tokens
    completion: 10.00  // $10.00 per 1M completion tokens
  },
  'gpt-4-turbo': {
    prompt: 10.00,
    completion: 30.00
  },
  'gpt-4': {
    prompt: 30.00,
    completion: 60.00
  },
  'gpt-3.5-turbo': {
    prompt: 0.50,
    completion: 1.50
  }
};

export interface TrackingContext {
  userId?: string;
  sessionId?: string;
  featureType: 'chatbot' | 'therapist_matching' | 'therapist_assistant' | 'other';
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class OpenAITrackingService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Wrapper for OpenAI chat completions that automatically tracks usage
   */
  async createChatCompletion(
    params: OpenAI.Chat.ChatCompletionCreateParams,
    context: TrackingContext
  ): Promise<OpenAI.Chat.ChatCompletion> {
    const startTime = Date.now();
    let success = true;
    let errorMessage: string | undefined;
    let response: OpenAI.Chat.ChatCompletion | null = null;

    try {
      response = await this.openai.chat.completions.create(params);
      return response;
    } catch (error: any) {
      success = false;
      errorMessage = error.message || 'Unknown OpenAI API error';
      logger.error('OpenAI API call failed', { error, context });
      throw error;
    } finally {
      const responseTime = Date.now() - startTime;

      // Track usage even if request failed (for error rate monitoring)
      if (response || !success) {
        await this.logUsage({
          model: params.model,
          promptTokens: response?.usage?.prompt_tokens || 0,
          completionTokens: response?.usage?.completion_tokens || 0,
          totalTokens: response?.usage?.total_tokens || 0,
          responseTime,
          success,
          errorMessage,
          ...context
        });
      }
    }
  }

  /**
   * Log individual API usage
   */
  private async logUsage(data: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    responseTime: number;
    success: boolean;
    errorMessage?: string;
    userId?: string;
    sessionId?: string;
    featureType: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      const estimatedCost = this.calculateCost(
        data.model,
        data.promptTokens,
        data.completionTokens
      );

      const logEntry: InsertOpenAIUsageLog = {
        id: nanoid(),
        userId: data.userId || null,
        sessionId: data.sessionId || null,
        featureType: data.featureType as any,
        model: data.model,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        totalTokens: data.totalTokens,
        estimatedCost: estimatedCost.toString(),
        requestMetadata: data.metadata || null,
        responseTime: data.responseTime,
        success: data.success,
        errorMessage: data.errorMessage || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      };

      await db.insert(openaiUsageLogs).values(logEntry);

      // Check for anomalies after logging
      await this.checkForAnomalies(data);
    } catch (error) {
      logger.error('Failed to log OpenAI usage', { error, data });
    }
  }

  /**
   * Calculate estimated cost based on model and token usage
   */
  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = PRICING[model as keyof typeof PRICING] || PRICING['gpt-4o'];
    
    const promptCost = (promptTokens / 1_000_000) * pricing.prompt;
    const completionCost = (completionTokens / 1_000_000) * pricing.completion;
    
    return promptCost + completionCost;
  }

  /**
   * Check for usage anomalies and create alerts
   */
  private async checkForAnomalies(data: {
    userId?: string;
    featureType: string;
    totalTokens: number;
    success: boolean;
  }): Promise<void> {
    try {
      const thresholds = await db
        .select()
        .from(openaiUsageThresholds)
        .where(eq(openaiUsageThresholds.isActive, true));

      const now = new Date();
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(now);
      dayEnd.setHours(23, 59, 59, 999);

      // Check daily token threshold
      const dailyTokenThreshold = thresholds.find(t => t.thresholdType === 'daily_tokens');
      if (dailyTokenThreshold) {
        const todayUsage = await db
          .select({
            total: sql<number>`SUM(${openaiUsageLogs.totalTokens})::int`
          })
          .from(openaiUsageLogs)
          .where(
            and(
              gte(openaiUsageLogs.createdAt, dayStart),
              lte(openaiUsageLogs.createdAt, dayEnd)
            )
          );

        const totalToday = todayUsage[0]?.total || 0;
        const limit = Number(dailyTokenThreshold.limitValue);
        const warning = Number(dailyTokenThreshold.warningValue || limit * 0.8);

        if (totalToday >= limit) {
          await this.createAlert({
            alertType: 'daily_threshold',
            severity: 'critical',
            triggerValue: totalToday.toString(),
            thresholdValue: limit.toString(),
            message: `Daily token limit exceeded: ${totalToday.toLocaleString()} / ${limit.toLocaleString()} tokens used today`,
            metadata: { date: now.toISOString() }
          });
        } else if (totalToday >= warning) {
          await this.createAlert({
            alertType: 'daily_threshold',
            severity: 'medium',
            triggerValue: totalToday.toString(),
            thresholdValue: warning.toString(),
            message: `Daily token warning: ${totalToday.toLocaleString()} / ${limit.toLocaleString()} tokens used today (${Math.round((totalToday / limit) * 100)}%)`,
            metadata: { date: now.toISOString() }
          });
        }
      }

      // Check user-specific daily token threshold
      if (data.userId) {
        const userDailyThreshold = thresholds.find(t => t.thresholdType === 'user_daily_tokens');
        if (userDailyThreshold) {
          const userTodayUsage = await db
            .select({
              total: sql<number>`SUM(${openaiUsageLogs.totalTokens})::int`
            })
            .from(openaiUsageLogs)
            .where(
              and(
                eq(openaiUsageLogs.userId, data.userId),
                gte(openaiUsageLogs.createdAt, dayStart),
                lte(openaiUsageLogs.createdAt, dayEnd)
              )
            );

          const userTotal = userTodayUsage[0]?.total || 0;
          const limit = Number(userDailyThreshold.limitValue);

          if (userTotal >= limit) {
            await this.createAlert({
              alertType: 'user_spike',
              severity: 'high',
              triggerValue: userTotal.toString(),
              thresholdValue: limit.toString(),
              userId: data.userId,
              message: `User ${data.userId} exceeded daily token limit: ${userTotal.toLocaleString()} tokens`,
              metadata: { date: now.toISOString(), featureType: data.featureType }
            });
          }
        }
      }

      // Check error rate
      if (!data.success) {
        const hourStart = new Date(now.getTime() - 60 * 60 * 1000); // Last hour
        const errorRateThreshold = thresholds.find(t => t.thresholdType === 'error_rate');
        
        if (errorRateThreshold) {
          const hourlyStats = await db
            .select({
              total: sql<number>`COUNT(*)::int`,
              errors: sql<number>`SUM(CASE WHEN ${openaiUsageLogs.success} = false THEN 1 ELSE 0 END)::int`
            })
            .from(openaiUsageLogs)
            .where(gte(openaiUsageLogs.createdAt, hourStart));

          const total = hourlyStats[0]?.total || 0;
          const errors = hourlyStats[0]?.errors || 0;
          const errorRate = total > 0 ? (errors / total) * 100 : 0;
          const limit = Number(errorRateThreshold.limitValue);

          if (errorRate >= limit) {
            await this.createAlert({
              alertType: 'error_rate',
              severity: 'high',
              triggerValue: errorRate.toFixed(2),
              thresholdValue: limit.toString(),
              message: `High error rate detected: ${errorRate.toFixed(1)}% (${errors}/${total} requests failed in last hour)`,
              metadata: { hourStart: hourStart.toISOString() }
            });
          }
        }
      }
    } catch (error) {
      logger.error('Failed to check for usage anomalies', { error });
    }
  }

  /**
   * Create a usage alert
   */
  private async createAlert(data: Omit<InsertOpenAIUsageAlert, 'id'>): Promise<void> {
    try {
      // Check if similar alert was created in last hour to avoid spam
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentSimilarAlerts = await db
        .select()
        .from(openaiUsageAlerts)
        .where(
          and(
            eq(openaiUsageAlerts.alertType, data.alertType),
            gte(openaiUsageAlerts.createdAt, hourAgo),
            eq(openaiUsageAlerts.resolvedAt, null as any)
          )
        )
        .limit(1);

      if (recentSimilarAlerts.length > 0) {
        logger.info('Skipping duplicate alert', { alertType: data.alertType });
        return;
      }

      const alertId = nanoid();
      await db.insert(openaiUsageAlerts).values({
        id: alertId,
        ...data
      });

      logger.warn('OpenAI usage alert created', { alert: data });

      // Send notification if configured
      const threshold = await db
        .select()
        .from(openaiUsageThresholds)
        .where(eq(openaiUsageThresholds.isActive, true))
        .limit(1);

      if (threshold.length > 0 && threshold[0].notifyEmails && threshold[0].notifyEmails.length > 0) {
        for (const email of threshold[0].notifyEmails) {
          try {
            await emailService.sendEmail({
              to: email,
              subject: `[${data.severity.toUpperCase()}] OpenAI Usage Alert`,
              body: `${data.message}\n\nAlert Type: ${data.alertType}\nSeverity: ${data.severity}\nTriggered: ${new Date().toISOString()}\n\nView details in the admin dashboard.`,
              html: `
                <h2>OpenAI Usage Alert</h2>
                <p><strong>${data.message}</strong></p>
                <ul>
                  <li><strong>Alert Type:</strong> ${data.alertType}</li>
                  <li><strong>Severity:</strong> <span style="color: ${data.severity === 'critical' ? 'red' : 'orange'}">${data.severity.toUpperCase()}</span></li>
                  <li><strong>Triggered:</strong> ${new Date().toLocaleString()}</li>
                  ${data.userId ? `<li><strong>User ID:</strong> ${data.userId}</li>` : ''}
                  ${data.featureType ? `<li><strong>Feature:</strong> ${data.featureType}</li>` : ''}
                </ul>
                <p>View details in the admin dashboard.</p>
              `
            });
          } catch (emailError) {
            logger.error('Failed to send alert email', { emailError, email });
          }
        }

        // Mark notification as sent
        await db
          .update(openaiUsageAlerts)
          .set({ notificationSent: true, notifiedAt: new Date() })
          .where(eq(openaiUsageAlerts.id, alertId));
      }
    } catch (error) {
      logger.error('Failed to create usage alert', { error, data });
    }
  }

  /**
   * Get usage analytics for a specific time period
   */
  async getUsageAnalytics(startDate: Date, endDate: Date): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    byFeature: Array<{ featureType: string; requests: number; tokens: number; cost: number }>;
    byModel: Array<{ model: string; requests: number; tokens: number; cost: number }>;
    byUser: Array<{ userId: string; requests: number; tokens: number; cost: number }>;
    errorRate: number;
  }> {
    const logs = await db
      .select()
      .from(openaiUsageLogs)
      .where(
        and(
          gte(openaiUsageLogs.createdAt, startDate),
          lte(openaiUsageLogs.createdAt, endDate)
        )
      );

    const totalRequests = logs.length;
    const totalTokens = logs.reduce((sum, log) => sum + log.totalTokens, 0);
    const totalCost = logs.reduce((sum, log) => sum + Number(log.estimatedCost || 0), 0);
    const errors = logs.filter(log => !log.success).length;
    const errorRate = totalRequests > 0 ? (errors / totalRequests) * 100 : 0;

    // Aggregate by feature type
    const byFeatureMap = new Map<string, { requests: number; tokens: number; cost: number }>();
    logs.forEach(log => {
      const existing = byFeatureMap.get(log.featureType) || { requests: 0, tokens: 0, cost: 0 };
      byFeatureMap.set(log.featureType, {
        requests: existing.requests + 1,
        tokens: existing.tokens + log.totalTokens,
        cost: existing.cost + Number(log.estimatedCost || 0)
      });
    });

    // Aggregate by model
    const byModelMap = new Map<string, { requests: number; tokens: number; cost: number }>();
    logs.forEach(log => {
      const existing = byModelMap.get(log.model) || { requests: 0, tokens: 0, cost: 0 };
      byModelMap.set(log.model, {
        requests: existing.requests + 1,
        tokens: existing.tokens + log.totalTokens,
        cost: existing.cost + Number(log.estimatedCost || 0)
      });
    });

    // Aggregate by user
    const byUserMap = new Map<string, { requests: number; tokens: number; cost: number }>();
    logs.forEach(log => {
      if (log.userId) {
        const existing = byUserMap.get(log.userId) || { requests: 0, tokens: 0, cost: 0 };
        byUserMap.set(log.userId, {
          requests: existing.requests + 1,
          tokens: existing.tokens + log.totalTokens,
          cost: existing.cost + Number(log.estimatedCost || 0)
        });
      }
    });

    return {
      totalRequests,
      totalTokens,
      totalCost,
      byFeature: Array.from(byFeatureMap.entries()).map(([featureType, stats]) => ({
        featureType,
        ...stats
      })),
      byModel: Array.from(byModelMap.entries()).map(([model, stats]) => ({
        model,
        ...stats
      })),
      byUser: Array.from(byUserMap.entries()).map(([userId, stats]) => ({
        userId,
        ...stats
      })).sort((a, b) => b.cost - a.cost).slice(0, 10), // Top 10 users by cost
      errorRate
    };
  }

  /**
   * Get daily usage trend
   */
  async getDailyUsageTrend(days: number = 30): Promise<Array<{
    date: string;
    requests: number;
    tokens: number;
    cost: number;
  }>> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await db
      .select({
        date: sql<string>`DATE(${openaiUsageLogs.createdAt})`,
        requests: sql<number>`COUNT(*)::int`,
        tokens: sql<number>`SUM(${openaiUsageLogs.totalTokens})::int`,
        cost: sql<number>`SUM(${openaiUsageLogs.estimatedCost})::numeric`
      })
      .from(openaiUsageLogs)
      .where(
        and(
          gte(openaiUsageLogs.createdAt, startDate),
          lte(openaiUsageLogs.createdAt, endDate)
        )
      )
      .groupBy(sql`DATE(${openaiUsageLogs.createdAt})`)
      .orderBy(asc(sql`DATE(${openaiUsageLogs.createdAt})`));

    return result.map(row => ({
      date: row.date,
      requests: row.requests,
      tokens: row.tokens,
      cost: Number(row.cost)
    }));
  }
}

// Export singleton instance
export const openaiTracking = new OpenAITrackingService(process.env.OPENAI_API_KEY || '');
