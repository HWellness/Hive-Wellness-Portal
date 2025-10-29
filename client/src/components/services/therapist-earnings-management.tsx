import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  PoundSterling,
  TrendingUp,
  Download,
  CreditCard,
  ArrowDownRight,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Wallet,
  History,
  Settings,
  ExternalLink,
} from "lucide-react";
import type { User } from "@shared/schema";

interface TherapistEarningsManagementProps {
  user: User;
}

interface EarningsData {
  totalEarnings: number;
  pendingEarnings: number;
  availableForPayout: number;
  thisMonthEarnings: number;
  thisWeekEarnings: number;
  todayEarnings: number;
  sessionsThisMonth: number;
  averageSessionRate: number;
  nextPayoutDate: string;
  stripeConnectStatus: "pending" | "active" | "inactive" | "setup_required";
  bankAccountConnected: boolean;
  payoutSchedule: "instant" | "monthly" | "daily" | "weekly";
  minimumPayoutAmount: number;
  payoutHistory?: PayoutTransaction[];
  recentSessions?: SessionEarning[];
}

interface SessionEarning {
  id: string;
  clientName: string;
  date: string;
  amount: number;
  status: string;
  type: string;
}

interface PayoutTransaction {
  id: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  requestedAt: string;
  processedAt?: string;
  method: "stripe_instant" | "stripe_standard" | "bank_transfer";
  fees: number;
  netAmount: number;
}

interface EarningsBreakdown {
  sessionEarnings: number;
  consultationEarnings: number;
  netEarnings: number;
}

export default function TherapistEarningsManagement({ user }: TherapistEarningsManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [payoutAmount, setPayoutAmount] = useState<string>("");
  const [payoutMethod, setPayoutMethod] = useState<"instant" | "standard">("standard");
  const [selectedTimeRange, setSelectedTimeRange] = useState<"today" | "week" | "month" | "year">(
    "month"
  );

  const { data: earnings, isLoading } = useQuery<EarningsData>({
    queryKey: ["/api/therapist/earnings", user.id],
    retry: false,
    staleTime: 30000, // Keep data fresh for 30 seconds
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });

  const { data: payoutHistory = [] } = useQuery<PayoutTransaction[]>({
    queryKey: ["/api/therapist/payout-history", user.id],
    retry: false,
    staleTime: 60000, // Payout history changes less frequently
    refetchOnWindowFocus: false,
  });

  const { data: earningsBreakdown } = useQuery<EarningsBreakdown>({
    queryKey: ["/api/therapist/earnings-breakdown", user.id, selectedTimeRange],
    retry: false,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    enabled: !!earnings, // Only fetch when earnings data is available
  });

  const { data: earningsChart = [] } = useQuery({
    queryKey: ["/api/therapist/earnings-chart", user.id, selectedTimeRange],
    retry: false,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    enabled: !!earnings, // Only fetch when earnings data is available
  });

  const requestPayoutMutation = useMutation({
    mutationFn: async ({ amount, method }: { amount: number; method: "instant" | "standard" }) => {
      return await apiRequest("POST", "/api/therapist/request-payout", { amount, method });
    },
    onSuccess: (data) => {
      toast({
        title: "Payout Requested",
        description: `Your ${payoutMethod} payout of £${payoutAmount} has been requested. Processing time: ${payoutMethod === "instant" ? "Within 30 minutes" : "Variable (depends on your Stripe account payout schedule)"}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/earnings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/payout-history"] });
      setPayoutAmount("");
    },
    onError: (error: any) => {
      toast({
        title: "Payout Failed",
        description: error.message || "Unable to process payout request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const setupStripeConnectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/therapist/setup-stripe-connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.onboardingUrl) {
        // Try to open in new window
        const popup = window.open(
          data.onboardingUrl,
          "_blank",
          "width=800,height=600,scrollbars=yes,resizable=yes"
        );

        // If popup was blocked, show fallback message
        if (!popup || popup.closed || typeof popup.closed == "undefined") {
          toast({
            title: "Stripe Connect Setup",
            description: (
              <div>
                <p>Your Stripe account has been created successfully!</p>
                <p>Popup blocked - please click this link to complete setup:</p>
                <a
                  href={data.onboardingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-hive-purple underline font-medium"
                >
                  Open Stripe Onboarding →
                </a>
              </div>
            ) as any,
            duration: 10000,
          });
        } else {
          toast({
            title: "Stripe Connect Setup",
            description:
              "Complete your bank account setup in the new window to start receiving payments.",
          });
        }
      } else {
        toast({
          title: "Setup Issue",
          description: "Setup completed but no onboarding URL received. Please contact support.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Setup Failed",
        description: "Unable to start Stripe Connect setup. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePayoutSettingsMutation = useMutation({
    mutationFn: async (settings: { payoutSchedule: string; minimumAmount: number }) => {
      return await apiRequest("PATCH", "/api/therapist/payout-settings", settings);
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Your payout preferences have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/earnings"] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Unable to update payout settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  const calculateInstantPayoutFee = (amount: number) => {
    return amount * 0.01; // 1% fee for instant payouts
  };

  const handlePayoutRequest = () => {
    const amount = parseFloat(payoutAmount);

    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payout amount.",
        variant: "destructive",
      });
      return;
    }

    if (amount > (earnings?.availableForPayout || 0)) {
      toast({
        title: "Insufficient Funds",
        description: "The requested amount exceeds your available balance.",
        variant: "destructive",
      });
      return;
    }

    if (amount < (earnings?.minimumPayoutAmount || 10)) {
      toast({
        title: "Minimum Amount Required",
        description: `Minimum payout amount is £${earnings?.minimumPayoutAmount || 10}.`,
        variant: "destructive",
      });
      return;
    }

    requestPayoutMutation.mutate({ amount, method: payoutMethod });
  };

  // Demo data for display
  const demoEarnings: EarningsData = {
    totalEarnings: 18750.5,
    pendingEarnings: 892.75,
    availableForPayout: 3456.25,
    thisMonthEarnings: 4680.0,
    thisWeekEarnings: 1275.0,
    todayEarnings: 255.0,
    sessionsThisMonth: 42,
    averageSessionRate: 111.43,
    nextPayoutDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    stripeConnectStatus: "active",
    bankAccountConnected: true,
    payoutSchedule: "monthly",
    minimumPayoutAmount: 10,
  };

  const demoPayoutHistory: PayoutTransaction[] = [
    {
      id: "payout_1",
      amount: 1250.0,
      status: "completed",
      requestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      processedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
      method: "stripe_instant",
      fees: 12.5,
      netAmount: 1237.5,
    },
    {
      id: "payout_2",
      amount: 2100.0,
      status: "completed",
      requestedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      processedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      method: "stripe_standard",
      fees: 0,
      netAmount: 2100.0,
    },
    {
      id: "payout_3",
      amount: 875.0,
      status: "pending",
      requestedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      method: "stripe_instant",
      fees: 8.75,
      netAmount: 866.25,
    },
  ];

  const demoEarningsBreakdown: EarningsBreakdown = {
    sessionEarnings: 4560.0,
    consultationEarnings: 360.0,
    netEarnings: 4182.0, // 85% of total (4920)
  };

  const displayEarnings = earnings || demoEarnings;
  const displayPayoutHistory = payoutHistory.length > 0 ? payoutHistory : demoPayoutHistory;
  const displayBreakdown = earningsBreakdown || demoEarningsBreakdown;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-century font-bold text-hive-black">Earnings & Payouts</h2>
        <Badge className="bg-hive-light-blue text-hive-purple">
          {displayEarnings.stripeConnectStatus === "active"
            ? "Payment Setup Complete"
            : "Setup Required"}
        </Badge>
      </div>

      {/* Simplified Payment Information */}
      <Card className="border-l-4 border-l-hive-purple bg-gradient-to-r from-hive-light-blue to-hive-background">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-hive-purple mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold text-hive-purple">Payment Information</h3>
              <p className="text-sm text-hive-black">
                You receive <strong>exactly 85% of every session fee</strong>. All payment
                processing is handled seamlessly by Hive Wellness.
              </p>
              <div className="bg-white/60 rounded-lg p-3 mt-3">
                <h4 className="font-medium text-hive-purple text-sm">Payout Options</h4>
                <p className="text-xs text-hive-black">
                  • Standard payouts: Free (1-3 business days)
                </p>
                <p className="text-xs text-hive-black">
                  • Instant payouts: 1% fee for immediate transfer
                </p>
                <p className="text-xs text-hive-black mt-2">
                  <strong>Note:</strong> Payout timing depends on your Stripe account standing.
                  Manage earnings in your Stripe Connect dashboard.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-hive-light-blue to-hive-background border-hive-purple/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-hive-purple">Available Now</p>
                <p className="text-2xl font-bold text-hive-purple">
                  {formatCurrency(displayEarnings.availableForPayout)}
                </p>
                <p className="text-xs text-hive-black mt-1">Ready to withdraw</p>
              </div>
              <Wallet className="w-8 h-8 text-hive-purple" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-hive-light-blue to-hive-background border-hive-purple/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-hive-purple">This Month</p>
                <p className="text-2xl font-bold text-hive-purple">
                  {formatCurrency(displayEarnings.thisMonthEarnings)}
                </p>
                <p className="text-xs text-hive-black mt-1">
                  {displayEarnings.sessionsThisMonth} sessions
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-hive-purple" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-hive-light-blue to-hive-background border-hive-purple/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-hive-purple">Total Earned</p>
                <p className="text-2xl font-bold text-hive-purple">
                  {formatCurrency(displayEarnings.totalEarnings)}
                </p>
                <p className="text-xs text-hive-black mt-1">All time</p>
              </div>
              <PoundSterling className="w-8 h-8 text-hive-purple" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-hive-light-blue to-hive-background border-hive-purple/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-hive-purple">Pending</p>
                <p className="text-2xl font-bold text-hive-purple">
                  {formatCurrency(displayEarnings.pendingEarnings)}
                </p>
                <p className="text-xs text-hive-black mt-1">Processing</p>
              </div>
              <Clock className="w-8 h-8 text-hive-purple" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payout" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="payout">Request Payout</TabsTrigger>
          <TabsTrigger value="history">Payout History</TabsTrigger>
          <TabsTrigger value="breakdown">Earnings Breakdown</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="payout" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payout Request Form */}
            <Card className="border-2 border-hive-purple/20">
              <CardHeader>
                <CardTitle className="text-hive-purple">Request Payout</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {displayEarnings.stripeConnectStatus !== "active" ? (
                  <div className="text-center py-8 space-y-4">
                    <AlertCircle className="w-12 h-12 mx-auto text-orange-500" />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Setup Required</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Connect your bank account to start receiving payments
                      </p>
                      <Button
                        onClick={() => setupStripeConnectMutation.mutate()}
                        className="bg-hive-purple hover:bg-hive-purple/90"
                        disabled={setupStripeConnectMutation.isPending}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Setup Bank Account
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-800">Ready for Payouts</span>
                      </div>
                      <p className="text-sm text-green-700">
                        Available balance: {formatCurrency(displayEarnings.availableForPayout)}
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="payoutAmount">Amount to Withdraw</Label>
                      <Input
                        id="payoutAmount"
                        type="number"
                        placeholder="0.00"
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(e.target.value)}
                        min={displayEarnings.minimumPayoutAmount}
                        max={displayEarnings.availableForPayout}
                        step="0.01"
                        className="mt-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Minimum: £{displayEarnings.minimumPayoutAmount} | Maximum: £
                        {displayEarnings.availableForPayout}
                      </p>

                      {/* Quick Amount Buttons */}
                      <div className="flex gap-2 flex-wrap mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPayoutAmount("500")}
                          className="text-xs"
                        >
                          £500
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPayoutAmount("1000")}
                          className="text-xs"
                        >
                          £1000
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setPayoutAmount(displayEarnings.availableForPayout.toString())
                          }
                          className="text-xs"
                        >
                          All Available
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="payoutMethod">Payout Method</Label>
                      <Select
                        value={payoutMethod}
                        onValueChange={(value: "instant" | "standard") => setPayoutMethod(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payout method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instant">
                            <div className="flex flex-col">
                              <span>Instant Payout</span>
                              <span className="text-xs text-gray-500">30 minutes • 1% fee</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="standard">
                            <div className="flex flex-col">
                              <span>Standard Payout</span>
                              <span className="text-xs text-gray-500">
                                Variable schedule (set by Stripe based on account risk profile) • No
                                fee
                              </span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {payoutAmount && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Payout Summary</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Amount:</span>
                            <span>£{parseFloat(payoutAmount || "0").toFixed(2)}</span>
                          </div>
                          {payoutMethod === "instant" && (
                            <div className="flex justify-between">
                              <span>Instant Payout Fee (1%):</span>
                              <span>
                                -£
                                {calculateInstantPayoutFee(parseFloat(payoutAmount || "0")).toFixed(
                                  2
                                )}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between font-medium border-t pt-1">
                            <span>You'll receive:</span>
                            <span>
                              £
                              {(
                                parseFloat(payoutAmount || "0") -
                                (payoutMethod === "instant"
                                  ? calculateInstantPayoutFee(parseFloat(payoutAmount || "0"))
                                  : 0)
                              ).toFixed(2)}
                            </span>
                          </div>
                          <div className="text-xs text-blue-700 mt-2 bg-blue-100 p-2 rounded">
                            <strong>Note:</strong> This amount is already after Stripe processing
                            fees were deducted from original payments.
                            <a
                              href="https://stripe.com/gb/pricing"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-blue-800"
                            >
                              View Stripe fees
                            </a>
                          </div>
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={handlePayoutRequest}
                      disabled={requestPayoutMutation.isPending || !payoutAmount}
                      className="w-full bg-hive-purple hover:bg-hive-purple/90"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {requestPayoutMutation.isPending
                        ? "Processing..."
                        : `Request ${payoutMethod === "instant" ? "Instant" : "Standard"} Payout`}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => {
                    setPayoutAmount(displayEarnings.availableForPayout.toString());
                    setPayoutMethod("instant");
                  }}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <ArrowDownRight className="w-4 h-4 mr-2" />
                  Withdraw All Available ({formatCurrency(displayEarnings.availableForPayout)})
                </Button>

                <Button
                  onClick={() => {
                    setPayoutAmount((displayEarnings.availableForPayout / 2).toString());
                    setPayoutMethod("standard");
                  }}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <ArrowDownRight className="w-4 h-4 mr-2" />
                  Withdraw Half ({formatCurrency(displayEarnings.availableForPayout / 2)})
                </Button>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Next Automatic Payout</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    {new Date(displayEarnings.nextPayoutDate).toLocaleDateString("en-GB", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <h5 className="text-xs font-semibold text-blue-800 mb-1">
                      Payout Schedule Options
                    </h5>
                    <p className="text-xs text-blue-700 mb-2">
                      Payouts are processed by Stripe according to their standard schedule
                    </p>
                    <a
                      href="https://support.stripe.com/topics/payouts?referrer=dashboard_search"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-hive-purple hover:text-hive-purple/80 underline"
                    >
                      Learn about Stripe payout schedules →
                    </a>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open("https://dashboard.stripe.com/dashboard", "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Stripe Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Payout History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayPayoutHistory.map((payout) => (
                  <div
                    key={payout.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          payout.status === "completed"
                            ? "bg-green-100"
                            : payout.status === "pending"
                              ? "bg-orange-100"
                              : "bg-red-100"
                        }`}
                      >
                        {payout.status === "completed" ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : payout.status === "pending" ? (
                          <Clock className="w-5 h-5 text-orange-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{formatCurrency(payout.amount)}</div>
                        <div className="text-sm text-gray-600">
                          {payout.method === "stripe_instant"
                            ? "Instant Payout"
                            : "Standard Payout"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(payout.requestedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        className={
                          payout.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : payout.status === "pending"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-red-100 text-red-800"
                        }
                      >
                        {payout.status}
                      </Badge>
                      <div className="text-sm text-gray-600 mt-1">
                        Net: {formatCurrency(payout.netAmount)}
                      </div>
                      {payout.fees > 0 && (
                        <div className="text-xs text-gray-500">
                          Fee: {formatCurrency(payout.fees)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Earnings Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium">Session Earnings</span>
                      <span className="font-semibold text-blue-900">
                        {formatCurrency(displayBreakdown.sessionEarnings)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium">Consultation Earnings</span>
                      <span className="font-semibold text-green-900">
                        {formatCurrency(displayBreakdown.consultationEarnings)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-2 border-green-300">
                      <span className="text-sm font-medium">Your Earnings (85%)</span>
                      <span className="font-bold text-green-900">
                        {formatCurrency(displayBreakdown.netEarnings)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 text-center">
                      All processing fees handled by Hive Wellness
                    </div>
                  </div>
                </div>

                {/* Simplified Payout Information */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold text-blue-800 flex items-center mb-2">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Payout Information
                  </h4>
                  <div className="text-sm text-blue-700 space-y-2">
                    <p>
                      You receive <strong>exactly 85% of every session fee</strong>. All payment
                      processing is managed by Hive Wellness.
                    </p>
                    <div className="bg-blue-100 p-2 rounded mt-3">
                      <div className="text-xs space-y-1">
                        <p>
                          <strong>Standard Payouts:</strong> Free (1-3 business days)
                        </p>
                        <p>
                          <strong>Instant Payouts:</strong> 1% fee for immediate transfer
                        </p>
                      </div>
                    </div>
                    <div className="bg-white border border-blue-300 p-3 rounded mt-3">
                      <p className="text-xs text-blue-900 font-semibold mb-2">
                        Important: Stripe Connect Account
                      </p>
                      <div className="text-xs text-blue-800 space-y-1">
                        <p>
                          • Every therapist must register with Stripe Connect to receive payments
                        </p>
                        <p>• Your standing with Stripe determines the frequency of your payouts</p>
                        <p>
                          • Your <strong>Stripe Connect dashboard</strong> is the most accurate
                          place to manage your Hive Wellness earnings
                        </p>
                        <p>
                          • <strong>All payout queries</strong> should be directed to Stripe
                          directly
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Payout Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="payoutSchedule">Billing Frequency</Label>
                  <Select defaultValue={displayEarnings.payoutSchedule}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily Payouts (Recommended)</SelectItem>
                      <SelectItem value="weekly">Weekly Payouts</SelectItem>
                      <SelectItem value="monthly">Monthly Payouts</SelectItem>
                      <SelectItem value="instant">Instant Payout (1% fee)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-600 mt-1">
                    Daily payouts are our default schedule. Weekly and monthly options available.
                  </p>
                </div>

                <div>
                  <Label htmlFor="minimumAmount">Minimum Payout Amount</Label>
                  <Input
                    id="minimumAmount"
                    type="number"
                    defaultValue={displayEarnings.minimumPayoutAmount}
                    min="10"
                    max="1000"
                    step="10"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Payment Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Stripe Connect Status:</span>
                    <Badge
                      className={
                        displayEarnings.stripeConnectStatus === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-orange-100 text-orange-800"
                      }
                    >
                      {displayEarnings.stripeConnectStatus}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Bank Account:</span>
                    <Badge
                      className={
                        displayEarnings.bankAccountConnected
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {displayEarnings.bankAccountConnected ? "Connected" : "Not Connected"}
                    </Badge>
                  </div>
                </div>
              </div>

              <Button className="w-full bg-hive-purple hover:bg-hive-purple/90">
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
