'use client';

import { useState } from 'react';
import {
  Link2,
  MapPin,
  Users,
  List,
  Cloud,
  FileUp,
  Star,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIntegrationStatus } from '@/hooks/useSquadpitch';
import { useListingSources } from '@/hooks/useSquadpitch';
import { useGenericIntegrations } from '@/hooks/useIntegrations';
import { ImportDataModal } from './ImportDataModal';
import { SourceManagementModal } from './SourceManagementModal';

interface Props {
  clientId: string;
  isRE: boolean;
}

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
        connected
          ? 'bg-green-500/15 text-green-400'
          : 'bg-white-10 text-white-40'
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          connected ? 'bg-green-400' : 'bg-white-30'
        )}
      />
      {connected ? 'Connected' : 'Not connected'}
    </span>
  );
}

function SourceCard({
  icon: Icon,
  title,
  connected,
  children,
  onManage,
  manageLabel,
}: {
  icon: React.ElementType;
  title: string;
  connected: boolean;
  children: React.ReactNode;
  onManage?: () => void;
  manageLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-white-10 bg-white-5 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              connected ? 'bg-green-500/15 text-green-400' : 'bg-white-10 text-white-40'
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium text-white-100">{title}</span>
        </div>
        <StatusBadge connected={connected} />
      </div>

      <div className="text-sm text-white-60 space-y-1.5">{children}</div>

      {onManage && (
        <button
          onClick={onManage}
          className="inline-flex items-center gap-1 text-xs text-accent-green-110 hover:text-accent-green-130 mt-auto"
        >
          {manageLabel ?? 'Manage'}
        </button>
      )}
    </div>
  );
}

export function ConnectedSourcesOverview({ clientId, isRE }: Props) {
  const { data: integrationStatus, isLoading: statusLoading } =
    useIntegrationStatus(clientId);
  const { data: listingData, isLoading: listingsLoading } =
    useListingSources(clientId);
  const { data: genericIntegrations, isLoading: integrationsLoading } =
    useGenericIntegrations();

  const [showImport, setShowImport] = useState(false);
  const [managingSource, setManagingSource] = useState<'gbp' | 'crm' | 'listings' | 'cloud' | null>(null);

  const gbp = integrationStatus?.gbp;
  const crm = integrationStatus?.crm;
  const gbpConnected = gbp?.status === 'connected';
  const crmConnected = crm?.status === 'connected';

  const listingSources = listingData?.sources ?? [];
  const listingStats = listingData?.stats;
  const listingsConnected = listingSources.length > 0;

  const cloudProviders = (genericIntegrations ?? []).filter(
    (i) =>
      (i.type === 'google_drive' || i.type === 'dropbox') && i.isActive
  );
  const cloudConnected = cloudProviders.length > 0;

  const isLoading = statusLoading || (isRE && listingsLoading) || integrationsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-white-40" />
      </div>
    );
  }

  const allDisconnected =
    !gbpConnected && !crmConnected && !listingsConnected && !cloudConnected;

  if (allDisconnected) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-xl bg-white-10 flex items-center justify-center mb-4">
            <Link2 className="w-6 h-6 text-white-40" />
          </div>
          <h3 className="text-lg font-semibold text-white-100 mb-2">
            No connected sources yet
          </h3>
          <p className="text-sm text-white-40 mb-6">
            Squadpitch gets smarter when you connect your business tools. Reviews,
            listings, contacts, and files all help create better posts and recommendations.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setManagingSource('gbp')}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-accent-green-110 text-black hover:bg-accent-green-130 transition-colors"
            >
              Connect a source
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-white-10 text-white-100 hover:bg-white-5 transition-colors"
            >
              Import data manually
            </button>
          </div>
        </div>
        {showImport && (
          <ImportDataModal
            clientId={clientId}
            onClose={() => setShowImport(false)}
          />
        )}
        <SourceManagementModal
          clientId={clientId}
          source={managingSource}
          isRE={isRE}
          onClose={() => setManagingSource(null)}
        />
      </>
    );
  }

  function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Google Business Profile */}
        <SourceCard
          icon={MapPin}
          title="Google Business Profile"
          connected={gbpConnected}
          onManage={() => setManagingSource('gbp')}
          manageLabel={gbpConnected ? 'Manage' : 'Connect'}
        >
          {gbpConnected ? (
            <>
              <p className="text-white-100 font-medium">{gbp!.businessName}</p>
              {gbp!.averageRating && (
                <p className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  {gbp!.averageRating} · {gbp!.reviewCount} reviews
                </p>
              )}
              {gbp!.lastSyncedAt && (
                <p className="text-xs text-white-30">
                  Last synced {formatDate(gbp!.lastSyncedAt)}
                </p>
              )}
            </>
          ) : (
            <p>Connect GBP so Squadpitch can use your reviews and ratings to create better posts</p>
          )}
        </SourceCard>

        {/* CRM — RE only */}
        {isRE && (
          <SourceCard
            icon={Users}
            title="CRM"
            connected={crmConnected}
            onManage={() => setManagingSource('crm')}
            manageLabel={crmConnected ? 'Manage' : 'Connect'}
          >
            {crmConnected ? (
              <>
                <p className="text-white-100 font-medium capitalize">
                  {crm!.provider}
                </p>
                <p>
                  {crm!.dealCount} deals · {crm!.contactCount} contacts
                </p>
                {crm!.lastSyncedAt && (
                  <p className="text-xs text-white-30">
                    Last synced {formatDate(crm!.lastSyncedAt)}
                  </p>
                )}
              </>
            ) : (
              <p>Connect your CRM so Squadpitch can recommend campaigns based on your deals and contacts</p>
            )}
          </SourceCard>
        )}

        {/* Listing Feeds — RE only */}
        {isRE && (
          <SourceCard
            icon={List}
            title="Listing Feeds"
            connected={listingsConnected}
            onManage={() => setManagingSource('listings')}
            manageLabel={listingsConnected ? 'Manage' : 'Add sources'}
          >
            {listingsConnected ? (
              <>
                <p>
                  {listingStats?.sourceCount ?? listingSources.length} sources ·{' '}
                  {listingStats?.totalListings ?? 0} listings
                </p>
                {listingStats?.lastSyncedAt && (
                  <p className="text-xs text-white-30">
                    Last synced {formatDate(listingStats.lastSyncedAt)}
                  </p>
                )}
              </>
            ) : (
              <p>Add listing sources so Squadpitch can create property marketing automatically</p>
            )}
          </SourceCard>
        )}

        {/* Cloud Storage */}
        <SourceCard
          icon={Cloud}
          title="Cloud Storage"
          connected={cloudConnected}
          onManage={() => setManagingSource('cloud')}
          manageLabel={cloudConnected ? 'Manage' : 'Connect'}
        >
          {cloudConnected ? (
            <p>
              {cloudProviders
                .map((p) =>
                  p.type === 'google_drive' ? 'Google Drive' : 'Dropbox'
                )
                .join(', ')}
            </p>
          ) : (
            <p>Connect Google Drive or Dropbox to use your files as source material</p>
          )}
        </SourceCard>

        {/* Data Import */}
        <SourceCard icon={FileUp} title="Data Import" connected={false}>
          <p>Import from URLs, text, CSV, Google Sheets, or Notion</p>
          <button
            onClick={() => setShowImport(true)}
            className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white-10 text-white-100 hover:bg-white-15 transition-colors"
          >
            <FileUp className="w-3 h-3" />
            Import data
          </button>
        </SourceCard>
      </div>

      {showImport && (
        <ImportDataModal
          clientId={clientId}
          onClose={() => setShowImport(false)}
        />
      )}

      <SourceManagementModal
        clientId={clientId}
        source={managingSource}
        isRE={isRE}
        onClose={() => setManagingSource(null)}
      />
    </>
  );
}
