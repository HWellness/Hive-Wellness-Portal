import { Request, Response, NextFunction } from "express";
import { logSecurityEvent } from "./security-audit";

// Enhanced rate limiting with smart detection and adaptive limits
interface RateLimitEntry {
  count: number;
  resetTime: number;
  violations: number;
  lastViolation: number;
  userAgent: string;
  userId?: string;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const blockedIPs = new Set<string>();
const trustedIPs = new Set<string>(["127.0.0.1", "::1", "localhost"]);

// Enhanced rate limiting configuration
export const ENHANCED_RATE_LIMIT_CONFIG = {
  // Base limits
  API_REQUESTS_PER_WINDOW: 100,
  AUTH_ATTEMPTS_PER_WINDOW: 25,
  FORM_SUBMISSIONS_PER_WINDOW: 20,
  PAYMENT_ATTEMPTS_PER_WINDOW: 20,
  ADMIN_OPERATIONS_PER_WINDOW: 30,

  // Time windows (in milliseconds)
  STANDARD_WINDOW: 15 * 60 * 1000, // 15 minutes
  AUTH_WINDOW: 15 * 60 * 1000, // 15 minutes
  PAYMENT_WINDOW: 15 * 60 * 1000, // 15 minutes
  ADMIN_WINDOW: 5 * 60 * 1000, // 5 minutes

  // Violation thresholds
  MAX_VIOLATIONS_BEFORE_BLOCK: 3,
  BLOCK_DURATION: 60 * 60 * 1000, // 1 hour
  VIOLATION_RESET_TIME: 24 * 60 * 60 * 1000, // 24 hours

  // Adaptive limits
  BURST_TOLERANCE: 1.5, // Allow 50% burst above normal limits
  AUTHENTICATED_USER_MULTIPLIER: 2, // Authenticated users get 2x limits
  PREMIUM_USER_MULTIPLIER: 3, // Premium users get 3x limits
};

// Smart bypass detection - more restrictive than current implementation
const shouldBypassRateLimit = (req: Request): boolean => {
  // Only bypass for essential health checks and critical endpoints
  const bypassPaths = ["/api/health", "/api/ping"];

  // Never bypass in production unless it's a health check
  if (process.env.NODE_ENV === "production") {
    return bypassPaths.some((path) => req.url === path);
  }

  // Development bypasses (more restrictive than current)
  return (
    bypassPaths.some((path) => req.url === path) ||
    req.method === "HEAD" ||
    trustedIPs.has(req.ip || "")
  );
};

// Enhanced rate limit creation with adaptive limits
// Get trusted IP consistently with session security
const getTrustedIP = (req: Request): string => {
  return req.headers["x-forwarded-for"]
    ? (req.headers["x-forwarded-for"] as string).split(",")[0].trim()
    : req.ip || "unknown";
};

const createEnhancedRateLimit = (
  windowMs: number,
  baseLimit: number,
  message: string,
  limitType: string
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check bypass conditions
    if (shouldBypassRateLimit(req)) {
      return next();
    }

    const key = getTrustedIP(req);
    const now = Date.now();

    // Check if IP is blocked
    if (blockedIPs.has(key)) {
      logSecurityEvent({
        type: "rate_limit",
        severity: "high",
        ip: key,
        userAgent: req.get("User-Agent") || "unknown",
        userId: (req as any).user?.id,
        details: {
          reason: "IP blocked due to repeated violations",
          limitType: limitType,
          blockedIP: key,
        },
        url: req.url,
        method: req.method,
      });

      return res.status(403).json({
        error: "IP address temporarily blocked due to repeated violations",
        code: "IP_BLOCKED",
        retryAfter: ENHANCED_RATE_LIMIT_CONFIG.BLOCK_DURATION / 1000,
      });
    }

    // Clean up old entries periodically
    if (Math.random() < 0.1) {
      for (const [k, v] of Array.from(rateLimitStore.entries())) {
        if (
          v.resetTime < now &&
          v.lastViolation < now - ENHANCED_RATE_LIMIT_CONFIG.VIOLATION_RESET_TIME
        ) {
          rateLimitStore.delete(k);
        }
      }
    }

    const current = rateLimitStore.get(key);

    // Calculate adaptive limit based on user status
    let adaptiveLimit = baseLimit;
    const user = (req as any).user;

    if (user) {
      // Authenticated users get higher limits
      adaptiveLimit *= ENHANCED_RATE_LIMIT_CONFIG.AUTHENTICATED_USER_MULTIPLIER;

      // Check for premium/admin users
      if (user.role === "admin" || user.role === "institution") {
        adaptiveLimit *= ENHANCED_RATE_LIMIT_CONFIG.PREMIUM_USER_MULTIPLIER;
      }
    }

    // Allow burst traffic with tolerance
    const burstLimit = Math.floor(adaptiveLimit * ENHANCED_RATE_LIMIT_CONFIG.BURST_TOLERANCE);

    // Initialize or reset counter
    if (!current || current.resetTime < now) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
        violations: current?.violations || 0,
        lastViolation: current?.lastViolation || 0,
        userAgent: req.get("User-Agent") || "unknown",
        userId: user?.id,
      });
      return next();
    }

    // Check if limit exceeded
    if (current.count >= burstLimit) {
      // Record violation
      current.violations++;
      current.lastViolation = now;

      logSecurityEvent({
        type: "rate_limit",
        severity:
          current.violations >= ENHANCED_RATE_LIMIT_CONFIG.MAX_VIOLATIONS_BEFORE_BLOCK
            ? "high"
            : "medium",
        ip: key,
        userAgent: req.get("User-Agent") || "unknown",
        userId: user?.id,
        details: {
          limitType: limitType,
          requestCount: current.count,
          limit: burstLimit,
          violations: current.violations,
          timeWindow: windowMs,
        },
        url: req.url,
        method: req.method,
      });

      // Block IP if too many violations
      if (current.violations >= ENHANCED_RATE_LIMIT_CONFIG.MAX_VIOLATIONS_BEFORE_BLOCK) {
        blockedIPs.add(key);

        // Auto-unblock after duration
        setTimeout(() => {
          blockedIPs.delete(key);
        }, ENHANCED_RATE_LIMIT_CONFIG.BLOCK_DURATION);

        return res.status(403).json({
          error: "IP address blocked due to repeated rate limit violations",
          code: "IP_BLOCKED",
          retryAfter: ENHANCED_RATE_LIMIT_CONFIG.BLOCK_DURATION / 1000,
        });
      }

      return res.status(429).json({
        error: message,
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil((current.resetTime - now) / 1000),
        limit: burstLimit,
        remaining: 0,
        resetTime: new Date(current.resetTime).toISOString(),
      });
    }

    // Increment counter
    current.count++;

    // Add rate limit headers
    res.setHeader("X-RateLimit-Limit", burstLimit);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, burstLimit - current.count));
    res.setHeader("X-RateLimit-Reset", new Date(current.resetTime).toISOString());

    next();
  };
};

// Enhanced rate limiters with adaptive limits
export const enhancedApiLimiter = createEnhancedRateLimit(
  ENHANCED_RATE_LIMIT_CONFIG.STANDARD_WINDOW,
  ENHANCED_RATE_LIMIT_CONFIG.API_REQUESTS_PER_WINDOW,
  "Too many API requests. Please slow down.",
  "api"
);

export const enhancedAuthLimiter = createEnhancedRateLimit(
  ENHANCED_RATE_LIMIT_CONFIG.AUTH_WINDOW,
  ENHANCED_RATE_LIMIT_CONFIG.AUTH_ATTEMPTS_PER_WINDOW,
  "Too many authentication attempts. Please try again later.",
  "auth"
);

export const enhancedFormLimiter = createEnhancedRateLimit(
  ENHANCED_RATE_LIMIT_CONFIG.STANDARD_WINDOW,
  ENHANCED_RATE_LIMIT_CONFIG.FORM_SUBMISSIONS_PER_WINDOW,
  "Too many form submissions. Please wait before submitting again.",
  "form"
);

export const enhancedPaymentLimiter = createEnhancedRateLimit(
  ENHANCED_RATE_LIMIT_CONFIG.PAYMENT_WINDOW,
  ENHANCED_RATE_LIMIT_CONFIG.PAYMENT_ATTEMPTS_PER_WINDOW,
  "Too many payment attempts. Please try again later.",
  "payment"
);

export const enhancedAdminLimiter = createEnhancedRateLimit(
  ENHANCED_RATE_LIMIT_CONFIG.ADMIN_WINDOW,
  ENHANCED_RATE_LIMIT_CONFIG.ADMIN_OPERATIONS_PER_WINDOW,
  "Too many admin operations. Please wait before continuing.",
  "admin"
);

// Endpoint-specific rate limiters for sensitive operations
export const sensitiveOperationLimiter = createEnhancedRateLimit(
  15 * 60 * 1000, // 15 minutes (increased from 5 to match password reset)
  15, // Allow legitimate retry attempts while preventing abuse (increased from 5)
  "Too many sensitive operations. Please wait before trying again.",
  "sensitive"
);

// Password reset with enhanced security
export const enhancedPasswordResetLimiter = createEnhancedRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // Maximum 10 attempts per 15 minutes (allows for typos while preventing abuse)
  "Too many password reset attempts. Please wait before trying again.",
  "password_reset"
);

// Get rate limiting statistics
export const getRateLimitingStats = () => {
  const now = Date.now();
  const stats = {
    totalActiveKeys: rateLimitStore.size,
    blockedIPs: blockedIPs.size,
    totalViolations: 0,
    recentViolations: 0,
    topOffenders: [] as Array<{ ip: string; violations: number; lastViolation: string }>,
  };

  const violationData: Array<{ ip: string; violations: number; lastViolation: number }> = [];

  rateLimitStore.forEach((data, ip) => {
    stats.totalViolations += data.violations;

    if (data.lastViolation > now - 24 * 60 * 60 * 1000) {
      stats.recentViolations += data.violations;
    }

    if (data.violations > 0) {
      violationData.push({
        ip: ip,
        violations: data.violations,
        lastViolation: data.lastViolation,
      });
    }
  });

  // Sort by violations and get top 10
  stats.topOffenders = violationData
    .sort((a, b) => b.violations - a.violations)
    .slice(0, 10)
    .map((item) => ({
      ip: item.ip,
      violations: item.violations,
      lastViolation: new Date(item.lastViolation).toISOString(),
    }));

  return stats;
};

// Clear rate limits for testing/admin purposes
export const clearRateLimitsForIP = (ip: string) => {
  rateLimitStore.delete(ip);
  blockedIPs.delete(ip);

  logSecurityEvent({
    type: "rate_limit",
    severity: "low",
    ip: ip,
    userAgent: "admin",
    details: {
      action: "rate_limit_cleared",
      ip: ip,
    },
    url: "/admin/clear-rate-limits",
    method: "POST",
  });
};

// Whitelist trusted IPs (for admin use)
export const addTrustedIP = (ip: string) => {
  trustedIPs.add(ip);
  blockedIPs.delete(ip);
  rateLimitStore.delete(ip);
};

export const removeTrustedIP = (ip: string) => {
  trustedIPs.delete(ip);
};
