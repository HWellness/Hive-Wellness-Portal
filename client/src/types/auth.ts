import { User } from '@shared/schema';

// Authentication types with proper role typing
export type UserRole = 'client' | 'therapist' | 'admin' | 'institution';

export interface AuthUser extends Omit<User, 'role'> {
  role: UserRole;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Role-based access control
export const ROLE_PERMISSIONS = {
  client: {
    canViewClientDashboard: true,
    canBookAppointments: true,
    canViewTherapistProfiles: true,
    canAccessMessaging: true,
    canViewOwnAppointments: true,
    canUpdateOwnProfile: true,
  },
  therapist: {
    canViewTherapistDashboard: true,
    canViewClientAppointments: true,
    canAccessVideoSessions: true,
    canUpdateOwnProfile: true,
    canViewCalendar: true,
    canReceivePayments: true,
    canAccessMessaging: true,
  },
  admin: {
    canViewAdminDashboard: true,
    canManageUsers: true,
    canViewAllAppointments: true,
    canAccessAnalytics: true,
    canManageSettings: true,
    canViewFinancials: true,
    canAccessEmailTemplates: true,
    canManageCalendars: true,
  },
  institution: {
    canViewInstitutionDashboard: true,
    canViewInstitutionUsers: true,
    canAccessReporting: true,
    canManageInstitutionSettings: true,
    canViewInstitutionAnalytics: true,
  }
} as const;

export type Permission = keyof typeof ROLE_PERMISSIONS[UserRole];

// Helper functions for role checking
export const hasPermission = (user: AuthUser | null, permission: Permission): boolean => {
  if (!user) return false;
  return ROLE_PERMISSIONS[user.role]?.[permission] ?? false;
};

export const hasRole = (user: AuthUser | null, role: UserRole): boolean => {
  return user?.role === role;
};

export const hasAnyRole = (user: AuthUser | null, roles: UserRole[]): boolean => {
  return user ? roles.includes(user.role) : false;
};

// Role hierarchy for access control
export const ROLE_HIERARCHY = {
  admin: 4,
  therapist: 3,
  institution: 2,
  client: 1,
} as const;

export const hasMinimumRole = (user: AuthUser | null, minimumRole: UserRole): boolean => {
  if (!user) return false;
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[minimumRole];
};

// Route access control
export const ROLE_ROUTES = {
  client: ['/client-dashboard', '/book-appointment', '/profile', '/settings', '/messages'],
  therapist: ['/therapist-dashboard', '/calendar', '/clients', '/settings', '/messages', '/video-sessions'],
  admin: ['/admin-dashboard', '/user-management', '/analytics', '/email-templates', '/settings', '/calendar-management'],
  institution: ['/institution-dashboard', '/reporting', '/users', '/settings'],
} as const;

export const canAccessRoute = (user: AuthUser | null, route: string): boolean => {
  if (!user) return false;
  return ROLE_ROUTES[user.role]?.some(allowedRoute => 
    route.startsWith(allowedRoute) || route === allowedRoute
  ) ?? false;
};