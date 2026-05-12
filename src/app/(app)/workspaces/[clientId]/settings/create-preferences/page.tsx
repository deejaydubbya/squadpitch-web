'use client';

// Create Preferences settings page.
//
// Surfaces the ContentPreferences table to users so they can set
// workspace-level defaults the assistant honors when the user
// hasn't made an explicit per-session choice. See
// lib/assistant/contentPreferences.ts for the consumer side —
// resolveDefaults() is the single source of truth for how these
// preferences flow into the Create assistant.

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Save, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useContentPreferences,
  useUpdateContentPreferences,
  type Channel,
  type ContentPreferences,
  type PreferredCadence,
  type PreferredCtaStyle,
} from '@/hooks/useSquadpitch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';
import {
  packDefaultCampaignTypes,
  unpackDefaultCampaignTypes,
} from '@/lib/assistant/contentPreferences';

// ── Option sets ─────────────────────────────────────────────────────

// Channels the API + Prisma enum supports. (The frontend Channel
// type includes REDDIT, but the database enum does not; filter to
// the intersection so a user can't pick something the API rejects.)
const CHANNEL_OPTIONS: Array<{ value: Channel; label: string }> = [
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'LINKEDIN_ORGANIZATION_PAGE', label: 'LinkedIn Page' },
  { value: 'X', label: 'X' },
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'PINTEREST', label: 'Pinterest' },
  { value: 'THREADS', label: 'Threads' },
];

// Cadence labels carry the campaign-length signal too — the
// schedulePresets table maps each cadence to a length (Fast≈7d,
// Standard≈10d, Extended≈14d). The spec asks for a separate
// "campaign length" picker but the underlying column doesn't
// exist yet, so we collapse the two into cadence for MVP. See the
// implementation report for the follow-up to split them.
const CADENCE_OPTIONS: Array<{ value: PreferredCadence; label: string; description: string }> = [
  { value: 'aggressive', label: 'Fast', description: 'Front-loaded — ~7 days' },
  { value: 'balanced', label: 'Standard', description: 'Even pacing — ~10 days' },
  { value: 'luxury', label: 'Extended', description: 'Slow build — ~14+ days' },
];

const PROPERTY_CAMPAIGN_TYPES = [
  { value: 'just_listed', label: 'Just Listed' },
  { value: 'listing_spotlight', label: 'Listing Spotlight' },
  { value: 'open_house', label: 'Open House' },
  { value: 'price_drop', label: 'Price Drop' },
  { value: 'just_sold', label: 'Just Sold' },
];

const ASSET_CAMPAIGN_TYPES = [
  { value: 'educational', label: 'Educational' },
  { value: 'awareness', label: 'Awareness' },
  { value: 'promotion_offer', label: 'Promotion / Offer' },
  { value: 'social_proof', label: 'Social Proof' },
  { value: 'event_announcement', label: 'Event Announcement' },
];

const IDEA_CAMPAIGN_TYPES = [
  { value: 'lead_generation', label: 'Lead Generation' },
  { value: 'awareness', label: 'Awareness' },
  { value: 'educational', label: 'Educational' },
  { value: 'promotion_offer', label: 'Promotion / Offer' },
];

const CTA_OPTIONS: Array<{ value: PreferredCtaStyle; label: string; description: string }> = [
  { value: 'direct', label: 'Direct', description: '"Call now", "Book a showing"' },
  { value: 'soft', label: 'Soft', description: '"Learn more", "Link in bio"' },
  { value: 'question', label: 'Question', description: 'End with a question to drive replies' },
  { value: 'none', label: 'None', description: 'No explicit CTA' },
];

const CONTENT_BUCKET_OPTIONS = [
  { value: 'educational', label: 'Educational' },
  { value: 'promotional', label: 'Promotional' },
  { value: 'social_proof', label: 'Social Proof' },
  { value: 'community', label: 'Community' },
  { value: 'personal_brand', label: 'Personal Brand' },
  { value: 'market_update', label: 'Market Update' },
];

// `mediaOrderPreference` was originally designed for property
// photos ("exterior first", "hero first", etc.) — not for the
// flow-ordering concept the spec wants ("pick media before vs.
// after the campaign is drafted"). Until the persisted column is
// re-shaped (or a new flow-order column is added), we expose only
// the photo-ordering values that map directly to the column.

// ── Form state ──────────────────────────────────────────────────────

interface FormState {
  preferredChannels: Channel[];
  defaultQuickPostChannel: Channel | null;
  preferredCampaignCadence: PreferredCadence | null;
  defaultCampaignTypeProperty: string | null;
  defaultCampaignTypeAsset: string | null;
  defaultCampaignTypeIdea: string | null;
  preferredCtaStyle: PreferredCtaStyle | null;
  defaultContentBucket: string | null;
  alwaysRequireReview: boolean;
  autoGenerateMedia: boolean;
}

const EMPTY_FORM: FormState = {
  preferredChannels: [],
  defaultQuickPostChannel: null,
  preferredCampaignCadence: null,
  defaultCampaignTypeProperty: null,
  defaultCampaignTypeAsset: null,
  defaultCampaignTypeIdea: null,
  preferredCtaStyle: null,
  defaultContentBucket: null,
  alwaysRequireReview: true,
  autoGenerateMedia: false,
};

// The DB has a single `defaultCampaignType` column. We let the user
// configure a different default per source type in the UI by
// folding the three values into one packed string. Format owned by
// lib/assistant/contentPreferences.ts so the assistant follow-up
// can read the same shape without reimplementing it.
function preferencesToForm(prefs: ContentPreferences | null | undefined): FormState {
  if (!prefs) return EMPTY_FORM;
  const types = unpackDefaultCampaignTypes(prefs.defaultCampaignType);
  return {
    preferredChannels: prefs.preferredChannels ?? [],
    defaultQuickPostChannel: prefs.defaultQuickPostChannel,
    preferredCampaignCadence: prefs.preferredCampaignCadence,
    defaultCampaignTypeProperty: types.property ?? null,
    defaultCampaignTypeAsset: types.data_item ?? null,
    defaultCampaignTypeIdea: types.idea ?? null,
    preferredCtaStyle: prefs.preferredCtaStyle,
    defaultContentBucket: prefs.defaultContentBucket,
    alwaysRequireReview: prefs.alwaysRequireReview,
    autoGenerateMedia: prefs.autoGenerateMedia,
  };
}

// ── Page ────────────────────────────────────────────────────────────

export default function CreatePreferencesSettingsPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;

  const { data: prefs, isLoading } = useContentPreferences(clientId);
  const update = useUpdateContentPreferences(clientId);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setForm(preferencesToForm(prefs));
  }, [prefs]);

  const handleSubmit = () => {
    update.mutate(
      {
        preferredChannels: form.preferredChannels,
        defaultQuickPostChannel: form.defaultQuickPostChannel,
        preferredCampaignCadence: form.preferredCampaignCadence,
        defaultCampaignType: packDefaultCampaignTypes({
          property: form.defaultCampaignTypeProperty ?? undefined,
          data_item: form.defaultCampaignTypeAsset ?? undefined,
          idea: form.defaultCampaignTypeIdea ?? undefined,
        }),
        preferredCtaStyle: form.preferredCtaStyle,
        defaultContentBucket: form.defaultContentBucket,
        alwaysRequireReview: form.alwaysRequireReview,
        autoGenerateMedia: form.autoGenerateMedia,
      },
      { onSuccess: () => setSavedAt(Date.now()) },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6">
        <LoadingSpinner size="sm" />
        <span className="text-white-40 text-sm">Loading preferences…</span>
      </div>
    );
  }

  const showSaved = savedAt && Date.now() - savedAt < 3000;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-white-100">Create Preferences</h2>
        <p className="text-sm text-white-40 mt-0.5">
          Defaults the Create assistant uses when you haven&apos;t made
          a choice yet. You can always override these per session.
        </p>
      </div>

      {/* Section 1 — Channels */}
      <section className="card p-5 space-y-5">
        <h3 className="text-sm font-semibold text-white-100">Channels</h3>

        <Field
          label="Preferred channels"
          hint="The assistant will suggest these by default for new posts and campaigns."
        >
          <ChannelChipPicker
            selected={form.preferredChannels}
            onToggle={(ch) => {
              setForm((f) => ({
                ...f,
                preferredChannels: f.preferredChannels.includes(ch)
                  ? f.preferredChannels.filter((c) => c !== ch)
                  : [...f.preferredChannels, ch],
                // If the current quick-post channel is removed from
                // preferred, clear it so we don't leave a stale
                // selection.
                defaultQuickPostChannel:
                  f.defaultQuickPostChannel === ch && f.preferredChannels.includes(ch)
                    ? null
                    : f.defaultQuickPostChannel,
              }));
            }}
          />
        </Field>

        <Field
          label="Default channel for single posts"
          hint="Quick-post flows will prefill with this channel."
        >
          <Select
            value={form.defaultQuickPostChannel ?? ''}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                defaultQuickPostChannel: (v || null) as Channel | null,
              }))
            }
            options={[
              { value: '', label: 'No default — ask each time' },
              ...CHANNEL_OPTIONS.filter(
                (c) =>
                  form.preferredChannels.length === 0 ||
                  form.preferredChannels.includes(c.value),
              ),
            ]}
          />
        </Field>
      </section>

      {/* Section 2 — Campaign defaults */}
      <section className="card p-5 space-y-5">
        <h3 className="text-sm font-semibold text-white-100">Campaign defaults</h3>

        <Field label="Cadence" hint="How posts are spaced across a campaign.">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Default for Property campaigns">
            <Select
              value={form.defaultCampaignTypeProperty ?? ''}
              onChange={(v) =>
                setForm((f) => ({ ...f, defaultCampaignTypeProperty: v || null }))
              }
              options={[
                { value: '', label: 'No default' },
                ...PROPERTY_CAMPAIGN_TYPES,
              ]}
            />
          </Field>

          <Field label="Default for Content Asset campaigns">
            <Select
              value={form.defaultCampaignTypeAsset ?? ''}
              onChange={(v) =>
                setForm((f) => ({ ...f, defaultCampaignTypeAsset: v || null }))
              }
              options={[
                { value: '', label: 'No default' },
                ...ASSET_CAMPAIGN_TYPES,
              ]}
            />
          </Field>

          <Field label="Default for Idea campaigns">
            <Select
              value={form.defaultCampaignTypeIdea ?? ''}
              onChange={(v) =>
                setForm((f) => ({ ...f, defaultCampaignTypeIdea: v || null }))
              }
              options={[
                { value: '', label: 'No default' },
                ...IDEA_CAMPAIGN_TYPES,
              ]}
            />
          </Field>
        </div>
      </section>

      {/* Section 3 — Content style */}
      <section className="card p-5 space-y-5">
        <h3 className="text-sm font-semibold text-white-100">Content style</h3>

        <Field label="Default CTA style">
          <ButtonGroup
            value={form.preferredCtaStyle ?? ''}
            onChange={(v) =>
              setForm((f) => ({
                ...f,
                preferredCtaStyle: (v || null) as PreferredCtaStyle | null,
              }))
            }
            options={[{ value: '', label: 'No default' }, ...CTA_OPTIONS]}
          />
        </Field>

        <Field label="Default content bucket">
          <Select
            value={form.defaultContentBucket ?? ''}
            onChange={(v) =>
              setForm((f) => ({ ...f, defaultContentBucket: v || null }))
            }
            options={[
              { value: '', label: 'No default' },
              ...CONTENT_BUCKET_OPTIONS,
            ]}
          />
        </Field>
      </section>

      {/* Section 4 — Media & review */}
      <section className="card p-5 space-y-5">
        <h3 className="text-sm font-semibold text-white-100">Media &amp; review</h3>

        <Toggle
          label="Always require review before publishing"
          description="New drafts land in your planner instead of auto-scheduling."
          checked={form.alwaysRequireReview}
          onChange={(v) =>
            setForm((f) => ({ ...f, alwaysRequireReview: v }))
          }
        />

        <Toggle
          label="Auto-generate media when missing"
          description="When a post has no media, ask the assistant to generate one."
          checked={form.autoGenerateMedia}
          onChange={(v) =>
            setForm((f) => ({ ...f, autoGenerateMedia: v }))
          }
        />
      </section>

      {update.error && (
        <StatusBanner error={(update.error as Error).message} />
      )}
      {showSaved && <StatusBanner success message="Preferences saved" />}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={update.isPending}
          className="btn btn-primary text-xs flex items-center gap-1"
        >
          {update.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          Save preferences
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

function ChannelChipPicker({
  selected,
  onToggle,
}: {
  selected: Channel[];
  onToggle: (ch: Channel) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CHANNEL_OPTIONS.map((c) => {
        const isOn = selected.includes(c.value);
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => onToggle(c.value)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors border',
              isOn
                ? 'bg-accent-green-110/15 text-accent-green-110 border-accent-green-110/30'
                : 'bg-white-5 text-white-60 border-white-10 hover:bg-white-10',
            )}
          >
            {isOn && <Check className="w-3 h-3" />}
            {c.label}
          </button>
        );
      })}
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
      className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
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

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'mt-0.5 relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-accent-green-110' : 'bg-white-15',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
            'translate-y-0.5',
          )}
        />
      </button>
      <div className="min-w-0">
        <p className="text-sm text-white-80">{label}</p>
        {description && <p className="text-xs text-white-40 mt-0.5">{description}</p>}
      </div>
    </label>
  );
}
