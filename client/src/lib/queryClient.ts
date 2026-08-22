import { QueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
      staleTime: 5 * 60 * 1000, // 5 min
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});

// Convenience hook factory used across screens
export function makeQueryFn<T>(path: string) {
  return async (): Promise<T> => apiClient.get<T>(path);
}
