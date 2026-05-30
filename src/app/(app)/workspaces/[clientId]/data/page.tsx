'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useClient } from '@/hooks/useSquadpitch';
import { BusinessDataManager } from '@/components/studio/BusinessDataManager';
import { PropertyLibrary } from '@/components/studio/PropertyLibrary';

type Tab = 'knowledge' | 'properties';

export default function DataPage() {
  const params = useParams<{ clientId: string }>();
  const searchParams = useSearchParams();
  const clientId = params.clientId;
  const { data: client } = useClient(clientId);

  const isRE = client?.industryKey === 'real_estate';
  const knowledgeLabel = isRE ? 'Content Assets' : 'Knowledge';

  // Spinstr425 — legacy deep-links used `?type=PROPERTY` to land
  // on the property list inside Content Assets. Properties now live
  // on their own tab; treat the old URL as a Properties-tab link
  // so bookmarks keep working.
  const tabParam = searchParams.get('tab');
  const typeParam = searchParams.get('type');
  const initialTab: Tab =
    tabParam === 'properties' || typeParam === 'PROPERTY' ? 'properties' : 'knowledge';
  const [tab, setTab] = useState<Tab>(initialTab);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'knowledge', label: knowledgeLabel },
    ...(isRE ? [{ key: 'properties' as Tab, label: 'Properties' }] : []),
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white-100">Data</h1>
        <p className="text-sm text-white-40 mt-1">Business data, knowledge, and listings that power your content.</p>
      </div>

      {tabs.length > 1 && (
        <div className="flex items-center gap-1 border-b border-white-10">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                tab === t.key
                  ? 'border-accent-green-110 text-accent-green-110'
                  : 'border-transparent text-white-40 hover:text-white-100'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'knowledge' && <BusinessDataManager clientId={clientId} />}
      {tab === 'properties' && <PropertyLibrary clientId={clientId} />}
    </div>
  );
}
