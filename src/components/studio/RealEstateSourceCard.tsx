'use client';

import { useState } from 'react';
import { ChevronRight, Check, Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RealEstateSourceCardProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  comingSoon?: boolean;
  done?: boolean;
  loading?: boolean;
  error?: string | null;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function RealEstateSourceCard({
  icon: Icon,
  label,
  description,
  comingSoon,
  done,
  loading,
  error,
  defaultOpen = false,
  children,
}: RealEstateSourceCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        'rounded-xl border transition-all',
        done
          ? 'border-accent-green-110/30 bg-accent-green-110/5'
          : 'border-white-10 bg-white-5',
        comingSoon && 'opacity-60',
      )}
    >
      <button
        type="button"
        disabled={comingSoon}
        onClick={() => !comingSoon && setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <Icon className="w-4 h-4 flex-shrink-0 text-white-50" />
        <span className="flex-1 text-sm font-medium text-white-80">{label}</span>

        {comingSoon && (
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white-10 text-white-40">
            Coming Soon
          </span>
        )}

        {loading && <Loader2 className="w-4 h-4 text-accent-green-110 animate-spin" />}

        {done && !loading && (
          <div className="w-5 h-5 rounded-full bg-accent-green-110/20 flex items-center justify-center">
            <Check className="w-3 h-3 text-accent-green-110" />
          </div>
        )}

        {!comingSoon && !loading && !done && (
          <ChevronRight
            className={cn(
              'w-4 h-4 text-white-30 transition-transform',
              open && 'rotate-90',
            )}
          />
        )}
      </button>

      {open && !comingSoon && (
        <div className="px-4 pb-4 space-y-3">
          {description && (
            <p className="text-xs text-white-40">{description}</p>
          )}
          {children}
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
