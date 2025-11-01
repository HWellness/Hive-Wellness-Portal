import { useQuery } from "@tanstack/react-query";
import { AuthUser, AuthState } from "@/types/auth";

// Get API base URL (same logic as queryClient)
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (import.meta.env.DEV) {
    return "";
  }
  return "";
};

const API_BASE_URL = getApiBaseUrl();

export function useAuth(): AuthState & { error: any } {
  const {
    data: user,
    isLoading,
    error,
  } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const url = `/api/auth/user`;
      const fullUrl =
        url.startsWith("http://") || url.startsWith("https://") ? url : `${API_BASE_URL}${url}`;
      const resp = await fetch(fullUrl, {
        credentials: "include",
        cache: "no-store",
      });
      if (resp.status === 401) return null;
      if (!resp.ok) throw new Error("Failed to fetch auth user");
      return (await resp.json()) as AuthUser;
    },
    retry: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Only refetch if data is stale
    refetchInterval: false,
    staleTime: 1000 * 30, // Consider data fresh for 30 seconds
    gcTime: 1000 * 60 * 5,
    throwOnError: false,
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
