import { useState, useEffect, FormEvent } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Eye, EyeOff, Lock } from "lucide-react";
import hiveWellnessLogo from "@assets/Hive Logo_1752073128164.png";

export default function ResetPassword() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  // Extract token and uid from URL on component mount
  const [uid, setUid] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("token");
    const uidFromUrl = urlParams.get("uid");

    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      if (uidFromUrl) {
        setUid(uidFromUrl);
      }
      setTokenValid(true);
    } else {
      setTokenValid(false);
      toast({
        title: "Invalid Reset Link",
        description: "This password reset link is not valid. Please request a new one.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handlePasswordReset = async (e: FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      });
      return;
    }

    setIsResetting(true);
    try {
      const response = await apiRequest("POST", "/api/auth/confirm-password-reset", {
        token,
        newPassword,
        uid, // uid is now required for security
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Password Reset Successful",
          description: data.message || "Your password has been updated successfully.",
        });

        // Redirect to client login page after successful reset
        setTimeout(() => {
          setLocation("/login");
        }, 2000);
      } else {
        toast({
          title: "Password Reset Failed",
          description: data.message || "Failed to reset password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Password Reset Failed",
        description: "An error occurred while resetting your password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  if (tokenValid === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-12">
            <div
              className="h-28 w-auto mx-auto mb-6 bg-no-repeat bg-center bg-contain opacity-70"
              style={{
                backgroundImage: `url(${hiveWellnessLogo})`,
                filter: "brightness(1.3) saturate(0.7) hue-rotate(5deg)",
                mixBlendMode: "multiply",
                width: "280px",
                height: "112px",
              }}
              role="img"
              aria-label="Hive Wellness Logo"
            />
            <h1
              className="text-4xl font-bold text-gray-900 mb-3"
              style={{ fontFamily: "Century Old Style Std, serif" }}
            >
              Invalid Reset Link
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              This password reset link is not valid or has expired.
            </p>
          </div>

          <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <p className="text-gray-600 mb-6">
                Please request a new password reset link from the login page.
              </p>
              <Button
                onClick={() => setLocation("/login")}
                className="w-full bg-[#9306B1] hover:bg-[#7A0590] text-white"
              >
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-12">
          <div
            className="h-28 w-auto mx-auto mb-6 bg-no-repeat bg-center bg-contain opacity-70"
            style={{
              backgroundImage: `url(${hiveWellnessLogo})`,
              filter: "brightness(1.3) saturate(0.7) hue-rotate(5deg)",
              mixBlendMode: "multiply",
              width: "280px",
              height: "112px",
            }}
            role="img"
            aria-label="Hive Wellness Logo"
          />
          <h1
            className="text-4xl font-bold text-gray-900 mb-3"
            style={{ fontFamily: "Century Old Style Std, serif" }}
          >
            Reset Your Password
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed">Enter your new password below</p>
        </div>

        <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-semibold text-center text-gray-900">
              New Password
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <form onSubmit={handlePasswordReset} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#9306B1] hover:bg-[#7A0590] text-white"
                disabled={isResetting}
              >
                {isResetting ? (
                  <div className="flex items-center">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Resetting Password...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Lock className="w-4 h-4 mr-2" />
                    Reset Password
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button
                variant="link"
                onClick={() => setLocation("/login")}
                className="text-[#9306B1] hover:text-[#7A0590]"
              >
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
