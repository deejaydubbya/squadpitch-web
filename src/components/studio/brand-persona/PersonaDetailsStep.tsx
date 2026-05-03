'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { VISUAL_STYLES, USAGE_AREAS, BRAND_STYLE_VISUAL_STYLES } from './personaConstants';
import type { PersonaUsageSettings, PersonaType } from '@/hooks/useSquadpitch';

interface Props {
  name: string;
  visualStyle: string | null;
  usageSettings: PersonaUsageSettings;
  hasConsent: boolean;
  onSave: (data: {
    name: string;
    visualStyle: string;
    usageSettings: PersonaUsageSettings;
    consent: boolean;
  }) => void;
  saving: boolean;
  personaType?: PersonaType;
}

export function PersonaDetailsStep({
  name: initialName,
  visualStyle: initialStyle,
  usageSettings: initialUsage,
  hasConsent,
  onSave,
  saving,
  personaType,
}: Props) {
  const isBrandStyle = personaType === 'BRAND_STYLE';
  const styleOptions = isBrandStyle ? BRAND_STYLE_VISUAL_STYLES : VISUAL_STYLES;
  const [name, setName] = useState(initialName || '');
  const [style, setStyle] = useState(initialStyle || '');
  const [consent, setConsent] = useState(hasConsent);
  const [usage, setUsage] = useState<PersonaUsageSettings>(() => ({
    personalBrandPosts: true,
    educationalGraphics: true,
    listingPromotions: true,
    smartVideoThumbnails: true,
    smartVideoIntroOutro: true,
    campaignCoverImages: true,
    ...initialUsage,
  }));

  const canContinue = name.trim().length > 0 && style.length > 0 && consent;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white-100">
          {isBrandStyle ? 'Brand Style Details' : 'Persona Details'}
        </h2>
        <p className="text-sm text-white-40 mt-1">
          {isBrandStyle
            ? 'Name your brand style and choose a visual direction.'
            : 'Name your persona and choose a visual style.'}
        </p>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-white-60 mb-1.5">
          {isBrandStyle ? 'Brand Style Name' : 'Persona Name'}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isBrandStyle ? 'e.g., Luxury Coastal Aesthetic' : "e.g., Sarah's Agent Persona"}
          className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
          maxLength={120}
        />
      </div>

      {/* Visual style pills */}
      <div>
        <label className="block text-sm font-medium text-white-60 mb-2">
          Visual Style
        </label>
        <div className="flex flex-wrap gap-2">
          {styleOptions.map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                style === s
                  ? 'bg-accent-green-110 text-sp-bg'
                  : 'bg-white-5 text-white-60 hover:bg-white-10'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Usage areas */}
      <div>
        <label className="block text-sm font-medium text-white-60 mb-2">
          Usage Areas
        </label>
        <div className="space-y-2">
          {USAGE_AREAS.map((area) => (
            <label
              key={area.key}
              className="flex items-center gap-3 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={usage[area.key] ?? true}
                onChange={(e) =>
                  setUsage((prev) => ({ ...prev, [area.key]: e.target.checked }))
                }
                className="w-4 h-4 rounded border-white-20 text-accent-green-110 focus:ring-accent-green-110 bg-white-5"
              />
              <span className="text-sm text-white-80">{area.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Safety note */}
      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
        <p className="text-xs text-blue-300">
          {isBrandStyle
            ? 'Brand style will be applied to generated graphics. It will not replace factual property photos.'
            : 'Squadpitch will not use AI persona images as factual listing photos. Generated images are clearly marked as AI-created.'}
        </p>
      </div>

      {/* Consent */}
      <div className="rounded-lg bg-white-5 border border-white-10 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-white-20 text-accent-green-110 focus:ring-accent-green-110 bg-white-5"
          />
          <span className="text-sm text-white-80 leading-relaxed">
            {isBrandStyle
              ? 'I confirm I have the right to use these images to train a brand style model.'
              : 'I confirm I have the right to use these images to create my AI Brand Persona.'}
          </span>
        </label>
      </div>

      {/* Continue */}
      <div className="flex justify-end">
        <button
          onClick={() =>
            onSave({
              name: name.trim(),
              visualStyle: style,
              usageSettings: usage,
              consent,
            })
          }
          disabled={!canContinue || saving}
          className="btn btn-primary px-6 py-2 text-sm"
        >
          {saving ? 'Saving...' : 'Start Training'}
        </button>
      </div>
    </div>
  );
}
