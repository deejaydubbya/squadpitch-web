'use client';

import { cn } from '@/lib/utils';
import { useIndustries } from '@/hooks/useSquadpitch';
import { INDUSTRY_ICON_MAP } from '@/lib/onboarding/helpers';
import { Briefcase, Loader2 } from 'lucide-react';

interface Props {
  onSelect: (industryKey: string, label: string) => void;
}

export function IndustrySelectCard({ onSelect }: Props) {
  const { data: industries, isLoading } = useIndustries();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-white-30" />
      </div>
    );
  }

  if (!industries?.length) {
    return <p className="text-sm text-white-40">No industries available.</p>;
  }

  return (
    <div className="grid grid-cols-1 min-[375px]:grid-cols-2 sm:grid-cols-3 gap-2 pb-4">
      {industries.map((industry) => {
        const IconComponent = INDUSTRY_ICON_MAP[industry.ui?.icon] ?? Briefcase;
        // spinstr421 — only Real Estate + Car Sales are active
        // today. Defaulting to "active" preserves behavior for
        // any older profile that hasn't been re-served with the
        // new shape (the server now always sends status).
        const isComingSoon = (industry.status ?? 'active') === 'coming_soon';

        return (
          <button
            key={industry.key}
            type="button"
            onClick={() => {
              if (isComingSoon) return;
              onSelect(industry.key, industry.label);
            }}
            disabled={isComingSoon}
            aria-disabled={isComingSoon}
            title={isComingSoon ? `${industry.label} — coming soon` : industry.label}
            className={cn(
              'relative flex min-h-16 flex-row items-center gap-3 rounded-lg border border-transparent p-3 text-left transition-all min-[375px]:flex-col min-[375px]:gap-1.5 min-[375px]:text-center',
              isComingSoon
                ? 'bg-white-3 cursor-not-allowed opacity-50'
                : 'bg-white-5 hover:bg-white-10 hover:border-accent-green-110/30 cursor-pointer',
            )}
          >
            {isComingSoon && (
              <span
                className="absolute top-1.5 right-1.5 text-[9px] uppercase tracking-wider font-semibold text-white-40 bg-white-5 border border-white-10 rounded-full px-1.5 py-0.5"
                aria-hidden
              >
                Soon
              </span>
            )}
            <IconComponent
              className={cn(
                'w-5 h-5',
                isComingSoon ? 'text-white-30' : 'text-accent-green-110',
              )}
            />
            <span
              className={cn(
                'text-xs font-medium leading-tight',
                isComingSoon ? 'text-white-40' : 'text-white-80',
              )}
            >
              {industry.label}
            </span>
            {isComingSoon && (
              <span className="text-[10px] text-white-30 leading-snug">
                Coming soon
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
