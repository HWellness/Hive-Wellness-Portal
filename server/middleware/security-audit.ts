import { Request, Response, NextFunction } from 'express';
import { writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';

// Security audit logging
interface SecurityEvent {
  timestamp: string;
  type: 'authentication' | 'authorization' | 'input_validation' | 'rate_limit' | 'suspicious_activity' | 'data_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  ip: string;
  userAgent: string;
  userId?: string;
  details: any;
  url: string;
  method: string;
}

const auditLog: SecurityEvent[] = [];

// Log security events
export const logSecurityEvent = (event: Omit<SecurityEvent, 'timestamp'>) => {
  const securityEvent: SecurityEvent = {
    ...event,
    timestamp: new Date().toISOString()
  };
  
  auditLog.push(securityEvent);
  
  // Write to file for persistence
  try {
    const logFile = join(process.cwd(), 'security-audit.log');
    appendFileSync(logFile, JSON.stringify(securityEvent) + '\n');
  } catch (error) {
    console.error('Failed to write security audit log:', error);
  }
  
  // Alert on critical events
  if (event.severity === 'critical') {
    console.error('CRITICAL SECURITY EVENT:', securityEvent);
    // In production, this would trigger alerts (email, Slack, etc.)
  }
};

// Audit middleware for authentication events
export const auditAuthenticationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data: any) {
    if (req.path.includes('/auth/')) {
      logSecurityEvent({
        type: 'authentication',
        severity: res.statusCode === 200 ? 'low' : 'medium',
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        userId: (req as any).user?.id,
        details: {
          path: req.path,
          success: res.statusCode === 200,
          statusCode: res.statusCode
        },
        url: req.url,
        method: req.method
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Monitor failed authorization attempts
export const auditAuthorizationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data: any) {
    if (res.statusCode === 403) {
      logSecurityEvent({
        type: 'authorization',
        severity: 'medium',
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        userId: (req as any).user?.id,
        details: {
          path: req.path,
          reason: 'Access forbidden',
          statusCode: res.statusCode
        },
        url: req.url,
        method: req.method
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Monitor suspicious activity patterns with profile data exceptions
export const suspiciousActivityMonitor = (req: Request, res: Response, next: NextFunction) => {
  // Skip monitoring for legitimate profile endpoints
  const profileEndpoints = [
    '/api/client/profile',
    '/api/therapist/profile',
    '/api/admin/profile',
    '/api/user/profile'
  ];
  
  const isProfileEndpoint = profileEndpoints.some(endpoint => req.path.includes(endpoint));
  
  if (isProfileEndpoint) {
    // Only monitor for clearly malicious patterns in profile data
    const dangerousPatterns = [
      // XSS attempts
      /<script|javascript:|vbscript:|onload=|onerror=/i,
      // Path traversal
      /\.\.[\/\\]/,
      // Common attack tools
      /sqlmap|nmap|burp|acunetix|nikto|dirbuster/i
    ];
    
    const requestContent = JSON.stringify({
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers
    });
    
    const isDangerous = dangerousPatterns.some(pattern => pattern.test(requestContent));
    const userAgent = req.get('User-Agent') || '';
    const isSuspiciousUserAgent = dangerousPatterns.some(pattern => pattern.test(userAgent));
    
    if (isDangerous || isSuspiciousUserAgent) {
      logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'high',
        ip: req.ip || 'unknown',
        userAgent: userAgent,
        userId: (req as any).user?.id,
        details: {
          reason: 'Dangerous patterns detected on profile endpoint',
          patterns: dangerousPatterns.filter(pattern => pattern.test(requestContent)),
          requestContent: requestContent.substring(0, 1000)
        },
        url: req.url,
        method: req.method
      });
    }
  } else {
    // Full monitoring for non-profile endpoints
    const suspiciousPatterns = [
      // SQL injection attempts
      /(\bselect\b|\bunion\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b)/i,
      // XSS attempts
      /<script|javascript:|vbscript:|onload=|onerror=/i,
      // Path traversal
      /\.\.[\/\\]/,
      // Command injection
      /[;&|`$\(\)]/,
      // Common attack tools
      /sqlmap|nmap|burp|acunetix|nikto|dirbuster/i
    ];
    
    const requestContent = JSON.stringify({
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers
    });
    
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestContent));
    const userAgent = req.get('User-Agent') || '';
    const isSuspiciousUserAgent = suspiciousPatterns.some(pattern => pattern.test(userAgent));
    
    if (isSuspicious || isSuspiciousUserAgent) {
      logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'high',
        ip: req.ip || 'unknown',
        userAgent: userAgent,
        userId: (req as any).user?.id,
        details: {
          reason: 'Suspicious patterns detected',
          patterns: suspiciousPatterns.filter(pattern => pattern.test(requestContent)),
          requestContent: requestContent.substring(0, 1000)
        },
        url: req.url,
        method: req.method
      });
    }
  }
  
  next();
};

// Monitor data access patterns
export const dataAccessMonitor = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'GET' && req.path.includes('/api/')) {
    const originalSend = res.send;
    
    res.send = function(data: any) {
      // Log access to sensitive endpoints
      const sensitiveEndpoints = [
        '/api/admin/',
        '/api/user/',
        '/api/payments/',
        '/api/therapist/',
        '/api/client/'
      ];
      
      if (sensitiveEndpoints.some(endpoint => req.path.includes(endpoint))) {
        logSecurityEvent({
          type: 'data_access',
          severity: 'low',
          ip: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          userId: (req as any).user?.id,
          details: {
            endpoint: req.path,
            success: res.statusCode === 200,
            statusCode: res.statusCode
          },
          url: req.url,
          method: req.method
        });
      }
      
      return originalSend.call(this, data);
    };
  }
  
  next();
};

// Get security audit report
export const getSecurityAuditReport = () => {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentEvents = auditLog.filter(event => new Date(event.timestamp) > last24Hours);
  
  const report = {
    summary: {
      total_events: recentEvents.length,
      critical_events: recentEvents.filter(e => e.severity === 'critical').length,
      high_severity_events: recentEvents.filter(e => e.severity === 'high').length,
      medium_severity_events: recentEvents.filter(e => e.severity === 'medium').length,
      low_severity_events: recentEvents.filter(e => e.severity === 'low').length
    },
    event_types: {
      authentication: recentEvents.filter(e => e.type === 'authentication').length,
      authorization: recentEvents.filter(e => e.type === 'authorization').length,
      input_validation: recentEvents.filter(e => e.type === 'input_validation').length,
      rate_limit: recentEvents.filter(e => e.type === 'rate_limit').length,
      suspicious_activity: recentEvents.filter(e => e.type === 'suspicious_activity').length,
      data_access: recentEvents.filter(e => e.type === 'data_access').length
    },
    top_ips: getTopIPs(recentEvents),
    recent_events: recentEvents.slice(-50) // Last 50 events
  };
  
  return report;
};

// Get top IPs by event count
const getTopIPs = (events: SecurityEvent[]) => {
  const ipCounts = new Map<string, number>();
  
  events.forEach(event => {
    const count = ipCounts.get(event.ip) || 0;
    ipCounts.set(event.ip, count + 1);
  });
  
  return Array.from(ipCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, count }));
};

// Clear old audit logs (keep last 30 days)
export const cleanupAuditLogs = () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const validEvents = auditLog.filter(event => new Date(event.timestamp) > thirtyDaysAgo);
  
  auditLog.splice(0, auditLog.length, ...validEvents);
};

// Run cleanup daily
setInterval(cleanupAuditLogs, 24 * 60 * 60 * 1000);