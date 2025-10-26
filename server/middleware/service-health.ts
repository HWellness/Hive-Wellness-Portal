import { Request, Response, NextFunction } from 'express';

// Service health status tracking
export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  responseTime: number;
  errorCount: number;
  successCount: number;
  uptime: number;
  dependencies: string[];
}

export class ServiceHealthMonitor {
  private static instance: ServiceHealthMonitor;
  private services = new Map<string, ServiceHealth>();
  private readonly CHECK_INTERVAL = 30000; // 30 seconds

  // Define all 14 microservices
  private readonly SERVICE_DEFINITIONS = [
    'Authentication & User Management',
    'Therapist Matching & Discovery',
    'Appointment Scheduling & Calendar',
    'Video Sessions & Communication',
    'Messaging & Chat Support',
    'Payment Processing & Billing',
    'Progress Tracking & Analytics',
    'Resource Library & Content',
    'Crisis Support & Emergency',
    'Community Features & Forums',
    'Administrative Dashboard',
    'Reporting & Business Intelligence',
    'Forms & Data Collection',
    'API Integration & Webhooks'
  ];

  static getInstance(): ServiceHealthMonitor {
    if (!ServiceHealthMonitor.instance) {
      ServiceHealthMonitor.instance = new ServiceHealthMonitor();
    }
    return ServiceHealthMonitor.instance;
  }

  constructor() {
    this.initializeServices();
    this.startPeriodicChecks();
  }

  private initializeServices() {
    this.SERVICE_DEFINITIONS.forEach(serviceName => {
      this.services.set(serviceName, {
        name: serviceName,
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime: 0,
        errorCount: 0,
        successCount: 0,
        uptime: Date.now(),
        dependencies: this.getServiceDependencies(serviceName)
      });
    });
  }

  private getServiceDependencies(serviceName: string): string[] {
    const dependencies: Record<string, string[]> = {
      'Authentication & User Management': ['database'],
      'Therapist Matching & Discovery': ['database', 'Authentication & User Management'],
      'Appointment Scheduling & Calendar': ['database', 'Authentication & User Management', 'Payment Processing & Billing'],
      'Video Sessions & Communication': ['websocket', 'Authentication & User Management'],
      'Messaging & Chat Support': ['database', 'Authentication & User Management', 'websocket'],
      'Payment Processing & Billing': ['stripe', 'database', 'Authentication & User Management'],
      'Progress Tracking & Analytics': ['database', 'Authentication & User Management'],
      'Resource Library & Content': ['database', 'Authentication & User Management'],
      'Crisis Support & Emergency': ['database', 'Authentication & User Management', 'sendgrid'],
      'Community Features & Forums': ['database', 'Authentication & User Management'],
      'Administrative Dashboard': ['database', 'Authentication & User Management'],
      'Reporting & Business Intelligence': ['database', 'Authentication & User Management'],
      'Forms & Data Collection': ['database', 'Authentication & User Management'],
      'API Integration & Webhooks': ['database', 'Authentication & User Management', 'stripe', 'sendgrid']
    };
    return dependencies[serviceName] || ['database'];
  }

  // Record service operation result
  recordServiceOperation(serviceName: string, success: boolean, responseTime: number) {
    const service = this.services.get(serviceName);
    if (!service) return;

    if (success) {
      service.successCount++;
      service.status = this.calculateServiceStatus(service);
    } else {
      service.errorCount++;
      service.status = this.calculateServiceStatus(service);
    }

    service.responseTime = responseTime;
    service.lastCheck = Date.now();
    this.services.set(serviceName, service);
  }

  private calculateServiceStatus(service: ServiceHealth): 'healthy' | 'degraded' | 'unhealthy' {
    const totalOperations = service.successCount + service.errorCount;
    if (totalOperations === 0) return 'healthy';

    const errorRate = service.errorCount / totalOperations;
    const responseTime = service.responseTime;

    // Unhealthy: >10% error rate or >5s response time
    if (errorRate > 0.1 || responseTime > 5000) {
      return 'unhealthy';
    }
    
    // Degraded: >2% error rate or >2s response time
    if (errorRate > 0.02 || responseTime > 2000) {
      return 'degraded';
    }

    return 'healthy';
  }

  // Get overall system health
  getSystemHealth() {
    const services = Array.from(this.services.values());
    const healthyServices = services.filter(s => s.status === 'healthy').length;
    const degradedServices = services.filter(s => s.status === 'degraded').length;
    const unhealthyServices = services.filter(s => s.status === 'unhealthy').length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (unhealthyServices > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedServices > 2) {
      overallStatus = 'degraded';
    }

    return {
      overall: overallStatus,
      services: {
        total: services.length,
        healthy: healthyServices,
        degraded: degradedServices,
        unhealthy: unhealthyServices
      },
      timestamp: Date.now()
    };
  }

  // Get detailed service health report
  getDetailedHealthReport() {
    const services = Array.from(this.services.values());
    const systemHealth = this.getSystemHealth();

    return {
      system: systemHealth,
      services: services.map(service => ({
        name: service.name,
        status: service.status,
        metrics: {
          uptime: Date.now() - service.uptime,
          responseTime: service.responseTime,
          errorRate: service.errorCount / Math.max(service.successCount + service.errorCount, 1),
          totalOperations: service.successCount + service.errorCount,
          lastCheck: service.lastCheck
        },
        dependencies: service.dependencies
      })),
      alerts: this.generateAlerts(services)
    };
  }

  private generateAlerts(services: ServiceHealth[]): Array<{level: string, service: string, message: string, timestamp: number}> {
    const alerts: Array<{level: string, service: string, message: string, timestamp: number}> = [];
    
    services.forEach(service => {
      if (service.status === 'unhealthy') {
        alerts.push({
          level: 'critical',
          service: service.name,
          message: `Service ${service.name} is unhealthy`,
          timestamp: Date.now()
        });
      } else if (service.status === 'degraded') {
        alerts.push({
          level: 'warning',
          service: service.name,
          message: `Service ${service.name} is experiencing degraded performance`,
          timestamp: Date.now()
        });
      }
    });

    return alerts;
  }

  private async startPeriodicChecks() {
    setInterval(() => {
      this.performHealthChecks();
    }, this.CHECK_INTERVAL);
  }

  private async performHealthChecks() {
    // Simulate health checks for services that don't have explicit endpoints
    for (const [serviceName, service] of Array.from(this.services)) {
      try {
        const startTime = Date.now();
        
        // Simulate health check based on service type
        await this.simulateServiceHealthCheck(serviceName);
        
        const responseTime = Date.now() - startTime;
        this.recordServiceOperation(serviceName, true, responseTime);
      } catch (error) {
        this.recordServiceOperation(serviceName, false, 0);
      }
    }
  }

  private async simulateServiceHealthCheck(serviceName: string): Promise<void> {
    // Simulate different response times and occasional failures
    const baseLatency = Math.random() * 100; // 0-100ms base latency
    
    // Add service-specific characteristics
    let serviceLatency = baseLatency;
    let failureRate = 0.001; // 0.1% base failure rate

    switch (serviceName) {
      case 'Video Sessions & Communication':
        serviceLatency += Math.random() * 200; // Video can be slower
        break;
      case 'Payment Processing & Billing':
        serviceLatency += Math.random() * 150; // External API dependency
        break;
      case 'Reporting & Business Intelligence':
        serviceLatency += Math.random() * 300; // Data processing intensive
        break;
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, serviceLatency));

    // Simulate occasional failures
    if (Math.random() < failureRate) {
      throw new Error(`Simulated failure for ${serviceName}`);
    }
  }
}

// Middleware to track service operations
export const serviceHealthMiddleware = (serviceName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const healthMonitor = ServiceHealthMonitor.getInstance();

    // Override res.end to capture response
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      const responseTime = Date.now() - startTime;
      const success = res.statusCode < 400;
      
      healthMonitor.recordServiceOperation(serviceName, success, responseTime);
      
      return originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};

// Enhanced health endpoint with detailed service information
export const detailedHealthEndpoint = (req: Request, res: Response) => {
  const healthMonitor = ServiceHealthMonitor.getInstance();
  const healthReport = healthMonitor.getDetailedHealthReport();
  
  const httpStatus = healthReport.system.overall === 'healthy' ? 200 :
                    healthReport.system.overall === 'degraded' ? 200 : 503;
  
  res.status(httpStatus).json(healthReport);
};

// ServiceHealthMonitor already exported as class above