'use client';

import { ArrowLeft, Check } from 'lucide-react';
import type { AgentProfileDraft } from '@/hooks/useSquadpitch';

interface AgentProfileConfirmationProps {
  draft: AgentProfileDraft;
  onChange: (updated: AgentProfileDraft) => void;
  onConfirm: () => void;
  onBack: () => void;
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-white-60">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className="w-full px-3 py-2 rounded-lg bg-sp-card border border-white-15 text-white text-sm focus:outline-none focus:border-accent-green-110 focus:ring-1 focus:ring-accent-green-110/30 placeholder:text-white-30 read-only:opacity-60 read-only:cursor-not-allowed"
      />
    </div>
  );
}

function ArrayInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-white-60">{label}</label>
      <input
        type="text"
        value={(value ?? []).join(', ')}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-sp-card border border-white-15 text-white text-sm focus:outline-none focus:border-accent-green-110 focus:ring-1 focus:ring-accent-green-110/30 placeholder:text-white-30"
      />
      <p className="text-[10px] text-white-30">Separate with commas</p>
    </div>
  );
}

export function AgentProfileConfirmation({
  draft,
  onChange,
  onConfirm,
  onBack,
}: AgentProfileConfirmationProps) {
  const update = (field: string, value: unknown) => {
    onChange({ ...draft, [field]: value });
  };

  const sources = draft._mergedSources
    ? Object.entries(draft._mergedSources).reduce<string[]>((acc, [, src]) => {
        const parts = typeof src === 'string' ? src.split(', ') : [];
        for (const p of parts) {
          if (!acc.includes(p)) acc.push(p);
        }
        return acc;
      }, [])
    : [];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">Review your agent profile</h3>
        <p className="text-sm text-white-50">
          We extracted this from your sources. Edit anything that needs correction.
        </p>
        {sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sources.map((src) => (
              <span
                key={src}
                className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent-green-110/10 text-accent-green-110"
              >
                {src.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldInput
          label="Agent Name"
          value={draft.agentName ?? ''}
          onChange={(v) => update('agentName', v)}
          placeholder="Jane Smith"
        />
        <FieldInput
          label="Brokerage"
          value={draft.brokerageName ?? ''}
          onChange={(v) => update('brokerageName', v)}
          placeholder="Keller Williams"
        />
        <FieldInput
          label="Team Name"
          value={draft.teamName ?? ''}
          onChange={(v) => update('teamName', v)}
          placeholder="The Smith Group"
        />
        <div className="grid grid-cols-2 gap-3">
          <FieldInput
            label="Primary City"
            value={draft.primaryCity ?? ''}
            onChange={(v) => update('primaryCity', v)}
            placeholder="Austin"
          />
          <div className="space-y-1">
            <label className="text-xs font-medium text-white-60">State</label>
            <select
              value={draft.primaryState ?? ''}
              onChange={(e) => update('primaryState', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-sp-card border border-white-15 text-white text-sm focus:outline-none focus:border-accent-green-110"
            >
              <option value="">--</option>
              {US_STATES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <ArrayInput
        label="Service Areas"
        value={draft.serviceAreas ?? []}
        onChange={(v) => update('serviceAreas', v)}
        placeholder="Downtown Austin, Westlake Hills, Round Rock"
      />

      <ArrayInput
        label="Specialties"
        value={draft.specialties ?? []}
        onChange={(v) => update('specialties', v)}
        placeholder="Buyer's Agent, Listing Agent, First-Time Buyers"
      />

      {(draft.licenseNumber || draft.licenseState) && (
        <div className="grid grid-cols-2 gap-4">
          <FieldInput
            label="License Number"
            value={draft.licenseNumber ?? ''}
            onChange={() => {}}
            readOnly
          />
          <FieldInput
            label="License State"
            value={draft.licenseState ?? ''}
            onChange={() => {}}
            readOnly
          />
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs font-medium text-white-60">Bio</label>
        <textarea
          value={draft.bio ?? ''}
          onChange={(e) => update('bio', e.target.value)}
          placeholder="Tell potential clients about yourself..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-sp-card border border-white-15 text-white text-sm focus:outline-none focus:border-accent-green-110 focus:ring-1 focus:ring-accent-green-110/30 placeholder:text-white-30 resize-none"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white-15 text-sm text-white-60 hover:text-white-80 hover:border-white-25 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sources
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors"
        >
          <Check className="w-4 h-4" />
          Confirm &amp; Continue
        </button>
      </div>
    </div>
  );
}
