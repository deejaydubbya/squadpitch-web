'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useLicenseLookup, type AgentProfileDraft } from '@/hooks/useSquadpitch';
import { ArrowRight, Loader2, Check } from 'lucide-react';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

interface Props {
  onDone: (source: AgentProfileDraft) => void;
}

export function SourceLicenseCard({ onDone }: Props) {
  const [state, setState] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const lookup = useLicenseLookup();

  const isValid = state.length === 2 && licenseNumber.trim().length >= 3;

  const handleSubmit = async () => {
    if (!isValid || lookup.isPending) return;
    try {
      const result = await lookup.mutateAsync({ state, licenseNumber: licenseNumber.trim() });
      onDone(result);
    } catch {
      // Error handled by mutation state
    }
  };

  if (lookup.isSuccess) {
    return (
      <div className="flex items-center gap-2 p-3 bg-accent-green-110/10 rounded-lg">
        <Check className="w-4 h-4 text-accent-green-110" />
        <p className="text-sm text-accent-green-110">License verified</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className={cn(
            'w-20 px-2 py-2 rounded-lg text-sm',
            'bg-white-5 border border-white-10 text-white-90',
            'focus:border-accent-green-110/50 focus:outline-none',
          )}
        >
          <option value="" className="bg-neutral-900 text-white">State</option>
          {US_STATES.map((s) => (
            <option key={s} value={s} className="bg-neutral-900 text-white">{s}</option>
          ))}
        </select>
        <input
          type="text"
          value={licenseNumber}
          onChange={(e) => setLicenseNumber(e.target.value)}
          placeholder="License number"
          className={cn(
            'flex-1 px-3 py-2 rounded-lg text-sm',
            'bg-white-5 border border-white-10 text-white-90',
            'placeholder:text-white-30 focus:border-accent-green-110/50 focus:outline-none',
          )}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        />
        <button
          onClick={handleSubmit}
          disabled={!isValid || lookup.isPending}
          className={cn(
            'flex-none flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            isValid && !lookup.isPending
              ? 'bg-accent-green-110 text-white hover:bg-accent-green-120 cursor-pointer'
              : 'bg-white-10 text-white-30 cursor-not-allowed',
          )}
        >
          {lookup.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
      {lookup.isError && (
        <p className="text-xs text-red-400">{lookup.error?.message || 'License lookup failed.'}</p>
      )}
    </div>
  );
}
