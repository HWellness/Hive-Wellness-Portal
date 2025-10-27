import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Key,
  AlertCircle,
  Settings,
  Smartphone,
  Mail,
  Lock,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MultiMethodMFASetupDialog } from "./MultiMethodMFASetupDialog";
import { MFAVerificationDialog } from "./MFAVerificationDialog";

type MFAMethod = "totp" | "sms" | "email";

interface MFAStatus {
  enabled: boolean;
  availableMethods: MFAMethod[];
  preferredMethod?: MFAMethod;
  hasBackupCodes: boolean;
  backupCodesCount: number;
  setupAt?: string;
  // Legacy fields for backward compatibility
  mfaEnabled?: boolean;
  mfaSetupAt?: string | null;
  mfaVerifiedAt?: string | null;
}

export function MFASettings() {
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [disableError, setDisableError] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: mfaStatus, isLoading } = useQuery<MFAStatus>({
    queryKey: ["/api/mfa/status"],
    retry: false,
  });

  const disableMutation = useMutation({
    mutationFn: (data: { password: string; token: string }) =>
      apiRequest("POST", "/api/mfa/disable", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mfa/status"] });
      setDisableDialogOpen(false);
      setPassword("");
      setDisableError("");
      toast({
        title: "MFA Disabled",
        description: "Two-factor authentication has been disabled for your account.",
      });
    },
    onError: (error: any) => {
      setDisableError(error.message || "Failed to disable MFA");
    },
  });

  const generateBackupCodesMutation = useMutation({
    mutationFn: (password: string) => apiRequest("POST", "/api/mfa/backup-codes", { password }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mfa/status"] });

      // Download the new backup codes
      const codes = data.backupCodes.join("\\n");
      const blob = new Blob(
        [
          `Hive Wellness MFA Backup Codes\\n\\nGenerated: ${new Date().toLocaleString()}\\n\\n${codes}\\n\\nKeep these codes safe and secure.`,
        ],
        { type: "text/plain" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "hive-wellness-backup-codes-new.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "New backup codes generated",
        description:
          "Your new backup codes have been downloaded. The old codes are no longer valid.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate backup codes",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleDisableMFA = (token: string) => {
    if (!password) {
      setDisableError("Password is required");
      return;
    }
    setDisableError("");
    disableMutation.mutate({ password, token });
  };

  const handleGenerateBackupCodes = () => {
    const userPassword = prompt("Enter your password to generate new backup codes:");
    if (userPassword) {
      generateBackupCodesMutation.mutate(userPassword);
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="card-mfa-settings">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card data-testid="card-mfa-settings">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account with two-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {mfaStatus?.enabled || mfaStatus?.mfaEnabled ? (
                <ShieldCheck className="h-5 w-5 text-green-500" />
              ) : (
                <ShieldX className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Multi-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">
                  {mfaStatus?.enabled || mfaStatus?.mfaEnabled
                    ? `Protected with ${mfaStatus?.availableMethods?.length || 1} method(s)`
                    : "Your account is not using MFA"}
                </p>
              </div>
            </div>
            <Badge
              variant={mfaStatus?.enabled || mfaStatus?.mfaEnabled ? "default" : "secondary"}
              data-testid="badge-mfa-status"
            >
              {mfaStatus?.enabled || mfaStatus?.mfaEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>

          {/* Available Methods Section */}
          {(mfaStatus?.enabled || mfaStatus?.mfaEnabled) &&
            mfaStatus?.availableMethods &&
            mfaStatus.availableMethods.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-medium text-sm">Active Methods</h4>
                <div className="grid gap-3">
                  {mfaStatus.availableMethods.map((method) => (
                    <div
                      key={method}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {method === "totp" && <Lock className="h-4 w-4 text-blue-500" />}
                        {method === "sms" && <Smartphone className="h-4 w-4 text-green-500" />}
                        {method === "email" && <Mail className="h-4 w-4 text-purple-500" />}
                        <div>
                          <p className="font-medium text-sm">
                            {method === "totp" && "Authenticator App"}
                            {method === "sms" && "SMS"}
                            {method === "email" && "Email"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {method === "totp" && "Google Authenticator, Authy, etc."}
                            {method === "sms" && "Text message verification"}
                            {method === "email" && "Email verification codes"}
                          </p>
                        </div>
                      </div>
                      {mfaStatus.preferredMethod === method && (
                        <Badge variant="outline" className="text-xs">
                          Preferred
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          {(mfaStatus?.enabled || mfaStatus?.mfaEnabled) && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Backup Codes</span>
                </div>
                <span
                  className="text-sm text-muted-foreground"
                  data-testid="text-backup-codes-count"
                >
                  {mfaStatus.backupCodesCount} available
                </span>
              </div>

              {mfaStatus.backupCodesCount < 3 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You're running low on backup codes. Consider generating new ones.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateBackupCodes}
                  disabled={generateBackupCodesMutation.isPending}
                  data-testid="button-generate-backup-codes"
                >
                  <Key className="h-4 w-4 mr-2" />
                  {generateBackupCodesMutation.isPending ? "Generating..." : "Generate New Codes"}
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {!(mfaStatus?.enabled || mfaStatus?.mfaEnabled) ? (
              <Button onClick={() => setSetupDialogOpen(true)} data-testid="button-enable-mfa">
                <Shield className="h-4 w-4 mr-2" />
                Enable MFA
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setSetupDialogOpen(true)}
                  data-testid="button-add-method"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Add Method
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setVerificationDialogOpen(true)}
                  data-testid="button-disable-mfa"
                >
                  <ShieldX className="h-4 w-4 mr-2" />
                  Disable MFA
                </Button>
              </>
            )}
          </div>

          {(mfaStatus?.setupAt || mfaStatus?.mfaSetupAt) && (
            <p className="text-xs text-muted-foreground">
              MFA was set up on{" "}
              {new Date(mfaStatus.setupAt || mfaStatus.mfaSetupAt!).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

      <MultiMethodMFASetupDialog
        open={setupDialogOpen}
        onOpenChange={setSetupDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/mfa/status"] });
        }}
      />

      <MFAVerificationDialog
        open={verificationDialogOpen}
        onOpenChange={setVerificationDialogOpen}
        title="Disable Multi-Factor Authentication"
        description="Please verify your identity to disable MFA for your account."
        availableMethods={mfaStatus?.availableMethods || ["totp"]}
        preferredMethod={mfaStatus?.preferredMethod}
        onSuccess={(token?: string) => {
          setVerificationDialogOpen(false);
          if (token) {
            handleDisableMFA(token);
          }
        }}
      />
    </>
  );
}
