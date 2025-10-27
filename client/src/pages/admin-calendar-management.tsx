import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Clock,
  Users,
  AlertCircle,
  RefreshCw,
  Settings,
  CheckCircle,
  XCircle,
  Play,
  Activity,
  TrendingUp,
  Database,
  Search,
  Filter,
  Download,
  Zap,
  Shield,
  BarChart3,
  FileText,
  Gauge,
  Wifi,
  WifiOff,
  AlertTriangle,
  Eye,
  RotateCcw,
  TestTube,
  Wrench,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

// Types for the admin calendar management system
interface CalendarOverview {
  totalTherapists: number;
  totalCalendars: number;
  setupCompletionRate: number;
  calendarStatus: {
    active: number;
    pending: number;
    error: number;
  };
  healthStatus: "healthy" | "warning" | "critical";
  appointments: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  recentActivity: Array<{
    id: string;
    therapistId: string;
    therapistName: string;
    therapistEmail: string;
    integrationStatus: string;
    updatedAt: string;
  }>;
}

interface TherapistCalendar {
  id: string;
  therapistId: string;
  therapistName: string;
  therapistEmail: string;
  googleCalendarId: string;
  integrationStatus: "active" | "pending" | "error";
  lastSyncTime: string;
  upcomingAppointments: number;
  permissionsConfigured: boolean;
  channelStatus: "active" | "expired" | "inactive";
  therapistActive: boolean;
}

interface HealthMonitoring {
  timestamp: string;
  overallHealth: "healthy" | "warning" | "critical";
  metrics: {
    total: number;
    active: number;
    pending: number;
    error: number;
    expiredWebhooks: number;
    recentlyUpdated: number;
    staleCalendars: number;
  };
  alerts: Array<{
    level: "critical" | "warning" | "info";
    message: string;
    count: number;
  }>;
  uptime: {
    healthy: number;
    total: number;
    percentage: number;
  };
}

interface CalendarAnalytics {
  timeframe: string;
  dateRange: {
    start: string;
    end: string;
  };
  bookingFrequency: Array<{
    date: string;
    bookings: number;
  }>;
  calendarUtilization: Array<{
    status: string;
    count: number;
  }>;
  peakBookingTimes: Array<{
    hour: number;
    bookings: number;
  }>;
  setupSuccessRates: Array<{
    status: string;
    count: number;
  }>;
  adoption: {
    totalTherapists: number;
    therapistsWithCalendars: number;
    activeCalendars: number;
    adoptionRate: number;
    activationRate: number;
  };
}

export default function AdminCalendarManagement() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedTherapists, setSelectedTherapists] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("therapistName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(20);
  const [selectedCalendarForDetails, setSelectedCalendarForDetails] = useState<string | null>(null);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState("30d");
  const [isHealthMonitoringLive, setIsHealthMonitoringLive] = useState(true);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // Dashboard overview data
  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
  } = useQuery<{ success: boolean; overview: CalendarOverview }>({
    queryKey: ["/api/admin/calendar/overview"],
    refetchInterval: 30000, // Refresh every 30 seconds for real-time data
    staleTime: 10000,
  });

  // Therapist calendars with filtering and pagination
  const { data: calendarsData, isLoading: calendarsLoading } = useQuery<{
    success: boolean;
    calendars: TherapistCalendar[];
    pagination: any;
  }>({
    queryKey: [
      "/api/admin/calendar/therapists",
      {
        limit: pageSize,
        offset: currentPage * pageSize,
        status: statusFilter === "all" ? undefined : statusFilter,
      },
    ],
    refetchInterval: 60000, // Refresh every minute
  });

  // Health monitoring data
  const { data: healthData, isLoading: healthLoading } = useQuery<{
    success: boolean;
    monitoring: HealthMonitoring;
  }>({
    queryKey: ["/api/admin/calendar/monitoring/health"],
    refetchInterval: isHealthMonitoringLive ? 15000 : false, // Real-time when enabled
    staleTime: 5000,
  });

  // Analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<{
    success: boolean;
    analytics: CalendarAnalytics;
  }>({
    queryKey: ["/api/admin/calendar/analytics", { timeframe: analyticsTimeframe }],
    staleTime: 300000, // 5 minutes
  });

  // Individual calendar details
  const { data: calendarDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ["/api/admin/calendar/therapist", selectedCalendarForDetails],
    enabled: !!selectedCalendarForDetails,
    staleTime: 60000,
  });

  // ============================================================================
  // MUTATIONS FOR CALENDAR OPERATIONS
  // ============================================================================

  // Individual calendar sync
  const syncCalendarMutation = useMutation({
    mutationFn: async (therapistId: string) => {
      const response = await fetch(`/api/admin/calendar/therapist/${therapistId}/sync`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to sync calendar");
      return response.json();
    },
    onSuccess: (data, therapistId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/calendar/therapists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/calendar/overview"] });
      toast({
        title: "✅ Calendar Synced",
        description: `Calendar sync completed for therapist ${therapistId}`,
        className: "border-l-4 border-l-green-500",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Sync Failed",
        description: `Calendar sync failed: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Reset calendar integration
  const resetCalendarMutation = useMutation({
    mutationFn: async (therapistId: string) => {
      const response = await fetch(`/api/admin/calendar/therapist/${therapistId}/reset`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to reset calendar");
      return response.json();
    },
    onSuccess: (data, therapistId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/calendar/therapists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/calendar/overview"] });
      toast({
        title: "🔄 Calendar Reset",
        description: `Calendar integration reset for therapist ${therapistId}`,
        className: "border-l-4 border-l-blue-500",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Reset Failed",
        description: `Calendar reset failed: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Bulk sync operation
  const bulkSyncMutation = useMutation({
    mutationFn: async (therapistIds: string[]) => {
      const response = await fetch("/api/admin/calendar/bulk/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ therapistIds }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to perform bulk sync");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/calendar/therapists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/calendar/overview"] });
      setSelectedTherapists([]);
      toast({
        title: "📅 Bulk Sync Completed",
        description: `${data.summary.successful}/${data.summary.totalCalendars} calendars synced successfully`,
        className: "border-l-4 border-l-green-500",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Bulk Sync Failed",
        description: `Bulk sync failed: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Bulk health check operation
  const bulkHealthCheckMutation = useMutation({
    mutationFn: async (therapistIds: string[]) => {
      const response = await fetch("/api/admin/calendar/bulk/health-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ therapistIds }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to perform bulk health check");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/calendar/monitoring/health"] });
      setSelectedTherapists([]);
      toast({
        title: "🏥 Health Check Completed",
        description: `${data.summary.healthy} healthy, ${data.summary.warning} warnings, ${data.summary.critical} critical`,
        className: "border-l-4 border-l-blue-500",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Health Check Failed",
        description: `Health check failed: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Connection test mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (therapistId: string) => {
      const response = await fetch("/api/admin/calendar/diagnostics/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ therapistId }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to test connection");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "🔍 Connection Test Complete",
        description: `Calendar connection status: ${data.diagnostics.overallStatus}`,
        className:
          data.diagnostics.overallStatus === "healthy"
            ? "border-l-4 border-l-green-500"
            : "border-l-4 border-l-yellow-500",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Connection Test Failed",
        description: `Connection test failed: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "error":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "critical":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "critical":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleSelectAll = () => {
    if (selectedTherapists.length === calendarsData?.calendars.length) {
      setSelectedTherapists([]);
    } else {
      setSelectedTherapists(calendarsData?.calendars.map((c) => c.therapistId) || []);
    }
  };

  const handleSelectTherapist = (therapistId: string) => {
    if (selectedTherapists.includes(therapistId)) {
      setSelectedTherapists(selectedTherapists.filter((id) => id !== therapistId));
    } else {
      setSelectedTherapists([...selectedTherapists, therapistId]);
    }
  };

  // Filter and sort calendars
  const filteredCalendars =
    calendarsData?.calendars
      .filter((calendar) => {
        const matchesSearch =
          calendar.therapistName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          calendar.therapistEmail.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || calendar.integrationStatus === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const aVal = a[sortBy as keyof TherapistCalendar];
        const bVal = b[sortBy as keyof TherapistCalendar];
        const direction = sortOrder === "asc" ? 1 : -1;
        return aVal < bVal ? -direction : aVal > bVal ? direction : 0;
      }) || [];

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  if (overviewLoading && calendarsLoading) {
    return (
      <div className="container mx-auto p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (overviewError) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Unable to load admin dashboard
          </h3>
          <p className="text-gray-600 mb-4">
            There was an error loading the calendar management data.
          </p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Calendar Management</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive oversight and management of all therapist calendars
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {healthData?.monitoring && getHealthStatusIcon(healthData.monitoring.overallHealth)}
            <span
              className={`font-medium ${getHealthStatusColor(healthData?.monitoring.overallHealth || "unknown")}`}
            >
              System {healthData?.monitoring.overallHealth || "Unknown"}
            </span>
          </div>
          <Badge variant="secondary" className="text-sm">
            {overview?.overview.appointments.today || 0} appointments today
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger
            value="dashboard"
            className="flex items-center space-x-2"
            data-testid="tab-dashboard"
          >
            <Activity className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger
            value="calendars"
            className="flex items-center space-x-2"
            data-testid="tab-calendars"
          >
            <Calendar className="h-4 w-4" />
            <span>Calendar Management</span>
          </TabsTrigger>
          <TabsTrigger
            value="monitoring"
            className="flex items-center space-x-2"
            data-testid="tab-monitoring"
          >
            <Gauge className="h-4 w-4" />
            <span>Health Monitoring</span>
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="flex items-center space-x-2"
            data-testid="tab-analytics"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* DASHBOARD TAB */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card data-testid="card-total-therapists">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Therapists</p>
                    <p
                      className="text-2xl font-bold text-gray-900"
                      data-testid="text-total-therapists"
                    >
                      {overview?.overview.totalTherapists || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-active-calendars">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Calendars</p>
                    <p
                      className="text-2xl font-bold text-gray-900"
                      data-testid="text-active-calendars"
                    >
                      {overview?.overview.calendarStatus.active || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-setup-rate">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Setup Completion</p>
                    <p className="text-2xl font-bold text-gray-900" data-testid="text-setup-rate">
                      {overview?.overview.setupCompletionRate || 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-health-status">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${
                      overview?.overview.healthStatus === "healthy"
                        ? "bg-green-100"
                        : overview?.overview.healthStatus === "warning"
                          ? "bg-yellow-100"
                          : "bg-red-100"
                    }`}
                  >
                    {getHealthStatusIcon(overview?.overview.healthStatus || "unknown")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">System Health</p>
                    <p
                      className={`text-2xl font-bold capitalize ${getHealthStatusColor(overview?.overview.healthStatus || "unknown")}`}
                      data-testid="text-health-status"
                    >
                      {overview?.overview.healthStatus || "Unknown"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card data-testid="card-calendar-status">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Calendar Status Breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Active</span>
                    </div>
                    <span className="font-semibold" data-testid="text-status-active">
                      {overview?.overview.calendarStatus.active || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Pending</span>
                    </div>
                    <span className="font-semibold" data-testid="text-status-pending">
                      {overview?.overview.calendarStatus.pending || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Error</span>
                    </div>
                    <span className="font-semibold" data-testid="text-status-error">
                      {overview?.overview.calendarStatus.error || 0}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <Progress
                    value={
                      ((overview?.overview.calendarStatus.active || 0) /
                        Math.max(overview?.overview.totalCalendars || 1, 1)) *
                      100
                    }
                    className="h-2"
                    data-testid="progress-calendar-health"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(
                      ((overview?.overview.calendarStatus.active || 0) /
                        Math.max(overview?.overview.totalCalendars || 1, 1)) *
                      100
                    ).toFixed(1)}
                    % calendars are healthy
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-appointments-overview">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Appointments Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Today</span>
                    <span
                      className="text-2xl font-bold text-blue-600"
                      data-testid="text-appointments-today"
                    >
                      {overview?.overview.appointments.today || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">This Week</span>
                    <span
                      className="text-lg font-semibold text-gray-900"
                      data-testid="text-appointments-week"
                    >
                      {overview?.overview.appointments.thisWeek || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">This Month</span>
                    <span
                      className="text-lg font-semibold text-gray-900"
                      data-testid="text-appointments-month"
                    >
                      {overview?.overview.appointments.thisMonth || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card data-testid="card-recent-activity">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Recent Calendar Activity</span>
              </CardTitle>
              <CardDescription>Latest updates and changes to therapist calendars</CardDescription>
            </CardHeader>
            <CardContent>
              {overview?.overview.recentActivity?.length ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {overview.overview.recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                      data-testid={`activity-${activity.therapistId}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`p-1 rounded-full ${getStatusBadgeColor(activity.integrationStatus)}`}
                        >
                          {activity.integrationStatus === "active" && (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          {activity.integrationStatus === "error" && (
                            <XCircle className="h-4 w-4" />
                          )}
                          {activity.integrationStatus === "pending" && (
                            <Clock className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{activity.therapistName}</p>
                          <p className="text-sm text-gray-600">{activity.therapistEmail}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusBadgeColor(activity.integrationStatus)}>
                          {activity.integrationStatus}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(activity.updatedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No recent calendar activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CALENDAR MANAGEMENT TAB */}
        <TabsContent value="calendars" className="space-y-6">
          {/* Search and Filter Controls */}
          <Card data-testid="card-calendar-controls">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search therapists..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-therapists"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48" data-testid="select-status-filter">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bulk Actions */}
                {selectedTherapists.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600" data-testid="text-selected-count">
                      {selectedTherapists.length} selected
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => bulkSyncMutation.mutate(selectedTherapists)}
                      disabled={bulkSyncMutation.isPending}
                      className="flex items-center space-x-1"
                      data-testid="button-bulk-sync"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${bulkSyncMutation.isPending ? "animate-spin" : ""}`}
                      />
                      <span>Sync</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => bulkHealthCheckMutation.mutate(selectedTherapists)}
                      disabled={bulkHealthCheckMutation.isPending}
                      className="flex items-center space-x-1"
                      data-testid="button-bulk-health-check"
                    >
                      <Shield
                        className={`h-4 w-4 ${bulkHealthCheckMutation.isPending ? "animate-spin" : ""}`}
                      />
                      <span>Health Check</span>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Calendar Status Grid */}
          <Card data-testid="card-calendar-grid">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Therapist Calendar Status</span>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSelectAll}
                    data-testid="button-select-all"
                  >
                    {selectedTherapists.length === filteredCalendars.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                  <span className="text-sm text-gray-600">
                    {filteredCalendars.length} calendars
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {calendarsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse flex items-center space-x-4 p-4 border rounded-lg"
                    >
                      <div className="h-4 w-4 bg-gray-200 rounded"></div>
                      <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="h-8 w-20 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {filteredCalendars.map((calendar) => (
                    <div
                      key={calendar.therapistId}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      data-testid={`calendar-row-${calendar.therapistId}`}
                    >
                      <div className="flex items-center space-x-4">
                        <Checkbox
                          checked={selectedTherapists.includes(calendar.therapistId)}
                          onCheckedChange={() => handleSelectTherapist(calendar.therapistId)}
                          data-testid={`checkbox-${calendar.therapistId}`}
                        />
                        <div className="flex items-center space-x-3">
                          <div
                            className={`p-2 rounded-full ${
                              calendar.integrationStatus === "active"
                                ? "bg-green-100"
                                : calendar.integrationStatus === "error"
                                  ? "bg-red-100"
                                  : "bg-yellow-100"
                            }`}
                          >
                            {calendar.integrationStatus === "active" && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                            {calendar.integrationStatus === "error" && (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            {calendar.integrationStatus === "pending" && (
                              <Clock className="h-4 w-4 text-yellow-600" />
                            )}
                          </div>
                          <div>
                            <p
                              className="font-medium text-gray-900"
                              data-testid={`text-therapist-name-${calendar.therapistId}`}
                            >
                              {calendar.therapistName}
                            </p>
                            <p
                              className="text-sm text-gray-600"
                              data-testid={`text-therapist-email-${calendar.therapistId}`}
                            >
                              {calendar.therapistEmail}
                            </p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-xs text-gray-500">
                                {calendar.upcomingAppointments} upcoming
                              </span>
                              <span className="text-xs text-gray-500">
                                Last sync: {formatDate(calendar.lastSyncTime)}
                              </span>
                              <span
                                className={`text-xs ${
                                  calendar.channelStatus === "active"
                                    ? "text-green-600"
                                    : calendar.channelStatus === "expired"
                                      ? "text-red-600"
                                      : "text-gray-500"
                                }`}
                              >
                                Webhook: {calendar.channelStatus}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Badge
                          className={getStatusBadgeColor(calendar.integrationStatus)}
                          data-testid={`badge-status-${calendar.therapistId}`}
                        >
                          {calendar.integrationStatus}
                        </Badge>

                        {/* Individual Actions */}
                        <div className="flex items-center space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedCalendarForDetails(calendar.therapistId)}
                            className="h-8 w-8 p-0"
                            data-testid={`button-view-${calendar.therapistId}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => syncCalendarMutation.mutate(calendar.therapistId)}
                            disabled={syncCalendarMutation.isPending}
                            className="h-8 w-8 p-0"
                            data-testid={`button-sync-${calendar.therapistId}`}
                          >
                            <RefreshCw
                              className={`h-4 w-4 ${syncCalendarMutation.isPending ? "animate-spin" : ""}`}
                            />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => testConnectionMutation.mutate(calendar.therapistId)}
                            disabled={testConnectionMutation.isPending}
                            className="h-8 w-8 p-0"
                            data-testid={`button-test-${calendar.therapistId}`}
                          >
                            <TestTube
                              className={`h-4 w-4 ${testConnectionMutation.isPending ? "animate-spin" : ""}`}
                            />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => resetCalendarMutation.mutate(calendar.therapistId)}
                            disabled={resetCalendarMutation.isPending}
                            className="h-8 w-8 p-0"
                            data-testid={`button-reset-${calendar.therapistId}`}
                          >
                            <RotateCcw
                              className={`h-4 w-4 ${resetCalendarMutation.isPending ? "animate-spin" : ""}`}
                            />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!calendarsLoading && filteredCalendars.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No calendars found matching your criteria</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* HEALTH MONITORING TAB */}
        <TabsContent value="monitoring" className="space-y-6">
          {/* Health Monitor Controls */}
          <Card data-testid="card-monitoring-controls">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={isHealthMonitoringLive}
                      onCheckedChange={setIsHealthMonitoringLive}
                      id="live-monitoring"
                      data-testid="checkbox-live-monitoring"
                    />
                    <Label htmlFor="live-monitoring" className="flex items-center space-x-2">
                      <span>Live Monitoring</span>
                      {isHealthMonitoringLive && (
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      )}
                    </Label>
                  </div>
                  {healthData?.monitoring && (
                    <span className="text-sm text-gray-600">
                      Last updated: {formatDate(healthData.monitoring.timestamp)}
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    queryClient.invalidateQueries({
                      queryKey: ["/api/admin/calendar/monitoring/health"],
                    })
                  }
                  className="flex items-center space-x-2"
                  data-testid="button-refresh-monitoring"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Health Metrics */}
          {healthData?.monitoring && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card data-testid="card-uptime">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Wifi className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">System Uptime</p>
                        <p className="text-2xl font-bold text-green-600" data-testid="text-uptime">
                          {healthData.monitoring.uptime.percentage}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {healthData.monitoring.uptime.healthy}/
                          {healthData.monitoring.uptime.total} healthy
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-active-monitors">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Activity className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Calendars</p>
                        <p
                          className="text-2xl font-bold text-blue-600"
                          data-testid="text-active-monitors"
                        >
                          {healthData.monitoring.metrics.active}
                        </p>
                        <p className="text-xs text-gray-500">
                          of {healthData.monitoring.metrics.total} total
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-expired-webhooks">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <WifiOff className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Expired Webhooks</p>
                        <p
                          className="text-2xl font-bold text-yellow-600"
                          data-testid="text-expired-webhooks"
                        >
                          {healthData.monitoring.metrics.expiredWebhooks}
                        </p>
                        <p className="text-xs text-gray-500">Need renewal</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-error-count">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertCircle className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Error Status</p>
                        <p
                          className="text-2xl font-bold text-red-600"
                          data-testid="text-error-count"
                        >
                          {healthData.monitoring.metrics.error}
                        </p>
                        <p className="text-xs text-gray-500">Require attention</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Alerts */}
              {healthData.monitoring.alerts.length > 0 && (
                <Card data-testid="card-alerts">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5" />
                      <span>System Alerts</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {healthData.monitoring.alerts.map((alert, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${
                            alert.level === "critical"
                              ? "border-l-red-500 bg-red-50"
                              : alert.level === "warning"
                                ? "border-l-yellow-500 bg-yellow-50"
                                : "border-l-blue-500 bg-blue-50"
                          }`}
                          data-testid={`alert-${index}`}
                        >
                          <div className="flex items-center space-x-3">
                            {alert.level === "critical" && (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                            {alert.level === "warning" && (
                              <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            )}
                            {alert.level === "info" && (
                              <AlertCircle className="h-5 w-5 text-blue-600" />
                            )}
                            <span
                              className={`font-medium ${
                                alert.level === "critical"
                                  ? "text-red-800"
                                  : alert.level === "warning"
                                    ? "text-yellow-800"
                                    : "text-blue-800"
                              }`}
                            >
                              {alert.message}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              alert.level === "critical"
                                ? "border-red-200 text-red-800"
                                : alert.level === "warning"
                                  ? "border-yellow-200 text-yellow-800"
                                  : "border-blue-200 text-blue-800"
                            }
                          >
                            {alert.count} affected
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Analytics Controls */}
          <Card data-testid="card-analytics-controls">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Label htmlFor="timeframe">Timeframe:</Label>
                  <Select value={analyticsTimeframe} onValueChange={setAnalyticsTimeframe}>
                    <SelectTrigger className="w-48" id="timeframe" data-testid="select-timeframe">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="1y">Last year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  className="flex items-center space-x-2"
                  data-testid="button-export-analytics"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Report</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Analytics Data */}
          {analyticsData?.analytics && (
            <>
              {/* Adoption Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card data-testid="card-adoption-rate">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Adoption Rate</p>
                        <p
                          className="text-2xl font-bold text-green-600"
                          data-testid="text-adoption-rate"
                        >
                          {analyticsData.analytics.adoption.adoptionRate}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {analyticsData.analytics.adoption.therapistsWithCalendars}/
                          {analyticsData.analytics.adoption.totalTherapists} therapists
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-activation-rate">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Zap className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Activation Rate</p>
                        <p
                          className="text-2xl font-bold text-blue-600"
                          data-testid="text-activation-rate"
                        >
                          {analyticsData.analytics.adoption.activationRate}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {analyticsData.analytics.adoption.activeCalendars} active calendars
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-booking-frequency">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Calendar className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                        <p
                          className="text-2xl font-bold text-purple-600"
                          data-testid="text-total-bookings"
                        >
                          {analyticsData.analytics.bookingFrequency.reduce(
                            (sum, day) => sum + day.bookings,
                            0
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          in {analyticsData.analytics.timeframe}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Setup Success Rates */}
              <Card data-testid="card-setup-success">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Calendar Setup Success Rates</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.analytics.setupSuccessRates.map((rate) => (
                      <div key={rate.status} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusBadgeColor(rate.status)}>{rate.status}</Badge>
                        </div>
                        <div className="flex items-center space-x-4 flex-1 ml-4">
                          <Progress
                            value={
                              (rate.count /
                                analyticsData.analytics.setupSuccessRates.reduce(
                                  (sum, r) => sum + r.count,
                                  0
                                )) *
                              100
                            }
                            className="flex-1 h-2"
                          />
                          <span className="font-semibold w-12 text-right">{rate.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Peak Booking Times */}
              <Card data-testid="card-peak-times">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Peak Booking Times</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-6 gap-2">
                    {Array.from({ length: 24 }, (_, hour) => {
                      const data = analyticsData.analytics.peakBookingTimes.find(
                        (p) => p.hour === hour
                      );
                      const bookings = data?.bookings || 0;
                      const maxBookings = Math.max(
                        ...analyticsData.analytics.peakBookingTimes.map((p) => p.bookings)
                      );
                      const intensity = maxBookings > 0 ? (bookings / maxBookings) * 100 : 0;

                      return (
                        <div
                          key={hour}
                          className={`p-2 text-center text-xs rounded ${
                            intensity > 75
                              ? "bg-red-100 text-red-800"
                              : intensity > 50
                                ? "bg-yellow-100 text-yellow-800"
                                : intensity > 25
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-600"
                          }`}
                          title={`${hour}:00 - ${bookings} bookings`}
                        >
                          <div className="font-medium">{hour}:00</div>
                          <div>{bookings}</div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Booking frequency by hour of day - darker colors indicate higher activity
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Calendar Details Modal */}
      <Dialog
        open={!!selectedCalendarForDetails}
        onOpenChange={() => setSelectedCalendarForDetails(null)}
      >
        <DialogContent
          className="max-w-4xl max-h-[80vh] overflow-y-auto"
          data-testid="dialog-calendar-details"
        >
          <DialogHeader>
            <DialogTitle>Calendar Details</DialogTitle>
            <DialogDescription>
              Detailed information and configuration for the selected therapist calendar
            </DialogDescription>
          </DialogHeader>
          {calendarDetails && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Therapist Name</Label>
                  <p className="text-sm text-gray-600" data-testid="detail-therapist-name">
                    {calendarDetails.calendar?.therapistName}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Integration Status</Label>
                  <Badge
                    className={getStatusBadgeColor(calendarDetails.calendar?.integrationStatus)}
                    data-testid="detail-integration-status"
                  >
                    {calendarDetails.calendar?.integrationStatus}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Google Calendar ID</Label>
                  <p className="text-sm text-gray-600 font-mono" data-testid="detail-calendar-id">
                    {calendarDetails.calendar?.googleCalendarId || "Not configured"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Calendar Mode</Label>
                  <p className="text-sm text-gray-600" data-testid="detail-calendar-mode">
                    {calendarDetails.calendar?.mode}
                  </p>
                </div>
              </div>

              {calendarDetails.calendar?.statistics && (
                <div>
                  <Label className="text-sm font-medium">Calendar Statistics</Label>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-lg font-semibold" data-testid="detail-total-appointments">
                        {calendarDetails.calendar.statistics.totalAppointments}
                      </p>
                      <p className="text-xs text-gray-600">Total Appointments</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p
                        className="text-lg font-semibold"
                        data-testid="detail-upcoming-appointments"
                      >
                        {calendarDetails.calendar.statistics.upcomingAppointments}
                      </p>
                      <p className="text-xs text-gray-600">Upcoming</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p
                        className="text-lg font-semibold"
                        data-testid="detail-completed-appointments"
                      >
                        {calendarDetails.calendar.statistics.completedAppointments}
                      </p>
                      <p className="text-xs text-gray-600">Completed</p>
                    </div>
                  </div>
                </div>
              )}

              {calendarDetails.calendar?.healthCheck && (
                <div>
                  <Label className="text-sm font-medium">Health Check Results</Label>
                  <div className="space-y-2 mt-2">
                    {Object.entries(calendarDetails.calendar.healthCheck).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        <span
                          className={`text-sm ${typeof value === "boolean" ? (value ? "text-green-600" : "text-red-600") : "text-gray-600"}`}
                        >
                          {typeof value === "boolean" ? (value ? "✓" : "✗") : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => setSelectedCalendarForDetails(null)}
              data-testid="button-close-details"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
