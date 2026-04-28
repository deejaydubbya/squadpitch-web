'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { OnboardingSessionState } from '@/lib/onboarding/types';
import type { useOnboardingEngine } from '@/hooks/useOnboardingEngine';
import type { Draft } from '@/hooks/useSquadpitch';
import { OnboardingPostCard } from './OnboardingPostCard';
import { ChannelActivationCard } from './ChannelActivationCard';
import { CHANNEL_REGISTRY } from '@/lib/channelRegistry';
import {
  CheckCircle2,
  AlertCircle,
  ImageIcon,
  Video,
  Building2,
  Home,
  Link2,
  Sparkles,
  Save,
  Zap,
  Loader2,
  ArrowRight,
  RefreshCw,
  Wand2,
  Upload,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { GenerateImageModal } from '../GenerateImageModal';

type Engine = ReturnType<typeof useOnboardingEngine>;

// ── Channel helpers ─────────────────────────────────────────────────

const CHANNEL_META: Record<string, { label: string; icon: string }> = {
  INSTAGRAM:  { label: 'Instagram',  icon: '📸' },
  FACEBOOK:   { label: 'Facebook',   icon: '📘' },
  LINKEDIN:   { label: 'LinkedIn',   icon: '💼' },
  X:          { label: 'X',          icon: '𝕏' },
  TIKTOK:     { label: 'TikTok',     icon: '🎵' },
  YOUTUBE:    { label: 'YouTube',    icon: '▶️' },
  PINTEREST:  { label: 'Pinterest',  icon: '📌' },
  THREADS:    { label: 'Threads',    icon: '@' },
};

const MEDIA_CHANNELS = new Set(['INSTAGRAM', 'TIKTOK']);

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

// ── Normalize source data from all possible locations ────────────────

interface NormalizedSourceData {
  type: 'real_estate' | 'business' | 'unknown';
  sourceLabel: string;
  confidence: { label: string; color: string };
  fields: Record<string, string | undefined>;
  fieldCount: number;
  thumbnailUrl?: string;
  businessName?: string;
  businessDescription?: string;
  propertyTitle?: string;
  propertyLocation?: string;
}

function normalizeCampaignSourceData(session: OnboardingSessionState, draftsCount = 0): NormalizedSourceData {
  const isRE = session.industryKey === 'real_estate';
  const analyzeResult = session.analyzeResult;
  const brandData = analyzeResult?.brandData;
  const dataItems = analyzeResult?.dataItems ?? [];
  const sources = session.sources ?? [];

  // Source label
  const sourceLabel = session.starterMethod === 'website' ? 'Website'
    : session.reListingSource === 'single_listing_url' ? 'Listing URL'
    : session.reListingSource === 'listing_feed_url' ? 'Listing feed'
    : session.starterMethod === 'description' ? 'Pasted text'
    : session.starterMethod === 'scratch' ? 'Manual entry'
    : session.primaryInput && /^https?:\/\//i.test(session.primaryInput) ? 'URL' : 'Manual';

  // Merge agent profile sources for supplementary data
  const mergedSource = sources.reduce<Record<string, string | undefined>>((acc, s) => {
    if (s.agentName && !acc.agentName) acc.agentName = s.agentName;
    if (s.brokerageName && !acc.brokerageName) acc.brokerageName = s.brokerageName;
    if (s.bio && !acc.bio) acc.bio = s.bio;
    if (s.websiteUrl && !acc.websiteUrl) acc.websiteUrl = s.websiteUrl;
    if (s.primaryCity && !acc.primaryCity) acc.primaryCity = s.primaryCity;
    if (s.primaryState && !acc.primaryState) acc.primaryState = s.primaryState;
    if (s.specialties?.length && !acc.specialties) acc.specialties = s.specialties.join(', ');
    if (s.serviceAreas?.length && !acc.serviceAreas) acc.serviceAreas = s.serviceAreas.join(', ');
    return acc;
  }, {});

  if (isRE) {
    // Find listing from dataItems
    const listing = dataItems.find((d) => {
      const t = ((d.dataJson?.type as string) ?? '').toLowerCase();
      return t.includes('listing') || t.includes('property');
    });
    const ld = listing?.dataJson as Record<string, unknown> | undefined;

    // Only show listing-style card when we actually have listing data
    if (ld) {
      const fields: Record<string, string | undefined> = {
        address: (ld.address as string) ?? listing?.title ?? undefined,
        price: ld.price ? String(ld.price) : undefined,
        beds: ld.beds ? String(ld.beds) : undefined,
        baths: ld.baths ? String(ld.baths) : undefined,
        sqft: ld.sqft ? String(ld.sqft) : undefined,
        propertyType: (ld.propertyType as string) ?? undefined,
        city: (ld.city as string) ?? mergedSource.primaryCity ?? undefined,
        state: (ld.state as string) ?? mergedSource.primaryState ?? undefined,
        neighborhood: (ld.neighborhood as string) ?? undefined,
      };

      const fieldCount = Object.values(fields).filter(Boolean).length;
      const thumbnailUrl = (ld.imageUrl as string) ?? undefined;
      const location = [fields.neighborhood, fields.city, fields.state].filter(Boolean).join(', ');

      // Confidence
      let confidence: { label: string; color: string };
      if (fieldCount >= 5) confidence = { label: 'High', color: 'text-zone-green' };
      else if (fieldCount >= 3) confidence = { label: 'Medium', color: 'text-yellow-400' };
      else confidence = { label: 'Low', color: 'text-orange-400' };

      // Boost: confirmed review or generated posts with source → at least Medium
      if (confidence.label === 'Low' && (session.propertyReviewDone || (draftsCount > 0 && sourceLabel !== 'Manual'))) {
        confidence = { label: 'Medium', color: 'text-yellow-400' };
      }

      return { type: 'real_estate', sourceLabel, confidence, fields, fieldCount, thumbnailUrl, propertyTitle: fields.address, propertyLocation: location || undefined };
    }

    // No listing found — fall through to business/agent path
  }

  // Business / agent data (also fallback for RE without listings)
  const name = (session.brandNameOverride ?? brandData?.name ?? mergedSource.agentName) || undefined;
  const description = (brandData?.description ?? mergedSource.bio) || undefined;
  const industry = brandData?.industry || undefined;
  const audience = brandData?.audience || undefined;
  const offers = brandData?.offers || undefined;
  const website = brandData?.website
    ?? mergedSource.websiteUrl
    ?? (session.primaryInput && /^https?:\/\//i.test(session.primaryInput) ? session.primaryInput : undefined);
  const location = [mergedSource.primaryCity, mergedSource.primaryState].filter(Boolean).join(', ') || undefined;

  const fields: Record<string, string | undefined> = {
    name,
    description,
    industry,
    audience,
    offers,
    website,
    brokerage: mergedSource.brokerageName || undefined,
    specialties: mergedSource.specialties || undefined,
    serviceAreas: mergedSource.serviceAreas || undefined,
    location,
  };

  const fieldCount = Object.values(fields).filter(Boolean).length;

  // Confidence
  let confidence: { label: string; color: string };
  if (fieldCount >= 4) confidence = { label: 'High', color: 'text-zone-green' };
  else if (fieldCount >= 2) confidence = { label: 'Medium', color: 'text-yellow-400' };
  else confidence = { label: 'Low', color: 'text-orange-400' };

  // Boost: URL source, confirmed brand, or generated posts → at least Medium
  if (confidence.label === 'Low' && (website || session.brandConfirmed || (draftsCount > 0 && sourceLabel !== 'Manual'))) {
    confidence = { label: 'Medium', color: 'text-yellow-400' };
  }

  return { type: fieldCount > 0 || website ? 'business' : 'unknown', sourceLabel, confidence, fields, fieldCount, businessName: name, businessDescription: description };
}

// ── Campaign Strength Score ──────────────────────────────────────────

interface StrengthScore {
  total: number; // 0–100
  data: number;  // 0–100
  media: number; // 0–100
  channels: number; // 0–100
  suggestions: string[];
}

function calculateCampaignStrength(
  normalized: NormalizedSourceData,
  drafts: Draft[],
  connectedSet: Set<string>,
): StrengthScore {
  const suggestions: string[] = [];

  // ── Data completeness (40%) ──
  let dataScore: number;
  const fc = normalized.fieldCount;
  if (fc >= 4) dataScore = Math.min(70 + (fc - 4) * 10, 100);
  else if (fc >= 2) dataScore = 45 + (fc - 2) * 12;
  else if (fc === 1) dataScore = 25;
  else dataScore = 0;

  // Boost: if confidence is High and posts exist, floor at 60
  if (normalized.confidence.label === 'High' && drafts.length > 0) {
    dataScore = Math.max(dataScore, 60);
  }

  if (dataScore < 60) {
    if (normalized.type === 'real_estate') {
      suggestions.push('Add price, beds/baths, or property highlights for more specific posts.');
    } else {
      suggestions.push('Add services, audience, or offers for more specific posts.');
    }
  }

  // ── Media quality (30%) ──
  let mediaScore = 0;
  const totalDrafts = drafts.length || 1;
  const withMedia = drafts.filter((d) => d.mediaUrl).length;
  if (withMedia > 0) {
    mediaScore = 50; // base for having any images
    mediaScore += Math.round((withMedia / totalDrafts) * 50);
  }
  if (mediaScore < 60) suggestions.push('Add visuals to improve Instagram readiness.');

  // ── Channel readiness (30%) ──
  let channelScore = 0;
  const draftChannels = new Set(drafts.map((d) => d.channel));
  const usedConnected = Array.from(draftChannels).filter((ch) => connectedSet.has(ch)).length;
  if (draftChannels.size > 0) {
    channelScore = Math.round((usedConnected / draftChannels.size) * 80);
    const mediaChannelDrafts = drafts.filter((d) => MEDIA_CHANNELS.has(d.channel));
    if (mediaChannelDrafts.length > 0) {
      const compatibleCount = mediaChannelDrafts.filter((d) => d.mediaUrl).length;
      channelScore += Math.round((compatibleCount / mediaChannelDrafts.length) * 20);
    } else {
      channelScore += 20;
    }
  }
  if (channelScore < 40) suggestions.push('Connect channels to enable publishing.');

  const total = Math.round(dataScore * 0.4 + mediaScore * 0.3 + channelScore * 0.3);

  return { total, data: dataScore, media: mediaScore, channels: channelScore, suggestions };
}

// ── Props ───────────────────────────────────────────────────────────

interface Props {
  engine: Engine;
}

export function CampaignPresentationCard({ engine }: Props) {
  const { session } = engine;
  const postsRef = useRef<HTMLDivElement>(null);
  const generationTriggeredRef = useRef(false);
  const drafts = session.previewDrafts;
  const analyzeResult = session.analyzeResult;
  const brandData = analyzeResult?.brandData;
  const clientId = session.createdClientId ?? '';
  const isRE = session.industryKey === 'real_estate';
  const isGenerating = engine.isGenerating;
  const generationProgress = engine.generationProgress;

  // Track the expected post count (capture max from generation progress)
  const expectedTotalRef = useRef(3);
  if (generationProgress?.total) {
    expectedTotalRef.current = Math.max(expectedTotalRef.current, generationProgress.total);
  }
  const expectedPostCount = expectedTotalRef.current;

  // Derive campaign status
  const completeFailed = !isGenerating && drafts.length === 0 && generationTriggeredRef.current;
  const campaignReady = !isGenerating && drafts.length >= expectedPostCount;
  const partiallyFailed = !isGenerating && drafts.length > 0 && drafts.length < expectedPostCount;
  const missingCount = expectedPostCount - drafts.length;

  // Auto-trigger generation when mounted with no drafts
  useEffect(() => {
    if (!generationTriggeredRef.current && drafts.length === 0 && !isGenerating) {
      generationTriggeredRef.current = true;
      engine.generatePreviews();
    }
  }, [drafts.length, isGenerating, engine]);

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

  const connectedSet = new Set(session.connectedChannelsSnapshot);

  const normalizedData = normalizeCampaignSourceData(session, drafts.length);
  const strength = calculateCampaignStrength(normalizedData, drafts, connectedSet);

  // Compact post toggle
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const togglePost = useCallback((id: string) => {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Sticky action bar
  const actionsRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const el = actionsRef.current;
    if (!el || isGenerating || drafts.length === 0) { setShowStickyBar(false); return; }
    const obs = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [isGenerating, drafts.length]);

  // Visual generation state
  const [showBulkGenerateModal, setShowBulkGenerateModal] = useState(false);
  const postsWithoutMedia = drafts.filter((d) => !d.mediaUrl);
  const allPostsHaveMedia = drafts.length > 0 && postsWithoutMedia.length === 0;

  const scrollToPosts = () => {
    postsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Compute visual counts
  const visualsReady = drafts.filter((d) => d.mediaUrl).length;
  const visualsNeeded = drafts.length - visualsReady;
  const publishReady = connectedSet.size > 0 && visualsNeeded === 0 && drafts.length > 0;
  const disableActions = isGenerating || drafts.length === 0;
  const hasListingImages = (analyzeResult?.images?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* ── 1. Hero / Header / Actions ────────────────────────── */}
      <div className="rounded-xl border border-white-10 overflow-hidden">
        <div className="px-4 py-4 flex flex-col gap-3">
          <span className={cn(
            'self-start text-[11px] font-medium px-2.5 py-0.5 rounded-full border',
            completeFailed
              ? 'bg-red-500/10 text-red-400 border-red-500/20'
              : isGenerating
                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                : 'bg-accent-green-110/15 text-accent-green-110 border-accent-green-110/20',
          )}>
            {completeFailed ? 'Generation failed' : isGenerating ? 'Building campaign' : 'Ready for review'}
          </span>
          <div className="flex items-center gap-2.5">
            {completeFailed ? (
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
            ) : isGenerating ? (
              <Loader2 className="w-6 h-6 text-accent-green-110 animate-spin flex-shrink-0" />
            ) : (
              <Sparkles className="w-6 h-6 text-accent-green-110 flex-shrink-0" />
            )}
            <h2 className="text-xl font-bold text-white">
              {completeFailed
                ? 'We couldn\u2019t finish your campaign'
                : isGenerating
                  ? 'Building your campaign\u2026'
                  : 'Your campaign is ready'}
            </h2>
          </div>
          <p className="text-sm text-white-50 leading-relaxed">
            {completeFailed
              ? 'Something went wrong during generation. You can retry or continue setting up your workspace.'
              : isGenerating
                ? 'Squadpitch is creating your posts and checking readiness.'
                : 'This campaign was created from your data and is ready to use. Review it, add visuals if needed, then approve or save.'}
          </p>

          {/* Ready-as-drafts status line */}
          {campaignReady && (
            <p className="text-xs text-white-40 -mt-1">
              {connectedSet.size > 0 && visualsNeeded === 0
                ? 'This campaign is ready to review and publish.'
                : visualsNeeded > 0
                  ? 'This campaign is ready as drafts. Add visuals to improve platform readiness.'
                  : 'This campaign is ready as drafts.'}
            </p>
          )}

          {/* Generation progress bar */}
          {isGenerating && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-white-40">
                <span>Generated {drafts.length} of {expectedPostCount} posts</span>
                <span>{Math.round((drafts.length / expectedPostCount) * 100)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white-10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-green-110 transition-all duration-500 ease-out"
                  style={{ width: `${Math.max((drafts.length / expectedPostCount) * 100, 8)}%` }}
                />
              </div>
            </div>
          )}

          {/* Status chips */}
          {drafts.length > 0 && !completeFailed && (
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white-10 text-white-50">
                {drafts.length} post{drafts.length !== 1 ? 's' : ''}
              </span>
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
                visualsNeeded > 0 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-zone-green/10 text-zone-green',
              )}>
                <ImageIcon className="w-3 h-3" />
                {allPostsHaveMedia ? 'All visuals ready' : `${visualsNeeded} need visuals`}
              </span>
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
                connectedSet.size > 0 ? 'bg-zone-green/10 text-zone-green' : 'bg-white-10 text-white-40',
              )}>
                <Link2 className="w-3 h-3" />
                {connectedSet.size} channel{connectedSet.size !== 1 ? 's' : ''} connected
              </span>
              {!isGenerating && (
                <span className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
                  publishReady ? 'bg-zone-green/10 text-zone-green' : 'bg-white-10 text-white-40',
                )}>
                  {publishReady ? 'Publish-ready' : 'Draft-ready'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Primary actions */}
        <div ref={actionsRef} className="px-4 py-3 border-t border-white-10 flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row gap-2">
          {completeFailed ? (
            <button
              onClick={() => {
                generationTriggeredRef.current = false;
                engine.generatePreviews();
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-green-110 text-black font-semibold text-sm hover:bg-accent-green-110/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry generation
            </button>
          ) : (
            <>
              <button
                onClick={engine.approveCampaign}
                disabled={disableActions}
                className={cn(
                  'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors sm:flex-none',
                  disableActions
                    ? 'bg-white-10 text-white-30 cursor-not-allowed'
                    : 'bg-accent-green-110 text-black hover:bg-accent-green-110/90',
                )}
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve campaign
              </button>
              <button
                onClick={engine.saveCampaignAsDrafts}
                disabled={disableActions}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-white-10 text-sm transition-colors',
                  disableActions ? 'text-white-25 cursor-not-allowed' : 'text-white-60 hover:bg-white-5',
                )}
              >
                <Save className="w-3.5 h-3.5" />
                Save as drafts
              </button>
            </>
          )}
          <button
            onClick={engine.connectChannelsFromCampaign}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-white-10 text-white-60 text-sm hover:bg-white-5 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
            {connectedSet.size > 0 ? 'Manage channels' : 'Connect channels'}
          </button>
          </div>
          {!completeFailed && !isGenerating && drafts.length > 0 && (
            <p className="text-[10px] text-white-25">Approve Campaign saves all posts at once. You can also approve each post individually below.</p>
          )}
        </div>
      </div>

      {/* ── 2. Channel Activation Card ───────────────────────── */}
      <ChannelActivationCard
        connectedSet={connectedSet}
        drafts={drafts}
        isGenerating={isGenerating}
        onConnectChannels={engine.connectChannelsFromCampaign}
        onContinueWithDrafts={engine.saveCampaignAsDrafts}
      />

      {/* ── 3. Based on your data ────────────────────────────── */}
      <DataSummary data={normalizedData} session={session} />

      {/* ── 4. Campaign visuals ──────────────────────────────── */}
      {!isGenerating && drafts.length > 0 && (
        <div className="rounded-xl border border-white-10 overflow-hidden">
          <div className="px-3 py-2 border-b border-white-10 bg-white-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5 text-white-40" />
              <span className="text-[11px] font-medium text-white-40 uppercase tracking-wider">
                Campaign visuals
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              {visualsReady > 0 && (
                <span className="text-zone-green">{visualsReady} ready</span>
              )}
              {visualsNeeded > 0 && (
                <span className="text-yellow-400">{visualsNeeded} needed</span>
              )}
            </div>
          </div>
          <div className="px-3 py-3">
            {allPostsHaveMedia ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-zone-green flex-shrink-0" />
                <p className="text-xs text-white-50">All posts have visuals attached.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-white-40 mb-2.5">
                  Some posts need visuals before they&apos;re ready for social platforms like Instagram.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBulkGenerateModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-green-110 text-black hover:bg-accent-green-110/90 transition-colors"
                  >
                    <Wand2 className="w-3 h-3" />
                    Generate visuals for missing posts
                  </button>
                  <button
                    onClick={scrollToPosts}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white-5 text-white-50 border border-white-10 hover:border-white-15 transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                    Upload images
                  </button>
                </div>
              </>
            )}
          </div>

          {/* RE safety note */}
          {isRE && !allPostsHaveMedia && (
            <div className="px-3 py-2 border-t border-white-10">
              <p className="text-[10px] text-white-20">
                AI visuals are for marketing graphics, overlays, and carousels — not replacement property photos.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bulk generate modal */}
      {showBulkGenerateModal && (
        <GenerateImageModal
          clientId={clientId}
          isRealEstate={isRE}
          defaultGuidance={
            isRE && analyzeResult?.dataItems?.[0]?.dataJson
              ? `Property: ${(analyzeResult.dataItems[0].dataJson.address as string) || ''}`
              : brandData?.name ? `Brand: ${brandData.name}` : undefined
          }
          onGenerated={() => {
            setShowBulkGenerateModal(false);
          }}
          onClose={() => setShowBulkGenerateModal(false)}
        />
      )}

      {/* ── 5. Campaign strength ─────────────────────────────── */}
      {campaignReady && <CampaignStrength strength={strength} />}

      {/* ── Error cards (failure states) ─────────────────────── */}
      {completeFailed && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 overflow-hidden">
          <div className="px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white-80">Campaign generation failed</p>
              <p className="text-xs text-white-40 mt-0.5 leading-relaxed">
                No posts could be generated. Try again or save your workspace to continue later.
              </p>
            </div>
          </div>
          <div className="px-4 pb-3">
            <button
              onClick={() => {
                generationTriggeredRef.current = false;
                engine.generatePreviews();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent-green-110 text-black text-sm font-semibold hover:bg-accent-green-110/90 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry generation
            </button>
          </div>
        </div>
      )}

      {partiallyFailed && (
        <div className="rounded-xl border border-orange-500/25 bg-orange-500/5 overflow-hidden">
          <div className="px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white-80">Some posts could not be generated</p>
              <p className="text-xs text-white-40 mt-0.5 leading-relaxed">
                {drafts.length} of {expectedPostCount} posts were created.
              </p>
            </div>
          </div>
          <div className="px-4 pb-3 flex gap-2">
            <button
              onClick={() => { expectedTotalRef.current = drafts.length; }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white-10 text-white-60 text-sm hover:bg-white-5 transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Continue with {drafts.length} post{drafts.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* ── 6. Generated Posts ────────────────────────────────── */}
      <div ref={postsRef} className="flex flex-col gap-2">
        <div className="px-1 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-white-70">Generated posts</h3>
            <p className="text-xs text-white-40 mt-0.5">
              {isGenerating
                ? `${drafts.length} of ${expectedPostCount} posts created so far...`
                : `${drafts.length} post${drafts.length !== 1 ? 's' : ''} created from your campaign data.`}
            </p>
          </div>
          {!isGenerating && drafts.length > 1 && (
            <button
              onClick={() => setExpandedPosts(expandedPosts.size === drafts.length ? new Set() : new Set(drafts.map((d) => d.id)))}
              className="text-[11px] text-white-30 hover:text-white-50 transition-colors"
            >
              {expandedPosts.size === drafts.length ? 'Collapse all' : 'Expand all'}
            </button>
          )}
        </div>

        {drafts.map((draft, idx) => {
          const templateType = draft.generationGuidance
            ? guessTemplateType(draft)
            : undefined;
          const readiness = getDraftReadiness(draft, connectedSet, hasListingImages);
          const chLabel = CHANNEL_META[draft.channel]?.label ?? draft.channel;
          const isExpanded = expandedPosts.has(draft.id);
          const isApproved = draft.status === 'APPROVED' || draft.status === 'SCHEDULED';
          const preview = draft.body.split('\n').filter(Boolean).slice(0, 2).join(' ').slice(0, 150);

          if (!isExpanded) {
            // Compact row
            return (
              <button
                key={draft.id}
                onClick={() => togglePost(draft.id)}
                className="w-full text-left rounded-xl border border-white-15 bg-sp-card overflow-hidden hover:border-white-20 transition-colors"
              >
                <div className="flex items-start gap-3 p-3">
                  {draft.mediaUrl ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-white-10 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={draft.mediaUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white-5 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-4 h-4 text-white-20" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-semibold text-white-40">Post {idx + 1}</span>
                      {templateType && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white-10 text-white-50">{templateType}</span>
                      )}
                      <span className="text-[10px] text-white-30">{chLabel}</span>
                    </div>
                    <p className="text-xs text-white-50 line-clamp-2 leading-relaxed">{preview}</p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
                    {isApproved ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-zone-green" />
                    ) : readiness.icon === 'check' ? (
                      <CheckCircle2 className={cn('w-3 h-3', readiness.color)} />
                    ) : readiness.icon === 'image' ? (
                      <ImageIcon className={cn('w-3 h-3', readiness.color)} />
                    ) : (
                      <AlertCircle className={cn('w-3 h-3', readiness.color)} />
                    )}
                    <ChevronDown className="w-3.5 h-3.5 text-white-25" />
                  </div>
                </div>
              </button>
            );
          }

          // Expanded: full card
          return (
            <div key={draft.id} className="relative">
              <div className="flex items-center justify-between px-3 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-white-40">Post {idx + 1}</span>
                  {templateType && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white-10 text-white-50 border border-white-10">
                      {templateType}
                    </span>
                  )}
                  <span className="text-[10px] text-white-40">{chLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {readiness.icon === 'check' ? (
                      <CheckCircle2 className={cn('w-3 h-3', readiness.color)} />
                    ) : readiness.icon === 'image' ? (
                      <ImageIcon className={cn('w-3 h-3', readiness.color)} />
                    ) : readiness.icon === 'video' ? (
                      <Video className={cn('w-3 h-3', readiness.color)} />
                    ) : (
                      <AlertCircle className={cn('w-3 h-3', readiness.color)} />
                    )}
                    <span className={cn('text-[10px]', readiness.color)}>{readiness.label}</span>
                  </div>
                  <button
                    onClick={() => togglePost(draft.id)}
                    className="p-1 rounded-md hover:bg-white-5 transition-colors"
                    title="Collapse"
                  >
                    <ChevronUp className="w-3.5 h-3.5 text-white-30" />
                  </button>
                </div>
              </div>

              <OnboardingPostCard
                draft={draft}
                clientId={clientId}
                brandName={brandName}
                logoUrl={logoUrl}
                defaultScheduleTime={defaultScheduleTime}
                onRegenerated={(newDraft: Draft) => {
                  engine.replacePreviewDraft?.(draft.id, newDraft);
                }}
                isFirstPost={idx === 0 && !isGenerating}
                industryKey={session.industryKey ?? undefined}
                postIndex={idx}
                channelConnected={
                  connectedSet.size > 0
                    ? connectedSet.has(draft.channel as never)
                    : session.channelConnectSkipped ? false : undefined
                }
                onConnectChannel={engine.connectChannelsFromCampaign}
              />
            </div>
          );
        })}

        {isGenerating && missingCount > 0 && Array.from({ length: missingCount }, (_, i) => (
          <PostSkeleton key={`skeleton-${i}`} index={drafts.length + i + 1} />
        ))}
      </div>

      {/* ── 7. Autopilot — only when campaign is ready ────────── */}
      {campaignReady && <AutopilotToggle clientId={clientId} hasChannels={connectedSet.size > 0} />}

      {/* ── 8. Bottom action panel ─────────────────────────── */}
      {!isGenerating && drafts.length > 0 && (
        <div className="rounded-xl border border-white-10 overflow-hidden">
          <div className="px-4 py-3 border-b border-white-10">
            <p className="text-sm font-medium text-white-70">Ready to finish?</p>
            <p className="text-xs text-white-40 mt-0.5">
              Approve this campaign to save it, or save it as drafts and come back later.
            </p>
          </div>
          <div className="px-4 py-3 flex flex-col sm:flex-row gap-2">
            <button
              onClick={engine.approveCampaign}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-green-110 text-black font-semibold text-sm hover:bg-accent-green-110/90 transition-colors sm:flex-none"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve campaign
            </button>
            <button
              onClick={engine.saveCampaignAsDrafts}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-white-10 text-white-60 text-sm hover:bg-white-5 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Save as drafts
            </button>
            <button
              onClick={engine.connectChannelsFromCampaign}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-white-10 text-white-60 text-sm hover:bg-white-5 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              {connectedSet.size > 0 ? 'Manage channels' : 'Connect channels'}
            </button>
          </div>
        </div>
      )}

      {/* ── Sticky action bar (visible when top actions scroll out of view) ── */}
      {showStickyBar && !completeFailed && (
        <div className="sticky bottom-0 z-10 -mx-px">
          <div className="rounded-xl border border-white-10 bg-sp-bg/95 backdrop-blur-sm shadow-lg shadow-black/30 overflow-hidden">
            <div className="px-3 py-2.5 flex items-center gap-2">
              <button
                onClick={engine.approveCampaign}
                disabled={disableActions}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs transition-colors',
                  disableActions
                    ? 'bg-white-10 text-white-30 cursor-not-allowed'
                    : 'bg-accent-green-110 text-black hover:bg-accent-green-110/90',
                )}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve
              </button>
              <button
                onClick={engine.saveCampaignAsDrafts}
                disabled={disableActions}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white-10 text-xs transition-colors',
                  disableActions ? 'text-white-25 cursor-not-allowed' : 'text-white-60 hover:bg-white-5',
                )}
              >
                <Save className="w-3 h-3" />
                Save drafts
              </button>
              <button
                onClick={engine.connectChannelsFromCampaign}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white-10 text-white-50 text-xs hover:bg-white-5 transition-colors ml-auto"
              >
                <Link2 className="w-3 h-3" />
                {connectedSet.size > 0 ? 'Channels' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ── Autopilot Toggle ────────────────────────────────────────────────

function AutopilotToggle({ clientId, hasChannels }: { clientId: string; hasChannels: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleToggle = async () => {
    if (!hasChannels) return;
    const next = !enabled;
    setEnabled(next);

    if (!clientId) return;
    setSaving(true);
    try {
      await fetch(`/api/proxy/workspaces/${clientId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autopilot: next }),
      });
    } catch {
      // Non-critical — preference saved locally, can be synced later
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-white-10 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <Zap className={cn(
            'w-4 h-4 flex-shrink-0 mt-0.5 transition-colors',
            enabled ? 'text-accent-green-110' : 'text-white-30',
          )} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white-80">Autopilot</p>
            <p className="text-[11px] text-white-40 mt-0.5 leading-relaxed">
              {hasChannels
                ? 'When enabled, Squadpitch can automatically create and schedule content after your approval settings are configured.'
                : 'Connect channels before using Autopilot.'}
            </p>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          onClick={handleToggle}
          disabled={saving || !hasChannels}
          className={cn(
            'relative inline-flex flex-shrink-0 h-6 w-11 rounded-full overflow-hidden transition-colors',
            enabled ? 'bg-accent-green-110' : 'bg-white-15',
            (saving || !hasChannels) && 'opacity-40',
          )}
          aria-label={enabled ? 'Disable autopilot' : 'Enable autopilot'}
        >
          <span
            className={cn(
              'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
              enabled ? 'translate-x-5' : 'translate-x-0',
            )}
          />
        </button>
      </div>

      <div className="px-4 pb-2.5 -mt-1">
        <p className="text-[10px] text-white-25">You can turn this on or off anytime.</p>
      </div>
    </div>
  );
}

// ── Campaign Strength Display ────────────────────────────────────────

function CampaignStrength({ strength }: { strength: StrengthScore }) {
  const { total, data, media, channels, suggestions } = strength;

  const scoreColor =
    total >= 75 ? 'text-zone-green' :
    total >= 50 ? 'text-yellow-400' :
    'text-orange-400';

  const barColor = (v: number) =>
    v >= 75 ? 'bg-zone-green' :
    v >= 50 ? 'bg-yellow-400' :
    'bg-orange-400';

  return (
    <div className="rounded-xl border border-white-10 overflow-hidden">
      <div className="px-3 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-white-40" />
          <span className="text-sm font-medium text-white-70">Campaign Strength</span>
        </div>
        <span className={cn('text-lg font-bold tabular-nums', scoreColor)}>
          {total}<span className="text-xs font-normal text-white-30">/100</span>
        </span>
      </div>

      {/* Sub-scores */}
      <div className="px-3 pb-3 grid grid-cols-3 gap-3">
        {([
          ['Data', data],
          ['Media', media],
          ['Channels', channels],
        ] as const).map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white-40">{label}</span>
              <span className="text-[11px] font-medium text-white-50 tabular-nums">{value}%</span>
            </div>
            <div className="h-1 rounded-full bg-white-10 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', barColor(value))}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="px-3 py-2 border-t border-white-10 flex flex-col gap-1">
          {suggestions.map((s) => (
            <div key={s} className="flex items-start gap-1.5">
              <AlertCircle className="w-3 h-3 text-yellow-400 flex-shrink-0 mt-0.5" />
              <span className="text-[11px] text-white-40">{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Data Summary ────────────────────────────────────────────────────

function DataSummary({ data, session }: { data: NormalizedSourceData; session: OnboardingSessionState }) {
  const { type, sourceLabel, confidence, fields, fieldCount, thumbnailUrl, businessName, businessDescription, propertyTitle, propertyLocation } = data;

  // Derive hostname for business source display
  const sourceHostname = fields.website ? (() => { try { return new URL(fields.website).hostname; } catch { return undefined; } })() : undefined;

  return (
    <div className="rounded-xl border border-white-10 overflow-hidden">
      <div className="px-3 py-2 border-b border-white-10 bg-white-5 flex items-center justify-between">
        <span className="text-[11px] font-medium text-white-40 uppercase tracking-wider">
          Based on your data
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white-30">{sourceLabel}</span>
          <span className={cn('text-[10px] font-medium', confidence.color)}>{confidence.label}</span>
        </div>
      </div>

      <div className="px-3 py-3">
        {type === 'real_estate' && fieldCount > 0 ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex gap-3">
              {thumbnailUrl && (
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-white-10 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-white-40 flex-shrink-0" />
                  <span className="text-sm font-medium text-white-80 truncate">
                    {propertyTitle ?? 'Property'}
                  </span>
                </div>
                {propertyLocation && (
                  <span className="text-xs text-white-40">{propertyLocation}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <DataField label="Price" value={fields.price ? `$${Number(fields.price).toLocaleString()}` : undefined} />
              <DataField label="Beds/Baths" value={
                fields.beds || fields.baths
                  ? `${fields.beds ?? '—'} bed / ${fields.baths ?? '—'} bath`
                  : undefined
              } />
              <DataField label="Sqft" value={fields.sqft ? `${Number(fields.sqft).toLocaleString()}` : undefined} />
              <DataField label="Type" value={fields.propertyType} />
            </div>
          </div>
        ) : type === 'business' || fieldCount > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-white-40 flex-shrink-0" />
              <span className="text-sm font-medium text-white-80">
                {businessName ?? 'Your Business'}
              </span>
            </div>
            {businessDescription && (
              <p className="text-xs text-white-50 line-clamp-2">{businessDescription}</p>
            )}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <BusinessFields fields={fields} sourceHostname={sourceHostname} />
            </div>
          </div>
        ) : session.primaryInput ? (
          /* Fallback: we have a source URL/input but no structured fields */
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-white-40 flex-shrink-0" />
              <span className="text-sm font-medium text-white-80">
                {session.brandNameOverride ?? 'Your Business'}
              </span>
            </div>
            <p className="text-xs text-white-50">
              Squadpitch created this campaign from your website content.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <DataField label="Source" value={sourceHostname ?? data.sourceLabel} />
              <DataField label="Details" value="Website content available" />
            </div>
          </div>
        ) : (
          <p className="text-xs text-white-40">
            Limited data was available. You can still edit the posts before using them.
          </p>
        )}
      </div>

      <div className="px-3 py-2 border-t border-white-10">
        <p className="text-[11px] text-white-25">
          Squadpitch used these details to create the campaign.
        </p>
      </div>
    </div>
  );
}

function BusinessFields({ fields, sourceHostname }: { fields: Record<string, string | undefined>; sourceHostname?: string }) {
  // Build prioritized list of available fields, show up to 4
  const candidates: [string, string][] = [];
  if (fields.brokerage) candidates.push(['Brokerage', fields.brokerage]);
  if (fields.location) candidates.push(['Location', fields.location]);
  if (fields.specialties) candidates.push(['Specialties', fields.specialties]);
  if (fields.serviceAreas) candidates.push(['Service areas', fields.serviceAreas]);
  if (fields.industry) candidates.push(['Industry', fields.industry]);
  if (fields.audience) candidates.push(['Audience', fields.audience]);
  if (fields.offers) candidates.push(['Offers', fields.offers]);
  if (sourceHostname) candidates.push(['Source', sourceHostname]);

  const shown = candidates.slice(0, 4);
  return (
    <>
      {shown.map(([label, value]) => (
        <DataField key={label} label={label} value={value} />
      ))}
    </>
  );
}

function DataField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-white-30 flex-shrink-0">{label}:</span>
      {value ? (
        <span className="text-white-60 truncate">{value}</span>
      ) : (
        <span className="text-[10px] text-white-20 italic">Missing</span>
      )}
    </div>
  );
}

// ── Post Skeleton ────────────────────────────────────────────────────

function PostSkeleton({ index }: { index: number }) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between px-3 mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-white-25">
            Post {index}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin text-white-25" />
          <span className="text-[10px] text-white-25">Generating...</span>
        </div>
      </div>
      <div className="rounded-2xl border border-white-10 overflow-hidden bg-sp-card animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white-10">
          <div className="w-9 h-9 rounded-full bg-white-10" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 rounded bg-white-10" />
            <div className="h-2.5 w-16 rounded bg-white-5" />
          </div>
        </div>
        {/* Image skeleton */}
        <div className="w-full aspect-square bg-white-5 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-white-15" />
        </div>
        {/* Caption skeleton */}
        <div className="px-4 py-4 space-y-2">
          <div className="h-3 w-full rounded bg-white-10" />
          <div className="h-3 w-4/5 rounded bg-white-10" />
          <div className="h-3 w-3/5 rounded bg-white-5" />
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function getDraftReadiness(
  draft: Draft,
  connectedSet: Set<string>,
  hasListingImages = false,
): { label: string; color: string; icon: 'check' | 'image' | 'video' | 'alert' } {
  const isConnected = connectedSet.has(draft.channel as never);

  // Channel-specific media requirements
  const cap = CHANNEL_REGISTRY[draft.channel as keyof typeof CHANNEL_REGISTRY];
  const requiresVideo = cap?.requiresVideo ?? false;
  const requiresMedia = cap?.requiresMedia ?? false;
  const hasMedia = !!draft.mediaUrl;

  if (isConnected && requiresVideo && !hasMedia) {
    return { label: 'Needs video', color: 'text-yellow-400', icon: 'video' };
  }
  if (isConnected && requiresMedia && !hasMedia) {
    return hasListingImages
      ? { label: 'Add image', color: 'text-yellow-400', icon: 'image' }
      : { label: 'Needs image', color: 'text-yellow-400', icon: 'image' };
  }
  if (isConnected) {
    return { label: 'Ready to publish', color: 'text-zone-green', icon: 'check' };
  }

  // Not connected — check media state for draft readiness
  if (requiresMedia && !hasMedia) {
    return hasListingImages
      ? { label: 'Add image', color: 'text-white-40', icon: 'image' }
      : { label: 'Needs image', color: 'text-white-40', icon: 'image' };
  }
  return { label: 'Draft ready', color: 'text-white-30', icon: 'check' };
}

function guessTemplateType(draft: Draft): string | undefined {
  const guidance = (draft.generationGuidance ?? '').toLowerCase();
  for (const [key, label] of Object.entries(TEMPLATE_LABELS)) {
    if (guidance.includes(key.replace(/_/g, ' ')) || guidance.includes(key)) {
      return label;
    }
  }
  if (guidance.includes('just listed') || guidance.includes('listing spotlight')) return 'Listing';
  if (guidance.includes('neighborhood') || guidance.includes('lifestyle')) return 'Lifestyle';
  if (guidance.includes('buyer') || guidance.includes('tip')) return 'Tip';
  if (guidance.includes('expertise') || guidance.includes('authority')) return 'Expertise';
  if (guidance.includes('brand intro') || guidance.includes('introduce')) return 'Brand';
  if (guidance.includes('offer') || guidance.includes('service')) return 'Offer';
  return undefined;
}
