import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Smartphone,
  Mail,
  Lock,
  Copy,
  Download,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type MFAMethod = "totp" | "sms" | "email";

interface MultiMethodMFASetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface TOTPSetupData {
  qrCodeUrl: string;
  secret: string;
  backupCodes: string[];
}

export function MultiMethodMFASetupDialog({
  open,
  onOpenChange,
  onSuccess,
}: MultiMethodMFASetupDialogProps) {
  const [step, setStep] = useState<"choose" | "setup" | "verify" | "complete">("choose");
  const [selectedMethod, setSelectedMethod] = useState<MFAMethod>("totp");
  const [setupData, setSetupData] = useState<TOTPSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // TOTP Setup Mutation
  const totpSetupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/mfa/totp/setup");
      return await response.json();
    },
    onSuccess: (data: any) => {
      console.log("TOTP setup response:", data); // Debug logging
      setSetupData({
        qrCodeUrl: data.qrCodeUrl,
        secret: data.manualEntryKey || data.secret, // Handle both response formats
        backupCodes: data.backupCodes,
      });
      setStep("verify");
      setError("");
    },
    onError: (error: any) => {
      setError(error.message || "Failed to set up TOTP");
    },
  });

  // SMS Setup Mutation
  const smsSetupMutation = useMutation({
    mutationFn: async (phone: string) => {
      const response = await apiRequest("POST", "/api/mfa/sms/setup", { phoneNumber: phone });
      return await response.json();
    },
    onSuccess: () => {
      setStep("verify");
      setError("");
      toast({
        title: "SMS sent",
        description: "A verification code has been sent to your phone number.",
      });
    },
    onError: (error: any) => {
      setError(error.message || "Failed to set up SMS MFA");
    },
  });

  // Email Setup Mutation
  const emailSetupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/mfa/email/setup");
      return await response.json();
    },
    onSuccess: () => {
      setStep("verify");
      setError("");
      toast({
        title: "Email sent",
        description: "A verification code has been sent to your email address.",
      });
    },
    onError: (error: any) => {
      setError(error.message || "Failed to set up email MFA");
    },
  });

  // Universal Verification Mutation
  const verifyMutation = useMutation({
    mutationFn: async (data: { method: MFAMethod; code: string }) => {
      let response;
      if (data.method === "totp") {
        response = await apiRequest("POST", "/api/mfa/totp/verify-setup", { code: data.code });
      } else if (data.method === "sms") {
        response = await apiRequest("POST", "/api/mfa/sms/verify", { code: data.code });
      } else {
        response = await apiRequest("POST", "/api/mfa/email/verify", { code: data.code });
      }
      return await response.json();
    },
    onSuccess: () => {
      setStep("complete");
      setError("");
      toast({
        title: "MFA Method Added",
        description: `${selectedMethod.toUpperCase()} authentication has been successfully enabled.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/mfa/status"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      setError(error.message || "Invalid verification code");
    },
  });

  const handleMethodSelect = (method: MFAMethod) => {
    setSelectedMethod(method);
    setError("");
    setStep("setup");
  };

  const handleSetupStart = () => {
    setError("");
    if (selectedMethod === "totp") {
      totpSetupMutation.mutate();
    } else if (selectedMethod === "sms") {
      if (!phoneNumber || phoneNumber.length < 10) {
        setError("Please enter a valid phone number");
        return;
      }
      smsSetupMutation.mutate(phoneNumber);
    } else if (selectedMethod === "email") {
      emailSetupMutation.mutate();
    }
  };

  const handleVerification = () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a 6-digit verification code");
      return;
    }
    setError("");
    verifyMutation.mutate({ method: selectedMethod, code: verificationCode });
  };

  const handleClose = () => {
    setStep("choose");
    setSelectedMethod("totp");
    setSetupData(null);
    setVerificationCode("");
    setPhoneNumber("");
    setError("");
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset to initial state when opening
      setStep("choose");
      setSelectedMethod("totp");
      setSetupData(null);
      setVerificationCode("");
      setPhoneNumber("");
      setError("");
    } else {
      // Reset state when closing too
      setStep("choose");
      setSelectedMethod("totp");
      setSetupData(null);
      setVerificationCode("");
      setPhoneNumber("");
      setError("");
    }
    onOpenChange(newOpen);
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      toast({
        title: "Secret copied",
        description: "The secret key has been copied to your clipboard.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-mfa-setup">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Multi-Factor Authentication Setup
          </DialogTitle>
          <DialogDescription>
            {step === "choose" && "Choose an authentication method to secure your account"}
            {step === "setup" && `Set up ${selectedMethod.toUpperCase()} authentication`}
            {step === "verify" && "Verify your authentication method"}
            {step === "complete" && "Setup completed successfully"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === "choose" && (
          <div className="space-y-4">
            <div className="grid gap-3">
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleMethodSelect("totp")}
                data-testid="card-totp-method"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lock className="h-4 w-4 text-blue-500" />
                    Authenticator App
                    <Badge variant="outline" className="ml-auto">
                      Recommended
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Use Google Authenticator, Authy, or similar apps for time-based codes
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleMethodSelect("sms")}
                data-testid="card-sms-method"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Smartphone className="h-4 w-4 text-green-500" />
                    SMS Text Message
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Receive verification codes via text message
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleMethodSelect("email")}
                data-testid="card-email-method"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Mail className="h-4 w-4 text-purple-500" />
                    Email Verification
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Receive verification codes via email
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        )}

        {step === "setup" && selectedMethod === "totp" && (
          <div className="space-y-4">
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                Install an authenticator app like Google Authenticator or Authy on your phone before
                proceeding.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleSetupStart}
              disabled={totpSetupMutation.isPending}
              className="w-full"
              data-testid="button-setup-totp"
            >
              {totpSetupMutation.isPending ? "Setting up..." : "Generate QR Code"}
            </Button>
          </div>
        )}

        {step === "setup" && selectedMethod === "sms" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone-number">Phone Number</Label>
              <Input
                id="phone-number"
                type="tel"
                placeholder="+44 7123 456789"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                data-testid="input-phone-number"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Include your country code (e.g., +44 for UK)
              </p>
            </div>

            <Button
              onClick={handleSetupStart}
              disabled={smsSetupMutation.isPending || !phoneNumber}
              className="w-full"
              data-testid="button-setup-sms"
            >
              {smsSetupMutation.isPending ? "Sending SMS..." : "Send Verification Code"}
            </Button>
          </div>
        )}

        {step === "setup" && selectedMethod === "email" && (
          <div className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                We'll send a verification code to your registered email address.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleSetupStart}
              disabled={emailSetupMutation.isPending}
              className="w-full"
              data-testid="button-setup-email"
            >
              {emailSetupMutation.isPending ? "Sending Email..." : "Send Verification Code"}
            </Button>
          </div>
        )}

        {step === "verify" && selectedMethod === "totp" && setupData && (
          <div className="space-y-4">
            <div className="text-center">
              <img src={setupData.qrCodeUrl} alt="QR Code" className="mx-auto border rounded" />
              <p className="text-sm text-muted-foreground mt-2">
                Scan this QR code with your authenticator app
              </p>
            </div>

            <div className="space-y-2">
              <Label>Manual Entry Key</Label>
              <div className="flex gap-2">
                <Input
                  value={setupData.secret || ""}
                  readOnly
                  className="font-mono text-sm"
                  data-testid="input-manual-secret"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copySecret}
                  data-testid="button-copy-secret"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totp-code">Enter 6-digit code from your app</Label>
              <Input
                id="totp-code"
                type="text"
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                data-testid="input-verification-code"
              />
            </div>
          </div>
        )}

        {step === "verify" && (selectedMethod === "sms" || selectedMethod === "email") && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {selectedMethod === "sms"
                  ? `Enter the 6-digit code sent to ${phoneNumber}`
                  : "Enter the 6-digit code sent to your email address"}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="verify-code">Verification Code</Label>
              <Input
                id="verify-code"
                type="text"
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                data-testid="input-verification-code"
              />
            </div>
          </div>
        )}

        {step === "complete" && (
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <div>
              <h3 className="font-semibold">Setup Complete!</h3>
              <p className="text-sm text-muted-foreground">
                {selectedMethod.toUpperCase()} authentication has been enabled for your account.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "choose" && (
            <Button variant="outline" onClick={handleClose} data-testid="button-cancel">
              Cancel
            </Button>
          )}

          {(step === "setup" || step === "verify") && (
            <Button variant="outline" onClick={() => setStep("choose")} data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}

          {step === "verify" && (
            <Button
              onClick={handleVerification}
              disabled={verifyMutation.isPending || !verificationCode}
              data-testid="button-verify"
            >
              {verifyMutation.isPending ? "Verifying..." : "Verify & Enable"}
            </Button>
          )}

          {step === "complete" && (
            <Button onClick={handleClose} data-testid="button-done">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
