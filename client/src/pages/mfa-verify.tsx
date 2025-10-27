import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertCircle, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function MFAVerify() {
  const [, setLocation] = useLocation();
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();

  // Check MFA status
  const { data: mfaStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/mfa/status"],
    retry: false,
  });

  // Redirect if MFA not required
  useEffect(() => {
    if (mfaStatus && !mfaStatus.required) {
      setLocation("/");
    }
  }, [mfaStatus, setLocation]);

  // Verify MFA code
  const verifyMutation = useMutation({
    mutationFn: async (data: { token: string; method?: string }) => {
      const response = await apiRequest("POST", "/api/mfa/verify-login", data);
      return response.json();
    },
    onSuccess: async (data) => {
      // Update the query cache with the authenticated user
      if (data.user) {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        queryClient.setQueryData(["/api/auth/user"], data.user);
      }

      toast({
        title: "Verification Successful",
        description: "You have been authenticated successfully.",
      });
      setLocation("/");
    },
    onError: (err: any) => {
      setError(err.message || "Invalid verification code");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!verificationCode.trim()) {
      setError("Please enter your verification code");
      return;
    }

    verifyMutation.mutate({
      token: verificationCode.trim(),
      method: mfaStatus?.preferredMethod || "totp",
    });
  };

  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-hive-purple" />
          </div>
          <CardTitle>Multi-Factor Authentication</CardTitle>
          <CardDescription>Please enter your verification code to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="Enter your 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
                autoFocus
                data-testid="input-mfa-code"
              />
              <p className="text-sm text-muted-foreground">
                Enter the code from your authenticator app
                {mfaStatus?.availableMethods?.includes("sms") && ", SMS"}
                {mfaStatus?.availableMethods?.includes("email") && ", or email"}
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={verifyMutation.isPending}
              data-testid="button-verify-mfa"
            >
              {verifyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify"
              )}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/api/logout")}
                data-testid="button-cancel-mfa"
              >
                Cancel & Logout
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
