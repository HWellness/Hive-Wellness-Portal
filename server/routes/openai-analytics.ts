import { Router, Request, Response } from "express";
import { nanoid } from "nanoid";
import { db } from "../db";
import {
  openaiUsageLogs,
  openaiUsageAlerts,
  openaiUsageThresholds,
  type InsertOpenAIUsageThreshold,
} from "@shared/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { openaiTracking } from "../openai-tracking-service";
import { z } from "zod";

const router = Router();

// Helper to require admin role
function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// GET /api/admin/openai/analytics - Get usage analytics
router.get("/analytics", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, days = "30" } = req.query;

    let start: Date, end: Date;

    if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    } else {
      end = new Date();
      start = new Date();
      start.setDate(start.getDate() - parseInt(days as string, 10));
    }

    const analytics = await openaiTracking.getUsageAnalytics(start, end);

    res.json({
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      ...analytics,
    });
  } catch (error) {
    logger.error("Failed to fetch OpenAI analytics", { error });
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
});

// GET /api/admin/openai/daily-trend - Get daily usage trend
router.get("/daily-trend", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { days = "30" } = req.query;
    const trend = await openaiTracking.getDailyUsageTrend(parseInt(days as string, 10));

    res.json({ trend });
  } catch (error) {
    logger.error("Failed to fetch daily trend", { error });
    res.status(500).json({ message: "Failed to fetch daily trend" });
  }
});

// GET /api/admin/openai/alerts - Get usage alerts
router.get("/alerts", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { resolved = "false", limit = "50" } = req.query;

    let query = db.select().from(openaiUsageAlerts);

    if (resolved === "false") {
      query = query.where(eq(openaiUsageAlerts.resolvedAt, null as any));
    }

    const alerts = await query
      .orderBy(desc(openaiUsageAlerts.createdAt))
      .limit(parseInt(limit as string, 10));

    res.json({ alerts });
  } catch (error) {
    logger.error("Failed to fetch alerts", { error });
    res.status(500).json({ message: "Failed to fetch alerts" });
  }
});

// POST /api/admin/openai/alerts/:alertId/resolve - Resolve an alert
router.post("/alerts/:alertId/resolve", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { resolutionNotes } = req.body;

    await db
      .update(openaiUsageAlerts)
      .set({
        resolvedAt: new Date(),
        resolvedBy: req.session.user!.id,
        resolutionNotes: resolutionNotes || null,
      })
      .where(eq(openaiUsageAlerts.id, alertId));

    res.json({ success: true, message: "Alert resolved" });
  } catch (error) {
    logger.error("Failed to resolve alert", { error });
    res.status(500).json({ message: "Failed to resolve alert" });
  }
});

// GET /api/admin/openai/thresholds - Get configured thresholds
router.get("/thresholds", requireAdmin, async (req: Request, res: Response) => {
  try {
    const thresholds = await db
      .select()
      .from(openaiUsageThresholds)
      .orderBy(openaiUsageThresholds.thresholdType);

    res.json({ thresholds });
  } catch (error) {
    logger.error("Failed to fetch thresholds", { error });
    res.status(500).json({ message: "Failed to fetch thresholds" });
  }
});

// PUT /api/admin/openai/thresholds/:thresholdId - Update threshold
router.put("/thresholds/:thresholdId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { thresholdId } = req.params;
    const schema = z.object({
      limitValue: z.number().positive().optional(),
      warningValue: z.number().positive().optional(),
      isActive: z.boolean().optional(),
      notifyEmails: z.array(z.string().email()).optional(),
      notifySms: z.array(z.string()).optional(),
      description: z.string().optional(),
    });

    const validatedData = schema.parse(req.body);

    await db
      .update(openaiUsageThresholds)
      .set({
        ...validatedData,
        limitValue: validatedData.limitValue?.toString(),
        warningValue: validatedData.warningValue?.toString(),
        updatedAt: new Date(),
      })
      .where(eq(openaiUsageThresholds.id, thresholdId));

    res.json({ success: true, message: "Threshold updated" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    logger.error("Failed to update threshold", { error });
    res.status(500).json({ message: "Failed to update threshold" });
  }
});

// GET /api/admin/openai/recent-logs - Get recent usage logs
router.get("/recent-logs", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { limit = "100", featureType, userId } = req.query;

    let query = db.select().from(openaiUsageLogs);

    const conditions = [];
    if (featureType) {
      conditions.push(eq(openaiUsageLogs.featureType, featureType as any));
    }
    if (userId) {
      conditions.push(eq(openaiUsageLogs.userId, userId as string));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const logs = await query
      .orderBy(desc(openaiUsageLogs.createdAt))
      .limit(parseInt(limit as string, 10));

    res.json({ logs });
  } catch (error) {
    logger.error("Failed to fetch recent logs", { error });
    res.status(500).json({ message: "Failed to fetch recent logs" });
  }
});

// GET /api/admin/openai/stats/summary - Get quick summary stats
router.get("/stats/summary", requireAdmin, async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Today's stats
    const todayStats = await db
      .select({
        requests: sql<number>`COUNT(*)::int`,
        tokens: sql<number>`SUM(${openaiUsageLogs.totalTokens})::int`,
        cost: sql<number>`SUM(${openaiUsageLogs.estimatedCost})::numeric`,
        errors: sql<number>`SUM(CASE WHEN ${openaiUsageLogs.success} = false THEN 1 ELSE 0 END)::int`,
      })
      .from(openaiUsageLogs)
      .where(gte(openaiUsageLogs.createdAt, today));

    // This month's stats
    const monthStats = await db
      .select({
        requests: sql<number>`COUNT(*)::int`,
        tokens: sql<number>`SUM(${openaiUsageLogs.totalTokens})::int`,
        cost: sql<number>`SUM(${openaiUsageLogs.estimatedCost})::numeric`,
      })
      .from(openaiUsageLogs)
      .where(gte(openaiUsageLogs.createdAt, thisMonth));

    // Unresolved alerts count
    const unresolvedAlerts = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(openaiUsageAlerts)
      .where(eq(openaiUsageAlerts.resolvedAt, null as any));

    res.json({
      today: {
        requests: todayStats[0]?.requests || 0,
        tokens: todayStats[0]?.tokens || 0,
        cost: Number(todayStats[0]?.cost || 0),
        errors: todayStats[0]?.errors || 0,
        errorRate:
          todayStats[0]?.requests > 0
            ? ((todayStats[0]?.errors || 0) / todayStats[0].requests) * 100
            : 0,
      },
      thisMonth: {
        requests: monthStats[0]?.requests || 0,
        tokens: monthStats[0]?.tokens || 0,
        cost: Number(monthStats[0]?.cost || 0),
      },
      unresolvedAlerts: unresolvedAlerts[0]?.count || 0,
    });
  } catch (error) {
    logger.error("Failed to fetch summary stats", { error });
    res.status(500).json({ message: "Failed to fetch summary stats" });
  }
});

export default router;
