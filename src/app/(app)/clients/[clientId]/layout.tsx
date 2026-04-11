'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';
import { Sidebar } from '@/components/studio/Sidebar';
import { useClient } from '@/hooks/useSquadpitch';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;

  const { data: client, isLoading, error } = useClient(clientId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <LoadingSpinner size="sm" />
          <span className="text-white-40 text-sm">Loading client…</span>
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
              <h3 className="text-white-100 font-semibold">Client not found</h3>
              <p className="text-sm text-white-60 mt-1">
                No client with id <code>{clientId}</code>.{' '}
                <Link href="/dashboard" className="text-accent-green-110 hover:underline">
                  Back to list
                </Link>.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar client={client} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
