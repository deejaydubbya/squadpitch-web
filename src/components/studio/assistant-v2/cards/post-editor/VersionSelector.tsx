'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VersionSelectorProps } from './types';

export function VersionSelector({
  versions,
  selectedVersionId,
  onSelectVersion,
}: VersionSelectorProps) {
  if (versions.length <= 1) return null;

  return (
    <div className="flex gap-1.5">
      {versions.map((v) => (
        <button
          key={v.id}
          onClick={() => onSelectVersion(v.id)}
          className={cn(
            'flex-1 p-2 rounded-lg text-left transition-all',
            selectedVersionId === v.id
              ? 'bg-accent-green-110/10 border border-accent-green-110/30'
              : 'bg-white-5 border border-white-10 opacity-60 hover:opacity-80'
          )}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-semibold text-white-60 uppercase">{v.label}</span>
            {selectedVersionId === v.id && (
              <Check className="w-3 h-3 text-accent-green-110" />
            )}
          </div>
          <p className="text-[11px] text-white-80 line-clamp-2">{v.body}</p>
        </button>
      ))}
    </div>
  );
}
