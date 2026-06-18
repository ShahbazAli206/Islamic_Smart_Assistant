'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeProvider } from '@/lib/ThemeContext';

/**
 * App-wide client providers. Currently wires up React Query (TanStack Query)
 * so every component can share one cache for prayer-times / mosque fetches.
 * Mounted once at the root layout, wrapping all routes.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, throwOnError: false, retry: 1 },
      mutations: { throwOnError: false },
    },
  }));
  return (
    <ThemeProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}
