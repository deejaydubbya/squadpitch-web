'use client';

import { Database, Sparkles, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataAwareness } from '@/lib/assistant/normalizedPost.types';
import { DATA_AWARENESS_CONFIG } from '@/lib/assistant/dataAwareness';

const ICON_MAP = {
  Database,
  Sparkles,
  AlertTriangle,
} as const;

interface DataAwarenessBadgeProps {
  awareness: DataAwareness | null;
  showDetail?: boolean;
  onAddData?: () => void;
  className?: string;
}

export function DataAwarenessBadge({
  awareness,
  showDetail = false,
  onAddData,
  className,
}: DataAwarenessBadgeProps) {
  if (!awareness) return null;

  const config = DATA_AWARENESS_CONFIG[awareness.level];
  const Icon = ICON_MAP[config.icon];

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {/* Compact pill */}
      <span
        className={cn(
          'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full w-fit',
          config.bgClass,
          config.textClass,
        )}
      >
        <Icon className="w-2.5 h-2.5" />
        {config.label}
      </span>

      {/* Expanded detail */}
      {showDetail && (
        <div className="flex flex-col gap-0.5 pl-1">
          {/* Explanation text */}
          <span className="text-[10px] text-white-40">
            {awareness.level === 'uses_user_data'
              ? `Uses your ${awareness.sourceType === 'listing' ? 'listing data and property images' : 'data'}`
              : awareness.level === 'general_content'
                ? 'General content because no property was selected'
                : 'Missing property data — add listing to improve'}
          </span>
          {/* Sources list */}
          {awareness.dataSourcesUsed.length > 0 && awareness.dataSourcesUsed.map((source, i) => (
            <span key={i} className="text-[10px] text-white-30 pl-1">
              {source}
            </span>
          ))}
          {/* CTAs for missing/general data */}
          {awareness.level === 'missing_data' && onAddData && (
            <button
              onClick={onAddData}
              className="text-[10px] text-accent-orange hover:text-accent-orange/80 underline w-fit mt-0.5"
            >
              Attach property
            </button>
          )}
          {awareness.level === 'general_content' && onAddData && (
            <button
              onClick={onAddData}
              className="text-[10px] text-white-50 hover:text-white-70 underline w-fit mt-0.5"
            >
              Add details to personalize
            </button>
          )}
        </div>
      )}
    </div>
  );
}
