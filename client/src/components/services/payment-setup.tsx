import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  PoundSterling,
  TrendingUp,
  Settings,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import PaymentsCopyHelper from "@/components/admin/payments-copy-helper";

interface PaymentSetupProps {
  user: User;
  onNavigateToService?: (serviceId: string) => void;
}

export default function PaymentSetup({ user, onNavigateToService }: PaymentSetupProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query payment status
  const {
    data: paymentStatus,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/therapist/payment-status", user.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/therapist/payment-status/${user.id}`);
      const result = await response.json();
      return result;
    },
    retry: false,
    staleTime: 60000, // Keep payment status fresh for 1 minute
    refetchOnWindowFocus: false, // Prevent unnecessary refetches on focus
  });

  // Setup payment mutation
  const setupPaymentMutation = useMutation({
    mutationFn: async () => {
      console.log("Sending payment setup request:", {
        therapistId: user.id,
        setupMethod: "quick",
        paymentData: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });

      // Send data to your Stripe Payment Splitter API
      const response = await apiRequest("POST", "/api/therapist/payment-setup", {
        therapistId: user.id,
        setupMethod: "quick",
        paymentData: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });

      const result = await response.json();
      console.log("Payment setup response:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("Payment setup successful:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/payment-status"] });

      if (data.externalSetupUrl) {
        // Open external setup in new tab
        console.log("Opening external setup URL:", data.externalSetupUrl);
        window.open(data.externalSetupUrl, "_blank");
        toast({
          title: "Payment Setup Initiated",
          description: "Please complete the setup in the new tab that opened.",
        });
      } else {
        toast({
          title: "Payment Setup Complete",
          description: "Your payment information has been configured successfully.",
        });
      }
    },
    onError: (error: any) => {
      console.error("Payment setup error:", error);
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to setup payment processing. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSetupPayments = () => {
    setupPaymentMutation.mutate();
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "active":
      case "complete":
        return "bg-green-100 text-green-800";
      case "pending":
      case "setup_required":
        return "bg-yellow-100 text-yellow-800";
      case "restricted":
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "active":
      case "complete":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "pending":
      case "setup_required":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case "restricted":
      case "rejected":
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Settings className="w-5 h-5 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-hive-purple rounded-full mx-auto mb-4"></div>
          <div className="text-hive-purple font-century text-lg font-bold">
            Loading Payment Setup
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error("Payment status error:", error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-red-800 mb-2">Payment Setup Error</h2>
                <p className="text-red-600">
                  Unable to load payment status. Please try again later.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-century font-bold text-hive-black mb-2">Payment Setup</h1>
          <p className="text-hive-black/70 font-secondary">
            Configure your payment processing with Hive Wellness
          </p>
        </div>

        {/* Current Status */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-hive-purple" />
              Payment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(paymentStatus?.status)}
                <div>
                  <p className="font-medium text-hive-black">
                    {paymentStatus?.status === "active"
                      ? "Payment Setup Complete"
                      : paymentStatus?.status === "pending"
                        ? "Setup In Progress"
                        : "Setup Required"}
                  </p>
                  <p className="text-sm text-hive-black/70">
                    {paymentStatus?.status === "active"
                      ? "Ready to receive payments with 85% revenue share (payout schedule set by Stripe based on your account risk profile)"
                      : paymentStatus?.status === "pending"
                        ? "Please complete any pending setup steps"
                        : "Configure payment processing to start earning"}
                  </p>
                </div>
              </div>
              <Badge className={getStatusColor(paymentStatus?.status)}>
                {paymentStatus?.status || "Not Setup"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Split Info */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-hive-purple/5 to-hive-blue/5">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-hive-purple" />
              Revenue Share Structure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <PoundSterling className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-green-600">85%</h3>
                <p className="text-sm text-green-700">Your Earnings</p>
                <p className="text-xs text-green-600 mt-1">Per session fee</p>
              </div>
              <div className="text-center p-4 bg-hive-light-blue rounded-lg">
                <Settings className="w-8 h-8 text-hive-purple mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-hive-purple">15%</h3>
                <p className="text-sm text-hive-purple">Platform Fee</p>
                <p className="text-xs text-hive-purple/70 mt-1">Includes processing costs</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white/50 rounded border border-hive-purple/20">
              <p className="text-sm text-hive-black/70">
                • Instant payouts available • Stripe processing fees covered by platform • Weekly
                automated payouts • Full transaction transparency • All amounts displayed in British
                pounds (£)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Streamlined Setup Process */}
        {paymentStatus?.status !== "active" && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Complete Payment Setup</CardTitle>
              <CardDescription>
                Set up your Stripe Connect account to start receiving payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Simplified Setup */}
              <div className="p-6 border border-hive-purple/20 rounded-lg bg-hive-purple/5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-hive-black">Set Up Payment Processing</h3>
                  <Badge className="bg-hive-light-blue text-hive-purple">Quick Setup</Badge>
                </div>
                <p className="text-sm text-hive-black/70 mb-4">
                  <strong>Connect with Stripe</strong> to securely handle payments. You'll be taken
                  to Stripe's secure portal to provide your banking details and verify your account.
                  This typically takes 2-3 minutes.
                </p>
                <Button
                  onClick={handleSetupPayments}
                  disabled={setupPaymentMutation.isPending}
                  className="w-full bg-hive-purple hover:bg-hive-purple/90"
                >
                  {setupPaymentMutation.isPending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Creating account...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Set Up Stripe Account
                    </>
                  )}
                </Button>
              </div>

              {/* Payments Copy Helper */}
              <PaymentsCopyHelper />

              {/* Setup Information */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">What You'll Need</h4>
                    <p className="text-sm text-blue-700 mb-3">You will need to provide:</p>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Your UK bank account details (sort code & account number)</li>
                      <li>
                        • Business details (Industry: Mental Health Services, Website:
                        www.hive-wellness.co.uk)
                      </li>
                      <li>• Your address and contact information</li>
                    </ul>
                    <p className="text-sm text-blue-700 mt-3">
                      Please note: Most accounts are approved instantly. The secure Stripe
                      verification portal will open in a new tab.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Setup Complete Actions */}
        {paymentStatus?.status === "active" && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Payment Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => {
                    console.log("🎯 View Earnings button clicked!");
                    onNavigateToService?.("therapist-earnings");
                  }}
                  variant="outline"
                  className="border-hive-purple text-hive-purple hover:bg-hive-purple hover:text-white"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Earnings
                </Button>
                <Button
                  onClick={() => {
                    console.log("💳 Payment Dashboard button clicked!");
                    if (paymentStatus?.dashboardUrl) {
                      window.open(paymentStatus.dashboardUrl, "_blank");
                    } else if (paymentStatus?.isDemo) {
                      toast({
                        title: "Demo Account",
                        description:
                          "This is a demo account. In production, this would open the Stripe Connect dashboard.",
                      });
                    } else {
                      toast({
                        title: "Setup Required",
                        description:
                          "Please complete payment setup first to access your dashboard.",
                        variant: "destructive",
                      });
                    }
                  }}
                  variant="outline"
                  className="border-hive-purple text-hive-purple hover:bg-hive-purple hover:text-white"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Payment Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
