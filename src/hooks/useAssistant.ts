'use client';

import { useReducer, useMemo, useCallback, useState, useEffect } from 'react';
import type {
  AssistantAction,
  AssistantMode,
  AssistantSessionState,
  AssistantStepId,
  WorkflowStep,
} from '@/lib/assistant/types';
import { INITIAL_MEMORY, INITIAL_SESSION } from '@/lib/assistant/defaults';
import { getStepsForMode, isStepComplete, isStepSkippable } from '@/lib/assistant/workflowConfig';

// ── Reducer ──────────────────────────────────────────────────────────────

function assistantReducer(
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
      return {
        ...state,
        campaignType: action.payload,
        memory: { ...state.memory, preferredCampaignType: action.payload },
      };
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
      return { ...state, selectedMediaIds: action.payload };
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

// ── Hook ─────────────────────────────────────────────────────────────────

export function useAssistant(
  workspaceId?: string | null,
  industryKey?: string | null,
) {
  const initialState: AssistantSessionState = {
    ...INITIAL_SESSION,
    workspaceId: workspaceId ?? null,
    // industry-01 — no silent real-estate fallback. See
    // useConversationalAssistant for the same change rationale.
    industryKey: industryKey ?? null,
  };

  const [session, dispatch] = useReducer(assistantReducer, initialState);
  const [forcedStepIndex, setForcedStepIndex] = useState<number | null>(null);

  const steps: WorkflowStep[] = useMemo(() => {
    if (!session.mode) return [];
    return getStepsForMode(session.mode, session.industryKey);
  }, [session.mode, session.industryKey]);

  // Auto-calculated step (first incomplete, non-skippable step)
  const autoStepId: AssistantStepId | null = useMemo(() => {
    if (steps.length === 0) return null;
    for (const step of steps) {
      if (isStepSkippable(step.id, session)) continue;
      if (!isStepComplete(step.id, session)) return step.id;
    }
    // All non-skippable steps complete → land on last step (generate)
    return steps[steps.length - 1].id;
  }, [steps, session]);

  // Effective step respects forced override
  const currentStepId: AssistantStepId | null = useMemo(() => {
    if (forcedStepIndex !== null && steps[forcedStepIndex]) {
      return steps[forcedStepIndex].id;
    }
    return autoStepId;
  }, [forcedStepIndex, steps, autoStepId]);

  const currentStepIndex = useMemo(() => {
    if (!currentStepId) return -1;
    return steps.findIndex((s) => s.id === currentStepId);
  }, [steps, currentStepId]);

  const canAdvance = useMemo(() => {
    if (!currentStepId) return false;
    return isStepComplete(currentStepId, session) || isStepSkippable(currentStepId, session);
  }, [currentStepId, session]);

  const canGoBack = useMemo(() => currentStepIndex > 0, [currentStepIndex]);

  const progress = useMemo(() => {
    if (steps.length === 0) return 0;
    const completed = steps.filter(
      (s) => isStepComplete(s.id, session) || isStepSkippable(s.id, session)
    ).length;
    return completed / steps.length;
  }, [steps, session]);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  // Navigation methods
  const nextStep = useCallback(() => {
    const idx = currentStepIndex;
    if (idx < steps.length - 1) {
      setForcedStepIndex(idx + 1);
    }
  }, [currentStepIndex, steps.length]);

  const prevStep = useCallback(() => {
    const idx = currentStepIndex;
    if (idx > 0) {
      setForcedStepIndex(idx - 1);
    }
  }, [currentStepIndex]);

  // Reset forced index when mode changes
  useEffect(() => {
    setForcedStepIndex(null);
  }, [session.mode]);

  return {
    session,
    dispatch,
    steps,
    currentStepId,
    currentStepIndex,
    canAdvance,
    canGoBack,
    progress,
    reset,
    nextStep,
    prevStep,
  };
}
