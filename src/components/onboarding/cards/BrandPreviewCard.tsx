'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { OnboardingAnalyzeResult } from '@/hooks/useSquadpitch';
import type { StarterMethod } from '@/lib/onboarding/types';
import Image from 'next/image';
import { Check, Pencil, Loader2 } from 'lucide-react';

interface Props {
  analyzeResult: OnboardingAnalyzeResult | null;
  starterMethod: StarterMethod | null;
  onConfirm: (nameOverride?: string) => void;
  isCreating: boolean;
}

export function BrandPreviewCard({ analyzeResult, starterMethod, onConfirm, isCreating }: Props) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(analyzeResult?.brandData.name ?? '');

  // Scratch flow — just need a name
  if (starterMethod === 'scratch' || !analyzeResult) {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-xs text-white-40 mb-1 block">Workspace name</label>
          <input
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            placeholder="My Business"
            className={cn(
              'w-full px-3 py-2 rounded-lg text-sm',
              'bg-white-5 border border-white-10 text-white-90',
              'placeholder:text-white-30 focus:border-accent-green-110/50 focus:outline-none',
            )}
          />
        </div>
        <button
          onClick={() => onConfirm(nameValue || 'My Workspace')}
          disabled={isCreating}
          className={cn(
            'self-end flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium',
            'bg-accent-green-110 text-white hover:bg-accent-green-120 cursor-pointer transition-all',
            isCreating && 'opacity-50 cursor-not-allowed',
          )}
        >
          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Create workspace
        </button>
      </div>
    );
  }

  const { brandData } = analyzeResult;

  return (
    <div className="flex flex-col gap-3">
      {/* Brand header */}
      <div className="flex items-start gap-3 p-3 bg-white-5 rounded-lg">
        {brandData.logoUrl && (
          <Image
            src={brandData.logoUrl}
            alt="Logo"
            width={48}
            height={48}
            className="rounded-lg flex-none"
          />
        )}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => { if (e.key === 'Enter') setEditingName(false); }}
              autoFocus
              className={cn(
                'w-full px-2 py-1 rounded text-sm font-semibold',
                'bg-white-5 border border-accent-green-110/50 text-white-90 focus:outline-none',
              )}
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-white-90">{nameValue || brandData.name}</h3>
              <button
                onClick={() => setEditingName(true)}
                className="text-white-30 hover:text-white-60 transition-colors"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
          <p className="text-xs text-white-40 mt-0.5">{brandData.industry}</p>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 gap-2 text-xs">
        {brandData.description && (
          <DetailRow label="Description" value={brandData.description} />
        )}
        {brandData.audience && (
          <DetailRow label="Audience" value={brandData.audience} />
        )}
        {brandData.offers && (
          <DetailRow label="Offers" value={brandData.offers} />
        )}
      </div>

      {/* Voice preview */}
      {analyzeResult.voiceData && (
        <div className="p-2.5 rounded-lg border border-white-10 bg-white-5">
          <p className="text-[11px] text-white-40 mb-0.5">Voice tone</p>
          <p className="text-xs text-white-70">{analyzeResult.voiceData.tone}</p>
        </div>
      )}

      {/* Confirm button */}
      <button
        onClick={() => onConfirm(nameValue !== brandData.name ? nameValue : undefined)}
        disabled={isCreating}
        className={cn(
          'self-end flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium',
          'bg-accent-green-110 text-white hover:bg-accent-green-120 cursor-pointer transition-all',
          isCreating && 'opacity-50 cursor-not-allowed',
        )}
      >
        {isCreating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Check className="w-4 h-4" />
        )}
        Looks good!
      </button>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg border border-white-10 bg-white-5">
      <p className="text-[11px] text-white-40 mb-0.5">{label}</p>
      <p className="text-white-70 line-clamp-3">{value}</p>
    </div>
  );
}
