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
import { Eye, EyeOff, LogIn, Mail, Lock, AlertTriangle, Shield } from "lucide-react";
import { useLocation, Link } from "wouter";
import hiveWellnessLogo from "@assets/Hive Wellness logo 1 (1)_1761429577346.png";

export default function AdminLogin() {
  const { user, isAuthenticated } = useAuth();
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

  // Redirect if already authenticated as admin
  useEffect(() => {
    if (isAuthenticated && (user as any)?.role === "admin") {
      setLocation("/admin-dashboard");
    }
  }, [isAuthenticated, user, setLocation]);

  // Fast redirect without loading spinner for better performance
  if (isAuthenticated && (user as any)?.role === "admin") {
    return null;
  }

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

      // Check if user is admin
      if (result.user.role !== "admin") {
        toast({
          title: "Access Denied",
          description: "This page is for administrators only.",
          variant: "destructive",
        });
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
        title: "Admin Login Successful",
        description: "Welcome to the admin dashboard.",
      });

      // Immediate redirect
      setLocation("/admin-dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New passwords do not match.",
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
        userId: passwordChangeData.user.id,
        tempPassword: password,
        newPassword: newPassword,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to change password");
      }

      // Update auth cache with the user data
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.setQueryData(["/api/auth/user"], result.user);

      toast({
        title: "Password Changed Successfully",
        description: "Your password has been updated. Redirecting to dashboard.",
      });

      setShowPasswordChangeModal(false);
      setLocation("/admin-dashboard");
    } catch (error: any) {
      console.error("Password change error:", error);
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      toast({
        title: "Email Required",
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

      if (response.ok) {
        toast({
          title: "Reset Email Sent",
          description:
            "If an admin account exists with this email, you'll receive password reset instructions.",
        });
        setShowForgotPasswordModal(false);
        setForgotPasswordEmail("");
      } else {
        throw new Error("Failed to send reset email");
      }
    } catch (error) {
      console.error("Password reset error:", error);
      toast({
        title: "Error",
        description: "Failed to send reset email. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsRequestingReset(false);
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
            Admin Portal
          </h1>
          <p className="text-hive-black/70 font-secondary text-lg">
            Platform Administration Access
          </p>
        </div>

        {/* Login Form */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-century text-center text-hive-black flex items-center justify-center gap-2">
              <Shield className="w-6 h-6 text-hive-purple" />
              Admin Sign In
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-hive-black font-secondary font-medium flex items-center gap-2"
                >
                  <Mail className="w-4 h-4 text-hive-purple" />
                  Admin Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@hive-wellness.co.uk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-hive-purple/20 focus:border-hive-purple font-secondary"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-hive-black font-secondary font-medium flex items-center gap-2"
                >
                  <Lock className="w-4 h-4 text-hive-purple" />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 border-hive-purple/20 focus:border-hive-purple font-secondary pr-12"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-12 px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-hive-black/50" />
                    ) : (
                      <Eye className="h-4 w-4 text-hive-black/50" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-hive-purple hover:bg-hive-purple/90 text-white font-secondary font-medium text-base"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing In...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Sign In to Admin Portal
                  </div>
                )}
              </Button>
            </form>

            <div className="text-center">
              <Button
                variant="link"
                onClick={() => setShowForgotPasswordModal(true)}
                className="text-hive-purple hover:text-hive-purple/80 font-secondary text-sm"
              >
                Forgot your password?
              </Button>
            </div>

            {/* Access Level Notice */}
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Administrator Access Only</p>
                  <p className="text-xs text-amber-700 mt-1">
                    This portal is restricted to authorised Hive Wellness administrators.
                    Unauthorised access attempts are logged and monitored.
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex justify-center gap-4 mt-6 pt-6 border-t border-hive-purple/10">
              <Link to="/therapist-login">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-hive-purple border-hive-purple/30 hover:border-hive-purple"
                >
                  Therapist Login
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-hive-purple border-hive-purple/30 hover:border-hive-purple"
                >
                  Client Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Password Change Modal */}
        <Dialog open={showPasswordChangeModal} onOpenChange={setShowPasswordChangeModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-primary text-hive-purple">
                Password Change Required
              </DialogTitle>
              <DialogDescription className="font-secondary">
                Your temporary password must be changed before accessing the admin dashboard.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="font-secondary">
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password (min 8 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="font-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="font-secondary">
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="font-secondary"
                />
              </div>
              <Button
                onClick={handlePasswordChange}
                disabled={isChangingPassword}
                className="w-full bg-hive-purple hover:bg-hive-purple/90 font-secondary"
              >
                {isChangingPassword ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Changing Password...
                  </div>
                ) : (
                  "Change Password"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Forgot Password Modal */}
        <Dialog open={showForgotPasswordModal} onOpenChange={setShowForgotPasswordModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-primary text-hive-purple">
                Reset Admin Password
              </DialogTitle>
              <DialogDescription className="font-secondary">
                Enter your admin email address and we'll send you a password reset link.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="resetEmail" className="font-secondary">
                  Admin Email Address
                </Label>
                <Input
                  id="resetEmail"
                  type="email"
                  placeholder="admin@hive-wellness.co.uk"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  className="font-secondary"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowForgotPasswordModal(false)}
                  className="flex-1 font-secondary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePasswordChange}
                  disabled={isRequestingReset}
                  className="flex-1 bg-hive-purple hover:bg-hive-purple/90 font-secondary"
                >
                  {isRequestingReset ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </div>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
