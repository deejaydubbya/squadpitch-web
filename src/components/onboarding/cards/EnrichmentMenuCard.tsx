'use client';

import { cn } from '@/lib/utils';
import type { OnboardingSessionState } from '@/lib/onboarding/types';
import { getAvailableEnrichments } from '@/lib/onboarding/engine';
import { INDUSTRY_ICON_MAP } from '@/lib/onboarding/helpers';
import {
  Globe,
  Home,
  Shield,
  Database,
  FileText,
  Zap,
  Briefcase,
  Image,
  MessageSquare,
  SkipForward,
  ArrowRight,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Globe,
  Home,
  Shield,
  Database,
  FileText,
  Zap,
  Briefcase,
  Image,
  MessageSquare,
};

interface Props {
  session: OnboardingSessionState;
  onSelect: (cardType: string, key: string) => void;
  onSkip: () => void;
  preGeneration?: boolean;
}

export function EnrichmentMenuCard({ session, onSelect, onSkip, preGeneration }: Props) {
  const enrichments = getAvailableEnrichments(session);

  if (enrichments.length === 0) {
    return null;
  }

  const sourceEntries = session.sourceEntries ?? [];
  const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
    analyzed: Check,
    pending: Loader2,
    failed: AlertCircle,
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Title and subtitle */}
      <div className="px-1 mb-1">
        <h3 className="text-sm font-semibold text-white-90">Improve your campaign quality</h3>
        <p className="text-xs text-white-40 mt-0.5 leading-relaxed">
          These are optional, but they help Squadpitch create safer, more useful campaigns.
        </p>
      </div>

      {sourceEntries.length > 0 && (
        <div className="px-3 py-2 rounded-lg bg-white-5 border border-white-10 mb-1">
          <p className="text-[11px] font-medium text-white-40 uppercase tracking-wide mb-1.5">Sources added</p>
          <div className="flex flex-col gap-1">
            {sourceEntries.map((entry) => {
              const StatusIcon = STATUS_ICON[entry.status] ?? Check;
              return (
                <div key={entry.id} className="flex items-center gap-2 text-xs text-white-50">
                  <StatusIcon className={cn('w-3 h-3', entry.status === 'analyzed' ? 'text-accent-green-110' : entry.status === 'pending' ? 'animate-spin text-white-30' : 'text-red-400')} />
                  <span className="truncate">{entry.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {enrichments.map((card) => {
        const IconComponent = ICON_MAP[card.icon] ?? Briefcase;
        return (
          <button
            key={card.key}
            onClick={() => onSelect(card.cardType, card.key)}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg text-left',
              'bg-white-5 hover:bg-white-10 border border-white-10 hover:border-accent-green-110/30',
              'transition-all cursor-pointer',
            )}
          >
            <div className="flex-none mt-0.5">
              <IconComponent className="w-5 h-5 text-accent-green-110" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white-90">{card.label}</p>
              <p className="text-xs text-white-40 mt-0.5">{card.description}</p>
            </div>
          </button>
        );
      })}

      <button
        onClick={onSkip}
        className={cn(
          'flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium',
          'bg-accent-green-110 text-white hover:bg-accent-green-120 cursor-pointer transition-all',
        )}
      >
        <ArrowRight className="w-4 h-4" />
        {preGeneration ? 'Continue to campaign' : 'Continue'}
      </button>
      <button
        onClick={onSkip}
        className="flex items-center justify-center gap-1.5 py-2 text-xs text-white-40 hover:text-white-60 transition-colors cursor-pointer"
      >
        <SkipForward className="w-3.5 h-3.5" />
        Skip optional setup
      </button>
    </div>
  );
}
