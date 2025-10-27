import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  Download,
  RefreshCw,
  Lightbulb,
  Target,
  Settings,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { formatCurrency, type CurrencyAmount } from "@/lib/currency";

// Cost Summary Component
function CostSummaryCards({ timeRange }: { timeRange: string }) {
  const { data: summaryData, isLoading } = useQuery({
    queryKey: ["/api/admin/costs/summary", { timeRange }],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const summary = summaryData?.data || {};
  const changeIcon =
    summary.monthOverMonthChange > 0
      ? ArrowUpRight
      : summary.monthOverMonthChange < 0
        ? ArrowDownRight
        : Minus;
  const changeColor =
    summary.monthOverMonthChange > 0
      ? "text-red-600"
      : summary.monthOverMonthChange < 0
        ? "text-green-600"
        : "text-gray-600";

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-secondary text-hive-black/70">Total Monthly Cost</p>
              <p className="text-2xl font-primary text-hive-purple">
                {summary.totalMonthlyCost ? formatCurrency(summary.totalMonthlyCost) : "£0.00"}
              </p>
              <div className="flex items-center mt-1">
                {React.createElement(changeIcon, { className: `w-4 h-4 ${changeColor}` })}
                <span className={`text-sm ${changeColor} ml-1`}>
                  {Math.abs(summary.monthOverMonthChange || 0).toFixed(1)}%
                </span>
              </div>
            </div>
            <DollarSign className="w-8 h-8 text-hive-purple/60" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-secondary text-hive-black/70">Active Accounts</p>
              <p className="text-2xl font-primary text-hive-blue">
                {summary.activeTherapistAccounts || 0}
              </p>
              <p className="text-sm text-hive-black/50">Workspace accounts</p>
            </div>
            <Users className="w-8 h-8 text-hive-blue/60" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-secondary text-hive-black/70">Cost per Appointment</p>
              <p className="text-2xl font-primary text-hive-light-blue">
                {summary.costPerAppointment ? formatCurrency(summary.costPerAppointment) : "£0.00"}
              </p>
              <p className="text-sm text-hive-black/50">
                {summary.totalAppointments || 0} appointments
              </p>
            </div>
            <Calendar className="w-8 h-8 text-hive-light-blue/60" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-secondary text-hive-black/70">Budget Utilization</p>
              <p className="text-2xl font-primary text-green-600">
                {(summary.budgetUtilization?.utilizationPercentage || 0).toFixed(1)}%
              </p>
              <p className="text-sm text-hive-black/50">
                {summary.budgetUtilization?.actualCost
                  ? formatCurrency(summary.budgetUtilization.actualCost)
                  : "£0.00"}{" "}
                /{" "}
                {summary.budgetUtilization?.budgetAmount
                  ? formatCurrency(summary.budgetUtilization.budgetAmount)
                  : "£0.00"}
              </p>
            </div>
            <Target className="w-8 h-8 text-green-600/60" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Therapist Cost Table Component
function TherapistCostTable({ month }: { month: string }) {
  const { data: therapistsData, isLoading } = useQuery({
    queryKey: ["/api/admin/costs/therapists", { month }],
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-hive-purple">Therapist Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const therapists = therapistsData?.data?.therapists || [];

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-hive-purple">Therapist Cost Breakdown - {month}</CardTitle>
        <Button variant="outline" size="sm" data-testid="button-export-costs">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium text-hive-black/70">Therapist</th>
                <th className="text-left p-3 font-medium text-hive-black/70">Plan</th>
                <th className="text-right p-3 font-medium text-hive-black/70">Monthly Cost</th>
                <th className="text-right p-3 font-medium text-hive-black/70">Appointments</th>
                <th className="text-right p-3 font-medium text-hive-black/70">Cost/Appointment</th>
                <th className="text-right p-3 font-medium text-hive-black/70">Utilization</th>
                <th className="text-center p-3 font-medium text-hive-black/70">Status</th>
                <th className="text-center p-3 font-medium text-hive-black/70">Actions</th>
              </tr>
            </thead>
            <tbody>
              {therapists.map((therapist: any) => (
                <tr key={therapist.therapistId} className="border-b hover:bg-gray-50/50">
                  <td className="p-3">
                    <div>
                      <p
                        className="font-medium text-hive-black"
                        data-testid={`text-therapist-name-${therapist.therapistId}`}
                      >
                        {therapist.therapistName}
                      </p>
                      <p className="text-sm text-hive-black/60">{therapist.therapistEmail}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="capitalize">
                      {therapist.planType?.replace("-", " ")}
                    </Badge>
                  </td>
                  <td
                    className="p-3 text-right font-medium"
                    data-testid={`text-cost-${therapist.therapistId}`}
                  >
                    £{therapist.totalMonthlyCost.toFixed(2)}
                  </td>
                  <td
                    className="p-3 text-right"
                    data-testid={`text-appointments-${therapist.therapistId}`}
                  >
                    {therapist.appointmentsScheduled}
                  </td>
                  <td className="p-3 text-right">£{therapist.costPerAppointment.toFixed(2)}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end">
                      <div className="w-12 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-hive-blue h-2 rounded-full"
                          style={{ width: `${Math.min(100, therapist.utilizationScore)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm">{therapist.utilizationScore.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <Badge
                      variant={therapist.accountStatus === "active" ? "default" : "secondary"}
                      className={
                        therapist.accountStatus === "active" ? "bg-green-100 text-green-800" : ""
                      }
                    >
                      {therapist.accountStatus}
                    </Badge>
                  </td>
                  <td className="p-3 text-center">
                    <Link href={`/admin/costs/therapist/${therapist.therapistId}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`button-view-details-${therapist.therapistId}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {therapists.length === 0 && (
          <div className="text-center py-8 text-hive-black/60">
            No therapist cost data available for {month}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Cost Optimization Panel Component
function CostOptimizationPanel() {
  const { data: optimizationData, isLoading } = useQuery({
    queryKey: ["/api/admin/costs/optimization"],
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-hive-purple">
            <Lightbulb className="w-5 h-5 mr-2" />
            Cost Optimization Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recommendations = optimizationData?.data?.recommendations || [];
  const summary = optimizationData?.data?.summary || {};

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-hive-purple">
          <Lightbulb className="w-5 h-5 mr-2" />
          Cost Optimization Recommendations
        </CardTitle>
        <div className="flex gap-4 text-sm text-hive-black/60">
          <span>Total Recommendations: {summary.totalRecommendations || 0}</span>
          <span>Potential Monthly Savings: £{(summary.totalPotentialSavings || 0).toFixed(2)}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.map((rec: any, index: number) => (
            <div key={index} className="border rounded-lg p-4 hover:bg-gray-50/50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant={
                        rec.priority === "high"
                          ? "destructive"
                          : rec.priority === "medium"
                            ? "default"
                            : "secondary"
                      }
                      data-testid={`badge-priority-${rec.priority}`}
                    >
                      {rec.priority} priority
                    </Badge>
                    <Badge variant="outline">{rec.type}</Badge>
                  </div>
                  <h4
                    className="font-medium text-hive-black mb-1"
                    data-testid={`text-recommendation-title-${index}`}
                  >
                    {rec.title}
                  </h4>
                  <p className="text-sm text-hive-black/70 mb-2">{rec.description}</p>
                  <p className="text-sm text-hive-blue font-medium">{rec.actionRequired}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-hive-black/60">Potential Saving</p>
                  <p className="font-medium text-green-600">
                    £{rec.potentialMonthlySaving.toFixed(2)}/month
                  </p>
                </div>
              </div>
            </div>
          ))}

          {recommendations.length === 0 && (
            <div className="text-center py-8 text-hive-black/60">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
              <p>No optimization recommendations at this time</p>
              <p className="text-sm">Your costs are well optimized!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Usage Collection Component
function UsageCollectionPanel() {
  const { toast } = useToast();

  const usageCollectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/usage/collect");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Usage Collection Completed",
        description: `Successfully collected usage data for ${data.data.successfulCollections} accounts`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/costs/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/costs/therapists"] });
    },
    onError: (error: any) => {
      toast({
        title: "Usage Collection Failed",
        description: error.message || "Failed to collect usage data",
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-hive-purple">
          <RefreshCw className="w-5 h-5 mr-2" />
          Usage Data Collection
        </CardTitle>
        <p className="text-sm text-hive-black/60">
          Manually trigger usage metrics collection for the current month
        </p>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => usageCollectionMutation.mutate()}
          disabled={usageCollectionMutation.isPending}
          data-testid="button-collect-usage"
        >
          {usageCollectionMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
          Collect Usage Data
        </Button>
      </CardContent>
    </Card>
  );
}

// Main Cost Monitoring Dashboard
export default function CostMonitoringDashboard() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("3M");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Redirect if not admin
  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full">
          <CardContent className="text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You need admin privileges to access this page.</p>
            <Link href="/admin/login">
              <Button>Admin Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1
              className="text-3xl font-bold text-hive-purple mb-2"
              data-testid="text-dashboard-title"
            >
              Google Workspace Cost Monitoring
            </h1>
            <p className="text-hive-black/70">
              Track and optimize Google Workspace costs across all therapist accounts
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32" data-testid="select-time-range">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1M">1 Month</SelectItem>
                <SelectItem value="3M">3 Months</SelectItem>
                <SelectItem value="6M">6 Months</SelectItem>
                <SelectItem value="1Y">1 Year</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-40" data-testid="select-month">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => {
                  const date = new Date();
                  date.setMonth(date.getMonth() - i);
                  const monthStr = date.toISOString().slice(0, 7);
                  const monthName = date.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  });
                  return (
                    <SelectItem key={monthStr} value={monthStr}>
                      {monthName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Link href="/admin/dashboard">
              <Button variant="outline" data-testid="button-back-to-dashboard">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Cost Summary Cards */}
        <CostSummaryCards timeRange={timeRange} />

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">
              Overview
            </TabsTrigger>
            <TabsTrigger value="therapists" data-testid="tab-therapists">
              Therapists
            </TabsTrigger>
            <TabsTrigger value="optimization" data-testid="tab-optimization">
              Optimization
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TherapistCostTable month={selectedMonth} />
              <CostOptimizationPanel />
            </div>
          </TabsContent>

          <TabsContent value="therapists" className="space-y-6">
            <TherapistCostTable month={selectedMonth} />
          </TabsContent>

          <TabsContent value="optimization" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CostOptimizationPanel />
              <UsageCollectionPanel />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-hive-purple">
                  <Settings className="w-5 h-5 mr-2" />
                  Cost Monitoring Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-8 text-hive-black/60">
                    <Settings className="w-12 h-12 mx-auto text-hive-purple/60 mb-2" />
                    <p>Budget management and alert settings</p>
                    <p className="text-sm">Coming soon...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
