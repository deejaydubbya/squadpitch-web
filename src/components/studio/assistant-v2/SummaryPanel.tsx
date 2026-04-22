'use client';

import { Check, Circle, Pencil, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SummaryItem } from '@/lib/assistant/conversation/stateResolver';

interface Props {
  items: SummaryItem[];
  ready: boolean;
  onRevise: (field: string) => void;
}

/** Group items by their display category */
function categorize(items: SummaryItem[]) {
  const confirmed: SummaryItem[] = [];
  const needsReview: SummaryItem[] = [];
  const needed: SummaryItem[] = [];

  for (const item of items) {
    switch (item.status) {
      case 'confirmed':
      case 'inferred':
        confirmed.push(item);
        break;
      case 'needs_review':
        needsReview.push(item);
        break;
      case 'missing':
      case 'invalidated':
      default:
        needed.push(item);
        break;
    }
  }

  return { confirmed, needsReview, needed };
}

export function SummaryPanel({ items, ready, onRevise }: Props) {
  const { confirmed, needsReview, needed } = categorize(items);

  return (
    <div className="w-64 shrink-0 border-l border-white-10 bg-sp-card/50 p-4 overflow-y-auto hidden lg:block">
      <h2 className="text-xs font-semibold text-white-60 mb-3">Summary</h2>

      {items.length === 0 && (
        <p className="text-[11px] text-white-20 italic">Choose a mode to get started.</p>
      )}

      {/* Confirmed section */}
      {confirmed.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[10px] font-semibold text-white-30 uppercase tracking-wider mb-2">
            Confirmed
          </h3>
          <div className="space-y-1.5">
            {confirmed.map((item) => (
              <SummaryRow key={item.field} item={item} onRevise={onRevise} />
            ))}
          </div>
        </div>
      )}

      {/* Needs Review section */}
      {needsReview.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[10px] font-semibold text-accent-orange uppercase tracking-wider mb-2">
            Needs Review
          </h3>
          <div className="space-y-1.5">
            {needsReview.map((item) => (
              <SummaryRow key={item.field} item={item} onRevise={onRevise} />
            ))}
          </div>
        </div>
      )}

      {/* Still Needed section */}
      {needed.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[10px] font-semibold text-white-30 uppercase tracking-wider mb-2">
            Still Needed
          </h3>
          <div className="space-y-1.5">
            {needed.map((item) => (
              <SummaryRow key={item.field} item={item} onRevise={onRevise} />
            ))}
          </div>
        </div>
      )}

      {/* Ready indicator */}
      {ready && (
        <div className="p-2 rounded-lg bg-accent-green-110/10 border border-accent-green-110/20">
          <p className="text-xs text-accent-green-110 font-medium">Ready to generate</p>
          <p className="text-[11px] text-white-40 mt-0.5">All required fields are complete.</p>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ item, onRevise }: { item: SummaryItem; onRevise: (field: string) => void }) {
  const isConfirmed = item.status === 'confirmed';
  const isInferred = item.status === 'inferred';
  const isNeedsReview = item.status === 'needs_review';
  const isSet = isConfirmed || isInferred || isNeedsReview;

  return (
    <div
      className={cn(
        'flex items-start gap-2 p-2 rounded-lg text-sm',
        isConfirmed && 'bg-white-5',
        isInferred && 'bg-accent-green-110/5 border border-accent-green-110/10',
        isNeedsReview && 'bg-accent-orange/5 border border-accent-orange/20',
        !isSet && 'bg-transparent'
      )}
    >
      {/* Status icon */}
      <div className="mt-0.5 shrink-0">
        {isConfirmed && <Check className="w-3.5 h-3.5 text-accent-green-110" />}
        {isInferred && <Sparkles className="w-3.5 h-3.5 text-accent-green-110/70" />}
        {isNeedsReview && <AlertTriangle className="w-3.5 h-3.5 text-accent-orange" />}
        {!isSet && <Circle className="w-3.5 h-3.5 text-white-20" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-white-40 font-medium">{item.label}</p>
        {item.value ? (
          <p className={cn(
            'text-xs truncate',
            isNeedsReview ? 'text-accent-orange' : 'text-white-100'
          )}>
            {item.value}
          </p>
        ) : (
          <p className="text-xs text-white-20 italic">Not set</p>
        )}
      </div>

      {/* Change button — shown for any item with a value */}
      {isSet && (
        <button
          onClick={() => onRevise(item.field)}
          className="shrink-0 p-1 rounded text-white-30 hover:text-white-100 hover:bg-white-10 transition-colors"
          title={`Change ${item.label}`}
        >
          <Pencil className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
