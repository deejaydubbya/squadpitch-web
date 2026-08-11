'use client';

import { useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';

const subscribe = (onStoreChange: () => void) => {
  window.addEventListener('online', onStoreChange);
  window.addEventListener('offline', onStoreChange);
  return () => {
    window.removeEventListener('online', onStoreChange);
    window.removeEventListener('offline', onStoreChange);
  };
};

const getOnlineSnapshot = () => navigator.onLine;
const getServerSnapshot = () => true;

export function ConnectivityBanner() {
  const online = useSyncExternalStore(subscribe, getOnlineSnapshot, getServerSnapshot);

  if (online) return null;

  return (
    <div
      className="safe-area-top fixed inset-x-0 top-0 z-[100] flex min-h-11 items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-black shadow-lg"
      role="status"
      aria-live="polite"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      You&apos;re offline. Changes cannot be saved until your connection returns.
    </div>
  );
}
