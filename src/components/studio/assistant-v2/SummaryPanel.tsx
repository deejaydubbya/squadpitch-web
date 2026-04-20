'use client';

import { Check, Circle, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SummaryItem {
  field: string;
  label: string;
  value: string | null;
  confirmed: boolean;
}

interface Props {
  items: SummaryItem[];
  ready: boolean;
  onRevise: (field: string) => void;
}

export function SummaryPanel({ items, ready, onRevise }: Props) {
  if (items.length === 0) return null;

  const confirmed = items.filter((i) => i.confirmed);
  const needed = items.filter((i) => !i.confirmed);

  return (
    <div className="w-64 shrink-0 border-l border-white-10 bg-sp-card/50 p-4 overflow-y-auto hidden lg:block">
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
  return (
    <div
      className={cn(
        'flex items-start gap-2 p-2 rounded-lg text-sm',
        item.confirmed ? 'bg-white-5' : 'bg-transparent'
      )}
    >
      {/* Status icon */}
      <div className="mt-0.5 shrink-0">
        {item.confirmed ? (
          <Check className="w-3.5 h-3.5 text-accent-green-110" />
        ) : (
          <Circle className="w-3.5 h-3.5 text-white-20" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-white-40 font-medium">{item.label}</p>
        {item.value ? (
          <p className="text-xs text-white-100 truncate">{item.value}</p>
        ) : (
          <p className="text-xs text-white-20 italic">Not set</p>
        )}
      </div>

      {/* Change button */}
      {item.confirmed && (
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
