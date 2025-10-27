import { Request, Response, NextFunction } from "express";
import { sql } from "drizzle-orm";
import * as crypto from "crypto";
import { logger } from "../lib/logger";

// Simple rate limiting implementation without external dependencies
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Function to clear rate limit for an IP (useful for demo testing)
export const clearRateLimit = (ip: string) => {
  rateLimitStore.delete(ip);
};

const createRateLimit = (windowMs: number, max: number, message: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Bypass rate limiting for health checks, demo accounts, testing, and booking
    if (
      req.method === "HEAD" ||
      req.url.includes("/health") ||
      req.url.includes("/demo-login") ||
      req.url.includes("/demo") ||
      req.url.includes("/book-widget") ||
      req.url.includes("/book-introduction-call") ||
      req.url.includes("/payment-intent") ||
      req.url.includes("/clear-rate-limits") ||
      process.env.NODE_ENV === "development"
    ) {
      return next();
    }

    const key = req.ip || "unknown";
    const now = Date.now();

    // Clean up old entries
    if (Math.random() < 0.1) {
      for (const [k, v] of Array.from(rateLimitStore.entries())) {
        if (v.resetTime < now) {
          rateLimitStore.delete(k);
        }
      }
    }

    const current = rateLimitStore.get(key);

    if (!current || current.resetTime < now) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });

      // Add rate limit headers for transparency
      res.setHeader("X-RateLimit-Limit", max.toString());
      res.setHeader("X-RateLimit-Remaining", (max - 1).toString());
      res.setHeader("X-RateLimit-Reset", new Date(now + windowMs).toISOString());

      return next();
    }

    // Add rate limit headers
    res.setHeader("X-RateLimit-Limit", max.toString());
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - current.count).toString());
    res.setHeader("X-RateLimit-Reset", new Date(current.resetTime).toISOString());

    if (current.count >= max) {
      return res.status(429).json({ error: message });
    }

    current.count++;
    next();
  };
};

// Enhanced rate limiting for production security
export const apiLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100,
  "Too many requests from this IP, please try again later."
);

export const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  25, // Increased limit for demo testing
  "Too many authentication attempts, please try again later."
);

export const formLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes (shorter window)
  20, // More reasonable limit for legitimate use
  "Too many form submissions, please try again later."
);

// Additional security limiters for sensitive operations
export const paymentLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  20, // More reasonable limit for payment operations
  "Too many payment attempts, please try again later."
);

export const adminLimiter = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  20, // Limit admin operations
  "Too many admin operations, please try again later."
);

export const resetPasswordLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  3, // Maximum 3 password reset attempts per hour
  "Too many password reset attempts, please try again later."
);

// Enhanced security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Check if this is the iframe-embeddable booking route
  const isIframeRoute =
    req.path === "/book-admin-call-client-new" ||
    req.path === "/iframe/portal" ||
    req.path === "/portal" ||
    req.path.startsWith("/iframe/") ||
    req.query.iframe === "true" ||
    req.headers.referer?.includes("hive-wellness.co.uk");

  // For iframe routes, set minimal security headers and skip CSP
  if (isIframeRoute) {
    res.removeHeader("X-Powered-By");
    res.setHeader("Server", "Hive-Wellness");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=(), fullscreen=(self), gyroscope=(), payment=()"
    );

    // NO frame restrictions for iframe routes
    res.removeHeader("X-Frame-Options");

    // Minimal CSP for iframe embedding
    const iframeCSP = [
      "default-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:",
      "style-src 'self' 'unsafe-inline' https: data:",
      "font-src 'self' https: data:",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' wss: https: ws:",
      "frame-src 'self' https:",
      "frame-ancestors *",
    ].join("; ");

    res.setHeader("Content-Security-Policy", iframeCSP);
    logger.debug("IFRAME route detected - CSP bypassed for embedding", { path: req.path });
    return next();
  }

  // Regular security headers for non-iframe routes
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.removeHeader("X-Powered-By");
  res.setHeader("Server", "Hive-Wellness");
  res.setHeader("X-Frame-Options", "DENY");

  // Enhanced XSS protection
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Strict referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Force HTTPS (HSTS)
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

  // Permissions Policy - restrict browser features
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), fullscreen=(self), gyroscope=(), payment=()"
  );

  // Prevent downloading of executable files
  res.setHeader("X-Download-Options", "noopen");

  // Prevent content type sniffing in IE
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Enhanced Content Security Policy for production
  const isProduction = process.env.NODE_ENV === "production";
  let csp = [];

  // Check if iframe embedding should be allowed
  const allowIframeEmbedding =
    req.path === "/iframe/portal" ||
    req.path === "/portal" ||
    req.path === "/book-admin-call-client-new" ||
    req.path.startsWith("/iframe/") ||
    req.query.iframe === "true" ||
    req.headers.referer?.includes("staging2.hive-wellness.co.uk") ||
    req.headers.referer?.includes("hive-wellness.co.uk");

  // Debug logging to see what's happening
  console.log(
    `🔐 Path: ${req.path}, RefererCheck: ${req.headers.referer?.includes("hive-wellness.co.uk")}, AllowIframe: ${allowIframeEmbedding}`
  );

  if (isProduction) {
    // Production CSP - More restrictive
    csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com https://connect.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' wss: https: ws: https://api.stripe.com https://checkout.stripe.com",
      "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://connect.stripe.com https://meet.google.com https://*.daily.co https://daily.co",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      allowIframeEmbedding ? "frame-ancestors *" : "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ];
  } else {
    // Development CSP - More permissive for development with proper Stripe support
    csp = [
      "default-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob: https://js.stripe.com https://checkout.stripe.com",
      "style-src 'self' 'unsafe-inline' https: data: https://checkout.stripe.com",
      "font-src 'self' https: data:",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' wss: https: ws: https://api.stripe.com https://checkout.stripe.com",
      "frame-src 'self' https: https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com https://meet.google.com https://*.daily.co https://daily.co",
      "manifest-src 'self'",
      "worker-src 'self' blob:",
      "child-src 'self' https://js.stripe.com",
      allowIframeEmbedding ? "frame-ancestors *" : "frame-ancestors 'none'",
    ];
  }

  // Debug logging to see what's happening
  if (allowIframeEmbedding) {
    console.log(
      `🔐 Iframe embedding allowed for path: ${req.path}, referer: ${req.headers.referer}`
    );
  }

  res.setHeader("Content-Security-Policy", csp.join("; "));

  // Additional security headers for HIPAA compliance
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  next();
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
    };

    // Log errors and slow requests
    if (res.statusCode >= 400 || duration > 1000) {
      console.error("Request log:", logData);
    } else if (process.env.NODE_ENV === "development") {
      console.log("Request log:", logData);
    }
  });

  next();
};

// Enhanced error handling middleware
export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  const errorLog = {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.get("User-Agent"),
    ip: req.ip,
    userId: (req as any).user?.id || "anonymous",
  };

  console.error("Application error:", errorLog);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === "development";

  res.status(error.status || 500).json({
    message: isDevelopment ? error.message : "Internal server error",
    ...(isDevelopment && { stack: error.stack }),
  });
};

// Enhanced health check endpoint with actual database testing
export const healthCheck = async (req: Request, res: Response) => {
  try {
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
      database: "connected",
      services: {
        authentication: "operational",
        payments: "operational",
        forms: "operational",
        email: "operational",
      },
    };

    // Test database connectivity in production
    if (process.env.NODE_ENV === "production") {
      try {
        // Import db directly to avoid circular dependencies
        const { db } = await import("../db");
        await db.execute(sql`SELECT 1`);
        healthStatus.database = "connected";
      } catch (dbError) {
        healthStatus.database = "disconnected";
        healthStatus.status = "unhealthy";
        console.error("Database health check failed:", dbError);
      }
    }

    const statusCode = healthStatus.status === "healthy" ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    console.error("Health check error:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
    });
  }
};

// Advanced input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (obj: any): any => {
    if (typeof obj === "string") {
      // Comprehensive XSS prevention
      return (
        obj
          // Remove script tags
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          // Remove javascript: protocol
          .replace(/javascript:/gi, "")
          // Remove event handlers
          .replace(/on\w+\s*=/gi, "")
          // Remove data: URLs that could contain scripts
          .replace(/data:(?!image\/)[^;]*;base64/gi, "")
          // Remove eval and similar dangerous functions
          .replace(/eval\s*\(/gi, "")
          .replace(/setTimeout\s*\(/gi, "")
          .replace(/setInterval\s*\(/gi, "")
          // Remove HTML comments that could hide malicious code
          .replace(/<!--[\s\S]*?-->/g, "")
          // Remove style attributes that could contain expressions
          .replace(/style\s*=\s*[^>]*expression\s*\(/gi, "")
          // Remove vbscript: protocol
          .replace(/vbscript:/gi, "")
          // Remove object and embed tags
          .replace(/<(object|embed|applet|iframe|frame|frameset|meta|link|base)[^>]*>/gi, "")
          // Remove form tags that could be used for CSRF
          .replace(/<\/?form[^>]*>/gi, "")
          // Limit length to prevent DoS attacks
          .substring(0, 10000)
      );
    } else if (Array.isArray(obj)) {
      return obj.map(sanitize);
    } else if (obj && typeof obj === "object") {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize keys as well
        const sanitizedKey = typeof key === "string" ? sanitize(key) : key;
        sanitized[sanitizedKey] = sanitize(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

// SQL injection prevention - validate database queries
export const validateDbQuery = (query: string): boolean => {
  const dangerousPatterns = [
    /(\bDROP\b|\bDELETE\b|\bTRUNCATE\b|\bUPDATE\b|\bINSERT\b|\bALTER\b|\bCREATE\b|\bEXEC\b|\bEXECUTE\b)/i,
    /(\bUNION\b|\bSELECT\b).*(\bFROM\b|\bWHERE\b)/i,
    /(\-\-|\#|\/\*|\*\/)/,
    /(\bxp_|\bsp_)/i,
    /(\bSCRIPT\b|\bALERT\b|\bCONFIRM\b|\bPROMPT\b)/i,
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(query));
};

// CSRF Protection Middleware
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET, HEAD, OPTIONS (safe methods)
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Skip for webhook endpoints that have their own verification
  const webhookPaths = [
    "/api/stripe/webhook",
    "/api/hubspot/webhook",
    "/api/gravity-forms/webhook",
  ];
  if (webhookPaths.some((path) => req.path === path)) {
    return next();
  }

  // Skip for public booking endpoints (no session required)
  const publicPaths = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/book-widget",
    "/api/book-introduction-call",
  ];
  if (publicPaths.some((path) => req.path === path)) {
    return next();
  }

  // Extract token from header or body (normalize to string)
  const token = String(req.headers["x-csrf-token"] || req.body?._csrf || "");
  const sessionToken = String((req.session as any)?.csrfToken || "");

  // Validate CSRF token using timing-safe comparison
  if (!token || !sessionToken) {
    console.warn("CSRF token validation failed: Missing token", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      hasToken: !!token,
      hasSessionToken: !!sessionToken,
      timestamp: new Date().toISOString(),
    });

    return res.status(403).json({
      error: "Invalid CSRF token. Please refresh the page and try again.",
      code: "CSRF_VALIDATION_FAILED",
    });
  }

  // Use timing-safe comparison to prevent timing attacks
  try {
    const tokenBuffer = Buffer.from(token);
    const sessionTokenBuffer = Buffer.from(sessionToken);

    // Ensure both buffers are the same length for timingSafeEqual
    if (tokenBuffer.length !== sessionTokenBuffer.length) {
      console.warn("CSRF token validation failed: Length mismatch", {
        ip: req.ip,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      });

      return res.status(403).json({
        error: "Invalid CSRF token. Please refresh the page and try again.",
        code: "CSRF_VALIDATION_FAILED",
      });
    }

    if (!crypto.timingSafeEqual(tokenBuffer, sessionTokenBuffer)) {
      console.warn("CSRF token validation failed: Token mismatch", {
        ip: req.ip,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      });

      return res.status(403).json({
        error: "Invalid CSRF token. Please refresh the page and try again.",
        code: "CSRF_VALIDATION_FAILED",
      });
    }
  } catch (error) {
    console.error("CSRF validation error:", error);
    return res.status(403).json({
      error: "CSRF validation error",
      code: "CSRF_VALIDATION_ERROR",
    });
  }

  next();
};

// Enhanced tiered request validation with context-aware rules
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  // Skip validation for static assets and basic navigation
  const skipValidationPaths = [
    "/",
    "/api/health",
    "/api/therapy-categories",
    "/api/services",
    "/api/auth/user",
    "/api/client/completion-status",
    "/api/calendar/availability",
    "/attached_assets",
    "/favicon.ico",
    "/@fs",
    "/src",
    "/node_modules",
  ];

  const shouldSkipValidation = skipValidationPaths.some(
    (path) => req.path === path || req.path.startsWith(path)
  );

  if (shouldSkipValidation) {
    return next();
  }

  // Endpoints that allow rich text content (whitelisted for HTML)
  const richTextEndpoints = [
    "/api/client/profile",
    "/api/therapist/profile",
    "/api/admin/profile",
    "/api/user/profile",
    "/api/therapist/bio",
    "/api/client/notes",
    "/api/forms/submit",
  ];

  const isRichTextEndpoint = richTextEndpoints.some((endpoint) => req.path === endpoint);

  // High severity threats - ALWAYS block these
  const highThreatPatterns = [
    // Script injection with event handlers
    /<script[\s\S]*?>[\s\S]*?<\/script>/i,
    // Dangerous iframes (not from whitelisted domains)
    /<iframe(?![^>]*src=["'](https:\/\/(meet\.google\.com|.*\.daily\.co|daily\.co)))/i,
    // Protocol-based XSS
    /javascript:\s*(?!void\(0\))[^;]+/i,
    /vbscript:/i,
    /data:text\/html/i,
    // Path traversal
    /\.\.[\/\\]/,
    // SQL injection - more sophisticated patterns
    /\b(union\s+select|select\s+.*\s+from\s+.*\s+where)/i,
    /;\s*(drop|delete|truncate|update|insert)\s+(table|into|from)/i,
    /\b(exec|execute)\s*\(/i,
    // Command injection
    /[;&|`]\s*(rm|del|format|shutdown|exec|eval|system|passthru)/i,
    // Null byte injection
    /%00/,
    // XXE attacks
    /<!ENTITY/i,
  ];

  // Medium severity threats - Log but allow for rich text endpoints
  const mediumThreatPatterns = [
    // Basic HTML tags (allowed in rich text)
    /<(div|span|p|strong|em|ul|ol|li|a|img|br|hr)[^>]*>/i,
    // Style attributes (only dangerous with expressions)
    /style\s*=\s*[^>]*expression\s*\(/i,
    // Event handlers (dangerous)
    /on(load|error|click|mouse|key|focus|blur)\s*=/i,
  ];

  const requestString = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // Check for high severity threats
  const hasHighThreat = highThreatPatterns.some((pattern) => pattern.test(requestString));

  if (hasHighThreat) {
    console.error("HIGH SEVERITY: Security threat blocked:", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
      threatType: "HIGH_SEVERITY",
      body: JSON.stringify(req.body).substring(0, 200),
    });

    return res.status(400).json({
      error: "Request blocked due to potentially malicious content",
      code: "SECURITY_VIOLATION_HIGH",
    });
  }

  // Check for medium severity threats (only block if NOT a rich text endpoint)
  if (!isRichTextEndpoint) {
    const hasMediumThreat = mediumThreatPatterns.some((pattern) => pattern.test(requestString));

    if (hasMediumThreat) {
      console.warn("MEDIUM SEVERITY: Suspicious pattern detected and blocked:", {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
        threatType: "MEDIUM_SEVERITY",
      });

      return res.status(400).json({
        error: "Request contains potentially unsafe content",
        code: "SECURITY_VIOLATION_MEDIUM",
      });
    }
  } else {
    // For rich text endpoints, log medium threats but allow them
    const hasMediumThreat = mediumThreatPatterns.some((pattern) => pattern.test(requestString));

    if (hasMediumThreat) {
      console.info("MEDIUM SEVERITY: Pattern detected but allowed for rich text endpoint:", {
        ip: req.ip,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        threatType: "MEDIUM_SEVERITY_ALLOWED",
      });
    }
  }

  // Block automated submissions for sensitive forms
  if (req.path === "/api/therapist-onboarding/submit") {
    const userAgent = req.get("User-Agent") || "";
    if (
      userAgent.toLowerCase().includes("curl") ||
      userAgent.toLowerCase().includes("wget") ||
      userAgent.toLowerCase().includes("python-requests") ||
      userAgent.toLowerCase().includes("postman")
    ) {
      console.warn("Automated submission blocked:", {
        ip: req.ip,
        path: req.path,
        userAgent: userAgent,
        timestamp: new Date().toISOString(),
      });

      return res.status(403).json({
        error: "Automated submissions are not allowed",
        code: "AUTOMATED_SUBMISSION_BLOCKED",
      });
    }
  }

  next();
};

// IP blocking middleware for repeat offenders
const blockedIPs = new Set<string>();
const ipViolations = new Map<string, number>();

export const ipSecurityCheck = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || "unknown";

  // Check if IP is blocked
  if (blockedIPs.has(clientIP)) {
    return res.status(403).json({
      error: "Access denied from this IP address",
      code: "IP_BLOCKED",
    });
  }

  // Track violations
  if (res.statusCode === 400 || res.statusCode === 403) {
    const violations = ipViolations.get(clientIP) || 0;
    ipViolations.set(clientIP, violations + 1);

    // Block IP after 5 violations
    if (violations >= 5) {
      blockedIPs.add(clientIP);
      console.warn(`IP ${clientIP} blocked due to repeated violations`);
    }
  }

  next();
};

// CSRF Token Generation Middleware
export const generateCsrfToken = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session) {
    return next();
  }

  // Generate CSRF token if not exists
  if (!(req.session as any).csrfToken) {
    // Generate as hex to match validation encoding
    (req.session as any).csrfToken = crypto.randomBytes(32).toString("hex");
  }

  next();
};
