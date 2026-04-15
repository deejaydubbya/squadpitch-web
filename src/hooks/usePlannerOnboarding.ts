'use client';

import { useState, useCallback, useEffect } from 'react';

interface PlannerOnboardingState {
  hasSeenPlannerTour: boolean;
  hasDismissedPlannerWelcome: boolean;
  hasGeneratedFirstWeek: boolean;
}

const STORAGE_KEY_PREFIX = 'sp_planner_onboarding_';

function getStorageKey(clientId: string) {
  return `${STORAGE_KEY_PREFIX}${clientId}`;
}

function readState(clientId: string): PlannerOnboardingState {
  try {
    const raw = globalThis.localStorage?.getItem(getStorageKey(clientId));
    if (raw) return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    // SSR or parse error
  }
  return defaultState();
}

function defaultState(): PlannerOnboardingState {
  return {
    hasSeenPlannerTour: false,
    hasDismissedPlannerWelcome: false,
    hasGeneratedFirstWeek: false,
  };
}

export function usePlannerOnboarding(clientId: string) {
  const [state, setState] = useState<PlannerOnboardingState>(defaultState);

  // Read from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setState(readState(clientId));
  }, [clientId]);

  const persist = useCallback(
    (patch: Partial<PlannerOnboardingState>) => {
      setState((prev) => {
        const next = { ...prev, ...patch };
        try {
          globalThis.localStorage?.setItem(
            getStorageKey(clientId),
            JSON.stringify(next)
          );
        } catch {
          // quota exceeded or SSR
        }
        return next;
      });
    },
    [clientId]
  );

  const dismissWelcome = useCallback(
    () => persist({ hasDismissedPlannerWelcome: true }),
    [persist]
  );

  const markTourSeen = useCallback(
    () => persist({ hasSeenPlannerTour: true }),
    [persist]
  );

  const markFirstWeekGenerated = useCallback(
    () => persist({ hasGeneratedFirstWeek: true }),
    [persist]
  );

  const isFirstRun =
    !state.hasDismissedPlannerWelcome && !state.hasGeneratedFirstWeek;

  return {
    ...state,
    isFirstRun,
    dismissWelcome,
    markTourSeen,
    markFirstWeekGenerated,
  };
}
