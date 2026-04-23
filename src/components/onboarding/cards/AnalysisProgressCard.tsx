'use client';

import { useState, useEffect, type MutableRefObject } from 'react';
import { cn } from '@/lib/utils';
import type { AnalysisProgress } from '@/lib/onboarding/types';
import { Loader2, Check, Globe, Palette, Database } from 'lucide-react';

interface Props {
  progressRef: MutableRefObject<AnalysisProgress>;
}

const STAGE_CONFIG = [
  { key: 'crawling', label: 'Crawling pages', icon: Globe },
  { key: 'extracting_brand', label: 'Extracting brand', icon: Palette },
  { key: 'extracting_data', label: 'Finding data', icon: Database },
] as const;

const STAGE_ORDER = ['crawling', 'extracting_brand', 'extracting_data', 'done', 'error'];

export function AnalysisProgressCard({ progressRef }: Props) {
  // Poll the ref to re-render as progress updates
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 300);
    return () => clearInterval(interval);
  }, []);

  const progress = progressRef.current;
  const currentIdx = STAGE_ORDER.indexOf(progress.stage);

  if (progress.stage === 'error') {
    return (
      <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
        <p className="text-sm text-red-400">{progress.errorMessage || 'Analysis failed.'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {STAGE_CONFIG.map(({ key, label, icon: Icon }, idx) => {
        const stageIdx = STAGE_ORDER.indexOf(key);
        const isDone = currentIdx > stageIdx;
        const isActive = currentIdx === stageIdx;

        return (
          <div key={key} className="flex items-center gap-3">
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center flex-none',
                isDone && 'bg-accent-green-110',
                isActive && 'bg-accent-green-110/20',
                !isDone && !isActive && 'bg-white-5',
              )}
            >
              {isDone ? (
                <Check className="w-3.5 h-3.5 text-white" />
              ) : isActive ? (
                <Loader2 className="w-3.5 h-3.5 text-accent-green-110 animate-spin" />
              ) : (
                <Icon className="w-3.5 h-3.5 text-white-30" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm', isDone || isActive ? 'text-white-80' : 'text-white-30')}>
                {label}
              </p>
              {isActive && key === 'crawling' && progress.crawledPages.length > 0 && (
                <p className="text-[11px] text-white-40 mt-0.5 truncate">
                  {progress.crawledPages[progress.crawledPages.length - 1].title}
                  {' '}({progress.crawledPages.length} page{progress.crawledPages.length !== 1 ? 's' : ''})
                </p>
              )}
              {isDone && key === 'extracting_data' && progress.dataCount > 0 && (
                <p className="text-[11px] text-white-40 mt-0.5">
                  Found {progress.dataCount} item{progress.dataCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {progress.stage === 'done' && (
        <div className="flex items-center gap-2 mt-1">
          <Check className="w-4 h-4 text-accent-green-110" />
          <p className="text-sm text-accent-green-110 font-medium">Analysis complete</p>
        </div>
      )}
    </div>
  );
}
