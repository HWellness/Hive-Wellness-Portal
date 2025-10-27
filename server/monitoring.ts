import { Request, Response } from "express";

// Performance monitoring
interface PerformanceMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  slowRequests: number;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
}

class MonitoringService {
  private metrics: PerformanceMetrics;
  private requestTimes: number[] = [];
  private readonly maxRequestTimesSamples = 1000;

  constructor() {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      uptime: 0,
      memoryUsage: process.memoryUsage(),
    };

    // Update metrics every minute
    setInterval(() => {
      this.updateMetrics();
    }, 60000);
  }

  recordRequest(responseTime: number, statusCode: number) {
    this.metrics.requestCount++;

    if (statusCode >= 400) {
      this.metrics.errorCount++;
    }

    if (responseTime > 1000) {
      this.metrics.slowRequests++;
    }

    // Track response times for average calculation
    this.requestTimes.push(responseTime);
    if (this.requestTimes.length > this.maxRequestTimesSamples) {
      this.requestTimes.shift();
    }

    this.calculateAverageResponseTime();
  }

  private calculateAverageResponseTime() {
    if (this.requestTimes.length === 0) return;

    const sum = this.requestTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageResponseTime = Math.round(sum / this.requestTimes.length);
  }

  private updateMetrics() {
    this.metrics.uptime = Math.floor(process.uptime());
    this.metrics.memoryUsage = process.memoryUsage();
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getHealthStatus() {
    const metrics = this.getMetrics();
    const errorRate =
      metrics.requestCount > 0 ? (metrics.errorCount / metrics.requestCount) * 100 : 0;
    const memoryUsageMB = Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024);

    return {
      status: this.determineHealthStatus(errorRate, metrics.averageResponseTime, memoryUsageMB),
      uptime: metrics.uptime,
      requestCount: metrics.requestCount,
      errorRate: Math.round(errorRate * 100) / 100,
      averageResponseTime: metrics.averageResponseTime,
      memoryUsage: `${memoryUsageMB}MB`,
      slowRequestsPercentage:
        metrics.requestCount > 0
          ? Math.round((metrics.slowRequests / metrics.requestCount) * 100 * 100) / 100
          : 0,
      timestamp: new Date().toISOString(),
    };
  }

  private determineHealthStatus(
    errorRate: number,
    avgResponseTime: number,
    memoryMB: number
  ): string {
    if (errorRate > 5 || avgResponseTime > 2000 || memoryMB > 512) {
      return "warning";
    }
    if (errorRate > 10 || avgResponseTime > 5000 || memoryMB > 1024) {
      return "critical";
    }
    return "healthy";
  }

  // Alert system for critical issues
  checkAlerts() {
    const health = this.getHealthStatus();

    if (health.status === "critical") {
      console.error("CRITICAL ALERT:", {
        status: health.status,
        errorRate: health.errorRate,
        responseTime: health.averageResponseTime,
        memory: health.memoryUsage,
        timestamp: health.timestamp,
      });
    } else if (health.status === "warning") {
      console.warn("WARNING ALERT:", {
        status: health.status,
        errorRate: health.errorRate,
        responseTime: health.averageResponseTime,
        memory: health.memoryUsage,
        timestamp: health.timestamp,
      });
    }
  }
}

export const monitoring = new MonitoringService();

// Enhanced monitoring middleware
export const monitoringMiddleware = (req: Request, res: Response, next: Function) => {
  const start = Date.now();

  res.on("finish", () => {
    const responseTime = Date.now() - start;
    monitoring.recordRequest(responseTime, res.statusCode);

    // Check for alerts on every request (but alerts are rate-limited internally)
    if (Math.random() < 0.01) {
      // Check alerts on 1% of requests to avoid spam
      monitoring.checkAlerts();
    }
  });

  next();
};

// Metrics endpoint
export const metricsEndpoint = (req: Request, res: Response) => {
  const health = monitoring.getHealthStatus();
  const metrics = monitoring.getMetrics();

  res.json({
    health: health.status,
    uptime: health.uptime,
    performance: {
      totalRequests: metrics.requestCount,
      errorCount: metrics.errorCount,
      errorRate: health.errorRate,
      averageResponseTime: health.averageResponseTime,
      slowRequests: metrics.slowRequests,
      slowRequestsPercentage: health.slowRequestsPercentage,
    },
    system: {
      memoryUsage: health.memoryUsage,
      nodeVersion: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV || "development",
    },
    services: {
      database: "operational", // Could add actual DB health check
      authentication: "operational",
      payments: process.env.STRIPE_SECRET_KEY ? "operational" : "not_configured",
      email: process.env.SENDGRID_API_KEY ? "operational" : "not_configured",
    },
    timestamp: new Date().toISOString(),
  });
};
