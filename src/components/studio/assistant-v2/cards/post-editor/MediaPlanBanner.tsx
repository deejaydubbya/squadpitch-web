'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Image, Video, Layers, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MediaPlan } from '@/hooks/useSquadpitch';

interface MediaPlanBannerProps {
  mediaPlan: MediaPlan;
  onUsePrompt?: (prompt: string) => void;
}

const TYPE_ICON = {
  image: Image,
  video: Video,
  carousel: Layers,
  none: Image,
} as const;

const SOURCE_LABELS: Record<string, string> = {
  property_images: 'Property Photos',
  brand_library: 'Brand Library',
  ai_generated: 'AI Generated',
  stock_like: 'Stock-like',
  none: 'None',
};

export function MediaPlanBanner({ mediaPlan, onUsePrompt }: MediaPlanBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const Icon = TYPE_ICON[mediaPlan.recommendedMediaType] ?? Image;

  return (
    <div className="bg-white-5 border border-white-10 rounded-lg px-2.5 py-1.5 space-y-1">
      {/* Summary row */}
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon className="w-3.5 h-3.5 text-white-40 shrink-0" />
        <span className="text-[11px] text-white-60 truncate flex-1">
          <span className="text-white-80 font-medium capitalize">{mediaPlan.recommendedMediaType}</span>
          {' — '}
          {mediaPlan.reason}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          {mediaPlan.prompt && onUsePrompt && (
            <button
              type="button"
              onClick={() => onUsePrompt(mediaPlan.prompt)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white-5 hover:bg-white-10 text-[10px] text-white-60 hover:text-white-80 transition-colors"
            >
              <Sparkles className="w-2.5 h-2.5" />
              Use as prompt
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 rounded hover:bg-white-10 text-white-40 hover:text-white-60 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-0.5 rounded hover:bg-white-10 text-white-40 hover:text-white-60 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="space-y-1 pt-0.5 border-t border-white-5">
          {mediaPlan.visualConcept && (
            <p className="text-[10px] text-white-50">
              <span className="text-white-60 font-medium">Concept:</span> {mediaPlan.visualConcept}
            </p>
          )}
          {mediaPlan.style && (
            <p className="text-[10px] text-white-50">
              <span className="text-white-60 font-medium">Style:</span> {mediaPlan.style}
            </p>
          )}
          {mediaPlan.fallbackStrategy && (
            <p className="text-[10px] text-white-50">
              <span className="text-white-60 font-medium">Fallback:</span> {mediaPlan.fallbackStrategy}
            </p>
          )}
          {mediaPlan.preferredSources.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-white-60 font-medium">Sources:</span>
              {mediaPlan.preferredSources.map((src) => (
                <span
                  key={src}
                  className={cn(
                    'text-[9px] px-1 py-px rounded',
                    src === 'ai_generated'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-white-10 text-white-50',
                  )}
                >
                  {SOURCE_LABELS[src] ?? src}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
