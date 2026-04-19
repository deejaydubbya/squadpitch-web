'use client';

import type { BusinessDataTopItem, BusinessDataUnusedItem } from '@/hooks/useSquadpitch';
import { ScoreBadge } from './ScoreBadge';

const TYPE_COLORS: Record<string, string> = {
  TESTIMONIAL: 'bg-green-900/30 text-green-400',
  CASE_STUDY: 'bg-blue-900/30 text-blue-400',
  PRODUCT_LAUNCH: 'bg-purple-900/30 text-purple-400',
  PROMOTION: 'bg-orange-900/30 text-orange-400',
  MILESTONE: 'bg-amber-900/30 text-amber-400',
  PROPERTY: 'bg-cyan-900/30 text-cyan-400',
  FAQ: 'bg-white-10 text-white-60',
  TEAM_SPOTLIGHT: 'bg-pink-900/30 text-pink-400',
  INDUSTRY_NEWS: 'bg-indigo-900/30 text-indigo-400',
  EVENT: 'bg-red-900/30 text-red-400',
  STATISTIC: 'bg-teal-900/30 text-teal-400',
  CUSTOM: 'bg-white-10 text-white-60',
};

function typeLabel(type: string) {
  return type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ');
}

interface TopItemsProps {
  title: string;
  items: BusinessDataTopItem[];
}

export function TopDataItemsList({ title, items }: TopItemsProps) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-white-40 italic">No data items to display.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div
              key={item.id}
              className="flex items-start gap-2 pb-2 border-b border-white-10 last:border-0 last:pb-0"
            >
              <span className="text-[10px] text-white-40 font-mono w-4 pt-0.5">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white-80 leading-relaxed truncate">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      TYPE_COLORS[item.type] || 'bg-white-10 text-white-60'
                    }`}
                  >
                    {typeLabel(item.type)}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-white-10 text-[10px] text-white-60 font-mono">
                    {item.usageCount} uses · {item.totalPublished} published
                  </span>
                  {item.avgScore != null && (
                    <ScoreBadge score={item.avgScore} variant="composite" />
                  )}
                  {item.avgEngagement != null && (
                    <span className="text-[10px] text-white-40">
                      {(item.avgEngagement * 100).toFixed(2)}% ER
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

interface UnusedItemsProps {
  title: string;
  items: BusinessDataUnusedItem[];
}

export function UnusedDataItemsList({ title, items }: UnusedItemsProps) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-white-40 italic">All data items have been used.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div
              key={item.id}
              className="flex items-start gap-2 pb-2 border-b border-white-10 last:border-0 last:pb-0"
            >
              <span className="text-[10px] text-white-40 font-mono w-4 pt-0.5">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white-80 leading-relaxed truncate">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      TYPE_COLORS[item.type] || 'bg-white-10 text-white-60'
                    }`}
                  >
                    {typeLabel(item.type)}
                  </span>
                  <span className="text-[10px] text-white-40">
                    {item.daysSinceCreation}d unused
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
