'use client';

import { cn } from '@/lib/utils';
import { RE_LISTING_SOURCES } from '@/lib/onboarding/configs/realEstate';
import type { REListingSourceMethod } from '@/lib/onboarding/types';
import { Link, FileText, Pencil, LayoutList } from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Link,
  LayoutList,
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

      <p className="text-[11px] text-white-25 text-center mt-1">
        If a site blocks extraction, you can paste details or enter the listing manually.
      </p>
    </div>
  );
}
