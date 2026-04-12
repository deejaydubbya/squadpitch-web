'use client';

import { Wand2, Archive, Pencil, BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkspaceDataItem, DataItemType } from '@/hooks/useSquadpitch';

const TYPE_COLORS: Record<DataItemType, string> = {
  TESTIMONIAL: 'bg-blue-500/20 text-blue-400',
  CASE_STUDY: 'bg-purple-500/20 text-purple-400',
  PRODUCT_LAUNCH: 'bg-green-500/20 text-green-400',
  PROMOTION: 'bg-orange-500/20 text-orange-400',
  STATISTIC: 'bg-cyan-500/20 text-cyan-400',
  MILESTONE: 'bg-yellow-500/20 text-yellow-400',
  FAQ: 'bg-indigo-500/20 text-indigo-400',
  TEAM_SPOTLIGHT: 'bg-pink-500/20 text-pink-400',
  INDUSTRY_NEWS: 'bg-red-500/20 text-red-400',
  EVENT: 'bg-emerald-500/20 text-emerald-400',
  CUSTOM: 'bg-white-10 text-white-60',
};

const TYPE_LABELS: Record<DataItemType, string> = {
  TESTIMONIAL: 'Testimonial',
  CASE_STUDY: 'Case Study',
  PRODUCT_LAUNCH: 'Product Launch',
  PROMOTION: 'Promotion',
  STATISTIC: 'Statistic',
  MILESTONE: 'Milestone',
  FAQ: 'FAQ',
  TEAM_SPOTLIGHT: 'Team Spotlight',
  INDUSTRY_NEWS: 'Industry News',
  EVENT: 'Event',
  CUSTOM: 'Custom',
};

function getPerformanceBadge(avgEngagement: number | null | undefined) {
  if (avgEngagement == null) return null;
  if (avgEngagement > 5)
    return { label: 'High Performing', color: 'bg-green-500/20 text-green-400', Icon: TrendingUp };
  if (avgEngagement >= 1)
    return { label: 'Average', color: 'bg-yellow-500/20 text-yellow-400', Icon: Minus };
  return { label: 'Low', color: 'bg-red-500/20 text-red-400', Icon: TrendingDown };
}

interface Props {
  item: WorkspaceDataItem;
  selected?: boolean;
  onSelect?: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onGenerate: () => void;
}

export function DataItemCard({
  item,
  selected,
  onSelect,
  onEdit,
  onArchive,
  onGenerate,
}: Props) {
  const badge = getPerformanceBadge(item.performance?.avgEngagement);

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors',
        selected
          ? 'border-accent-green-110 bg-accent-green-110/5'
          : 'border-white-10 bg-white-5 hover:border-white-20'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {onSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onSelect}
              className="rounded border-white-20 bg-white-5 text-accent-green-110 focus:ring-accent-green-110/30 flex-shrink-0"
            />
          )}
          <span
            className={cn(
              'inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider flex-shrink-0',
              TYPE_COLORS[item.type]
            )}
          >
            {TYPE_LABELS[item.type]}
          </span>
          {badge && (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0',
                badge.color
              )}
            >
              <badge.Icon className="w-2.5 h-2.5" />
              {badge.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-white-40 hover:text-white-100 hover:bg-white-10 transition-colors"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onArchive}
            className="p-1.5 rounded-lg text-white-40 hover:text-white-100 hover:bg-white-10 transition-colors"
            title="Archive"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onGenerate}
            className="p-1.5 rounded-lg text-accent-green-110 hover:bg-accent-green-110/10 transition-colors"
            title="Generate content"
          >
            <Wand2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-white-100 mt-2 truncate">
        {item.title}
      </h3>

      {item.summary && (
        <p className="text-xs text-white-40 mt-1 line-clamp-2">{item.summary}</p>
      )}

      <div className="flex items-center gap-3 mt-3">
        {item.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap min-w-0">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded bg-white-10 text-white-40 text-[10px]"
              >
                {tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-[10px] text-white-30">
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          {item.performance && item.performance.totalDrafts > 0 && (
            <span className="text-[10px] text-white-30">
              {item.performance.totalPublished}/{item.performance.totalDrafts} published
            </span>
          )}
          {item.performance?.avgEngagement != null && (
            <span className="text-[10px] text-white-40 font-medium">
              {item.performance.avgEngagement.toFixed(1)}% eng
            </span>
          )}
          {item.usageCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-white-30">
              <BarChart3 className="w-3 h-3" />
              {item.usageCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export { TYPE_LABELS, TYPE_COLORS };
