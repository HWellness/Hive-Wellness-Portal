import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Building,
  Users,
  UserPlus,
  Calendar,
  PoundSterling,
  TrendingUp,
  Shield,
  FileText,
  Settings,
  Download,
  Upload,
  Mail,
  Globe,
} from "lucide-react";
import type { User } from "@shared/schema";

interface InstitutionalDashboardProps {
  user: User;
}

interface InstitutionData {
  id: string;
  name: string;
  type: "university" | "healthcare" | "corporate" | "government";
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  employeeCount: number;
  activeUsers: number;
  totalSessions: number;
  monthlyBudget: number;
  contractStart: string;
  contractEnd: string;
  status: "active" | "pending" | "suspended";
}

interface UserManagement {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  usersByDepartment: Record<string, number>;
  usersByRole: Record<string, number>;
  utilisationRate: number;
}

interface SessionAnalytics {
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  averageSessionDuration: number;
  satisfactionScore: number;
  mostCommonConcerns: string[];
  peakUsageHours: string[];
  monthlyTrend: Array<{ month: string; sessions: number; users: number }>;
}

interface BillingData {
  monthlySubscription: number;
  sessionBasedCharges: number;
  totalCostThisMonth: number;
  budgetRemaining: number;
  averageCostPerUser: number;
  paymentHistory: Array<{
    date: string;
    amount: number;
    description: string;
    status: string;
  }>;
}

export default function InstitutionalDashboard({ user }: InstitutionalDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  const { data: institutionData } = useQuery<InstitutionData>({
    queryKey: ["/api/institution/data", user.id],
    retry: false,
  });

  const { data: userManagement } = useQuery<UserManagement>({
    queryKey: ["/api/institution/user-management", user.id],
    retry: false,
  });

  const { data: sessionAnalytics } = useQuery<SessionAnalytics>({
    queryKey: ["/api/institution/analytics", user.id],
    retry: false,
  });

  const { data: billingData } = useQuery<BillingData>({
    queryKey: ["/api/institution/billing", user.id],
    retry: false,
  });

  const addUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      return await apiRequest("POST", "/api/institution/add-user", userData);
    },
    onSuccess: () => {
      toast({
        title: "User Added",
        description: "New user has been successfully added to your institution.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/institution/user-management"] });
    },
    onError: () => {
      toast({
        title: "Failed to Add User",
        description: "Unable to add user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const bulkInviteMutation = useMutation({
    mutationFn: async (inviteData: any) => {
      return await apiRequest("POST", "/api/institution/bulk-invite", inviteData);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Bulk Invitations Sent",
        description: `Successfully sent ${data.sentCount} invitations to users.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/institution/user-management"] });
    },
    onError: () => {
      toast({
        title: "Bulk Invite Failed",
        description: "Unable to send bulk invitations. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  // Demo data for institutional dashboard
  const demoInstitution: InstitutionData = {
    id: "inst-1",
    name: "University of Manchester",
    type: "university",
    contactPerson: "Dr. Sarah Wilson",
    email: "sarah.wilson@manchester.ac.uk",
    phone: "+44 161 306 6000",
    address: "Oxford Road, Manchester M13 9PL, UK",
    website: "www.manchester.ac.uk",
    employeeCount: 12500,
    activeUsers: 2847,
    totalSessions: 15643,
    monthlyBudget: 25000,
    contractStart: "2024-09-01",
    contractEnd: "2025-08-31",
    status: "active",
  };

  const demoUserManagement: UserManagement = {
    totalUsers: 2847,
    activeUsers: 2234,
    newUsersThisMonth: 127,
    usersByDepartment: {
      "Student Services": 1245,
      Faculty: 892,
      "Administrative Staff": 456,
      "Research Staff": 254,
    },
    usersByRole: {
      Students: 1834,
      Faculty: 651,
      Staff: 362,
    },
    utilisationRate: 78.5,
  };

  const demoSessionAnalytics: SessionAnalytics = {
    totalSessions: 15643,
    completedSessions: 14127,
    cancelledSessions: 1516,
    averageSessionDuration: 52,
    satisfactionScore: 4.3,
    mostCommonConcerns: [
      "Academic Stress",
      "Anxiety",
      "Depression",
      "Relationship Issues",
      "Career Concerns",
    ],
    peakUsageHours: ["14:00-16:00", "18:00-20:00"],
    monthlyTrend: [
      { month: "Sep 2024", sessions: 1234, users: 456 },
      { month: "Oct 2024", sessions: 1456, users: 523 },
      { month: "Nov 2024", sessions: 1623, users: 612 },
      { month: "Dec 2024", sessions: 1345, users: 498 },
      { month: "Jan 2025", sessions: 1789, users: 678 },
      { month: "Feb 2025", sessions: 1567, users: 634 },
    ],
  };

  const demoBillingData: BillingData = {
    monthlySubscription: 18750,
    sessionBasedCharges: 6890,
    totalCostThisMonth: 25640,
    budgetRemaining: 21360,
    averageCostPerUser: 9.01,
    paymentHistory: [
      {
        date: "2025-02-01",
        amount: 25640,
        description: "Monthly subscription + session charges",
        status: "paid",
      },
      {
        date: "2025-01-01",
        amount: 23450,
        description: "Monthly subscription + session charges",
        status: "paid",
      },
      {
        date: "2024-12-01",
        amount: 21230,
        description: "Monthly subscription + session charges",
        status: "paid",
      },
    ],
  };

  const displayInstitution = institutionData || demoInstitution;
  const displayUserManagement = userManagement || demoUserManagement;
  const displayAnalytics = sessionAnalytics || demoSessionAnalytics;
  const displayBilling = billingData || demoBillingData;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "university":
        return "bg-blue-100 text-blue-800";
      case "healthcare":
        return "bg-green-100 text-green-800";
      case "corporate":
        return "bg-purple-100 text-purple-800";
      case "government":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-century font-bold text-hive-black">
            {displayInstitution.name}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={getTypeColor(displayInstitution.type)}>
              {displayInstitution.type}
            </Badge>
            <Badge className={getStatusColor(displayInstitution.status)}>
              {displayInstitution.status}
            </Badge>
            <span className="text-gray-600">
              Contract: {new Date(displayInstitution.contractStart).toLocaleDateString()} -{" "}
              {new Date(displayInstitution.contractEnd).toLocaleDateString()}
            </span>
          </div>
        </div>
        <Button className="bg-hive-purple hover:bg-hive-purple/90">
          <Settings className="w-4 h-4 mr-2" />
          Manage Settings
        </Button>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Active Users</p>
                <p className="text-2xl font-bold text-blue-900">
                  {displayUserManagement.activeUsers.toLocaleString()}
                </p>
                <p className="text-xs text-blue-600">
                  {displayUserManagement.utilisationRate}% utilisation
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Sessions This Month</p>
                <p className="text-2xl font-bold text-green-900">
                  {displayAnalytics.monthlyTrend[displayAnalytics.monthlyTrend.length - 1]
                    ?.sessions || 0}
                </p>
                <p className="text-xs text-green-600">
                  {displayAnalytics.satisfactionScore}/5 satisfaction
                </p>
              </div>
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Monthly Cost</p>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrency(displayBilling.totalCostThisMonth)}
                </p>
                <p className="text-xs text-purple-600">
                  {formatCurrency(displayBilling.averageCostPerUser)}/user
                </p>
              </div>
              <PoundSterling className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Budget Remaining</p>
                <p className="text-2xl font-bold text-orange-900">
                  {formatCurrency(displayBilling.budgetRemaining)}
                </p>
                <p className="text-xs text-orange-600">
                  {Math.round(
                    (displayBilling.budgetRemaining / displayInstitution.monthlyBudget) * 100
                  )}
                  % left
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="user-management">User Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Institution Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Institution Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Contact Person:</span>
                    <p>{displayInstitution.contactPerson}</p>
                  </div>
                  <div>
                    <span className="font-medium">Email:</span>
                    <p>{displayInstitution.email}</p>
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span>
                    <p>{displayInstitution.phone}</p>
                  </div>
                  <div>
                    <span className="font-medium">Employee Count:</span>
                    <p>{displayInstitution.employeeCount.toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <span className="font-medium">Address:</span>
                  <p className="text-sm">{displayInstitution.address}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-500" />
                  <a
                    href={`https://${displayInstitution.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {displayInstitution.website}
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add New Users
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk User Import
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export Analytics Report
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Institution Newsletter
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Shield className="w-4 h-4 mr-2" />
                  Review Security Settings
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium">127 new users joined this month</p>
                    <p className="text-sm text-gray-600">
                      Primarily from Student Services department
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">2 hours ago</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium">1,789 sessions completed this month</p>
                    <p className="text-sm text-gray-600">15% increase from last month</p>
                  </div>
                  <span className="text-xs text-gray-500">1 day ago</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <PoundSterling className="w-5 h-5 text-purple-600" />
                  <div className="flex-1">
                    <p className="font-medium">Monthly invoice processed</p>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(displayBilling.totalCostThisMonth)} charged
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">3 days ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user-management" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">User Management</h3>
            <div className="flex gap-2">
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Bulk Import
              </Button>
              <Button className="bg-hive-purple hover:bg-hive-purple/90">
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* User Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>User Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Users:</span>
                    <span className="font-medium">
                      {displayUserManagement.totalUsers.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Active Users:</span>
                    <span className="font-medium">
                      {displayUserManagement.activeUsers.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">New This Month:</span>
                    <span className="font-medium text-green-600">
                      +{displayUserManagement.newUsersThisMonth}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Utilisation Rate:</span>
                    <span className="font-medium">{displayUserManagement.utilisationRate}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users by Department */}
            <Card>
              <CardHeader>
                <CardTitle>Users by Department</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(displayUserManagement.usersByDepartment).map(
                    ([department, count]) => (
                      <div key={department} className="flex items-center justify-between">
                        <span className="text-sm">{department}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-hive-purple h-2 rounded-full"
                              style={{
                                width: `${(count / displayUserManagement.totalUsers) * 100}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-12">{count}</span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Users by Role */}
            <Card>
              <CardHeader>
                <CardTitle>Users by Role</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(displayUserManagement.usersByRole).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between">
                      <span className="text-sm">{role}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{
                              width: `${(count / displayUserManagement.totalUsers) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-12">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bulk Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Bulk User Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="bulkEmails">Bulk Email Invitations</Label>
                  <Textarea
                    id="bulkEmails"
                    placeholder="Enter email addresses, one per line..."
                    rows={6}
                  />
                  <Button
                    className="mt-2 w-full"
                    onClick={() => bulkInviteMutation.mutate({ emails: [] })}
                    disabled={bulkInviteMutation.isPending}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invitations
                  </Button>
                </div>
                <div>
                  <Label htmlFor="csvUpload">CSV User Import</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600 mb-2">
                      Drag and drop CSV file or click to browse
                    </p>
                    <p className="text-xs text-gray-500">
                      Required columns: name, email, department, role
                    </p>
                    <Button variant="outline" className="mt-2">
                      Choose File
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Session Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Session Analytics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total Sessions:</span>
                    <p className="text-lg font-semibold">
                      {displayAnalytics.totalSessions.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Completion Rate:</span>
                    <p className="text-lg font-semibold text-green-600">
                      {Math.round(
                        (displayAnalytics.completedSessions / displayAnalytics.totalSessions) * 100
                      )}
                      %
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Avg Duration:</span>
                    <p className="text-lg font-semibold">
                      {displayAnalytics.averageSessionDuration} min
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Satisfaction:</span>
                    <p className="text-lg font-semibold text-blue-600">
                      {displayAnalytics.satisfactionScore}/5
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Common Concerns */}
            <Card>
              <CardHeader>
                <CardTitle>Most Common Concerns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {displayAnalytics.mostCommonConcerns.map((concern, index) => (
                    <div key={concern} className="flex items-center justify-between">
                      <span className="text-sm">{concern}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-hive-purple h-2 rounded-full"
                            style={{ width: `${100 - index * 15}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{100 - index * 15}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Usage Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-6 gap-4">
                  {displayAnalytics.monthlyTrend.map((data) => (
                    <div key={data.month} className="text-center">
                      <div className="mb-2">
                        <div className="w-full bg-gray-200 rounded h-20 flex flex-col justify-end">
                          <div
                            className="bg-blue-500 rounded-b"
                            style={{ height: `${(data.sessions / 2000) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <p className="text-xs font-medium">{data.month.split(" ")[0]}</p>
                      <p className="text-xs text-gray-600">{data.sessions}</p>
                    </div>
                  ))}
                </div>
                <div className="text-center text-sm text-gray-600">Monthly Session Volume</div>
              </div>
            </CardContent>
          </Card>

          {/* Peak Usage Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Peak Usage Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Peak Hours</h4>
                  <div className="space-y-2">
                    {displayAnalytics.peakUsageHours.map((hour) => (
                      <div
                        key={hour}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm">{hour}</span>
                        <Badge variant="secondary">High Traffic</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Recommendations</h4>
                  <div className="space-y-2 text-sm">
                    <p>• Consider scheduling more therapists during peak hours</p>
                    <p>• Promote off-peak session times with incentives</p>
                    <p>• Set up automated reminders for booked sessions</p>
                    <p>• Monitor cancellation rates during peak times</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Month Billing */}
            <Card>
              <CardHeader>
                <CardTitle>Current Month Billing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Monthly Subscription:</span>
                    <span className="font-medium">
                      {formatCurrency(displayBilling.monthlySubscription)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Session-based Charges:</span>
                    <span className="font-medium">
                      {formatCurrency(displayBilling.sessionBasedCharges)}
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Total This Month:</span>
                      <span className="font-bold text-lg">
                        {formatCurrency(displayBilling.totalCostThisMonth)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-green-800">Budget Remaining:</span>
                      <span className="font-bold text-green-900">
                        {formatCurrency(displayBilling.budgetRemaining)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Cost per Active User:</span>
                    <span className="font-medium">
                      {formatCurrency(displayBilling.averageCostPerUser)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Budget Utilization:</span>
                    <span className="font-medium">
                      {Math.round(
                        (displayBilling.totalCostThisMonth / displayInstitution.monthlyBudget) * 100
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full"
                      style={{
                        width: `${(displayBilling.totalCostThisMonth / displayInstitution.monthlyBudget) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Budget: {formatCurrency(displayInstitution.monthlyBudget)} per month
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {displayBilling.paymentHistory.map((payment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{formatCurrency(payment.amount)}</p>
                      <p className="text-sm text-gray-600">{payment.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{new Date(payment.date).toLocaleDateString()}</p>
                      <Badge
                        className={
                          payment.status === "paid"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download Invoice
                </Button>
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  View Detailed Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Institution Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="institutionName">Institution Name</Label>
                    <Input id="institutionName" defaultValue={displayInstitution.name} />
                  </div>
                  <div>
                    <Label htmlFor="contactPerson">Primary Contact</Label>
                    <Input id="contactPerson" defaultValue={displayInstitution.contactPerson} />
                  </div>
                  <div>
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input id="contactEmail" type="email" defaultValue={displayInstitution.email} />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" defaultValue={displayInstitution.phone} />
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" defaultValue={displayInstitution.website} />
                  </div>
                  <div>
                    <Label htmlFor="monthlyBudget">Monthly Budget</Label>
                    <Input
                      id="monthlyBudget"
                      type="number"
                      defaultValue={displayInstitution.monthlyBudget}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" defaultValue={displayInstitution.address} rows={3} />
              </div>

              <div className="flex gap-2">
                <Button className="bg-hive-purple hover:bg-hive-purple/90">Save Changes</Button>
                <Button variant="outline">Cancel</Button>
              </div>
            </CardContent>
          </Card>

          {/* Security & Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Single Sign-On (SSO)</span>
                    <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Two-Factor Authentication</span>
                    <Badge className="bg-green-100 text-green-800">Required</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Data Encryption</span>
                    <Badge className="bg-green-100 text-green-800">AES-256</Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">HIPAA Compliance</span>
                    <Badge className="bg-green-100 text-green-800">Certified</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Data Retention</span>
                    <Badge className="bg-blue-100 text-blue-800">7 Years</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Audit Logging</span>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                </div>
              </div>

              <Button variant="outline" className="w-full">
                <FileText className="w-4 h-4 mr-2" />
                Download Compliance Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
