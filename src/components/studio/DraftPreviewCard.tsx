'use client';

import { useState } from 'react';
import { AlertTriangle, Copy, Check, Zap, Home, Wand2, MessageSquare } from 'lucide-react';
import type { Draft } from '@/hooks/useSquadpitch';

interface Props {
  draft: Draft;
  compact?: boolean;
  maxChars?: number | null;
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

export function DraftPreviewCard({ draft, compact = false, maxChars }: Props) {
  const isFailed = draft.status === 'FAILED';
  const { copied, copy } = useCopy();

  const charCount = draft.body?.length ?? 0;
  const overLimit = maxChars ? charCount > maxChars : false;

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <StatusPill status={draft.status} />
        <Pill>{draft.channel}</Pill>
        <Pill>{draft.kind}</Pill>
        {draft.bucketKey && <Pill mono>{draft.bucketKey}</Pill>}
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

  // Content angle from autopilot reason
  if (sm.autopilotReason) {
    const reason = sm.autopilotReason;
    const angleLabel =
      reason.includes('spotlight') ? 'Listing Spotlight' :
      reason.includes('buyer') ? 'Buyer Guidance' :
      reason.includes('neighborhood') ? 'Neighborhood' :
      reason.includes('market') ? 'Market Insight' :
      reason.includes('trust') || reason.includes('review') ? 'Trust & Social Proof' :
      null;
    if (angleLabel) {
      badges.push({
        icon: null,
        text: `Angle: ${angleLabel}`,
        color: 'text-white-40',
      });
    }
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {badges.map((b, i) => (
        <span key={i} className={`inline-flex items-center gap-1 text-[11px] ${b.color}`}>
          {b.icon}
          {b.text}
        </span>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: Draft['status'] }) {
  const cls =
    status === 'APPROVED' || status === 'PUBLISHED'
      ? 'bg-zone-green/20 text-zone-green'
      : status === 'SCHEDULED'
        ? 'bg-zone-blue/20 text-zone-blue'
        : status === 'PENDING_REVIEW'
          ? 'bg-zone-yellow/20 text-zone-yellow'
          : status === 'REJECTED' || status === 'FAILED'
            ? 'bg-accent-red/20 text-accent-red'
            : 'bg-white-10 text-white-60';
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      {status}
    </span>
  );
}
