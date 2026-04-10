'use client';

import { useRef, useState } from 'react';
import {
  Instagram,
  Music2,
  Linkedin,
  Twitter,
  Facebook,
  Youtube,
  FileText,
  Loader2,
  Link2,
  Unlink,
  AlertTriangle,
} from 'lucide-react';
import {
  useStartOAuth,
  useDisconnectChannel,
  type ChannelConnection,
  type Channel,
  type ChannelConnectionStatus,
} from '@/hooks/useSquadpitch';
import { cn } from '@/lib/utils';

interface Props {
  clientId: string;
  channel: Channel;
  connection: ChannelConnection | null;
}

const CHANNEL_META: Record<
  Channel,
  { label: string; icon: React.ComponentType<{ className?: string }>; real: boolean }
> = {
  INSTAGRAM: { label: 'Instagram', icon: Instagram, real: true },
  TIKTOK: { label: 'TikTok', icon: Music2, real: true },
  LINKEDIN: { label: 'LinkedIn', icon: Linkedin, real: true },
  X: { label: 'X', icon: Twitter, real: true },
  FACEBOOK: { label: 'Facebook', icon: Facebook, real: true },
  YOUTUBE: { label: 'YouTube', icon: Youtube, real: false },
  BLOG: { label: 'Blog', icon: FileText, real: false },
};

const STATUS_PILL: Record<ChannelConnectionStatus, string> = {
  CONNECTED: 'bg-zone-green/20 text-zone-green',
  EXPIRED: 'bg-zone-yellow/20 text-zone-yellow',
  REVOKED: 'bg-accent-red/20 text-accent-red',
  ERROR: 'bg-accent-red/20 text-accent-red',
};

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function ChannelConnectionCard({ clientId, channel, connection }: Props) {
  const meta = CHANNEL_META[channel];
  const Icon = meta.icon;
  const startOAuth = useStartOAuth(clientId);
  const disconnect = useDisconnectChannel(clientId);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const popupRef = useRef<Window | null>(null);

  const isConnected = connection && connection.status === 'CONNECTED';
  const isBroken =
    connection &&
    (connection.status === 'EXPIRED' ||
      connection.status === 'ERROR' ||
      connection.status === 'REVOKED');

  const handleConnect = () => {
    setPopupBlocked(false);

    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return;
    }

    const popup = window.open(
      'about:blank',
      'sp-oauth-popup',
      'width=600,height=720'
    );
    if (!popup) {
      setPopupBlocked(true);
      return;
    }
    popupRef.current = popup;

    startOAuth.mutate(channel, {
      onSuccess: (data) => {
        if (popup.closed) {
          popupRef.current = null;
          return;
        }
        popup.location.href = data.authUrl;
      },
      onError: () => {
        popup.close();
        popupRef.current = null;
      },
    });
  };

  const handleDisconnect = () => {
    if (
      !window.confirm(
        `Disconnect ${meta.label}? You will need to reconnect to publish again.`
      )
    ) {
      return;
    }
    disconnect.mutate(channel);
  };

  const errorMessage = popupBlocked
    ? 'Popup blocked. Please allow popups for this site.'
    : (startOAuth.error as Error | null)?.message ??
      (disconnect.error as Error | null)?.message ??
      null;

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-white-5 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-white-60" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white-100 font-semibold">{meta.label}</h3>
            {!meta.real && (
              <span className="text-xs text-white-40 font-medium">
                Coming soon
              </span>
            )}
            {connection && (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
                  STATUS_PILL[connection.status]
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {connection.status}
              </span>
            )}
          </div>

          {connection?.displayName && (
            <p className="text-sm text-white-60 mt-1 truncate">
              {connection.displayName}
            </p>
          )}

          {connection && (
            <p className="text-xs text-white-40 mt-1">
              Last validated {formatRelative(connection.lastValidatedAt)}
              {connection.tokenExpiresAt && (
                <>
                  {' · '}
                  token expires{' '}
                  {new Date(connection.tokenExpiresAt).toLocaleDateString()}
                </>
              )}
            </p>
          )}

          {isBroken && connection?.lastError && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-accent-red">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{connection.lastError}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-accent-red">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          {!meta.real && !connection ? (
            <button
              disabled
              className="text-xs px-3 py-1.5 rounded-md bg-white-10 text-white-40 cursor-not-allowed"
            >
              Unavailable
            </button>
          ) : isConnected ? (
            <button
              onClick={handleDisconnect}
              disabled={disconnect.isPending}
              className="text-xs px-3 py-1.5 rounded-md bg-accent-red/20 text-accent-red hover:bg-accent-red/30 flex items-center gap-1 disabled:opacity-50"
            >
              {disconnect.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Unlink className="w-3 h-3" />
              )}
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={startOAuth.isPending || !meta.real}
              className="text-xs px-3 py-1.5 rounded-md bg-accent-green-110/20 text-accent-green-110 hover:bg-accent-green-110/30 flex items-center gap-1 disabled:opacity-50"
            >
              {startOAuth.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Link2 className="w-3 h-3" />
              )}
              {isBroken ? 'Reconnect' : `Connect ${meta.label}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
