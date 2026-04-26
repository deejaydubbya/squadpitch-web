'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { OnboardingAnalyzeResult } from '@/hooks/useSquadpitch';
import type { StarterMethod } from '@/lib/onboarding/types';
import { Check, Pencil, Loader2, Globe } from 'lucide-react';

export interface BrandOverrides {
  name?: string;
  description?: string;
  audience?: string;
  offers?: string;
  voiceTone?: string;
}

interface Props {
  analyzeResult: OnboardingAnalyzeResult | null;
  starterMethod: StarterMethod | null;
  onConfirm: (overrides?: BrandOverrides) => void;
  isCreating: boolean;
  sourceUrl?: string | null;
}

export function BrandPreviewCard({ analyzeResult, starterMethod, onConfirm, isCreating, sourceUrl }: Props) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(analyzeResult?.brandData.name ?? '');

  // Editable detail fields
  const [descValue, setDescValue] = useState(analyzeResult?.brandData.description ?? '');
  const [audienceValue, setAudienceValue] = useState(analyzeResult?.brandData.audience ?? '');
  const [offersValue, setOffersValue] = useState(analyzeResult?.brandData.offers ?? '');
  const [voiceToneValue, setVoiceToneValue] = useState(analyzeResult?.voiceData?.tone ?? '');

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
          onClick={() => onConfirm({ name: nameValue || 'My Workspace' })}
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

  function buildOverrides(): BrandOverrides | undefined {
    const o: BrandOverrides = {};
    if (nameValue && nameValue !== brandData.name) o.name = nameValue;
    if (descValue !== (brandData.description ?? '')) o.description = descValue;
    if (audienceValue !== (brandData.audience ?? '')) o.audience = audienceValue;
    if (offersValue !== (brandData.offers ?? '')) o.offers = offersValue;
    if (voiceToneValue !== (analyzeResult?.voiceData?.tone ?? '')) o.voiceTone = voiceToneValue;
    return Object.keys(o).length > 0 ? o : undefined;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Heading */}
      <h3 className="text-sm font-semibold text-white-90">Here&apos;s what we found</h3>

      {/* Brand header */}
      <div className="flex items-start gap-3 p-3 rounded-lg border border-white-10">
        {brandData.logoUrl && /^https?:\/\//i.test(brandData.logoUrl) && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={brandData.logoUrl}
            alt="Logo"
            width={48}
            height={48}
            className="rounded-lg flex-none w-12 h-12 object-contain"
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

      {/* Details grid — always show all fields so user can fill empty ones */}
      <div className="grid grid-cols-1 gap-2 text-xs">
        <EditableDetailRow label="Description" value={descValue} onChange={setDescValue} multiline placeholder="Describe your business or listing..." />
        <EditableDetailRow label="Audience" value={audienceValue} onChange={setAudienceValue} placeholder="Who is your target audience?" />
        <EditableDetailRow label="Offers / Services" value={offersValue} onChange={setOffersValue} placeholder="What do you offer?" />
      </div>

      {/* Voice preview */}
      <EditableDetailRow
        label="Tone"
        value={voiceToneValue}
        onChange={setVoiceToneValue}
        placeholder="e.g. Professional, friendly, authoritative"
      />

      {/* Source row */}
      {sourceUrl && (
        <div className="flex items-center gap-1.5 text-[11px] text-white-30">
          <Globe className="w-3 h-3 flex-none" />
          <span className="truncate">Source: {sourceUrl}</span>
        </div>
      )}

      {/* Helper note */}
      <p className="text-[11px] text-white-25 text-center">
        You can edit this now. Squadpitch will use it to write your posts.
      </p>

      {/* Confirm button */}
      <button
        onClick={() => onConfirm(buildOverrides())}
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

function EditableDetailRow({
  label,
  value,
  onChange,
  multiline,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const isEmpty = !value;
  const [editing, setEditing] = useState(isEmpty);

  return (
    <div className="p-2.5 rounded-lg border border-white-10">
      <div className="flex items-center justify-between mb-0.5">
        <p className="text-[11px] text-white-40">{label}</p>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-white-30 hover:text-white-60 transition-colors"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>
      {editing ? (
        multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setEditing(false)}
            autoFocus
            rows={3}
            placeholder={placeholder}
            className={cn(
              'w-full px-2 py-1 rounded text-xs',
              'bg-white-5 border border-accent-green-110/50 text-white-90',
              'placeholder:text-white-30 focus:outline-none resize-none',
            )}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') setEditing(false); }}
            autoFocus
            placeholder={placeholder}
            className={cn(
              'w-full px-2 py-1 rounded text-xs',
              'bg-white-5 border border-accent-green-110/50 text-white-90',
              'placeholder:text-white-30 focus:outline-none',
            )}
          />
        )
      ) : (
        <p className="text-white-70 line-clamp-3 text-xs">{value}</p>
      )}
    </div>
  );
}
