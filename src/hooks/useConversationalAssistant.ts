'use client';

import { useReducer, useCallback, useState, useEffect, useMemo } from 'react';
import type { AssistantAction, AssistantSessionState, ScheduleSlot, FieldMeta } from '@/lib/assistant/types';
import { INITIAL_SESSION, INITIAL_MEMORY } from '@/lib/assistant/defaults';
import type { ChatMessage, ConversationState, MessageStatus } from '@/lib/assistant/conversation/types';
import { resolveNextPrompts, isReadyToGenerate, getStateSummary, getCompletionStatus } from '@/lib/assistant/conversation/stateResolver';
import { parseUserInput, resolvePropertyFromText } from '@/lib/assistant/conversation/inputParser';
import { useProperties } from '@/hooks/useSquadpitch';
import { SEQUENCE_PRESETS, buildSlotsForChannels } from '@/lib/assistant/schedulePresets';
import {
  buildWelcomeMessage,
  buildNextPromptMessage,
  buildUserText,
  buildMultiFieldConfirmation,
  buildReadyMessage,
  buildFieldConfirmation,
  buildAssistantText,
  buildInvalidationNotice,
} from '@/lib/assistant/conversation/messageBuilder';

// ── Session Reducer ──────────────────────────────────────────────────────

/**
 * Core reducer — handles value changes only.
 */
function sessionReducerCore(
  state: AssistantSessionState,
  action: AssistantAction
): AssistantSessionState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...INITIAL_SESSION, mode: action.payload, workspaceId: state.workspaceId, industryKey: state.industryKey, memory: state.memory };
    case 'SET_PROPERTY':
      return { ...state, selectedPropertyId: action.payload.id, propertyData: action.payload.data };
    case 'CLEAR_PROPERTY':
      return { ...state, selectedPropertyId: null, propertyData: null };
    case 'SET_CAMPAIGN_TYPE':
      return { ...state, campaignType: action.payload };
    case 'SET_CHANNELS': {
      const writeMemory = action.source !== 'auto';
      return {
        ...state,
        channels: action.payload,
        memory: writeMemory
          ? { ...state.memory, preferredChannels: action.payload }
          : state.memory,
      };
    }
    case 'SET_SCHEDULE_MODE':
      return { ...state, scheduleMode: action.payload };
    case 'SET_SLOTS':
      return { ...state, slots: action.payload };
    case 'SET_CAMPAIGN_START_DATE':
      return { ...state, campaignStartDate: action.payload };
    case 'SET_MEDIA':
      return {
        ...state,
        selectedMediaIds: action.payload,
        // Only mark acknowledged when the user actively chose media;
        // clearing via dependency invalidation (empty payload) should NOT mark it acknowledged
        mediaAcknowledged: action.payload.length > 0,
      };
    case 'SET_MEDIA_ACKNOWLEDGED':
      return { ...state, mediaAcknowledged: true };
    case 'SET_HERO_IMAGE':
      return { ...state, heroImageId: action.payload };
    case 'SET_QUICK_POST_SOURCE':
      return { ...state, quickPostSource: action.payload };
    case 'SET_QUICK_POST_CHANNEL':
      return { ...state, quickPostChannel: action.payload };
    case 'SET_QUICK_POST_GUIDANCE':
      return { ...state, quickPostGuidance: action.payload };
    case 'SET_QUICK_POST_KIND':
      return { ...state, quickPostKind: action.payload };
    case 'SET_QUICK_POST_GOAL':
      return { ...state, quickPostGoal: action.payload };
    case 'SET_QUICK_POST_CONTENT_TYPE':
      return { ...state, quickPostContentType: action.payload };
    case 'SET_QUICK_POST_DATA_ITEM':
      return {
        ...state,
        quickPostDataItemId: action.payload?.id ?? null,
        quickPostDataItemTitle: action.payload?.title ?? null,
      };
    case 'SET_QUICK_POST_BLUEPRINT':
      return { ...state, quickPostBlueprintId: action.payload };
    case 'SET_PREFERRED_PRESET':
      return { ...state, memory: { ...state.memory, preferredPreset: action.payload } };
    case 'SET_GENERATION_RESULT': {
      if (action.payload !== null) {
        return {
          ...state,
          generationResult: action.payload,
          memory: {
            ...state.memory,
            campaignsCompleted: state.memory.campaignsCompleted + 1,
            lastSelectedMediaIds: state.selectedMediaIds,
          },
        };
      }
      return { ...state, generationResult: action.payload };
    }
    case 'RESET':
      return { ...INITIAL_SESSION, workspaceId: state.workspaceId, industryKey: state.industryKey, memory: state.memory };
    default:
      return state;
  }
}

/**
 * Detect if an action clears a field (payload is null/empty).
 * Used to set fieldMeta status to 'invalidated' vs 'confirmed'.
 */
function isPayloadEmpty(action: AssistantAction): boolean {
  if (!('payload' in action)) return false;
  const p = (action as any).payload;
  if (p === null || p === undefined) return true;
  if (Array.isArray(p) && p.length === 0) return true;
  return false;
}

/**
 * Wrapper that auto-tracks fieldMeta on every dispatch.
 * - Sets status to 'confirmed' when a field is given a value
 * - Sets status to 'invalidated' when a field is cleared
 * - Resets fieldMeta on SET_MODE / RESET
 */
function sessionReducer(
  state: AssistantSessionState,
  action: AssistantAction
): AssistantSessionState {
  const next = sessionReducerCore(state, action);

  // SET_MODE resets session — start fresh with only mode confirmed
  if (action.type === 'SET_MODE') {
    return {
      ...next,
      fieldMeta: {
        mode: { status: 'confirmed', source: 'user_card', confidence: 1, updatedAt: Date.now() },
      },
    };
  }

  // RESET clears everything
  if (action.type === 'RESET') return next;

  // Map action to its field name
  const field = actionToFieldName(action);
  if (!field) return next;

  const cleared = isPayloadEmpty(action);
  const meta: FieldMeta = cleared
    ? { status: 'invalidated', source: 'auto', confidence: 0, updatedAt: Date.now() }
    : { status: 'confirmed', source: 'user_card', confidence: 1, updatedAt: Date.now() };

  return {
    ...next,
    fieldMeta: { ...next.fieldMeta, [field]: meta },
  };
}

// ── Conversation Reducer ─────────────────────────────────────────────────

type ConversationAction =
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'ADD_MESSAGES'; payload: ChatMessage[] }
  | { type: 'SET_MESSAGE_STATUS'; payload: { messageId: string; status: MessageStatus } }
  | { type: 'SET_ACTIVE_CARD'; payload: string | null }
  | { type: 'CLEAR' };

function conversationReducer(
  state: ConversationState,
  action: ConversationAction
): ConversationState {
  switch (action.type) {
    case 'ADD_MESSAGE': {
      const msg = action.payload;
      const isNewActive = msg.type === 'interactive_prompt' && msg.status === 'active';
      return {
        ...state,
        messages: [...state.messages, msg],
        activeCardId: isNewActive ? msg.id : state.activeCardId,
      };
    }
    case 'ADD_MESSAGES': {
      const newActive = action.payload.find((m) => m.type === 'interactive_prompt' && m.status === 'active');
      return {
        ...state,
        messages: [...state.messages, ...action.payload],
        activeCardId: newActive?.id ?? state.activeCardId,
      };
    }
    case 'SET_MESSAGE_STATUS':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.payload.messageId
            ? { ...m, status: action.payload.status }
            : m
        ),
        activeCardId: action.payload.status !== 'active' && state.activeCardId === action.payload.messageId
          ? null
          : state.activeCardId,
      };
    case 'SET_ACTIVE_CARD':
      return { ...state, activeCardId: action.payload };
    case 'CLEAR':
      return { messages: [], activeCardId: null };
    default:
      return state;
  }
}

// ── Dependent field invalidation ─────────────────────────────────────────

/**
 * Centralized dependency invalidation rules.
 * When a field changes, all downstream dependents are cleared.
 * This is the single source of truth for invalidation.
 */
const FIELD_DEPENDENCIES: Record<string, string[]> = {
  // Mode change resets everything (reducer already handles via INITIAL_SESSION)
  mode: ['campaignType', 'channels', 'slots', 'quickPostChannel', 'quickPostSource', 'selectedMediaIds'],
  // Changing property invalidates media selections and generated output
  selectedPropertyId: ['selectedMediaIds', 'slots'],
  // Changing campaign type invalidates schedule and generated output
  campaignType: ['slots'],
  // Changing channels may invalidate schedule (different channel mix)
  channels: ['slots'],
  // Quick post source change invalidates downstream data/guidance/content type
  quickPostSource: ['quickPostDataItemId', 'quickPostGuidance', 'quickPostContentType'],
};

// ── Main Hook ────────────────────────────────────────────────────────────

export function useConversationalAssistant(workspaceId?: string | null, industryKey?: string) {
  const initialSession: AssistantSessionState = {
    ...INITIAL_SESSION,
    workspaceId: workspaceId ?? null,
    industryKey: industryKey || 'real_estate',
  };

  const [session, dispatchSession] = useReducer(sessionReducer, initialSession);
  const [conversation, dispatchConversation] = useReducer(conversationReducer, {
    messages: [],
    activeCardId: null,
  });
  const [initialized, setInitialized] = useState(false);

  // Load properties for fuzzy resolution from text
  const { data: properties } = useProperties(workspaceId ?? '');

  // Initialize with welcome message
  useEffect(() => {
    if (!initialized) {
      const welcome = buildWelcomeMessage(session);
      dispatchConversation({ type: 'ADD_MESSAGE', payload: welcome });
      setInitialized(true);
    }
  }, [initialized]);

  // State summary for the side panel
  const summary = useMemo(() => getStateSummary(session), [session]);
  const ready = useMemo(() => isReadyToGenerate(session), [session]);
  const completionStatus = useMemo(() => getCompletionStatus(session), [session]);

  /**
   * Mark the active card as resolved and advance the conversation.
   */
  const advanceConversation = useCallback((newSession: AssistantSessionState) => {
    // Mark current active card as resolved
    if (conversation.activeCardId) {
      dispatchConversation({
        type: 'SET_MESSAGE_STATUS',
        payload: { messageId: conversation.activeCardId, status: 'resolved' },
      });
    }

    // Resolve what's next
    const nextPrompts = resolveNextPrompts(newSession);

    if (nextPrompts.length === 0 || isReadyToGenerate(newSession)) {
      const readyMsg = buildReadyMessage();
      dispatchConversation({ type: 'ADD_MESSAGE', payload: readyMsg });
    } else {
      const nextMsg = buildNextPromptMessage(nextPrompts[0], newSession);
      dispatchConversation({ type: 'ADD_MESSAGE', payload: nextMsg });
    }
  }, [conversation.activeCardId]);

  /**
   * Handle a revision request (change a previously confirmed field).
   * Triggered from the summary panel's "Change" button or freeform text revision.
   */
  const requestRevision = useCallback((field: string) => {
    const cardType = fieldToCardType(field);
    if (!cardType) return;

    // Invalidate the active card if one exists
    if (conversation.activeCardId) {
      dispatchConversation({
        type: 'SET_MESSAGE_STATUS',
        payload: { messageId: conversation.activeCardId, status: 'resolved' },
      });
    }

    // Post a system update
    const notice = buildInvalidationNotice(field);
    dispatchConversation({ type: 'ADD_MESSAGE', payload: notice });

    // Show the new interactive prompt for the field
    const prompt = buildNextPromptMessage({ field, cardType, priority: 0 }, session);
    dispatchConversation({ type: 'ADD_MESSAGE', payload: prompt });
  }, [session, conversation.activeCardId]);

  /**
   * Handle user sending a freeform text message.
   */
  const sendMessage = useCallback((text: string) => {
    const userMsg = buildUserText(text);
    dispatchConversation({ type: 'ADD_MESSAGE', payload: userMsg });

    const parseResult = parseUserInput(text, session);

    // Try to resolve property from text if not already set (or if revision)
    const isRevision = /\b(change|switch|update|replace|use .* instead|redo|different)\b/i.test(text);
    if ((!session.selectedPropertyId || isRevision) && properties && properties.length > 0) {
      const resolution = resolvePropertyFromText(text, properties);
      if (resolution?.match) {
        parseResult.actions.push({
          type: 'SET_PROPERTY',
          payload: { id: resolution.match.property.id, data: resolution.match.property.dataJson },
        });
        const label = (resolution.match.property.dataJson?.address as string) || resolution.match.property.title;
        parseResult.detectedFields.push(`property: ${label}`);
        parseResult.confidence['property'] = resolution.match.confidence;
      } else if (resolution?.ambiguous) {
        // Multiple matches — ask user to disambiguate
        const options = resolution.ambiguous.map((p) => (p.dataJson?.address as string) || p.title).filter(Boolean);
        parseResult.ambiguities.push(
          `I found multiple matching properties. Which one did you mean?\n${options.map((o, i) => `  ${i + 1}. ${o}`).join('\n')}`
        );
      }
    }

    if (parseResult.actions.length > 0) {
      // Dispatch all parsed actions
      let updatedSession = session;
      for (const action of parseResult.actions) {
        dispatchSession(action);
        updatedSession = sessionReducer(updatedSession, action);

        // Invalidate dependent fields (skip for SET_MODE — already resets)
        const fieldName = actionToFieldName(action);
        const deps = fieldName ? FIELD_DEPENDENCIES[fieldName] : undefined;
        if (deps && deps.length > 0 && action.type !== 'SET_MODE') {
          for (const dep of deps) {
            const clearAction = getClearAction(dep);
            if (clearAction) {
              dispatchSession(clearAction);
              updatedSession = sessionReducer(updatedSession, clearAction);
            }
          }
        }
      }

      // Auto-build slots if a schedule preset was selected and channels exist
      const presetAction = parseResult.actions.find((a) => a.type === 'SET_PREFERRED_PRESET');
      if (presetAction && presetAction.type === 'SET_PREFERRED_PRESET' && updatedSession.channels.length > 0 && updatedSession.slots.length === 0) {
        const preset = SEQUENCE_PRESETS.find((p) => p.key === presetAction.payload) ?? SEQUENCE_PRESETS[0];
        const builtSlots = buildSlotsForChannels(preset, updatedSession.channels);
        const slots: ScheduleSlot[] = builtSlots.map((s) => ({
          channel: s.channel as any,
          campaignDay: s.campaignDay,
          label: s.label,
          slotType: 'social_post',
        }));
        const slotsAction: AssistantAction = { type: 'SET_SLOTS', payload: slots };
        dispatchSession(slotsAction);
        updatedSession = sessionReducer(updatedSession, slotsAction);
        parseResult.detectedFields.push(`schedule: ${slots.length} posts over ${Math.max(...slots.map((s) => s.campaignDay))} days`);
      }

      // Confirm what was parsed
      const confirmMsg = buildMultiFieldConfirmation(parseResult.detectedFields);
      dispatchConversation({ type: 'ADD_MESSAGE', payload: confirmMsg });

      // Surface ambiguities if any
      if (parseResult.ambiguities && parseResult.ambiguities.length > 0) {
        const ambiguityMsg = buildAssistantText(parseResult.ambiguities.join('\n'));
        dispatchConversation({ type: 'ADD_MESSAGE', payload: ambiguityMsg });
      }

      // Advance to next question
      advanceConversation(updatedSession);
    } else if (parseResult.revisionTarget) {
      // User wants to revise a field but didn't provide a new value — re-show card
      requestRevision(parseResult.revisionTarget);
    } else if (parseResult.navigationTarget) {
      // Navigation → show the target card
      const field = parseResult.navigationTarget;
      const cardType = fieldToCardType(field);
      if (cardType) {
        if (conversation.activeCardId) {
          dispatchConversation({
            type: 'SET_MESSAGE_STATUS',
            payload: { messageId: conversation.activeCardId, status: 'resolved' },
          });
        }
        const prompt = buildNextPromptMessage({ field, cardType, priority: 0 }, session);
        dispatchConversation({ type: 'ADD_MESSAGE', payload: prompt });
        return;
      }
    } else if (parseResult.skipTarget !== undefined) {
      // Skip → dispatch skip action and advance
      const field = parseResult.skipTarget ?? resolveNextPrompts(session)[0]?.field;
      if (field) {
        const skipAction = getSkipAction(field);
        if (skipAction) {
          dispatchSession(skipAction);
          const updatedSession = sessionReducer(session, skipAction);
          const confirmMsg = buildMultiFieldConfirmation([`Skipped ${field}`]);
          dispatchConversation({ type: 'ADD_MESSAGE', payload: confirmMsg });
          advanceConversation(updatedSession);
          return;
        } else {
          // Field can't be skipped — tell the user why
          const fieldLabel = getUnskippableLabel(field);
          const msg = buildAssistantText(
            `${fieldLabel} is required and can't be skipped. Please make a selection to continue.`
          );
          dispatchConversation({ type: 'ADD_MESSAGE', payload: msg });
          return;
        }
      }
    } else if (parseResult.contextualAction) {
      // Contextual action → dispatch and advance
      const { type: ctxType, label, presetKey } = parseResult.contextualAction;
      if (ctxType === 'media_acknowledge') {
        const action: AssistantAction = { type: 'SET_MEDIA_ACKNOWLEDGED' };
        dispatchSession(action);
        const updated = sessionReducer(session, action);
        const confirmMsg = buildMultiFieldConfirmation([label]);
        dispatchConversation({ type: 'ADD_MESSAGE', payload: confirmMsg });
        advanceConversation(updated);
        return;
      }
      if (ctxType === 'schedule_preset' && presetKey) {
        const presetAction: AssistantAction = { type: 'SET_PREFERRED_PRESET', payload: presetKey };
        dispatchSession(presetAction);
        let updated = sessionReducer(session, presetAction);
        // Auto-build slots
        if (updated.channels.length > 0) {
          const preset = SEQUENCE_PRESETS.find((p) => p.key === presetKey) ?? SEQUENCE_PRESETS[0];
          const builtSlots = buildSlotsForChannels(preset, updated.channels);
          const slots: ScheduleSlot[] = builtSlots.map((s) => ({
            channel: s.channel as any,
            campaignDay: s.campaignDay,
            label: s.label,
            slotType: 'social_post',
          }));
          const slotsAction: AssistantAction = { type: 'SET_SLOTS', payload: slots };
          dispatchSession(slotsAction);
          updated = sessionReducer(updated, slotsAction);
        }
        const confirmMsg = buildMultiFieldConfirmation([label]);
        dispatchConversation({ type: 'ADD_MESSAGE', payload: confirmMsg });
        advanceConversation(updated);
        return;
      }
    } else {
      // Nothing structurally parsed — try contextual matching for the current step
      const currentStep = resolveNextPrompts(session)[0]?.field;
      const contextualMatch = matchContextualInput(text.trim(), currentStep, session);

      if (contextualMatch) {
        dispatchSession(contextualMatch.action);
        const updatedSession = sessionReducer(session, contextualMatch.action);
        const confirmMsg = buildMultiFieldConfirmation([contextualMatch.label]);
        dispatchConversation({ type: 'ADD_MESSAGE', payload: confirmMsg });
        advanceConversation(updatedSession);
      } else if (session.mode === 'quick_post' && currentStep === 'quickPostGuidance' && text.trim().length > 5) {
        // Treat freeform text as guidance
        const existing = session.quickPostGuidance ?? '';
        const combined = existing ? `${existing}\n${text.trim()}` : text.trim();
        const guidanceAction: AssistantAction = { type: 'SET_QUICK_POST_GUIDANCE', payload: combined };
        dispatchSession(guidanceAction);
        const updatedSession = sessionReducer(session, guidanceAction);

        const confirmMsg = buildMultiFieldConfirmation([`guidance: "${text.trim()}"`]);
        dispatchConversation({ type: 'ADD_MESSAGE', payload: confirmMsg });
        advanceConversation(updatedSession);
      } else {
        // Re-prompt
        const nextPrompts = resolveNextPrompts(session);
        if (nextPrompts.length > 0) {
          const reprompt = buildNextPromptMessage(nextPrompts[0], session);
          dispatchConversation({ type: 'ADD_MESSAGE', payload: reprompt });
        } else {
          const hint = buildAssistantText(`I didn't catch that. You can type instructions or use the options above.`);
          dispatchConversation({ type: 'ADD_MESSAGE', payload: hint });
        }
      }
    }
  }, [session, advanceConversation, requestRevision]);

  /**
   * Handle a structured selection from an interactive card.
   * Called by card components when user clicks a button/selection.
   * Accepts a single action or an array of actions (batched — advance only once).
   */
  const handleCardSelection = useCallback((actionOrActions: AssistantAction | AssistantAction[], confirmationText: string) => {
    const actions = Array.isArray(actionOrActions) ? actionOrActions : [actionOrActions];
    const primaryAction = actions[0];

    // Apply all actions to get the fully-updated session
    let updatedSession = session;
    for (const action of actions) {
      dispatchSession(action);
      updatedSession = sessionReducer(updatedSession, action);
    }

    // Generation result → transition to review card
    if (primaryAction.type === 'SET_GENERATION_RESULT') {
      const confirmMsg = buildFieldConfirmation(primaryAction.type, confirmationText);
      dispatchConversation({ type: 'ADD_MESSAGE', payload: confirmMsg });

      // Resolve current active card and show review — campaigns only
      // Quick posts keep the generation card active (review is rendered inline)
      if (session.mode === 'campaign') {
        if (conversation.activeCardId) {
          dispatchConversation({
            type: 'SET_MESSAGE_STATUS',
            payload: { messageId: conversation.activeCardId, status: 'resolved' },
          });
        }

        if (primaryAction.payload !== null) {
          const reviewMsg = buildNextPromptMessage(
            { field: 'review', cardType: 'campaign_review', priority: 100 },
            updatedSession,
          );
          dispatchConversation({ type: 'ADD_MESSAGE', payload: reviewMsg });
        }
      }
      // Quick post: don't resolve the card — QuickPostReview renders inline
      return;
    }

    // Check if any field change invalidates dependents
    // Skip for SET_MODE — its reducer already resets to INITIAL_SESSION
    for (const action of actions) {
      const fieldName = actionToFieldName(action);
      const deps = fieldName ? FIELD_DEPENDENCIES[fieldName] : undefined;
      if (deps && deps.length > 0 && action.type !== 'SET_MODE') {
        for (const dep of deps) {
          const clearAction = getClearAction(dep);
          if (clearAction) {
            dispatchSession(clearAction);
            updatedSession = sessionReducer(updatedSession, clearAction);
          }
        }
      }
    }

    // Add confirmation
    if (confirmationText) {
      const confirmMsg = buildFieldConfirmation(primaryAction.type, confirmationText);
      dispatchConversation({ type: 'ADD_MESSAGE', payload: confirmMsg });
    }

    // Advance once (not per action)
    advanceConversation(updatedSession);
  }, [session, advanceConversation]);

  /**
   * Reset the entire conversation.
   */
  const reset = useCallback(() => {
    dispatchSession({ type: 'RESET' });
    dispatchConversation({ type: 'CLEAR' });
    setInitialized(false);
  }, []);

  return {
    session,
    conversation,
    summary,
    ready,
    completionStatus,
    sendMessage,
    handleCardSelection,
    requestRevision,
    reset,
    dispatch: dispatchSession,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

function actionToFieldName(action: AssistantAction): string | null {
  switch (action.type) {
    case 'SET_MODE': return 'mode';
    case 'SET_CAMPAIGN_TYPE': return 'campaignType';
    case 'SET_CHANNELS': return 'channels';
    case 'SET_PROPERTY': return 'selectedPropertyId';
    case 'SET_MEDIA': return 'selectedMediaIds';
    case 'SET_MEDIA_ACKNOWLEDGED': return 'selectedMediaIds';
    case 'SET_SLOTS': return 'slots';
    case 'SET_QUICK_POST_SOURCE': return 'quickPostSource';
    case 'SET_QUICK_POST_CHANNEL': return 'quickPostChannel';
    case 'SET_QUICK_POST_GUIDANCE': return 'quickPostGuidance';
    case 'SET_QUICK_POST_CONTENT_TYPE': return 'quickPostContentType';
    case 'SET_QUICK_POST_GOAL': return 'quickPostGoal';
    default: return null;
  }
}

function fieldToCardType(field: string): import('@/lib/assistant/conversation/types').CardType | null {
  const map: Record<string, import('@/lib/assistant/conversation/types').CardType> = {
    mode: 'mode_select',
    selectedPropertyId: 'property_select',
    campaignType: 'campaign_type',
    channels: 'channel_select',
    quickPostSource: 'quick_post_source',
    quickPostDataItemId: 'quick_post_data',
    quickPostChannel: 'channel_select',
    quickPostGuidance: 'quick_post_guidance',
    quickPostContentType: 'quick_post_content_type',
    quickPostGoal: 'quick_post_goal',
    selectedMediaIds: 'media_select',
    slots: 'schedule_review',
  };
  return map[field] ?? null;
}

function getSkipAction(field: string): AssistantAction | null {
  switch (field) {
    case 'selectedMediaIds': return { type: 'SET_MEDIA_ACKNOWLEDGED' } as AssistantAction;
    // Slots can't really be "skipped" — they're required. Return null.
    default: return null;
  }
}

function getUnskippableLabel(field: string): string {
  const labels: Record<string, string> = {
    mode: 'Choosing a mode',
    selectedPropertyId: 'Selecting a property',
    campaignType: 'Campaign type',
    channels: 'Channel selection',
    slots: 'The posting schedule',
    quickPostSource: 'Choosing a source',
    quickPostDataItemId: 'Selecting a data item',
    quickPostGuidance: 'Post topic',
    quickPostContentType: 'Content type',
    quickPostChannel: 'Channel',
    quickPostGoal: 'Post goal',
  };
  return labels[field] ?? 'This step';
}

/**
 * Match freeform text against the currently expected step.
 * Returns an action + label if the text matches a known value for the current field.
 */
function matchContextualInput(
  text: string,
  currentStep: string | undefined,
  _session: AssistantSessionState
): { action: AssistantAction; label: string } | null {
  if (!currentStep || !text) return null;
  const lower = text.toLowerCase().trim();

  if (currentStep === 'quickPostContentType') {
    const CT_MAP: Array<{ patterns: RegExp; value: string; label: string }> = [
      { patterns: /\b(listing|just\s*listed|open\s*house|price\s*(drop|reduc))\b/i, value: 'listing', label: 'Listing Post' },
      { patterns: /\b(testimonial|review|client\s*story)\b/i, value: 'testimonial', label: 'Testimonial' },
      { patterns: /\b(educational|tip|how\s*to|guide)\b/i, value: 'educational', label: 'Educational' },
      { patterns: /\b(market\s*update|market\s*report)\b/i, value: 'market_update', label: 'Market Update' },
      { patterns: /\b(personal|story|behind\s*the\s*scenes|milestone)\b/i, value: 'personal', label: 'Personal / Story' },
      { patterns: /\b(growth|community|neighborhood)\b/i, value: 'growth', label: 'Growth' },
    ];
    for (const ct of CT_MAP) {
      if (ct.patterns.test(lower)) {
        return { action: { type: 'SET_QUICK_POST_CONTENT_TYPE', payload: ct.value }, label: `Content type: ${ct.label}` };
      }
    }
  }

  if (currentStep === 'quickPostGoal') {
    const GOAL_MAP: Array<{ patterns: RegExp; value: 'Growth' | 'Engagement' | 'Sales'; label: string }> = [
      { patterns: /\b(growth|grow|followers?|reach|awareness)\b/i, value: 'Growth', label: 'Growth' },
      { patterns: /\b(engage|engagement|comments?|likes?|interaction)\b/i, value: 'Engagement', label: 'Engagement' },
      { patterns: /\b(sales?|convert|leads?|sell|revenue)\b/i, value: 'Sales', label: 'Sales' },
    ];
    for (const g of GOAL_MAP) {
      if (g.patterns.test(lower)) {
        return { action: { type: 'SET_QUICK_POST_GOAL', payload: g.value }, label: `Goal: ${g.label}` };
      }
    }
  }

  if (currentStep === 'quickPostChannel' || currentStep === 'channels') {
    const CH_MAP: Array<{ patterns: RegExp; value: string; label: string }> = [
      { patterns: /\b(instagram|insta|ig)\b/i, value: 'INSTAGRAM', label: 'Instagram' },
      { patterns: /\b(facebook|fb)\b/i, value: 'FACEBOOK', label: 'Facebook' },
      { patterns: /\b(linkedin|li)\b/i, value: 'LINKEDIN', label: 'LinkedIn' },
      { patterns: /\b(twitter|x)\b/i, value: 'TWITTER', label: 'Twitter/X' },
      { patterns: /\b(tiktok|tik\s*tok)\b/i, value: 'TIKTOK', label: 'TikTok' },
      { patterns: /\b(google|gmb|google\s*business)\b/i, value: 'GOOGLE_BUSINESS', label: 'Google Business' },
    ];
    for (const ch of CH_MAP) {
      if (ch.patterns.test(lower)) {
        if (currentStep === 'quickPostChannel') {
          return { action: { type: 'SET_QUICK_POST_CHANNEL', payload: ch.value as any }, label: `Channel: ${ch.label}` };
        } else {
          return { action: { type: 'SET_CHANNELS', payload: [ch.value as any], source: 'user' }, label: `Channel: ${ch.label}` };
        }
      }
    }
  }

  if (currentStep === 'quickPostSource') {
    if (/\b(data|use\s*(my)?\s*data|from\s*data)\b/i.test(lower)) {
      return { action: { type: 'SET_QUICK_POST_SOURCE', payload: 'data' }, label: 'Source: Use my data' };
    }
    if (/\b(idea|scratch|my\s*own|freeform)\b/i.test(lower)) {
      return { action: { type: 'SET_QUICK_POST_SOURCE', payload: 'idea' }, label: 'Source: Start from an idea' };
    }
  }

  return null;
}

function getClearAction(field: string): AssistantAction | null {
  switch (field) {
    case 'channels': return { type: 'SET_CHANNELS', payload: [], source: 'auto' };
    case 'slots': return { type: 'SET_SLOTS', payload: [] };
    case 'selectedMediaIds': return { type: 'SET_MEDIA', payload: [] };
    case 'quickPostSource': return { type: 'SET_QUICK_POST_SOURCE', payload: null as any };
    case 'quickPostChannel': return { type: 'SET_QUICK_POST_CHANNEL', payload: null as any };
    case 'quickPostDataItemId': return { type: 'SET_QUICK_POST_DATA_ITEM', payload: null };
    case 'quickPostGuidance': return { type: 'SET_QUICK_POST_GUIDANCE', payload: null as any };
    case 'quickPostContentType': return { type: 'SET_QUICK_POST_CONTENT_TYPE', payload: null as any };
    default: return null;
  }
}
