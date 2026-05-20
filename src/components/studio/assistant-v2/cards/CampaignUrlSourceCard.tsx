'use client';

// URL-02 — URL-source card for the Create assistant.
//
// Lifecycle:
//   1. INPUT — user pastes a URL (or the URL came in via the
//      sourceUrl prefill). Analyze button fires
//      useCampaignUrlAnalyze, result is cached on the session as
//      campaignUrlAnalyzeResult.
//   2. ANALYZING — loader while the analyze request is in flight.
//   3. REVIEW (single_listing) — one preview with Save & continue.
//   4. CHOOSE (listing_index) — picker grid with Save & continue.
//   5. CONFIRM — useCampaignUrlConfirm persists the chosen
//      listing as a WorkspaceDataItem, then dispatches
//      SET_PROPERTY so the standard property campaign flow takes
//      over. campaignSourceType flips to 'property' as a
//      side-effect of SET_PROPERTY.
//
// Honest framing: we tell the user what was extracted, the
// extraction confidence, and surface validation issues — they're
// always one step away from editing the property after save.

import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Globe, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import {
  useCampaignUrlAnalyze,
  useCampaignUrlConfirm,
  type CampaignUrlConfirmResponse,
} from '@/hooks/useSquadpitch';
import type {
  AssistantAction,
  AssistantSessionState,
  CampaignUrlAnalyzeResult,
  CampaignUrlListingPreview,
} from '@/lib/assistant/types';
import { ApiError } from '@/lib/apiFetch';
import { cn } from '@/lib/utils';

interface Props {
  session: AssistantSessionState;
  clientId: string;
  onSelection: (
    action: AssistantAction | AssistantAction[],
    confirmationText: string,
  ) => void;
}

export function CampaignUrlSourceCard({ session, clientId, onSelection }: Props) {
  const [urlInput, setUrlInput] = useState(session.campaignSourceUrl ?? '');
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);

  const analyze = useCampaignUrlAnalyze(clientId);
  const confirm = useCampaignUrlConfirm(clientId);

  const analyzeResult = session.campaignUrlAnalyzeResult ?? null;

  // Auto-analyze when the URL came in via prefill and no result
  // has been cached yet (e.g. dashboard quick-input flow).
  useEffect(() => {
    if (
      session.campaignSourceUrl &&
      !analyzeResult &&
      !analyze.isPending &&
      !analyze.isError
    ) {
      runAnalyze(session.campaignSourceUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.campaignSourceUrl]);

  // Pre-select the only listing when we have exactly one preview.
  useEffect(() => {
    if (analyzeResult && analyzeResult.listings.length === 1 && !selectedPreviewId) {
      setSelectedPreviewId(analyzeResult.listings[0].previewId);
    }
  }, [analyzeResult, selectedPreviewId]);

  const runAnalyze = async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    try {
      const result = await analyze.mutateAsync({ url: trimmed });
      // Persist URL + result on the session so the resolver
      // knows the card is mid-flow and the next render shows
      // the review/choose state without re-running analyze.
      onSelection(
        [
          { type: 'SET_CAMPAIGN_SOURCE_URL', payload: trimmed },
          { type: 'SET_CAMPAIGN_URL_ANALYZE_RESULT', payload: result },
        ],
        `Analyzing ${trimmed}`,
      );
    } catch {
      // Falls through to the error block in the JSX below.
    }
  };

  const handleConfirm = async () => {
    const result = analyzeResult;
    if (!result) return;
    const selected =
      result.listings.find((l) => l.previewId === selectedPreviewId) ??
      (result.listings.length === 1 ? result.listings[0] : null);
    if (!selected) return;
    try {
      const saved: CampaignUrlConfirmResponse = await confirm.mutateAsync({
        url: selected.sourceUrl,
        selectedListing: {
          ...selected.normalized,
          sourceUrl: selected.sourceUrl,
        },
      });
      const propertyData = saved.propertyData?.dataJson ?? selected.normalized ?? {};
      // Dispatch SET_PROPERTY so the rest of the campaign flow
      // uses the existing property branch unchanged. Backfill
      // campaignSourceType to 'property' so the source pill
      // shows "Property" instead of "URL" once we move on.
      onSelection(
        [
          { type: 'SET_PROPERTY', payload: { id: saved.dataItemId, data: propertyData } },
          { type: 'SET_CAMPAIGN_SOURCE_TYPE', payload: 'property' },
        ],
        `Saved listing: ${describeListing(selected) ?? saved.dataItemId}`,
      );
    } catch {
      // Falls through to the error block.
    }
  };

  // ── INPUT (no URL on session yet) ────────────────────────────
  if (!session.campaignSourceUrl) {
    return (
      <div className="space-y-2.5">
        <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-400/5 border border-blue-400/20">
          <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-white-60">
            Paste a single listing URL <em>or</em> a page of listings
            (your MLS, Zillow / Redfin / Realtor.com, your own site).
            Squadpitch extracts the property data — review before saving.
          </p>
        </div>
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://www.zillow.com/homedetails/…"
          className="w-full px-2.5 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => runAnalyze(urlInput)}
            disabled={!urlInput.trim() || analyze.isPending}
            className="py-1.5 px-4 rounded-lg bg-accent-green-110 text-sp-surface font-semibold text-xs flex items-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyze.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            {analyze.isPending ? 'Analyzing…' : 'Analyze URL'}
          </button>
        </div>
        {analyze.error && <ErrorBanner err={analyze.error} />}
      </div>
    );
  }

  // ── ANALYZING ────────────────────────────────────────────────
  if (analyze.isPending) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-white-5 border border-white-10 text-xs text-white-70">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-green-110" />
        Analyzing <code className="text-white-90">{session.campaignSourceUrl}</code>…
      </div>
    );
  }

  if (analyze.error) {
    return (
      <div className="space-y-2.5">
        <ErrorBanner err={analyze.error} />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => runAnalyze(session.campaignSourceUrl!)}
            className="py-1.5 px-3 rounded-lg border border-white-15 text-white-80 text-xs hover:bg-white-10 inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analyzeResult) {
    return null; // brief gap between analyze settling and re-render
  }

  // ── REVIEW / CHOOSE / UNKNOWN ────────────────────────────────
  const { detectedType, listings, suggestedNextStep } = analyzeResult;

  if (listings.length === 0) {
    return (
      <div className="space-y-2.5">
        <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-400/5 border border-amber-400/30 text-[11px] text-amber-200">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>
              No listing-style data could be extracted from{' '}
              <code className="text-amber-100">{analyzeResult.url}</code> ({detectedType}).
            </p>
            {suggestedNextStep === 'use_as_idea' && (
              <p>
                You can still use this page as a freeform idea source instead.
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              // Reset back to the input view so the user can try a
              // different URL.
              onSelection(
                [
                  { type: 'SET_CAMPAIGN_SOURCE_URL', payload: null },
                  { type: 'SET_CAMPAIGN_URL_ANALYZE_RESULT', payload: null },
                ],
                'Try a different URL',
              );
            }}
            className="text-[11px] text-white-50 hover:text-white-100"
          >
            ← Try another URL
          </button>
          {suggestedNextStep === 'use_as_idea' && (
            <button
              type="button"
              onClick={() =>
                onSelection(
                  [
                    { type: 'SET_CAMPAIGN_SOURCE_TYPE', payload: 'idea' },
                    { type: 'SET_CAMPAIGN_IDEA', payload: analyzeResult.url },
                  ],
                  'Use the URL as an idea',
                )
              }
              className="py-1.5 px-3 rounded-lg border border-white-15 text-white-80 text-xs hover:bg-white-10"
            >
              Use as idea
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-400/5 border border-blue-400/20">
        <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1 text-[11px] text-white-60">
          <p>
            {detectedType === 'listing_index'
              ? `Found ${listings.length} listings on this page. Pick one to use for this campaign.`
              : 'Listing extracted from the page. Review the details before saving.'}
          </p>
          <p className="text-white-40 mt-0.5 truncate">
            <code>{analyzeResult.url}</code>
          </p>
        </div>
      </div>

      <ul className="space-y-1.5">
        {listings.map((l) => (
          <ListingPreviewTile
            key={l.previewId}
            preview={l}
            selected={l.previewId === selectedPreviewId}
            onSelect={() => setSelectedPreviewId(l.previewId)}
          />
        ))}
      </ul>

      {confirm.error && <ErrorBanner err={confirm.error} />}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            onSelection(
              [
                { type: 'SET_CAMPAIGN_SOURCE_URL', payload: null },
                { type: 'SET_CAMPAIGN_URL_ANALYZE_RESULT', payload: null },
              ],
              'Try a different URL',
            );
          }}
          className="text-[11px] text-white-50 hover:text-white-100"
        >
          ← Try another URL
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selectedPreviewId || confirm.isPending}
          className="py-1.5 px-4 rounded-lg bg-accent-green-110 text-sp-surface font-semibold text-xs flex items-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {confirm.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <ArrowRight className="w-3 h-3" />
          )}
          {confirm.isPending ? 'Saving…' : 'Save & continue'}
        </button>
      </div>
    </div>
  );
}

function ListingPreviewTile({
  preview,
  selected,
  onSelect,
}: {
  preview: CampaignUrlListingPreview;
  selected: boolean;
  onSelect: () => void;
}) {
  const n = preview.normalized as Record<string, unknown>;
  const title =
    (n.title as string | undefined) ??
    (n.address as { street?: string } | undefined)?.street ??
    'Untitled listing';
  const price = n.price != null ? `$${Number(n.price).toLocaleString()}` : null;
  const addr = n.address as
    | { street?: string; city?: string; state?: string }
    | undefined;
  const addressLine = addr?.street
    ? `${addr.street}${addr.city ? `, ${addr.city}` : ''}${addr.state ? `, ${addr.state}` : ''}`
    : null;
  const beds = n.beds != null ? `${n.beds} bd` : null;
  const baths = n.baths != null ? `${n.baths} ba` : null;
  const sqft = n.sqft != null ? `${Number(n.sqft).toLocaleString()} sqft` : null;
  const stats = [beds, baths, sqft].filter(Boolean).join(' · ');

  const quality = preview.quality;
  const validationIssues = preview.validation?.issues ?? [];

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'w-full text-left p-2.5 rounded-lg border transition-colors',
          selected
            ? 'border-accent-green-110/40 bg-accent-green-110/5'
            : 'border-white-10 hover:border-white-20 hover:bg-white-5',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white-100 truncate">{title}</p>
            {addressLine && (
              <p className="text-[11px] text-white-50 truncate">{addressLine}</p>
            )}
            <p className="text-[11px] text-white-60 mt-0.5">
              {[price, stats].filter(Boolean).join(' · ')}
            </p>
          </div>
          {quality?.grade && (
            <span
              className={cn(
                'text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0',
                quality.grade === 'good'
                  ? 'bg-accent-green-110/15 text-accent-green-110'
                  : 'bg-white-10 text-white-60',
              )}
            >
              {quality.grade}
            </span>
          )}
        </div>
        {validationIssues.length > 0 && (
          <p className="text-[10px] text-amber-200 mt-1 leading-snug">
            <AlertCircle className="w-2.5 h-2.5 inline-block mr-1 align-text-bottom" />
            {validationIssues.slice(0, 2).join(' · ')}
          </p>
        )}
      </button>
    </li>
  );
}

function ErrorBanner({ err }: { err: unknown }) {
  const msg =
    err instanceof ApiError
      ? err.code === 'UNSAFE_URL'
        ? 'That URL is not allowed — Squadpitch blocks localhost, private IPs, and non-http(s) URLs for safety.'
        : err.message
      : err instanceof Error
        ? err.message
        : 'Something went wrong.';
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-400/5 border border-amber-400/30 text-[11px] text-amber-200">
      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>{msg}</span>
    </div>
  );
}

function describeListing(preview: CampaignUrlListingPreview): string | null {
  const n = preview.normalized as { title?: unknown; address?: { street?: unknown } };
  if (typeof n.title === 'string' && n.title.trim()) return n.title;
  if (typeof n.address?.street === 'string' && n.address.street.trim()) return n.address.street;
  return null;
}
