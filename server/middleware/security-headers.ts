/**
 * Security Headers Middleware
 *
 * Implements defense-in-depth security with:
 * - Strict CSP with frame-ancestors to prevent clickjacking
 * - X-Frame-Options as legacy fallback
 * - Selective whitelisting for legitimate iframe embedding
 */

import { Request, Response, NextFunction } from "express";
import {
  getSecurityConfig,
  getAllowedScriptSources,
  getAllowedStyleSources,
  getAllowedConnectSources,
  getAllowedFrameSources,
  getAllowedImageSources,
} from "../config/security.js";
import { logger } from "../lib/logger.js";

export interface SecurityHeaderOptions {
  // Override frame-ancestors for specific routes (e.g., WordPress embedding)
  allowFramingFrom?: string[];

  // Override CORS for specific routes
  allowCorsFrom?: string[];

  // Disable CSP entirely (not recommended, use sparingly)
  disableCSP?: boolean;

  // Additional CSP directives
  additionalCSP?: Record<string, string[]>;
}

/**
 * Build CSP header string from directives
 */
function buildCSP(options: SecurityHeaderOptions = {}): string {
  const config = getSecurityConfig();

  // Determine frame-ancestors
  const frameAncestors = options.allowFramingFrom
    ? ["'self'", ...options.allowFramingFrom]
    : ["'self'"]; // Default: only allow same-origin framing

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": getAllowedScriptSources(),
    "style-src": getAllowedStyleSources(),
    "connect-src": getAllowedConnectSources(),
    "frame-src": getAllowedFrameSources(),
    "img-src": getAllowedImageSources(),
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": frameAncestors,
    "upgrade-insecure-requests": [], // No value needed
    ...options.additionalCSP,
  };

  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) return key; // Directives like upgrade-insecure-requests
      return `${key} ${values.join(" ")}`;
    })
    .join("; ");
}

/**
 * Apply strict security headers (default for all routes)
 */
export function applyStrictSecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction,
  options: SecurityHeaderOptions = {}
): void {
  const config = getSecurityConfig();

  // Build CSP
  const csp = options.disableCSP ? "" : buildCSP(options);

  if (csp) {
    res.setHeader("Content-Security-Policy", csp);
  }

  // X-Frame-Options (legacy fallback)
  // If we're allowing framing, use ALLOW-FROM or remove header
  // Otherwise, use DENY
  if (options.allowFramingFrom && options.allowFramingFrom.length > 0) {
    // Modern browsers respect frame-ancestors CSP, older browsers need header removed
    res.removeHeader("X-Frame-Options");
  } else {
    res.setHeader("X-Frame-Options", "DENY");
  }

  // Other security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(self), camera=(self)");

  // CORS headers (if specified)
  if (options.allowCorsFrom) {
    const origin = req.get("origin");
    if (origin && options.allowCorsFrom.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
  }

  next();
}

/**
 * Middleware: Apply strict security headers to all routes (default)
 */
export function strictSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  applyStrictSecurityHeaders(req, res, next);
}

/**
 * Helper: Allow iframe embedding from specific trusted origins
 * Use this for routes that need to be embedded in WordPress or other trusted sites
 *
 * @example
 * app.get('/portal', allowFramingFrom(['https://hive-wellness.co.uk']), (req, res) => { ... })
 */
export function allowFramingFrom(origins: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const config = getSecurityConfig();

    // Validate origins against whitelist
    const validOrigins = origins.filter(
      (origin) => config.allowedFrameAncestors.includes(origin) || origin === "'self'"
    );

    if (validOrigins.length === 0) {
      logger.warn("allowFramingFrom called with no valid origins", {
        requested: origins,
        allowed: config.allowedFrameAncestors,
      });
    }

    applyStrictSecurityHeaders(req, res, next, {
      allowFramingFrom: validOrigins,
      allowCorsFrom: validOrigins,
    });
  };
}

/**
 * Helper: Allow embedding from all whitelisted domains (WordPress integration)
 * Use sparingly - only for routes that MUST be embedded in external sites
 */
export function allowWhitelistedFraming(req: Request, res: Response, next: NextFunction): void {
  const config = getSecurityConfig();

  applyStrictSecurityHeaders(req, res, next, {
    allowFramingFrom: config.allowedOrigins,
    allowCorsFrom: config.allowedOrigins,
  });
}

/**
 * Helper: Public embeddable content (e.g., chatbot widget)
 * Allows embedding from any origin by removing frame-ancestors restriction
 * Note: frame-ancestors doesn't support '*' wildcard per CSP spec
 */
export function allowPublicEmbedding(req: Request, res: Response, next: NextFunction): void {
  const config = getSecurityConfig();

  // Build CSP without frame-ancestors (allows all origins)
  const scriptSrc = getAllowedScriptSources();
  const styleSrc = getAllowedStyleSources();
  const connectSrc = getAllowedConnectSources();
  const frameSrc = getAllowedFrameSources();
  const imgSrc = getAllowedImageSources();

  const cspDirectives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    "style-src": styleSrc,
    "connect-src": connectSrc,
    "frame-src": frameSrc,
    "img-src": imgSrc,
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    // Intentionally omit frame-ancestors to allow universal embedding
    "upgrade-insecure-requests": [],
  };

  const csp = Object.entries(cspDirectives)
    .map(([key, values]) => {
      if (values.length === 0) return key;
      return `${key} ${values.join(" ")}`;
    })
    .join("; ");

  res.setHeader("Content-Security-Policy", csp);
  res.removeHeader("X-Frame-Options"); // Remove to allow all framing

  // Other security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(self), camera=(self)");

  // CORS: Echo origin (do NOT set credentials with wildcard)
  const origin = req.get("origin");
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Vary", "Origin"); // Prevent cache re-use across origins
    res.setHeader("Access-Control-Max-Age", "86400"); // Cache preflight for 24 hours
    // Do NOT set Access-Control-Allow-Credentials when allowing all origins
  }

  next();
}

/**
 * Log security header application for debugging
 */
function logSecurityHeaders(req: Request, res: Response): void {
  const csp = res.getHeader("Content-Security-Policy");
  const xFrame = res.getHeader("X-Frame-Options");

  logger.debug("Security headers applied", {
    path: req.path,
    csp: typeof csp === "string" ? csp.substring(0, 100) + "..." : csp,
    xFrame,
  });
}
