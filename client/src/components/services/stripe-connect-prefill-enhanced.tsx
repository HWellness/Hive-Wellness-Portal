import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Loader,
  User,
  Building,
  Phone,
  MapPin,
  RefreshCw,
  Shield,
  PoundSterling,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface StripeConnectApplication {
  id: string;
  therapistId: string;
  stripeAccountId?: string;
  accountStatus: "pending" | "submitted" | "active" | "rejected" | "restricted";
  onboardingUrl?: string;
  applicationData: {
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    business_type: "individual" | "company";
    address: {
      line1: string;
      line2?: string;
      city: string;
      postal_code: string;
      country: string;
    };
    dob: {
      day: number;
      month: number;
      year: number;
    };
    ssn_last_4?: string;
    tax_id?: string;
  };
  verificationStatus: {
    detailsSubmitted: boolean;
    payoutsEnabled: boolean;
    chargesEnabled: boolean;
  };
  createdAt: string;
  updatedAt?: string;
}

interface StripeConnectPrefillEnhancedProps {
  therapistId?: string;
}

const ONBOARDING_STEPS = [
  { id: 1, title: "Basic Information", description: "Personal details and contact" },
  { id: 2, title: "Business Details", description: "Business type and tax information" },
  { id: 3, title: "Identity Verification", description: "Identity and address verification" },
  { id: 4, title: "Bank Account", description: "Setup payout bank account" },
  { id: 5, title: "Review & Activate", description: "Final review and activation" },
];

export default function StripeConnectPrefillEnhanced({
  therapistId,
}: StripeConnectPrefillEnhancedProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [applicationData, setApplicationData] = useState<
    Partial<StripeConnectApplication["applicationData"]>
  >({
    business_type: "individual",
    address: {
      country: "GB",
      line1: "",
      city: "",
      postal_code: "",
    },
    dob: {
      day: 1,
      month: 1,
      year: 1990,
    },
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Early return if no therapistId
  if (!therapistId) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-gray-600">Therapist ID is required for Stripe Connect setup</p>
        </div>
      </div>
    );
  }

  // Load existing application
  const { data: existingApplication, isLoading } = useQuery<StripeConnectApplication>({
    queryKey: ["/api/automation/stripe-connect", therapistId],
    enabled: !!therapistId,
  });

  // Create/update Stripe Connect application
  const createApplicationMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", `/api/automation/stripe-connect/prefill/${therapistId}`, data),
    onSuccess: (data: any) => {
      toast({
        title: "Application Created",
        description: "Stripe Connect application has been created successfully.",
      });

      if (data.onboardingUrl) {
        window.open(data.onboardingUrl, "_blank");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/automation/stripe-connect"] });
    },
    onError: (error: any) => {
      toast({
        title: "Application Failed",
        description: error.message || "Failed to create Stripe Connect application.",
        variant: "destructive",
      });
    },
  });

  // Refresh application status
  const refreshStatusMutation = useMutation({
    mutationFn: () => apiRequest("GET", `/api/automation/stripe-connect/status/${therapistId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/stripe-connect"] });
    },
  });

  // Pre-fill application data
  const prefillApplicationMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/automation/stripe-connect/prefill/${therapistId}`, {
        autoFillFromProfile: true,
      }),
    onSuccess: (data: any) => {
      toast({
        title: "Application Pre-filled",
        description: "Application has been pre-filled with your profile data.",
      });

      if (data.onboardingUrl) {
        window.open(data.onboardingUrl, "_blank");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/automation/stripe-connect"] });
    },
    onError: (error: any) => {
      toast({
        title: "Pre-fill Failed",
        description: error.message || "Failed to pre-fill application.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (existingApplication) {
      setApplicationData(existingApplication.applicationData);

      // Determine current step based on completion status
      if (existingApplication.verificationStatus.payoutsEnabled) {
        setCurrentStep(5);
      } else if (existingApplication.verificationStatus.chargesEnabled) {
        setCurrentStep(4);
      } else if (existingApplication.stripeAccountId) {
        setCurrentStep(3);
      } else {
        setCurrentStep(2);
      }
    }
  }, [existingApplication]);

  const handleInputChange = (field: string, value: any) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setApplicationData((prev) => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as any),
          [child]: value,
        },
      }));
    } else {
      setApplicationData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleQuickPrefill = () => {
    prefillApplicationMutation.mutate();
  };

  const handleCreateApplication = () => {
    createApplicationMutation.mutate(applicationData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "restricted":
        return <Badge className="bg-red-100 text-red-700 border-red-200">Restricted</Badge>;
      case "submitted":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Under Review</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  const getProgressPercentage = () => {
    if (!existingApplication) return 0;

    let progress = 0;
    if (existingApplication.stripeAccountId) progress += 20;
    if (existingApplication.verificationStatus.detailsSubmitted) progress += 30;
    if (existingApplication.verificationStatus.chargesEnabled) progress += 25;
    if (existingApplication.verificationStatus.payoutsEnabled) progress += 25;

    return progress;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading Stripe Connect status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stripe Connect Setup</h1>
          <p className="text-gray-600">
            Complete your Stripe Connect onboarding to receive payments
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {existingApplication && (
            <>
              {getStatusBadge(existingApplication.accountStatus)}
              <Button
                size="sm"
                variant="outline"
                onClick={() => refreshStatusMutation.mutate()}
                disabled={refreshStatusMutation.isPending}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Onboarding Progress</h3>
            <span className="text-sm text-gray-600">{getProgressPercentage()}% Complete</span>
          </div>

          <Progress value={getProgressPercentage()} className="mb-4" />

          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {ONBOARDING_STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`p-3 rounded-lg text-center ${
                  currentStep >= step.id ? "bg-hive-purple text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                <div className="font-semibold text-sm">{step.title}</div>
                <div className="text-xs mt-1">{step.description}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {!existingApplication || existingApplication.accountStatus === "pending" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Auto Pre-fill Option */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-hive-purple" />
                <span>Quick Setup (Recommended)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Automatically pre-fill your Stripe Connect application using your therapist profile
                information.
              </p>

              <Alert>
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  This will create a Stripe Express account and pre-fill your personal details,
                  business type (Individual), and UK address information.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleQuickPrefill}
                disabled={prefillApplicationMutation.isPending}
                className="w-full bg-hive-purple hover:bg-hive-purple/90"
              >
                {prefillApplicationMutation.isPending ? (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                Start Quick Setup
              </Button>
            </CardContent>
          </Card>

          {/* Manual Setup Option */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5 text-hive-purple" />
                <span>Manual Setup</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Manually enter your information and create a custom Stripe Connect application.
              </p>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={applicationData.email || ""}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="your.email@example.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={applicationData.first_name || ""}
                      onChange={(e) => handleInputChange("first_name", e.target.value)}
                      placeholder="First Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={applicationData.last_name || ""}
                      onChange={(e) => handleInputChange("last_name", e.target.value)}
                      placeholder="Last Name"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleCreateApplication}
                disabled={createApplicationMutation.isPending}
                variant="outline"
                className="w-full"
              >
                {createApplicationMutation.isPending ? (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Building className="w-4 h-4 mr-2" />
                )}
                Create Manual Application
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Existing Application Status */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-hive-purple" />
              <span>Your Stripe Connect Account</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Account Status</Label>
                <div className="mt-1">{getStatusBadge(existingApplication.accountStatus)}</div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600">Account ID</Label>
                <div className="mt-1 font-mono text-sm">
                  {existingApplication.stripeAccountId || "Not Created"}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600">Charges Enabled</Label>
                <div className="mt-1 flex items-center space-x-2">
                  {existingApplication.verificationStatus.chargesEnabled ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  )}
                  <span className="text-sm">
                    {existingApplication.verificationStatus.chargesEnabled ? "Yes" : "Pending"}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600">Payouts Enabled</Label>
                <div className="mt-1 flex items-center space-x-2">
                  {existingApplication.verificationStatus.payoutsEnabled ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  )}
                  <span className="text-sm">
                    {existingApplication.verificationStatus.payoutsEnabled ? "Yes" : "Pending"}
                  </span>
                </div>
              </div>
            </div>

            {existingApplication.onboardingUrl &&
              !existingApplication.verificationStatus.payoutsEnabled && (
                <div className="mt-4">
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      Your account setup is incomplete. Complete the onboarding process to start
                      receiving payments.
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={() => window.open(existingApplication.onboardingUrl, "_blank")}
                    className="mt-3 bg-hive-purple hover:bg-hive-purple/90"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Complete Onboarding
                  </Button>
                </div>
              )}

            {existingApplication.verificationStatus.payoutsEnabled && (
              <Alert>
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  Congratulations! Your Stripe Connect account is fully active. You can now receive
                  payments from therapy sessions.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PoundSterling className="w-5 h-5 text-hive-purple" />
            <span>Payment Structure</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">Your Earnings</h4>
              <p className="text-2xl font-bold text-green-600">85%</p>
              <p className="text-sm text-green-600">of session fees</p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Platform Fee</h4>
              <p className="text-2xl font-bold text-blue-600">15%</p>
              <p className="text-sm text-blue-600">covers platform costs</p>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p>• Payments are automatically split when clients book sessions</p>
            <p>• Your earnings are transferred to your bank account weekly</p>
            <p>• Instant payouts available for 1% fee</p>
            <p>• All transactions in British Pounds (GBP)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
