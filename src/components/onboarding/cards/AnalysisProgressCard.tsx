'use client';

import { useState, useEffect, type MutableRefObject } from 'react';
import { cn } from '@/lib/utils';
import type { AnalysisProgress } from '@/lib/onboarding/types';
import { Loader2, Check, Globe, Palette, Database, AlertTriangle, RefreshCw, FileText, ImageIcon } from 'lucide-react';

interface Props {
  progressRef: MutableRefObject<AnalysisProgress>;
  onRetry?: () => void;
  onFallbackToText?: () => void;
  onChooseMethod?: (method: string) => void;
}

const STAGE_CONFIG = [
  { key: 'crawling', label: 'Crawling website', icon: Globe },
  { key: 'extracting_brand', label: 'Extracting brand identity', icon: Palette },
  { key: 'extracting_data', label: 'Finding business data', icon: Database },
] as const;

const STAGE_ORDER = ['connecting', 'crawling', 'extracting_brand', 'extracting_data', 'done', 'error'];

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname === '/' ? '' : u.pathname;
    const display = u.hostname + path;
    return display.length > 50 ? display.slice(0, 47) + '...' : display;
  } catch {
    return url.length > 50 ? url.slice(0, 47) + '...' : url;
  }
}

export function AnalysisProgressCard({ progressRef, onRetry, onFallbackToText, onChooseMethod }: Props) {
  // Poll the ref to re-render as progress updates
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 300);
    return () => clearInterval(interval);
  }, []);

  const progress = progressRef.current;
  const currentIdx = STAGE_ORDER.indexOf(progress.stage);

  if (progress.stage === 'error') {
    const isBlocked = progress.errorCode === 'BLOCKED';
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-none mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-400 font-medium">
                {isBlocked ? 'This website blocks automated access' : 'Analysis failed'}
              </p>
              <p className="text-xs text-red-400/70 mt-1">
                {isBlocked
                  ? "This link can't be scraped — the site has anti-bot protection. Try one of these alternatives instead:"
                  : (progress.errorMessage || 'Something went wrong.')}
              </p>
            </div>
          </div>
        </div>
        {isBlocked && onChooseMethod ? (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onChooseMethod('description')}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left',
                'bg-accent-green-110/10 border border-accent-green-110/20 text-accent-green-110',
                'hover:bg-accent-green-110/20 transition-all cursor-pointer',
              )}
            >
              <FileText className="w-3.5 h-3.5 flex-none" />
              <span>Paste listing description</span>
            </button>
            <button
              onClick={() => onChooseMethod('manual_form')}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left',
                'bg-white-5 border border-white-10 text-white-60 hover:text-white-80 hover:border-white-20',
                'transition-all cursor-pointer',
              )}
            >
              <Database className="w-3.5 h-3.5 flex-none" />
              <span>Enter listing details manually</span>
            </button>
            <button
              onClick={() => onChooseMethod('link')}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left',
                'bg-white-5 border border-white-10 text-white-40 hover:text-white-60 hover:border-white-20',
                'transition-all cursor-pointer',
              )}
            >
              <RefreshCw className="w-3.5 h-3.5 flex-none" />
              <span>Try a different link</span>
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                  'bg-white-5 border border-white-10 text-white-60 hover:text-white-80 hover:border-white-20',
                  'transition-all cursor-pointer',
                )}
              >
                <RefreshCw className="w-3 h-3" />
                Try again
              </button>
            )}
            {onFallbackToText && (
              <button
                onClick={onFallbackToText}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                  'bg-accent-green-110/10 border border-accent-green-110/20 text-accent-green-110',
                  'hover:bg-accent-green-110/20 transition-all cursor-pointer',
                )}
              >
                <FileText className="w-3 h-3" />
                Paste text instead
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  const crawledCount = progress.crawledPages.length;
  const failedCount = progress.failedPages.length;
  const totalProcessed = crawledCount + failedCount;

  return (
    <div className="flex flex-col gap-3">
      {/* Target URL */}
      {progress.rootUrl && progress.stage === 'connecting' && (
        <p className="text-[11px] text-white-30 truncate">
          Connecting to {shortenUrl(progress.rootUrl)}...
        </p>
      )}

      {STAGE_CONFIG.map(({ key, label, icon: Icon }) => {
        const stageIdx = STAGE_ORDER.indexOf(key);
        const isDone = currentIdx > stageIdx;
        const isActive = currentIdx === stageIdx;
        if (!isDone && !isActive) return null;

        return (
          <div key={key} className="flex items-start gap-3">
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center flex-none mt-0.5',
                isDone && 'bg-accent-green-110',
                isActive && 'bg-accent-green-110/20',
              )}
            >
              {isDone ? (
                <Check className="w-3.5 h-3.5 text-white" />
              ) : (
                <Loader2 className="w-3.5 h-3.5 text-accent-green-110 animate-spin" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm', 'text-white-80')}>
                {label}
              </p>

              {/* Crawling details */}
              {key === 'crawling' && (isActive || isDone) && (
                <div className="mt-1 flex flex-col gap-0.5">
                  {isActive && progress.totalExpected > 1 && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-white-10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent-green-110 transition-all duration-300"
                          style={{ width: `${Math.min(100, (totalProcessed / progress.totalExpected) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-white-30 flex-none">
                        {totalProcessed}/{progress.totalExpected}
                      </span>
                    </div>
                  )}
                  {isActive && crawledCount > 0 && (
                    <p className="text-[11px] text-white-40 truncate">
                      {shortenUrl(progress.crawledPages[crawledCount - 1].url)}
                    </p>
                  )}
                  {isDone && (
                    <p className="text-[11px] text-white-40">
                      {crawledCount} page{crawledCount !== 1 ? 's' : ''} crawled
                      {failedCount > 0 && (
                        <span className="text-yellow-500/70"> ({failedCount} blocked)</span>
                      )}
                    </p>
                  )}
                  {isDone && progress.imagesFound > 0 && (
                    <p className="text-[11px] text-accent-green-110/80 flex items-center gap-1 mt-0.5">
                      <ImageIcon className="w-3 h-3" />
                      {progress.imagesFound} image{progress.imagesFound !== 1 ? 's' : ''} found
                    </p>
                  )}
                </div>
              )}

              {/* Brand extraction details */}
              {key === 'extracting_brand' && isDone && progress.brandData && (
                <p className="text-[11px] text-white-40 mt-0.5 truncate">
                  Found: {progress.brandData.name}
                </p>
              )}

              {/* Data extraction details */}
              {key === 'extracting_data' && isActive && progress.dataCount > 0 && (
                <p className="text-[11px] text-white-40 mt-0.5">
                  {progress.dataCount} item{progress.dataCount !== 1 ? 's' : ''} so far...
                </p>
              )}
              {key === 'extracting_data' && isDone && (
                <p className="text-[11px] text-white-40 mt-0.5">
                  {progress.dataCount > 0
                    ? `Found ${progress.dataCount} item${progress.dataCount !== 1 ? 's' : ''}`
                    : 'No structured data found'}
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
