'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { initWebSentry } from '@/lib/sentry';
import { initAnalytics } from '@/lib/analytics';
import { UILocaleProvider } from '@/components/i18n/UILocaleProvider';
import { ConnectivityBanner } from '@/components/mobile/ConnectivityBanner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
    },
  }));

  // Register service worker on app load (needed for push notifications)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    // Initialise Sentry + analytics once per session. Both no-op
    // without their respective env keys, so local dev is unaffected.
    void initWebSentry();
    void initAnalytics();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Phase 3 multilingual — dashboard UI strings flow through
          next-intl below this provider. Provider-only (no locale
          routing) so workspace URLs stay unchanged. */}
      <UILocaleProvider>
        <ConnectivityBanner />
        <div className="min-h-screen bg-sp-bg text-white-100">
          {children}
        </div>
      </UILocaleProvider>
    </QueryClientProvider>
  );
}
