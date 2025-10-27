import { Request, Response, NextFunction } from "express";

// Simple but effective security middleware
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  // Skip validation for static assets and basic navigation
  const skipPaths = [
    "/",
    "/api/health",
    "/api/therapy-categories",
    "/api/services",
    "/api/auth",
    "/attached_assets",
    "/favicon.ico",
    "/@fs",
    "/src",
    "/node_modules",
  ];

  if (skipPaths.some((path) => req.path === path || req.path.startsWith(path))) {
    return next();
  }

  // Only block clear malicious patterns
  const maliciousPatterns = [
    /<script[\s\S]*?>/i,
    /javascript:/i,
    /\.\.\//,
    /\bunion\b.*\bselect\b/i,
  ];

  const content = JSON.stringify({ body: req.body, query: req.query });

  if (maliciousPatterns.some((pattern) => pattern.test(content))) {
    return res.status(400).json({
      error: "Request blocked",
      code: "SECURITY_VIOLATION",
    });
  }

  next();
};

// Keep existing rate limiting and other middleware
export * from "./security";
