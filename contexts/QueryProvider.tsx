'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  // Create a client with optimized cache settings
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache data for 5 minutes by default
            staleTime: 5 * 60 * 1000,
            // Keep unused data in cache for 10 minutes
            gcTime: 10 * 60 * 1000,
            // Retry failed requests once
            retry: 1,
            // Refetch on window focus for important data
            refetchOnWindowFocus: true,
            // Don't refetch on mount if data is fresh
            refetchOnMount: false,
            // Don't refetch on reconnect automatically
            refetchOnReconnect: false,
          },
          mutations: {
            // Retry mutations once on failure
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
