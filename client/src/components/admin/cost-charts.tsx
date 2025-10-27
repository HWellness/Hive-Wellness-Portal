import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Target,
  Zap,
  PieChart as PieChartIcon,
  BarChart3,
  Activity,
} from "lucide-react";
import { useState } from "react";
import {
  formatCurrency,
  formatCurrencyCompact,
  type SupportedCurrency,
  type CurrencyAmount,
} from "@/lib/currency";

// Cost Trends Line Chart
interface CostTrendsChartProps {
  data: Array<{
    month: string;
    totalCost: number | CurrencyAmount;
    therapistCount: number;
    appointments: number;
    costPerAppointment: number | CurrencyAmount;
    currency?: SupportedCurrency;
  }>;
  timeRange: string;
  currency?: SupportedCurrency;
}

const costTrendsConfig = {
  totalCost: {
    label: "Total Cost",
    color: "hsl(var(--chart-1))",
  },
  costPerAppointment: {
    label: "Cost per Appointment",
    color: "hsl(var(--chart-2))",
  },
  therapistCount: {
    label: "Active Therapists",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

export function CostTrendsChart({ data, timeRange, currency = "GBP" }: CostTrendsChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<
    "totalCost" | "costPerAppointment" | "therapistCount"
  >("totalCost");

  const formatMonth = (monthStr: string) => {
    const date = new Date(monthStr + "-01");
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  };

  const calculateTrend = () => {
    if (data.length < 2) return { trend: "stable", percentage: 0 };

    const getCurrentValue = (item: any, metric: string) => {
      const value = item?.[metric];
      return typeof value === "object" && value?.amount !== undefined ? value.amount : value || 0;
    };

    const current = getCurrentValue(data[0], selectedMetric);
    const previous = getCurrentValue(data[1], selectedMetric);

    if (previous === 0) return { trend: "stable", percentage: 0 };

    const percentage = ((current - previous) / previous) * 100;
    const trend = percentage > 5 ? "increasing" : percentage < -5 ? "decreasing" : "stable";

    return { trend, percentage: Math.abs(percentage) };
  };

  const { trend, percentage } = calculateTrend();
  const TrendIcon =
    trend === "increasing" ? TrendingUp : trend === "decreasing" ? TrendingDown : Activity;
  const trendColor =
    trend === "increasing"
      ? "text-red-600"
      : trend === "decreasing"
        ? "text-green-600"
        : "text-gray-600";

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center text-hive-purple">
            <BarChart3 className="w-5 h-5 mr-2" />
            Cost Trends - {timeRange}
          </CardTitle>
          <div className="flex items-center mt-2">
            <TrendIcon className={`w-4 h-4 mr-1 ${trendColor}`} />
            <span className={`text-sm ${trendColor}`}>
              {percentage.toFixed(1)}%{" "}
              {trend === "increasing" ? "increase" : trend === "decreasing" ? "decrease" : "stable"}
            </span>
          </div>
        </div>
        <Select value={selectedMetric} onValueChange={(value: any) => setSelectedMetric(value)}>
          <SelectTrigger className="w-48" data-testid="select-trend-metric">
            <SelectValue placeholder="Select metric" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="totalCost">Total Cost ({currency})</SelectItem>
            <SelectItem value="costPerAppointment">Cost per Appointment ({currency})</SelectItem>
            <SelectItem value="therapistCount">Active Therapists</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ChartContainer config={costTrendsConfig}>
          <LineChart data={data.slice().reverse()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) =>
                selectedMetric === "therapistCount"
                  ? value.toString()
                  : formatCurrencyCompact(value, currency)
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    const numericValue =
                      typeof value === "object" && value?.amount !== undefined
                        ? value.amount
                        : Number(value);
                    return [
                      selectedMetric === "therapistCount"
                        ? numericValue
                        : formatCurrency(numericValue, currency),
                      costTrendsConfig[selectedMetric].label,
                    ];
                  }}
                  labelFormatter={(label) => {
                    const date = new Date(label + "-01");
                    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
                  }}
                />
              }
            />
            <Line
              type="monotone"
              dataKey={selectedMetric}
              stroke={costTrendsConfig[selectedMetric].color}
              strokeWidth={3}
              dot={{ fill: costTrendsConfig[selectedMetric].color, r: 6 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// Therapist Cost Distribution Pie Chart
interface TherapistCostDistributionProps {
  data: Array<{
    therapistName: string;
    totalMonthlyCost: number | CurrencyAmount;
    planType: string;
    utilizationScore: number;
    currency?: SupportedCurrency;
  }>;
  currency?: SupportedCurrency;
}

const distributionColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function TherapistCostDistribution({
  data,
  currency = "GBP",
}: TherapistCostDistributionProps) {
  const [viewType, setViewType] = useState<"individual" | "planType">("individual");

  const processedData =
    viewType === "individual"
      ? data.slice(0, 8).map((item, index) => {
          const costAmount =
            typeof item.totalMonthlyCost === "object"
              ? item.totalMonthlyCost.amount
              : item.totalMonthlyCost;
          return {
            name: item.therapistName,
            value: costAmount,
            color: distributionColors[index % distributionColors.length],
            planType: item.planType,
            utilization: item.utilizationScore,
          };
        })
      : Object.entries(
          data.reduce(
            (acc, item) => {
              const costAmount =
                typeof item.totalMonthlyCost === "object"
                  ? item.totalMonthlyCost.amount
                  : item.totalMonthlyCost;
              acc[item.planType] = (acc[item.planType] || 0) + costAmount;
              return acc;
            },
            {} as Record<string, number>
          )
        ).map(([planType, value], index) => ({
          name: planType.replace("-", " ").toUpperCase(),
          value,
          color: distributionColors[index % distributionColors.length],
        }));

  const totalCost = processedData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center text-hive-purple">
          <PieChartIcon className="w-5 h-5 mr-2" />
          Cost Distribution
        </CardTitle>
        <Select value={viewType} onValueChange={(value: any) => setViewType(value)}>
          <SelectTrigger className="w-32" data-testid="select-distribution-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="individual">By Therapist</SelectItem>
            <SelectItem value="planType">By Plan Type</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartContainer config={{}}>
            <PieChart>
              <Pie
                data={processedData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={30}
                paddingAngle={2}
                dataKey="value"
              >
                {processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border rounded-lg shadow-lg">
                        <p className="font-medium">{data.name}</p>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(data.value, currency)} (
                          {((data.value / totalCost) * 100).toFixed(1)}%)
                        </p>
                        {data.planType && (
                          <p className="text-xs text-gray-500">
                            Plan: {data.planType} | Utilization: {data.utilization}%
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ChartContainer>

          <div className="space-y-2">
            <h4 className="font-medium text-sm text-hive-black/70 mb-3">Cost Breakdown</h4>
            {processedData.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded mr-2"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-hive-black/80">{item.name}</span>
                </div>
                <span className="font-medium" data-testid={`text-cost-${index}`}>
                  {formatCurrency(item.value, currency)}
                </span>
              </div>
            ))}
            <div className="border-t pt-2 mt-3">
              <div className="flex items-center justify-between font-medium">
                <span>Total</span>
                <span data-testid="text-total-cost">{formatCurrency(totalCost, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Usage Efficiency Scatter Chart
interface UsageEfficiencyChartProps {
  data: Array<{
    therapistName: string;
    utilizationScore: number;
    costPerAppointment: number | CurrencyAmount;
    appointmentsScheduled: number;
    totalMonthlyCost: number | CurrencyAmount;
    currency?: SupportedCurrency;
  }>;
  currency?: SupportedCurrency;
}

const createEfficiencyConfig = (currency: SupportedCurrency = "GBP") =>
  ({
    utilizationScore: {
      label: "Utilization Score (%)",
      color: "hsl(var(--chart-1))",
    },
    costPerAppointment: {
      label: `Cost per Appointment (${currency})`,
      color: "hsl(var(--chart-2))",
    },
  }) satisfies ChartConfig;

export function UsageEfficiencyChart({ data, currency = "GBP" }: UsageEfficiencyChartProps) {
  const efficiencyConfig = createEfficiencyConfig(currency);

  const processedData = data.map((item) => {
    const costPerAppointment =
      typeof item.costPerAppointment === "object"
        ? item.costPerAppointment.amount
        : item.costPerAppointment;
    const totalCost =
      typeof item.totalMonthlyCost === "object"
        ? item.totalMonthlyCost.amount
        : item.totalMonthlyCost;

    return {
      x: item.utilizationScore,
      y: costPerAppointment,
      therapistName: item.therapistName,
      appointments: item.appointmentsScheduled,
      totalCost: totalCost,
      efficiency: costPerAppointment > 0 ? item.utilizationScore / costPerAppointment : 0, // Higher is better
    };
  });

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-hive-purple">
          <Zap className="w-5 h-5 mr-2" />
          Usage Efficiency Analysis
        </CardTitle>
        <p className="text-sm text-hive-black/60">
          Utilization vs Cost Efficiency • Top-right quadrant shows high efficiency
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={efficiencyConfig}>
          <ScatterChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name="Utilization"
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              label={{ value: "Utilization Score (%)", position: "insideBottom", offset: -5 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Cost per Appointment"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatCurrencyCompact(value, currency)}
              label={{
                value: `Cost per Appointment (${currency})`,
                angle: -90,
                position: "insideLeft",
              }}
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border rounded-lg shadow-lg">
                      <p className="font-medium">{data.therapistName}</p>
                      <p className="text-sm text-gray-600">Utilization: {data.x.toFixed(1)}%</p>
                      <p className="text-sm text-gray-600">
                        Cost/Appointment: £{data.y.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">Appointments: {data.appointments}</p>
                      <p className="text-sm text-gray-600">
                        Monthly Cost: £{data.totalCost.toFixed(2)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter dataKey="y" fill={efficiencyConfig.utilizationScore.color} />

            {/* Reference lines for good efficiency zones */}
            <Line
              x1={60}
              y1={0}
              x2={60}
              y2={100}
              stroke="red"
              strokeDasharray="5 5"
              opacity={0.3}
            />
            <Line
              x1={0}
              y1={20}
              x2={100}
              y2={20}
              stroke="red"
              strokeDasharray="5 5"
              opacity={0.3}
            />
          </ScatterChart>
        </ChartContainer>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center mb-1">
              <div className="w-2 h-2 bg-green-500 rounded mr-2"></div>
              <span className="font-medium text-green-800">High Efficiency</span>
            </div>
            <p className="text-green-700 text-xs">
              Utilization &gt; 60% &amp; Cost &lt; £20/appointment
            </p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg">
            <div className="flex items-center mb-1">
              <div className="w-2 h-2 bg-amber-500 rounded mr-2"></div>
              <span className="font-medium text-amber-800">Needs Optimization</span>
            </div>
            <p className="text-amber-700 text-xs">Low utilization or high cost per appointment</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Budget Utilization Progress Chart
interface BudgetUtilizationProps {
  data: {
    budgetAmount: number;
    actualCost: number;
    variance: number;
    utilizationPercentage: number;
  };
  alertThresholds?: number[];
}

export function BudgetUtilizationChart({
  data,
  alertThresholds = [75, 90, 100],
}: BudgetUtilizationProps) {
  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 90) return "bg-amber-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getUtilizationStatus = (percentage: number) => {
    if (percentage >= 100) return { label: "Over Budget", color: "text-red-600" };
    if (percentage >= 90) return { label: "Critical", color: "text-amber-600" };
    if (percentage >= 75) return { label: "Warning", color: "text-yellow-600" };
    return { label: "Good", color: "text-green-600" };
  };

  const status = getUtilizationStatus(data.utilizationPercentage);

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-hive-purple">
          <Target className="w-5 h-5 mr-2" />
          Budget Utilization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Monthly Budget Progress</span>
            <Badge
              variant={data.utilizationPercentage >= 90 ? "destructive" : "default"}
              className={status.color}
            >
              {status.label}
            </Badge>
          </div>

          <div className="relative w-full bg-gray-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all duration-300 ${getUtilizationColor(data.utilizationPercentage)}`}
              style={{ width: `${Math.min(100, data.utilizationPercentage)}%` }}
            ></div>

            {/* Alert threshold markers */}
            {alertThresholds.map((threshold, index) => (
              <div
                key={index}
                className="absolute top-0 h-4 w-0.5 bg-gray-400"
                style={{ left: `${threshold}%` }}
                title={`${threshold}% threshold`}
              ></div>
            ))}
          </div>

          <div className="flex justify-between text-sm text-hive-black/60 mt-1">
            <span>£0</span>
            <span className="font-medium" data-testid="text-utilization-percentage">
              {data.utilizationPercentage.toFixed(1)}%
            </span>
            <span>£{data.budgetAmount.toFixed(0)}</span>
          </div>
        </div>

        {/* Budget Details */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-hive-purple" data-testid="text-budget-amount">
              £{data.budgetAmount.toFixed(0)}
            </p>
            <p className="text-sm text-hive-black/60">Budget</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-hive-blue" data-testid="text-actual-cost">
              £{data.actualCost.toFixed(0)}
            </p>
            <p className="text-sm text-hive-black/60">Actual</p>
          </div>
          <div className="text-center">
            <p
              className={`text-2xl font-bold ${data.variance >= 0 ? "text-red-600" : "text-green-600"}`}
            >
              {data.variance >= 0 ? "+" : ""}£{data.variance.toFixed(0)}
            </p>
            <p className="text-sm text-hive-black/60">Variance</p>
          </div>
        </div>

        {/* Alert Thresholds */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h5 className="font-medium text-sm mb-2">Alert Thresholds</h5>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {alertThresholds.map((threshold, index) => (
              <div key={index} className="flex items-center justify-center p-2 bg-white rounded">
                <span
                  className={
                    data.utilizationPercentage >= threshold
                      ? "text-red-600 font-medium"
                      : "text-gray-600"
                  }
                >
                  {threshold}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Monthly Cost Comparison Bar Chart
interface MonthlyCostComparisonProps {
  data: Array<{
    month: string;
    budgetAmount: number;
    actualCost: number;
    therapistCount: number;
  }>;
}

const comparisonConfig = {
  budgetAmount: {
    label: "Budget",
    color: "hsl(var(--chart-1))",
  },
  actualCost: {
    label: "Actual Cost",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function MonthlyCostComparison({ data }: MonthlyCostComparisonProps) {
  const formatMonth = (monthStr: string) => {
    const date = new Date(monthStr + "-01");
    return date.toLocaleDateString("en-US", { month: "short" });
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-hive-purple">
          <BarChart3 className="w-5 h-5 mr-2" />
          Budget vs Actual Cost Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={comparisonConfig}>
          <BarChart data={data.slice().reverse()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `£${value.toFixed(0)}`} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [
                    `£${Number(value).toFixed(2)}`,
                    comparisonConfig[name as keyof typeof comparisonConfig]?.label || name,
                  ]}
                  labelFormatter={(label) => {
                    const date = new Date(label + "-01");
                    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
                  }}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="budgetAmount"
              fill={comparisonConfig.budgetAmount.color}
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="actualCost"
              fill={comparisonConfig.actualCost.color}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// Cost per Therapist Heatmap (using bar chart representation)
interface CostPerTherapistHeatmapProps {
  data: Array<{
    therapistName: string;
    monthlyCost: number;
    utilizationScore: number;
    efficiency: number; // calculated metric
  }>;
}

export function CostPerTherapistHeatmap({ data }: CostPerTherapistHeatmapProps) {
  const sortedData = [...data].sort((a, b) => b.efficiency - a.efficiency);

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 4) return "hsl(142, 71%, 45%)"; // Green - High efficiency
    if (efficiency >= 2) return "hsl(43, 89%, 38%)"; // Yellow - Medium efficiency
    return "hsl(0, 84%, 60%)"; // Red - Low efficiency
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-hive-purple">
          <Users className="w-5 h-5 mr-2" />
          Therapist Performance Matrix
        </CardTitle>
        <p className="text-sm text-hive-black/60">
          Ranked by cost efficiency (green = high, yellow = medium, red = low)
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedData.map((therapist, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div
                className="w-32 text-sm font-medium truncate"
                data-testid={`text-therapist-${index}`}
              >
                {therapist.therapistName}
              </div>

              <div className="flex-1 flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                  <div
                    className="h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                    style={{
                      width: `${Math.min(100, (therapist.utilizationScore / 100) * 100)}%`,
                      backgroundColor: getEfficiencyColor(therapist.efficiency),
                    }}
                  >
                    {therapist.utilizationScore.toFixed(0)}%
                  </div>
                </div>

                <div
                  className="w-20 text-right text-sm font-medium"
                  data-testid={`text-cost-${index}`}
                >
                  £{therapist.monthlyCost.toFixed(0)}
                </div>

                <div className="w-16 text-right text-xs text-hive-black/60">
                  {therapist.efficiency.toFixed(1)}x
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-center space-x-6 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
            <span>High Efficiency (4x+)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded mr-1"></div>
            <span>Medium Efficiency (2-4x)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
            <span>Low Efficiency (&lt;2x)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
