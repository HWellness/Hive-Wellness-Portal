/**
 * Production-safe logging utility to sanitize sensitive data
 * Prevents leaking payment IDs, Stripe data, PII, and webhook details in production logs
 */

const isProduction = process.env.NODE_ENV === "production";

/**
 * Sanitize sensitive data from log messages
 */
function sanitizeLogData(data: any): any {
  if (!data || typeof data !== "object") return data;

  const sensitive_fields = [
    "paymentId",
    "payment_intent",
    "stripeTransferId",
    "stripe_transfer_id",
    "email",
    "password",
    "token",
    "webhook_secret",
    "api_key",
    "client_secret",
    "payment_method",
    "card",
    "account_id",
  ];

  const sanitized = { ...data };

  sensitive_fields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  });

  // Sanitize nested objects
  Object.keys(sanitized).forEach((key) => {
    if (sanitized[key] && typeof sanitized[key] === "object") {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  });

  return sanitized;
}

/**
 * Sanitize string messages containing IDs or sensitive patterns
 */
function sanitizeMessage(message: string): string {
  if (!isProduction) return message;

  return message
    .replace(/pi_[a-zA-Z0-9]+/g, "pi_[REDACTED]") // Stripe Payment Intent IDs
    .replace(/tr_[a-zA-Z0-9]+/g, "tr_[REDACTED]") // Stripe Transfer IDs
    .replace(/acct_[a-zA-Z0-9]+/g, "acct_[REDACTED]") // Stripe Account IDs
    .replace(/email:\s*[^\s,}]+/gi, "email: [REDACTED]")
    .replace(/payment\s+[a-zA-Z0-9-]+/gi, "payment [REDACTED]");
}

export const secureLogger = {
  log: (message: string, data?: any) => {
    const sanitizedMessage = sanitizeMessage(message);
    const sanitizedData = data ? sanitizeLogData(data) : undefined;

    if (sanitizedData) {
      console.log(sanitizedMessage, sanitizedData);
    } else {
      console.log(sanitizedMessage);
    }
  },

  warn: (message: string, data?: any) => {
    const sanitizedMessage = sanitizeMessage(message);
    const sanitizedData = data ? sanitizeLogData(data) : undefined;

    if (sanitizedData) {
      console.warn(sanitizedMessage, sanitizedData);
    } else {
      console.warn(sanitizedMessage);
    }
  },

  error: (message: string, error?: any) => {
    const sanitizedMessage = sanitizeMessage(message);
    const sanitizedError = error ? sanitizeLogData(error) : undefined;

    if (sanitizedError) {
      console.error(sanitizedMessage, sanitizedError);
    } else {
      console.error(sanitizedMessage);
    }
  },
};
