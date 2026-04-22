'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  Database,
  ChevronDown,
  ChevronRight,
  X,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useChannelSettings,
  useRecommendations,
  useAcceptRecommendation,
  useDataItems,
  useBlueprints,
  useBusinessDataLabels,
  type Channel,
  type UnifiedRecommendation,
  type WorkspaceDataItem,
  type ContentBlueprint,
} from '@/hooks/useSquadpitch';
import { getChannelLabel } from '@/lib/channelRegistry';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';
import { GOALS, CONTENT_TYPES, QUICK_CHIPS, type ContentType } from './quickPostConstants';

interface Props {
  session: AssistantSessionState;
  clientId: string;
  onSelection: (action: AssistantAction, confirmationText: string) => void;
}

export function QuickPostConfigCard({ session, clientId, onSelection }: Props) {
  const bdLabels = useBusinessDataLabels(clientId);
  const { data: channels } = useChannelSettings(clientId);
  const { data: recommendations } = useRecommendations(clientId, 'create_content');
  const acceptRec = useAcceptRecommendation(clientId);

  const [guidance, setGuidance] = useState(session.quickPostGuidance ?? '');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(session.quickPostChannel);
  const [goal, setGoal] = useState<typeof GOALS[number] | null>(session.quickPostGoal);
  const [contentType, setContentType] = useState<ContentType | null>(
    (session.quickPostContentType as ContentType) ?? null
  );

  // Data source picker state
  const [showDataSource, setShowDataSource] = useState(false);
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

  const enabledChannels = useMemo(
    () => channels?.filter((c) => c.isEnabled) ?? [],
    [channels]
  );

  // Auto-select first enabled channel if none
  useEffect(() => {
    if (!selectedChannel && enabledChannels.length > 0) {
      setSelectedChannel(enabledChannels[0].channel);
    }
  }, [selectedChannel, enabledChannels]);

  // Build recommended posts
  interface RecommendedPost {
    id: string;
    title: string;
    description: string;
    guidance: string;
    type: ContentType;
    dataItemId?: string;
    channel?: string;
  }

  const typeMap: Record<string, ContentType> = {
    listing_post: 'listing',
    milestone_post: 'personal',
    testimonial_post: 'testimonial',
    engagement_post: 'educational',
    scheduling_action: 'educational',
    growth_post: 'growth',
  };

  const recommendedPosts = useMemo<RecommendedPost[]>(() => {
    const recs = recommendations?.recommendations ?? [];
    if (recs.length === 0) return [];
    return recs
      .filter((r: UnifiedRecommendation) => r.type !== 'campaign_hint')
      .slice(0, 3)
      .map((rec: UnifiedRecommendation) => ({
        id: rec.id,
        title: rec.title,
        description: rec.description,
        guidance: rec.actionPayload?.guidance ?? rec.description,
        type: typeMap[rec.type] ?? 'educational',
        dataItemId: rec.actionPayload?.dataItemId ?? rec.sourceId ?? undefined,
        channel: rec.actionPayload?.channel ?? rec.suggestedChannel ?? undefined,
      }));
  }, [recommendations]);

  const handleRecommendedClick = (rec: RecommendedPost) => {
    acceptRec.mutate(rec.id);
    setGuidance(rec.guidance);
    setContentType(rec.type);
    if (rec.channel) {
      const ch = rec.channel as Channel;
      if (enabledChannels.some((c) => c.channel === ch)) {
        setSelectedChannel(ch);
      }
    }
    if (rec.dataItemId && dataItems) {
      const item = dataItems.find((d) => d.id === rec.dataItemId);
      if (item) {
        setSelectedDataItem(item);
        setShowDataSource(true);
      }
    }
  };

  const handleChipClick = (chip: typeof QUICK_CHIPS[number]) => {
    setGuidance(chip.guidance);
    setContentType(chip.type);
  };

  const canGenerate = !!selectedChannel && guidance.trim().length > 0;

  const handleGenerate = () => {
    if (!canGenerate || !selectedChannel) return;

    // Dispatch all config actions
    const actions: AssistantAction[] = [
      { type: 'SET_QUICK_POST_GUIDANCE', payload: guidance.trim() },
      { type: 'SET_QUICK_POST_CHANNEL', payload: selectedChannel },
    ];

    if (goal) {
      actions.push({ type: 'SET_QUICK_POST_GOAL', payload: goal });
    }
    if (contentType) {
      actions.push({ type: 'SET_QUICK_POST_CONTENT_TYPE', payload: contentType });
    }
    if (selectedDataItem) {
      actions.push({ type: 'SET_QUICK_POST_DATA_ITEM', payload: { id: selectedDataItem.id, title: selectedDataItem.title } });
    }
    if (selectedBlueprint) {
      actions.push({ type: 'SET_QUICK_POST_BLUEPRINT', payload: selectedBlueprint.id });
    }

    // Dispatch all non-channel actions first via onSelection with empty confirm
    for (const action of actions) {
      if (action.type !== 'SET_QUICK_POST_CHANNEL') {
        onSelection(action, '');
      }
    }

    // The channel action advances the workflow
    const summaryParts = [getChannelLabel(selectedChannel)];
    if (contentType) {
      const ct = CONTENT_TYPES.find((c) => c.value === contentType);
      summaryParts.push(ct?.label ?? contentType);
    }
    if (goal) summaryParts.push(goal);

    onSelection(
      { type: 'SET_QUICK_POST_CHANNEL', payload: selectedChannel },
      `Quick post: ${summaryParts.join(' · ')}`
    );
  };

  return (
    <div className="space-y-4">
      {/* Recommendations */}
      {recommendedPosts.length > 0 && !guidance.trim() && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-accent-green-110" />
            <span className="text-[11px] font-medium text-white-40 uppercase tracking-wider">
              Recommended for you
            </span>
          </div>
          <div className="space-y-1.5">
            {recommendedPosts.map((rec) => (
              <button
                key={rec.id}
                type="button"
                onClick={() => handleRecommendedClick(rec)}
                className="w-full text-left p-2.5 rounded-lg bg-accent-green-110/5 border border-accent-green-110/15 hover:bg-accent-green-110/10 hover:border-accent-green-110/25 transition-all"
              >
                <div className="flex items-start gap-2">
                  {rec.dataItemId && <Database className="w-3.5 h-3.5 text-accent-green-110 mt-0.5 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-accent-green-110 truncate">{rec.title}</p>
                    <p className="text-[11px] text-white-40 line-clamp-1">{rec.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Prompt textarea */}
      <textarea
        value={guidance}
        onChange={(e) => setGuidance(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canGenerate) {
            e.preventDefault();
            handleGenerate();
          }
        }}
        placeholder="e.g. Introduce protein timing for marathon runners, mention our coaching plan..."
        rows={4}
        maxLength={4000}
        className="w-full px-3 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 focus:ring-1 focus:ring-accent-green-110/30 resize-none placeholder:text-white-30"
      />

      {/* Quick Angle Chips */}
      {!guidance.trim() && (
        <div className="flex flex-wrap gap-1.5">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleChipClick(chip)}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white-5 border border-white-10 text-white-60 hover:bg-white-10 hover:text-white-100 hover:border-white-20 transition-all"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Content Type */}
      <div>
        <label className="block text-[11px] font-medium text-white-40 uppercase tracking-wider mb-2">
          Content Type
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CONTENT_TYPES.map((ct) => {
            const Icon = ct.icon;
            return (
              <button
                key={ct.value}
                type="button"
                onClick={() => setContentType(contentType === ct.value ? null : ct.value)}
                className={cn(
                  'px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1',
                  contentType === ct.value
                    ? 'bg-accent-green-110 text-sp-surface'
                    : 'bg-white-10 text-white-60 hover:bg-white-20'
                )}
              >
                <Icon className="w-3 h-3" />
                {ct.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Platform */}
      <div>
        <label className="block text-[11px] font-medium text-white-40 uppercase tracking-wider mb-2">
          Platform
        </label>
        {enabledChannels.length === 0 ? (
          <p className="text-xs text-white-40 italic">No channels enabled.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {enabledChannels.map((c) => (
              <button
                key={c.channel}
                type="button"
                onClick={() => setSelectedChannel(c.channel)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  selectedChannel === c.channel
                    ? 'bg-accent-green-110 text-sp-surface'
                    : 'bg-white-10 text-white-60 hover:bg-white-20'
                )}
              >
                {getChannelLabel(c.channel)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Goal */}
      <div>
        <label className="block text-[11px] font-medium text-white-40 uppercase tracking-wider mb-2">
          Goal
        </label>
        <div className="flex flex-wrap gap-1.5">
          {GOALS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGoal(goal === g ? null : g)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
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

      {/* Data Source (collapsed) */}
      <div className="border border-white-10 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDataSource((v) => !v)}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-white-40 hover:bg-white-5 transition-colors"
        >
          <Database className="w-3.5 h-3.5" />
          Use my data
          {selectedDataItem && (
            <span className="px-1.5 py-0.5 rounded-full bg-accent-green-110/15 text-accent-green-110 text-[10px] font-medium">
              {selectedDataItem.title}
            </span>
          )}
          {showDataSource ? (
            <ChevronDown className="w-3 h-3 ml-auto" />
          ) : (
            <ChevronRight className="w-3 h-3 ml-auto" />
          )}
        </button>

        {showDataSource && (
          <div className="px-3 pb-3 space-y-3 border-t border-white-10 pt-3">
            {selectedDataItem ? (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white-5 border border-accent-green-110/30">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-white-40 uppercase">
                    {selectedDataItem.type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs font-medium text-white-100 truncate">
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
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <>
                <input
                  value={dataSearch}
                  onChange={(e) => setDataSearch(e.target.value)}
                  placeholder={`Search ${bdLabels.itemPlural.toLowerCase()}...`}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
                />
                {dataItems && dataItems.length > 0 && (
                  <div className="space-y-1 max-h-28 overflow-y-auto">
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

            {/* Blueprint picker */}
            {selectedDataItem && blueprints && blueprints.length > 0 && (
              <div>
                <label className="block text-[10px] font-medium text-white-40 uppercase tracking-wider mb-1.5">
                  Content Angle
                </label>
                <div className="flex flex-wrap gap-1">
                  {blueprints.map((bp) => (
                    <button
                      key={bp.id}
                      type="button"
                      onClick={() =>
                        setSelectedBlueprint(selectedBlueprint?.id === bp.id ? null : bp)
                      }
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors',
                        selectedBlueprint?.id === bp.id
                          ? 'bg-accent-green-110 text-sp-surface'
                          : 'bg-white-10 text-white-60 hover:bg-white-20'
                      )}
                    >
                      {bp.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="w-full py-2.5 rounded-lg bg-accent-green-110 text-sp-surface font-semibold text-sm flex items-center justify-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Wand2 className="w-4 h-4" />
        Generate Post
      </button>

      {!canGenerate && guidance.trim().length === 0 && (
        <p className="text-center text-[10px] text-white-25">
          Enter a prompt or pick a suggestion to get started
        </p>
      )}
    </div>
  );
}
