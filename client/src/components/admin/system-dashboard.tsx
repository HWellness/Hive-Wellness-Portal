import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Activity } from "lucide-react";

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

export default function SystemDashboard() {
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  // Fetch system health data
  const { data: healthData, refetch: refetchHealth } = useQuery<DetailedHealth>({
    queryKey: ["/api/health/detailed"],
    refetchInterval: refreshInterval,
  });

  // Fetch API status data
  const { data: apiData, refetch: refetchApi } = useQuery<{ apis: Record<string, ApiStatus> }>({
    queryKey: ["/api/health/services"],
    refetchInterval: refreshInterval,
  });

  // Fetch performance metrics
  const { data: metricsData, refetch: refetchMetrics } = useQuery<PerformanceMetrics>({
    queryKey: ["/api/metrics"],
    refetchInterval: refreshInterval,
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
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of all 14 microservices and system health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={getStatusColor(healthData?.system.overall || "unknown")}
          >
            {getStatusIcon(healthData?.system.overall || "unknown")}
            <span className="ml-1 capitalize">{healthData?.system.overall || "Loading..."}</span>
          </Badge>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthData?.system.services.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {healthData?.system.services.healthy || 0} healthy,{" "}
              {healthData?.system.services.degraded || 0} degraded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatUptime((metricsData?.uptime || 0) * 1000)}
            </div>
            <p className="text-xs text-muted-foreground">Since last restart</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsData?.performance.averageResponseTime || 0}ms
            </div>
            <p className="text-xs text-muted-foreground">Average across all services</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsData?.performance.errorRate.toFixed(2) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metricsData?.performance.errorCount || 0} errors out of{" "}
              {metricsData?.performance.totalRequests || 0} requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed System Information */}
      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">Microservices</TabsTrigger>
          <TabsTrigger value="apis">External APIs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>14 Microservices Health Status</CardTitle>
              <CardDescription>
                Real-time monitoring of all therapy platform services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {healthData?.services.map((service) => (
                  <div key={service.name} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{service.name}</h4>
                      <Badge variant="outline" className={getStatusColor(service.status)}>
                        {getStatusIcon(service.status)}
                        <span className="ml-1 capitalize">{service.status}</span>
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>Uptime: {formatUptime(service.metrics.uptime)}</div>
                      <div>Response: {service.metrics.responseTime}ms</div>
                      <div>Error Rate: {(service.metrics.errorRate * 100).toFixed(1)}%</div>
                      <div>Operations: {service.metrics.totalOperations}</div>
                    </div>
                    {service.dependencies.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-muted-foreground mb-1">Dependencies:</div>
                        <div className="flex flex-wrap gap-1">
                          {service.dependencies.map((dep) => (
                            <Badge key={dep} variant="secondary" className="text-xs">
                              {dep}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>External API Status</CardTitle>
              <CardDescription>
                Circuit breaker status and health of external integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {apiData &&
                  Object.entries(apiData.apis).map(([name, api]) => (
                    <div key={name} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium capitalize">{name}</h4>
                        <Badge variant="outline" className={getStatusColor(api.status)}>
                          {getStatusIcon(api.status)}
                          <span className="ml-1 capitalize">{api.status}</span>
                        </Badge>
                      </div>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Circuit Breaker:</span>
                          <Badge
                            variant={
                              api.circuitBreakerState === "CLOSED" ? "default" : "destructive"
                            }
                          >
                            {api.circuitBreakerState}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Success Rate:</span>
                          <span>
                            {api.successCount > 0
                              ? (
                                  (api.successCount / (api.successCount + api.errorCount)) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Response Time:</span>
                          <span>{api.responseTime}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Failures:</span>
                          <span>{api.failures}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Performance Metrics</CardTitle>
              <CardDescription>
                Real-time performance monitoring and resource utilization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Memory Usage</span>
                      <span>{metricsData?.system.memoryUsage}</span>
                    </div>
                    <Progress value={parseInt(metricsData?.system.memoryUsage || "0")} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Error Rate</span>
                      <span>{metricsData?.performance.errorRate.toFixed(2)}%</span>
                    </div>
                    <Progress value={metricsData?.performance.errorRate || 0} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Slow Requests</span>
                      <span>{metricsData?.performance.slowRequestsPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={metricsData?.performance.slowRequestsPercentage || 0} />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Total Requests</div>
                      <div className="text-2xl font-bold">
                        {metricsData?.performance.totalRequests || 0}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Error Count</div>
                      <div className="text-2xl font-bold text-red-600">
                        {metricsData?.performance.errorCount || 0}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Node Version</div>
                      <div className="text-lg">{metricsData?.system.nodeVersion}</div>
                    </div>
                    <div>
                      <div className="font-medium">Environment</div>
                      <div className="text-lg capitalize">{metricsData?.system.environment}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>Current alerts and warnings across all services</CardDescription>
            </CardHeader>
            <CardContent>
              {healthData?.alerts && healthData.alerts.length > 0 ? (
                <div className="space-y-2">
                  {healthData.alerts.map((alert, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-3 ${
                        alert.level === "critical"
                          ? "border-red-200 bg-red-50"
                          : "border-yellow-200 bg-yellow-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {alert.level === "critical" ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        )}
                        <span className="font-medium capitalize">{alert.level}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm">{alert.service}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{alert.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p>No active alerts - all systems operating normally</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
