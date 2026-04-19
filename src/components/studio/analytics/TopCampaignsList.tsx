'use client';

import type { CampaignRanked } from '@/hooks/useSquadpitch';
import { ScoreBadge } from './ScoreBadge';

const TYPE_LABELS: Record<string, string> = {
  just_listed: 'Just Listed',
  open_house: 'Open House',
  price_drop: 'Price Drop',
  just_sold: 'Just Sold',
  series: 'Content Series',
};

const TYPE_COLORS: Record<string, string> = {
  just_listed: 'bg-blue-900/30 text-blue-400',
  open_house: 'bg-purple-900/30 text-purple-400',
  price_drop: 'bg-orange-900/30 text-orange-400',
  just_sold: 'bg-green-900/30 text-green-400',
  series: 'bg-amber-900/30 text-amber-400',
};

interface Props {
  title: string;
  campaigns: CampaignRanked[];
}

export function TopCampaignsList({ title, campaigns }: Props) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
        {title}
      </h3>
      {campaigns.length === 0 ? (
        <p className="text-xs text-white-40 italic">No campaigns to display.</p>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c, i) => (
            <div
              key={c.campaignId}
              className="flex items-start gap-2 pb-2 border-b border-white-10 last:border-0 last:pb-0"
            >
              <span className="text-[10px] text-white-40 font-mono w-4 pt-0.5">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white-80 leading-relaxed truncate">
                  {c.campaignName || c.campaignId}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      TYPE_COLORS[c.campaignType] || 'bg-white-10 text-white-60'
                    }`}
                  >
                    {TYPE_LABELS[c.campaignType] || c.campaignType}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-white-10 text-[10px] text-white-60 font-mono">
                    {c.postCount}/{c.campaignTotal} posts
                  </span>
                  {c.avgScore != null && (
                    <ScoreBadge score={c.avgScore} variant="composite" />
                  )}
                  {c.avgEngagementRate != null && (
                    <span className="text-[10px] text-white-40">
                      {(c.avgEngagementRate * 100).toFixed(2)}% ER
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
