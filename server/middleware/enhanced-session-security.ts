import { Request, Response, NextFunction } from 'express';
import { logSecurityEvent } from './security-audit';

// Enhanced session security tracking
interface SessionSecurityData {
  loginTime: number;
  lastActivity: number;
  loginIP: string;
  userAgent: string;
  sessionId: string;
  securityViolations: number;
  concurrentSessions: number;
}

// Track active sessions per user
const userSessions = new Map<string, Set<string>>();
const sessionSecurityData = new Map<string, SessionSecurityData>();

// Configuration for enhanced session security
export const SESSION_SECURITY_CONFIG = {
  MAX_CONCURRENT_SESSIONS: 3, // Maximum concurrent sessions per user
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes of inactivity
  MAX_SECURITY_VIOLATIONS: 5, // Max violations before session invalidation
  SUSPICIOUS_LOGIN_THRESHOLD: 24 * 60 * 60 * 1000, // 24 hours for suspicious login detection
};

// Session store interface for session destruction
let sessionStore: any = null;

// Initialize session store reference
export const setSessionStore = (store: any) => {
  sessionStore = store;
};

// Get trusted IP consistently across all security modules
const getTrustedIP = (req: Request): string => {
  return req.headers['x-forwarded-for'] ? 
    (req.headers['x-forwarded-for'] as string).split(',')[0].trim() : 
    (req.ip || 'unknown');
};

// Destroy specific session in session store
const destroySpecificSession = (sessionId: string) => {
  if (sessionStore && sessionStore.destroy) {
    sessionStore.destroy(sessionId, (err: any) => {
      if (err) {
        console.error('Failed to destroy session:', sessionId, err);
      }
    });
  }
};

// Enhanced session tracking middleware
export const enhancedSessionTracking = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  const sessionId = (req as any).sessionID || 'anonymous';
  
  if (user && user.id) {
    const userId = user.id;
    const now = Date.now();
    const clientIP = getTrustedIP(req);
    const userAgent = req.get('User-Agent') || 'unknown';

    // Get or create session security data
    let sessionData = sessionSecurityData.get(sessionId);
    if (!sessionData) {
      sessionData = {
        loginTime: now,
        lastActivity: now,
        loginIP: clientIP,
        userAgent: userAgent,
        sessionId: sessionId,
        securityViolations: 0,
        concurrentSessions: 0
      };
      sessionSecurityData.set(sessionId, sessionData);

      // Track user sessions
      if (!userSessions.has(userId)) {
        userSessions.set(userId, new Set());
      }
      userSessions.get(userId)!.add(sessionId);

      // Log new session creation
      logSecurityEvent({
        type: 'authentication',
        severity: 'low',
        ip: clientIP,
        userAgent: userAgent,
        userId: userId,
        details: {
          event: 'session_created',
          sessionId: sessionId,
          loginTime: new Date(now).toISOString()
        },
        url: req.url,
        method: req.method
      });
    }

    // Check for session timeout BEFORE updating activity
    if (now - sessionData.lastActivity > SESSION_SECURITY_CONFIG.SESSION_TIMEOUT_MS) {
      logSecurityEvent({
        type: 'authentication',
        severity: 'low',
        ip: clientIP,
        userAgent: userAgent,
        userId: userId,
        details: {
          event: 'session_timeout',
          sessionId: sessionId,
          inactiveTime: now - sessionData.lastActivity
        },
        url: req.url,
        method: req.method
      });

      // Properly destroy session
      destroySpecificSession(sessionId);
      userSessions.get(userId)?.delete(sessionId);
      sessionSecurityData.delete(sessionId);
      
      // Safe session destruction without requiring Passport
      if (req.session) {
        req.session.destroy((err) => {
          res.status(401).json({ 
            error: 'Session expired due to inactivity',
            code: 'SESSION_TIMEOUT'
          });
        });
      } else {
        res.status(401).json({ 
          error: 'Session expired due to inactivity',
          code: 'SESSION_TIMEOUT'
        });
      }
      return;
    }

    // Update last activity AFTER timeout check
    sessionData.lastActivity = now;
    sessionData.concurrentSessions = userSessions.get(userId)?.size || 0;

    // Check for concurrent session violations
    if (sessionData.concurrentSessions > SESSION_SECURITY_CONFIG.MAX_CONCURRENT_SESSIONS) {
      logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        ip: clientIP,
        userAgent: userAgent,
        userId: userId,
        details: {
          event: 'excessive_concurrent_sessions',
          sessionCount: sessionData.concurrentSessions,
          maxAllowed: SESSION_SECURITY_CONFIG.MAX_CONCURRENT_SESSIONS
        },
        url: req.url,
        method: req.method
      });

      // Properly terminate oldest sessions by destroying them in session store
      const userSessionSet = userSessions.get(userId)!;
      const sessionsToTerminate = Array.from(userSessionSet).slice(0, -SESSION_SECURITY_CONFIG.MAX_CONCURRENT_SESSIONS);
      
      sessionsToTerminate.forEach(oldSessionId => {
        // Destroy specific session in session store
        destroySpecificSession(oldSessionId);
        sessionSecurityData.delete(oldSessionId);
        userSessionSet.delete(oldSessionId);
      });
    }

    // Detect suspicious login patterns using trusted IP
    if (sessionData.loginIP !== clientIP) {
      sessionData.securityViolations++;
      
      logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'high',
        ip: clientIP,
        userAgent: userAgent,
        userId: userId,
        details: {
          event: 'ip_address_change',
          originalIP: sessionData.loginIP,
          newIP: clientIP,
          violationCount: sessionData.securityViolations
        },
        url: req.url,
        method: req.method
      });

      // Properly invalidate session if too many violations
      if (sessionData.securityViolations >= SESSION_SECURITY_CONFIG.MAX_SECURITY_VIOLATIONS) {
        // Destroy specific session
        destroySpecificSession(sessionId);
        userSessions.get(userId)?.delete(sessionId);
        sessionSecurityData.delete(sessionId);
        
        // Safe session destruction
        if (req.session) {
          req.session.destroy((err) => {
            res.status(401).json({ 
              error: 'Session invalidated due to security violations',
              code: 'SECURITY_VIOLATION'
            });
          });
        } else {
          res.status(401).json({ 
            error: 'Session invalidated due to security violations',
            code: 'SECURITY_VIOLATION'
          });
        }
        return;
      }
    }

    // Store updated session data in response for monitoring
    (res as any).locals.sessionSecurity = sessionData;
  }

  next();
};

// Session cleanup middleware
export const sessionCleanup = (req: Request, res: Response, next: NextFunction) => {
  // Clean up expired sessions periodically
  if (Math.random() < 0.01) { // 1% chance to run cleanup
    const now = Date.now();
    const expiredSessions: string[] = [];

    sessionSecurityData.forEach((data, sessionId) => {
      if (now - data.lastActivity > SESSION_SECURITY_CONFIG.SESSION_TIMEOUT_MS) {
        expiredSessions.push(sessionId);
      }
    });

    expiredSessions.forEach(sessionId => {
      const data = sessionSecurityData.get(sessionId);
      if (data) {
        // Remove from user sessions tracking
        userSessions.forEach((sessionSet, userId) => {
          sessionSet.delete(sessionId);
          if (sessionSet.size === 0) {
            userSessions.delete(userId);
          }
        });
        
        sessionSecurityData.delete(sessionId);
      }
    });
  }

  next();
};

// Force logout all sessions for a user (security incident response)
export const forceLogoutUser = (userId: string, reason: string = 'security_incident') => {
  const userSessionSet = userSessions.get(userId);
  if (userSessionSet) {
    userSessionSet.forEach(sessionId => {
      const sessionData = sessionSecurityData.get(sessionId);
      if (sessionData) {
        logSecurityEvent({
          type: 'authentication',
          severity: 'high',
          ip: sessionData.loginIP,
          userAgent: sessionData.userAgent,
          userId: userId,
          details: {
            event: 'forced_logout',
            reason: reason,
            sessionId: sessionId
          },
          url: '/security/force-logout',
          method: 'POST'
        });
      }
      sessionSecurityData.delete(sessionId);
    });
    userSessions.delete(userId);
  }
};

// Get session security metrics
export const getSessionSecurityMetrics = () => {
  const now = Date.now();
  const metrics = {
    totalActiveSessions: sessionSecurityData.size,
    totalActiveUsers: userSessions.size,
    averageSessionDuration: 0,
    suspiciousSessions: 0,
    concurrentSessionViolations: 0,
    recentSecurityEvents: 0
  };

  let totalDuration = 0;
  sessionSecurityData.forEach(data => {
    const sessionDuration = now - data.loginTime;
    totalDuration += sessionDuration;
    
    if (data.securityViolations > 0) {
      metrics.suspiciousSessions++;
    }
    
    if (data.concurrentSessions > SESSION_SECURITY_CONFIG.MAX_CONCURRENT_SESSIONS) {
      metrics.concurrentSessionViolations++;
    }
  });

  if (sessionSecurityData.size > 0) {
    metrics.averageSessionDuration = totalDuration / sessionSecurityData.size;
  }

  return metrics;
};

// Enhanced session validation middleware for sensitive operations
export const requireFreshSession = (maxAgeMinutes: number = 15) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const sessionId = (req as any).sessionID;
    const sessionData = sessionSecurityData.get(sessionId);
    
    if (!sessionData) {
      return res.status(401).json({ 
        error: 'Session data not found',
        code: 'SESSION_INVALID'
      });
    }

    const now = Date.now();
    const sessionAge = now - sessionData.loginTime;
    const maxAge = maxAgeMinutes * 60 * 1000;

    if (sessionAge > maxAge) {
      logSecurityEvent({
        type: 'authorization',
        severity: 'medium',
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        userId: (req as any).user?.id,
        details: {
          event: 'stale_session_rejected',
          sessionAge: sessionAge,
          maxAllowedAge: maxAge,
          operation: req.url
        },
        url: req.url,
        method: req.method
      });

      return res.status(403).json({ 
        error: 'Session too old for this operation. Please re-authenticate.',
        code: 'SESSION_STALE'
      });
    }

    next();
  };
};