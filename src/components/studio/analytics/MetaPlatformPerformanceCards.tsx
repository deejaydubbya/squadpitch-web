'use client';

import { Facebook, Instagram } from 'lucide-react';
import type { PlatformStat } from '@/hooks/useSquadpitch';
import {
  isMetaAppReviewDemo,
  META_APP_REVIEW_DEMO_LABELS as L,
} from '@/lib/metaAppReviewDemo';

interface Props {
  platformBreakdown: PlatformStat[];
}

function formatNumber(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatRate(n: number | null): string {
  if (n == null) return '—';
  return `${(n * 100).toFixed(2)}%`;
}

// Side-by-side platform performance cards for Facebook Page and
// Instagram professional account. Renders only in Meta App Review
// demo mode — gives the reviewer an unmistakable view of Meta-flavored
// metrics before they encounter any internal Squadpitch scoring.
export function MetaPlatformPerformanceCards({ platformBreakdown }: Props) {
  if (!isMetaAppReviewDemo()) return null;

  const fb = platformBreakdown.find((p) => p.channel === 'FACEBOOK') ?? null;
  const ig = platformBreakdown.find((p) => p.channel === 'INSTAGRAM') ?? null;
  if (!fb && !ig) return null;

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {fb && (
        <PlatformCard
          icon={Facebook}
          accentClass="text-[#1877F2]"
          headline="Facebook Page performance"
          accountLabel={L.facebookPageName}
          stat={fb}
        />
      )}
      {ig && (
        <PlatformCard
          icon={Instagram}
          accentClass="text-[#E1306C]"
          headline="Instagram performance"
          accountLabel={L.instagramHandle}
          stat={ig}
        />
      )}
    </section>
  );
}

function PlatformCard({
  icon: Icon,
  accentClass,
  headline,
  accountLabel,
  stat,
}: {
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
  headline: string;
  accountLabel: string;
  stat: PlatformStat;
}) {
  return (
    <div className="card p-4 space-y-3">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${accentClass}`} />
          <h3 className="text-sm font-semibold text-white-100 truncate">{headline}</h3>
        </div>
        <span className="text-[10px] text-white-40 font-mono truncate">{accountLabel}</span>
      </header>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Posts" value={stat.postCount.toLocaleString()} />
        <Stat label="Reach" value={formatNumber(stat.totalReach)} />
        <Stat label="Impressions" value={formatNumber(stat.totalImpressions)} />
        <Stat label="Engagements" value={formatNumber(stat.totalEngagements)} />
        <Stat label="Avg engagement rate" value={formatRate(stat.avgEngagementRate)} colSpan={2} />
      </div>
      <p className="text-[10px] text-white-40">{L.source}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  colSpan,
}: {
  label: string;
  value: string;
  colSpan?: number;
}) {
  return (
    <div
      className={`rounded-md bg-white-5 px-2.5 py-1.5 ${colSpan === 2 ? 'col-span-2' : ''}`}
    >
      <p className="text-[10px] uppercase tracking-wider text-white-40">{label}</p>
      <p className="text-sm font-semibold text-white-100 tabular-nums">{value}</p>
    </div>
  );
}
