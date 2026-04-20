import type { DraftStatus } from '@/hooks/useSquadpitch';

export type InlineActionType =
  | 'rewrite_post'
  | 'generate_variations'
  | 'improve_caption'
  | 'adjust_tone'
  | 'expand_post'
  | 'optimize_schedule';

export type ActionOutputMode = 'replace' | 'duplicate' | 'preview';

export interface ActionParamDef {
  key: string;
  label: string;
  type: 'select';
  options: { value: string; label: string }[];
  required?: boolean;
}

export interface InlineActionConfig {
  type: InlineActionType;
  label: string;
  description: string;
  icon: string;
  outputMode: ActionOutputMode;
  allowedStatuses: DraftStatus[];
  params?: ActionParamDef[];
}

export interface InlineActionInput {
  type: InlineActionType;
  draftId: string;
  clientId: string;
  params?: Record<string, string>;
  /** Optional preferences context injected into generation prompts */
  preferencesContext?: string | null;
}

export interface InlineActionResult {
  actionType: InlineActionType;
  outputMode: ActionOutputMode;
  preview?: { body: string; hooks: string[]; hashtags: string[]; cta: string | null };
  newDraftIds?: string[];
  suggestedSchedule?: { scheduledFor: string; reason: string };
}
