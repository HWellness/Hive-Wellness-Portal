/**
 * HIPAA-Compliant PII Sanitization Logger
 * 
 * Protects sensitive patient data in logs while maintaining debugging capability.
 * Uses consistent hashing for user/therapist IDs and redacts medical content.
 * 
 * Usage:
 *   import { logger } from './lib/logger';
 *   logger.info('User logged in', { userId: 123, email: 'test@example.com' });
 *   // Output: User logged in { userId: '[USER:a8f3c2]', email: '[EMAIL:b9d4e1]' }
 */

import crypto from 'crypto';

// CRITICAL: Salt for consistent hashing - REQUIRED for production security
// HIPAA compliance: This salt MUST be a secret, unique value
if (!process.env.LOG_HASH_SALT) {
  const errorMsg = '❌ CRITICAL SECURITY ERROR: LOG_HASH_SALT environment variable is required for PII sanitization';
  console.error(errorMsg);
  console.error('🔐 HIPAA Compliance: The hash salt must be a secret value to protect patient data');
  console.error('📋 Add LOG_HASH_SALT to your environment variables before starting the application');
  
  // In development, allow with warning; in production, FAIL
  if (process.env.NODE_ENV === 'production') {
    throw new Error(errorMsg);
  } else {
    console.warn('⚠️  Using insecure default salt in DEVELOPMENT ONLY');
    console.warn('⚠️  This would be a CRITICAL security vulnerability in production');
  }
}

const HASH_SALT = process.env.LOG_HASH_SALT || 'dev-only-insecure-salt-DO-NOT-USE-IN-PRODUCTION';

/**
 * Create consistent hash for an identifier
 * Same input always produces same hash for log correlation
 */
function hashIdentifier(value: string, prefix: string): string {
  const hash = crypto
    .createHmac('sha256', HASH_SALT)
    .update(value.toString())
    .digest('hex')
    .substring(0, 6);
  return `[${prefix}:${hash}]`;
}

/**
 * Medical/therapy keywords that indicate sensitive content
 */
const MEDICAL_KEYWORDS = [
  'anxiety', 'depression', 'trauma', 'ptsd', 'therapy', 'medication',
  'diagnosis', 'mental health', 'counseling', 'treatment', 'symptoms',
  'suicide', 'self-harm', 'abuse', 'addiction', 'disorder', 'bipolar',
  'schizophrenia', 'ocd', 'adhd', 'autis', 'panic', 'phobia'
];

/**
 * Detect if text contains medical/sensitive content
 */
function containsMedicalContent(text: string): boolean {
  const lowerText = text.toLowerCase();
  return MEDICAL_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

/**
 * Sanitize a string value for potential PII
 */
function sanitizeString(value: string): string {
  let sanitized = value;

  // Email addresses
  sanitized = sanitized.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    (email) => hashIdentifier(email, 'EMAIL')
  );

  // International phone numbers (comprehensive coverage)
  // Matches: +44 7700 900123, +1 555-123-4567, (415) 555-0199, 555.123.4567, etc.
  // Pattern: optional country code (+XX), optional parentheses/punctuation, 10-15 digit sequences
  sanitized = sanitized.replace(
    /(\+?\d{1,4}[\s.-]?)?\(?\d{3,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,5}/g,
    (match) => {
      // Only sanitize if it looks like a phone number (not timestamps, IDs, etc.)
      const digitCount = match.replace(/\D/g, '').length;
      if (digitCount >= 10 && digitCount <= 15) {
        return hashIdentifier(match.replace(/\D/g, ''), 'PHONE');
      }
      return match;
    }
  );

  // Stripe IDs
  sanitized = sanitized.replace(/pi_[a-zA-Z0-9]+/g, (id) => hashIdentifier(id, 'PAYMENT'));
  sanitized = sanitized.replace(/tr_[a-zA-Z0-9]+/g, (id) => hashIdentifier(id, 'TRANSFER'));
  sanitized = sanitized.replace(/acct_[a-zA-Z0-9]+/g, (id) => hashIdentifier(id, 'ACCOUNT'));
  sanitized = sanitized.replace(/cus_[a-zA-Z0-9]+/g, (id) => hashIdentifier(id, 'CUSTOMER'));

  // Medical/therapy content - redact completely
  if (containsMedicalContent(sanitized)) {
    return '[REDACTED:MEDICAL_CONTENT]';
  }

  return sanitized;
}

/**
 * Recursively sanitize object/array for PII
 */
function sanitizeValue(value: any, depth: number = 0): any {
  // Prevent infinite recursion
  if (depth > 10) return '[REDACTED:TOO_DEEP]';

  if (value === null || value === undefined) {
    return value;
  }

  // String sanitization
  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  // Number/Boolean pass through
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  // Date objects
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Error objects
  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(value.message),
      stack: '[REDACTED:STACK_TRACE]'
    };
  }

  // Arrays
  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item, depth + 1));
  }

  // Objects
  if (typeof value === 'object') {
    const sanitized: any = {};
    
    // Sensitive field names - always redact
    const SENSITIVE_FIELDS = [
      'password', 'token', 'secret', 'apiKey', 'api_key', 'accessToken',
      'refreshToken', 'sessionId', 'cookie', 'authorization', 'ssn',
      'creditCard', 'cvv', 'cardNumber', 'accountNumber', 'routingNumber',
      'medicalRecord', 'healthRecord', 'diagnosis', 'prescription',
      'therapyNotes', 'sessionNotes', 'clientNotes', 'chatMessage', 'messageContent'
    ];

    // ID fields - hash consistently
    const ID_FIELDS = [
      'userId', 'user_id', 'clientId', 'client_id', 'therapistId', 'therapist_id',
      'patientId', 'patient_id', 'sessionId', 'session_id', 'appointmentId',
      'appointment_id', 'id'
    ];

    // Email fields - hash consistently  
    const EMAIL_FIELDS = ['email', 'userEmail', 'clientEmail', 'therapistEmail'];

    // Phone fields - hash consistently
    const PHONE_FIELDS = ['phone', 'phoneNumber', 'mobile', 'contactNumber'];

    // Name fields - hash consistently
    const NAME_FIELDS = ['name', 'firstName', 'lastName', 'fullName', 'userName'];

    for (const [key, val] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();

      // Always redact sensitive fields
      if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED:SENSITIVE]';
      }
      // Hash ID fields consistently
      else if (ID_FIELDS.some(field => lowerKey === field.toLowerCase())) {
        sanitized[key] = typeof val === 'string' || typeof val === 'number' 
          ? hashIdentifier(String(val), 'ID')
          : sanitizeValue(val, depth + 1);
      }
      // Hash email fields
      else if (EMAIL_FIELDS.some(field => lowerKey === field.toLowerCase())) {
        sanitized[key] = typeof val === 'string'
          ? hashIdentifier(val, 'EMAIL')
          : sanitizeValue(val, depth + 1);
      }
      // Hash phone fields
      else if (PHONE_FIELDS.some(field => lowerKey === field.toLowerCase())) {
        sanitized[key] = typeof val === 'string'
          ? hashIdentifier(val, 'PHONE')
          : sanitizeValue(val, depth + 1);
      }
      // Hash name fields
      else if (NAME_FIELDS.some(field => lowerKey === field.toLowerCase())) {
        sanitized[key] = typeof val === 'string'
          ? hashIdentifier(val, 'NAME')
          : sanitizeValue(val, depth + 1);
      }
      // Recursively sanitize other values
      else {
        sanitized[key] = sanitizeValue(val, depth + 1);
      }
    }

    return sanitized;
  }

  // Fallback for unknown types
  return '[REDACTED:UNKNOWN_TYPE]';
}

/**
 * Format log message with metadata
 */
function formatLogMessage(level: string, message: string, data?: any): string {
  const timestamp = new Date().toISOString();
  const sanitizedMessage = sanitizeString(message);
  
  let output = `[${timestamp}] [${level.toUpperCase()}] ${sanitizedMessage}`;
  
  if (data !== undefined) {
    const sanitizedData = sanitizeValue(data);
    output += ` ${JSON.stringify(sanitizedData)}`;
  }
  
  return output;
}

/**
 * Centralized logger with automatic PII sanitization
 */
export const logger = {
  /**
   * Info level logging
   */
  info(message: string, data?: any): void {
    const formatted = formatLogMessage('info', message, data);
    console.log(formatted);
  },

  /**
   * Warning level logging
   */
  warn(message: string, data?: any): void {
    const formatted = formatLogMessage('warn', message, data);
    console.warn(formatted);
  },

  /**
   * Error level logging
   */
  error(message: string, error?: any): void {
    const formatted = formatLogMessage('error', message, error);
    console.error(formatted);
  },

  /**
   * Debug level logging (only in development)
   */
  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      const formatted = formatLogMessage('debug', message, data);
      console.log(formatted);
    }
  },

  /**
   * Request logging with automatic sanitization
   */
  request(req: any, res: any, duration: number): void {
    const sanitizedLog = {
      method: req.method,
      url: sanitizeString(req.url || req.path),
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: hashIdentifier(req.ip || req.socket?.remoteAddress || 'unknown', 'IP'),
      userAgent: req.headers?.['user-agent']?.substring(0, 50) || 'unknown',
      timestamp: new Date().toISOString()
    };

    console.log('Request log:', sanitizedLog);
  }
};

/**
 * Export sanitization function for manual use
 */
export { sanitizeValue };
