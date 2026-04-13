'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Briefcase, Plus } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';
import { useClients } from '@/hooks/useSquadpitch';
import { ClientCard } from '@/components/studio/ClientCard';

export default function DashboardPage() {
  const { data: clients, isLoading, error } = useClients();
  const router = useRouter();

  // Redirect brand-new users to the onboarding wizard
  useEffect(() => {
    if (!isLoading && clients && clients.length === 0) {
      router.replace('/onboarding');
    }
  }, [isLoading, clients, router]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white-100 flex items-center gap-3">
            <Briefcase className="w-6 h-6 text-accent-green-110" />
            Squadpitch
          </h1>
          <p className="text-white-60 mt-1">
            Build and manage your AI-powered content systems.
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 py-8">
            <LoadingSpinner size="sm" />
            <span className="text-white-40 text-sm">Loading workspaces…</span>
          </div>
        )}

        {error && <StatusBanner error={(error as Error).message} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
          {clients?.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
          <Link
            href="/onboarding"
            className="card p-5 border-dashed hover:border-accent-green-110/50 transition-colors group text-left w-full block"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white-5 border border-dashed border-white-20 flex items-center justify-center flex-shrink-0 group-hover:border-accent-green-110/50">
                <Plus className="w-6 h-6 text-white-40 group-hover:text-accent-green-110" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white-100 font-semibold text-lg group-hover:text-accent-green-110 transition-colors">
                  Create new workspace
                </h3>
                <p className="text-sm text-white-40 mt-1">
                  Paste your website → generate your first posts in seconds
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
