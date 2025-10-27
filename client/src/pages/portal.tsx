import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Home,
  Video,
  Calendar,
  CreditCard,
  MessageCircle,
  Brain,
  Settings,
  BarChart,
  Shield,
  Mail,
  User,
  UserPlus,
  PoundSterling,
  Users,
  TrendingUp,
  FileText,
  Building,
  PieChart,
  BarChart3,
  ArrowRight,
  CheckCircle,
  Zap,
  Bot,
  Globe,
  UserCheck,
  Bell,
  Activity,
  MessageSquare,
  Camera,
  Upload,
} from "lucide-react";
import { Link } from "wouter";
import ServiceRouter from "@/components/services/service-router";
import { serviceRegistry } from "@/lib/serviceRegistry";
import hiveWellnessLogo from "@assets/Hive Wellness logo 1 (1)_1761429577346.png";
// Using local public path for background image
const backgroundImage = "/header-bg.png";

export default function Portal() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  // Forgot Password state
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isRequestingReset, setIsRequestingReset] = useState(false);

  // Use global auth data directly
  const authUser = user;
  const authIsLoading = isLoading;
  const authIsAuthenticated = isAuthenticated;

  // Get role-specific services from comprehensive service registry using authenticated user
  const userServices =
    authIsAuthenticated && authUser
      ? serviceRegistry[(authUser as any)?.role as keyof typeof serviceRegistry] || []
      : [];

  // Handle URL routing for direct service access (both hash and query params)
  useEffect(() => {
    const handleServiceRouting = () => {
      // Check query parameters first (?service=scheduling)
      const urlParams = new URLSearchParams(window.location.search);
      const serviceParam = urlParams.get("service");

      // Check hash routing as fallback (#scheduling)
      const hash = window.location.hash.slice(1);

      // Use query param if available, otherwise use hash
      const serviceId = serviceParam || hash;

      if (
        serviceId &&
        authIsAuthenticated &&
        userServices.some((service) => service.id === serviceId)
      ) {
        console.log("Portal: Auto-selecting service from URL:", {
          serviceParam,
          hash,
          selected: serviceId,
        });
        setSelectedService(serviceId);

        // Clean up URL - remove hash but keep query params for consistency
        if (hash && !serviceParam) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      }
    };

    // Check routing on component mount
    handleServiceRouting();

    // Listen for hash changes (for backward compatibility)
    window.addEventListener("hashchange", handleServiceRouting);

    return () => {
      window.removeEventListener("hashchange", handleServiceRouting);
    };
  }, [authIsAuthenticated, userServices]);
  const servicesLoading = false; // No loading needed since we're using local registry

  // Fetch completion status for clients
  const { data: completionStatus } = useQuery({
    queryKey: ["/api/client/completion-status"],
    enabled: authIsAuthenticated && (authUser as any)?.role === "client",
    retry: false,
  });

  // Helper function to get the appropriate icon for each service
  const getServiceIcon = (iconName: string) => {
    switch (iconName) {
      case "Home":
        return <Home className="w-7 h-7" />;
      case "Video":
        return <Video className="w-7 h-7" />;
      case "Calendar":
        return <Calendar className="w-7 h-7" />;
      case "CreditCard":
        return <CreditCard className="w-7 h-7" />;
      case "MessageCircle":
        return <MessageCircle className="w-7 h-7" />;
      case "Brain":
        return <Brain className="w-7 h-7" />;
      case "Settings":
        return <Settings className="w-7 h-7" />;
      case "BarChart":
        return <BarChart className="w-7 h-7" />;
      case "Shield":
        return <Shield className="w-7 h-7" />;
      case "Mail":
        return <Mail className="w-7 h-7" />;
      case "User":
        return <User className="w-7 h-7" />;
      case "UserPlus":
        return <UserPlus className="w-7 h-7" />;
      case "PoundSterling":
        return <PoundSterling className="w-7 h-7" />;
      case "Users":
        return <Users className="w-7 h-7" />;
      case "TrendingUp":
        return <TrendingUp className="w-7 h-7" />;
      case "FileText":
        return <FileText className="w-7 h-7" />;
      case "Building":
        return <Building className="w-7 h-7" />;
      case "PieChart":
        return <PieChart className="w-7 h-7" />;
      case "BarChart3":
        return <BarChart3 className="w-7 h-7" />;
      case "Zap":
        return <Zap className="w-7 h-7" />;
      case "Bot":
        return <Bot className="w-7 h-7" />;
      case "Globe":
        return <Globe className="w-7 h-7" />;
      case "UserCheck":
        return <UserCheck className="w-7 h-7" />;
      case "Bell":
        return <Bell className="w-7 h-7" />;
      case "Activity":
        return <Activity className="w-7 h-7" />;
      case "MessageSquare":
        return <MessageSquare className="w-7 h-7" />;
      case "Files":
        return <FileText className="w-7 h-7" />;
      case "CalendarDays":
        return <Calendar className="w-7 h-7" />;
      case "ClipboardList":
        return <FileText className="w-7 h-7" />;
      default:
        return <Home className="w-7 h-7" />;
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    try {
      // Redirect to Replit Auth
      window.location.href = "/api/login";
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
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
            "If an account exists with this email, you'll receive password reset instructions.",
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

  console.log("Portal: Authentication check:", {
    authUser,
    authIsAuthenticated,
    authIsLoading,
    globalUser: user,
  });

  if (authIsLoading) {
    console.log("Portal: Loading state");
    return (
      <div className="min-h-screen bg-gradient-to-br from-hive-light-blue to-hive-white flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <img src={hiveWellnessLogo} alt="Hive Wellness Logo" className="h-24 w-auto" />
          </div>
          <div className="text-hive-black text-sm mt-2">Loading your therapy portal...</div>
          <div className="animate-spin w-6 h-6 border-2 border-hive-purple border-t-transparent rounded-full mx-auto mt-4"></div>
        </div>
      </div>
    );
  }

  console.log("Portal: Auth state:", { authIsAuthenticated, authUser, authIsLoading });

  if (authIsAuthenticated && authUser) {
    const userData = authUser as any;
    console.log("Portal: Authenticated user data:", userData);
    console.log("Portal: User services:", userServices);
    console.log("Portal: Services loading state:", servicesLoading);
    console.log("Portal: Selected service:", selectedService);
    console.log(
      "Portal: About to render main dashboard, userServices length:",
      userServices?.length
    );

    // Helper function to get portal title based on user role
    const getPortalTitle = () => {
      switch (userData.role) {
        case "client":
          return "Client Portal";
        case "therapist":
          return "Therapist Portal";
        case "admin":
          return "Admin Portal";
        case "institutional":
          return "Institution Portal";
        default:
          return "Portal";
      }
    };

    // Helper function to get portal subtitle based on user role
    const getPortalSubtitle = () => {
      switch (userData.role) {
        case "client":
          return "Your personal wellness journey";
        case "therapist":
          return "Manage your therapy practice and connect with clients";
        case "admin":
          return "Platform administration and management";
        case "institutional":
          return "Institutional dashboard and analytics";
        default:
          return `Welcome back, ${userData.firstName}`;
      }
    };

    // If a service is selected, show the service interface
    if (selectedService) {
      return (
        <ServiceRouter
          user={userData}
          selectedService={selectedService}
          onBack={() => {
            try {
              setSelectedService(null);
            } catch (error) {
              console.error("Portal navigation error:", error);
              // Force page refresh as fallback
              window.location.reload();
            }
          }}
          onNavigateToService={(serviceId) => setSelectedService(serviceId)}
        />
      );
    }

    console.log("Portal: Rendering main dashboard UI now");
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Modern Header */}
        <header className="bg-white border-b border-slate-200 shadow-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-century text-2xl font-bold text-hive-purple">
                  {getPortalTitle()}
                </h1>
                <p className="font-secondary text-sm text-hive-purple/70">{getPortalSubtitle()}</p>
              </div>

              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/90 hover:bg-white text-hive-purple hover:text-hive-purple border-hive-purple/20 font-secondary"
                  onClick={() => window.open("https://hive-wellness.co.uk", "_blank")}
                  data-testid="button-return-website"
                >
                  Return to Website
                </Button>
                <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  <CheckCircle className="h-4 w-4" />
                  <span>Online</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const response = await fetch("/api/auth/logout", { method: "POST" });
                      const data = await response.json();

                      // CRITICAL: Clear the authentication cache to prevent login state persistence
                      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
                      queryClient.clear(); // Clear all cached data for clean logout

                      // Use the redirect path from backend based on user role
                      if (data.success && data.redirect) {
                        window.location.href = data.redirect;
                      } else {
                        // Fallback based on current user role
                        const userRole = (authUser as any)?.role;
                        if (userRole === "therapist") {
                          window.location.href = "/therapist-login";
                        } else if (userRole === "admin") {
                          window.location.href = "/login";
                        } else if (userRole === "institutional") {
                          window.location.href = "/login";
                        } else {
                          window.location.href = "/login"; // Default to main login
                        }
                      }
                    } catch (error) {
                      console.error("Logout error:", error);
                      // CRITICAL: Clear cache even on error to ensure clean logout
                      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
                      queryClient.clear();

                      // Fallback on error - redirect based on current user role
                      const userRole = (authUser as any)?.role;
                      if (userRole === "therapist") {
                        window.location.href = "/therapist-login";
                      } else if (userRole === "admin") {
                        window.location.href = "/login";
                      } else if (userRole === "institutional") {
                        window.location.href = "/login";
                      } else {
                        window.location.href = "/login"; // Default to main login
                      }
                    }
                  }}
                  className="border-slate-300 hover:border-hive-purple"
                  data-testid="button-sign-out"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Dashboard Overview */}
            <div className="mb-8">
              <h2 className="font-primary text-3xl font-bold text-slate-900 mb-2">
                Dashboard Overview
              </h2>
              <p className="font-secondary text-slate-600">{getPortalSubtitle()}</p>
            </div>

            <div className="grid lg:grid-cols-4 gap-6">
              {/* Main Services Grid */}
              <div className="lg:col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {servicesLoading
                    ? // Loading state
                      Array(6)
                        .fill(0)
                        .map((_, index) => (
                          <div
                            key={index}
                            className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse"
                          >
                            <div className="flex items-center space-x-3 mb-4">
                              <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
                              <div>
                                <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                                <div className="h-3 bg-slate-200 rounded w-16"></div>
                              </div>
                            </div>
                            <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                            <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                          </div>
                        ))
                    : // All existing services preserved with modern styling
                      userServices.map((service) => {
                        return (
                          <Card
                            key={service.id}
                            className="group cursor-pointer hover:shadow-md transition-all duration-200 border-slate-200 hover:border-hive-purple/30 bg-white"
                            onClick={() => setSelectedService(service.id)}
                          >
                            <CardContent className="p-6">
                              <div className="flex items-center space-x-3 mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-hive-purple to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                                  <div className="text-white scale-75">
                                    {getServiceIcon(service.icon)}
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-primary font-semibold text-slate-900 truncate text-sm">
                                    {service.name}
                                  </h3>
                                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-hive-purple transition-colors mt-1" />
                                </div>
                              </div>
                              <p className="font-secondary text-slate-600 text-sm leading-relaxed line-clamp-2">
                                {service.description}
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })}
                </div>
              </div>

              {/* Modern Sidebar */}
              <div className="space-y-6">
                {/* Account Info */}
                <Card className="border-slate-200 bg-gradient-to-br from-white to-slate-50/50">
                  <CardContent className="p-6">
                    <h3 className="font-primary font-semibold text-slate-900 mb-6 flex items-center">
                      <div className="w-8 h-8 bg-[#9306B1]/10 rounded-lg flex items-center justify-center mr-3">
                        <User className="w-4 h-4 text-[#9306B1]" />
                      </div>
                      Account Information
                    </h3>
                    <div className="space-y-6">
                      {userData?.role === "therapist" && (
                        <div className="mb-6">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-4">
                            Profile Photo
                          </p>
                          <div className="flex flex-col items-center space-y-4">
                            {/* Profile Photo Display */}
                            <div className="relative group">
                              <div className="w-24 h-24 bg-gradient-to-br from-[#9306B1]/10 to-[#9306B1]/20 rounded-full flex items-center justify-center border-4 border-white shadow-lg ring-2 ring-[#9306B1]/30">
                                {userData?.profileImageUrl ? (
                                  <img
                                    src={userData.profileImageUrl}
                                    alt="Profile"
                                    className="w-full h-full rounded-full object-cover"
                                    onError={(e) => {
                                      console.log(
                                        "Image failed to load:",
                                        userData.profileImageUrl
                                      );
                                      // Fallback to user icon if image fails to load
                                      e.currentTarget.style.display = "none";
                                      e.currentTarget.parentNode
                                        ?.querySelector(".user-fallback")
                                        ?.classList.remove("hidden");
                                    }}
                                  />
                                ) : null}
                                <User
                                  className={`w-10 h-10 text-[#9306B1] user-fallback ${userData?.profileImageUrl ? "hidden" : ""}`}
                                />
                              </div>
                              {/* Upload Overlay */}
                              <div className="absolute inset-0 rounded-full bg-[#9306B1]/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                <Camera className="w-6 h-6 text-white" />
                              </div>
                            </div>

                            {/* Upload Button */}
                            <div className="w-full max-w-xs">
                              <label className="block">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      try {
                                        const formData = new FormData();
                                        formData.append("profilePhoto", file);
                                        const response = await apiRequest(
                                          "POST",
                                          "/api/upload-profile-photo",
                                          formData
                                        );

                                        if (!response.ok) {
                                          throw new Error("Upload failed");
                                        }

                                        const result = await response.json();
                                        console.log("Upload result:", result);

                                        toast({
                                          title: "Profile Photo Updated",
                                          description:
                                            "Your profile photo has been uploaded successfully.",
                                        });

                                        // Refresh user data to show new profile image
                                        queryClient.invalidateQueries({
                                          queryKey: ["/api/auth/user"],
                                        });

                                        // Reset the file input
                                        e.target.value = "";
                                      } catch (error) {
                                        console.error("Upload error:", error);
                                        toast({
                                          title: "Upload Failed",
                                          description:
                                            "Failed to upload profile photo. Please try again.",
                                          variant: "destructive",
                                        });
                                      }
                                    }
                                  }}
                                  className="sr-only"
                                />
                                <div className="w-full bg-[#9306B1] hover:bg-[#7a0590] text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200 cursor-pointer text-center flex items-center justify-center space-x-2">
                                  <Upload className="w-4 h-4" />
                                  <span>Choose Photo</span>
                                </div>
                              </label>
                              <p className="text-xs text-slate-500 mt-2 text-center">
                                JPG, PNG max 5MB
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-white/70 rounded-lg p-4 border border-slate-100">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                            Role
                          </p>
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-[#9306B1]/10 rounded-full flex items-center justify-center mr-3">
                              <Shield className="w-4 h-4 text-[#9306B1]" />
                            </div>
                            <p className="font-secondary text-slate-900 capitalize font-medium">
                              {userData?.role}
                            </p>
                          </div>
                        </div>

                        <div className="bg-white/70 rounded-lg p-4 border border-slate-100">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                            Name
                          </p>
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center mr-3">
                              <UserCheck className="w-4 h-4 text-blue-600" />
                            </div>
                            <p className="font-secondary text-slate-900 font-medium">
                              {userData?.firstName} {userData?.lastName}
                            </p>
                          </div>
                        </div>

                        <div className="bg-white/70 rounded-lg p-4 border border-slate-100">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                            Email
                          </p>
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center mr-3">
                              <Mail className="w-4 h-4 text-green-600" />
                            </div>
                            <p className="font-secondary text-slate-700 text-sm break-all">
                              {userData?.email}
                            </p>
                          </div>
                        </div>

                        <div className="bg-white/70 rounded-lg p-4 border border-slate-100">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                            Status
                          </p>
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center mr-3">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="flex items-center">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                              <p className="text-sm font-medium text-green-600">Active & Online</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats for Therapists */}
                {userData?.role === "therapist" && (
                  <Card className="border-slate-200 bg-gradient-to-br from-white to-slate-50/50">
                    <CardContent className="p-6">
                      <h3 className="font-primary font-semibold text-slate-900 mb-6 flex items-center">
                        <div className="w-8 h-8 bg-[#9306B1]/10 rounded-lg flex items-center justify-center mr-3">
                          <Activity className="w-4 h-4 text-[#9306B1]" />
                        </div>
                        Quick Statistics
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/70 rounded-lg p-4 border border-slate-100 text-center">
                          <div className="w-10 h-10 bg-[#9306B1]/10 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Users className="w-5 h-5 text-[#9306B1]" />
                          </div>
                          <div className="text-xl font-bold text-[#9306B1]">12</div>
                          <div className="text-xs text-slate-500 font-medium">Active Clients</div>
                        </div>
                        <div className="bg-white/70 rounded-lg p-4 border border-slate-100 text-center">
                          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Calendar className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="text-xl font-bold text-blue-600">8</div>
                          <div className="text-xs text-slate-500 font-medium">This Week</div>
                        </div>
                        <div className="bg-white/70 rounded-lg p-4 border border-slate-100 text-center">
                          <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-2">
                            <PoundSterling className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="text-xl font-bold text-green-600">£2,340</div>
                          <div className="text-xs text-slate-500 font-medium">This Month</div>
                        </div>
                        <div className="bg-white/70 rounded-lg p-4 border border-slate-100 text-center">
                          <div className="w-10 h-10 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-2">
                            <CheckCircle className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div className="text-xl font-bold text-yellow-600">4.9</div>
                          <div className="text-xs text-slate-500 font-medium">Rating</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Next Steps */}
                {(() => {
                  // For clients, check completion status from API
                  if (userData?.role === "client" && (completionStatus as any)?.allComplete) {
                    return null; // Hide the card when all steps are complete
                  }

                  return (
                    <Card className="border-slate-200">
                      <CardContent className="p-6">
                        <h3 className="font-primary font-semibold text-slate-900 mb-4 flex items-center">
                          <CheckCircle className="w-5 h-5 text-hive-purple mr-2" />
                          Next Steps
                        </h3>
                        <div className="space-y-3">
                          {userData?.role === "therapist" ? (
                            <>
                              <div className="flex items-center p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-slate-900 text-sm">
                                    Setup Payouts
                                  </p>
                                  <p className="text-xs text-slate-500">Connect Stripe account</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-400" />
                              </div>
                              <div className="flex items-center p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                                <div className="w-8 h-8 bg-hive-purple/10 rounded-lg flex items-center justify-center mr-3">
                                  <div className="w-2 h-2 bg-hive-purple rounded-full"></div>
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-slate-900 text-sm">
                                    Manage Clients
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Sessions, notes & progress
                                  </p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-400" />
                              </div>
                            </>
                          ) : userData?.role === "admin" ? (
                            <>
                              <div className="flex items-center p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-slate-900 text-sm">
                                    Review Assignments
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Client-therapist matching
                                  </p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-400" />
                              </div>
                              <div className="flex items-center p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-slate-900 text-sm">
                                    AI Connecting
                                  </p>
                                  <p className="text-xs text-slate-500">Review AI suggestions</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-400" />
                              </div>
                              <div className="flex items-center p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-slate-900 text-sm">
                                    System Health
                                  </p>
                                  <p className="text-xs text-slate-500">Monitoring & management</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-400" />
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                                <div className="w-8 h-8 bg-hive-purple/10 rounded-lg flex items-center justify-center mr-3">
                                  <div className="w-2 h-2 bg-hive-purple rounded-full"></div>
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-slate-900 text-sm">
                                    Complete Profile
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Personal details & preferences
                                  </p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-400" />
                              </div>
                              <div className="flex items-center p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-slate-900 text-sm">
                                    Book Consultation
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    20-minute complimentary session
                                  </p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-400" />
                              </div>
                              <div className="flex items-center p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-slate-900 text-sm">
                                    Meet Therapist
                                  </p>
                                  <p className="text-xs text-slate-500">Get connected perfectly</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-400" />
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log("Portal: Reached login form section - user not authenticated");
  return (
    <div className="min-h-screen relative" style={{ backgroundColor: "#9306B1" }}>
      {/* Background Image with Subtle Opacity */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          opacity: 0.75,
        }}
        aria-hidden="true"
      ></div>
      {/* Hive Purple overlay to align with brand guidelines - darker purple tint */}
      <div
        className="absolute inset-0 bg-hive-purple/40 pointer-events-none"
        aria-hidden="true"
      ></div>
      {/* Enhanced Brand Background with Hexagonal Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-hive-purple/10 via-hive-blue/8 to-hive-light-blue/12"></div>
        <div className="absolute top-0 right-0 w-96 h-96 transform rotate-12 opacity-5">
          <div
            className="w-full h-full"
            style={{
              background: "radial-gradient(circle, var(--hive-purple) 2px, transparent 2px)",
              backgroundSize: "40px 40px",
              clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            }}
          ></div>
        </div>
        <div className="absolute bottom-0 left-0 w-64 h-64 transform -rotate-12 opacity-5">
          <div
            className="w-full h-full"
            style={{
              background: "radial-gradient(circle, var(--hive-blue) 2px, transparent 2px)",
              backgroundSize: "30px 30px",
              clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            }}
          ></div>
        </div>
      </div>

      {/* Background overlay for readability */}
      <div className="absolute inset-0 bg-white/90 backdrop-blur-sm"></div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Enhanced Header - Holly's Brand Guidelines Style */}
        <div className="text-center mb-12 relative">
          <div className="flex items-center justify-between mb-8">
            <div></div> {/* Spacer */}
            <img
              src={hiveWellnessLogo}
              alt="Hive Wellness Logo"
              className="h-32 w-auto drop-shadow-lg"
              style={{ filter: "drop-shadow(0 6px 12px rgba(147, 6, 177, 0.25))" }}
            />
            <a
              href="https://hive-wellness.co.uk"
              className="text-hive-purple hover:text-hive-black text-sm font-semibold underline transition-colors"
            >
              Return to Hive Wellness Website
            </a>
          </div>
          <h1 className="text-5xl font-primary text-hive-black mb-3 font-bold tracking-tight">
            Therapy Portal
          </h1>
          <p className="text-xl font-secondary text-hive-black/80 max-w-3xl mx-auto leading-relaxed">
            Access your personalised therapy dashboard
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10">
            {/* Login Section */}
            <Card className="hive-card-shadow hive-card-hover bg-white/80 backdrop-blur-sm border-0">
              <CardContent className="p-10">
                <h2 className="text-3xl font-primary hive-gradient-text mb-6 text-center">
                  Access Your Portal
                </h2>

                {/* New User Guidance */}
                <div className="mb-8 p-6 bg-gradient-to-r from-hive-light-blue/50 to-hive-background/50 rounded-xl border border-hive-blue/20 hexagon-accent">
                  <h3 className="font-primary font-semibold text-hive-black mb-3 text-lg">
                    👋 New to Hive Wellness?
                  </h3>
                  <p className="text-sm font-secondary text-hive-black/70 mb-4">
                    Create your account in seconds using our secure sign-up process. You'll be
                    guided through each step.
                  </p>
                  <div className="text-xs text-small text-hive-black/60">
                    ✓ Secure account creation • ✓ Guided intake process • ✓ Expert therapist
                    matching
                  </div>
                </div>

                {/* New Therapist Joining Section */}
                <div className="mt-6 p-4 bg-gradient-to-r from-hive-light-blue/30 to-hive-background/30 rounded-xl border border-hive-blue/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-primary font-semibold text-hive-black text-sm mb-1">
                        New to Hive Wellness?
                      </h4>
                      <p className="text-xs font-secondary text-hive-black/70">
                        Join our platform and help clients find their perfect match
                      </p>
                    </div>
                    <Link to="/therapist-onboarding">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-hive-purple text-hive-purple hover:bg-hive-purple hover:text-white text-xs font-medium transition-all duration-200"
                      >
                        Join as Therapist
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <Label htmlFor="email" className="text-sm font-semibold text-hive-black">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="mt-2 border-hive-purple/20 focus:border-hive-purple focus:ring-hive-purple/20"
                      placeholder="Enter your email"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-sm font-semibold text-hive-black">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="mt-2 border-hive-purple/20 focus:border-hive-purple focus:ring-hive-purple/20"
                      placeholder="Enter your password"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-hive-purple hover:bg-hive-purple/90 text-white font-medium py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? "Logging in..." : "Access Portal"}
                  </Button>
                </form>

                {/* Forgot Password Link */}
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(true)}
                    className="text-sm text-hive-purple hover:text-hive-purple/80 underline font-medium"
                  >
                    Forgot your password?
                  </button>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{" "}
                    <Link to="/intake" className="text-hive-purple hover:underline font-semibold">
                      Start here
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Information Section */}
            <div className="space-y-8">
              <Card className="hive-card-shadow hive-card-hover bg-white/80 backdrop-blur-sm border-0 hexagon-accent">
                <CardContent className="p-8">
                  <h3 className="text-2xl heading-secondary hive-gradient-text mb-6">
                    New to Hive Wellness?
                  </h3>
                  <p className="text-body text-hive-black/70 mb-6">
                    Start your therapy journey with our comprehensive intake questionnaire. We'll
                    match you with the perfect therapist for your unique needs.
                  </p>
                  <Link to="/intake">
                    <Button className="w-full bg-gradient-to-r from-hive-purple to-purple-600 hover:from-hive-purple/90 hover:to-purple-600/90 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-[1.02] flex items-center justify-center group">
                      <UserPlus className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-200" />
                      Complete Intake Form
                      <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform duration-200" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="hive-card-shadow hive-card-hover bg-white/80 backdrop-blur-sm border-0 hexagon-accent">
                <CardContent className="p-8">
                  <h3 className="text-2xl heading-secondary hive-gradient-text mb-6">
                    What to Expect
                  </h3>
                  <div className="space-y-5">
                    <div className="flex items-start">
                      <div className="w-3 h-3 bg-hive-purple rounded-full mt-2 mr-4 flex-shrink-0"></div>
                      <div>
                        <p className="font-semibold text-hive-black">Personalised Connecting</p>
                        <p className="text-small text-hive-black/70 mt-1">
                          Human-led therapist connecting based on your needs
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-3 h-3 bg-hive-purple rounded-full mt-2 mr-4 flex-shrink-0"></div>
                      <div>
                        <p className="font-semibold text-hive-black">Free Consultation</p>
                        <p className="text-small text-hive-black/70 mt-1">
                          20-minute consultation to ensure the right fit
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-3 h-3 bg-hive-purple rounded-full mt-2 mr-4 flex-shrink-0"></div>
                      <div>
                        <p className="font-semibold text-hive-black">Secure Sessions</p>
                        <p className="text-small text-hive-black/70 mt-1">
                          GDPR & UK Data Protection compliant video sessions and messaging
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-3 h-3 bg-hive-purple rounded-full mt-2 mr-4 flex-shrink-0"></div>
                      <div>
                        <p className="font-semibold text-hive-black">Integrated Tools</p>
                        <p className="text-small text-hive-black/70 mt-1">
                          Scheduling, payments, and progress tracking
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer for authenticated users */}
        {isAuthenticated && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="text-center">
              <a
                href="https://hive-wellness.co.uk"
                className="text-hive-purple hover:text-hive-dark text-sm font-semibold underline transition-colors"
              >
                Return to Hive Wellness Website
              </a>
            </div>
          </div>
        )}

        {/* Forgot Password Modal */}
        <Dialog open={showForgotPasswordModal} onOpenChange={setShowForgotPasswordModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-hive-purple">Forgot Password</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <div className="space-y-2">
                <Label
                  htmlFor="forgotPasswordEmail"
                  className="font-secondary font-semibold text-hive-black"
                >
                  Email Address
                </Label>
                <Input
                  id="forgotPasswordEmail"
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  disabled={isRequestingReset}
                  className="border-hive-purple/20 focus:border-hive-purple focus:ring-hive-purple/20"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForgotPasswordModal(false);
                    setForgotPasswordEmail("");
                  }}
                  disabled={isRequestingReset}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleForgotPassword}
                  disabled={isRequestingReset || !forgotPasswordEmail}
                  className="bg-hive-purple hover:bg-hive-purple/90"
                >
                  {isRequestingReset ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Sending...</span>
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
