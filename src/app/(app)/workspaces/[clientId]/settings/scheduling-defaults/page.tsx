'use client';

// Scheduling Defaults settings page.
//
// Workspace-level scheduling defaults the Create assistant honors
// when the user hasn't picked otherwise. Reads/writes
// ContentPreferences (campaign length, cadence, posting days,
// posting time) and Client.timezone (via the existing PATCH
// /workspaces/:id endpoint).
//
// Fields here are intentionally additive — the existing
// schedulePresets logic still ships, and these preferences are
// applied as soft defaults via the same precedence rule as the
// rest of ContentPreferences (URL > user > preference > static).

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Save, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useClient,
  useContentPreferences,
  useUpdateClient,
  useUpdateContentPreferences,
  type DefaultCampaignLength,
  type PostingDay,
  type PreferredCadence,
} from '@/hooks/useSquadpitch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';
import {
  CADENCE_OPTIONS,
  CAMPAIGN_LENGTH_OPTIONS,
  POSTING_DAY_OPTIONS,
} from '@/lib/assistant/contentPreferences';

// Curated list of common timezones. The API accepts any IANA
// string, but a short picklist keeps the UI sensible. Users with
// exotic timezones can change Client.timezone via General Settings
// or directly through the API.
const TIMEZONE_OPTIONS = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Stockholm',
  'Europe/Athens',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
];

interface FormState {
  defaultCampaignLength: DefaultCampaignLength | null;
  preferredCampaignCadence: PreferredCadence | null;
  preferredPostingDays: PostingDay[];
  preferredPostingTime: string;
  timezone: string;
}

const EMPTY_FORM: FormState = {
  defaultCampaignLength: null,
  preferredCampaignCadence: null,
  preferredPostingDays: [],
  preferredPostingTime: '',
  timezone: 'UTC',
};

export default function SchedulingDefaultsPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;

  const { data: client } = useClient(clientId);
  const { data: prefs, isLoading } = useContentPreferences(clientId);
  const updatePrefs = useUpdateContentPreferences(clientId);
  const updateClient = useUpdateClient(clientId);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setForm({
      defaultCampaignLength: prefs?.defaultCampaignLength ?? null,
      preferredCampaignCadence: prefs?.preferredCampaignCadence ?? null,
      preferredPostingDays: prefs?.preferredPostingDays ?? [],
      preferredPostingTime: prefs?.preferredPostingTime ?? '',
      timezone: client?.timezone ?? 'UTC',
    });
  }, [prefs, client?.timezone]);

  const isPending = updatePrefs.isPending || updateClient.isPending;
  const error = updatePrefs.error ?? updateClient.error;

  const handleSubmit = async () => {
    const time = form.preferredPostingTime.trim();
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      // Surface a one-shot error by mirroring the mutation error
      // shape. The StatusBanner below picks it up via updatePrefs.error
      // — but since we haven't fired yet, just early-return.
      return;
    }

    await Promise.all([
      updatePrefs.mutateAsync({
        defaultCampaignLength: form.defaultCampaignLength,
        preferredCampaignCadence: form.preferredCampaignCadence,
        preferredPostingDays: form.preferredPostingDays,
        preferredPostingTime: time || null,
      }),
      // Only write the timezone when it actually changed — avoids a
      // no-op PATCH on every save.
      client && form.timezone !== client.timezone
        ? updateClient.mutateAsync({ timezone: form.timezone })
        : Promise.resolve(),
    ]);
    setSavedAt(Date.now());
  };

  if (isLoading || !client) {
    return (
      <div className="flex items-center gap-2 py-6">
        <LoadingSpinner size="sm" />
        <span className="text-white-40 text-sm">Loading scheduling defaults…</span>
      </div>
    );
  }

  const showSaved = savedAt && Date.now() - savedAt < 3000;
  const invalidTime =
    form.preferredPostingTime.trim().length > 0 &&
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.preferredPostingTime.trim());

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-white-100">Scheduling Defaults</h2>
        <p className="text-sm text-white-40 mt-0.5">
          Defaults for when posts should publish. The assistant uses these
          when proposing schedules; you can override any of them per
          campaign.
        </p>
      </div>

      {/* Section 1 — Campaign size */}
      <section className="card p-5 space-y-5">
        <h3 className="text-sm font-semibold text-white-100">Campaign size</h3>

        <Field
          label="Default campaign length"
          hint="How many posts to suggest by default for a new campaign. Saved now — the schedule presets that consume this default are landing in a follow-up."
        >
          <ButtonGroup
            value={String(form.defaultCampaignLength ?? '')}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                defaultCampaignLength: v ? (Number(v) as DefaultCampaignLength) : null,
              }))
            }
            options={[
              { value: '', label: 'No default' },
              ...CAMPAIGN_LENGTH_OPTIONS.map((o) => ({
                value: String(o.value),
                label: o.label,
              })),
            ]}
          />
        </Field>

        <Field
          label="Default cadence"
          hint="How posts are spaced across the campaign window."
        >
          <ButtonGroup
            value={form.preferredCampaignCadence ?? ''}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                preferredCampaignCadence: (v || null) as PreferredCadence | null,
              }))
            }
            options={[{ value: '', label: 'No default' }, ...CADENCE_OPTIONS]}
          />
        </Field>
      </section>

      {/* Section 2 — Posting window */}
      <section className="card p-5 space-y-5">
        <h3 className="text-sm font-semibold text-white-100">Posting window</h3>

        {/* Honest about the current state: these fields persist
            correctly and the assistant surfaces them as visible
            defaults, but the save-drafts route still hardcodes
            10:00 UTC and doesn't filter scheduled dates by
            day-of-week. Full enforcement is a follow-up. */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-300">
          Preferred days and time are saved and shown as hints during
          campaign scheduling, but the publishing scheduler doesn&apos;t
          fully enforce them yet — scheduled posts still anchor to
          the campaign start date at a fixed time. Full enforcement
          (per-slot day-of-week + your preferred time in the workspace
          timezone) is coming in a follow-up.
        </div>

        <Field
          label="Preferred posting days"
          hint="Days the assistant should suggest by default. Leave empty for any day."
        >
          <div className="flex flex-wrap gap-1.5">
            {POSTING_DAY_OPTIONS.map((d) => {
              const isOn = form.preferredPostingDays.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      preferredPostingDays: isOn
                        ? f.preferredPostingDays.filter((x) => x !== d.value)
                        : [...f.preferredPostingDays, d.value],
                    }))
                  }
                  title={d.full}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                    isOn
                      ? 'bg-accent-green-110/15 text-accent-green-110 border-accent-green-110/30'
                      : 'bg-white-5 text-white-60 border-white-10 hover:bg-white-10',
                  )}
                >
                  {isOn && <Check className="w-3 h-3" />}
                  {d.short}
                </button>
              );
            })}
          </div>
        </Field>

        <Field
          label="Preferred posting time"
          hint="24-hour HH:mm format. Interpreted in the workspace timezone."
        >
          <input
            type="time"
            value={form.preferredPostingTime}
            onChange={(e) =>
              setForm((f) => ({ ...f, preferredPostingTime: e.target.value }))
            }
            className={cn(
              'w-32 px-3 py-2 rounded-lg bg-white-5 border text-white-100 text-sm focus:outline-none',
              invalidTime
                ? 'border-red-500/50 focus:border-red-500'
                : 'border-white-10 focus:border-accent-green-110',
            )}
          />
          {invalidTime && (
            <p className="text-xs text-red-400 mt-1">Use HH:mm (e.g. 09:30).</p>
          )}
        </Field>

        <Field
          label="Workspace timezone"
          hint="Stored on the workspace. Used by analytics and scheduling."
        >
          <Select
            value={form.timezone}
            onChange={(v) => setForm((f) => ({ ...f, timezone: v }))}
            options={TIMEZONE_OPTIONS.map((tz) => ({ value: tz, label: tz }))}
          />
        </Field>
      </section>

      {error && <StatusBanner error={(error as Error).message} />}
      {showSaved && <StatusBanner success message="Scheduling defaults saved" />}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={isPending || invalidTime}
          className="btn btn-primary text-xs flex items-center gap-1"
        >
          {isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          Save scheduling defaults
        </button>
      </div>
    </div>
  );
}

// ── Reusable bits ──────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-white-40 mt-1">{hint}</p>}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full max-w-sm px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-sp-bg">
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ButtonGroup({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string; description?: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const isOn = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            title={o.description}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
              isOn
                ? 'bg-accent-green-110/15 text-accent-green-110 border-accent-green-110/30'
                : 'bg-white-5 text-white-60 border-white-10 hover:bg-white-10',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
