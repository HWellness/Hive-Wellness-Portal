import { z } from "zod";

/**
 * Validation schemas for cost monitoring endpoints
 * Ensures proper currency handling and data integrity
 */

// Supported currencies
export const currencySchema = z.enum(["GBP", "USD"]).default("GBP");

// Month format validation (YYYY-MM)
export const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, {
  message: "Month must be in YYYY-MM format",
});

// Time range validation
export const timeRangeSchema = z.enum(["1M", "3M", "6M", "1Y", "2Y"]).default("6M");

// Cost query parameters schema
export const costQuerySchema = z.object({
  month: monthSchema.optional(),
  timeRange: timeRangeSchema.optional(),
  currency: currencySchema.optional(),
  therapistId: z.string().uuid().optional(),
  includeInactive: z.boolean().default(false),
});

// Cost summary request schema
export const costSummarySchema = z.object({
  startMonth: monthSchema.optional(),
  endMonth: monthSchema.optional(),
  currency: currencySchema.optional(),
  includeProjections: z.boolean().default(false),
});

// Therapist cost breakdown request schema
export const therapistCostSchema = z.object({
  therapistId: z.string().uuid(),
  month: monthSchema.optional(),
  currency: currencySchema.optional(),
  includeRecommendations: z.boolean().default(true),
});

// Cost optimization request schema
export const costOptimizationSchema = z.object({
  month: monthSchema.optional(),
  currency: currencySchema.optional(),
  optimizationType: z
    .enum([
      "all",
      "low-utilization",
      "plan-downgrade",
      "storage-cleanup",
      "api-optimization",
      "license-consolidation",
    ])
    .default("all"),
  minSavingsThreshold: z.number().min(0).default(0),
});

// Cost projection request schema
export const costProjectionSchema = z.object({
  projectionMonths: z.number().int().min(1).max(24).default(12),
  targetTherapistCount: z.number().int().min(1),
  currency: currencySchema.optional(),
  growthScenario: z.enum(["conservative", "realistic", "aggressive"]).default("realistic"),
});

// Budget variance request schema
export const budgetVarianceSchema = z.object({
  budgetId: z.string().uuid(),
  month: monthSchema.optional(),
  currency: currencySchema.optional(),
  includeForecasting: z.boolean().default(true),
});

// Cost report generation request schema
export const costReportSchema = z.object({
  startMonth: monthSchema,
  endMonth: monthSchema,
  currency: currencySchema.optional(),
  reportType: z
    .enum(["summary", "detailed", "therapist-breakdown", "optimization"])
    .default("summary"),
  includeCharts: z.boolean().default(true),
  emailReport: z.boolean().default(false),
  recipients: z.array(z.string().email()).optional(),
});

// Workspace account cost update schema
export const workspaceAccountCostSchema = z.object({
  workspaceAccountId: z.string().uuid(),
  newPlanType: z.enum(["business-starter", "business-standard", "business-plus"]),
  currency: currencySchema.optional(),
  effectiveDate: z.string().datetime().optional(),
  reason: z.string().min(1).max(500).optional(),
});

// Cost budget creation/update schema
export const costBudgetSchema = z.object({
  budgetName: z.string().min(1).max(100),
  budgetType: z.enum(["monthly", "quarterly", "annual", "per-therapist"]),
  budgetAmount: z.number().positive(),
  currency: currencySchema.optional(),
  budgetPeriod: z.string().min(1).max(20), // YYYY-MM or YYYY-Q1, etc.
  alertThresholds: z.array(z.number().min(0).max(100)).min(1).max(5),
  alertRecipients: z.array(z.string().email()).min(1),
  isActive: z.boolean().default(true),
});

// Usage metrics update schema
export const usageMetricsSchema = z.object({
  therapistId: z.string().uuid(),
  month: monthSchema,
  appointmentsScheduled: z.number().int().min(0).default(0),
  calendarEventsCreated: z.number().int().min(0).default(0),
  storageUsedGB: z.number().min(0).default(0),
  emailsSent: z.number().int().min(0).default(0),
  apiCallsUsed: z.number().int().min(0).default(0),
  videosRecorded: z.number().int().min(0).default(0),
});

// Export all schemas for use in routes
export const costValidationSchemas = {
  costQuery: costQuerySchema,
  costSummary: costSummarySchema,
  therapistCost: therapistCostSchema,
  costOptimization: costOptimizationSchema,
  costProjection: costProjectionSchema,
  budgetVariance: budgetVarianceSchema,
  costReport: costReportSchema,
  workspaceAccountCost: workspaceAccountCostSchema,
  costBudget: costBudgetSchema,
  usageMetrics: usageMetricsSchema,
  currency: currencySchema,
  month: monthSchema,
  timeRange: timeRangeSchema,
};

// Type exports
export type CostQueryInput = z.infer<typeof costQuerySchema>;
export type CostSummaryInput = z.infer<typeof costSummarySchema>;
export type TherapistCostInput = z.infer<typeof therapistCostSchema>;
export type CostOptimizationInput = z.infer<typeof costOptimizationSchema>;
export type CostProjectionInput = z.infer<typeof costProjectionSchema>;
export type BudgetVarianceInput = z.infer<typeof budgetVarianceSchema>;
export type CostReportInput = z.infer<typeof costReportSchema>;
export type WorkspaceAccountCostInput = z.infer<typeof workspaceAccountCostSchema>;
export type CostBudgetInput = z.infer<typeof costBudgetSchema>;
export type UsageMetricsInput = z.infer<typeof usageMetricsSchema>;
