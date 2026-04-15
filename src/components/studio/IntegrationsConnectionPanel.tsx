'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Loader2,
  RefreshCw,
  ExternalLink,
  Check,
  X,
  AlertCircle,
  Star,
  Building2,
  Users,
  MapPin,
  Key,
  Unplug,
  Clock,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useIntegrationStatus,
  useGBPConnect,
  useGBPCallback,
  useGBPSetLocation,
  useGBPSync,
  useGBPDisconnect,
  useCRMConnect,
  useCRMSync,
  useCRMDisconnect,
  useRequestIntegration,
  type GBPCallbackResult,
} from '@/hooks/useSquadpitch';

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
        <h3 className="text-sm font-semibold text-white-100">Data Connections</h3>
        <p className="text-xs text-white-40 mt-0.5">
          Connect your business accounts to import reviews, deals,
          and client data for content generation.
        </p>
      </div>

      <GBPCard clientId={clientId} status={status?.gbp} />
      <CRMCard clientId={clientId} status={status?.crm} />
    </div>
  );
}

// ── GBP Card ────────────────────────────────────────────────────────────

function GBPCard({
  clientId,
  status,
}: {
  clientId: string;
  status?: { status: string; email?: string | null; locationName?: string | null; businessName?: string | null; lastSyncedAt?: string | null; reviewCount?: number; averageRating?: string | null; lastError?: string | null };
}) {
  const gbpConnect = useGBPConnect(clientId);
  const gbpCallback = useGBPCallback(clientId);
  const gbpSetLocation = useGBPSetLocation(clientId);
  const gbpSync = useGBPSync(clientId);
  const gbpDisconnect = useGBPDisconnect(clientId);

  const [callbackResult, setCallbackResult] = useState<GBPCallbackResult | null>(null);
  const [showDisconnect, setShowDisconnect] = useState(false);

  const isConnected = status?.status === 'connected';
  const isPending = status?.status === 'pending';
  const isError = status?.status === 'error';

  // Listen for OAuth popup callback
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (event.data?.type === 'sp-gbp-oauth-complete') {
        const { code, state } = event.data;
        gbpCallback.mutate(
          { code, state },
          {
            onSuccess: (result) => {
              if (result.needsLocationSelection) {
                setCallbackResult(result);
              }
            },
          }
        );
      }
    },
    [gbpCallback]
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  const handleConnect = () => {
    gbpConnect.mutate(undefined, {
      onSuccess: (data) => {
        // Open OAuth popup
        const w = 600;
        const h = 720;
        const left = window.screenX + (window.innerWidth - w) / 2;
        const top = window.screenY + (window.innerHeight - h) / 2;
        window.open(
          data.authUrl,
          'gbp-oauth',
          `width=${w},height=${h},left=${left},top=${top}`
        );
      },
    });
  };

  const handleSelectLocation = (loc: { name: string; title: string }) => {
    if (!callbackResult?.accounts?.[0]) return;
    gbpSetLocation.mutate(
      {
        accountId: callbackResult.accounts[0].name,
        locationId: loc.name,
        locationName: loc.title,
      },
      {
        onSuccess: () => setCallbackResult(null),
      }
    );
  };

  const isSyncing = gbpSync.isPending;
  const isConnecting = gbpConnect.isPending || gbpCallback.isPending;

  return (
    <div
      className={cn(
        'rounded-xl border p-4 space-y-3 transition-colors',
        isConnected
          ? 'border-accent-green-110/30 bg-accent-green-110/5'
          : isError
            ? 'border-red-500/30 bg-red-500/5'
            : 'border-white-10 bg-white-5'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              isConnected
                ? 'bg-accent-green-110/15'
                : 'bg-white-10'
            )}
          >
            <MapPin className={cn('w-5 h-5', isConnected ? 'text-accent-green-110' : 'text-white-40')} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white-100">
              Google Business Profile
            </h4>
            <p className="text-xs text-white-40">
              Import reviews, business info, and ratings
            </p>
          </div>
        </div>

        {isConnected && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => gbpSync.mutate()}
              disabled={isSyncing}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3 h-3', isSyncing && 'animate-spin')} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              onClick={() => setShowDisconnect(!showDisconnect)}
              className="p-1.5 rounded-lg text-white-30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Disconnect"
            >
              <Unplug className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Connected state */}
      {isConnected && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {status?.businessName && (
            <span className="flex items-center gap-1 text-white-60">
              <Building2 className="w-3 h-3" />
              {status.businessName}
            </span>
          )}
          {status?.averageRating && (
            <span className="flex items-center gap-1 text-yellow-400">
              <Star className="w-3 h-3 fill-current" />
              {status.averageRating}
            </span>
          )}
          {(status?.reviewCount ?? 0) > 0 && (
            <span className="text-white-40">
              {status?.reviewCount} reviews imported
            </span>
          )}
          {status?.lastSyncedAt && (
            <span className="text-white-30">
              Last sync: {formatTimeAgo(status.lastSyncedAt)}
            </span>
          )}
        </div>
      )}

      {/* Sync results */}
      {gbpSync.data && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs">
          <Check className="w-3.5 h-3.5" />
          {gbpSync.data.reviewsImported} new reviews,{' '}
          {gbpSync.data.reviewsUpdated} updated
        </div>
      )}

      {/* Error state */}
      {isError && status?.lastError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertCircle className="w-3.5 h-3.5" />
          {status.lastError}
        </div>
      )}

      {/* Location selection (after OAuth if multiple locations) */}
      {callbackResult?.needsLocationSelection && (
        <div className="space-y-2">
          <p className="text-xs text-white-60">
            Select your business location:
          </p>
          {callbackResult.locations.map((loc) => (
            <button
              key={loc.name}
              onClick={() => handleSelectLocation(loc)}
              disabled={gbpSetLocation.isPending}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-white-10 bg-white-5 text-left hover:border-accent-green-110/40 transition-colors"
            >
              <MapPin className="w-4 h-4 text-white-40" />
              <span className="text-sm text-white-100">{loc.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Disconnect confirmation */}
      {showDisconnect && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <span className="text-xs text-red-400">Disconnect Google Business Profile?</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                gbpDisconnect.mutate();
                setShowDisconnect(false);
              }}
              className="px-2 py-1 rounded text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Disconnect
            </button>
            <button
              onClick={() => setShowDisconnect(false)}
              className="px-2 py-1 rounded text-xs text-white-40 hover:text-white-60 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Connect button */}
      {!isConnected && !isPending && !callbackResult && (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors disabled:opacity-50"
        >
          {isConnecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ExternalLink className="w-4 h-4" />
          )}
          Connect Google Business Profile
        </button>
      )}
    </div>
  );
}

// ── CRM Card ────────────────────────────────────────────────────────────

const COMING_SOON_CRMS = [
  { key: 'crm_kvcore', label: 'kvCORE' },
  { key: 'crm_cinc', label: 'CINC' },
  { key: 'crm_sierra', label: 'Sierra Interactive' },
  { key: 'crm_lofty', label: 'Lofty' },
  { key: 'crm_realgeeks', label: 'Real Geeks' },
];

function CRMCard({
  clientId,
  status,
}: {
  clientId: string;
  status?: { status: string; provider?: string | null; userName?: string | null; lastSyncedAt?: string | null; dealCount?: number; contactCount?: number; lastError?: string | null };
}) {
  const crmConnect = useCRMConnect(clientId);
  const crmSync = useCRMSync(clientId);
  const crmDisconnect = useCRMDisconnect(clientId);
  const requestIntegration = useRequestIntegration(clientId);

  const [apiKey, setApiKey] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestedProviders, setRequestedProviders] = useState<Set<string>>(new Set());

  const isConnected = status?.status === 'connected';
  const isError = status?.status === 'error';
  const isSyncing = crmSync.isPending;

  const handleConnect = () => {
    setError(null);
    crmConnect.mutate(
      { apiKey },
      {
        onSuccess: () => {
          setShowForm(false);
          setApiKey('');
        },
        onError: (err) => setError(err.message || 'Failed to connect'),
      }
    );
  };

  const handleRequest = (providerKey: string, providerLabel: string) => {
    requestIntegration.mutate(
      { providerKey, providerLabel },
      {
        onSuccess: () => {
          setRequestedProviders((prev) => new Set(prev).add(providerKey));
        },
      }
    );
  };

  return (
    <div className="rounded-xl border border-white-10 bg-white-5 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white-10 flex items-center justify-center">
            <Users className="w-5 h-5 text-white-40" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white-100">Real Estate CRM</h4>
            <p className="text-xs text-white-40">Import deals, contacts, and client feedback</p>
          </div>
        </div>
      </div>

      {/* Available Now — Follow Up Boss */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-green-110">Available now</span>
        </div>

        <div
          className={cn(
            'rounded-lg border p-3 space-y-3 transition-colors',
            isConnected
              ? 'border-accent-green-110/30 bg-accent-green-110/5'
              : isError
                ? 'border-red-500/30 bg-red-500/5'
                : 'border-white-10 bg-white-5'
          )}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white-100">Follow Up Boss</p>
              {isConnected && (
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                  {status?.userName && (
                    <span className="text-white-60">{status.userName}</span>
                  )}
                  {(status?.dealCount ?? 0) > 0 && (
                    <span className="text-white-40">{status?.dealCount} deals</span>
                  )}
                  {(status?.contactCount ?? 0) > 0 && (
                    <span className="text-white-40">{status?.contactCount} contacts</span>
                  )}
                  {status?.lastSyncedAt && (
                    <span className="text-white-30">Last sync: {formatTimeAgo(status.lastSyncedAt)}</span>
                  )}
                </div>
              )}
            </div>

            {isConnected && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => crmSync.mutate()}
                  disabled={isSyncing}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn('w-3 h-3', isSyncing && 'animate-spin')} />
                  {isSyncing ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  onClick={() => setShowDisconnect(!showDisconnect)}
                  className="p-1.5 rounded-lg text-white-30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Disconnect"
                >
                  <Unplug className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Sync results */}
          {crmSync.data && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs">
                <Check className="w-3.5 h-3.5" />
                {crmSync.data.milestonesImported} milestones,{' '}
                {crmSync.data.testimonialsImported} testimonials imported
              </div>
              {crmSync.data.signals.length > 0 && (
                <div className="space-y-1">
                  {crmSync.data.signals.slice(0, 3).map((signal, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs',
                        signal.type === 'just_sold'
                          ? 'bg-purple-500/10 text-purple-400'
                          : signal.type === 'happy_client'
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-white-5 text-white-60'
                      )}
                    >
                      {signal.type === 'just_sold' ? (
                        <Building2 className="w-3 h-3" />
                      ) : (
                        <Star className="w-3 h-3" />
                      )}
                      {signal.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error state */}
          {isError && status?.lastError && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5" />
              {status.lastError}
            </div>
          )}

          {/* Disconnect confirmation */}
          {showDisconnect && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <span className="text-xs text-red-400">Disconnect CRM?</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    crmDisconnect.mutate();
                    setShowDisconnect(false);
                  }}
                  className="px-2 py-1 rounded text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  Disconnect
                </button>
                <button
                  onClick={() => setShowDisconnect(false)}
                  className="px-2 py-1 rounded text-xs text-white-40 hover:text-white-60 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Connect button / form */}
          {!isConnected && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors"
            >
              <Key className="w-4 h-4" />
              Connect Follow Up Boss
            </button>
          )}

          {showForm && !isConnected && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white-60 mb-1.5">
                  Follow Up Boss API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="fub_api_xxxxxxxxxx"
                  className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
                />
                <p className="text-[10px] text-white-30 mt-1">
                  Find your API key in Follow Up Boss &rarr; Admin &rarr; API
                </p>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-xs text-red-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleConnect}
                  disabled={!apiKey || crmConnect.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors disabled:opacity-50"
                >
                  {crmConnect.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Connect
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setApiKey('');
                    setError(null);
                  }}
                  className="px-3 py-2.5 rounded-xl text-white-40 text-sm hover:text-white-60 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Coming Soon */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white-30">Coming soon</span>
        </div>

        <div className="space-y-1.5">
          {COMING_SOON_CRMS.map((crm) => {
            const isRequested = requestedProviders.has(crm.key);
            return (
              <div
                key={crm.key}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-white-10 bg-white-5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm text-white-60">{crm.label}</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-white-5 text-white-30 border border-white-10">
                    <Clock className="w-2.5 h-2.5" />
                    Coming soon
                  </span>
                </div>
                {isRequested ? (
                  <span className="flex items-center gap-1 text-[11px] text-accent-green-110">
                    <Check className="w-3 h-3" />
                    Requested
                  </span>
                ) : (
                  <button
                    onClick={() => handleRequest(crm.key, crm.label)}
                    disabled={requestIntegration.isPending}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-white-40 hover:text-white-60 hover:bg-white-10 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" />
                    Request
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-white-20 mt-3">
          Need a different CRM? Requests help us prioritize what to build next.
        </p>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
