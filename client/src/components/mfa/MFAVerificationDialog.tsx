import { useState, useEffect } from "react";
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
import { Shield, AlertCircle, Key, Smartphone, Mail, Lock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type MFAMethod = "totp" | "sms" | "email";

interface MFAVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (token?: string) => void;
  title?: string;
  description?: string;
  availableMethods?: MFAMethod[];
  preferredMethod?: MFAMethod;
}

export function MFAVerificationDialog({
  open,
  onOpenChange,
  onSuccess,
  title = "Multi-Factor Authentication Required",
  description = "Please verify your identity using one of your enabled authentication methods.",
  availableMethods = ["totp"],
  preferredMethod,
}: MFAVerificationDialogProps) {
  const [verificationCode, setVerificationCode] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<MFAMethod>(
    preferredMethod || availableMethods[0] || "totp"
  );
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [error, setError] = useState("");

  // Reset state when dialog opens or methods change
  useEffect(() => {
    if (open) {
      setVerificationCode("");
      setIsBackupCode(false);
      setError("");
      setSelectedMethod(preferredMethod || availableMethods[0] || "totp");
    }
  }, [open, availableMethods, preferredMethod]);

  const { toast } = useToast();

  // Method-specific send code mutations
  const sendSMSMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/mfa/sms/send-code", {}),
    onSuccess: () => {
      toast({
        title: "SMS code sent",
        description: "Please check your phone for the verification code.",
      });
    },
    onError: (error: any) => {
      setError(error.message || "Failed to send SMS code");
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/mfa/email/send-code", {}),
    onSuccess: () => {
      toast({
        title: "Email code sent",
        description: "Please check your email for the verification code.",
      });
    },
    onError: (error: any) => {
      setError(error.message || "Failed to send email code");
    },
  });

  // Method-specific verification mutation
  const verifyMutation = useMutation({
    mutationFn: (data: { method: MFAMethod; token: string }) => {
      // Always route backup codes to backup code endpoint regardless of selected method
      if (isBackupCode) {
        return apiRequest("POST", "/api/mfa/backup-code/verify", { code: data.token });
      }

      // Route to method-specific endpoints for regular codes
      switch (data.method) {
        case "sms":
          return apiRequest("POST", "/api/mfa/sms/verify", { code: data.token });
        case "email":
          return apiRequest("POST", "/api/mfa/email/verify", { code: data.token });
        case "totp":
        default:
          return apiRequest("POST", "/api/mfa/totp/verify", { code: data.token });
      }
    },
    onSuccess: (data: any) => {
      setError("");
      const enteredCode = verificationCode; // Capture before clearing
      setVerificationCode("");
      onSuccess?.(enteredCode);

      // Handle backup code responses
      if (isBackupCode && data.remainingCodes !== undefined) {
        const remainingCount = Array.isArray(data.remainingCodes)
          ? data.remainingCodes.length
          : data.remainingCodes;
        toast({
          title: "Backup code used",
          description: `You have ${remainingCount} backup codes remaining. Consider generating new ones.`,
          variant: remainingCount < 3 ? "destructive" : "default",
        });
      }

      onOpenChange(false);
    },
    onError: (error: any) => {
      setError(error.message || "Invalid verification code");
    },
  });

  const handleVerification = () => {
    const code = verificationCode.trim();
    if (!code) {
      setError("Please enter a verification code");
      return;
    }

    if (!isBackupCode && code.length !== 6) {
      setError("Verification code must be 6 digits");
      return;
    }

    if (isBackupCode && code.replace(/[\s-]/g, "").length !== 12) {
      setError("Backup codes must be 12 characters (format: XXXX-XXXX-XXXX)");
      return;
    }

    setError("");
    verifyMutation.mutate({ method: selectedMethod, token: code });
  };

  const handleInputChange = (value: string) => {
    // Auto-detect if this looks like a backup code (contains letters/hyphens)
    const hasLettersOrHyphens = /[a-zA-Z-]/.test(value);
    setIsBackupCode(hasLettersOrHyphens);

    if (hasLettersOrHyphens) {
      // For backup codes, allow base32 characters and hyphens, format as XXXX-XXXX-XXXX
      const cleanValue = value
        .replace(/[^A-Z2-7]/gi, "")
        .toUpperCase()
        .slice(0, 12);
      const formatted = cleanValue.match(/.{1,4}/g)?.join("-") || cleanValue;
      setVerificationCode(formatted);
    } else {
      // For TOTP codes, only allow numbers up to 6 digits
      setVerificationCode(value.replace(/\D/g, "").slice(0, 6));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && verificationCode) {
      handleVerification();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-mfa-verification">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Method Selection */}
          {availableMethods.length > 1 && (
            <div className="space-y-2">
              <Label>Authentication Method</Label>
              <div className="grid grid-cols-1 gap-2">
                {availableMethods.map((method) => (
                  <Button
                    key={method}
                    variant={selectedMethod === method ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedMethod(method)}
                    className="justify-start"
                    data-testid={`button-method-${method}`}
                  >
                    {method === "totp" && <Lock className="h-4 w-4 mr-2" />}
                    {method === "sms" && <Smartphone className="h-4 w-4 mr-2" />}
                    {method === "email" && <Mail className="h-4 w-4 mr-2" />}
                    {method === "totp" && "Authenticator App"}
                    {method === "sms" && "SMS"}
                    {method === "email" && "Email"}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="mfa-code">
              {isBackupCode ? (
                <span className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Backup Code
                </span>
              ) : (
                `${selectedMethod === "totp" ? "Authenticator" : selectedMethod === "sms" ? "SMS" : "Email"} Code`
              )}
            </Label>
            <div className="space-y-3">
              <Input
                id="mfa-code"
                type="text"
                placeholder={isBackupCode ? "XXXX-XXXX-XXXX" : "123456"}
                value={verificationCode}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyPress={handleKeyPress}
                autoComplete="one-time-code"
                data-testid="input-mfa-code"
              />

              {/* Send code button for SMS/Email methods */}
              {(selectedMethod === "sms" || selectedMethod === "email") && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedMethod === "sms") {
                      sendSMSMutation.mutate();
                    } else if (selectedMethod === "email") {
                      sendEmailMutation.mutate();
                    }
                  }}
                  disabled={sendSMSMutation.isPending || sendEmailMutation.isPending}
                  className="w-full"
                  data-testid={`button-send-${selectedMethod}-code`}
                >
                  {sendSMSMutation.isPending || sendEmailMutation.isPending
                    ? "Sending..."
                    : `Send ${selectedMethod.toUpperCase()} Code`}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isBackupCode
                ? "Enter one of your backup recovery codes"
                : "Enter the 6-digit code from your authenticator app"}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="text-center">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground underline"
              onClick={() => {
                setIsBackupCode(!isBackupCode);
                setVerificationCode("");
                setError("");
              }}
              data-testid="button-toggle-backup-code"
            >
              {isBackupCode ? "Use authenticator app instead" : "Use a backup code instead"}
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-verification"
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerification}
            disabled={!verificationCode || verifyMutation.isPending}
            data-testid="button-verify"
          >
            {verifyMutation.isPending ? "Verifying..." : "Verify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
