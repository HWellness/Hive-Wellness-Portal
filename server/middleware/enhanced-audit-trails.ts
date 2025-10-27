import { Request, Response, NextFunction } from "express";
import { logSecurityEvent } from "./security-audit";
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// Enhanced audit trail configuration
export const AUDIT_CONFIG = {
  LOG_RETENTION_DAYS: 90,
  CRITICAL_EVENT_ALERT_THRESHOLD: 5, // Alert after 5 critical events in 1 hour
  SUSPICIOUS_PATTERN_THRESHOLD: 10, // Alert after 10 suspicious events from same IP
  HIGH_VALUE_OPERATIONS: [
    "/api/admin/",
    "/api/payments/",
    "/api/user/delete",
    "/api/auth/reset-password",
    "/api/auth/change-password",
    "/api/stripe/",
    "/api/admin-calendar/",
    "/api/google-workspace/",
  ],
  SENSITIVE_DATA_FIELDS: ["password", "token", "secret", "key", "ssn", "credit_card"],
};

// Enhanced audit event types
interface EnhancedAuditEvent {
  id: string;
  timestamp: string;
  category: "security" | "data_access" | "system" | "user_action" | "compliance";
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  ip: string;
  userAgent: string;
  userId?: string;
  sessionId?: string;
  details: any;
  url: string;
  method: string;
  responseStatus?: number;
  responseTime?: number;
  dataAccessed?: string[];
  complianceFlags?: string[];
  riskScore: number;
}

// In-memory store for recent events (for pattern detection)
const recentEvents = new Map<string, EnhancedAuditEvent[]>();
const alertThresholds = new Map<string, number>();

// Create audit log directory if it doesn't exist
const auditLogDir = join(process.cwd(), "audit-logs");
if (!existsSync(auditLogDir)) {
  mkdirSync(auditLogDir, { recursive: true });
}

// Enhanced logging function with sensitive data redaction
export const logEnhancedAuditEvent = (
  event: Omit<EnhancedAuditEvent, "id" | "timestamp" | "riskScore">,
  isSystemGenerated: boolean = false
) => {
  // Redact sensitive data before logging
  const sanitizedEvent = redactSensitiveData(event);

  const enhancedEvent: EnhancedAuditEvent = {
    ...sanitizedEvent,
    id: generateEventId(),
    timestamp: new Date().toISOString(),
    riskScore: calculateRiskScore(sanitizedEvent),
  };

  // Store in memory for pattern detection
  const key = event.ip;
  if (!recentEvents.has(key)) {
    recentEvents.set(key, []);
  }
  recentEvents.get(key)!.push(enhancedEvent);

  // Keep only last 100 events per IP
  const ipEvents = recentEvents.get(key)!;
  if (ipEvents.length > 100) {
    ipEvents.splice(0, ipEvents.length - 100);
  }

  // Write to daily log file
  try {
    const today = new Date().toISOString().split("T")[0];
    const logFile = join(auditLogDir, `audit-${today}.log`);
    appendFileSync(logFile, JSON.stringify(enhancedEvent) + "\n");
  } catch (error) {
    console.error("Failed to write enhanced audit log:", error);
  }

  // Check for suspicious patterns (skip for system-generated events to prevent recursion)
  if (!isSystemGenerated) {
    detectSuspiciousPatterns(enhancedEvent, key);
  }

  // Alert on critical events
  if (event.severity === "critical") {
    handleCriticalEvent(enhancedEvent);
  }

  // Also log to existing security audit system
  logSecurityEvent({
    type: event.type as any,
    severity: event.severity,
    ip: event.ip,
    userAgent: event.userAgent,
    userId: event.userId,
    details: event.details,
    url: event.url,
    method: event.method,
  });
};

// Calculate risk score based on event characteristics
const calculateRiskScore = (
  event: Omit<EnhancedAuditEvent, "id" | "timestamp" | "riskScore">
): number => {
  let score = 0;

  // Base score by severity
  switch (event.severity) {
    case "low":
      score += 1;
      break;
    case "medium":
      score += 3;
      break;
    case "high":
      score += 7;
      break;
    case "critical":
      score += 10;
      break;
  }

  // High-value operations
  if (AUDIT_CONFIG.HIGH_VALUE_OPERATIONS.some((op) => event.url.includes(op))) {
    score += 3;
  }

  // Multiple failed attempts
  if (event.details?.success === false) {
    score += 2;
  }

  // Suspicious user agent
  const suspiciousUA = ["curl", "wget", "python", "bot", "scanner", "sqlmap"];
  if (suspiciousUA.some((ua) => event.userAgent.toLowerCase().includes(ua))) {
    score += 5;
  }

  // Non-standard hours (assuming business is 9-17 UTC)
  const hour = new Date().getUTCHours();
  if (hour < 9 || hour > 17) {
    score += 1;
  }

  return Math.min(score, 20); // Cap at 20
};

// Generate unique event ID
const generateEventId = (): string => {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Detect suspicious patterns
const detectSuspiciousPatterns = (event: EnhancedAuditEvent, ipKey: string) => {
  const ipEvents = recentEvents.get(ipKey) || [];
  const lastHour = Date.now() - 60 * 60 * 1000;
  const recentIpEvents = ipEvents.filter((e) => new Date(e.timestamp).getTime() > lastHour);

  // Pattern 1: High frequency of failed operations
  const failedEvents = recentIpEvents.filter((e) => e.details?.success === false);
  if (failedEvents.length >= 10) {
    logEnhancedAuditEvent(
      {
        category: "security",
        type: "suspicious_pattern_detected",
        severity: "high",
        ip: event.ip,
        userAgent: event.userAgent,
        userId: event.userId,
        details: {
          pattern: "high_failure_rate",
          failedAttempts: failedEvents.length,
          timeWindow: "1 hour",
        },
        url: "/security/pattern-detection",
        method: "SYSTEM",
      },
      true
    ); // Mark as system-generated to prevent recursion
  }

  // Pattern 2: Rapid succession of different endpoints
  const uniqueEndpoints = new Set(recentIpEvents.map((e) => e.url));
  if (uniqueEndpoints.size >= 20 && recentIpEvents.length >= 50) {
    logEnhancedAuditEvent(
      {
        category: "security",
        type: "suspicious_pattern_detected",
        severity: "high",
        ip: event.ip,
        userAgent: event.userAgent,
        userId: event.userId,
        details: {
          pattern: "endpoint_scanning",
          uniqueEndpoints: uniqueEndpoints.size,
          totalRequests: recentIpEvents.length,
          timeWindow: "1 hour",
        },
        url: "/security/pattern-detection",
        method: "SYSTEM",
      },
      true
    ); // Mark as system-generated to prevent recursion
  }

  // Pattern 3: High risk score accumulation
  const totalRiskScore = recentIpEvents.reduce((sum, e) => sum + e.riskScore, 0);
  if (totalRiskScore >= 50) {
    logEnhancedAuditEvent(
      {
        category: "security",
        type: "suspicious_pattern_detected",
        severity: "critical",
        ip: event.ip,
        userAgent: event.userAgent,
        userId: event.userId,
        details: {
          pattern: "high_risk_accumulation",
          totalRiskScore: totalRiskScore,
          eventCount: recentIpEvents.length,
          timeWindow: "1 hour",
        },
        url: "/security/pattern-detection",
        method: "SYSTEM",
      },
      true
    ); // Mark as system-generated to prevent recursion
  }
};

// Handle critical events
const handleCriticalEvent = (event: EnhancedAuditEvent) => {
  console.error("CRITICAL SECURITY EVENT:", {
    id: event.id,
    type: event.type,
    ip: event.ip,
    userId: event.userId,
    details: event.details,
    timestamp: event.timestamp,
  });

  // In production, this would trigger:
  // - Email alerts to security team
  // - Slack notifications
  // - Integration with SIEM systems
  // - Automated response actions
};

// Middleware for comprehensive request auditing
export const comprehensiveAuditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const originalSend = res.send;

  // Capture response data
  res.send = function (data: any) {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Determine if this is a high-value operation
    const isHighValueOp = AUDIT_CONFIG.HIGH_VALUE_OPERATIONS.some((op) => req.url.includes(op));
    const isFailure = statusCode >= 400;
    const isCritical = statusCode >= 500 || (isFailure && isHighValueOp);

    // Determine category
    let category: EnhancedAuditEvent["category"] = "user_action";
    if (
      req.url.includes("/api/auth/") ||
      req.url.includes("/login") ||
      req.url.includes("/logout")
    ) {
      category = "security";
    } else if (req.url.includes("/api/admin/") || req.url.includes("/api/payments/")) {
      category = "compliance";
    } else if (req.method === "GET" && req.url.includes("/api/")) {
      category = "data_access";
    }

    // Determine severity
    let severity: EnhancedAuditEvent["severity"] = "low";
    if (isCritical) {
      severity = "critical";
    } else if (isFailure && isHighValueOp) {
      severity = "high";
    } else if (isFailure || isHighValueOp) {
      severity = "medium";
    }

    // Check for sensitive data access
    const dataAccessed: string[] = [];
    if (req.url.includes("/profile") || req.url.includes("/user/")) {
      dataAccessed.push("user_profile");
    }
    if (req.url.includes("/payment") || req.url.includes("/billing")) {
      dataAccessed.push("payment_data");
    }
    if (req.url.includes("/admin/")) {
      dataAccessed.push("admin_data");
    }

    // Check for compliance flags
    const complianceFlags: string[] = [];
    if (dataAccessed.length > 0) {
      complianceFlags.push("data_processing");
    }
    if (req.url.includes("/export") || req.url.includes("/download")) {
      complianceFlags.push("data_export");
    }

    // Log the audit event
    logEnhancedAuditEvent({
      category: category,
      type: `${req.method.toLowerCase()}_request`,
      severity: severity,
      ip: req.ip || "unknown",
      userAgent: req.get("User-Agent") || "unknown",
      userId: (req as any).user?.id,
      sessionId: (req.session as any)?.id,
      details: {
        method: req.method,
        url: req.url,
        statusCode: statusCode,
        success: statusCode < 400,
        responseTime: responseTime,
        requestSize: req.get("Content-Length") || 0,
        responseSize: data ? JSON.stringify(data).length : 0,
        query: Object.keys(req.query).length > 0 ? sanitizeRequestData(req.query) : undefined,
        params: Object.keys(req.params).length > 0 ? sanitizeRequestData(req.params) : undefined,
        body: req.body ? sanitizeRequestData(req.body) : undefined,
      },
      url: req.url,
      method: req.method,
      responseStatus: statusCode,
      responseTime: responseTime,
      dataAccessed: dataAccessed.length > 0 ? dataAccessed : undefined,
      complianceFlags: complianceFlags.length > 0 ? complianceFlags : undefined,
    });

    return originalSend.call(this, data);
  };

  next();
};

// Get enhanced audit statistics
export const getEnhancedAuditStats = (hours: number = 24) => {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const allEvents: EnhancedAuditEvent[] = [];

  // Collect all recent events
  recentEvents.forEach((events) => {
    events.forEach((event) => {
      if (new Date(event.timestamp).getTime() > cutoff) {
        allEvents.push(event);
      }
    });
  });

  return {
    totalEvents: allEvents.length,
    eventsByCategory: {
      security: allEvents.filter((e) => e.category === "security").length,
      data_access: allEvents.filter((e) => e.category === "data_access").length,
      system: allEvents.filter((e) => e.category === "system").length,
      user_action: allEvents.filter((e) => e.category === "user_action").length,
      compliance: allEvents.filter((e) => e.category === "compliance").length,
    },
    eventsBySeverity: {
      low: allEvents.filter((e) => e.severity === "low").length,
      medium: allEvents.filter((e) => e.severity === "medium").length,
      high: allEvents.filter((e) => e.severity === "high").length,
      critical: allEvents.filter((e) => e.severity === "critical").length,
    },
    averageRiskScore:
      allEvents.length > 0
        ? allEvents.reduce((sum, e) => sum + e.riskScore, 0) / allEvents.length
        : 0,
    topRiskIPs: getTopRiskIPs(allEvents),
    complianceEvents: allEvents.filter((e) => e.complianceFlags && e.complianceFlags.length > 0)
      .length,
    sensitiveDataAccess: allEvents.filter((e) => e.dataAccessed && e.dataAccessed.length > 0)
      .length,
  };
};

// Redact sensitive data from event details
const redactSensitiveData = (event: any): any => {
  const redacted = JSON.parse(JSON.stringify(event)); // Deep clone

  const redactRecursive = (obj: any): any => {
    if (obj && typeof obj === "object") {
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();

        // Check if key contains sensitive field names
        if (AUDIT_CONFIG.SENSITIVE_DATA_FIELDS.some((field) => lowerKey.includes(field))) {
          obj[key] = "[REDACTED]";
        } else if (typeof value === "object" && value !== null) {
          redactRecursive(value);
        } else if (typeof value === "string") {
          // Redact patterns that look like sensitive data
          if (value.length > 20 && /^[A-Za-z0-9+/]+=*$/.test(value)) {
            obj[key] = "[REDACTED_BASE64]";
          } else if (/^[a-f0-9]{32,}$/i.test(value)) {
            obj[key] = "[REDACTED_HASH]";
          } else if (/^sk_|^pk_|^rk_|^whsec_/.test(value)) {
            obj[key] = "[REDACTED_API_KEY]";
          }
        }
      }
    }
    return obj;
  };

  return redactRecursive(redacted);
};

// Get top risk IPs
const getTopRiskIPs = (events: EnhancedAuditEvent[]) => {
  const ipRiskScores = new Map<string, number>();

  events.forEach((event) => {
    const currentScore = ipRiskScores.get(event.ip) || 0;
    ipRiskScores.set(event.ip, currentScore + event.riskScore);
  });

  return Array.from(ipRiskScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ip, score]) => ({ ip, totalRiskScore: score }));
};

// Cleanup old audit logs
export const cleanupOldAuditLogs = () => {
  const cutoff = Date.now() - AUDIT_CONFIG.LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  // Clean up in-memory events
  recentEvents.forEach((events, ip) => {
    const validEvents = events.filter((event) => new Date(event.timestamp).getTime() > cutoff);
    if (validEvents.length === 0) {
      recentEvents.delete(ip);
    } else {
      recentEvents.set(ip, validEvents);
    }
  });

  console.log(`Cleaned up audit logs older than ${AUDIT_CONFIG.LOG_RETENTION_DAYS} days`);
};

// Sanitize request data to remove sensitive information
const sanitizeRequestData = (data: any): any => {
  if (!data || typeof data !== "object") return data;

  const sanitized = { ...data };

  AUDIT_CONFIG.SENSITIVE_DATA_FIELDS.forEach((field) => {
    Object.keys(sanitized).forEach((key) => {
      if (key.toLowerCase().includes(field)) {
        sanitized[key] = "[REDACTED]";
      }
    });
  });

  return sanitized;
};

// Run cleanup daily
setInterval(cleanupOldAuditLogs, 24 * 60 * 60 * 1000);
