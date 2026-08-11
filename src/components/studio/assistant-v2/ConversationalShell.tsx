'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  useClient,
  useContentPreferences,
  useDataItems,
  useProperties,
} from '@/hooks/useSquadpitch';
import { useConversationalAssistant } from '@/hooks/useConversationalAssistant';
import { MessageThread } from './MessageThread';
import { AssistantCommandBar } from './AssistantCommandBar';
import { SummaryPanel } from './SummaryPanel';
import type { AssistantAction, AssistantCampaignType } from '@/lib/assistant/types';
import type { Channel } from '@/hooks/useSquadpitch';
import { getDefaultCampaignTypeForSource } from '@/lib/assistant/contentPreferences';
import { DesktopRecommendedNotice } from '@/components/mobile/ResponsivePrimitives';

// Prefill payload passed in by the /create route from the parsed
// query contract (see lib/assistant/createRouteParams.ts). Every
// field is optional — applied in order, with safe no-ops when a
// value is absent. Source-by-id (`sourceId`) requires an async
// lookup against useProperties/useDataItems; everything else
// applies synchronously on mount.
export interface AssistantPrefill {
  mode?: 'campaign' | 'quick_post';
  // URL-02: 'url' added so deep links like
  // /create?intent=campaign&sourceType=url&sourceUrl=https://…
  // open the assistant straight into the URL-intake card.
  sourceType?: 'property' | 'data_item' | 'idea' | 'url';
  /** WorkspaceDataItem id when sourceType=property or data_item */
  sourceId?: string;
  /** URL-02: the URL to analyze when sourceType=url. */
  sourceUrl?: string;
  /** Freeform idea text — set as campaignIdea (campaign) or quickPostGuidance (single post) */
  prompt?: string;
  campaignType?: string;
  /** Comma-separated. Each token is upper-cased and submitted as-is — invalid channels are dropped client-side. */
  channel?: string;
  guidance?: string;
}

interface Props {
  clientId: string;
  // When set, the shell auto-applies the prefill on mount as if the
  // user had chosen those values from the cards. Each step is guarded
  // so a user who manually overrides mid-session isn't forced back.
  initialPrefill?: AssistantPrefill;
  /**
   * Deprecated — kept for back-compat with the original signature.
   * New callers should use `initialPrefill={{ mode }}` instead.
   */
  initialMode?: 'campaign' | 'quick_post';
}

const VALID_CHANNELS = new Set<Channel>([
  'INSTAGRAM',
  'TIKTOK',
  'X',
  'LINKEDIN',
  'LINKEDIN_ORGANIZATION_PAGE',
  'FACEBOOK',
  'YOUTUBE',
  'PINTEREST',
  'THREADS',
  'REDDIT',
]);

function parseChannelList(raw: string | undefined): Channel[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is Channel => VALID_CHANNELS.has(s as Channel));
}

export function ConversationalShell({
  clientId,
  initialPrefill,
  initialMode,
}: Props) {
  // Coalesce the legacy `initialMode` prop into the prefill shape so
  // downstream logic only has to look at one input.
  const prefill: AssistantPrefill | undefined = initialPrefill
    ? initialPrefill
    : initialMode
      ? { mode: initialMode }
      : undefined;

  const { data: client } = useClient(clientId);
  const {
    session,
    conversation,
    summary,
    ready,
    sendMessage,
    handleCardSelection,
    requestRevision,
    reset,
    resetToMode,
    postAssistantText,
  } = useConversationalAssistant(clientId, client?.industryKey ?? undefined);

  // ── Synchronous prefill: mode + source type + idea/guidance + campaign type + channels
  //
  // Fires once per mount. Skips when the session already has a mode
  // (a user who hits a deep-link mid-session isn't reset). All
  // applied via one batched handleCardSelection call so the
  // dependency-invalidation logic + fieldMeta updates run cleanly
  // in order.
  const appliedRef = useRef(false);
  useEffect(() => {
    if (appliedRef.current) return;
    if (!prefill?.mode) return;
    if (session.mode) return;
    appliedRef.current = true;

    const actions: AssistantAction[] = [
      { type: 'SET_MODE', payload: prefill.mode },
    ];

    if (prefill.mode === 'campaign') {
      if (prefill.sourceType) {
        actions.push({ type: 'SET_CAMPAIGN_SOURCE_TYPE', payload: prefill.sourceType });
      }
      // Idea text only applies when source=idea. Setting it here
      // avoids needing an extra round-trip through the picker.
      if (prefill.sourceType === 'idea' && prefill.prompt && prefill.prompt.trim()) {
        actions.push({ type: 'SET_CAMPAIGN_IDEA', payload: prefill.prompt.trim() });
      }
      // URL-02 — sourceType=url + sourceUrl. The URL card
      // auto-fires analyze on mount when campaignSourceUrl is set,
      // so we don't need to kick anything else off here.
      if (
        prefill.sourceType === 'url' &&
        prefill.sourceUrl &&
        prefill.sourceUrl.trim()
      ) {
        actions.push({
          type: 'SET_CAMPAIGN_SOURCE_URL',
          payload: prefill.sourceUrl.trim(),
        });
      }
    } else if (prefill.mode === 'quick_post') {
      // For single post, the assistant's source enum is 'data' | 'idea'
      // (property is just a data-item picker with a type filter, not
      // its own source enum value). Map content_asset → 'data' and
      // property → 'data' too; the picker UI does the per-type
      // filtering further down.
      if (prefill.sourceType === 'idea') {
        actions.push({ type: 'SET_QUICK_POST_SOURCE', payload: 'idea' });
      } else if (prefill.sourceType === 'property' || prefill.sourceType === 'data_item') {
        actions.push({ type: 'SET_QUICK_POST_SOURCE', payload: 'data' });
      }
      // Idea text becomes quickPostGuidance. Prefer prompt; fall
      // back to guidance for back-compat with the old ?input= and
      // ?guidance= params.
      const guidanceText = (prefill.prompt ?? prefill.guidance ?? '').trim();
      if (guidanceText) {
        actions.push({ type: 'SET_QUICK_POST_GUIDANCE', payload: guidanceText });
      }
    }

    if (prefill.campaignType) {
      // Cast — backend + frontend accept any string here; invalid
      // values will fall through to the picker as needed.
      actions.push({
        type: 'SET_CAMPAIGN_TYPE',
        payload: prefill.campaignType as AssistantCampaignType,
      });
    }

    const channels = parseChannelList(prefill.channel);
    if (channels.length > 0 && prefill.mode === 'campaign') {
      actions.push({ type: 'SET_CHANNELS', payload: channels });
    } else if (channels.length === 1 && prefill.mode === 'quick_post') {
      // Single post only takes one channel.
      actions.push({ type: 'SET_QUICK_POST_CHANNEL', payload: channels[0] });
    }

    const summary = describePrefillForConfirmation(prefill);
    handleCardSelection(actions, summary);
  }, [prefill, session.mode, handleCardSelection]);

  // ── Async sourceId resolution
  //
  // Property and content-asset sources require a lookup against the
  // workspace data items. We fetch the relevant list, find the
  // requested item once it lands, and dispatch the matching action.
  // On miss (id not found after load), we leave the source unpicked
  // so the assistant naturally prompts via its source picker — the
  // failure mode is graceful, not crashy.
  const needsProperty =
    prefill?.sourceType === 'property' && !!prefill?.sourceId;
  const needsDataItem =
    prefill?.sourceType === 'data_item' && !!prefill?.sourceId;

  const { data: properties } = useProperties(needsProperty ? clientId : '');
  const { data: dataItems } = useDataItems(needsDataItem ? clientId : '');

  const [sourceResolved, setSourceResolved] = useState(false);
  useEffect(() => {
    if (sourceResolved) return;
    if (!appliedRef.current) return;
    if (!prefill?.sourceType || !prefill?.sourceId) {
      setSourceResolved(true);
      return;
    }
    // Don't clobber a user pick that's already happened post-mount.
    if (
      session.selectedPropertyId ||
      session.campaignDataItemId ||
      session.quickPostDataItemId
    ) {
      setSourceResolved(true);
      return;
    }

    if (prefill.sourceType === 'property') {
      if (!properties) return; // still loading
      const item = properties.find((p) => p.id === prefill.sourceId);
      setSourceResolved(true);
      if (!item) {
        // Graceful miss — the source picker will appear naturally
        // because campaignSourceType=property is set but
        // selectedPropertyId is not. Post a one-line notice so the
        // user knows why the deep-link didn't pre-populate.
        postAssistantText("I couldn't find that listing, so choose one below.");
        return;
      }
      handleCardSelection(
        {
          type: 'SET_PROPERTY',
          payload: { id: item.id, data: (item.dataJson as Record<string, unknown>) ?? {} },
        },
        `Property: ${item.title}`,
      );
    } else if (prefill.sourceType === 'data_item') {
      if (!dataItems) return;
      const item = dataItems.find((d) => d.id === prefill.sourceId);
      setSourceResolved(true);
      if (!item) {
        // Same graceful-miss pattern as the property branch.
        postAssistantText("I couldn't find that content asset, so choose one below.");
        return;
      }
      if (prefill.mode === 'campaign') {
        handleCardSelection(
          {
            type: 'SET_CAMPAIGN_DATA_ITEM',
            payload: {
              id: item.id,
              title: item.title,
              itemType: item.type,
              data: (item.dataJson as Record<string, unknown>) ?? {},
            },
          },
          `Asset: ${item.title}`,
        );
      } else if (prefill.mode === 'quick_post') {
        handleCardSelection(
          {
            type: 'SET_QUICK_POST_DATA_ITEM',
            payload: { id: item.id, title: item.title },
          },
          `Data: ${item.title}`,
        );
      }
    } else {
      setSourceResolved(true);
    }
  }, [
    prefill,
    properties,
    dataItems,
    sourceResolved,
    session.selectedPropertyId,
    session.campaignDataItemId,
    session.quickPostDataItemId,
    handleCardSelection,
    postAssistantText,
  ]);

  // ── ContentPreferences defaults
  //
  // Seeds the session with the user's saved preferences once
  // they've loaded. Each preference uses its own one-shot ref so
  // the effect can run multiple times as the session evolves
  // (mode picks → source pick → channel pick) without re-applying
  // a default that's already been set or that the user explicitly
  // cleared. URL prefill, prior user picks, and mid-session edits
  // all win over the saved defaults.
  const { data: preferences } = useContentPreferences(clientId);
  const appliedDefaultMode = useRef(false);
  const appliedDefaultSource = useRef(false);
  const appliedCampaignType = useRef(false);
  const appliedCampaignChannels = useRef(false);
  const appliedCadence = useRef(false);
  const appliedQuickPostChannel = useRef(false);
  const appliedContentBucket = useRef(false);
  useEffect(() => {
    if (!preferences) return;
    // Don't compete with the URL-prefill effect — wait until it
    // has already applied any synchronous fields it owns.
    if (prefill?.mode && !appliedRef.current) return;

    const actions: AssistantAction[] = [];
    const notes: string[] = [];

    // ── Default content mode
    //
    // Fires once on first land when neither URL intent nor a
    // user pick has set a mode yet. We deliberately do NOT
    // override an already-set mode (URL prefill or user click
    // wins). The user can still hit "Start over" to pick a
    // different mode.
    if (
      !appliedDefaultMode.current &&
      !session.mode &&
      !prefill?.mode &&
      preferences.defaultContentMode
    ) {
      appliedDefaultMode.current = true;
      // The Create Preferences setting uses 'campaign' | 'single_post';
      // the session-level AssistantMode is 'campaign' | 'quick_post'.
      // Map across the boundary.
      const sessionMode =
        preferences.defaultContentMode === 'campaign' ? 'campaign' : 'quick_post';
      actions.push({ type: 'SET_MODE', payload: sessionMode });
      notes.push(
        `Mode: ${sessionMode === 'campaign' ? 'Campaign' : 'Single Post'}`,
      );
    }

    // The remaining branches only make sense once a mode exists.
    // Apply the SET_MODE side effect immediately so the rest of
    // the effect (which keys off session.mode) can run on the
    // next render rather than waiting another tick.
    if (!session.mode && actions.length === 0) return;

    // ── Default source
    //
    // After mode is set, pre-pick the source if the user has
    // configured one and hasn't already chosen.
    if (
      !appliedDefaultSource.current &&
      preferences.defaultSource &&
      session.mode
    ) {
      if (session.mode === 'campaign' && !session.campaignSourceType) {
        appliedDefaultSource.current = true;
        actions.push({
          type: 'SET_CAMPAIGN_SOURCE_TYPE',
          payload: preferences.defaultSource,
        });
        notes.push(`Source: ${preferences.defaultSource}`);
      } else if (session.mode === 'quick_post' && !session.quickPostSource) {
        // Quick post source enum is 'data' | 'idea' — map
        // property and content_asset preferences both to 'data'
        // (the picker further down filters by item type).
        const quickPostSource =
          preferences.defaultSource === 'idea' ? 'idea' : 'data';
        appliedDefaultSource.current = true;
        actions.push({ type: 'SET_QUICK_POST_SOURCE', payload: quickPostSource });
        notes.push(`Source: ${quickPostSource}`);
      }
    }

    // ── Campaign mode
    if (session.mode === 'campaign') {
      // Per-source default campaign type — fires once the source
      // picker has resolved so we know which slot of the packed
      // map to read.
      if (
        !appliedCampaignType.current &&
        session.campaignSourceType &&
        !session.campaignType
      ) {
        const defaultType = getDefaultCampaignTypeForSource(
          preferences.defaultCampaignType,
          session.campaignSourceType,
        );
        if (defaultType) {
          appliedCampaignType.current = true;
          actions.push({
            type: 'SET_CAMPAIGN_TYPE',
            payload: defaultType as AssistantCampaignType,
          });
          notes.push(`Campaign type: ${defaultType}`);
        }
      }

      // Preferred channels — only when the user hasn't typed any.
      if (
        !appliedCampaignChannels.current &&
        session.channels.length === 0 &&
        preferences.preferredChannels.length > 0
      ) {
        appliedCampaignChannels.current = true;
        actions.push({
          type: 'SET_CHANNELS',
          payload: preferences.preferredChannels,
          source: 'auto',
        });
        notes.push(`Channels: ${preferences.preferredChannels.join(', ')}`);
      }

      // Cadence — stored in memory.preferredPreset so
      // ScheduleReviewCard reads it on mount.
      if (
        !appliedCadence.current &&
        preferences.preferredCampaignCadence &&
        !session.memory.preferredPreset
      ) {
        appliedCadence.current = true;
        actions.push({
          type: 'SET_PREFERRED_PRESET',
          payload: preferences.preferredCampaignCadence,
        });
      }
    }

    // ── Quick post mode
    if (session.mode === 'quick_post') {
      // Default channel — explicit quick-post default wins over the
      // first preferred channel.
      if (!appliedQuickPostChannel.current && !session.quickPostChannel) {
        const channel =
          preferences.defaultQuickPostChannel ??
          preferences.preferredChannels[0] ??
          null;
        if (channel) {
          appliedQuickPostChannel.current = true;
          actions.push({ type: 'SET_QUICK_POST_CHANNEL', payload: channel });
          notes.push(`Channel: ${channel}`);
        }
      }

      // Content bucket — soft hint for idea-based quick posts.
      if (
        !appliedContentBucket.current &&
        session.quickPostSource === 'idea' &&
        !session.quickPostContentType &&
        preferences.defaultContentBucket
      ) {
        appliedContentBucket.current = true;
        actions.push({
          type: 'SET_QUICK_POST_CONTENT_TYPE',
          payload: preferences.defaultContentBucket,
        });
        notes.push(`Content bucket: ${preferences.defaultContentBucket}`);
      }
    }

    if (actions.length === 0) return;
    handleCardSelection(
      actions,
      `Applied your defaults — ${notes.join(' · ')}`,
    );
  }, [
    preferences,
    session.mode,
    session.campaignSourceType,
    session.campaignType,
    session.channels.length,
    session.memory.preferredPreset,
    session.quickPostChannel,
    session.quickPostContentType,
    session.quickPostSource,
    prefill?.mode,
    handleCardSelection,
  ]);
  // Note: `session.mode` and `session.quickPostSource` appear in
  // the deps above, so the SET_MODE / SET_QUICK_POST_SOURCE
  // branches re-evaluate naturally as the session evolves — no
  // extra deps needed for the Plan 07 additions.

  return (
    <div className="flex h-full overflow-hidden lg:h-screen">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full min-h-0">
        {/* Header — fixed */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white-10">
          <h1 className="text-base font-semibold text-white-100">
            {session.mode === 'campaign' ? 'Campaign' : session.mode === 'quick_post' ? 'Single Post' : 'Create'}
          </h1>
          {session.mode && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Start over? This will clear your current progress.')) {
                  reset();
                }
              }}
              className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-white-40 transition-colors hover:bg-white-5 hover:text-white-100"
            >
              <RotateCcw className="w-3 h-3" />
              Start over
            </button>
          )}
        </div>

        {session.mode === 'campaign' && (
          <div className="shrink-0 px-3 pt-3 lg:hidden">
            <DesktopRecommendedNotice>
              <div className="space-y-2">
                <p>The campaign workspace is optimized for a larger screen. You can continue here, or switch to the shorter phone-friendly flow.</p>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Switch to Quick Create? Your unsaved campaign setup will be cleared.')) {
                      resetToMode('quick_post');
                    }
                  }}
                  className="min-h-11 rounded-lg border border-accent-green-110/30 px-3 py-2 text-xs font-semibold text-accent-green-110 hover:bg-accent-green-110/10"
                >
                  Back to Quick Create
                </button>
              </div>
            </DesktopRecommendedNotice>
          </div>
        )}

        {/* Message thread — scrollable */}
        <MessageThread
          messages={conversation.messages}
          session={session}
          clientId={clientId}
          onCardSelection={handleCardSelection}
        />

        {/* Command bar — fixed at bottom.
            Provides per-step helper label, contextual chips, Examples
            popover, and the existing typed input. Chips fire through
            sendMessage so typed and clicked commands behave the same. */}
        <div className="shrink-0">
          <AssistantCommandBar
            session={session}
            ready={ready}
            hasGenerationResult={session.generationResult != null}
            onSend={sendMessage}
            preferredChannels={preferences?.preferredChannels}
          />
        </div>
      </div>

      {/* Summary panel — fixed sidebar */}
      <SummaryPanel
        items={summary}
        ready={ready}
        onRevise={requestRevision}
      />
    </div>
  );
}

// One-line confirmation summary so the user sees what was prefilled.
function describePrefillForConfirmation(p: AssistantPrefill): string {
  const parts: string[] = [];
  if (p.mode === 'campaign') parts.push('Mode: Campaign');
  if (p.mode === 'quick_post') parts.push('Mode: Single Post');
  if (p.sourceType === 'property') parts.push('Source: Property / Listing');
  if (p.sourceType === 'data_item') parts.push('Source: Content Asset');
  if (p.sourceType === 'idea') parts.push('Source: Idea');
  if (p.sourceType === 'url') parts.push('Source: URL');
  return parts.join(' | ') || 'Prefilled from link';
}
