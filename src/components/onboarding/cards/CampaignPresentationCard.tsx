'use client';

import { cn } from '@/lib/utils';
import type { OnboardingSessionState } from '@/lib/onboarding/types';
import type { useOnboardingEngine } from '@/hooks/useOnboardingEngine';
import type { Draft } from '@/hooks/useSquadpitch';
import { OnboardingPostCard } from './OnboardingPostCard';
import {
  CheckCircle2,
  AlertCircle,
  ImageIcon,
  Globe,
  Building2,
  Home,
  Link2,
  Sparkles,
  ArrowRight,
  Save,
} from 'lucide-react';

type Engine = ReturnType<typeof useOnboardingEngine>;

// ── Channel helpers ─────────────────────────────────────────────────

const CHANNEL_META: Record<string, { label: string; icon: string; color: string }> = {
  INSTAGRAM:  { label: 'Instagram',  icon: '📸', color: 'bg-pink-500/15 text-pink-300' },
  FACEBOOK:   { label: 'Facebook',   icon: '📘', color: 'bg-blue-600/15 text-blue-300' },
  LINKEDIN:   { label: 'LinkedIn',   icon: '💼', color: 'bg-blue-500/15 text-blue-300' },
  X:          { label: 'X',          icon: '𝕏',  color: 'bg-white-15 text-white-70' },
  TIKTOK:     { label: 'TikTok',     icon: '🎵', color: 'bg-cyan-500/15 text-cyan-300' },
  YOUTUBE:    { label: 'YouTube',    icon: '▶️', color: 'bg-red-500/15 text-red-300' },
  PINTEREST:  { label: 'Pinterest',  icon: '📌', color: 'bg-red-400/15 text-red-300' },
  THREADS:    { label: 'Threads',    icon: '@',  color: 'bg-white-15 text-white-70' },
};

const TEMPLATE_LABELS: Record<string, string> = {
  listing_post: 'Listing',
  neighborhood_highlight: 'Lifestyle',
  buyer_tip: 'Buyer Tip',
  brand_authority: 'Expertise',
  market_insight: 'Market Insight',
  educational_tip: 'Tip',
  business_intro: 'Brand Intro',
  offer_highlight: 'Offer',
  authority_education: 'Education',
  myth_busting: 'Myth Buster',
};

// ── Props ───────────────────────────────────────────────────────────

interface Props {
  engine: Engine;
}

export function CampaignPresentationCard({ engine }: Props) {
  const { session } = engine;
  const drafts = session.previewDrafts;
  const analyzeResult = session.analyzeResult;
  const brandData = analyzeResult?.brandData;
  const clientId = session.createdClientId ?? '';
  const isRE = session.industryKey === 'real_estate';

  const brandName = brandData?.name ?? 'Your Business';
  const rawLogo = brandData?.logoUrl;
  const logoUrl = rawLogo && /^https?:\/\//i.test(rawLogo) ? rawLogo : undefined;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const defaultScheduleTime = {
    iso: tomorrow.toISOString(),
    label: 'Tomorrow at 9:00 AM',
  };

  // Determine channel status for each draft
  const connectedSet = new Set(session.connectedChannelsSnapshot);
  const suggestedChannels = analyzeResult?.suggestedChannels ?? [];
  const allChannels = Array.from(new Set([
    ...session.connectedChannelsSnapshot,
    ...suggestedChannels,
    ...drafts.map((d) => d.channel),
  ]));

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5 px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent-green-110" />
          <h2 className="text-lg font-semibold text-white-90">Your campaign is ready</h2>
        </div>
        <p className="text-sm text-white-50">
          Here&apos;s what Squadpitch created based on your data. Review and take action.
        </p>
      </div>

      {/* ── Data Summary ──────────────────────────────────────── */}
      <DataSummary session={session} isRE={isRE} />

      {/* ── Channel Readiness ─────────────────────────────────── */}
      <ChannelReadiness
        allChannels={allChannels}
        connectedSet={connectedSet}
        drafts={drafts}
        skipped={session.channelConnectSkipped}
      />

      {/* ── Generated Posts ───────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-white-60 px-1">
          {drafts.length} post{drafts.length !== 1 ? 's' : ''} generated
        </h3>

        {drafts.map((draft, idx) => {
          const isChannelConnected = connectedSet.size > 0
            ? connectedSet.has(draft.channel as never)
            : session.channelConnectSkipped ? false : undefined;

          const templateType = draft.generationGuidance
            ? guessTemplateType(draft)
            : undefined;

          return (
            <div key={draft.id} className="relative">
              {templateType && (
                <div className="absolute -top-2.5 left-3 z-10">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white-10 text-white-50 border border-white-10">
                    {templateType}
                  </span>
                </div>
              )}
              <OnboardingPostCard
                draft={draft}
                clientId={clientId}
                brandName={brandName}
                logoUrl={logoUrl}
                defaultScheduleTime={defaultScheduleTime}
                onRegenerated={(newDraft: Draft) => {
                  engine.replacePreviewDraft?.(draft.id, newDraft);
                }}
                isFirstPost={idx === 0}
                industryKey={session.industryKey ?? undefined}
                postIndex={idx}
                channelConnected={isChannelConnected}
                onConnectChannel={engine.connectChannelsFromCampaign}
              />
            </div>
          );
        })}
      </div>

      {/* ── Channel connect nudge ─────────────────────────────── */}
      {connectedSet.size === 0 && (
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-yellow-500/8 border border-yellow-500/15">
          <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-sm text-yellow-200/80">No channels connected</span>
            <span className="text-xs text-white-40">
              Connect your accounts and Squadpitch can publish these posts automatically.
              Without channels, posts are saved as drafts only.
            </span>
          </div>
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 pt-2">
        <button
          onClick={engine.approveCampaign}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent-green-110 text-black font-semibold text-sm hover:bg-accent-green-110/90 transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" />
          Approve campaign
        </button>

        <div className="flex gap-2">
          {connectedSet.size === 0 && !session.channelConnectSkipped && (
            <button
              onClick={engine.connectChannelsFromCampaign}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-white-10 text-white-60 text-sm hover:bg-white-5 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              Connect channels
            </button>
          )}
          <button
            onClick={engine.saveCampaignAsDrafts}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-white-10 text-white-60 text-sm hover:bg-white-5 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Save as drafts
          </button>
        </div>

        <button
          onClick={engine.finish}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-white-40 text-xs hover:text-white-60 transition-colors"
        >
          Go to workspace
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── Data Summary sub-component ──────────────────────────────────────

function DataSummary({ session, isRE }: { session: OnboardingSessionState; isRE: boolean }) {
  const analyzeResult = session.analyzeResult;
  const brandData = analyzeResult?.brandData;
  const dataItems = analyzeResult?.dataItems ?? [];

  // Find listing data for RE
  const listing = isRE ? dataItems.find((d) => {
    const t = ((d.dataJson?.type as string) ?? '').toLowerCase();
    return t.includes('listing') || t.includes('property');
  }) : null;

  const listingData = listing?.dataJson as Record<string, unknown> | undefined;
  const heroImage = (listingData?.imageUrl as string) ?? undefined;

  return (
    <div className="rounded-xl border border-white-10 overflow-hidden">
      <div className="px-3 py-2 border-b border-white-10 bg-white-5/50">
        <span className="text-[11px] font-medium text-white-40 uppercase tracking-wider">
          Based on your data
        </span>
      </div>

      <div className="px-3 py-3">
        {isRE && listingData ? (
          <div className="flex gap-3">
            {heroImage && (
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-white-10 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroImage} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-white-40 flex-shrink-0" />
                <span className="text-sm font-medium text-white-80 truncate">
                  {(listingData.address as string) ?? (listing?.title ?? 'Property')}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white-50">
                {!!listingData.price && (
                  <span>${Number(listingData.price).toLocaleString()}</span>
                )}
                {!!listingData.beds && <span>{String(listingData.beds)} bed</span>}
                {!!listingData.baths && <span>{String(listingData.baths)} bath</span>}
                {!!listingData.sqft && <span>{Number(listingData.sqft).toLocaleString()} sqft</span>}
                {!!listingData.propertyType && (
                  <span className="text-white-40">{String(listingData.propertyType)}</span>
                )}
              </div>
              {!!(listingData.city || listingData.state) && (
                <span className="text-xs text-white-40">
                  {[listingData.city as string, listingData.state as string].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-white-40 flex-shrink-0" />
              <span className="text-sm font-medium text-white-80">
                {brandData?.name ?? 'Your Business'}
              </span>
            </div>
            {brandData?.description && (
              <p className="text-xs text-white-50 line-clamp-2">{brandData.description}</p>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white-40">
              {brandData?.industry && <span>{brandData.industry}</span>}
              {session.primaryInput && /^https?:\/\//i.test(session.primaryInput) && (
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {new URL(session.primaryInput).hostname}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Channel Readiness sub-component ─────────────────────────────────

function ChannelReadiness({
  allChannels,
  connectedSet,
  drafts,
  skipped,
}: {
  allChannels: string[];
  connectedSet: Set<string>;
  drafts: Draft[];
  skipped: boolean;
}) {
  if (allChannels.length === 0) return null;

  const MEDIA_CHANNELS = new Set(['INSTAGRAM', 'TIKTOK']);
  const draftChannels = new Set(drafts.map((d) => d.channel));

  return (
    <div className="rounded-xl border border-white-10 overflow-hidden">
      <div className="px-3 py-2 border-b border-white-10 bg-white-5/50">
        <span className="text-[11px] font-medium text-white-40 uppercase tracking-wider">
          Channel readiness
        </span>
      </div>

      <div className="px-3 py-2.5 flex flex-col gap-1.5">
        {allChannels.map((ch) => {
          const meta = CHANNEL_META[ch] ?? { label: ch, icon: '', color: 'bg-white-10 text-white-60' };
          const isConnected = connectedSet.has(ch);
          const isUsed = draftChannels.has(ch as never);
          const needsMedia = MEDIA_CHANNELS.has(ch);

          let status: { label: string; color: string };
          if (isConnected && !needsMedia) {
            status = { label: 'Ready', color: 'text-zone-green' };
          } else if (isConnected && needsMedia) {
            const hasMedia = drafts.some((d) => d.channel === ch && d.mediaUrl);
            status = hasMedia
              ? { label: 'Ready', color: 'text-zone-green' }
              : { label: 'Needs media', color: 'text-yellow-400' };
          } else if (skipped || connectedSet.size > 0) {
            status = { label: 'Not connected', color: 'text-white-30' };
          } else {
            status = { label: 'Draft only', color: 'text-white-30' };
          }

          return (
            <div
              key={ch}
              className={cn(
                'flex items-center justify-between py-1',
                !isUsed && 'opacity-40',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{meta.icon}</span>
                <span className="text-sm text-white-70">{meta.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {status.label === 'Ready' ? (
                  <CheckCircle2 className={cn('w-3.5 h-3.5', status.color)} />
                ) : status.label === 'Needs media' ? (
                  <ImageIcon className={cn('w-3.5 h-3.5', status.color)} />
                ) : (
                  <AlertCircle className={cn('w-3.5 h-3.5', status.color)} />
                )}
                <span className={cn('text-xs', status.color)}>{status.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2 border-t border-white-10">
        <p className="text-[11px] text-white-30">
          Posts will only be published to connected and compatible channels.
        </p>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function guessTemplateType(draft: Draft): string | undefined {
  // Try to infer from the guidance stored on the draft
  const guidance = (draft.generationGuidance ?? '').toLowerCase();
  for (const [key, label] of Object.entries(TEMPLATE_LABELS)) {
    if (guidance.includes(key.replace(/_/g, ' ')) || guidance.includes(key)) {
      return label;
    }
  }
  // Fallback heuristics
  if (guidance.includes('just listed') || guidance.includes('listing spotlight')) return 'Listing';
  if (guidance.includes('neighborhood') || guidance.includes('lifestyle')) return 'Lifestyle';
  if (guidance.includes('buyer') || guidance.includes('tip')) return 'Tip';
  if (guidance.includes('expertise') || guidance.includes('authority')) return 'Expertise';
  if (guidance.includes('brand intro') || guidance.includes('introduce')) return 'Brand';
  if (guidance.includes('offer') || guidance.includes('service')) return 'Offer';
  return undefined;
}
