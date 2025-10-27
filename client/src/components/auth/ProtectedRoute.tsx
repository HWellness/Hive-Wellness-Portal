import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, ReactNode } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface ProtectedRouteProps {
  children: ReactNode;
  fallbackPath?: string;
}

export function ProtectedRoute({ children, fallbackPath = "/login" }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Only redirect after loading is complete and user is not authenticated
    if (!isLoading && !isAuthenticated) {
      console.log("ProtectedRoute: Redirecting unauthenticated user to", fallbackPath);
      setLocation(fallbackPath);
    }
  }, [isAuthenticated, isLoading, setLocation, fallbackPath]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // If not authenticated, show loading (while redirect happens)
  if (!isAuthenticated) {
    return <LoadingSpinner />;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}
