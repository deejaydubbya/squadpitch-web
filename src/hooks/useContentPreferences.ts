import { useMemo } from 'react';
import {
  useContentPreferences as useContentPreferencesQuery,
  type ContentPreferences,
  type Channel,
} from '@/hooks/useSquadpitch';
import type { AssistantCampaignType, SessionMemory } from '@/lib/assistant/types';
import {
  resolveDefaults,
  buildPreferencesContext,
  type ResolvedDefaults,
} from '@/lib/assistant/contentPreferences';
import { INITIAL_MEMORY } from '@/lib/assistant/defaults';

/**
 * Hook that resolves assistant defaults from persistent preferences + session memory.
 * Used by Campaign Assistant, Quick Post, and autopilot flows.
 *
 * Returns resolved defaults that are suggestions — the user can always override.
 */
export function useResolvedDefaults(
  clientId: string | undefined,
  memory?: SessionMemory,
  campaignType?: AssistantCampaignType | null,
): ResolvedDefaults & { isLoading: boolean; preferences: ContentPreferences | null } {
  const { data: preferences, isLoading } = useContentPreferencesQuery(clientId);

  const resolved = useMemo(
    () => resolveDefaults(preferences, memory ?? INITIAL_MEMORY, campaignType),
    [preferences, memory, campaignType],
  );

  return { ...resolved, isLoading, preferences: preferences ?? null };
}

/**
 * Hook that builds a prompt-compatible context string from persistent preferences.
 * Returns null if no preferences are set. Used by generation flows to inject context.
 */
export function usePreferencesContext(clientId: string | undefined): string | null {
  const { data: preferences } = useContentPreferencesQuery(clientId);
  return useMemo(() => buildPreferencesContext(preferences), [preferences]);
}
