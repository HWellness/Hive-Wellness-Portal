import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building,
  Users,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  FileText,
  CreditCard,
  UserCheck,
  MessageSquare,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function InstitutionDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const response = await apiRequest("POST", "/api/auth/logout");
      const data = await response.json();

      // Clear all authentication data
      queryClient.clear();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });

      // Use the redirect path from backend based on user role
      if (data.success && data.redirect) {
        window.location.href = data.redirect;
      } else {
        // Fallback for institution role
        window.location.href = "/institution-login";
      }
    } catch (error) {
      // Force logout even if API fails
      queryClient.clear();
      window.location.href = "/institution-login";
    }
  };

  if (!user || (user as any).role !== "institution") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-primary text-hive-purple mb-4">Access Denied</h1>
          <p className="text-hive-black/70">You need institution access to view this page.</p>
          <Link to="/portal">
            <Button className="mt-4">Return to Portal</Button>
          </Link>
        </div>
      </div>
    );
  }

  const institutionTools = [
    {
      title: "Staff Management",
      description: "Manage staff accounts and therapy access",
      icon: Users,
      action: () => (window.location.href = "/admin-dashboard"),
      color: "bg-hive-purple",
    },
    {
      title: "Appointment Overview",
      description: "View all institutional therapy appointments",
      icon: Calendar,
      action: () => (window.location.href = "/admin-dashboard"),
      color: "bg-hive-blue",
    },
    {
      title: "Usage Analytics",
      description: "Track therapy utilisation and outcomes",
      icon: BarChart3,
      action: () => (window.location.href = "/#/admin-dashboard"),
      color: "bg-hive-light-blue",
    },
    {
      title: "Billing & Invoicing",
      description: "Manage institutional billing and payments",
      icon: CreditCard,
      action: () =>
        toast({ title: "Coming Soon", description: "Billing management will be available soon" }),
      color: "bg-green-600",
    },
    {
      title: "Therapist Network",
      description: "Access and assign institutional therapists",
      icon: UserCheck,
      action: () =>
        toast({ title: "Coming Soon", description: "Therapist network will be available soon" }),
      color: "bg-orange-600",
    },
    {
      title: "Reports & Compliance",
      description: "Generate compliance and progress reports",
      icon: FileText,
      action: () =>
        toast({ title: "Coming Soon", description: "Reporting tools will be available soon" }),
      color: "bg-purple-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-hive-purple/10 via-hive-blue/8 to-hive-light-blue/12">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-primary text-hive-purple mb-2">Institution Dashboard</h1>
            <p className="text-hive-black/70 font-secondary">
              Welcome, {(user as any).firstName || "Institution"} - Organisational Therapy
              Management
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Institution Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-secondary text-hive-black/70">Active Staff</p>
                  <p className="text-2xl font-primary text-hive-purple">0</p>
                </div>
                <Users className="w-8 h-8 text-hive-purple/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-secondary text-hive-black/70">Monthly Sessions</p>
                  <p className="text-2xl font-primary text-hive-blue">0</p>
                </div>
                <Calendar className="w-8 h-8 text-hive-blue/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-secondary text-hive-black/70">Utilisation Rate</p>
                  <p className="text-2xl font-primary text-hive-light-blue">0%</p>
                </div>
                <BarChart3 className="w-8 h-8 text-hive-light-blue/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-secondary text-hive-black/70">This Month's Cost</p>
                  <p className="text-2xl font-primary text-green-600">£0</p>
                </div>
                <CreditCard className="w-8 h-8 text-green-600/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Institution Tools */}
          <div className="lg:col-span-2">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="font-primary text-hive-purple">
                  Institution Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {institutionTools.map((tool, index) => (
                    <Card
                      key={index}
                      className="bg-gradient-to-br from-white to-gray-50 border-0 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
                      onClick={tool.action}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${tool.color} text-white`}>
                            <tool.icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-primary text-hive-black font-semibold mb-1">
                              {tool.title}
                            </h3>
                            <p className="text-sm font-secondary text-hive-black/70">
                              {tool.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Institution Info & Quick Start */}
          <div className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="font-primary text-hive-purple">
                  Organisation Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-hive-purple/10 rounded-full flex items-center justify-center">
                    <Building className="w-8 h-8 text-hive-purple" />
                  </div>
                  <div>
                    <h3 className="font-primary text-hive-black font-semibold">Demo Institution</h3>
                    <p className="text-sm font-secondary text-hive-black/70">
                      {(user as any).email}
                    </p>
                    <p className="text-xs font-secondary text-hive-purple">Institution Account</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  <Building className="w-4 h-4 mr-2" />
                  Edit Organisation
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="font-primary text-hive-purple">Quick Start Guide</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-secondary text-hive-black">Account Setup</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span className="text-sm font-secondary text-hive-black/70">
                      Add Staff Members
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span className="text-sm font-secondary text-hive-black/70">
                      Configure Billing
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span className="text-sm font-secondary text-hive-black/70">
                      First Appointments
                    </span>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-hive-purple hover:bg-hive-purple/90">
                  Get Started
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="font-primary text-hive-purple">Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-secondary text-hive-black/70 mb-4">
                  Need help setting up your institutional account? Our team is here to assist.
                </p>
                <Button variant="outline" className="w-full">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
