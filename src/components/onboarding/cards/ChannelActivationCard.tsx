'use client';

import { cn } from '@/lib/utils';
import { CHANNEL_REGISTRY, type ChannelCapability } from '@/lib/channelRegistry';
import type { Draft, Channel } from '@/hooks/useSquadpitch';
import {
  CheckCircle2,
  AlertCircle,
  ImageIcon,
  Video,
  Link2,
  Shield,
} from 'lucide-react';

// ── Supported activation channels (non-comingSoon) ─────────────────

const ACTIVATION_CHANNELS: Channel[] = [
  'INSTAGRAM',
  'FACEBOOK',
  'LINKEDIN',
  'X',
  'TIKTOK',
  'YOUTUBE',
];

// ── Channel tile icons ─────────────────────────────────────────────

const CHANNEL_ICON: Record<string, string> = {
  INSTAGRAM: '📸',
  FACEBOOK: '📘',
  LINKEDIN: '💼',
  X: '𝕏',
  TIKTOK: '🎵',
  YOUTUBE: '▶️',
};

// ── Readiness logic per channel ────────────────────────────────────

type TileStatus =
  | { state: 'connected'; label: string }
  | { state: 'needs_image'; label: string }
  | { state: 'needs_video'; label: string }
  | { state: 'not_connected'; label: string };

function getChannelTileStatus(
  channel: Channel,
  cap: ChannelCapability,
  isConnected: boolean,
  drafts: Draft[],
): TileStatus {
  const channelDrafts = drafts.filter((d) => d.channel === channel);
  const hasImage = channelDrafts.some((d) => d.mediaUrl);
  // Note: we treat mediaUrl as covering both image and video for now
  const hasVideo = hasImage; // same source — mediaUrl

  if (!isConnected) {
    return { state: 'not_connected', label: 'Connect to publish' };
  }

  // YouTube requires video
  if (cap.requiresVideo && !hasVideo) {
    return { state: 'needs_video', label: 'Needs video' };
  }

  // Instagram/TikTok require media (image/video)
  if (cap.requiresMedia && !hasImage) {
    return { state: 'needs_image', label: 'Needs image' };
  }

  return { state: 'connected', label: 'Ready' };
}

// ── Props ──────────────────────────────────────────────────────────

interface Props {
  connectedSet: Set<string>;
  drafts: Draft[];
  isGenerating?: boolean;
  onConnectChannels: () => void;
  onContinueWithDrafts: () => void;
}

export function ChannelActivationCard({
  connectedSet,
  drafts,
  isGenerating,
  onConnectChannels,
  onContinueWithDrafts,
}: Props) {
  const connectedCount = ACTIVATION_CHANNELS.filter((ch) => connectedSet.has(ch)).length;
  const hasChannels = connectedCount > 0;

  return (
    <div className="rounded-xl border border-white-10 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-white-5">
        {hasChannels ? (
          <>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4.5 h-4.5 text-zone-green flex-shrink-0" />
              <h3 className="text-sm font-semibold text-white-80">Publishing is ready</h3>
            </div>
            <p className="text-xs text-white-40 mt-1 leading-relaxed">
              Squadpitch can publish and schedule to your connected accounts.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5 text-yellow-400 flex-shrink-0" />
              <h3 className="text-sm font-semibold text-white-80">
                Connect your accounts to activate this campaign
              </h3>
            </div>
            <p className="text-xs text-white-40 mt-1 leading-relaxed">
              {isGenerating
                ? 'Your posts are being prepared. You can connect channels while Squadpitch finishes building the campaign.'
                : 'Your posts are ready as drafts. Connect social channels to publish, schedule, and track them.'}
            </p>
          </>
        )}
      </div>

      {/* Channel tiles */}
      <div className="px-4 py-3 grid grid-cols-2 gap-2">
        {ACTIVATION_CHANNELS.map((ch) => {
          const cap = CHANNEL_REGISTRY[ch];
          const isConnected = connectedSet.has(ch);
          const status = getChannelTileStatus(ch, cap, isConnected, drafts);

          return (
            <div
              key={ch}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors',
                status.state === 'connected'
                  ? 'border-zone-green/25 bg-zone-green/5'
                  : status.state === 'needs_image' || status.state === 'needs_video'
                    ? 'border-yellow-500/20 bg-yellow-500/5'
                    : 'border-white-10 bg-transparent',
              )}
            >
              <span className="text-base flex-shrink-0">{CHANNEL_ICON[ch] ?? ''}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white-70 truncate">{cap.label}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {status.state === 'connected' ? (
                    <CheckCircle2 className="w-3 h-3 text-zone-green flex-shrink-0" />
                  ) : status.state === 'needs_image' ? (
                    <ImageIcon className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                  ) : status.state === 'needs_video' ? (
                    <Video className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-white-25 flex-shrink-0" />
                  )}
                  <span className={cn(
                    'text-[10px]',
                    status.state === 'connected' ? 'text-zone-green'
                      : status.state === 'needs_image' || status.state === 'needs_video'
                        ? 'text-yellow-400'
                        : 'text-white-30',
                  )}>
                    {status.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Connected summary when channels exist */}
      {hasChannels && (
        <div className="px-4 pb-1 flex items-center gap-2">
          <span className="text-xs text-zone-green font-medium">
            {connectedCount} connected
          </span>
          {connectedCount < ACTIVATION_CHANNELS.length && (
            <span className="text-xs text-white-30">
              · {ACTIVATION_CHANNELS.length - connectedCount} not connected
            </span>
          )}
        </div>
      )}

      {/* Trust copy */}
      <div className="px-4 py-2.5">
        <div className="flex items-start gap-2">
          <Shield className="w-3.5 h-3.5 text-white-20 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-white-25 leading-relaxed">
            Squadpitch only publishes after you approve or enable Autopilot.
            You can turn Autopilot on or off anytime.
          </p>
        </div>
      </div>

      {/* CTAs */}
      <div className="px-4 pb-3 flex gap-2">
        <button
          onClick={onConnectChannels}
          className={cn(
            'flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
            hasChannels
              ? 'border border-white-10 text-white-60 hover:bg-white-5'
              : 'bg-accent-green-110 text-black hover:bg-accent-green-110/90',
          )}
        >
          <Link2 className="w-4 h-4" />
          {hasChannels ? 'Manage channels' : 'Connect channels'}
        </button>
        {!hasChannels && (
          <button
            onClick={onContinueWithDrafts}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-white-10 text-white-40 text-sm hover:bg-white-5 hover:text-white-60 transition-colors"
          >
            Continue with drafts
          </button>
        )}
      </div>
    </div>
  );
}
