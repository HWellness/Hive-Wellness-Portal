import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
// Performance optimisation: Import only the icons we actually use
import {
  Building,
  Users,
  TrendingUp,
  BarChart3,
  PoundSterling,
  UserCheck,
  AlertTriangle,
  Calendar,
  Download,
  Settings,
  Shield,
  CheckCircle,
  ChevronRight,
  Upload,
  UserPlus,
  Activity,
  PieChart,
  Target,
  Eye,
  LineChart,
  Zap,
  FileText,
  Plus,
  Mail,
  Edit,
  Clock,
} from "lucide-react";

import type { User } from "@shared/schema";

interface InstitutionalDashboardProps {
  user: User;
  initialTab?: string;
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
  departments: Array<{
    id: string;
    name: string;
    userCount: number;
    budget: number;
    utilisationRate: number;
  }>;
  complianceStatus: {
    hipaa: boolean;
    gdpr: boolean;
    ferpa: boolean;
    lastAudit: string;
  };
}

interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  usersByDepartment: Record<string, number>;
  usersByRole: Record<string, number>;
  utilisationRate: number;
  engagementMetrics: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    averageSessionsPerUser: number;
  };
  userGrowthTrend: Array<{
    month: string;
    newUsers: number;
    activeUsers: number;
    churnRate: number;
  }>;
}

interface SessionAnalytics {
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  noShowSessions: number;
  averageSessionDuration: number;
  satisfactionScore: number;
  outcomeMetrics: {
    improvedWellbeing: number;
    completedTherapyPlans: number;
    reducedSymptoms: number;
    referralsMade: number;
  };
  mostCommonConcerns: Array<{
    concern: string;
    percentage: number;
    trend: "up" | "down" | "stable";
  }>;
  peakUsageHours: string[];
  sessionTrends: Array<{
    month: string;
    sessions: number;
    completionRate: number;
    satisfaction: number;
  }>;
  therapistPerformance: Array<{
    id: string;
    name: string;
    sessionsCompleted: number;
    activeClients: number;
    specialisations: string[];
  }>;
}

interface BillingAnalytics {
  currentMonth: {
    subscriptionCost: number;
    sessionCharges: number;
    additionalServices: number;
    totalCost: number;
  };
  budgetTracking: {
    allocated: number;
    spent: number;
    remaining: number;
    projectedSpend: number;
  };
  costBreakdown: {
    perUser: number;
    perSession: number;
    perDepartment: Record<string, number>;
  };
  paymentHistory: Array<{
    date: string;
    amount: number;
    description: string;
    status: "paid" | "pending" | "overdue";
    invoiceId: string;
  }>;
  savingsOpportunities: Array<{
    area: string;
    potentialSaving: number;
    recommendation: string;
  }>;
}

interface CommunicationData {
  emailCampaigns: Array<{
    id: string;
    name: string;
    sentDate: string;
    recipients: number;
    openRate: number;
    clickRate: number;
    status: "sent" | "scheduled" | "draft";
  }>;
  announcements: Array<{
    id: string;
    title: string;
    content: string;
    targetAudience: string[];
    publishDate: string;
    priority: "low" | "medium" | "high";
  }>;
  messagingStats: {
    totalMessages: number;
    responseRate: number;
    averageResponseTime: string;
  };
}

interface BookingManagement {
  upcomingBookings: Array<{
    id: string;
    sessionType: string;
    dateTime: string;
    participantCount: number;
    department: string;
    status: "confirmed" | "pending" | "cancelled";
  }>;
  resourceUtilization: {
    therapistCapacity: number;
    roomUtilization: number;
    equipmentUsage: number;
  };
  waitingLists: Array<{
    department: string;
    count: number;
    averageWaitTime: string;
  }>;
}

export default function InstitutionalDashboard({
  user,
  initialTab = "overview",
}: InstitutionalDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [showAddUser, setShowAddUser] = useState(false);
  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);

  // Fetch institutional data
  const { data: institutionData, isLoading: institutionLoading } = useQuery<InstitutionData>({
    queryKey: [`/api/institution/data/${user.id}`],
    retry: false,
  });

  const { data: userAnalytics, isLoading: userLoading } = useQuery<UserAnalytics>({
    queryKey: [`/api/institution/user-analytics/${user.id}`],
    retry: false,
  });

  const { data: sessionAnalytics, isLoading: sessionLoading } = useQuery<SessionAnalytics>({
    queryKey: [`/api/institution/session-analytics/${user.id}`],
    retry: false,
  });

  const { data: billingAnalytics, isLoading: billingLoading } = useQuery<BillingAnalytics>({
    queryKey: [`/api/institution/billing-analytics/${user.id}`],
    retry: false,
  });

  const { data: communicationData, isLoading: commLoading } = useQuery<CommunicationData>({
    queryKey: [`/api/institution/communications/${user.id}`],
    retry: false,
  });

  const { data: bookingData, isLoading: bookingLoading } = useQuery<BookingManagement>({
    queryKey: [`/api/institution/bookings/${user.id}`],
    retry: false,
  });

  // Demo data with production-level structure
  const demoInstitution: InstitutionData = {
    id: "inst-manchester-001",
    name: "University of Manchester",
    type: "university",
    contactPerson: "Dr. Sarah Wilson",
    email: "sarah.wilson@manchester.ac.uk",
    phone: "+44 161 306 6000",
    address: "Oxford Road, Manchester M13 9PL, UK",
    website: "www.manchester.ac.uk",
    employeeCount: 0,
    activeUsers: 0,
    totalSessions: 0,
    monthlyBudget: 0,
    contractStart: "2024-09-01",
    contractEnd: "2025-08-31",
    status: "active",
    departments: [
      {
        id: "student-services",
        name: "Student Services",
        userCount: 0,
        budget: 0,
        utilisationRate: 0,
      },
      { id: "faculty", name: "Faculty & Staff", userCount: 0, budget: 0, utilisationRate: 0 },
      { id: "research", name: "Research Staff", userCount: 0, budget: 0, utilisationRate: 0 },
      { id: "admin", name: "Administrative", userCount: 0, budget: 0, utilisationRate: 0 },
      { id: "medical", name: "Medical School", userCount: 0, budget: 0, utilisationRate: 0 },
    ],
    complianceStatus: {
      hipaa: true,
      gdpr: true,
      ferpa: true,
      lastAudit: "2024-11-15",
    },
  };

  const demoUserAnalytics: UserAnalytics = {
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
    usersByDepartment: {
      "Student Services": 0,
      "Faculty & Staff": 0,
      "Research Staff": 0,
      Administrative: 0,
      "Medical School": 0,
    },
    usersByRole: {
      Students: 0,
      Faculty: 0,
      Staff: 0,
    },
    utilisationRate: 0,
    engagementMetrics: {
      dailyActiveUsers: 0,
      weeklyActiveUsers: 0,
      monthlyActiveUsers: 0,
      averageSessionsPerUser: 0,
    },
    userGrowthTrend: [
      { month: "Aug 2024", newUsers: 0, activeUsers: 0, churnRate: 0 },
      { month: "Sep 2024", newUsers: 0, activeUsers: 0, churnRate: 0 },
      { month: "Oct 2024", newUsers: 0, activeUsers: 0, churnRate: 0 },
      { month: "Nov 2024", newUsers: 0, activeUsers: 0, churnRate: 0 },
      { month: "Dec 2024", newUsers: 0, activeUsers: 0, churnRate: 0 },
      { month: "Jan 2025", newUsers: 0, activeUsers: 0, churnRate: 0 },
    ],
  };

  const demoSessionAnalytics: SessionAnalytics = {
    totalSessions: 0,
    completedSessions: 0,
    cancelledSessions: 0,
    noShowSessions: 0,
    averageSessionDuration: 0,
    satisfactionScore: 0,
    outcomeMetrics: {
      improvedWellbeing: 0,
      completedTherapyPlans: 0,
      reducedSymptoms: 0,
      referralsMade: 0,
    },
    mostCommonConcerns: [],
    peakUsageHours: [],
    sessionTrends: [
      { month: "Aug 2024", sessions: 0, completionRate: 0, satisfaction: 0 },
      { month: "Sep 2024", sessions: 0, completionRate: 0, satisfaction: 0 },
      { month: "Oct 2024", sessions: 0, completionRate: 0, satisfaction: 0 },
      { month: "Nov 2024", sessions: 0, completionRate: 0, satisfaction: 0 },
      { month: "Dec 2024", sessions: 0, completionRate: 0, satisfaction: 0 },
      { month: "Jan 2025", sessions: 0, completionRate: 0, satisfaction: 0 },
    ],
    therapistPerformance: [],
  };

  const demoBillingAnalytics: BillingAnalytics = {
    currentMonth: {
      subscriptionCost: 0,
      sessionCharges: 0,
      additionalServices: 0,
      totalCost: 0,
    },
    budgetTracking: {
      allocated: 0,
      spent: 0,
      remaining: 0,
      projectedSpend: 0,
    },
    costBreakdown: {
      perUser: 0,
      perSession: 0,
      perDepartment: {
        "Student Services": 0,
        "Faculty & Staff": 0,
        "Research Staff": 0,
        Administrative: 0,
        "Medical School": 0,
      },
    },
    paymentHistory: [],
    savingsOpportunities: [],
  };

  const demoCommunication: CommunicationData = {
    emailCampaigns: [],
    announcements: [],
    messagingStats: {
      totalMessages: 0,
      responseRate: 0,
      averageResponseTime: "0 hours",
    },
  };

  const demoBooking: BookingManagement = {
    upcomingBookings: [],
    resourceUtilization: {
      therapistCapacity: 0,
      roomUtilization: 0,
      equipmentUsage: 0,
    },
    waitingLists: [],
  };

  // Use demo data if API data not available
  const displayInstitution = institutionData || demoInstitution;
  const displayUserAnalytics = userAnalytics || demoUserAnalytics;
  const displaySessionAnalytics = sessionAnalytics || demoSessionAnalytics;
  const displayBillingAnalytics = billingAnalytics || demoBillingAnalytics;
  const displayCommunication = communicationData || demoCommunication;
  const displayBooking = bookingData || demoBooking;

  // Mutations for institutional management
  const addUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      return await apiRequest("POST", "/api/institution/add-user", userData);
    },
    onSuccess: () => {
      toast({
        title: "User Added Successfully",
        description: "New user has been added to your institution.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/institution/user-analytics/${user.id}`] });
      setShowAddUser(false);
    },
    onError: () => {
      toast({
        title: "Failed to Add User",
        description: "Unable to add user. Please check the details and try again.",
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
        description: `Successfully sent ${data.sentCount || 0} invitations.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/institution/user-analytics/${user.id}`] });
      setShowBulkInvite(false);
    },
    onError: () => {
      toast({
        title: "Bulk Invite Failed",
        description: "Unable to send bulk invitations. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (announcementData: any) => {
      return await apiRequest("POST", "/api/institution/announcements", announcementData);
    },
    onSuccess: () => {
      toast({
        title: "Announcement Created",
        description: "Your announcement has been published successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/institution/communications/${user.id}`] });
      setShowNewAnnouncement(false);
    },
    onError: () => {
      toast({
        title: "Failed to Create Announcement",
        description: "Unable to create announcement. Please try again.",
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

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3 w-3 text-red-500" />;
      case "down":
        return <TrendingUp className="h-3 w-3 text-green-500 rotate-180" />;
      case "stable":
        return <div className="h-3 w-3 rounded-full bg-gray-400" />;
      default:
        return null;
    }
  };

  if (institutionLoading || userLoading || sessionLoading || billingLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-hive-purple rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="hexagon-pattern"></div>
      {/* Header */}
      <div className="flex items-center justify-between relative">
        <div>
          <h1 className="text-3xl font-bold text-hive-black font-primary flex items-center">
            <span>{displayInstitution.name}</span>
            <div className="w-5 h-5 hexagon-accent opacity-30 ml-3"></div>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={getTypeColor(displayInstitution.type)}>
              {displayInstitution.type}
            </Badge>
            <Badge className={getStatusColor(displayInstitution.status)}>
              {displayInstitution.status}
            </Badge>
            <span className="text-gray-600 font-secondary">
              Contract: {new Date(displayInstitution.contractStart).toLocaleDateString("en-GB")} -{" "}
              {new Date(displayInstitution.contractEnd).toLocaleDateString("en-GB")}
            </span>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          <Button>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-hive-light-blue to-hive-blue/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-hive-purple">Active Users</p>
                <p className="text-2xl font-bold text-hive-black">
                  {displayUserAnalytics.activeUsers.toLocaleString()}
                </p>
                <p className="text-xs text-hive-blue">
                  {displayUserAnalytics.utilisationRate}% utilisation
                </p>
              </div>
              <Users className="w-8 h-8 text-hive-purple" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-hive-light-blue to-hive-blue/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-hive-purple">Total Sessions</p>
                <p className="text-2xl font-bold text-hive-black">
                  {displaySessionAnalytics.totalSessions.toLocaleString()}
                </p>
                <p className="text-xs text-hive-blue">
                  {Math.round(
                    (displaySessionAnalytics.completedSessions /
                      displaySessionAnalytics.totalSessions) *
                      100
                  )}
                  % completion rate
                </p>
              </div>
              <Calendar className="w-8 h-8 text-hive-purple" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-hive-light-blue to-hive-blue/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-hive-purple">Satisfaction</p>
                <p className="text-2xl font-bold text-hive-black">
                  {displaySessionAnalytics.satisfactionScore}/5
                </p>
                <p className="text-xs text-hive-blue">Client feedback rating</p>
              </div>
              <TrendingUp className="w-8 h-8 text-hive-purple" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-hive-light-blue to-hive-blue/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-hive-purple">Monthly Cost</p>
                <p className="text-2xl font-bold text-hive-black">
                  {formatCurrency(displayBillingAnalytics.currentMonth.totalCost)}
                </p>
                <p className="text-xs text-hive-blue">
                  {formatCurrency(displayBillingAnalytics.budgetTracking.remaining)} remaining
                </p>
              </div>
              <PoundSterling className="w-8 h-8 text-hive-purple" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-hive-purple data-[state=active]:text-white"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="data-[state=active]:bg-hive-purple data-[state=active]:text-white"
          >
            User Management
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="data-[state=active]:bg-hive-purple data-[state=active]:text-white"
          >
            Analytics
          </TabsTrigger>
          <TabsTrigger
            value="billing"
            className="data-[state=active]:bg-hive-purple data-[state=active]:text-white"
          >
            Billing
          </TabsTrigger>
          <TabsTrigger
            value="communications"
            className="data-[state=active]:bg-hive-purple data-[state=active]:text-white"
          >
            Communications
          </TabsTrigger>
          <TabsTrigger
            value="bookings"
            className="data-[state=active]:bg-hive-purple data-[state=active]:text-white"
          >
            Booking
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Institutional Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Institution Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Contact Person</Label>
                    <p className="text-sm">{displayInstitution.contactPerson}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Email</Label>
                    <p className="text-sm">{displayInstitution.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Phone</Label>
                    <p className="text-sm">{displayInstitution.phone}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Website</Label>
                    <p className="text-sm">{displayInstitution.website}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Address</Label>
                  <p className="text-sm">{displayInstitution.address}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Compliance Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle
                      className={`h-4 w-4 ${displayInstitution.complianceStatus.hipaa ? "text-green-500" : "text-red-500"}`}
                    />
                    <span className="text-sm">HIPAA Compliant</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle
                      className={`h-4 w-4 ${displayInstitution.complianceStatus.gdpr ? "text-green-500" : "text-red-500"}`}
                    />
                    <span className="text-sm">GDPR Compliant</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle
                      className={`h-4 w-4 ${displayInstitution.complianceStatus.ferpa ? "text-green-500" : "text-red-500"}`}
                    />
                    <span className="text-sm">FERPA Compliant</span>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Last Audit</Label>
                    <p className="text-sm">
                      {new Date(displayInstitution.complianceStatus.lastAudit).toLocaleDateString(
                        "en-GB"
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Department Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Department Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayInstitution.departments.map((dept) => (
                  <div
                    key={dept.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{dept.name}</h4>
                      <p className="text-sm text-gray-600">
                        {dept.userCount} users • {formatCurrency(dept.budget)} budget
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{dept.utilisationRate}% utilisation</p>
                        <Progress value={dept.utilisationRate} className="w-24 h-2" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          {/* User Management Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">User Management</h2>
            <div className="flex space-x-2">
              <Dialog open={showBulkInvite} onOpenChange={setShowBulkInvite}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Invite
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bulk User Invitation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {displayInstitution.departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="emails">Email Addresses (one per line)</Label>
                      <Textarea
                        id="emails"
                        placeholder="user1@university.edu&#10;user2@university.edu&#10;user3@university.edu"
                        rows={6}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowBulkInvite(false)}>
                        Cancel
                      </Button>
                      <Button onClick={() => bulkInviteMutation.mutate({})}>
                        Send Invitations
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" placeholder="John" />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" placeholder="Doe" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="john.doe@university.edu" />
                    </div>
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {displayInstitution.departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="faculty">Faculty</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowAddUser(false)}>
                        Cancel
                      </Button>
                      <Button onClick={() => addUserMutation.mutate({})}>Add User</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* User Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  User Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(displayUserAnalytics.usersByRole).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between">
                      <span className="text-sm">{role}</span>
                      <span className="font-medium">{count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Engagement Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Daily Active</span>
                    <span className="font-medium">
                      {displayUserAnalytics.engagementMetrics.dailyActiveUsers.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Weekly Active</span>
                    <span className="font-medium">
                      {displayUserAnalytics.engagementMetrics.weeklyActiveUsers.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Monthly Active</span>
                    <span className="font-medium">
                      {displayUserAnalytics.engagementMetrics.monthlyActiveUsers.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Avg Sessions/User</span>
                    <span className="font-medium">
                      {displayUserAnalytics.engagementMetrics.averageSessionsPerUser}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Growth Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">New Users (This Month)</span>
                    <span className="font-medium text-green-600">
                      +{displayUserAnalytics.newUsersThisMonth}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Churn Rate</span>
                    <span className="font-medium text-orange-600">
                      {
                        displayUserAnalytics.userGrowthTrend[
                          displayUserAnalytics.userGrowthTrend.length - 1
                        ]?.churnRate
                      }
                      %
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Utilisation Rate</span>
                    <span className="font-medium text-blue-600">
                      {displayUserAnalytics.utilisationRate}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Department User Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Users by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(displayUserAnalytics.usersByDepartment).map(([dept, count]) => {
                  const percentage = (count / displayUserAnalytics.totalUsers) * 100;
                  return (
                    <div key={dept} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{dept}</span>
                        <span className="text-sm text-gray-600">
                          {count.toLocaleString()} users ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Session Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Session Outcomes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {displaySessionAnalytics.outcomeMetrics.improvedWellbeing}%
                    </p>
                    <p className="text-sm text-green-700">Improved Wellbeing</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-hive-purple">
                      {displaySessionAnalytics.outcomeMetrics.completedTherapyPlans}%
                    </p>
                    <p className="text-sm text-hive-black">Completed Plans</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">
                      {displaySessionAnalytics.outcomeMetrics.reducedSymptoms}%
                    </p>
                    <p className="text-sm text-purple-700">Reduced Symptoms</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">
                      {displaySessionAnalytics.outcomeMetrics.referralsMade}
                    </p>
                    <p className="text-sm text-orange-700">Referrals Made</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Common Concerns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {displaySessionAnalytics.mostCommonConcerns.map((concern) => (
                    <div
                      key={concern.concern}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium">{concern.concern}</span>
                        {getTrendIcon(concern.trend)}
                      </div>
                      <span className="text-sm text-gray-600">{concern.percentage}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Therapist Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Therapist Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displaySessionAnalytics.therapistPerformance.map((therapist) => (
                  <div
                    key={therapist.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{therapist.name}</h4>
                      <p className="text-sm text-gray-600">
                        {therapist.specialisations.join(", ")}
                      </p>
                    </div>
                    <div className="flex items-center space-x-6 text-center">
                      <div>
                        <p className="text-lg font-bold">{therapist.sessionsCompleted}</p>
                        <p className="text-xs text-gray-600">Sessions</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{therapist.activeClients}</p>
                        <p className="text-xs text-gray-600">Active Clients</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Session Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LineChart className="h-5 w-5 mr-2" />
                Session Trends (6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displaySessionAnalytics.sessionTrends.map((trend, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <span className="font-medium">{trend.month}</span>
                    <div className="flex items-center space-x-6 text-sm">
                      <span>{trend.sessions.toLocaleString()} sessions</span>
                      <span>{trend.completionRate}% completion</span>
                      <span>{trend.satisfaction}/5 satisfaction</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          {/* Current Month Billing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PoundSterling className="h-5 w-5 mr-2" />
                  Current Month Billing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Subscription Cost</span>
                    <span className="font-medium">
                      {formatCurrency(displayBillingAnalytics.currentMonth.subscriptionCost)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Session Charges</span>
                    <span className="font-medium">
                      {formatCurrency(displayBillingAnalytics.currentMonth.sessionCharges)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Additional Services</span>
                    <span className="font-medium">
                      {formatCurrency(displayBillingAnalytics.currentMonth.additionalServices)}
                    </span>
                  </div>
                  <hr />
                  <div className="flex items-center justify-between font-bold">
                    <span>Total Cost</span>
                    <span>{formatCurrency(displayBillingAnalytics.currentMonth.totalCost)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Budget Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Allocated Budget</span>
                    <span className="font-medium">
                      {formatCurrency(displayBillingAnalytics.budgetTracking.allocated)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Amount Spent</span>
                    <span className="font-medium">
                      {formatCurrency(displayBillingAnalytics.budgetTracking.spent)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Remaining</span>
                    <span
                      className={`font-medium ${displayBillingAnalytics.budgetTracking.remaining < 0 ? "text-red-600" : "text-green-600"}`}
                    >
                      {formatCurrency(displayBillingAnalytics.budgetTracking.remaining)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Budget Usage</span>
                      <span className="text-sm">
                        {Math.round(
                          (displayBillingAnalytics.budgetTracking.spent /
                            displayBillingAnalytics.budgetTracking.allocated) *
                            100
                        )}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        (displayBillingAnalytics.budgetTracking.spent /
                          displayBillingAnalytics.budgetTracking.allocated) *
                        100
                      }
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cost Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Cost Breakdown by Department
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(displayBillingAnalytics.costBreakdown.perDepartment).map(
                  ([dept, cost]) => {
                    const percentage =
                      (cost / displayBillingAnalytics.currentMonth.totalCost) * 100;
                    return (
                      <div key={dept} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{dept}</span>
                          <span className="text-sm text-gray-600">
                            {formatCurrency(cost)} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  }
                )}
              </div>
            </CardContent>
          </Card>

          {/* Savings Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Savings Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayBillingAnalytics.savingsOpportunities.map((opportunity, index) => (
                  <div key={index} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-green-900">{opportunity.area}</h4>
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(opportunity.potentialSaving)}
                      </span>
                    </div>
                    <p className="text-sm text-green-800">{opportunity.recommendation}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {displayBillingAnalytics.paymentHistory.map((payment) => (
                  <div
                    key={payment.invoiceId}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{payment.description}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(payment.date).toLocaleDateString("en-GB")} • {payment.invoiceId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(payment.amount)}</p>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications" className="space-y-6">
          {/* Communications Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Communications</h2>
            <Dialog open={showNewAnnouncement} onOpenChange={setShowNewAnnouncement}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Announcement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" placeholder="Announcement title" />
                  </div>
                  <div>
                    <Label htmlFor="content">Content</Label>
                    <Textarea id="content" placeholder="Announcement content" rows={4} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="audience">Target Audience</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select audience" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          <SelectItem value="students">Students Only</SelectItem>
                          <SelectItem value="faculty">Faculty Only</SelectItem>
                          <SelectItem value="staff">Staff Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowNewAnnouncement(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => createAnnouncementMutation.mutate({})}>
                      Publish Announcement
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Email Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Email Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayCommunication.emailCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{campaign.name}</h4>
                      <p className="text-sm text-gray-600">
                        Sent to {campaign.recipients.toLocaleString()} recipients on{" "}
                        {new Date(campaign.sentDate).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                    <div className="flex items-center space-x-6 text-center">
                      <div>
                        <p className="text-lg font-bold text-blue-600">{campaign.openRate}%</p>
                        <p className="text-xs text-gray-600">Open Rate</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-green-600">{campaign.clickRate}%</p>
                        <p className="text-xs text-gray-600">Click Rate</p>
                      </div>
                      <Badge
                        className={
                          campaign.status === "sent"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Announcements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Recent Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayCommunication.announcements.map((announcement) => (
                  <div key={announcement.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{announcement.title}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge
                          className={
                            announcement.priority === "high"
                              ? "bg-red-100 text-red-800"
                              : announcement.priority === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                          }
                        >
                          {announcement.priority}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{announcement.content}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Target: {announcement.targetAudience.join(", ")}</span>
                      <span>
                        Published: {new Date(announcement.publishDate).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Messaging Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Messaging Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {displayCommunication.messagingStats.totalMessages.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Total Messages</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {displayCommunication.messagingStats.responseRate}%
                  </p>
                  <p className="text-sm text-gray-600">Response Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {displayCommunication.messagingStats.averageResponseTime}
                  </p>
                  <p className="text-sm text-gray-600">Avg Response Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-6">
          {/* Bulk Booking Management */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Bulk Booking Management</h2>
            <Button>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Video Session
            </Button>
          </div>

          {/* Resource Utilization */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Therapist Capacity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">
                    {displayBooking.resourceUtilization.therapistCapacity}%
                  </p>
                  <p className="text-sm text-gray-600">Current utilisation</p>
                  <Progress
                    value={displayBooking.resourceUtilization.therapistCapacity}
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Room Utilisation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {displayBooking.resourceUtilization.roomUtilization}%
                  </p>
                  <p className="text-sm text-gray-600">Current utilisation</p>
                  <Progress
                    value={displayBooking.resourceUtilization.roomUtilization}
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Equipment Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">
                    {displayBooking.resourceUtilization.equipmentUsage}%
                  </p>
                  <p className="text-sm text-gray-600">Current utilisation</p>
                  <Progress
                    value={displayBooking.resourceUtilization.equipmentUsage}
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Group Bookings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Upcoming Group Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayBooking.upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{booking.sessionType}</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(booking.dateTime).toLocaleDateString("en-GB")} at{" "}
                        {new Date(booking.dateTime).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {booking.department} • {booking.participantCount} participants
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Badge
                        className={
                          booking.status === "confirmed"
                            ? "bg-green-100 text-green-800"
                            : booking.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }
                      >
                        {booking.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Waiting Lists */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Department Waiting Lists
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayBooking.waitingLists.map((waitingList, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium text-orange-900">{waitingList.department}</h4>
                      <p className="text-sm text-orange-700">
                        Average wait time: {waitingList.averageWaitTime}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{waitingList.count}</p>
                      <p className="text-sm text-orange-700">waiting</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
