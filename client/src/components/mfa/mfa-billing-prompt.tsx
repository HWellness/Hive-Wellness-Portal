/**
 * MFA Billing Handoff Prompt - Step 54
 * Prompts admin when MFA keys are missing
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Mail, CreditCard, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

interface MFABillingPromptProps {
  onDismiss?: () => void;
}

export default function MFABillingPrompt({ onDismiss }: MFABillingPromptProps) {
  const { toast } = useToast();
  const [billingEmail, setBillingEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const emailTemplate = `Subject: MFA Provider Subscription for Hive Wellness

Dear Billing Team,

We require a Multi-Factor Authentication (MFA) provider subscription for the Hive Wellness platform to enhance security for our therapist and client portals.

Billing Contact: ${billingEmail || "[Your Email]"}
Company: Hive Wellness
Service Required: TOTP/Authenticator App MFA Provider

Please send the subscription invoice to the email address above.

Thank you,
Hive Wellness Admin Team`;

  const requestBillingMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/admin/request-mfa-billing", {
        billingEmail: email,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Sent",
        description: "MFA billing request has been submitted. You will receive an invoice shortly.",
      });
      onDismiss?.();
    },
    onError: () => {
      toast({
        title: "Request Failed",
        description: "Failed to submit billing request. Please contact support directly.",
        variant: "destructive",
      });
    },
  });

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(emailTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Email template copied to clipboard",
    });
  };

  const handleSubmitRequest = () => {
    if (!billingEmail || !billingEmail.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid billing email address",
        variant: "destructive",
      });
      return;
    }
    requestBillingMutation.mutate(billingEmail);
  };

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <CreditCard className="h-5 w-5" />
          MFA Provider Subscription Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-orange-200 bg-white">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-sm text-gray-700">
            Multi-Factor Authentication (MFA) requires a paid provider subscription. This service
            enhances security for all user accounts on the Hive Wellness platform.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="billingEmail">Billing Contact Email</Label>
            <Input
              id="billingEmail"
              type="email"
              placeholder="billing@hive-wellness.co.uk"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              className="border-gray-300"
            />
            <p className="text-xs text-gray-500">
              Enter the email address where you'd like to receive the invoice
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubmitRequest}
              disabled={requestBillingMutation.isPending}
              className="flex-1 bg-hive-purple hover:bg-hive-purple/90"
            >
              <Mail className="h-4 w-4 mr-2" />
              {requestBillingMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
            <Button variant="outline" onClick={handleCopyTemplate} className="border-gray-300">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="p-3 bg-white rounded border border-gray-200 text-xs font-mono text-gray-600 max-h-48 overflow-y-auto">
          {emailTemplate}
        </div>

        <p className="text-xs text-gray-500 text-center">
          You'll receive an invoice and setup instructions via email
        </p>
      </CardContent>
    </Card>
  );
}
