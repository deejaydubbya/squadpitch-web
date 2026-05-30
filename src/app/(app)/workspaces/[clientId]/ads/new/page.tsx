'use client';

// SquadAds wizard. Three steps, single page (no router state) so the
// flow is fast and the user can scroll back to revise:
//   1. Pick a source.
//   2. Choose objective + name.
//   3. Pick a destination + generate.
// Submitting creates the AdPackage row and triggers a generate call
// before navigating to the detail editor.

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Megaphone,
  Target,
  Globe,
  FileText,
  Home,
  Folder,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  useAdPackages,
  useCreateAdPackage,
  useGenerateAdPackage,
  type AdObjective,
  type AdSourceType,
  type AdDestinationKind,
} from '@/hooks/useAds';
import { useCampaigns, useDataItems, useDrafts } from '@/hooks/useSquadpitch';
import { usePages } from '@/hooks/useSites';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/apiFetch';

const SOURCE_OPTIONS: {
  value: AdSourceType;
  label: string;
  helper: string;
  Icon: React.ElementType;
}[] = [
  { value: 'CAMPAIGN', label: 'Campaign', helper: 'Promote an existing content campaign.', Icon: Megaphone },
  { value: 'SITE_PAGE', label: 'SquadSite page', helper: 'Drive traffic to a landing page.', Icon: Globe },
  { value: 'DRAFT', label: 'Post', helper: 'Boost a top-performing post.', Icon: FileText },
  { value: 'PROPERTY', label: 'Property', helper: 'Listing-aware ad with Fair Housing compliance.', Icon: Home },
  { value: 'CONTENT_ASSET', label: 'Content asset', helper: 'Anything in your data library.', Icon: Folder },
  { value: 'IDEA', label: 'Idea', helper: 'Free-form brief.', Icon: Sparkles },
];

const OBJECTIVE_OPTIONS: {
  value: AdObjective;
  label: string;
  helper: string;
}[] = [
  { value: 'AWARENESS', label: 'Awareness', helper: 'Get in front of new audiences.' },
  { value: 'TRAFFIC', label: 'Traffic', helper: 'Drive clicks to a destination URL.' },
  { value: 'LEADS', label: 'Leads', helper: 'Capture form submissions.' },
  { value: 'ENGAGEMENT', label: 'Engagement', helper: 'Likes, comments, profile follows.' },
  { value: 'EVENT', label: 'Event', helper: 'RSVPs and event awareness.' },
];

export default function AdsNewWizardPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const router = useRouter();
  // We poll the list query once on submit success so the index page
  // is fresh by the time the user navigates back. Not strictly
  // needed (mutation invalidates list) but cheap.
  useAdPackages(clientId, { limit: 1 });
  const createMutation = useCreateAdPackage(clientId);

  const [sourceType, setSourceType] = useState<AdSourceType | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [sourceIdea, setSourceIdea] = useState('');
  const [objective, setObjective] = useState<AdObjective | null>(null);
  const [name, setName] = useState('');
  const [destinationKind, setDestinationKind] = useState<AdDestinationKind>('SITE_PAGE');
  const [destinationSitePageId, setDestinationSitePageId] = useState<string | null>(null);
  const [destinationExternalUrl, setDestinationExternalUrl] = useState('');
  const [destinationSocial, setDestinationSocial] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canContinueStep1 =
    sourceType !== null &&
    (sourceType === 'IDEA' ? sourceIdea.trim().length > 0 : Boolean(sourceId));
  const canContinueStep2 = canContinueStep1 && objective !== null && name.trim().length > 0;
  const canSubmit =
    canContinueStep2 &&
    (destinationKind === 'SITE_PAGE'
      ? Boolean(destinationSitePageId)
      : destinationKind === 'EXTERNAL_URL'
        ? destinationExternalUrl.trim().startsWith('http')
        : Boolean(destinationSocial.trim()));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createMutation.mutateAsync({
        name: name.trim(),
        objective: objective!,
        sourceType: sourceType!,
        sourceId: sourceType === 'IDEA' ? null : sourceId,
        sourceIdea: sourceType === 'IDEA' ? sourceIdea.trim() : null,
        destination: {
          kind: destinationKind,
          sitePageId: destinationKind === 'SITE_PAGE' ? destinationSitePageId : null,
          externalUrl:
            destinationKind === 'EXTERNAL_URL' ? destinationExternalUrl.trim() : null,
          socialProfile:
            destinationKind === 'SOCIAL_PROFILE' ? destinationSocial.trim() : null,
        },
      });
      const newId = created.package.id;
      // Fire generation in the background then navigate. Detail page
      // re-fetches by id and shows a "Generating…" state if it's
      // not done yet.
      const generate = useGenerateAdPackage; // satisfy TS — unused
      // We can't call a hook here; instead the detail page kicks off
      // generation on its own when the package has no creatives yet.
      void generate;
      router.push(`/workspaces/${clientId}/ads/${newId}?autogenerate=1`);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : 'Failed to create ad package',
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <header>
        <Link
          href={`/workspaces/${clientId}/ads`}
          className="inline-flex items-center gap-1.5 text-xs text-white-50 hover:text-white-100 mb-2"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to ad packages
        </Link>
        <h1 className="text-base font-bold text-white-100">New ad package</h1>
        <p className="text-xs text-white-50 mt-0.5 leading-snug max-w-prose">
          Three quick steps. Squadpitch will generate copy variants, an
          audience, and a budget suggestion you can refine and export.
        </p>
      </header>

      <StepCard
        n={1}
        title="Pick a source"
        helper="Where should the ad pull its angle and facts from?"
        done={canContinueStep1}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SOURCE_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => {
                setSourceType(s.value);
                setSourceId(null);
                setSourceIdea('');
              }}
              className={cn(
                'text-left p-3 rounded-lg border transition-colors flex items-start gap-3',
                sourceType === s.value
                  ? 'border-accent-green-110/40 bg-accent-green-110/5'
                  : 'border-white-10 hover:border-white-20 hover:bg-white-5',
              )}
            >
              <s.Icon
                className={cn(
                  'w-4 h-4 mt-0.5 shrink-0',
                  sourceType === s.value ? 'text-accent-green-110' : 'text-white-50',
                )}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white-90">{s.label}</p>
                <p className="text-[11px] text-white-50 mt-0.5 leading-snug">
                  {s.helper}
                </p>
              </div>
            </button>
          ))}
        </div>

        {sourceType && sourceType !== 'IDEA' && (
          <div className="pt-3 border-t border-white-10 mt-3">
            <SourcePicker
              clientId={clientId}
              sourceType={sourceType}
              selectedId={sourceId}
              onSelect={setSourceId}
            />
          </div>
        )}

        {sourceType === 'IDEA' && (
          <div className="pt-3 border-t border-white-10 mt-3">
            <label className="text-xs font-medium text-white-70">
              Brief
              <textarea
                value={sourceIdea}
                onChange={(e) => setSourceIdea(e.target.value)}
                placeholder="What should this ad promote? (1-3 sentences)"
                rows={3}
                className="mt-1.5 w-full bg-white-5 border border-white-10 rounded-lg px-3 py-2 text-sm text-white-90 placeholder:text-white-40 focus:outline-none focus:border-white-30 resize-none"
              />
            </label>
          </div>
        )}
      </StepCard>

      <StepCard
        n={2}
        title="Choose an objective + name"
        helper="The objective shapes the copy length and CTA. The name is just for your library."
        done={canContinueStep2}
        disabled={!canContinueStep1}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {OBJECTIVE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                setObjective(o.value);
                if (!name && sourceType) {
                  setName(`${o.label} — ${friendlyName(sourceType)}`);
                }
              }}
              className={cn(
                'text-left p-3 rounded-lg border transition-colors',
                objective === o.value
                  ? 'border-accent-green-110/40 bg-accent-green-110/5'
                  : 'border-white-10 hover:border-white-20 hover:bg-white-5',
              )}
            >
              <p className="text-sm font-semibold text-white-90">{o.label}</p>
              <p className="text-[11px] text-white-50 mt-0.5">{o.helper}</p>
            </button>
          ))}
        </div>

        <label className="block text-xs font-medium text-white-70 pt-3 border-t border-white-10 mt-3">
          Package name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Spring open house — Leads"
            maxLength={200}
            className="mt-1.5 w-full bg-white-5 border border-white-10 rounded-lg px-3 py-2 text-sm text-white-90 placeholder:text-white-40 focus:outline-none focus:border-white-30"
          />
        </label>
      </StepCard>

      <StepCard
        n={3}
        title="Pick a destination"
        helper="Where should the ad click go? A SquadSite page lands form submissions in your Inbox automatically."
        done={canSubmit}
        disabled={!canContinueStep2}
      >
        <div className="flex flex-wrap gap-2">
          {(['SITE_PAGE', 'EXTERNAL_URL', 'SOCIAL_PROFILE'] as AdDestinationKind[]).map(
            (k) => (
              <button
                key={k}
                type="button"
                onClick={() => setDestinationKind(k)}
                className={cn(
                  'text-xs font-medium px-3 py-1.5 rounded-md border transition-colors',
                  destinationKind === k
                    ? 'bg-accent-green-110/15 text-accent-green-110 border-accent-green-110/30'
                    : 'border-white-10 text-white-60 hover:border-white-20',
                )}
              >
                {k === 'SITE_PAGE'
                  ? 'SquadSite page'
                  : k === 'EXTERNAL_URL'
                    ? 'External URL'
                    : 'Social profile'}
              </button>
            ),
          )}
        </div>

        {destinationKind === 'SITE_PAGE' && (
          <div className="mt-3">
            <SourcePicker
              clientId={clientId}
              sourceType="SITE_PAGE"
              selectedId={destinationSitePageId}
              onSelect={setDestinationSitePageId}
              context="destination"
            />
          </div>
        )}
        {destinationKind === 'EXTERNAL_URL' && (
          <input
            type="url"
            value={destinationExternalUrl}
            onChange={(e) => setDestinationExternalUrl(e.target.value)}
            placeholder="https://example.com/landing"
            className="mt-3 w-full bg-white-5 border border-white-10 rounded-lg px-3 py-2 text-sm text-white-90 placeholder:text-white-40 focus:outline-none focus:border-white-30"
          />
        )}
        {destinationKind === 'SOCIAL_PROFILE' && (
          <input
            type="text"
            value={destinationSocial}
            onChange={(e) => setDestinationSocial(e.target.value)}
            placeholder="e.g. instagram:smithrealty"
            className="mt-3 w-full bg-white-5 border border-white-10 rounded-lg px-3 py-2 text-sm text-white-90 placeholder:text-white-40 focus:outline-none focus:border-white-30"
          />
        )}
      </StepCard>

      {submitError && (
        <div className="card p-3 text-xs text-amber-300 bg-amber-400/5 border-amber-400/30">
          {submitError}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <p className="text-[11px] text-white-40 leading-snug max-w-md">
          Squadpitch does not launch ads. Once generated, you&apos;ll review,
          then export a structured ad package — copy, targeting, budget,
          destination URL, and setup notes — to copy into Ads Manager,
          Google Ads, TikTok Ads, or hand to a paid-media specialist.
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className={cn(
            'text-xs font-semibold px-4 py-2 rounded-lg inline-flex items-center gap-1.5 transition-colors',
            'bg-accent-green-110 text-sp-bg hover:bg-accent-green-100',
            (!canSubmit || submitting) && 'opacity-50 cursor-not-allowed',
          )}
        >
          {submitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {submitting ? 'Creating…' : 'Generate ad package'}
          {!submitting && <ArrowRight className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────────

function StepCard({
  n,
  title,
  helper,
  children,
  done,
  disabled,
}: {
  n: number;
  title: string;
  helper: string;
  children: React.ReactNode;
  done: boolean;
  disabled?: boolean;
}) {
  return (
    <section
      className={cn(
        'card p-5 space-y-3',
        disabled && 'opacity-50 pointer-events-none',
      )}
    >
      <header className="flex items-start gap-3">
        <div
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
            done
              ? 'bg-accent-green-110/15 text-accent-green-110'
              : 'bg-white-10 text-white-50',
          )}
        >
          {n}
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white-100">{title}</h2>
          <p className="text-[11px] text-white-50 mt-0.5 leading-snug">{helper}</p>
        </div>
      </header>
      <div>{children}</div>
    </section>
  );
}

function SourcePicker({
  clientId,
  sourceType,
  selectedId,
  onSelect,
  context = 'source',
}: {
  clientId: string;
  sourceType: AdSourceType;
  selectedId: string | null;
  onSelect: (id: string) => void;
  context?: 'source' | 'destination';
}) {
  const campaigns = useCampaigns(sourceType === 'CAMPAIGN' ? clientId : undefined);
  const pages = usePages(sourceType === 'SITE_PAGE' ? clientId : undefined);
  const drafts = useDrafts({
    clientId: sourceType === 'DRAFT' ? clientId : undefined,
    limit: 50,
  });
  const dataItems = useDataItems(
    sourceType === 'PROPERTY' || sourceType === 'CONTENT_ASSET' ? clientId : '',
    sourceType === 'PROPERTY' ? { type: 'PROPERTY' } : {},
  );

  let rows: { id: string; label: string; sub?: string }[] = [];
  let loading = false;
  let label = '';

  if (sourceType === 'CAMPAIGN') {
    loading = campaigns.isLoading;
    rows = (campaigns.data ?? []).map((c) => ({
      id: c.id,
      label: c.name,
      sub: c.campaignType,
    }));
    label = 'Pick a campaign';
  } else if (sourceType === 'SITE_PAGE') {
    loading = pages.isLoading;
    rows = (pages.data ?? []).map((p) => ({
      id: p.id,
      label: p.title,
      sub: `/${p.slug}`,
    }));
    label = context === 'destination' ? 'Pick a SquadSite landing page' : 'Pick a page';
  } else if (sourceType === 'DRAFT') {
    loading = drafts.isLoading;
    rows = (drafts.data ?? []).slice(0, 50).map((d) => ({
      id: d.id,
      label: d.body?.slice(0, 80) || `${d.channel} draft`,
      sub: d.channel,
    }));
    label = 'Pick a post';
  } else if (sourceType === 'PROPERTY' || sourceType === 'CONTENT_ASSET') {
    loading = dataItems.isLoading;
    rows = (dataItems.data ?? []).map((d) => ({
      id: d.id,
      label: d.title,
      sub: d.type,
    }));
    label = sourceType === 'PROPERTY' ? 'Pick a property' : 'Pick a content asset';
  }

  return (
    <div>
      <p className="text-xs font-medium text-white-70 mb-2">{label}</p>
      {loading && <p className="text-xs text-white-50">Loading…</p>}
      {!loading && rows.length === 0 && (
        <p className="text-xs text-white-50">Nothing available.</p>
      )}
      {!loading && rows.length > 0 && (
        <ul className="max-h-64 overflow-y-auto space-y-1 border border-white-10 rounded-lg p-1">
          {rows.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onSelect(r.id)}
                className={cn(
                  'w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors',
                  selectedId === r.id
                    ? 'bg-accent-green-110/15 text-accent-green-110'
                    : 'text-white-80 hover:bg-white-10',
                )}
              >
                <div className="font-medium truncate">{r.label}</div>
                {r.sub && <div className="text-[10px] text-white-40 truncate">{r.sub}</div>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function friendlyName(t: AdSourceType): string {
  switch (t) {
    case 'CAMPAIGN':
      return 'campaign';
    case 'SITE_PAGE':
      return 'page';
    case 'DRAFT':
      return 'post';
    case 'PROPERTY':
      return 'property';
    case 'CONTENT_ASSET':
      return 'asset';
    case 'IDEA':
      return 'idea';
    default:
      return 'source';
  }
}
