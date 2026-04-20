'use client';

import { useReducer, useCallback, useState, useEffect, useMemo } from 'react';
import type { AssistantAction, AssistantSessionState, ScheduleSlot } from '@/lib/assistant/types';
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

// ── Session Reducer (reused from existing system) ────────────────────────

function sessionReducer(
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
    case 'SET_MEDIA':
      return { ...state, selectedMediaIds: action.payload, mediaAcknowledged: true };
    case 'SET_MEDIA_ACKNOWLEDGED':
      return { ...state, mediaAcknowledged: true };
    case 'SET_QUICK_POST_CHANNEL':
      return { ...state, quickPostChannel: action.payload };
    case 'SET_QUICK_POST_GUIDANCE':
      return { ...state, quickPostGuidance: action.payload };
    case 'SET_QUICK_POST_KIND':
      return { ...state, quickPostKind: action.payload };
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
 * When a field changes, some downstream fields may need to be reset.
 */
const FIELD_DEPENDENCIES: Record<string, string[]> = {
  mode: ['campaignType', 'channels', 'slots', 'quickPostChannel', 'selectedMediaIds'],
  campaignType: ['slots'], // changing campaign type invalidates schedule
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

        // Invalidate dependent fields (same logic as handleCardSelection)
        const fieldName = actionToFieldName(action);
        const deps = fieldName ? FIELD_DEPENDENCIES[fieldName] : undefined;
        if (deps && deps.length > 0) {
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
    } else {
      // Nothing structurally parsed
      // If in quick_post mode, treat freeform text as guidance
      if (session.mode === 'quick_post' && text.trim().length > 5) {
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
   */
  const handleCardSelection = useCallback((action: AssistantAction, confirmationText: string) => {
    dispatchSession(action);
    const updatedSession = sessionReducer(session, action);

    // Generation result → transition to review card
    if (action.type === 'SET_GENERATION_RESULT') {
      const confirmMsg = buildFieldConfirmation(action.type, confirmationText);
      dispatchConversation({ type: 'ADD_MESSAGE', payload: confirmMsg });

      // Resolve current active card
      if (conversation.activeCardId) {
        dispatchConversation({
          type: 'SET_MESSAGE_STATUS',
          payload: { messageId: conversation.activeCardId, status: 'resolved' },
        });
      }

      // Show review card for campaigns, terminal for quick posts
      if (session.mode === 'campaign' && action.payload !== null) {
        const reviewMsg = buildNextPromptMessage(
          { field: 'review', cardType: 'campaign_review', priority: 100 },
          updatedSession,
        );
        dispatchConversation({ type: 'ADD_MESSAGE', payload: reviewMsg });
      }
      return;
    }

    // Check if this field change invalidates dependents
    const fieldName = actionToFieldName(action);
    const deps = fieldName ? FIELD_DEPENDENCIES[fieldName] : undefined;
    if (deps && deps.length > 0) {
      // Invalidate old messages for dependent fields
      for (const dep of deps) {
        // Clear dependent state
        const clearAction = getClearAction(dep);
        if (clearAction) {
          dispatchSession(clearAction);
        }
      }
    }

    // Add confirmation
    const confirmMsg = buildFieldConfirmation(action.type, confirmationText);
    dispatchConversation({ type: 'ADD_MESSAGE', payload: confirmMsg });

    // Advance
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
    case 'SET_QUICK_POST_CHANNEL': return 'quickPostChannel';
    default: return null;
  }
}

function fieldToCardType(field: string): import('@/lib/assistant/conversation/types').CardType | null {
  const map: Record<string, import('@/lib/assistant/conversation/types').CardType> = {
    mode: 'mode_select',
    selectedPropertyId: 'property_select',
    campaignType: 'campaign_type',
    channels: 'channel_select',
    quickPostChannel: 'channel_select',
    selectedMediaIds: 'media_select',
    slots: 'schedule_review',
  };
  return map[field] ?? null;
}

function getClearAction(field: string): AssistantAction | null {
  switch (field) {
    case 'channels': return { type: 'SET_CHANNELS', payload: [], source: 'auto' };
    case 'slots': return { type: 'SET_SLOTS', payload: [] };
    case 'selectedMediaIds': return { type: 'SET_MEDIA', payload: [] };
    case 'quickPostChannel': return { type: 'SET_QUICK_POST_CHANNEL', payload: null as any };
    default: return null;
  }
}
