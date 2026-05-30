'use client';

// Phase 0 multilingual support — collects the workspace's default
// *content* language during onboarding. Mirrors the visual pattern
// of `IndustrySelectCard`; the user lands here right after picking
// an industry and before any AI generation runs.
//
// Important: this picks the language Squadpitch will *generate* in
// (campaign copy, social posts, captions, landing pages, inbox
// replies). It does NOT translate the dashboard itself — that's a
// later phase.
//
// The selected code is committed to `Client.defaultLanguage` at
// workspace creation; if the user is past workspace-creation when
// they hit this card (re-entering the flow), the orchestrator
// persists via the same field on the existing Client.

import { cn } from '@/lib/utils';
import { SUPPORTED_LANGUAGES } from '@/lib/languages';
import { Languages } from 'lucide-react';

interface Props {
  /** Currently-selected code — usually `client.defaultLanguage`. */
  value?: string;
  onSelect: (code: string, label: string) => void;
}

export function LanguageSelectCard({ value, onSelect }: Props) {
  return (
    <div className="space-y-3 pb-4">
      <div className="grid grid-cols-2 gap-2">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = value === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => onSelect(lang.code, lang.label)}
              aria-pressed={isSelected}
              title={`Generate content in ${lang.label}`}
              className={cn(
                'relative flex flex-col items-center gap-1.5 p-4 rounded-lg border text-center transition-all',
                isSelected
                  ? 'bg-accent-green-110/10 border-accent-green-110/40 ring-1 ring-accent-green-110/40'
                  : 'bg-white-5 border-transparent hover:bg-white-10 hover:border-accent-green-110/30 cursor-pointer',
              )}
            >
              <Languages
                className={cn(
                  'w-5 h-5',
                  isSelected ? 'text-accent-green-110' : 'text-white-60',
                )}
              />
              <span
                className={cn(
                  'text-sm font-semibold leading-tight',
                  isSelected ? 'text-accent-green-110' : 'text-white-90',
                )}
              >
                {lang.label}
              </span>
              {lang.nativeLabel !== lang.label && (
                <span className="text-[11px] text-white-40 leading-snug">
                  {lang.nativeLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-white-30 leading-snug">
        You can change this later in workspace settings. This selects the
        language for generated content only — the Squadpitch dashboard
        itself stays in English.
      </p>
    </div>
  );
}
