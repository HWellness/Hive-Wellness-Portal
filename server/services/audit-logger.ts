import { Request } from 'express';

export interface AuditEvent {
  eventType: 'password_reset_request' | 'password_reset_success' | 'password_reset_failure';
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  metadata?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
}

export class AuditLogger {
  /**
   * Log security events with comprehensive metadata
   */
  static logSecurityEvent(event: AuditEvent): void {
    const logEntry = {
      timestamp: event.timestamp,
      level: event.success ? 'INFO' : 'WARN',
      event: event.eventType,
      userId: event.userId || 'unknown',
      userEmail: event.userEmail || 'unknown',
      ipAddress: event.ipAddress || 'unknown',
      userAgent: event.userAgent || 'unknown',
      success: event.success,
      errorMessage: event.errorMessage,
      metadata: event.metadata
    };

    // Log to console (in production, this would go to a central logging service)
    if (event.success) {
      console.log(`🔐 SECURITY: ${event.eventType}`, logEntry);
    } else {
      console.warn(`🚨 SECURITY_FAILURE: ${event.eventType}`, logEntry);
    }

    // In production, you might want to:
    // - Send to a SIEM system
    // - Store in a separate audit database
    // - Send alerts for critical failures
    // - Rate limit based on patterns
  }

  /**
   * Log password reset request
   */
  static logPasswordResetRequest(req: Request, email: string, userExists: boolean): void {
    this.logSecurityEvent({
      eventType: 'password_reset_request',
      userEmail: email,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      success: true,
      metadata: {
        userExists,
        emailRequested: email,
        referrer: req.get('Referer')
      }
    });
  }

  /**
   * Log successful password reset
   */
  static logPasswordResetSuccess(req: Request, userId: string, userEmail: string): void {
    this.logSecurityEvent({
      eventType: 'password_reset_success',
      userId,
      userEmail,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      success: true,
      metadata: {
        sessionDestroyed: true,
        bcryptCostFactor: 12
      }
    });
  }

  /**
   * Log failed password reset attempt
   */
  static logPasswordResetFailure(req: Request, reason: string, uid?: string, email?: string): void {
    this.logSecurityEvent({
      eventType: 'password_reset_failure',
      userId: uid,
      userEmail: email,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      success: false,
      errorMessage: reason,
      metadata: {
        failureReason: reason,
        potentialAttack: reason.includes('token') || reason.includes('expired')
      }
    });
  }
}

export default AuditLogger;