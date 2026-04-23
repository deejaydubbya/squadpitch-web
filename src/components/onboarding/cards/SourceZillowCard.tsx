'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useZillowExtract, type AgentProfileDraft } from '@/hooks/useSquadpitch';
import { isUrl, normalizeUrl } from '@/lib/onboarding/helpers';
import { ArrowRight, Loader2, Check } from 'lucide-react';

interface Props {
  onDone: (source: AgentProfileDraft) => void;
}

export function SourceZillowCard({ onDone }: Props) {
  const [url, setUrl] = useState('');
  const extract = useZillowExtract();

  const isValid = isUrl(url) && url.toLowerCase().includes('zillow');

  const handleSubmit = async () => {
    if (!isValid || extract.isPending) return;
    try {
      const result = await extract.mutateAsync(normalizeUrl(url));
      onDone(result);
    } catch {
      // Error handled by mutation state
    }
  };

  if (extract.isSuccess) {
    return (
      <div className="flex items-center gap-2 p-3 bg-accent-green-110/10 rounded-lg">
        <Check className="w-4 h-4 text-accent-green-110" />
        <p className="text-sm text-accent-green-110">Zillow profile imported</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.zillow.com/profile/your-name"
          className={cn(
            'flex-1 px-3 py-2 rounded-lg text-sm',
            'bg-white-5 border border-white-10 text-white-90',
            'placeholder:text-white-30 focus:border-accent-green-110/50 focus:outline-none',
          )}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        />
        <button
          onClick={handleSubmit}
          disabled={!isValid || extract.isPending}
          className={cn(
            'flex-none flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            isValid && !extract.isPending
              ? 'bg-accent-green-110 text-white hover:bg-accent-green-120 cursor-pointer'
              : 'bg-white-10 text-white-30 cursor-not-allowed',
          )}
        >
          {extract.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
      {extract.isError && (
        <p className="text-xs text-red-400">{extract.error?.message || 'Failed to extract Zillow profile.'}</p>
      )}
    </div>
  );
}
