'use client';

import { Loader2 } from 'lucide-react';
import { useIntegrationStatus } from '@/hooks/useSquadpitch';
import { GBPManagementCard } from './GBPManagementCard';
import { CRMManagementCard } from './CRMManagementCard';

interface Props {
  clientId: string;
}

export function IntegrationsConnectionPanel({ clientId }: Props) {
  const { data: status, isLoading } = useIntegrationStatus(clientId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-white-30" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white-100">Business Connections</h3>
        <p className="text-xs text-white-40 mt-0.5">
          Connect your business accounts so Squadpitch can learn from your
          reviews, deals, and contacts to create smarter posts.
        </p>
      </div>

      <GBPManagementCard clientId={clientId} status={status?.gbp} />
      <CRMManagementCard clientId={clientId} status={status?.crm} />
    </div>
  );
}
