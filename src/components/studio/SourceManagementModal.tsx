'use client';

import { X } from 'lucide-react';
import { useIntegrationStatus } from '@/hooks/useSquadpitch';
import { GBPManagementCard } from './GBPManagementCard';
import { CRMManagementCard } from './CRMManagementCard';
import { ListingFeedsManager } from './ListingFeedsManager';
import { CloudStorageManager } from './CloudStorageManager';

type SourceType = 'gbp' | 'crm' | 'listings' | 'cloud';

interface Props {
  clientId: string;
  source: SourceType | null;
  isRE: boolean;
  onClose: () => void;
}

const SOURCE_TITLES: Record<SourceType, string> = {
  gbp: 'Google Business Profile',
  crm: 'CRM',
  listings: 'Listing Feeds',
  cloud: 'Cloud Storage',
};

export function SourceManagementModal({ clientId, source, isRE, onClose }: Props) {
  const { data: status } = useIntegrationStatus(clientId);

  if (!source) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-sp-bg border border-white-10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white-10">
          <h2 className="text-lg font-bold text-white-100">
            {SOURCE_TITLES[source]}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-white-40 hover:text-white-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {source === 'gbp' && (
            <GBPManagementCard clientId={clientId} status={status?.gbp} />
          )}
          {source === 'crm' && (
            <CRMManagementCard clientId={clientId} status={status?.crm} />
          )}
          {source === 'listings' && (
            <ListingFeedsManager clientId={clientId} />
          )}
          {source === 'cloud' && (
            <CloudStorageManager clientId={clientId} />
          )}
        </div>
      </div>
    </div>
  );
}
