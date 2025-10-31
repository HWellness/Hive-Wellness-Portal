import { nanoid } from "nanoid";
import {
  workspaceAccounts,
  usageMetrics,
  costReports,
  costBudgets,
  costOptimizations,
  appointments,
  users,
  therapistProfiles,
  type WorkspaceAccount,
  type InsertWorkspaceAccount,
  type UsageMetric,
  type InsertUsageMetric,
  type CostReport,
  type InsertCostReport,
  type CostBudget,
  type InsertCostBudget,
  type CostOptimization,
  type InsertCostOptimization,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, or, sum, count, avg, sql } from "drizzle-orm";
import { notificationService } from "./services/notification-service";
import { emailService } from "./services/email-service";
import {
  currencyService,
  type SupportedCurrency,
  type CurrencyAmount,
  WORKSPACE_PLAN_COSTS_GBP,
  OVERAGE_COSTS_GBP,
} from "./currency-service";

// REMOVED: Using currency service for consistent GBP pricing
// Google Workspace Plan Pricing now handled by currencyService.getWorkspacePlanCosts()
// Overage costs now handled by currencyService.getOverageCosts()

export interface TherapistCostBreakdown {
  therapistId: string;
  therapistName: string;
  therapistEmail: string;
  workspaceEmail: string;
  planType: string;
  currency: SupportedCurrency;
  baseCost: CurrencyAmount;
  storageOverageCost: CurrencyAmount;
  apiOverageCost: CurrencyAmount;
  meetRecordingCost: CurrencyAmount;
  totalMonthlyCost: CurrencyAmount;
  appointmentsCount: number;
  costPerAppointment: CurrencyAmount;
  utilizationRate: number;
  efficiencyScore: number;
  storageUsedGB: number;
  storageQuotaGB: number;
  lastActiveDate: Date | null;
  accountAge: number; // Days since account creation
  recommendations: OptimizationRecommendation[];
}

export interface SystemCostSummary {
  month: string;
  currency: SupportedCurrency;
  totalCost: CurrencyAmount;
  totalWorkspaceCost: CurrencyAmount;
  totalOverageCosts: CurrencyAmount;
  activeTherapistAccounts: number;
  totalAppointments: number;
  averageCostPerTherapist: CurrencyAmount;
  costPerAppointment: CurrencyAmount;
  monthOverMonthChange: number;
  yearOverYearChange: number;
  utilizationRate: number;
  efficiencyScore: number;
  topCostDrivers: CostDriver[];
  projectedNextMonthCost: CurrencyAmount;
  budgetVariance: CurrencyAmount;
  optimizationPotential: CurrencyAmount;
}

export interface OptimizationRecommendation {
  id: string;
  type:
    | "low-utilization"
    | "plan-downgrade"
    | "storage-cleanup"
    | "api-optimization"
    | "license-consolidation";
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  potentialMonthlySavings: CurrencyAmount;
  implementationEffort: "low" | "medium" | "high";
  actionRequired: string;
  deadline?: Date;
}

export interface CostDriver {
  category: string;
  amount: CurrencyAmount;
  percentage: number;
  trend: "increasing" | "decreasing" | "stable";
  impact: "high" | "medium" | "low";
}

export interface CostProjection {
  projectionMonths: number;
  scenarios: {
    conservative: ProjectionScenario;
    realistic: ProjectionScenario;
    aggressive: ProjectionScenario;
  };
}

export interface ProjectionScenario {
  monthlyTherapistGrowth: number;
  projectedMonthlyCosts: CurrencyAmount[];
  totalProjectedCost: CurrencyAmount;
  assumptions: string[];
}

export class GoogleWorkspaceCostCalculator {
  /**
   * Calculate detailed cost breakdown for a specific therapist
   */
  async calculateTherapistCostBreakdown(
    therapistId: string,
    month?: string
  ): Promise<TherapistCostBreakdown> {
    const targetMonth = month || this.getCurrentMonth();

    // Get therapist workspace account
    const [workspaceAccount] = await db
      .select()
      .from(workspaceAccounts)
      .where(eq(workspaceAccounts.therapistId, therapistId))
      .limit(1);

    if (!workspaceAccount) {
      throw new Error(`No workspace account found for therapist ${therapistId}`);
    }

    // Get therapist info
    const [therapist] = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, therapistId))
      .limit(1);

    // Get usage metrics for the month
    const [usage] = await db
      .select()
      .from(usageMetrics)
      .where(and(eq(usageMetrics.therapistId, therapistId), eq(usageMetrics.month, targetMonth)))
      .limit(1);

    // Get appointment count for the month
    const [appointmentData] = await db
      .select({ count: count() })
      .from(appointments)
      .where(
        and(
          eq(appointments.primaryTherapistId, therapistId),
          sql`DATE_TRUNC('month', ${appointments.scheduledAt}) = ${targetMonth + "-01"}`
        )
      );

    const appointmentsCount = appointmentData?.count || 0;

    // Calculate base costs using GBP pricing
    const workspaceCostsGBP = currencyService.getWorkspacePlanCosts("GBP");
    const overageCostsGBP = currencyService.getOverageCosts("GBP");
    const baseCostAmount =
      workspaceCostsGBP[workspaceAccount.planType as keyof typeof workspaceCostsGBP] || 9.6;

    // Calculate overage costs in GBP
    const storageUsedGB = usage ? parseFloat(usage.storageUsedGB?.toString() || "0") : 0;
    const storageQuotaGB = workspaceAccount.storageQuotaGB || 30;
    const storageOverageGB = Math.max(0, storageUsedGB - storageQuotaGB);
    const storageOverageCostAmount = storageOverageGB * overageCostsGBP.storagePerGB;

    const apiCallsUsed = usage?.apiCallsUsed || 0;
    const apiCallsQuota = 10000; // Standard quota per month
    const apiOverageCount = Math.max(0, apiCallsUsed - apiCallsQuota);
    const apiOverageCostAmount = (apiOverageCount / 1000) * overageCostsGBP.apiCallsPer1000;

    const videosRecorded = usage?.videosRecorded || 0;
    const meetRecordingCostAmount = videosRecorded * overageCostsGBP.meetRecordingPerHour;

    const totalMonthlyCostAmount =
      baseCostAmount + storageOverageCostAmount + apiOverageCostAmount + meetRecordingCostAmount;
    const costPerAppointmentAmount =
      appointmentsCount > 0 ? totalMonthlyCostAmount / appointmentsCount : totalMonthlyCostAmount;

    // Calculate utilization and efficiency scores
    const lastActiveDate = usage?.lastActiveDate || null;
    const accountAge = this.calculateAccountAge(workspaceAccount.accountCreatedAt);
    const utilizationRate = this.calculateUtilizationRate(usage, appointmentsCount, accountAge);
    const efficiencyScore = this.calculateEfficiencyScore(
      costPerAppointmentAmount,
      utilizationRate,
      storageUsedGB,
      storageQuotaGB
    );

    // Generate optimization recommendations
    const recommendations = await this.generateOptimizationRecommendations({
      therapistId,
      workspaceAccount,
      usage,
      appointmentsCount,
      utilizationRate,
      costPerAppointment: costPerAppointmentAmount,
      storageOverageGB,
      apiOverageCount,
    });

    return {
      therapistId,
      therapistName: `${therapist?.firstName || ""} ${therapist?.lastName || ""}`.trim(),
      therapistEmail: therapist?.email || "",
      workspaceEmail: workspaceAccount.workspaceEmail,
      planType: workspaceAccount.planType,
      currency: "GBP" as SupportedCurrency,
      baseCost: currencyService.createCurrencyAmount(baseCostAmount, "GBP"),
      storageOverageCost: currencyService.createCurrencyAmount(storageOverageCostAmount, "GBP"),
      apiOverageCost: currencyService.createCurrencyAmount(apiOverageCostAmount, "GBP"),
      meetRecordingCost: currencyService.createCurrencyAmount(meetRecordingCostAmount, "GBP"),
      totalMonthlyCost: currencyService.createCurrencyAmount(totalMonthlyCostAmount, "GBP"),
      appointmentsCount,
      costPerAppointment: currencyService.createCurrencyAmount(costPerAppointmentAmount, "GBP"),
      utilizationRate,
      efficiencyScore,
      storageUsedGB,
      storageQuotaGB,
      lastActiveDate,
      accountAge,
      recommendations,
    };
  }

  /**
   * Calculate system-wide cost summary
   */
  async calculateSystemCostSummary(month?: string): Promise<SystemCostSummary> {
    const targetMonth = month || this.getCurrentMonth();

    // Get all active workspace accounts
    const activeAccounts = await db
      .select()
      .from(workspaceAccounts)
      .where(eq(workspaceAccounts.accountStatus, "active"));

    // Calculate total costs for all therapists
    const therapistBreakdowns = await Promise.all(
      activeAccounts.map((account) =>
        this.calculateTherapistCostBreakdown(account.therapistId, targetMonth)
      )
    );

    const totalCostAmount = therapistBreakdowns.reduce(
      (sum, breakdown) => sum + breakdown.totalMonthlyCost.amount,
      0
    );
    const totalWorkspaceCostAmount = therapistBreakdowns.reduce(
      (sum, breakdown) => sum + breakdown.baseCost.amount,
      0
    );
    const totalOverageCostsAmount = totalCostAmount - totalWorkspaceCostAmount;
    const totalAppointments = therapistBreakdowns.reduce(
      (sum, breakdown) => sum + breakdown.appointmentsCount,
      0
    );
    const averageCostPerTherapistAmount =
      activeAccounts.length > 0 ? totalCostAmount / activeAccounts.length : 0;
    const costPerAppointmentAmount =
      totalAppointments > 0 ? totalCostAmount / totalAppointments : 0;
    const averageUtilization =
      activeAccounts.length > 0
        ? therapistBreakdowns.reduce((sum, breakdown) => sum + breakdown.utilizationRate, 0) /
          activeAccounts.length
        : 0;
    const averageEfficiency =
      activeAccounts.length > 0
        ? therapistBreakdowns.reduce((sum, breakdown) => sum + breakdown.efficiencyScore, 0) /
          activeAccounts.length
        : 0;

    // Calculate month-over-month and year-over-year changes
    const [previousMonthReport, previousYearReport] = await Promise.all([
      this.getPreviousMonthCostReport(targetMonth),
      this.getPreviousYearCostReport(targetMonth),
    ]);

    const monthOverMonthChange = previousMonthReport
      ? ((totalCostAmount - parseFloat(previousMonthReport.totalCost.toString())) /
          parseFloat(previousMonthReport.totalCost.toString())) *
        100
      : 0;

    const yearOverYearChange = previousYearReport
      ? ((totalCostAmount - parseFloat(previousYearReport.totalCost.toString())) /
          parseFloat(previousYearReport.totalCost.toString())) *
        100
      : 0;

    // Identify top cost drivers
    const topCostDrivers = this.identifyTopCostDrivers(therapistBreakdowns);

    // Project next month's costs
    const projectedNextMonthCostAmount = this.projectNextMonthCosts(
      therapistBreakdowns,
      monthOverMonthChange
    );

    // Calculate budget variance (if budget exists)
    const budgetVarianceAmount = await this.calculateBudgetVariance(targetMonth, totalCostAmount);

    // Calculate optimization potential
    const optimizationPotentialAmount = therapistBreakdowns.reduce(
      (sum, breakdown) =>
        sum +
        breakdown.recommendations.reduce(
          (recSum, rec) => recSum + rec.potentialMonthlySavings.amount,
          0
        ),
      0
    );

    return {
      month: targetMonth,
      currency: "GBP" as SupportedCurrency,
      totalCost: currencyService.createCurrencyAmount(totalCostAmount, "GBP"),
      totalWorkspaceCost: currencyService.createCurrencyAmount(totalWorkspaceCostAmount, "GBP"),
      totalOverageCosts: currencyService.createCurrencyAmount(totalOverageCostsAmount, "GBP"),
      activeTherapistAccounts: activeAccounts.length,
      totalAppointments,
      averageCostPerTherapist: currencyService.createCurrencyAmount(
        averageCostPerTherapistAmount,
        "GBP"
      ),
      costPerAppointment: currencyService.createCurrencyAmount(costPerAppointmentAmount, "GBP"),
      monthOverMonthChange,
      yearOverYearChange,
      utilizationRate: averageUtilization,
      efficiencyScore: averageEfficiency,
      topCostDrivers,
      projectedNextMonthCost: currencyService.createCurrencyAmount(
        projectedNextMonthCostAmount,
        "GBP"
      ),
      budgetVariance: currencyService.createCurrencyAmount(budgetVarianceAmount, "GBP"),
      optimizationPotential: currencyService.createCurrencyAmount(
        optimizationPotentialAmount,
        "GBP"
      ),
    };
  }

  /**
   * Generate cost projections for scaling scenarios
   */
  async generateCostProjections(
    targetTherapistCount: number,
    projectionMonths: number = 12,
    currentTherapistCount?: number
  ): Promise<CostProjection> {
    const currentCount = currentTherapistCount || (await this.getCurrentActiveTherapistCount());
    const currentMonthlyCost = await this.getCurrentMonthlyCost();
    const averageCostPerTherapist = currentCount > 0 ? currentMonthlyCost / currentCount : 12.0;

    // Conservative scenario: 10% month-over-month growth
    const conservative = this.calculateProjectionScenario(
      currentCount,
      targetTherapistCount,
      projectionMonths,
      0.1,
      averageCostPerTherapist,
      "Conservative growth with standard plans"
    );

    // Realistic scenario: 25% month-over-month growth
    const realistic = this.calculateProjectionScenario(
      currentCount,
      targetTherapistCount,
      projectionMonths,
      0.25,
      averageCostPerTherapist,
      "Realistic growth with mixed plan usage"
    );

    // Aggressive scenario: 50% month-over-month growth
    const aggressive = this.calculateProjectionScenario(
      currentCount,
      targetTherapistCount,
      projectionMonths,
      0.5,
      averageCostPerTherapist * 1.2, // Higher cost due to premium plans
      "Aggressive growth with premium features"
    );

    return {
      projectionMonths,
      scenarios: {
        conservative,
        realistic,
        aggressive,
      },
    };
  }

  /**
   * Generate optimization recommendations for a therapist
   */
  private async generateOptimizationRecommendations(
    data: any
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Low utilization recommendation
    if (data.utilizationRate < 30) {
      recommendations.push({
        id: nanoid(),
        type: "low-utilization",
        priority: "high",
        title: "Low Account Utilization Detected",
        description: `This workspace account has only ${data.utilizationRate.toFixed(1)}% utilization. Consider consolidating calendars or reducing plan tier.`,
        potentialMonthlySavings: data.workspaceAccount.monthlyCost * 0.5,
        implementationEffort: "medium",
        actionRequired: "Review therapist activity and consider account consolidation",
      });
    }

    // Plan downgrade recommendation
    if (data.workspaceAccount.planType === "business-plus" && data.utilizationRate < 60) {
      recommendations.push({
        id: nanoid(),
        type: "plan-downgrade",
        priority: "medium",
        title: "Plan Downgrade Opportunity",
        description: "Current usage patterns suggest Business Standard plan would be sufficient.",
        potentialMonthlySavings:
          WORKSPACE_PLAN_COSTS["business-plus"] - WORKSPACE_PLAN_COSTS["business-standard"],
        implementationEffort: "low",
        actionRequired: "Downgrade to Business Standard plan",
      });
    }

    // Storage cleanup recommendation
    if (data.storageOverageGB > 0) {
      recommendations.push({
        id: nanoid(),
        type: "storage-cleanup",
        priority: "medium",
        title: "Storage Overage Detected",
        description: `Account is using ${data.storageOverageGB.toFixed(1)}GB over quota, resulting in overage charges.`,
        potentialMonthlySavings: data.storageOverageGB * OVERAGE_COSTS.storagePerGB,
        implementationEffort: "low",
        actionRequired: "Clean up old files or upgrade storage quota",
      });
    }

    // API optimization recommendation
    if (data.apiOverageCount > 5000) {
      recommendations.push({
        id: nanoid(),
        type: "api-optimization",
        priority: "low",
        title: "High API Usage",
        description: "API usage is above quota. Consider optimizing calendar sync frequency.",
        potentialMonthlySavings: (data.apiOverageCount / 1000) * OVERAGE_COSTS.apiCallsPer1000,
        implementationEffort: "medium",
        actionRequired: "Optimize API call patterns and implement caching",
      });
    }

    // High cost per appointment
    if (data.costPerAppointment > 25 && data.appointmentsCount > 0) {
      recommendations.push({
        id: nanoid(),
        type: "low-utilization",
        priority: "medium",
        title: "High Cost Per Appointment",
        description: `Cost per appointment (£${data.costPerAppointment.toFixed(2)}) is above optimal range.`,
        potentialMonthlySavings: 0,
        implementationEffort: "low",
        actionRequired: "Encourage more appointments to improve cost efficiency",
      });
    }

    return recommendations;
  }

  /**
   * Store cost report in database
   */
  async storeCostReport(summary: SystemCostSummary): Promise<CostReport> {
    const reportData: InsertCostReport = {
      id: nanoid(),
      month: summary.month,
      totalWorkspaceCost: summary.totalWorkspaceCost.toString(),
      totalStorageOverageCost: summary.totalOverageCosts.toString(),
      totalAPIOverageCost: "0", // Separate API overage tracking
      totalCost: summary.totalCost.toString(),
      activeTherapistAccounts: summary.activeTherapistAccounts,
      totalAppointments: summary.totalAppointments,
      totalCalendarEvents: 0, // Would need to collect this separately
      totalGoogleMeetSessions: summary.totalAppointments, // 1:1 with appointments
      averageCostPerTherapist: summary.averageCostPerTherapist.toString(),
      costPerAppointment: summary.costPerAppointment.toString(),
      costPerCalendarEvent: "0",
      monthOverMonthChange: summary.monthOverMonthChange.toString(),
      yearOverYearChange: summary.yearOverYearChange.toString(),
      projectedNextMonthCost: summary.projectedNextMonthCost.toString(),
      utilizationRate: summary.utilizationRate.toString(),
      efficiencyScore: summary.efficiencyScore.toString(),
      topCostDrivers: summary.topCostDrivers,
      optimizationRecommendations: [], // Store separately in costOptimizations table
      budgetVariance: summary.budgetVariance.toString(),
      budgetUtilization: "0", // Calculate based on budget
      generatedAt: new Date(),
      generatedBy: "automated",
      reportVersion: "1.0",
      dataQualityScore: "100",
    };

    const [report] = await db.insert(costReports).values(reportData).returning();
    return report;
  }

  /**
   * Check budget thresholds and send alerts
   */
  async checkBudgetAlertsAndNotify(currentCost: number, month: string): Promise<void> {
    const budgets = await db.select().from(costBudgets).where(eq(costBudgets.isActive, true));

    for (const budget of budgets) {
      const budgetAmount = parseFloat(budget.budgetAmount.toString());
      const utilizationPercentage = (currentCost / budgetAmount) * 100;

      // Parse alert thresholds
      const thresholds = (budget.alertThresholds as number[]) || [75, 90, 100];

      for (const threshold of thresholds) {
        if (utilizationPercentage >= threshold && this.shouldSendAlert(budget, threshold)) {
          await this.sendBudgetAlert(budget, utilizationPercentage, currentCost, month);

          // Update last alert sent
          await db
            .update(costBudgets)
            .set({ lastAlertSent: new Date() })
            .where(eq(costBudgets.id, budget.id));
        }
      }
    }
  }

  /**
   * Send budget alert notification
   */
  private async sendBudgetAlert(
    budget: CostBudget,
    utilizationPercentage: number,
    currentCost: number,
    month: string
  ): Promise<void> {
    const recipients = budget.alertRecipients || ["admin@hive-wellness.co.uk"];
    const budgetAmount = parseFloat(budget.budgetAmount.toString());

    const emailContent = `
      <h2>🚨 Budget Alert: ${budget.budgetName}</h2>
      <p><strong>Budget utilization has reached ${utilizationPercentage.toFixed(1)}%</strong></p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3>Budget Details</h3>
        <ul>
          <li><strong>Budget Name:</strong> ${budget.budgetName}</li>
          <li><strong>Period:</strong> ${month}</li>
          <li><strong>Budget Amount:</strong> £${budgetAmount.toFixed(2)}</li>
          <li><strong>Current Spend:</strong> £${currentCost.toFixed(2)}</li>
          <li><strong>Remaining:</strong> £${(budgetAmount - currentCost).toFixed(2)}</li>
        </ul>
      </div>
      
      <p><strong>Action Required:</strong> Please review Google Workspace costs and consider optimization measures.</p>
      
      <p><a href="${process.env.CLIENT_URL || process.env.BASE_URL || "https://hive-wellness.co.uk"}/admin/cost-monitoring" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Cost Dashboard</a></p>
    `;

    for (const recipient of recipients) {
      await emailService.sendEmail({
        to: recipient,
        subject: `Budget Alert: ${budget.budgetName} - ${utilizationPercentage.toFixed(1)}% Utilized`,
        html: emailContent,
      });
    }
  }

  // Helper methods
  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  private calculateAccountAge(createdAt: Date): number {
    return Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  private calculateUtilizationRate(
    usage: UsageMetric | undefined,
    appointmentsCount: number,
    accountAge: number
  ): number {
    if (!usage || accountAge === 0) return 0;

    const expectedAppointments = Math.max(1, (accountAge / 30) * 20); // 20 appointments per month expected
    const actualAppointments = appointmentsCount;
    return Math.min(100, (actualAppointments / expectedAppointments) * 100);
  }

  private calculateEfficiencyScore(
    costPerAppointment: number,
    utilizationRate: number,
    storageUsedGB: number,
    storageQuotaGB: number
  ): number {
    const costEfficiency = Math.max(0, 100 - costPerAppointment * 2); // Lower cost per appointment = higher score
    const storageEfficiency = (storageUsedGB / storageQuotaGB) * 100; // Higher storage usage = higher score

    return costEfficiency * 0.4 + utilizationRate * 0.4 + storageEfficiency * 0.2;
  }

  private async getPreviousMonthCostReport(currentMonth: string): Promise<CostReport | undefined> {
    const [year, month] = currentMonth.split("-").map(Number);
    const prevDate = new Date(year, month - 2); // month - 2 because months are 0-indexed
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    const [report] = await db
      .select()
      .from(costReports)
      .where(eq(costReports.month, prevMonth))
      .limit(1);

    return report;
  }

  private async getPreviousYearCostReport(currentMonth: string): Promise<CostReport | undefined> {
    const [year, month] = currentMonth.split("-");
    const prevYearMonth = `${parseInt(year) - 1}-${month}`;

    const [report] = await db
      .select()
      .from(costReports)
      .where(eq(costReports.month, prevYearMonth))
      .limit(1);

    return report;
  }

  private identifyTopCostDrivers(breakdowns: TherapistCostBreakdown[]): CostDriver[] {
    const totalCost = breakdowns.reduce((sum, b) => sum + b.totalMonthlyCost, 0);

    const baseCostTotal = breakdowns.reduce((sum, b) => sum + b.baseCost, 0);
    const overageCostTotal = breakdowns.reduce(
      (sum, b) => sum + b.storageOverageCost + b.apiOverageCost,
      0
    );

    return [
      {
        category: "Base Workspace Subscriptions",
        amount: baseCostTotal,
        percentage: (baseCostTotal / totalCost) * 100,
        trend: "stable",
        impact: "high",
      },
      {
        category: "Storage & API Overages",
        amount: overageCostTotal,
        percentage: (overageCostTotal / totalCost) * 100,
        trend: "increasing",
        impact: "medium",
      },
    ].filter((driver) => driver.amount > 0);
  }

  private projectNextMonthCosts(
    breakdowns: TherapistCostBreakdown[],
    monthOverMonthChange: number
  ): number {
    const currentTotal = breakdowns.reduce((sum, b) => sum + b.totalMonthlyCost, 0);
    const growthFactor = 1 + monthOverMonthChange / 100;
    return currentTotal * Math.max(0.5, Math.min(2.0, growthFactor)); // Cap between 50% and 200%
  }

  private async calculateBudgetVariance(month: string, actualCost: number): Promise<number> {
    const [budget] = await db
      .select()
      .from(costBudgets)
      .where(and(eq(costBudgets.isActive, true), eq(costBudgets.budgetType, "monthly")))
      .limit(1);

    if (!budget) return 0;

    const budgetAmount = parseFloat(budget.budgetAmount.toString());
    return actualCost - budgetAmount;
  }

  private calculateProjectionScenario(
    currentCount: number,
    targetCount: number,
    months: number,
    growthRate: number,
    avgCostPerTherapist: number,
    assumptions: string
  ): ProjectionScenario {
    const monthlyGrowth = Math.pow(targetCount / currentCount, 1 / months) - 1;
    const projectedMonthlyCosts: number[] = [];

    let therapistCount = currentCount;
    for (let i = 0; i < months; i++) {
      therapistCount *= 1 + monthlyGrowth;
      projectedMonthlyCosts.push(therapistCount * avgCostPerTherapist);
    }

    return {
      monthlyTherapistGrowth: monthlyGrowth * 100,
      projectedMonthlyCosts,
      totalProjectedCost: projectedMonthlyCosts.reduce((sum, cost) => sum + cost, 0),
      assumptions: [assumptions, `${(monthlyGrowth * 100).toFixed(1)}% monthly growth rate`],
    };
  }

  private async getCurrentActiveTherapistCount(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(workspaceAccounts)
      .where(eq(workspaceAccounts.accountStatus, "active"));

    return result?.count || 0;
  }

  private async getCurrentMonthlyCost(): Promise<number> {
    const summary = await this.calculateSystemCostSummary();
    return summary.totalCost;
  }

  private shouldSendAlert(budget: CostBudget, threshold: number): boolean {
    // Implement logic to prevent spam - only send once per threshold per period
    return (
      !budget.lastAlertSent || Date.now() - budget.lastAlertSent.getTime() > 24 * 60 * 60 * 1000
    ); // 24 hours
  }
}

// Export singleton instance
export const costCalculator = new GoogleWorkspaceCostCalculator();
