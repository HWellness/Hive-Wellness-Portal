import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Shield,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Globe,
  Server,
  Key,
  FileText,
  Download,
  RefreshCw,
  Settings,
  Bell,
  Clock,
  MapPin,
  Search,
  Filter,
} from "lucide-react";
import type { User } from "@shared/schema";

interface SecurityDashboardProps {
  user: User;
}

interface SecurityEvent {
  id: string;
  type:
    | "login"
    | "logout"
    | "failed_login"
    | "password_change"
    | "permission_change"
    | "data_access"
    | "api_request";
  severity: "low" | "medium" | "high" | "critical";
  userId?: string;
  userEmail?: string;
  ipAddress: string;
  location: string;
  userAgent: string;
  description: string;
  timestamp: string;
  status: "resolved" | "investigating" | "open";
}

interface SecurityMetric {
  name: string;
  value: number;
  trend: "up" | "down" | "stable";
  status: "good" | "warning" | "critical";
}

interface AccessAttempt {
  id: string;
  email: string;
  ipAddress: string;
  location: string;
  timestamp: string;
  success: boolean;
  reason?: string;
  userAgent: string;
}

export default function SecurityDashboard({ user }: SecurityDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorRequired: true,
    sessionTimeout: 30,
    passwordExpiry: 90,
    failedLoginLimit: 5,
    ipWhitelist: false,
    auditLogging: true,
    realTimeAlerts: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch security events
  const { data: securityEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/security/events", filterSeverity, filterType],
  });

  // Fetch security metrics
  const { data: securityMetrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/security/metrics"],
  });

  // Fetch access attempts
  const { data: accessAttempts = [], isLoading: accessLoading } = useQuery({
    queryKey: ["/api/security/access-attempts"],
  });

  // Update security settings mutation
  const updateSecurityMutation = useMutation({
    mutationFn: async (settings: any) => {
      return await apiRequest("PUT", "/api/security/settings", settings);
    },
    onSuccess: () => {
      toast({
        title: "Security Settings Updated",
        description: "Security configuration has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update security settings.",
        variant: "destructive",
      });
    },
  });

  // Production reset - no demo data
  const demoSecurityEvents: SecurityEvent[] = [];

  const demoSecurityMetrics: SecurityMetric[] = [
    { name: "Failed Login Attempts", value: 0, trend: "stable", status: "good" },
    { name: "Active Sessions", value: 0, trend: "stable", status: "good" },
    { name: "API Rate Limit Hits", value: 0, trend: "stable", status: "good" },
    { name: "Suspicious Activities", value: 0, trend: "stable", status: "good" },
    { name: "Password Resets", value: 0, trend: "stable", status: "good" },
    { name: "Two-Factor Enabled", value: 0, trend: "stable", status: "good" },
  ];

  const demoAccessAttempts: AccessAttempt[] = [];

  const displayEvents = securityEvents.length > 0 ? securityEvents : demoSecurityEvents;
  const displayMetrics = securityMetrics.length > 0 ? securityMetrics : demoSecurityMetrics;
  const displayAttempts = accessAttempts.length > 0 ? accessAttempts : demoAccessAttempts;

  const filteredEvents = displayEvents.filter((event) => {
    const matchesSeverity = filterSeverity === "all" || event.severity === filterSeverity;
    const matchesType = filterType === "all" || event.type === filterType;
    const matchesSearch =
      searchQuery === "" ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.userEmail && event.userEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      event.ipAddress.includes(searchQuery);

    return matchesSeverity && matchesType && matchesSearch;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-green-100 text-green-800";
      case "investigating":
        return "bg-yellow-100 text-yellow-800";
      case "open":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getMetricStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "critical":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return "↗";
      case "down":
        return "↘";
      case "stable":
        return "→";
      default:
        return "→";
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "login":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "logout":
        return <XCircle className="w-4 h-4 text-blue-500" />;
      case "failed_login":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "password_change":
        return <Key className="w-4 h-4 text-blue-500" />;
      case "permission_change":
        return <Settings className="w-4 h-4 text-orange-500" />;
      case "data_access":
        return <FileText className="w-4 h-4 text-purple-500" />;
      case "api_request":
        return <Server className="w-4 h-4 text-gray-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleSecuritySettingChange = (setting: string, value: any) => {
    const newSettings = { ...securitySettings, [setting]: value };
    setSecuritySettings(newSettings);
    updateSecurityMutation.mutate(newSettings);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Security Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Monitor security events, access controls, and system protection
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Security Report
          </Button>
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Security Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayMetrics.map((metric, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                  <Shield className={`h-4 w-4 ${getMetricStatusColor(metric.status)}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <p className={`text-xs ${getMetricStatusColor(metric.status)}`}>
                    {getTrendIcon(metric.trend)} {metric.status.toUpperCase()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Critical Events */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Critical Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayEvents
                  .filter((event) => event.severity === "critical" || event.severity === "high")
                  .slice(0, 5)
                  .map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center space-x-4 p-3 border rounded-lg"
                    >
                      {getEventIcon(event.type)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-medium text-sm">{event.description}</p>
                          <Badge className={getSeverityColor(event.severity)}>
                            {event.severity}
                          </Badge>
                          <Badge className={getStatusColor(event.status)}>{event.status}</Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Globe className="w-3 h-3 mr-1" />
                            {event.ipAddress}
                          </span>
                          <span className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {event.location}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Features Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Two-Factor Authentication</span>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Rate Limiting</span>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">SSL/TLS Encryption</span>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Audit Logging</span>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Intrusion Detection</span>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">GDPR Compliance</span>
                    <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Data Encryption</span>
                    <Badge className="bg-green-100 text-green-800">AES-256</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Backup Security</span>
                    <Badge className="bg-green-100 text-green-800">Encrypted</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Access Logging</span>
                    <Badge className="bg-green-100 text-green-800">Complete</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Data Retention</span>
                    <Badge className="bg-yellow-100 text-yellow-800">Review Needed</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Events Tab */}
        <TabsContent value="events" className="space-y-6">
          {/* Event Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Event Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search Events</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search by description, IP, or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="severity-filter">Severity</Label>
                  <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Severities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type-filter">Event Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                      <SelectItem value="logout">Logout</SelectItem>
                      <SelectItem value="failed_login">Failed Login</SelectItem>
                      <SelectItem value="password_change">Password Change</SelectItem>
                      <SelectItem value="permission_change">Permission Change</SelectItem>
                      <SelectItem value="data_access">Data Access</SelectItem>
                      <SelectItem value="api_request">API Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Export Events
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Events List */}
          <Card>
            <CardHeader>
              <CardTitle>Security Events ({filteredEvents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {eventsLoading ? (
                  <div className="text-center py-4">Loading security events...</div>
                ) : filteredEvents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No security events found matching your criteria.
                  </div>
                ) : (
                  filteredEvents.map((event) => (
                    <div
                      key={event.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 mt-1">{getEventIcon(event.type)}</div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-medium text-gray-900">{event.description}</h3>
                            <Badge className={getSeverityColor(event.severity)}>
                              {event.severity}
                            </Badge>
                            <Badge className={getStatusColor(event.status)}>{event.status}</Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            {event.userEmail && (
                              <div>
                                <span className="font-medium">User:</span> {event.userEmail}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">IP Address:</span> {event.ipAddress}
                            </div>
                            <div>
                              <span className="font-medium">Location:</span> {event.location}
                            </div>
                            <div>
                              <span className="font-medium">Time:</span>{" "}
                              {new Date(event.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            <span className="font-medium">User Agent:</span>{" "}
                            {event.userAgent.substring(0, 80)}...
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {event.status !== "resolved" && (
                            <Button variant="outline" size="sm">
                              Investigate
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Control Tab */}
        <TabsContent value="access" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Access Attempts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayAttempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      {attempt.success ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <div className="font-medium">{attempt.email}</div>
                        <div className="text-sm text-gray-600">
                          {attempt.ipAddress} • {attempt.location} •{" "}
                          {new Date(attempt.timestamp).toLocaleString()}
                        </div>
                        {!attempt.success && attempt.reason && (
                          <div className="text-sm text-red-600">{attempt.reason}</div>
                        )}
                      </div>
                    </div>
                    <Badge
                      className={
                        attempt.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }
                    >
                      {attempt.success ? "Success" : "Failed"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="two-factor">Two-Factor Authentication Required</Label>
                      <p className="text-sm text-gray-500">Require 2FA for all admin accounts</p>
                    </div>
                    <Switch
                      id="two-factor"
                      checked={securitySettings.twoFactorRequired}
                      onCheckedChange={(checked) =>
                        handleSecuritySettingChange("twoFactorRequired", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="audit-logging">Audit Logging</Label>
                      <p className="text-sm text-gray-500">
                        Log all user actions and system events
                      </p>
                    </div>
                    <Switch
                      id="audit-logging"
                      checked={securitySettings.auditLogging}
                      onCheckedChange={(checked) =>
                        handleSecuritySettingChange("auditLogging", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="real-time-alerts">Real-time Security Alerts</Label>
                      <p className="text-sm text-gray-500">
                        Send instant notifications for security events
                      </p>
                    </div>
                    <Switch
                      id="real-time-alerts"
                      checked={securitySettings.realTimeAlerts}
                      onCheckedChange={(checked) =>
                        handleSecuritySettingChange("realTimeAlerts", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="ip-whitelist">IP Address Whitelisting</Label>
                      <p className="text-sm text-gray-500">
                        Restrict access to approved IP addresses
                      </p>
                    </div>
                    <Switch
                      id="ip-whitelist"
                      checked={securitySettings.ipWhitelist}
                      onCheckedChange={(checked) =>
                        handleSecuritySettingChange("ipWhitelist", checked)
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                    <Input
                      id="session-timeout"
                      type="number"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) =>
                        handleSecuritySettingChange("sessionTimeout", parseInt(e.target.value))
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password-expiry">Password Expiry (days)</Label>
                    <Input
                      id="password-expiry"
                      type="number"
                      value={securitySettings.passwordExpiry}
                      onChange={(e) =>
                        handleSecuritySettingChange("passwordExpiry", parseInt(e.target.value))
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="failed-login-limit">Failed Login Attempt Limit</Label>
                    <Input
                      id="failed-login-limit"
                      type="number"
                      value={securitySettings.failedLoginLimit}
                      onChange={(e) =>
                        handleSecuritySettingChange("failedLoginLimit", parseInt(e.target.value))
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
