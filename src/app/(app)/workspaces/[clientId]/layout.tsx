'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, usePathname } from 'next/navigation';
import { AlertTriangle, Menu, X } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';
import { Sidebar } from '@/components/studio/Sidebar';
import { useClient } from '@/hooks/useSquadpitch';
import { UsageLimitProvider } from '@/components/billing/UsageLimitGuard';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  const prevPathRef = { current: pathname };
  if (prevPathRef.current !== pathname) {
    prevPathRef.current = pathname;
    if (mobileOpen) setMobileOpen(false);
  }

  const { data: client, isLoading, error } = useClient(clientId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <LoadingSpinner size="sm" />
          <span className="text-white-40 text-sm">Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <StatusBanner error={(error as Error).message} />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="card p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-white-100 font-semibold">Workspace not found</h3>
              <p className="text-sm text-white-60 mt-1">
                No workspace with id <code>{clientId}</code>.{' '}
                <Link href="/workspaces" className="text-accent-green-110 hover:underline">
                  Back to list
                </Link>.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isGettingStarted = pathname.endsWith('/getting-started');

  // Minimal layout for getting-started flow (no sidebar, no hamburger)
  if (isGettingStarted) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-white-10">
          <Link href="/workspaces" className="flex items-center gap-2">
            <Image src="/icon-192.png" alt="Squadpitch" width={24} height={24} />
            <span className="text-sm font-semibold text-white-80">Squadpitch</span>
          </Link>
          <Link
            href={`/workspaces/${clientId}`}
            className="text-xs text-white-30 hover:text-white-60 transition-colors"
          >
            Skip setup
          </Link>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar client={client} />
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-sp-card border border-white-10 text-white-60 hover:text-white-100"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="lg:hidden fixed inset-y-0 left-0 z-50 w-64">
            <Sidebar client={client} />
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white-40 hover:text-white-100 hover:bg-white-10"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 lg:pt-8">
          <UsageLimitProvider clientId={clientId}>
            {children}
          </UsageLimitProvider>
        </div>
      </main>
    </div>
  );
}
