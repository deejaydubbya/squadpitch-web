'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Wand2, Megaphone, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClient } from '@/hooks/useSquadpitch';
import { BusinessDataManager } from '@/components/studio/BusinessDataManager';
import { AssetLibrary } from '@/components/studio/AssetLibrary';
import { ConnectedSourcesOverview } from '@/components/studio/ConnectedSourcesOverview';
import { PropertyLibrary } from '@/components/studio/PropertyLibrary';

type Tab = 'knowledge' | 'properties' | 'media' | 'connections';

function resolveInitialTab(raw: string | null): Tab {
  if (raw === 'properties') return 'properties';
  if (raw === 'media') return 'media';
  if (raw === 'connections') return 'connections';
  // backward compat: ?tab=data → knowledge
  return 'knowledge';
}

export default function SourcesPage() {
  const params = useParams<{ clientId: string }>();
  const searchParams = useSearchParams();
  const clientId = params.clientId;
  const { data: client } = useClient(clientId);

  const [tab, setTab] = useState<Tab>(() =>
    resolveInitialTab(searchParams.get('tab'))
  );

  const isRE = client?.industryKey === 'real_estate';
  const knowledgeLabel = isRE ? 'Content Assets' : 'Knowledge';
  const base = `/workspaces/${clientId}`;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'knowledge', label: knowledgeLabel },
    ...(isRE ? [{ key: 'properties' as Tab, label: 'Properties' }] : []),
    { key: 'media', label: 'Media' },
    { key: 'connections', label: 'Connections' },
  ];

  return (
    <div className="space-y-4">
      {/* Header + Tabs */}
      <div>
        <h1 className="text-xl font-bold text-white-100">Sources</h1>
      </div>

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

      {/* Compact action bars for non-knowledge tabs */}
      {tab === 'properties' && (
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`${base}/listing-campaign`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-accent-green-110 text-black hover:bg-accent-green-130 transition-colors"
          >
            <Megaphone className="w-3 h-3" />
            Create Campaign
          </Link>
        </div>
      )}

      {tab === 'media' && (
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`${base}/create`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-accent-green-110 text-black hover:bg-accent-green-130 transition-colors"
          >
            <Wand2 className="w-3 h-3" />
            Use in a quick post
          </Link>
        </div>
      )}

      {tab === 'connections' && (
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`${base}/settings/integrations`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-white-10 text-white-100 hover:bg-white-5 transition-colors"
          >
            Manage workflow integrations
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Tab content */}
      {tab === 'knowledge' && <BusinessDataManager clientId={clientId} />}
      {tab === 'properties' && <PropertyLibrary clientId={clientId} />}
      {tab === 'media' && <AssetLibrary clientId={clientId} />}
      {tab === 'connections' && (
        <ConnectedSourcesOverview clientId={clientId} isRE={isRE} />
      )}
    </div>
  );
}
