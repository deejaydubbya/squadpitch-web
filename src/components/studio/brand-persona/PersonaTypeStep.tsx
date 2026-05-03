'use client';

import { User, Palette, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PERSONA_TYPE_OPTIONS } from './personaConstants';
import type { PersonaType } from '@/hooks/useSquadpitch';

const ICONS = { User, Palette, Users } as const;

interface Props {
  selected: PersonaType | undefined;
  onSelect: (type: PersonaType) => void;
  saving: boolean;
}

export function PersonaTypeStep({ selected, onSelect, saving }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white-100">
          What kind of AI Brand Persona do you want to create?
        </h2>
        <p className="text-sm text-white-40 mt-1">
          Choose the type that best fits your needs. You can always change this later.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {PERSONA_TYPE_OPTIONS.map((opt) => {
          const Icon = ICONS[opt.icon as keyof typeof ICONS];
          const isSelected = selected === opt.type;
          return (
            <button
              key={opt.type}
              onClick={() => opt.available && onSelect(opt.type)}
              disabled={!opt.available || saving}
              className={cn(
                'relative text-left rounded-xl border p-5 transition-all',
                opt.available
                  ? isSelected
                    ? 'border-accent-green-110 bg-accent-green-110/5'
                    : 'border-white-10 hover:border-white-20 bg-sp-card'
                  : 'border-white-5 bg-white-5/50 opacity-60 cursor-not-allowed'
              )}
            >
              {!opt.available && (
                <span className="absolute top-3 right-3 text-[10px] font-medium bg-white-10 text-white-40 px-2 py-0.5 rounded-full">
                  Coming Soon
                </span>
              )}
              <Icon
                className={cn(
                  'w-8 h-8 mb-3',
                  isSelected ? 'text-accent-green-110' : 'text-white-40'
                )}
              />
              <h3 className="text-sm font-semibold text-white-100">{opt.title}</h3>
              <p className="text-xs text-white-40 mt-1 leading-relaxed">
                {opt.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
