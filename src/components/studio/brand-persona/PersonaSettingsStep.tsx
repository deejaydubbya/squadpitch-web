'use client';

import { useState } from 'react';
import { USAGE_AREAS } from './personaConstants';
import type { PersonaUsageSettings } from '@/hooks/useSquadpitch';

interface Props {
  usageSettings: PersonaUsageSettings;
  onSave: (settings: PersonaUsageSettings) => void;
  saving: boolean;
}

export function PersonaSettingsStep({ usageSettings, onSave, saving }: Props) {
  const [settings, setSettings] = useState<PersonaUsageSettings>(() => ({
    personalBrandPosts: true,
    educationalGraphics: true,
    listingPromotions: true,
    smartVideoThumbnails: true,
    smartVideoIntroOutro: true,
    campaignCoverImages: true,
    askBeforeUsing: true,
    ...usageSettings,
  }));

  const toggle = (key: keyof PersonaUsageSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white-100">Usage Settings</h2>
        <p className="text-sm text-white-40 mt-1">
          Choose where your AI Brand Persona can be used across Squadpitch.
        </p>
      </div>

      {/* Usage toggles */}
      <div className="card p-4 space-y-3">
        <h3 className="text-xs font-semibold text-white-50 uppercase tracking-wider">
          Enable Persona For
        </h3>
        {USAGE_AREAS.map((area) => (
          <label
            key={area.key}
            className="flex items-center justify-between cursor-pointer py-1"
          >
            <span className="text-sm text-white-80">{area.label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={settings[area.key] ?? true}
              onClick={() => toggle(area.key)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                settings[area.key]
                  ? 'bg-accent-green-110'
                  : 'bg-white-15'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  settings[area.key] ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        ))}

        <div className="border-t border-white-10 my-2" />

        {/* Factual listing photos — always off */}
        <label className="flex items-center justify-between py-1 opacity-50">
          <div>
            <span className="text-sm text-white-80">Factual listing photos</span>
            <p className="text-[10px] text-white-30">Not available — AI images cannot replace real listing photos</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={false}
            disabled
            className="relative inline-flex h-5 w-9 items-center rounded-full bg-white-15 cursor-not-allowed"
          >
            <span className="inline-block h-3.5 w-3.5 rounded-full bg-white translate-x-1" />
          </button>
        </label>

        <div className="border-t border-white-10 my-2" />

        {/* Ask before using */}
        <label className="flex items-center justify-between cursor-pointer py-1">
          <div>
            <span className="text-sm text-white-80">Ask before using persona</span>
            <p className="text-[10px] text-white-30">Show a confirmation before applying your persona to content</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.askBeforeUsing ?? true}
            onClick={() => toggle('askBeforeUsing')}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              settings.askBeforeUsing
                ? 'bg-accent-green-110'
                : 'bg-white-15'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                settings.askBeforeUsing ? 'translate-x-4' : 'translate-x-1'
              }`}
            />
          </button>
        </label>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={() => onSave(settings)}
          disabled={saving}
          className="btn btn-primary px-6 py-2 text-sm"
        >
          {saving ? 'Saving...' : 'Save & Finish'}
        </button>
      </div>
    </div>
  );
}
