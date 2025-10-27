import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Activity,
  Database,
  CheckCircle,
  RefreshCw,
  Server,
  Clock,
  Zap,
} from "lucide-react";
import type { User } from "@shared/schema";

interface SystemHealthDashboardProps {
  user: User;
}

interface SystemHealth {
  overall: "healthy" | "degraded" | "unhealthy";
  services: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
  timestamp: number;
}

interface ServiceMetrics {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  metrics: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    totalOperations: number;
    lastCheck: number;
  };
  dependencies: string[];
}

interface DetailedHealth {
  system: SystemHealth;
  services: ServiceMetrics[];
  alerts: Array<{
    level: "critical" | "warning";
    service: string;
    message: string;
    timestamp: number;
  }>;
}

interface ApiStatus {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  failures: number;
  circuitBreakerState: "CLOSED" | "OPEN" | "HALF_OPEN";
  responseTime: number;
  successCount: number;
  errorCount: number;
}

interface PerformanceMetrics {
  health: string;
  uptime: number;
  performance: {
    totalRequests: number;
    errorCount: number;
    errorRate: number;
    averageResponseTime: number;
    slowRequests: number;
    slowRequestsPercentage: number;
  };
  system: {
    memoryUsage: string;
    nodeVersion: string;
    platform: string;
    environment: string;
  };
  services: Record<string, string>;
  timestamp: number;
}

export default function SystemHealthDashboard({ user }: SystemHealthDashboardProps) {
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  // Fetch system health data
  const {
    data: healthData,
    refetch: refetchHealth,
    isLoading: healthLoading,
  } = useQuery<DetailedHealth>({
    queryKey: ["/api/health/detailed"],
    refetchInterval: refreshInterval,
    retry: 3,
    retryDelay: 1000,
  });

  // Fetch API status data
  const {
    data: apiData,
    refetch: refetchApi,
    isLoading: apiLoading,
  } = useQuery<{ apis: Record<string, ApiStatus> }>({
    queryKey: ["/api/health/services"],
    refetchInterval: refreshInterval,
    retry: 3,
    retryDelay: 1000,
  });

  // Fetch performance metrics
  const {
    data: metricsData,
    refetch: refetchMetrics,
    isLoading: metricsLoading,
  } = useQuery<PerformanceMetrics>({
    queryKey: ["/api/metrics"],
    refetchInterval: refreshInterval,
    retry: 3,
    retryDelay: 1000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600 bg-green-50";
      case "degraded":
        return "text-yellow-600 bg-yellow-50";
      case "unhealthy":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "degraded":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "unhealthy":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatUptime = (uptime: number) => {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const handleRefreshAll = async () => {
    // Prevent multiple clicks if already refreshing
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    console.log("Refresh button clicked - invalidating caches");

    try {
      // Add minimum delay to ensure visual feedback is seen
      const refreshPromises = Promise.all([refetchHealth(), refetchApi(), refetchMetrics()]);

      const minDelayPromise = new Promise((resolve) => setTimeout(resolve, 500));

      await Promise.all([refreshPromises, minDelayPromise]);

      toast({
        title: "Dashboard Refreshed",
        description: "All system health data has been updated",
      });
    } catch (error) {
      console.error("Error refreshing dashboard:", error);
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh all data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (healthLoading || apiLoading || metricsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-hive-purple rounded-full mx-auto mb-4"></div>
          <div className="text-hive-purple font-century text-lg font-bold">
            Loading System Health
          </div>
          <div className="text-gray-600 text-sm mt-2">Gathering system metrics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-hive-black">System Health Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor platform health and performance metrics</p>
        </div>
        <Button
          onClick={handleRefreshAll}
          variant="outline"
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh All"}
        </Button>
      </div>

      {/* Overall System Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Status</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {getStatusIcon(healthData?.system?.overall || "healthy")}
              <Badge className={getStatusColor(healthData?.system?.overall || "healthy")}>
                {(healthData?.system?.overall || "healthy").toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthData?.system?.services?.healthy || 0}/
              {healthData?.system?.services?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">Services online</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUptime(metricsData?.uptime || 0)}</div>
            <p className="text-xs text-muted-foreground">System uptime</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsData?.performance?.averageResponseTime || 0}ms
            </div>
            <p className="text-xs text-muted-foreground">Average response</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Health Tabs */}
      <Tabs defaultValue="services" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="apis">API Status</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Status</CardTitle>
              <CardDescription>Current status of all platform services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {healthData?.services?.map((service) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between p-4 border rounded"
                  >
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(service.status)}
                      <div>
                        <h3 className="font-medium">{service.name}</h3>
                        <p className="text-sm text-gray-600">
                          {service.metrics.responseTime}ms avg response •{" "}
                          {service.metrics.errorRate.toFixed(2)}% error rate
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(service.status)}>
                      {service.status.toUpperCase()}
                    </Badge>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-500">No service data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>External API Status</CardTitle>
              <CardDescription>Status of external service integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiData?.apis ? (
                  Object.entries(apiData.apis).map(([name, api]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between p-4 border rounded"
                    >
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(api.status)}
                        <div>
                          <h3 className="font-medium">{api.name}</h3>
                          <p className="text-sm text-gray-600">
                            {api.responseTime}ms • {api.successCount} success • {api.errorCount}{" "}
                            errors
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(api.status)}>
                          {api.status.toUpperCase()}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          Circuit: {api.circuitBreakerState}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">No API data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Request Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Requests</span>
                  <span className="font-mono">
                    {metricsData?.performance?.totalRequests?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Error Count</span>
                  <span className="font-mono text-red-600">
                    {metricsData?.performance?.errorCount || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Error Rate</span>
                  <span className="font-mono">
                    {metricsData?.performance?.errorRate?.toFixed(2) || 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Slow Requests</span>
                  <span className="font-mono text-yellow-600">
                    {metricsData?.performance?.slowRequests || 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Memory Usage</span>
                  <span className="font-mono">{metricsData?.system?.memoryUsage || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Node Version</span>
                  <span className="font-mono">{metricsData?.system?.nodeVersion || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform</span>
                  <span className="font-mono">{metricsData?.system?.platform || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Environment</span>
                  <span className="font-mono">{metricsData?.system?.environment || "N/A"}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>Critical and warning alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {healthData?.alerts?.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded border-l-4 ${
                      alert.level === "critical"
                        ? "border-red-500 bg-red-50"
                        : "border-yellow-500 bg-yellow-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle
                          className={`h-4 w-4 ${
                            alert.level === "critical" ? "text-red-600" : "text-yellow-600"
                          }`}
                        />
                        <span className="font-medium">{alert.service}</span>
                        <Badge variant={alert.level === "critical" ? "destructive" : "secondary"}>
                          {alert.level.toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{alert.message}</p>
                  </div>
                )) || (
                  <div className="text-center py-8 text-green-600">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>No active alerts - all systems operational</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
