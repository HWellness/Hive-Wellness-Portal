import { Request, Response, NextFunction } from 'express';

// Define user roles
export type UserRole = 'client' | 'therapist' | 'admin' | 'institution';

// Extend Express Request to include typed user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        firstName?: string;
        lastName?: string;
        [key: string]: any;
      };
    }
  }
}

// Role hierarchy for permission checking
const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 4,
  therapist: 3,
  institution: 2,
  client: 1,
};

// Role-based access control middleware
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource.'
      });
    }

    // Check if user has required role
    if (!allowedRoles.includes(req.user.role)) {
      console.warn(`🚫 RBAC: User ${req.user.id} (${req.user.role}) denied access to ${req.method} ${req.path}. Required roles: ${allowedRoles.join(', ')}`);
      
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`,
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }

    // Log successful access for admin/sensitive operations
    if (allowedRoles.includes('admin') || req.path.includes('admin')) {
      console.log(`✅ RBAC: User ${req.user.id} (${req.user.role}) accessing ${req.method} ${req.path}`);
    }

    next();
  };
}

// Minimum role requirement middleware
export function requireMinimumRole(minimumRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource.'
      });
    }

    const userLevel = ROLE_HIERARCHY[req.user.role];
    const requiredLevel = ROLE_HIERARCHY[minimumRole];

    if (userLevel < requiredLevel) {
      console.warn(`🚫 RBAC: User ${req.user.id} (${req.user.role}, level ${userLevel}) denied access to ${req.method} ${req.path}. Required minimum: ${minimumRole} (level ${requiredLevel})`);
      
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Access denied. Minimum required role: ${minimumRole}. Your role: ${req.user.role}`,
        userRole: req.user.role,
        minimumRole,
        userLevel,
        requiredLevel
      });
    }

    next();
  };
}

// Specific role middleware functions for common cases
export const requireAdmin = requireRole('admin');
export const requireTherapist = requireRole('therapist', 'admin'); // Admins can access therapist resources
export const requireClient = requireRole('client');
export const requireInstitution = requireRole('institution', 'admin'); // Admins can access institution resources

// Combined middleware for multiple role requirements
export const requireAdminOrTherapist = requireRole('admin', 'therapist');
export const requireClientOrTherapist = requireRole('client', 'therapist');

// Resource ownership verification
export function requireOwnershipOrAdmin(userIdField: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.params[userIdField] || req.body[userIdField] || req.query[userIdField];
    
    if (resourceUserId !== req.user.id) {
      console.warn(`🚫 RBAC: User ${req.user.id} denied access to resource owned by ${resourceUserId}`);
      
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own resources.'
      });
    }

    next();
  };
}

// Audit logging for sensitive operations
export function auditLog(operation: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user) {
      console.log(`🔍 AUDIT: User ${req.user.id} (${req.user.role}) ${operation} - ${req.method} ${req.path}`, {
        userId: req.user.id,
        userRole: req.user.role,
        operation,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
    }
    next();
  };
}

// Role validation helper for internal use
export function validateUserRole(user: any): user is { role: UserRole } {
  return user && 
         typeof user.role === 'string' && 
         ['client', 'therapist', 'admin', 'institution'].includes(user.role);
}

export default {
  requireRole,
  requireMinimumRole,
  requireAdmin,
  requireTherapist,
  requireClient,
  requireInstitution,
  requireAdminOrTherapist,
  requireClientOrTherapist,
  requireOwnershipOrAdmin,
  auditLog,
  validateUserRole
};