'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useState } from 'react';
import { RouteTransitionIndicator } from '@/components/RouteTransitionIndicator';
import { AuthProvider } from '@/lib/auth';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouteTransitionIndicator />
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
          expand={true}
          style={{ fontFamily: 'var(--font-bangla), Noto Sans Bengali, sans-serif' }}
          toastOptions={{
            classNames: {
              success: 'border-emerald-500/50',
              error: 'border-red-500/50',
              info: 'border-blue-500/50',
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
