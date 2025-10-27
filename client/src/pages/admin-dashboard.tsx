import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  UserPlus,
  MessageSquare,
  Activity,
  Settings,
  LogOut,
  Shield,
  BarChart3,
  Calendar,
  CreditCard,
  FileText,
  Mail,
  Clock,
  Send,
  CheckCircle,
  Cloud,
} from "lucide-react";
import AdminUserManagement from "@/components/admin/admin-user-management";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";

function AdminStatsOverview() {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    staleTime: 0,
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ["/api/admin/appointments"],
    staleTime: 0,
  });

  const stats = statsData || {};
  const appointments = appointmentsData?.appointments || [];
  const appointmentStats = appointmentsData?.stats || {};

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-secondary text-hive-black/70">Total Users</p>
              <p className="text-2xl font-primary text-hive-purple">{stats.totalUsers || 0}</p>
            </div>
            <Users className="w-8 h-8 text-hive-purple/60" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-secondary text-hive-black/70">Total Appointments</p>
              <p className="text-2xl font-primary text-hive-blue">{stats.totalAppointments || 0}</p>
            </div>
            <Calendar className="w-8 h-8 text-hive-blue/60" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-secondary text-hive-black/70">Scheduled Sessions</p>
              <p className="text-2xl font-primary text-hive-light-blue">
                {stats.scheduledAppointments || 0}
              </p>
            </div>
            <Clock className="w-8 h-8 text-hive-light-blue/60" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-secondary text-hive-black/70">Email Templates</p>
              <p className="text-2xl font-primary text-green-600">{stats.emailTemplates || 0}</p>
            </div>
            <Mail className="w-8 h-8 text-green-600/60" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmailTestingSection() {
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<any>(null);

  const emailTestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/send-business-test-emails");
      return response.json();
    },
    onSuccess: (data) => {
      setTestResults(data);
      const successCount = data.summary?.successful || 0;
      const failCount = data.summary?.failed || 0;
      toast({
        title: "Email Test Complete",
        description: `${successCount} successful, ${failCount} failed. Check results below.`,
        variant: successCount > 0 ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Email Test Failed",
        description: error.message || "Failed to run email tests",
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg mt-8">
      <CardHeader>
        <CardTitle className="font-primary text-hive-purple flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email System Testing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-hive-black">Business Email Tests</h3>
            <p className="text-sm text-hive-black/70">
              Test client welcome, therapist welcome, and session booking emails
            </p>
          </div>
          <Button
            onClick={() => emailTestMutation.mutate()}
            disabled={emailTestMutation.isPending}
            className="bg-hive-purple hover:bg-hive-purple/90"
          >
            {emailTestMutation.isPending ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Test Business Emails
              </span>
            )}
          </Button>
        </div>

        {testResults && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-hive-black mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Test Results
            </h4>
            <div className="space-y-2">
              {testResults.results?.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-white rounded border"
                >
                  <span className="text-sm font-medium">{result.type}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      result.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {result.success ? "Success" : "Failed"}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-hive-black/60 mt-3">
              All emails sent to holly.milmine@hive-wellness.co.uk with admin copies
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAdminUserManagement, setShowAdminUserManagement] = useState(false);

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
        // Fallback for admin role
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if API fails
      queryClient.clear();
      window.location.href = "/login";
    }
  };

  if (!user || (user as any).role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-primary text-hive-purple mb-4">Access Denied</h1>
          <p className="text-hive-black/70">You need admin access to view this page.</p>
          <Link to="/portal">
            <Button className="mt-4">Return to Portal</Button>
          </Link>
        </div>
      </div>
    );
  }

  const adminSections = [
    {
      title: "Therapist Management",
      description: "Review applications, manage status, and create accounts",
      icon: UserCheck,
      action: () => (window.location.href = "/admin-services/therapist-status"),
      color: "bg-hive-purple",
    },
    {
      title: "Client Questionnaires",
      description: "View and manage client intake questionnaires",
      icon: FileText,
      action: () => (window.location.href = "/admin-dashboard?tab=client-questionnaires"),
      color: "bg-hive-blue",
    },
    {
      title: "Email Templates",
      description: "Manage all automated email content and templates",
      icon: Mail,
      action: () => (window.location.href = "/admin-email-templates"),
      color: "bg-hive-purple",
    },
    {
      title: "Messaging Automation",
      description: "SMS, WhatsApp messaging and HubSpot CRM integration",
      icon: MessageSquare,
      action: () => (window.location.href = "/admin-dashboard?service=messaging-automation"),
      color: "bg-hive-blue",
    },
    {
      title: "User Management",
      description: "Manage clients, therapists, and accounts",
      icon: Users,
      action: () => (window.location.href = "/admin-dashboard?service=user-management"),
      color: "bg-hive-purple",
    },
    {
      title: "Appointment Management",
      description: "Monitor and manage all therapy appointments",
      icon: Calendar,
      action: () => (window.location.href = "/admin-dashboard?service=appointment-management"),
      color: "bg-hive-blue",
    },
    {
      title: "Platform Analytics",
      description: "View platform usage and performance metrics",
      icon: BarChart3,
      action: () =>
        toast({ title: "Coming Soon", description: "Analytics dashboard will be available soon" }),
      color: "bg-hive-light-blue",
    },
    {
      title: "System Monitoring",
      description: "Monitor system health and security",
      icon: Activity,
      action: () =>
        toast({ title: "Coming Soon", description: "System monitoring will be available soon" }),
      color: "bg-green-600",
    },
    {
      title: "Payment Management",
      description: "Oversee payment processing and disputes",
      icon: CreditCard,
      action: () =>
        toast({ title: "Coming Soon", description: "Payment management will be available soon" }),
      color: "bg-orange-600",
    },
    {
      title: "Security Center",
      description: "Manage security settings and access controls",
      icon: Shield,
      action: () =>
        toast({ title: "Coming Soon", description: "Security center will be available soon" }),
      color: "bg-red-600",
    },
    {
      title: "Admin User Management",
      description: "Create and manage administrator accounts for staff",
      icon: UserPlus,
      action: () => setShowAdminUserManagement(true),
      color: "bg-hive-purple",
    },
  ];

  // Show admin user management interface if state is true
  if (showAdminUserManagement) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-hive-purple/10 via-hive-blue/8 to-hive-light-blue/12">
        <div className="container mx-auto p-6">
          {/* Header with back button */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-primary text-hive-purple mb-2">Admin User Management</h1>
              <p className="text-hive-black/70 font-secondary">
                Manage administrator accounts for Hive staff members
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setShowAdminUserManagement(false)}
                className="bg-white/90 hover:bg-white text-hive-purple hover:text-hive-purple border-hive-purple/20 font-secondary"
                data-testid="button-back-dashboard"
              >
                ← Back to Dashboard
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          {/* Admin User Management Component */}
          <AdminUserManagement />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-hive-purple/10 via-hive-blue/8 to-hive-light-blue/12">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-primary text-hive-purple mb-2">Admin Dashboard</h1>
            <p className="text-hive-black/70 font-secondary">
              Welcome back, {(user as any).firstName || "Admin"} - Platform Administration
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              className="bg-white/90 hover:bg-white text-hive-purple hover:text-hive-purple border-hive-purple/20 font-secondary"
              onClick={() => window.open("https://hive-wellness.co.uk", "_blank")}
              data-testid="button-return-website"
            >
              Return to Website
            </Button>
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

        {/* Platform Stats */}
        <AdminStatsOverview />

        {/* Main Admin Sections */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="font-primary text-hive-purple">Administration Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminSections.map((section, index) => (
                <Card
                  key={index}
                  className="bg-gradient-to-br from-white to-gray-50 border-0 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
                  onClick={section.action}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-4 rounded-xl ${section.color} text-white`}>
                        <section.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-primary text-hive-black font-semibold mb-2">
                          {section.title}
                        </h3>
                        <p className="text-sm font-secondary text-hive-black/70">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Email Testing Section */}
        <EmailTestingSection />

        {/* Recent Activity */}
        <div className="mt-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="font-primary text-hive-purple">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="font-secondary text-hive-black font-medium">
                      Demo client account created
                    </p>
                    <p className="text-sm font-secondary text-hive-black/70">Just now</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-hive-purple/10 to-hive-purple/20 rounded-lg">
                  <div className="w-2 h-2 bg-hive-purple rounded-full"></div>
                  <div className="flex-1">
                    <p className="font-secondary text-hive-black font-medium">
                      Demo therapist account active
                    </p>
                    <p className="text-sm font-secondary text-hive-black/70">Just now</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="font-secondary text-hive-black font-medium">
                      Admin dashboard accessed
                    </p>
                    <p className="text-sm font-secondary text-hive-black/70">Just now</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
