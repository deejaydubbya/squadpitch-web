'use client';

import { Info } from 'lucide-react';
import {
  isMetaAppReviewDemo,
  META_APP_REVIEW_DEMO_LABELS as L,
} from '@/lib/metaAppReviewDemo';

export function MetaAppReviewBanner() {
  if (!isMetaAppReviewDemo()) return null;
  return (
    <div className="rounded-lg border border-blue-500/25 bg-blue-500/5 p-3 flex items-start gap-2">
      <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-blue-300">{L.bannerTitle}</p>
        <p className="text-[11px] leading-relaxed text-blue-300/70">
          {L.bannerBody}
        </p>
      </div>
    </div>
  );
}
