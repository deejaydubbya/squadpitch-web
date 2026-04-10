'use client';

import { AlertTriangle, Briefcase } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';
import { useClients } from '@/hooks/useSquadpitch';
import { ClientCard } from '@/components/studio/ClientCard';
import { CreateClientForm } from '@/components/studio/CreateClientForm';

export default function DashboardPage() {
  const { data: clients, isLoading, error } = useClients();

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white-100 flex items-center gap-3">
          <Briefcase className="w-6 h-6 text-accent-green-110" />
          Squadpitch
        </h1>
        <p className="text-white-60 mt-1">
          Manage client brands and generate on-brand social content with AI.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-8">
          <LoadingSpinner size="sm" />
          <span className="text-white-40 text-sm">Loading clients…</span>
        </div>
      )}

      {error && <StatusBanner error={(error as Error).message} />}

      {clients && clients.length === 0 && (
        <div className="card p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-white-100 font-semibold">No clients yet</h3>
              <p className="text-sm text-white-60 mt-1">
                Create your first client workspace to start generating on-brand content.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
        {clients?.map((client) => (
          <ClientCard key={client.id} client={client} />
        ))}
        <CreateClientForm />
      </div>
    </div>
  );
}
