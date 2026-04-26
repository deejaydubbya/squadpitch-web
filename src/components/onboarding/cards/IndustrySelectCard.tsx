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
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-4">
      {industries.map((industry) => {
        const IconComponent = INDUSTRY_ICON_MAP[industry.ui?.icon] ?? Briefcase;
        return (
          <button
            key={industry.key}
            onClick={() => onSelect(industry.key, industry.label)}
            className={cn(
              'flex flex-col items-center gap-1.5 p-3 rounded-lg',
              'bg-white-5 hover:bg-white-10 border border-transparent hover:border-accent-green-110/30',
              'transition-all text-center cursor-pointer',
            )}
          >
            <IconComponent className="w-5 h-5 text-accent-green-110" />
            <span className="text-xs text-white-80 font-medium">{industry.label}</span>
          </button>
        );
      })}
    </div>
  );
}
