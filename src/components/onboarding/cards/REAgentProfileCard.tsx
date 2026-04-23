'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { REAgentProfileData } from '@/lib/onboarding/types';
import { Check, SkipForward } from 'lucide-react';

interface Props {
  onSave: (data: REAgentProfileData) => void;
  onSkip: () => void;
}

const FIELDS: {
  key: keyof REAgentProfileData;
  label: string;
  placeholder: string;
}[] = [
  { key: 'agentName', label: 'Your name', placeholder: 'Jane Smith' },
  { key: 'brokerage', label: 'Brokerage', placeholder: 'Keller Williams, RE/MAX...' },
  { key: 'specialties', label: 'Specialties', placeholder: 'Luxury homes, first-time buyers, investment...' },
  { key: 'serviceAreas', label: 'Service areas', placeholder: 'Cities, neighborhoods, or regions you cover' },
  { key: 'experience', label: 'Years of experience', placeholder: '5' },
  { key: 'tagline', label: 'Tagline / brand statement', placeholder: 'Your home, your future — let\'s find it together.' },
];

export function REAgentProfileCard({ onSave, onSkip }: Props) {
  const [data, setData] = useState<REAgentProfileData>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const handleChange = (key: keyof REAgentProfileData, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const filledCount = Object.values(data).filter((v) => v && v.trim()).length;
  const hasAny = filledCount > 0;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-white-40 mb-1">
        Fill in what you can — this helps personalize your content.
      </p>

      {FIELDS.map(({ key, label, placeholder }) => {
        const isExpanded = expanded.has(key) || (data[key] && data[key]!.trim().length > 0);
        return (
          <div key={key}>
            {isExpanded ? (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-white-40">{label}</label>
                <input
                  type="text"
                  value={data[key] ?? ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={placeholder}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-sm',
                    'bg-white-5 border border-white-10 text-white-90',
                    'placeholder:text-white-30 focus:border-accent-green-110/50 focus:outline-none',
                  )}
                  autoFocus
                />
              </div>
            ) : (
              <button
                onClick={() => setExpanded((prev) => { const next = new Set(Array.from(prev)); next.add(key); return next; })}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left',
                  'bg-white-5/50 hover:bg-white-5 text-white-40 hover:text-white-60',
                  'text-sm transition-all cursor-pointer',
                )}
              >
                <span className="text-white-20">+</span>
                {label}
              </button>
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-between mt-1">
        <button
          onClick={onSkip}
          className="flex items-center gap-1.5 text-xs text-white-40 hover:text-white-60 transition-colors cursor-pointer"
        >
          <SkipForward className="w-3.5 h-3.5" />
          Skip for now
        </button>

        {hasAny && (
          <button
            onClick={() => onSave(data)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium',
              'bg-accent-green-110 text-white hover:bg-accent-green-120 cursor-pointer transition-all',
            )}
          >
            <Check className="w-4 h-4" />
            Save ({filledCount})
          </button>
        )}
      </div>
    </div>
  );
}
