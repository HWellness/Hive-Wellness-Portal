import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PoundSterling, 
  TrendingUp, 
  Users, 
  CreditCard, 
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Activity
} from "lucide-react";
import type { User } from "@shared/schema";

interface AdminPaymentsOverviewProps {
  user: User;
}

interface PlatformFinancials {
  totalRevenue: number;
  therapistPayouts: number;
  platformCommission: number;
  stripeProcessingFees: number;
  netPlatformRevenue: number;
  totalSessions: number;
  averageSessionValue: number;
  monthlyGrowth: number;
}

interface PaymentMetrics {
  successfulPayments: number;
  failedPayments: number;
  refunds: number;
  chargebacks: number;
  processingVolume: number;
}

export default function AdminPaymentsOverview({ user }: AdminPaymentsOverviewProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("month");

  // Fetch platform financial data
  const { data: financials, isLoading: financialsLoading } = useQuery<PlatformFinancials>({
    queryKey: ['/api/admin/platform-financials', selectedPeriod],
    retry: false,
  });

  // Fetch payment metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<PaymentMetrics>({
    queryKey: ['/api/admin/payment-metrics', selectedPeriod],
    retry: false,
  });

  // Production reset - all financial metrics start at zero
  const demoFinancials: PlatformFinancials = {
    totalRevenue: 0.00,
    therapistPayouts: 0.00,
    platformCommission: 0.00,
    stripeProcessingFees: 0.00,
    netPlatformRevenue: 0.00,
    totalSessions: 0,
    averageSessionValue: 0.00,
    monthlyGrowth: 0.0
  };

  const demoMetrics: PaymentMetrics = {
    successfulPayments: 0,
    failedPayments: 0,
    refunds: 0,
    chargebacks: 0,
    processingVolume: 0.00
  };

  const displayFinancials = financials || demoFinancials;
  const displayMetrics = metrics || demoMetrics;

  const successRate = ((displayMetrics.successfulPayments / (displayMetrics.successfulPayments + displayMetrics.failedPayments)) * 100).toFixed(1);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-century font-bold text-gray-900">Platform Financials</h1>
          <p className="text-gray-600 mt-2">Complete financial overview and payment analytics</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hive-purple focus:border-transparent"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <PoundSterling className="w-4 h-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">£{displayFinancials.totalRevenue.toFixed(2)}</div>
            <div className="flex items-center text-green-600 text-sm mt-1">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +{displayFinancials.monthlyGrowth}% this month
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4" />
              Therapist Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">£{displayFinancials.therapistPayouts.toFixed(2)}</div>
            <div className="text-sm text-gray-500 mt-1">85% of session fees</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-hive-purple">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Platform Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">£{displayFinancials.netPlatformRevenue.toFixed(2)}</div>
            <div className="text-sm text-gray-500 mt-1">After Stripe fees</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{displayFinancials.totalSessions}</div>
            <div className="text-sm text-gray-500 mt-1">£{displayFinancials.averageSessionValue.toFixed(2)} avg</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="revenue">Revenue Breakdown</TabsTrigger>
          <TabsTrigger value="payments">Payment Analytics</TabsTrigger>
          <TabsTrigger value="trends">Financial Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PoundSterling className="w-5 h-5" />
                  Revenue Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Gross Revenue</span>
                    <span className="font-semibold">£{displayFinancials.totalRevenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Therapist Share (85%)</span>
                    <span className="font-semibold text-blue-600">-£{displayFinancials.therapistPayouts.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Stripe Processing Fees</span>
                    <span className="font-semibold text-red-600">-£{displayFinancials.stripeProcessingFees.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between items-center">
                    <span className="font-medium">Net Platform Revenue</span>
                    <span className="font-bold text-hive-purple">£{displayFinancials.netPlatformRevenue.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Session Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{displayFinancials.totalSessions}</div>
                    <div className="text-sm text-gray-600">Total Sessions</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">£{displayFinancials.averageSessionValue.toFixed(0)}</div>
                    <div className="text-sm text-gray-600">Average Value</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Revenue per Session</span>
                    <span className="font-semibold">£{(displayFinancials.netPlatformRevenue / displayFinancials.totalSessions).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Platform Commission Rate</span>
                    <span className="font-semibold">15%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Success Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{successRate}%</div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Successful Payments</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {displayMetrics.successfulPayments}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Failed Payments</span>
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      {displayMetrics.failedPayments}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Refunds Processed</span>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      {displayMetrics.refunds}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Chargebacks</span>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                      {displayMetrics.chargebacks}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Processing Volume
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">£{displayMetrics.processingVolume.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Total Processed</div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Transaction</span>
                    <span className="font-semibold">£{(displayMetrics.processingVolume / displayMetrics.successfulPayments).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Processing Fee Rate</span>
                    <span className="font-semibold">{((displayFinancials.stripeProcessingFees / displayFinancials.totalRevenue) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Financial Growth Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <div className="text-lg font-medium text-gray-900 mb-2">Growth Analytics Coming Soon</div>
                <div className="text-gray-600 max-w-md mx-auto">
                  Detailed financial trends and forecasting will be available as your platform grows and accumulates more transaction data.
                </div>
                <div className="mt-6">
                  <Badge variant="secondary" className="bg-hive-purple/10 text-hive-purple">
                    Current Growth: +{displayFinancials.monthlyGrowth}% this month
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}