import { useQuery } from "@tanstack/react-query";
import { AuthUser, AuthState } from "@/types/auth";

export function useAuth(): AuthState & { error: any } {
  const {
    data: user,
    isLoading,
    error,
  } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const resp = await fetch("/api/auth/user", {
        credentials: "include",
        cache: "no-store",
      });
      if (resp.status === 401) return null;
      if (!resp.ok) throw new Error("Failed to fetch auth user");
      return (await resp.json()) as AuthUser;
    },
    retry: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
    refetchInterval: false,
    staleTime: 0,
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
