/**
 * Production-ready HTTP error handling utility
 * Maps storage errors to proper HTTP status codes
 */

import { logger } from "../lib/logger";

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Maps common storage errors to appropriate HTTP status codes
 */
export function mapStorageErrorToHttpError(error: any): HttpError {
  // User not found errors
  if (error.message?.includes("not found") || error.message?.includes("does not exist")) {
    return new HttpError(404, "Resource not found", "NOT_FOUND");
  }

  // Validation errors
  if (
    error.message?.includes("validation") ||
    error.message?.includes("invalid") ||
    error.message?.includes("required")
  ) {
    return new HttpError(400, "Invalid request data", "VALIDATION_ERROR");
  }

  // Duplicate/conflict errors
  if (
    error.message?.includes("already exists") ||
    error.message?.includes("duplicate") ||
    error.code === "23505"
  ) {
    // PostgreSQL unique violation
    return new HttpError(409, "Resource already exists", "CONFLICT");
  }

  // Permission errors
  if (
    error.message?.includes("permission") ||
    error.message?.includes("unauthorized") ||
    error.message?.includes("access denied")
  ) {
    return new HttpError(403, "Access denied", "FORBIDDEN");
  }

  // Authentication errors
  if (error.message?.includes("authentication") || error.message?.includes("invalid credentials")) {
    return new HttpError(401, "Authentication required", "UNAUTHORIZED");
  }

  // Rate limiting
  if (error.message?.includes("rate limit") || error.message?.includes("too many requests")) {
    return new HttpError(429, "Rate limit exceeded", "RATE_LIMITED");
  }

  // Default to 500 for unknown errors
  return new HttpError(500, "Internal server error", "INTERNAL_ERROR");
}

/**
 * Express error handler middleware for production
 */
export function errorHandler(err: any, req: any, res: any, next: any) {
  let httpError: HttpError;

  if (err instanceof HttpError) {
    httpError = err;
  } else {
    httpError = mapStorageErrorToHttpError(err);
  }

  // Log server errors (500s) but not client errors (4xx)
  // PII is automatically sanitized by logger
  if (httpError.statusCode >= 500) {
    logger.error(`Server error on ${req.method} ${req.path}`, {
      error: err.message,
      stack: err.stack,
      statusCode: httpError.statusCode,
      code: httpError.code,
      userId: req.user?.id,
      sessionId: req.sessionID,
    });
  }

  res.status(httpError.statusCode).json({
    success: false,
    error: {
      message: httpError.message,
      code: httpError.code,
    },
  });
}
