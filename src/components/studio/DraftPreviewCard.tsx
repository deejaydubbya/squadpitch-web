'use client';

import { useState } from 'react';
import { AlertTriangle, Copy, Check, Zap, Home, Wand2, MessageSquare, LinkIcon, Calendar } from 'lucide-react';
import type { Draft } from '@/hooks/useSquadpitch';
import { useChannelConnectionStatus } from '@/hooks/useSquadpitch';
import { AngleBadge } from './AngleBadge';
import { WhyThis, generateReasons } from './WhyThis';

interface Props {
  draft: Draft;
  compact?: boolean;
  maxChars?: number | null;
  clientId?: string;
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };
  return { copied, copy };
}

export function DraftPreviewCard({ draft, compact = false, maxChars, clientId }: Props) {
  const isFailed = draft.status === 'FAILED';
  const { copied, copy } = useCopy();
  const connectionStatus = useChannelConnectionStatus(clientId);
  const isConnected = !clientId || connectionStatus.get(draft.channel) === true;

  const charCount = draft.body?.length ?? 0;
  const overLimit = maxChars ? charCount > maxChars : false;

  return (
    <div className="space-y-3">
      {/* Channel connection warning */}
      {clientId && !isConnected && (draft.status === 'DRAFT' || draft.status === 'APPROVED') && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
          <LinkIcon className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            Connect your {draft.channel.charAt(0) + draft.channel.slice(1).toLowerCase()} account to publish.{' '}
            <a href={`/workspaces/${clientId}/settings/channels`} className="underline hover:text-yellow-300">
              Settings &rarr; Channels
            </a>
          </span>
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <StatusPill status={draft.status} />
        <Pill>{draft.channel}</Pill>
        <Pill>{draft.kind}</Pill>
        {draft.bucketKey && <Pill mono>{draft.bucketKey}</Pill>}
        {draft.campaignId && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-green-110/15 text-accent-green-110" title={draft.campaignName ?? undefined}>
            {draft.campaignDay && draft.campaignTotal
              ? `Day ${draft.campaignDay} of ${draft.campaignTotal}`
              : 'Campaign'}
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          {maxChars && (
            <span
              className={`text-xs font-mono ${overLimit ? 'text-accent-red' : 'text-white-40'}`}
            >
              {charCount}/{maxChars}
            </span>
          )}
          {draft.modelUsed && (
            <span className="text-xs text-white-40 font-mono">
              {draft.modelUsed}
            </span>
          )}
        </span>
      </div>

      {/* Scheduled time */}
      {draft.scheduledFor && (
        <div className="flex items-center gap-1.5 text-xs text-blue-400">
          <Calendar className="w-3 h-3" />
          <span>
            Scheduled for{' '}
            {new Date(draft.scheduledFor).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            {' at '}
            {new Date(draft.scheduledFor).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
      )}

      {/* Source explainability */}
      <SourceBadges draft={draft} />

      {isFailed && draft.warnings.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-accent-red/30 bg-accent-red/5 p-3">
          <AlertTriangle className="w-4 h-4 text-accent-red flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            {draft.warnings.map((w, i) => (
              <p key={i} className="text-xs text-accent-red font-mono">
                {w}
              </p>
            ))}
          </div>
        </div>
      )}

      {draft.status === 'REJECTED' && draft.rejectedReason && (
        <div className="flex items-start gap-2 rounded-lg border border-accent-red/30 bg-accent-red/5 p-3">
          <AlertTriangle className="w-4 h-4 text-accent-red flex-shrink-0 mt-0.5" />
          <p className="text-xs text-accent-red">
            Rejected: {draft.rejectedReason}
          </p>
        </div>
      )}

      {draft.body && (
        <div className="group relative">
          {!compact && (
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs text-white-40 uppercase tracking-wider">
                Body
              </p>
              <CopyBtn
                onClick={() => copy(draft.body, 'body')}
                copied={copied === 'body'}
              />
            </div>
          )}
          <p className={`text-sm text-white-100 whitespace-pre-wrap ${compact ? 'line-clamp-3' : ''}`}>
            {draft.body}
          </p>
        </div>
      )}

      {/* Hooks */}
      {!compact && draft.hooks && draft.hooks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-white-40 uppercase tracking-wider">
              Hooks
            </p>
            <CopyBtn
              onClick={() => copy(draft.hooks.join('\n'), 'hooks')}
              copied={copied === 'hooks'}
            />
          </div>
          <ul className="space-y-0.5">
            {draft.hooks.map((hook, i) => (
              <li key={i} className="text-sm text-white-80">
                • {hook}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA */}
      {!compact && draft.cta && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-white-40 uppercase tracking-wider">
              CTA
            </p>
            <CopyBtn
              onClick={() => copy(draft.cta!, 'cta')}
              copied={copied === 'cta'}
            />
          </div>
          <p className="text-sm text-white-80 italic">{draft.cta}</p>
        </div>
      )}

      {/* Hashtags */}
      {!compact && draft.hashtags && draft.hashtags.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-white-40 uppercase tracking-wider">
              Hashtags
            </p>
            <CopyBtn
              onClick={() =>
                copy(draft.hashtags.map((t) => `#${t}`).join(' '), 'hashtags')
              }
              copied={copied === 'hashtags'}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {draft.hashtags.map((tag, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full bg-white-10 text-white-80 text-xs font-mono"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {!compact && draft.variations && draft.variations.length > 0 && (
        <div>
          <p className="text-xs text-white-40 uppercase tracking-wider mb-1">
            Variations
          </p>
          <ul className="space-y-1">
            {draft.variations.map((v, i) => (
              <li
                key={i}
                className="text-sm text-white-60 border-l-2 border-white-10 pl-2"
              >
                {typeof v === 'string' ? v : v.body}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!compact && draft.altText && (
        <div>
          <p className="text-xs text-white-40 uppercase tracking-wider mb-1">
            Alt text
          </p>
          <p className="text-xs text-white-60 italic">{draft.altText}</p>
        </div>
      )}

      <p className="text-xs text-white-40 pt-1">
        {new Date(draft.createdAt).toLocaleString()}
      </p>
    </div>
  );
}

function CopyBtn({
  onClick,
  copied,
}: {
  onClick: () => void;
  copied: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="text-white-40 hover:text-white-100 transition-colors"
      title="Copy"
    >
      {copied ? (
        <Check className="w-3 h-3 text-zone-green" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </button>
  );
}

function Pill({
  children,
  mono,
}: {
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium bg-white-10 text-white-60 ${
        mono ? 'font-mono' : ''
      }`}
    >
      {children}
    </span>
  );
}

function SourceBadges({ draft }: { draft: Draft }) {
  const sm = draft.sourceMeta;
  if (!sm) return null;

  const badges: { icon: React.ReactNode; text: string; color: string }[] = [];

  // Source asset type
  if (sm.listingTitle) {
    badges.push({
      icon: <Home className="w-3 h-3" />,
      text: `From listing: ${sm.listingTitle}`,
      color: 'text-accent-green-110',
    });
  } else if (sm.source === 'listing') {
    badges.push({
      icon: <Home className="w-3 h-3" />,
      text: 'From listing',
      color: 'text-accent-green-110',
    });
  } else if (sm.source === 'review') {
    badges.push({
      icon: <MessageSquare className="w-3 h-3" />,
      text: 'From testimonial',
      color: 'text-blue-400',
    });
  }

  // Created by
  if (sm.autopilot) {
    badges.push({
      icon: <Zap className="w-3 h-3" />,
      text: 'Created by Autopilot',
      color: 'text-yellow-400',
    });
  } else if (sm.autoGenerated) {
    badges.push({
      icon: <Wand2 className="w-3 h-3" />,
      text: 'Auto-generated',
      color: 'text-purple-400',
    });
  }

  // Content angle — prefer explicit field, fall back to inference
  const angleLabel = sm.contentAngle ?? (
    sm.autopilotReason?.includes('spotlight') ? 'Listing Spotlight' :
    sm.autopilotReason?.includes('buyer') ? 'Buyer Guidance' :
    sm.autopilotReason?.includes('neighborhood') ? 'Neighborhood' :
    sm.autopilotReason?.includes('market') ? 'Market Insight' :
    sm.autopilotReason?.includes('trust') || sm.autopilotReason?.includes('review') ? 'Trust & Social Proof' :
    null
  );

  // "Why this?" reasons for scheduled/autopilot drafts
  const showWhyThis = draft.status === 'SCHEDULED' || sm.autopilot || sm.autoGenerated;
  const reasons = showWhyThis
    ? generateReasons({
        sourceMeta: sm,
        isAutopilot: sm.autopilot,
        angleLabel,
      })
    : [];

  if (badges.length === 0 && !angleLabel && reasons.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        {badges.map((b, i) => (
          <span key={i} className={`inline-flex items-center gap-1 text-[11px] ${b.color}`}>
            {b.icon}
            {b.text}
          </span>
        ))}
        {angleLabel && (
          <AngleBadge angleKey={sm.contentAngleKey} angleLabel={angleLabel} />
        )}
      </div>
      {reasons.length > 0 && <WhyThis reasons={reasons} />}
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending',
  APPROVED: 'Approved',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
  REJECTED: 'Rejected',
  FAILED: 'Failed',
};

function StatusPill({ status }: { status: Draft['status'] }) {
  const cls =
    status === 'PUBLISHED'
      ? 'bg-accent-green-110/15 text-accent-green-110'
      : status === 'APPROVED'
        ? 'bg-green-500/15 text-green-400'
        : status === 'SCHEDULED'
          ? 'bg-blue-500/15 text-blue-400'
          : status === 'PENDING_REVIEW'
            ? 'bg-yellow-500/15 text-yellow-400'
            : status === 'REJECTED' || status === 'FAILED'
              ? 'bg-red-500/15 text-red-400'
              : 'bg-white-10 text-white-60';
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
