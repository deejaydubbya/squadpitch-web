'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useClient, useDataItems, useProperties } from '@/hooks/useSquadpitch';
import { useConversationalAssistant } from '@/hooks/useConversationalAssistant';
import { MessageThread } from './MessageThread';
import { AssistantCommandBar } from './AssistantCommandBar';
import { SummaryPanel } from './SummaryPanel';
import type { AssistantAction, AssistantCampaignType } from '@/lib/assistant/types';
import type { Channel } from '@/hooks/useSquadpitch';

// Prefill payload passed in by the /create route from the parsed
// query contract (see lib/assistant/createRouteParams.ts). Every
// field is optional — applied in order, with safe no-ops when a
// value is absent. Source-by-id (`sourceId`) requires an async
// lookup against useProperties/useDataItems; everything else
// applies synchronously on mount.
export interface AssistantPrefill {
  mode?: 'campaign' | 'quick_post';
  sourceType?: 'property' | 'data_item' | 'idea';
  /** WorkspaceDataItem id when sourceType=property or data_item */
  sourceId?: string;
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
        // selectedPropertyId is not.
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
      if (!item) return;
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
  ]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full min-h-0">
        {/* Header — fixed */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white-10">
          <h1 className="text-base font-semibold text-white-100">
            {session.mode === 'campaign' ? 'Campaign' : session.mode === 'quick_post' ? 'Single Post' : 'Create'}
          </h1>
          {session.mode && (
            <button
              onClick={() => {
                if (window.confirm('Start over? This will clear your current progress.')) {
                  reset();
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-white-40 hover:text-white-100 hover:bg-white-5 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Start over
            </button>
          )}
        </div>

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
  return parts.join(' | ') || 'Prefilled from link';
}
