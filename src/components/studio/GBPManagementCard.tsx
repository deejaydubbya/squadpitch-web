'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Loader2,
  RefreshCw,
  ExternalLink,
  Check,
  AlertCircle,
  Star,
  Building2,
  MapPin,
  Unplug,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useGBPConnect,
  useGBPCallback,
  useGBPSetLocation,
  useGBPSync,
  useGBPDisconnect,
  type GBPCallbackResult,
} from '@/hooks/useSquadpitch';

interface GBPConnectionStatus {
  status: string;
  email?: string | null;
  locationName?: string | null;
  businessName?: string | null;
  lastSyncedAt?: string | null;
  reviewCount?: number;
  averageRating?: string | null;
  unrepliedReviewCount?: number;
  lastError?: string | null;
}

interface Props {
  clientId: string;
  status?: GBPConnectionStatus;
}

export type { GBPConnectionStatus };

export function GBPManagementCard({ clientId, status }: Props) {
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
              Your reviews and ratings help Squadpitch create trust-building posts
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
          {(status?.unrepliedReviewCount ?? 0) > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20">
              {status?.unrepliedReviewCount} unreplied
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

      {/* Pending state without location picker — allow retry */}
      {isPending && !callbackResult && (
        <div className="space-y-2">
          <p className="text-xs text-white-40">
            Connection started but not finished. Try connecting again to complete setup.
          </p>
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
            Reconnect Google Business Profile
          </button>
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
