'use client';

import { cn } from '@/lib/utils';
import type { FallbackSourceMethod } from '@/lib/onboarding/types';
import { Globe, MessageSquare, FileText, SkipForward } from 'lucide-react';

const SOURCE_OPTIONS: {
  method: FallbackSourceMethod;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    method: 'website',
    label: 'Website URL',
    description: "We'll crawl and extract your brand, voice, and offers.",
    icon: Globe,
  },
  {
    method: 'description',
    label: 'Describe it manually',
    description: 'Tell us in your own words — we\'ll parse the essentials.',
    icon: MessageSquare,
  },
  {
    method: 'documents',
    label: 'Upload documents',
    description: 'Upload PDFs, docs, or marketing materials.',
    icon: FileText,
  },
];

interface Props {
  onSelect: (method: FallbackSourceMethod, label: string) => void;
}

export function FallbackSourceCard({ onSelect }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {SOURCE_OPTIONS.map(({ method, label, description, icon: Icon }) => (
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
            <Icon className="w-5 h-5 text-accent-green-110" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white-90">{label}</p>
            <p className="text-xs text-white-40 mt-0.5">{description}</p>
          </div>
        </button>
      ))}

      <button
        onClick={() => onSelect('skip', 'Skip and start simple')}
        className="flex items-center justify-center gap-1.5 py-2 text-xs text-white-40 hover:text-white-60 transition-colors cursor-pointer"
      >
        <SkipForward className="w-3.5 h-3.5" />
        Skip and start simple
      </button>
    </div>
  );
}
