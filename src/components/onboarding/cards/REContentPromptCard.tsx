'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { RE_CONTENT_SUGGESTIONS } from '@/lib/onboarding/configs/realEstate';
import { ArrowRight, Loader2 } from 'lucide-react';

interface Props {
  onSubmit: (prompt: string) => void;
  isGenerating: boolean;
}

export function REContentPromptCard({ onSubmit, isGenerating }: Props) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    const text = value.trim();
    if (!text || isGenerating) return;
    onSubmit(text);
  };

  const handleChip = (guidance: string) => {
    if (isGenerating) return;
    onSubmit(guidance);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-1.5">
        {RE_CONTENT_SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            onClick={() => handleChip(s.guidance)}
            disabled={isGenerating}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium',
              'bg-white-5 hover:bg-white-10 text-white-70 hover:text-white-90',
              'border border-white-10 hover:border-accent-green-110/30',
              'transition-all cursor-pointer',
              isGenerating && 'opacity-50 cursor-not-allowed',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Freeform input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Or describe what you want to create..."
          className={cn(
            'flex-1 px-3 py-2 rounded-lg text-sm',
            'bg-white-5 border border-white-10 text-white-90',
            'placeholder:text-white-30 focus:border-accent-green-110/50 focus:outline-none',
          )}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
          disabled={isGenerating}
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || isGenerating}
          className={cn(
            'flex-none flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            value.trim() && !isGenerating
              ? 'bg-accent-green-110 text-white hover:bg-accent-green-120 cursor-pointer'
              : 'bg-white-10 text-white-30 cursor-not-allowed',
          )}
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
