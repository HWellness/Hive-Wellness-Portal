import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Get API base URL from environment or use relative path for dev proxy
const getApiBaseUrl = () => {
  // In production, use the environment variable if set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In development, use empty string so requests go through vite proxy
  if (import.meta.env.DEV) {
    return "";
  }
  // Fallback: assume API is on same domain with /api prefix (for development)
  return "";
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Helper to build full API URL from relative path
 */
export function getApiUrl(url: string): string {
  return url.startsWith("http://") || url.startsWith("https://") ? url : `${API_BASE_URL}${url}`;
}

/**
 * Wrapper around fetch that automatically handles API base URL
 * Drop-in replacement for fetch() when making API calls
 */
export async function fetchApi(url: string, options?: RequestInit): Promise<Response> {
  const fullUrl = getApiUrl(url);
  return fetch(fullUrl, {
    ...options,
    credentials: options?.credentials || "include",
  });
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined
): Promise<Response> {
  const headers: Record<string, string> = {};
  let body: string | FormData | undefined;

  // Handle FormData differently (for file uploads)
  if (data instanceof FormData) {
    body = data;
    // Don't set Content-Type for FormData - let browser set it with boundary
  } else if (data) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(data);
  }

  // Build full URL using helper
  const fullUrl = getApiUrl(url);

  const res = await fetch(fullUrl, {
    method,
    headers,
    body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let url = queryKey[0] as string;

    // Handle path parameters and query strings
    if (queryKey.length > 1) {
      const params = queryKey[1];

      // If second element is a string, treat as path parameter
      if (typeof params === "string") {
        url = url.replace(/\/:[^\/]+$/, `/${params}`);
      }
      // If it's an object, treat as query parameters
      else if (params && typeof params === "object") {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
        const queryString = queryParams.toString();
        if (queryString) {
          url += (url.includes("?") ? "&" : "?") + queryString;
        }
      }
    }

    // Build full URL using helper
    const fullUrl = getApiUrl(url);

    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnMount: true, // Only refetch if data is stale
      staleTime: 1000 * 60 * 2, // 2 minutes - data is fresh for 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes cache time
      retry: false,
      networkMode: "online",
    },
    mutations: {
      retry: false,
      gcTime: 1000 * 60 * 5, // 5 minutes for mutations
    },
  },
});
