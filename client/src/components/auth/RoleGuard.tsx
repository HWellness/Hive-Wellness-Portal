import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  AuthUser,
  UserRole,
  hasRole,
  hasAnyRole,
  hasMinimumRole,
  canAccessRoute,
} from "@/types/auth";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface RoleGuardProps {
  children: ReactNode;
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
  minimumRole?: UserRole;
  requireRoute?: string;
  fallback?: ReactNode;
  showErrorMessage?: boolean;
}

export function RoleGuard({
  children,
  requiredRole,
  requiredRoles,
  minimumRole,
  requireRoute,
  fallback,
  showErrorMessage = true,
}: RoleGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
              <h2 className="text-xl font-semibold">Access Restricted</h2>
              <p className="text-muted-foreground">You need to be logged in to access this page.</p>
              <Button onClick={() => setLocation("/login")} className="w-full">
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const typedUser = user as AuthUser;

  // Check role-based access
  let hasAccess = true;

  if (requiredRole && !hasRole(typedUser, requiredRole)) {
    hasAccess = false;
  }

  if (requiredRoles && !hasAnyRole(typedUser, requiredRoles)) {
    hasAccess = false;
  }

  if (minimumRole && !hasMinimumRole(typedUser, minimumRole)) {
    hasAccess = false;
  }

  if (requireRoute && !canAccessRoute(typedUser, requireRoute)) {
    hasAccess = false;
  }

  // Access denied
  if (!hasAccess) {
    if (fallback) return <>{fallback}</>;

    if (!showErrorMessage) return null;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="text-xl font-semibold">Access Denied</h2>
              <p className="text-muted-foreground">
                You don't have permission to access this page.
              </p>
              <div className="text-sm text-muted-foreground">
                Your role: <span className="font-medium capitalize">{typedUser.role}</span>
              </div>
              <Button
                onClick={() => {
                  // Redirect to appropriate dashboard based on role
                  const dashboardRoutes = {
                    client: "/client-dashboard",
                    therapist: "/therapist-dashboard",
                    admin: "/admin-dashboard",
                    institution: "/institution-dashboard",
                  };
                  setLocation(dashboardRoutes[typedUser.role] || "/");
                }}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Access granted
  return <>{children}</>;
}

// Convenience components for specific roles
export const AdminOnly = ({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) => (
  <RoleGuard requiredRole="admin" fallback={fallback}>
    {children}
  </RoleGuard>
);

export const TherapistOnly = ({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) => (
  <RoleGuard requiredRole="therapist" fallback={fallback}>
    {children}
  </RoleGuard>
);

export const ClientOnly = ({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) => (
  <RoleGuard requiredRole="client" fallback={fallback}>
    {children}
  </RoleGuard>
);

export const InstitutionOnly = ({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) => (
  <RoleGuard requiredRole="institution" fallback={fallback}>
    {children}
  </RoleGuard>
);

// Role-based conditional rendering component
export const ShowForRoles = ({
  roles,
  children,
  user,
}: {
  roles: UserRole[];
  children: ReactNode;
  user?: AuthUser;
}) => {
  const { user: authUser } = useAuth();
  const targetUser = user || authUser;

  if (!targetUser || !hasAnyRole(targetUser as AuthUser, roles)) {
    return null;
  }

  return <>{children}</>;
};
