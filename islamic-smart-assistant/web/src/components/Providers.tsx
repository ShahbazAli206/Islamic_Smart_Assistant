'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * App-wide client providers. Currently wires up React Query (TanStack Query)
 * so every component can share one cache for prayer-times / mosque fetches.
 * Mounted once at the root layout, wrapping all routes.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Create the QueryClient lazily in state so it's instantiated once per mount
  // and survives re-renders (never recreated on each render).
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      // staleTime keeps fetched timings "fresh" for 30s to avoid refetch storms;
      // throwOnError:false lets components handle errors inline rather than
      // bubbling to the error boundary; retry once before giving up.
      queries: { staleTime: 30_000, throwOnError: false, retry: 1 },
      mutations: { throwOnError: false },
    },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
