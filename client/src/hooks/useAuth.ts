import { useQuery } from "@tanstack/react-query";
import { AuthUser, AuthState } from "@/types/auth";

export function useAuth(): AuthState & { error: any } {
  const {
    data: user,
    isLoading,
    error,
  } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
    retry: 0, // No retries for faster login page loading
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes cache for better performance
    gcTime: 1000 * 60 * 10, // 10 minutes cache
    refetchInterval: false,
    throwOnError: false,
    // Faster timeout for login pages
    meta: {
      timeout: 3000, // 3 second timeout for quick response
    },
  });

  const isAuthenticated = !!user && !error;

  // Performance: Remove debug logging for faster loading

  return {
    user: error ? null : user || null,
    isLoading,
    isAuthenticated,
    error,
  };
}
