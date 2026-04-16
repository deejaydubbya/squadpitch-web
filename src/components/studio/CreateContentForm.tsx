'use client';

import { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useGenerateContent,
  useChannelSettings,
  useMediaProfile,
  useGenerateMedia,
  useGenerateVideo,
  useGenerateIdeas,
  useDataItems,
  useBlueprints,
  useBusinessDataLabels,
  useDashboardRecommendations,
  type Channel,
  type Draft,
  type ContentIdea,
  type WorkspaceDataItem,
  type ContentBlueprint,
} from '@/hooks/useSquadpitch';
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
] as const;

type ContentType = typeof CONTENT_TYPES[number]['value'];

const QUICK_CHIPS = [
  { label: 'Just listed post', guidance: 'Create a "Just Listed" post highlighting a new property listing with key features and excitement', type: 'listing' as ContentType },
  { label: 'Price drop alert', guidance: 'Create a price reduction alert post that creates urgency and highlights the new value', type: 'listing' as ContentType },
  { label: 'Client testimonial', guidance: 'Create a social proof post featuring a client testimonial that builds trust and credibility', type: 'testimonial' as ContentType },
  { label: 'Market update', guidance: 'Create a market update post sharing current trends, data, and insights that demonstrate expertise', type: 'market_update' as ContentType },
  { label: 'Open house announcement', guidance: 'Create an open house announcement post with date, time, address, and compelling reasons to attend', type: 'listing' as ContentType },
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
  const { data: mediaProfile } = useMediaProfile(clientId);
  const { data: recommendations } = useDashboardRecommendations(clientId);
  const generate = useGenerateContent();
  const generateMedia = useGenerateMedia(clientId);
  const generateVideo = useGenerateVideo(clientId);
  const ideasMutation = useGenerateIdeas(clientId);

  const { data: usage } = useUsage();

  const [guidance, setGuidance] = useState(initialGuidance ?? '');
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);
  const [goal, setGoal] = useState<typeof GOALS[number]>('Growth');
  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);

  // Business data state
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

  // ── Build recommended posts from real data ────────────────────────────
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
  }

  const recommendedPosts = useMemo<RecommendedPost[]>(() => {
    const items: RecommendedPost[] = [];
    const summary = recommendations?.summary;
    const recs = recommendations?.recommendations ?? [];

    // ── Priority 1: Backend recommendations with specific data (milestones, listings, testimonials) ──
    // These have real item names, addresses, quotes linked via metadata.dataItemId
    const contentRecs = recs.filter(
      (r) => r.action === 'generate_post' && r.metadata?.guidance
    );

    // Map backend category → frontend content type
    const typeMap: Record<string, ContentType> = {
      milestone_post: 'personal',
      listing_post: 'listing',
      featured_property: 'listing',
      client_testimonial: 'testimonial',
    };

    // Priority badges by recommendation type
    const badgeMap: Record<string, string> = {
      re_milestone_post: 'Just Sold',
      re_listing_facebook: 'New listing',
      re_listing_instagram: 'New listing',
      re_testimonial_post: 'Social proof',
      re_no_recent_listing: 'Timely',
    };

    for (const rec of contentRecs) {
      if (items.length >= 3) break;
      const templateType = rec.metadata?.templateType ?? '';
      items.push({
        id: rec.id,
        title: rec.title,
        description: rec.description,
        guidance: rec.metadata?.guidance ?? rec.description,
        type: typeMap[templateType] ?? 'educational',
        badge: badgeMap[rec.id],
        dataItemId: rec.metadata?.dataItemId,
        channel: rec.metadata?.channel,
      });
    }

    // ── Priority 2: Specific unused items from summary.topUnusedItems ──
    const topUnused = summary?.topUnusedItems;

    if (topUnused && items.length < 3) {
      for (const item of topUnused) {
        if (items.length >= 3) break;
        if (items.some((i) => i.dataItemId === item.id)) continue;

        if (item.type === 'MILESTONE') {
          const label = item.address || item.achievement || item.title;
          items.push({
            id: `unused-milestone-${item.id}`,
            title: `Celebrate your sale at ${label}`,
            description: 'Create a Just Sold post to build credibility and attract new clients',
            guidance: `Create a "Just Sold" celebration post for the property at ${label}. Emphasize success and invite new clients.`,
            type: 'personal',
            badge: 'Just Sold',
            dataItemId: item.id,
          });
        } else if (item.type === 'TESTIMONIAL') {
          const authorLabel = item.author ? `${item.author}'s review` : 'a client review';
          const quoteSnippet = item.quote
            ? `"${item.quote.length > 60 ? item.quote.slice(0, 57) + '...' : item.quote}"`
            : '';
          items.push({
            id: `unused-testimonial-${item.id}`,
            title: `Share ${authorLabel}`,
            description: quoteSnippet || 'Turn client feedback into a trust-building post',
            guidance: item.quote
              ? `Create a social proof post featuring this client review: "${item.quote}"${item.author ? ` from ${item.author}` : ''}. Build trust and encourage inquiries.`
              : 'Create a testimonial post using a real client review. Quote accurately and build trust.',
            type: 'testimonial',
            badge: 'Social proof',
            dataItemId: item.id,
          });
        } else if (item.type === 'CUSTOM') {
          const label = item.address || item.title;
          items.push({
            id: `unused-listing-${item.id}`,
            title: `Create a post for ${label}`,
            description: 'This listing hasn\'t been used for content yet',
            guidance: `Create a high-performing property post for ${label}. Highlight key features and encourage DMs for showings.`,
            type: 'listing',
            badge: 'New data',
            dataItemId: item.id,
          });
        }
      }
    }

    // ── Priority 3: Cadence fallback ──
    const published = summary?.publishedThisWeek ?? 0;
    if (published < 5 && items.length < 3) {
      items.push({
        id: 'cadence-post',
        title: published === 0 ? 'Start your week strong' : 'Keep your momentum going',
        description: published === 0
          ? "You haven't posted this week — stay visible with fresh content"
          : `${published}/5 posts this week — create more to hit your target`,
        guidance: 'Create an engaging post that demonstrates expertise and drives conversation with your audience',
        type: 'educational',
        badge: 'Cadence',
      });
    }

    // ── Priority 4: General template recommendations ──
    if (items.length < 3) {
      const templateRecs = recs.filter(
        (r) => r.category === 'content' && !items.some((i) => i.id === r.id)
      );
      for (const rec of templateRecs) {
        if (items.length >= 3) break;
        items.push({
          id: rec.id,
          title: rec.title,
          description: rec.description,
          guidance: rec.metadata?.guidance ?? rec.description,
          type: 'educational',
        });
      }
    }

    return items.slice(0, 3);
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
          What do you want to post about?
        </h1>
        <p className="text-white-40 mt-2">
          Describe your idea and we'll generate on-brand content ready to publish.
        </p>
      </div>

      <ServiceAlert />

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

        {/* Platform pills */}
        <div>
          <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-2.5">
            Platform
          </label>
          {enabledChannels.length === 0 ? (
            <p className="text-sm text-white-40 italic">
              No channels enabled. Enable channels in Settings → Media.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {enabledChannels.map((c) => (
                <button
                  key={c.channel}
                  type="button"
                  onClick={() => toggleChannel(c.channel)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    selectedChannels.includes(c.channel)
                      ? 'bg-accent-green-110 text-sp-surface'
                      : 'bg-white-10 text-white-60 hover:bg-white-20'
                  )}
                >
                  {c.channel}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Goal pills */}
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

        {/* Business Data Section */}
        <div className="border border-white-10 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowBusinessData((v) => !v)}
            className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-white-60 hover:bg-white-5 transition-colors"
          >
            <Database className="w-4 h-4" />
            Use my data
            <span className="text-[10px] text-white-30">(listings, testimonials, etc.)</span>
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
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Generate 3 Variations
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
      </div>
    </div>
  );
}
