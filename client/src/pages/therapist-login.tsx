import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Eye, EyeOff, LogIn, Mail, Lock, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import hiveWellnessLogo from "@assets/Hive Wellness logo 1 (1)_1761429577346.png";

export default function TherapistLogin() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [passwordChangeData, setPasswordChangeData] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Forgot Password state
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [resetUid, setResetUid] = useState("");
  const [newPasswordForReset, setNewPasswordForReset] = useState("");
  const [confirmPasswordForReset, setConfirmPasswordForReset] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetStep, setResetStep] = useState<"request" | "confirm">("request");

  // Check for reset token in URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("token");
    const uidFromUrl = urlParams.get("uid");

    if (tokenFromUrl && uidFromUrl) {
      // Auto-open reset password modal with token and uid
      setResetToken(tokenFromUrl);
      setResetUid(uidFromUrl);
      setShowForgotPasswordModal(true);
      setResetStep("confirm");

      // Clean up URL to remove the token for security
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Performance: Remove debug logs for faster loading

  // Redirect if already authenticated as therapist
  useEffect(() => {
    if (isAuthenticated && (user as any)?.role === "therapist") {
      setLocation("/");
    }
  }, [isAuthenticated, user, setLocation]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    try {
      const response = await apiRequest("POST", "/api/auth/login", { email, password });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Invalid email or password");
      }

      // Check if MFA is required
      if (result.requiresMfa) {
        toast({
          title: "MFA Required",
          description: "Please complete multi-factor authentication.",
        });
        setLocation("/mfa-verify");
        return;
      }

      // Check if password change is required
      if (result.forcePasswordChange) {
        setPasswordChangeData(result);
        setShowPasswordChangeModal(true);
        return;
      }

      // Force immediate cache update and invalidation
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.setQueryData(["/api/auth/user"], result.user);

      toast({
        title: "Login Successful",
        description: "Welcome to your therapist dashboard.",
      });

      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await apiRequest("POST", "/api/auth/change-password", {
        userId: passwordChangeData.id,
        newPassword: newPassword,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to change password");
      }

      // Check if MFA is required
      if (result.requiresMfa) {
        toast({
          title: "MFA Required",
          description: "Please complete multi-factor authentication.",
        });
        setLocation("/mfa-verify");
        return;
      }

      // Password changed successfully, user is now logged in
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.setQueryData(["/api/auth/user"], result.user);

      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully. Welcome!",
      });

      // Clear forms and close modal
      setNewPassword("");
      setConfirmPassword("");
      setPassword("");
      setShowPasswordChangeModal(false);
      setPasswordChangeData(null);

      // Redirect to root - router will send by role
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsRequestingReset(true);
    try {
      const response = await apiRequest("POST", "/api/auth/reset-password", {
        email: forgotPasswordEmail,
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Reset instructions sent",
          description: data.message,
        });

        // Success - user should check their email and click the reset link
        // Note: In production, users will click the link in their email which contains the real token
      } else {
        toast({
          title: "Password reset failed",
          description: data.message || "Failed to send reset instructions",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Password reset failed",
        description: "An error occurred while requesting password reset",
        variant: "destructive",
      });
    } finally {
      setIsRequestingReset(false);
    }
  };

  const handleConfirmPasswordReset = async () => {
    if (!newPasswordForReset) {
      toast({
        title: "Missing information",
        description: "Please enter your new password.",
        variant: "destructive",
      });
      return;
    }

    if (newPasswordForReset !== confirmPasswordForReset) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      });
      return;
    }

    if (newPasswordForReset.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      const response = await apiRequest("POST", "/api/auth/confirm-password-reset", {
        token: resetToken,
        uid: resetUid,
        newPassword: newPasswordForReset,
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Password reset successful",
          description: data.message || "Your password has been updated. You can now log in.",
        });

        // Close modal and reset form
        setShowForgotPasswordModal(false);
        setForgotPasswordEmail("");
        setResetToken("");
        setResetUid("");
        setNewPasswordForReset("");
        setConfirmPasswordForReset("");
        setResetStep("request");
      } else {
        toast({
          title: "Password reset failed",
          description: data.message || "Failed to reset password",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Password reset failed",
        description: "An error occurred while resetting your password",
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header with Horizontal Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center">
            <img src={hiveWellnessLogo} alt="Hive Wellness" className="h-96 w-auto mx-auto" />
          </div>
          <h1 className="text-4xl font-century font-bold text-hive-purple mb-3 tracking-tight -mt-20">
            Therapist Portal
          </h1>
          <p className="text-hive-black/70 font-secondary text-lg">
            Access your professional dashboard
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-xl border border-white/50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-century text-hive-black">
              Sign In to Your Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-secondary font-semibold text-hive-black"
                >
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-hive-gray" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="pl-10 h-12 border-hive-light-blue focus:border-hive-purple focus:ring-hive-purple"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-secondary font-semibold text-hive-black"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-hive-gray" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 pr-10 h-12 border-hive-light-blue focus:border-hive-purple focus:ring-hive-purple"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-hive-gray hover:text-hive-purple"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={isLoggingIn || isLoading}
                className="w-full h-12 bg-hive-purple hover:bg-hive-purple/90 text-white font-secondary font-semibold mt-6"
              >
                {isLoggingIn ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Signing In...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <LogIn className="h-4 w-4" />
                    <span>Access Dashboard</span>
                  </div>
                )}
              </Button>
            </form>

            {/* Forgot Password Link */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(true)}
                className="text-sm font-secondary text-hive-purple hover:text-hive-purple/80 underline"
              >
                Forgot your password?
              </button>
            </div>

            {/* No Login Credentials Info */}
            <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200/30">
              <div className="text-center">
                <p className="text-sm font-secondary text-hive-black/80 mb-3">
                  Completed your therapist questionnaire but don't have login credentials yet?
                </p>
                <p className="text-xs font-secondary text-hive-black/60">
                  Our admin team will create your account and send you login details once your
                  application is approved. Check your email for updates or contact{" "}
                  <a
                    href="mailto:support@hive-wellness.co.uk"
                    className="text-hive-purple underline"
                  >
                    support@hive-wellness.co.uk
                  </a>{" "}
                  for assistance.
                </p>
              </div>
            </div>

            {/* Footer Links */}
            <div className="mt-6 text-center space-y-2">
              <div className="flex justify-center">
                <a
                  href="https://hive-wellness.co.uk/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-hive-purple hover:text-hive-purple/80 font-secondary"
                >
                  Visit Main Website →
                </a>
              </div>
              <div className="text-xs text-hive-gray">
                Need help? Contact{" "}
                <a href="mailto:support@hive-wellness.co.uk" className="text-hive-purple">
                  support@hive-wellness.co.uk
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-hive-gray font-secondary">
            Secure access to your professional therapy dashboard
          </p>
        </div>
      </div>

      {/* Password Change Modal */}
      <Dialog
        open={showPasswordChangeModal}
        onOpenChange={(open) => !open && setShowPasswordChangeModal(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-hive-purple flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Password Change Required
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Security Notice:</strong> You must change your temporary password before
                accessing your account.
              </p>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 8 characters)"
                    required
                    disabled={isChangingPassword}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  disabled={isChangingPassword}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPasswordChangeModal(false);
                    setPasswordChangeData(null);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  disabled={isChangingPassword}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isChangingPassword || !newPassword || !confirmPassword}
                  className="bg-hive-purple hover:bg-hive-purple/90"
                >
                  {isChangingPassword ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Changing...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Forgot Password Modal */}
      <Dialog open={showForgotPasswordModal} onOpenChange={setShowForgotPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-century text-hive-black">
              {resetStep === "request" ? "Forgot Password" : "Reset Your Password"}
            </DialogTitle>
            <DialogDescription className="font-secondary text-hive-black/70">
              {resetStep === "request"
                ? "Enter your email address and we'll send you instructions to reset your password."
                : "Enter your new password."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {resetStep === "request" ? (
              <>
                <div className="space-y-2">
                  <Label
                    htmlFor="forgotPasswordEmail"
                    className="font-secondary font-semibold text-hive-black"
                  >
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-hive-gray" />
                    <Input
                      id="forgotPasswordEmail"
                      type="email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="pl-10 border-hive-light-blue focus:border-hive-purple focus:ring-hive-purple"
                      required
                      disabled={isRequestingReset}
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForgotPasswordModal(false);
                      setForgotPasswordEmail("");
                      setResetStep("request");
                    }}
                    disabled={isRequestingReset}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isRequestingReset || !forgotPasswordEmail}
                    className="bg-hive-purple hover:bg-hive-purple/90"
                  >
                    {isRequestingReset ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      "Send Reset Instructions"
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label
                    htmlFor="newPasswordForReset"
                    className="font-secondary font-semibold text-hive-black"
                  >
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-hive-gray" />
                    <Input
                      id="newPasswordForReset"
                      type={showPassword ? "text" : "password"}
                      value={newPasswordForReset}
                      onChange={(e) => setNewPasswordForReset(e.target.value)}
                      placeholder="Enter new password (min. 8 characters)"
                      minLength={8}
                      className="pl-10 pr-10 border-hive-light-blue focus:border-hive-purple focus:ring-hive-purple"
                      required
                      disabled={isResettingPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-hive-gray hover:text-hive-purple"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPasswordForReset"
                    className="font-secondary font-semibold text-hive-black"
                  >
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirmPasswordForReset"
                    type={showPassword ? "text" : "password"}
                    value={confirmPasswordForReset}
                    onChange={(e) => setConfirmPasswordForReset(e.target.value)}
                    placeholder="Confirm your new password"
                    className="border-hive-light-blue focus:border-hive-purple focus:ring-hive-purple"
                    required
                    disabled={isResettingPassword}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setResetStep("request");
                      setResetToken("");
                      setNewPasswordForReset("");
                      setConfirmPasswordForReset("");
                    }}
                    disabled={isResettingPassword}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirmPasswordReset}
                    disabled={
                      isResettingPassword || !newPasswordForReset || !confirmPasswordForReset
                    }
                    className="bg-hive-purple hover:bg-hive-purple/90"
                  >
                    {isResettingPassword ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Resetting...
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
