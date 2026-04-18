'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Wand2,
  Loader2,
  Lightbulb,
  Database,
  ChevronDown,
  ChevronRight,
  X,
  Sparkles,
  Home,
  MessageSquare,
  BookOpen,
  TrendingUp,
  User,
  Zap,
  Rocket,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useGenerateContent,
  useChannelSettings,
  useChannelConnectionStatus,
  useMediaProfile,
  useGenerateMedia,
  useGenerateVideo,
  useGenerateIdeas,
  useDataItems,
  useBlueprints,
  useBusinessDataLabels,
  useRecommendations,
  useSeriesTemplates,
  useGenerateSeries,
  useAcceptRecommendation,
  type Channel,
  type UnifiedRecommendation,
  type Draft,
  type ContentIdea,
  type WorkspaceDataItem,
  type ContentBlueprint,
  type SeriesTemplate,
} from '@/hooks/useSquadpitch';
import { getChannelLabel, getChannelRequirementHint } from '@/lib/channelRegistry';
import { StatusBanner } from '@/components/common/StatusBanner';
import { useUsage } from '@/hooks/useBilling';
import { UpgradePrompt } from '@/components/billing/UpgradePrompt';
import { ServiceAlert } from '@/components/billing/ServiceAlert';

interface Props {
  clientId: string;
  initialGuidance?: string;
  initialTemplateType?: string;
  onGenerated: (draft: Draft) => void;
}

const GOALS = ['Growth', 'Engagement', 'Sales'] as const;

const CONTENT_TYPES = [
  { value: 'listing', label: 'Listing', icon: Home },
  { value: 'testimonial', label: 'Testimonial', icon: MessageSquare },
  { value: 'educational', label: 'Educational', icon: BookOpen },
  { value: 'market_update', label: 'Market Update', icon: TrendingUp },
  { value: 'personal', label: 'Personal / Story', icon: User },
  { value: 'growth', label: 'Growth', icon: Rocket },
] as const;

type ContentType = typeof CONTENT_TYPES[number]['value'];

const QUICK_CHIPS = [
  { label: 'Just listed post', guidance: 'Create a "Just Listed" post highlighting a new property listing with key features and excitement', type: 'listing' as ContentType },
  { label: 'Price drop alert', guidance: 'Create a price reduction alert post that creates urgency and highlights the new value', type: 'listing' as ContentType },
  { label: 'Client testimonial', guidance: 'Create a social proof post featuring a client testimonial that builds trust and credibility', type: 'testimonial' as ContentType },
  { label: 'Market update', guidance: 'Create a market update post sharing current trends, data, and insights that demonstrate expertise', type: 'market_update' as ContentType },
  { label: 'Open house announcement', guidance: 'Create an open house announcement post with date, time, address, and compelling reasons to attend', type: 'listing' as ContentType },
  { label: 'Buyer tips', guidance: '[Type: growth] Create a post sharing 3 practical tips for home buyers that demonstrates expertise and attracts new followers', type: 'growth' as ContentType },
  { label: 'What does $X get you?', guidance: '[Type: growth] Create a curiosity-driven post about what a specific price point gets you in the local market — designed to attract new followers', type: 'growth' as ContentType },
  { label: 'Myth buster', guidance: '[Type: growth] Bust a common real estate myth to position yourself as a trusted authority and attract new followers', type: 'growth' as ContentType },
];

function getGenerationError(error: Error | null) {
  if (!error) return null;
  const msg = error.message;
  if (msg.includes('BUDGET_EXCEEDED')) return { type: 'budget' as const, message: 'AI generation is temporarily unavailable due to budget limits.' };
  if (msg.includes('SERVICE_UNAVAILABLE')) return { type: 'service' as const, message: msg };
  if (msg.includes('FEATURE_THROTTLED')) return { type: 'throttled' as const, message: msg };
  if (msg.includes('USAGE_LIMIT')) return { type: 'limit' as const, message: msg };
  if (msg.includes('TIER_LIMIT')) return { type: 'tier' as const, message: msg };
  return { type: 'generic' as const, message: msg };
}

export function CreateContentForm({ clientId, initialGuidance, initialTemplateType, onGenerated }: Props) {
  const bdLabels = useBusinessDataLabels(clientId);
  const { data: channels } = useChannelSettings(clientId);
  const connectionStatus = useChannelConnectionStatus(clientId);
  const { data: mediaProfile } = useMediaProfile(clientId);
  const { data: recommendations } = useRecommendations(clientId, 'create_content');
  const acceptRec = useAcceptRecommendation(clientId);
  const generate = useGenerateContent();
  const generateMedia = useGenerateMedia(clientId);
  const generateVideo = useGenerateVideo(clientId);
  const ideasMutation = useGenerateIdeas(clientId);
  const { data: seriesTemplatesData } = useSeriesTemplates();
  const generateSeries = useGenerateSeries(clientId);

  const { data: usage } = useUsage();

  const [guidance, setGuidance] = useState(initialGuidance ?? '');
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);
  const [goal, setGoal] = useState<typeof GOALS[number]>('Growth');
  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [showSeries, setShowSeries] = useState(false);
  const [seriesTemplate, setSeriesTemplate] = useState<string>('tips_series');
  const [seriesParts, setSeriesParts] = useState(3);

  // Business data state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showBusinessData, setShowBusinessData] = useState(false);
  const [selectedDataItem, setSelectedDataItem] = useState<WorkspaceDataItem | null>(null);
  const [selectedBlueprint, setSelectedBlueprint] = useState<ContentBlueprint | null>(null);
  const [dataSearch, setDataSearch] = useState('');

  const { data: dataItems } = useDataItems(clientId, {
    search: dataSearch.trim() || undefined,
    limit: 20,
  });
  const { data: blueprints } = useBlueprints(
    selectedDataItem ? { applicableType: selectedDataItem.type } : {}
  );

  const aiImageAvailable =
    mediaProfile?.mode === 'BRAND_ASSETS_PLUS_AI' ||
    mediaProfile?.mode === 'AI_CHARACTER';

  const enabledChannels = useMemo(
    () => channels?.filter((c) => c.isEnabled) ?? [],
    [channels]
  );

  // Auto-select first enabled channel
  useEffect(() => {
    if (selectedChannels.length === 0 && enabledChannels.length > 0) {
      setSelectedChannels([enabledChannels[0].channel]);
    }
  }, [selectedChannels.length, enabledChannels]);

  const toggleChannel = (ch: Channel) => {
    setSelectedChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  // ── Build recommended posts from shared recommendation engine ──────────
  interface RecommendedPost {
    id: string;
    title: string;
    description: string;
    guidance: string;
    type: ContentType;
    badge?: string;
    dataItemId?: string;
    channel?: string;
    sourceContext?: string;
    reason?: string;
    confidence?: 'high' | 'medium' | 'low';
  }

  // Campaign hint — a single top-priority campaign suggestion shown subtly
  const campaignHint = useMemo(() => {
    const recs = recommendations?.recommendations ?? [];
    return recs.find((r: UnifiedRecommendation) => r.type === 'campaign_hint') ?? null;
  }, [recommendations]);

  const recommendedPosts = useMemo<RecommendedPost[]>(() => {
    const recs = recommendations?.recommendations ?? [];
    if (recs.length === 0) return [];

    // Map engine type → frontend content type
    const typeMap: Record<string, ContentType> = {
      listing_post: 'listing',
      milestone_post: 'personal',
      testimonial_post: 'testimonial',
      engagement_post: 'educational',
      scheduling_action: 'educational',
      growth_post: 'growth',
    };

    // Map engine type → badge
    const badgeMap: Record<string, string> = {
      listing_post: 'New listing',
      milestone_post: 'Just Sold',
      testimonial_post: 'Social proof',
      scheduling_action: 'Cadence',
      growth_post: 'Growth',
    };

    // Filter out campaign_hint — handled separately
    return recs.filter((r: UnifiedRecommendation) => r.type !== 'campaign_hint').slice(0, 3).map((rec: UnifiedRecommendation) => ({
      id: rec.id,
      title: rec.title,
      description: rec.description,
      guidance: rec.actionPayload?.guidance ?? rec.description,
      type: typeMap[rec.type] ?? 'educational',
      badge: badgeMap[rec.type] ?? (rec.confidence === 'high' ? 'Recommended' : undefined),
      dataItemId: rec.actionPayload?.dataItemId ?? rec.sourceId ?? undefined,
      channel: rec.actionPayload?.channel ?? rec.suggestedChannel ?? undefined,
      reason: rec.reasons?.[0] ?? undefined,
      confidence: rec.confidence ?? undefined,
    }));
  }, [recommendations]);

  const handleGenerate = () => {
    if (selectedChannels.length === 0 || !guidance.trim()) return;
    const channel = selectedChannels[0];
    const typePrefix = contentType ? `[Type: ${contentType}] ` : '';
    const fullGuidance = `[Goal: ${goal}] ${typePrefix}${guidance.trim()}`;

    generate.mutate(
      {
        clientId,
        kind: 'POST',
        channel,
        guidance: fullGuidance,
        templateType: initialTemplateType,
        dataItemId: selectedDataItem?.id,
        blueprintId: selectedBlueprint?.id,
      },
      {
        onSuccess: (draft) => {
          // Auto-generate image if AI available
          if (aiImageAvailable && !atImageLimit) {
            generateMedia.mutate({
              clientId,
              guidance: draft.imageGuidance || draft.altText || draft.body.slice(0, 500),
              draftId: draft.id,
              channel,
            });
          }
          onGenerated(draft);
        },
      }
    );
  };

  const handleGenerateSeries = () => {
    if (selectedChannels.length === 0 || !guidance.trim()) return;
    generateSeries.mutate(
      {
        topic: guidance.trim(),
        templateId: seriesTemplate,
        parts: seriesParts,
        channel: selectedChannels[0],
      },
      {
        onSuccess: (result) => {
          if (result.drafts.length > 0) {
            onGenerated(result.drafts[0]);
          }
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canGenerate) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleChipClick = (chip: typeof QUICK_CHIPS[number]) => {
    setGuidance(chip.guidance);
    setContentType(chip.type);
  };

  const handleRecommendedClick = (rec: RecommendedPost) => {
    acceptRec.mutate(rec.id); // Track acceptance
    setGuidance(rec.guidance);
    setContentType(rec.type);

    // Auto-select channel if recommendation suggests one
    if (rec.channel) {
      const ch = rec.channel as Channel;
      if (enabledChannels.some((c) => c.channel === ch)) {
        setSelectedChannels([ch]);
      }
    }

    // Auto-select linked data item if available
    if (rec.dataItemId && dataItems) {
      const item = dataItems.find((d) => d.id === rec.dataItemId);
      if (item) {
        setSelectedDataItem(item);
        setShowBusinessData(true);
      }
    }
  };

  const atPostLimit =
    usage && isFinite(usage.limits.posts) && usage.usage.posts >= usage.limits.posts;
  const atImageLimit =
    usage && isFinite(usage.limits.images) && usage.usage.images >= usage.limits.images;
  const atVideoLimit =
    usage && isFinite(usage.limits.videos) && usage.usage.videos >= usage.limits.videos;

  const canGenerate =
    selectedChannels.length > 0 && guidance.trim().length > 0 && !generate.isPending && !atPostLimit;

  const genError = getGenerationError(generate.error as Error | null);

  // Quota display
  const postsRemaining = usage ? (isFinite(usage.limits.posts) ? usage.limits.posts - usage.usage.posts : null) : null;
  const quotaColor = postsRemaining === null ? '' : postsRemaining <= 0 ? 'text-accent-red' : postsRemaining <= 5 ? 'text-accent-orange' : 'text-white-40';

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white-100">
          Quick Post
        </h1>
        <p className="text-white-40 mt-2">
          Create a single post in seconds. Describe your idea and we'll handle the rest.
        </p>
      </div>

      <ServiceAlert />

      {/* ── Campaign hint — subtle nudge toward Listing Campaign ──── */}
      {campaignHint && !guidance.trim() && (
        <Link
          href={(() => {
            const p = campaignHint.actionPayload;
            const params = new URLSearchParams();
            const sid = p?.listingDataItemId ?? p?.sourceId;
            if (sid) params.set('listingId', sid);
            if (p?.campaignType) params.set('type', p.campaignType);
            const qs = params.toString();
            return `/workspaces/${clientId}/listing-campaign${qs ? `?${qs}` : ''}`;
          })()}
          className="block p-3 rounded-xl bg-accent-green-110/5 border border-accent-green-110/15 hover:border-accent-green-110/30 transition-all"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-accent-green-110 shrink-0" />
            <span className="text-xs font-medium text-accent-green-110">{campaignHint.title}</span>
            <span className="ml-auto text-[10px] text-accent-green-110/60">Create campaign →</span>
          </div>
          {campaignHint.reasons.length > 0 && (
            <p className="text-[11px] text-white-40 mt-1 ml-5.5">{campaignHint.reasons[0]}</p>
          )}
        </Link>
      )}

      {/* ── Recommended for you ─────────────────────────────────────── */}
      {recommendedPosts.length > 0 && !guidance.trim() && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent-green-110" />
            <h2 className="text-sm font-semibold text-white-60 uppercase tracking-wider">
              Recommended for you
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-green-110/10 text-accent-green-110">
              AI Suggested
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {recommendedPosts.map((rec) => (
              <button
                key={rec.id}
                type="button"
                onClick={() => handleRecommendedClick(rec)}
                className="w-full text-left p-4 rounded-xl bg-gradient-to-r from-accent-green-110/5 to-transparent border border-accent-green-110/15 hover:border-accent-green-110/30 hover:bg-accent-green-110/8 transition-all group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-white-100 group-hover:text-white transition-colors">
                    {rec.title}
                  </span>
                  {rec.badge && (
                    <span className="px-1.5 py-0.5 rounded-full bg-accent-green-110/10 text-accent-green-110 text-[10px] font-medium">
                      {rec.badge}
                    </span>
                  )}
                  {rec.dataItemId && (
                    <span className="px-1.5 py-0.5 rounded-full bg-white-10 text-white-40 text-[10px] font-medium flex items-center gap-0.5">
                      <Database className="w-2.5 h-2.5" />
                      Linked data
                    </span>
                  )}
                  <span className="ml-auto text-xs text-accent-green-110 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                    Use this idea →
                  </span>
                </div>
                <p className="text-xs text-white-40">{rec.description}</p>
                {rec.reason && (
                  <p className="text-[10px] text-white-25 mt-1 italic">{rec.reason}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Main textarea */}
        <textarea
          value={guidance}
          onChange={(e) => setGuidance(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Introduce protein timing for marathon runners, mention our coaching plan..."
          rows={6}
          maxLength={4000}
          className="w-full px-4 py-3.5 rounded-xl bg-white-5 border border-white-10 text-white-100 text-base focus:outline-none focus:border-accent-green-110 focus:ring-1 focus:ring-accent-green-110/30 resize-none placeholder:text-white-30"
        />

        {/* Quick start chips */}
        {!guidance.trim() && (
          <div className="flex flex-wrap gap-2">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleChipClick(chip)}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white-5 border border-white-10 text-white-60 hover:bg-white-10 hover:text-white-100 hover:border-white-20 transition-all"
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Platform — primary selection */}
        <div>
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-2.5">
            Platform
          </label>
          {enabledChannels.length === 0 ? (
            <p className="text-sm text-white-40 italic">
              No channels enabled. Enable channels in Settings → Channels.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {enabledChannels.map((c) => {
                  const connected = connectionStatus.get(c.channel) === true;
                  return (
                    <button
                      key={c.channel}
                      type="button"
                      onClick={() => toggleChannel(c.channel)}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5',
                        selectedChannels.includes(c.channel)
                          ? 'bg-accent-green-110 text-sp-surface'
                          : 'bg-white-10 text-white-60 hover:bg-white-20'
                      )}
                    >
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full flex-shrink-0',
                          connected ? 'bg-green-400' : 'bg-yellow-400'
                        )}
                        title={connected ? 'Connected' : 'Not connected'}
                      />
                      {getChannelLabel(c.channel)}
                    </button>
                  );
                })}
              </div>

              {/* Connection warning for selected channels */}
              {selectedChannels.some((ch) => !connectionStatus.get(ch)) && (
                <StatusBanner
                  warning={`${selectedChannels.filter((ch) => !connectionStatus.get(ch)).map(getChannelLabel).join(', ')} ${selectedChannels.filter((ch) => !connectionStatus.get(ch)).length === 1 ? 'is' : 'are'} not connected. You can still create content, but you'll need to connect before publishing.`}
                />
              )}

              {/* Media requirement hints */}
              {selectedChannels.length > 0 && (
                <div className="mt-2 space-y-1">
                  {selectedChannels.map((ch) => {
                    const hint = getChannelRequirementHint(ch);
                    if (!hint) return null;
                    return (
                      <p key={ch} className="text-[11px] text-white-30">
                        {getChannelLabel(ch)}: {hint}
                      </p>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Advanced options — Content Type, Goal, Business Data */}
        <div className="border border-white-10 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-white-40 hover:bg-white-5 transition-colors"
          >
            <Layers className="w-4 h-4" />
            Advanced options
            {(contentType || goal !== 'Growth' || selectedDataItem) && (
              <span className="px-2 py-0.5 rounded-full bg-accent-green-110/15 text-accent-green-110 text-[10px] font-medium">
                Customized
              </span>
            )}
            {showAdvanced ? (
              <ChevronDown className="w-3.5 h-3.5 ml-auto" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 ml-auto" />
            )}
          </button>

          {showAdvanced && (
            <div className="px-4 pb-4 space-y-5 border-t border-white-10 pt-4">
              {/* Content Type */}
              <div>
                <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-2.5">
                  Content Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPES.map((ct) => {
                    const Icon = ct.icon;
                    return (
                      <button
                        key={ct.value}
                        type="button"
                        onClick={() => setContentType(contentType === ct.value ? null : ct.value)}
                        className={cn(
                          'px-3.5 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5',
                          contentType === ct.value
                            ? 'bg-accent-green-110 text-sp-surface'
                            : 'bg-white-10 text-white-60 hover:bg-white-20'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {ct.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Goal */}
              <div>
                <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-2.5">
                  Goal
                </label>
                <div className="flex flex-wrap gap-2">
                  {GOALS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGoal(g)}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                        goal === g
                          ? 'bg-accent-green-110 text-sp-surface'
                          : 'bg-white-10 text-white-60 hover:bg-white-20'
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Business Data Section */}
        <div className="border border-white-10 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowBusinessData((v) => !v)}
            className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-white-60 hover:bg-white-5 transition-colors"
          >
            <Database className="w-4 h-4" />
            Use my sources
            <span className="text-[10px] text-white-30">(listings, testimonials, stats, etc.)</span>
            {selectedDataItem && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-accent-green-110/15 text-accent-green-110 text-[10px] font-semibold">
                {selectedDataItem.title}
              </span>
            )}
            {showBusinessData ? (
              <ChevronDown className="w-3.5 h-3.5 ml-auto" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 ml-auto" />
            )}
          </button>

          {showBusinessData && (
            <div className="px-4 pb-4 space-y-3 border-t border-white-10">
              {/* Data item search + select */}
              <div className="mt-3">
                <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
                  {bdLabels.itemSingular}
                </label>
                {selectedDataItem ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white-5 border border-accent-green-110/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white-40 uppercase">
                        {selectedDataItem.type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm font-medium text-white-100 truncate">
                        {selectedDataItem.title}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedDataItem(null);
                        setSelectedBlueprint(null);
                      }}
                      className="p-1 rounded text-white-40 hover:text-white-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      value={dataSearch}
                      onChange={(e) => setDataSearch(e.target.value)}
                      placeholder={`Search ${bdLabels.itemPlural.toLowerCase()}...`}
                      className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
                    />
                    {dataItems && dataItems.length > 0 && (
                      <div className="mt-1.5 space-y-1 max-h-32 overflow-y-auto">
                        {dataItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSelectedDataItem(item);
                              setDataSearch('');
                            }}
                            className="w-full text-left p-2 rounded-lg bg-white-5 hover:bg-white-10 transition-colors"
                          >
                            <span className="text-[10px] text-white-40 uppercase">
                              {item.type.replace(/_/g, ' ')}
                            </span>
                            <p className="text-xs font-medium text-white-100 truncate">
                              {item.title}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Blueprint picker */}
              {selectedDataItem && (
                <div>
                  <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
                    Content Angle
                  </label>
                  {blueprints && blueprints.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {blueprints.map((bp) => (
                        <button
                          key={bp.id}
                          type="button"
                          onClick={() =>
                            setSelectedBlueprint(
                              selectedBlueprint?.id === bp.id ? null : bp
                            )
                          }
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                            selectedBlueprint?.id === bp.id
                              ? 'bg-accent-green-110 text-sp-surface'
                              : 'bg-white-10 text-white-60 hover:bg-white-20'
                          )}
                        >
                          {bp.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-white-40 italic">
                      No angles available for this type.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Inspiration — moved above generate button */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-semibold text-white-60">Need inspiration?</h3>
            </div>
            <button
              onClick={() =>
                ideasMutation.mutate(undefined, {
                  onSuccess: (data) => setIdeas(data),
                })
              }
              disabled={ideasMutation.isPending}
              className="px-3 py-1.5 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {ideasMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              Give me ideas
            </button>
          </div>

          {ideas.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {ideas.map((idea, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setGuidance(idea.description)}
                  className="w-full text-left p-3 rounded-lg bg-white-5 border border-white-10 hover:bg-white-10 hover:border-white-20 transition-all"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-white-100">{idea.title}</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-white-10 text-white-40 text-[10px] uppercase">
                      {idea.category}
                    </span>
                    <span className="text-[10px] text-white-30 ml-auto">
                      {idea.suggestedChannel}
                    </span>
                  </div>
                  <p className="text-xs text-white-40">{idea.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {atPostLimit && (
          <UpgradePrompt currentTier={usage!.tier} limitType="Post" />
        )}
        {atImageLimit && !atPostLimit && (
          <UpgradePrompt currentTier={usage!.tier} limitType="Image" />
        )}

        {genError && (
          genError.type === 'limit' || genError.type === 'tier' ? (
            <UpgradePrompt currentTier={usage?.tier ?? 'FREE'} limitType="Post" />
          ) : genError.type === 'budget' || genError.type === 'service' ? (
            <StatusBanner info={genError.message} />
          ) : genError.type === 'throttled' ? (
            <StatusBanner warning={genError.message} />
          ) : (
            <StatusBanner error={genError.message} />
          )
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="flex-1 py-3.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-base flex items-center justify-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generate.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Create Post
              </>
            )}
          </button>
          {postsRemaining !== null && (
            <span className={cn('text-xs font-mono ml-3 whitespace-nowrap', quotaColor)}>
              {Math.max(0, postsRemaining)}/{usage!.limits.posts} posts left
            </span>
          )}
        </div>

        <p className="text-center text-xs text-white-30">
          Ctrl+Enter to generate
        </p>

        {/* Series Builder */}
        <div className="border-t border-white-10 pt-4 mt-2">
          <button
            onClick={() => setShowSeries((v) => !v)}
            className="flex items-center gap-2 text-xs text-white-40 hover:text-white-60 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            {showSeries ? 'Hide series builder' : 'Or create a quick series (2-7 related posts)'}
            <ChevronDown className={cn('w-3 h-3 transition-transform', showSeries && 'rotate-180')} />
          </button>

          {showSeries && (
            <div className="mt-3 space-y-3 p-3 rounded-lg bg-white-5 border border-white-10">
              <div>
                <label className="text-xs text-white-40 mb-1 block">Series type</label>
                <select
                  value={seriesTemplate}
                  onChange={(e) => setSeriesTemplate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
                  style={{ colorScheme: 'dark' }}
                >
                  {(seriesTemplatesData?.templates ?? []).map((t: SeriesTemplate) => (
                    <option key={t.id} value={t.id}>{t.name} — {t.description}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-white-40 mb-1 block">Number of parts</label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 7].map((n) => (
                    <button
                      key={n}
                      onClick={() => setSeriesParts(n)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                        seriesParts === n
                          ? 'bg-accent-green-110/20 text-accent-green-110 border border-accent-green-110/30'
                          : 'bg-white-5 text-white-60 border border-white-10 hover:bg-white-10'
                      )}
                    >
                      {n} parts
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerateSeries}
                disabled={!guidance.trim() || selectedChannels.length === 0 || generateSeries.isPending}
                className="w-full py-2.5 rounded-lg bg-purple-500/20 text-purple-400 font-medium text-sm flex items-center justify-center gap-2 hover:bg-purple-500/30 transition-colors disabled:opacity-50 border border-purple-500/20"
              >
                {generateSeries.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating series...
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    Create {seriesParts}-Part Series
                  </>
                )}
              </button>

              {generateSeries.isSuccess && (
                <p className="text-xs text-accent-green-110 font-medium">
                  Series created — {generateSeries.data.totalParts} drafts generated
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
