'use client';

import { cn } from '@/lib/utils';
import { RE_LISTING_SOURCES } from '@/lib/onboarding/configs/realEstate';
import type { REListingSourceMethod } from '@/lib/onboarding/types';
import { Link, Image, FileText, Pencil, Database } from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Link,
  Image,
  FileText,
  Pencil,
};

interface Props {
  onSelect: (method: REListingSourceMethod, label: string) => void;
}

export function REListingSourceCard({ onSelect }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {RE_LISTING_SOURCES.map(({ method, label, description, icon }) => {
        const IconComponent = ICON_MAP[icon] ?? FileText;
        return (
          <button
            key={method}
            onClick={() => onSelect(method, label)}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg text-left',
              'bg-white-5 hover:bg-white-10 border border-transparent hover:border-accent-green-110/30',
              'transition-all cursor-pointer',
            )}
          >
            <div className="flex-none mt-0.5">
              <IconComponent className="w-5 h-5 text-accent-green-110" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white-90">{label}</p>
              <p className="text-xs text-white-40 mt-0.5">{description}</p>
            </div>
          </button>
        );
      })}

      {/* Advanced: IDX/feed link — subtle secondary */}
      <button
        onClick={() => onSelect('link', 'Add IDX/feed link')}
        className="flex items-center justify-center gap-1.5 py-2 text-[11px] text-white-30 hover:text-white-50 transition-colors cursor-pointer"
      >
        <Database className="w-3 h-3" />
        Add IDX/feed link
      </button>
    </div>
  );
}
