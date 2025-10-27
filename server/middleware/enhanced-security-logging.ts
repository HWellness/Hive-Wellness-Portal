import { Request, Response, NextFunction } from "express";

// Enhanced security event types
export type SecurityEventType =
  | "form_validation_success"
  | "form_validation_failure"
  | "suspicious_pattern_detected"
  | "legitimate_profile_save"
  | "security_bypass_attempt"
  | "input_sanitization"
  | "rate_limit_exceeded"
  | "authentication_attempt";

export interface SecurityEvent {
  type: SecurityEventType;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: Date;
  ip: string;
  userAgent: string;
  userId?: string;
  endpoint: string;
  method: string;
  details: {
    reason: string;
    dataType?: string;
    fieldName?: string;
    validationErrors?: string[];
    sanitizedFields?: string[];
    originalValue?: string;
    sanitizedValue?: string;
  };
}

// In-memory security log (in production, this would be stored in database)
const securityLog: SecurityEvent[] = [];
const MAX_LOG_ENTRIES = 10000;

// Log security events with detailed information
export const logSecurityEvent = (event: Omit<SecurityEvent, "timestamp">) => {
  const securityEvent: SecurityEvent = {
    ...event,
    timestamp: new Date(),
  };

  securityLog.unshift(securityEvent);

  // Keep log size manageable
  if (securityLog.length > MAX_LOG_ENTRIES) {
    securityLog.splice(MAX_LOG_ENTRIES);
  }

  // Log to console for development
  if (event.severity === "high" || event.severity === "critical") {
    console.warn("🔒 Security Event:", {
      type: event.type,
      severity: event.severity,
      endpoint: event.endpoint,
      reason: event.details.reason,
    });
  }
};

// Enhanced form validation middleware
export const enhancedFormValidation = (req: Request, res: Response, next: NextFunction) => {
  const isProfileEndpoint = ["/api/client/profile", "/api/therapist/profile"].some((endpoint) =>
    req.path.includes(endpoint)
  );

  if (!isProfileEndpoint) {
    return next();
  }

  const formData = req.body;
  const validationResults = validateProfileData(formData);

  // Log validation attempt
  logSecurityEvent({
    type: validationResults.isValid ? "form_validation_success" : "form_validation_failure",
    severity: validationResults.isValid ? "low" : "medium",
    ip: req.ip || "unknown",
    userAgent: req.get("User-Agent") || "unknown",
    userId: (req as any).user?.id,
    endpoint: req.path,
    method: req.method,
    details: {
      reason: validationResults.isValid
        ? "Profile data validation passed"
        : "Profile data validation failed",
      validationErrors: validationResults.errors,
      dataType: "profile",
    },
  });

  if (!validationResults.isValid) {
    return res.status(400).json({
      error: "Form validation failed",
      code: "VALIDATION_ERROR",
      details: validationResults.errors,
      userGuidance: {
        message: "Please check your form data and correct the following issues:",
        suggestions: generateFormSuggestions(validationResults.errors),
      },
    });
  }

  // Sanitize and log any changes
  const sanitizedData = sanitizeProfileData(formData);
  const sanitizedFields = findSanitizedFields(formData, sanitizedData);

  if (sanitizedFields.length > 0) {
    logSecurityEvent({
      type: "input_sanitization",
      severity: "low",
      ip: req.ip || "unknown",
      userAgent: req.get("User-Agent") || "unknown",
      userId: (req as any).user?.id,
      endpoint: req.path,
      method: req.method,
      details: {
        reason: "Input data sanitized",
        sanitizedFields: sanitizedFields,
        dataType: "profile",
      },
    });
  }

  // Replace request body with sanitized data
  req.body = sanitizedData;

  next();
};

// Validate profile data with specific rules
const validateProfileData = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validate personal info section
  if (data.personalInfo) {
    const { phone, emergencyPhone, postcode, dateOfBirth } = data.personalInfo;

    // Phone validation
    if (phone && !isValidUKPhone(phone)) {
      errors.push("Phone number format is invalid. Use format: +44 7123 456789 or 07123 456789");
    }

    if (emergencyPhone && !isValidUKPhone(emergencyPhone)) {
      errors.push("Emergency phone format is invalid. Use format: +44 7123 456789 or 07123 456789");
    }

    // Postcode validation
    if (postcode && !isValidUKPostcode(postcode)) {
      errors.push("Postcode format is invalid. Use format: SW1A 1AA or M1 1AA");
    }

    // Date validation
    if (dateOfBirth && !isValidDate(dateOfBirth)) {
      errors.push("Date of birth is invalid. Please select a valid date");
    }
  }

  // Check for potentially harmful content
  const dataString = JSON.stringify(data).toLowerCase();

  if (dataString.includes("<script") || dataString.includes("javascript:")) {
    errors.push("Form contains potentially harmful script content");
  }

  if (dataString.includes("union select") || dataString.includes("drop table")) {
    errors.push("Form contains database injection attempts");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Sanitize profile data while preserving legitimate content
const sanitizeProfileData = (data: any): any => {
  return JSON.parse(
    JSON.stringify(data, (key, value) => {
      if (typeof value === "string") {
        return value
          .replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove script tags
          .replace(/javascript:/gi, "") // Remove javascript protocol
          .replace(/on\w+\s*=/gi, "") // Remove event handlers
          .replace(/[<>]/g, "") // Remove angle brackets but keep other chars
          .trim();
      }
      return value;
    })
  );
};

// Find which fields were sanitized
const findSanitizedFields = (original: any, sanitized: any): string[] => {
  const fields: string[] = [];

  const compare = (obj1: any, obj2: any, path = "") => {
    for (const key in obj1) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof obj1[key] === "object" && obj1[key] !== null) {
        compare(obj1[key], obj2[key], currentPath);
      } else if (obj1[key] !== obj2[key]) {
        fields.push(currentPath);
      }
    }
  };

  compare(original, sanitized);
  return fields;
};

// Helper validation functions
const isValidUKPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\s+/g, "");
  return /^(?:\+44|0)[1-9]\d{8,10}$/.test(cleaned);
};

const isValidUKPostcode = (postcode: string): boolean => {
  const cleaned = postcode.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(cleaned);
};

const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  const now = new Date();
  const hundredYearsAgo = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate());

  return date instanceof Date && !isNaN(date.getTime()) && date >= hundredYearsAgo && date <= now;
};

// Generate helpful suggestions for form errors
const generateFormSuggestions = (errors: string[]): string[] => {
  const suggestions: string[] = [];

  errors.forEach((error) => {
    if (error.includes("phone")) {
      suggestions.push("Phone numbers should start with +44 or 0, followed by 9-11 digits");
    }
    if (error.includes("postcode")) {
      suggestions.push("UK postcodes have format like SW1A 1AA or M1 1AA");
    }
    if (error.includes("date")) {
      suggestions.push("Use the date picker to select your date of birth");
    }
    if (error.includes("script") || error.includes("harmful")) {
      suggestions.push("Please remove any HTML tags or script code from your input");
    }
  });

  return suggestions.length > 0 ? suggestions : ["Please review your form data and try again"];
};

// Get security analytics
export const getSecurityAnalytics = () => {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentEvents = securityLog.filter((event) => event.timestamp >= last24Hours);
  const weeklyEvents = securityLog.filter((event) => event.timestamp >= last7Days);

  return {
    totalEvents: securityLog.length,
    last24Hours: {
      total: recentEvents.length,
      byType: countByType(recentEvents),
      bySeverity: countBySeverity(recentEvents),
    },
    last7Days: {
      total: weeklyEvents.length,
      byType: countByType(weeklyEvents),
      bySeverity: countBySeverity(weeklyEvents),
    },
    topEndpoints: getTopEndpoints(weeklyEvents),
    recentHighSeverityEvents: securityLog
      .filter((event) => event.severity === "high" || event.severity === "critical")
      .slice(0, 10),
  };
};

const countByType = (events: SecurityEvent[]) => {
  return events.reduce(
    (acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
};

const countBySeverity = (events: SecurityEvent[]) => {
  return events.reduce(
    (acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
};

const getTopEndpoints = (events: SecurityEvent[]) => {
  const endpointCounts = events.reduce(
    (acc, event) => {
      acc[event.endpoint] = (acc[event.endpoint] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.entries(endpointCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([endpoint, count]) => ({ endpoint, count }));
};

// Export security log for admin access
export const getSecurityLog = (limit = 100) => {
  return securityLog.slice(0, limit);
};
