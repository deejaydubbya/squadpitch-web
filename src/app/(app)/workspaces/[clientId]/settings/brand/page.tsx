'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BrandProfileForm } from '@/components/studio/BrandProfileForm';
import { VoiceProfileForm } from '@/components/studio/VoiceProfileForm';
import { BrandPersonaWizard } from '@/components/studio/brand-persona/BrandPersonaWizard';

type Section = 'profile' | 'voice' | 'visual';

export default function SettingsBrandPage() {
  const params = useParams<{ clientId: string }>();
  const searchParams = useSearchParams();
  const clientId = params.clientId;

  const initialSection = (searchParams.get('section') as Section) || 'profile';
  const [section, setSection] = useState<Section>(initialSection);

  const sections: { key: Section; label: string }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'voice', label: 'Voice' },
    { key: 'visual', label: 'Visual Identity' },
  ];

  return (
    <div className="space-y-6">
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
        <div className="flex min-w-max items-center gap-1">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={cn(
              'min-h-11 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors sm:min-h-0',
              section === s.key
                ? 'bg-accent-green-110/15 text-accent-green-110'
                : 'text-white-40 hover:text-white-100 hover:bg-white-5'
            )}
          >
            {s.label}
          </button>
        ))}
        </div>
      </div>

      {section === 'profile' && <BrandProfileForm clientId={clientId} />}
      {section === 'voice' && <VoiceProfileForm clientId={clientId} />}
      {section === 'visual' && <BrandPersonaWizard clientId={clientId} />}
    </div>
  );
}
