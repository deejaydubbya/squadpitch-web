import type { Channel, MediaAsset, AutopilotTriggerType } from '@/hooks/useSquadpitch';
import type { SequencePreset } from './schedulePresets';
import type {
  CampaignTypeRecommendation,
  ChannelRecommendation,
  RecommendChannelsInput,
  MediaPrioritization,
  PrioritizeMediaInput,
  ScheduleRecommendation,
} from './campaignIntelligence.types';
import type {
  CampaignStrategyKey,
  CampaignCadenceKey,
  StrategyResolution,
} from './campaignStrategy.types';

// ── Supporting Types ────────────────────────────────────────────────────

export interface CampaignTypeOption {
  value: string;
  label: string;
  description: string;
}

export interface IndustryTerminology {
  itemSingular: string;
  itemPlural: string;
  selectItemLabel: string;
  itemDataLabel: string;
  priceLabel: string;
}

export type CampaignUrgency = 'immediate' | 'high' | 'normal' | 'low';

export type ContentAngleHint =
  | 'urgency'
  | 'promotional'
  | 'storytelling'
  | 'lifestyle'
  | 'authority'
  | 'social_proof';

export interface TriggerConfig {
  urgency: CampaignUrgency;
  angleHints: ContentAngleHint[];
  autoGenerate: boolean;
}

export interface MediaScoringSignal {
  pattern: RegExp;
  scoreBonus: number;
  label: string;
  tag: string;
}

export interface ScheduleStrategy {
  presets: SequencePreset[];
  slotPurposeHints: Record<string, string>;
  slotMediaHints: Record<string, string>;
  selectPreset: (campaignType: string, itemData: Record<string, unknown>) => { presetKey: string; reason: string };
  /** Resolve the full strategy + cadence + phases from campaign type and item data */
  resolveStrategy?: (campaignType: string, itemData: Record<string, unknown>) => StrategyResolution;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Per-step override configuration.
 * Adapters can customize step labels, skippability, or exclude steps entirely.
 */
export interface StepOverride {
  /** Custom label for this step (overrides default) */
  label?: string;
  /** Description/hint shown in the step UI */
  description?: string;
  /** Whether this step is skippable in campaign mode */
  skippable?: boolean;
  /** Whether to exclude this step entirely for this industry */
  exclude?: boolean;
}

/**
 * Workflow-level overrides that an adapter can specify.
 * All fields are optional — unspecified steps use the shared base behavior.
 */
export interface WorkflowOverrides {
  /** Per-step overrides keyed by step ID */
  steps?: Partial<Record<string, StepOverride>>;
  /** Quick post: whether item selection is required (default: false/skippable) */
  quickPostRequiresItem?: boolean;
  /** Campaign mode: whether media selection is required (default: false/skippable) */
  campaignRequiresMedia?: boolean;
}

// ── Adapter Interface ───────────────────────────────────────────────────

export interface IndustryAdapter {
  id: string;
  label: string;
  terminology: IndustryTerminology;

  campaignTypes: CampaignTypeOption[];
  defaultChannelsByCampaignType: Record<string, Channel[]>;

  /** Optional workflow step overrides. Omit to use shared base behavior. */
  workflowOverrides?: WorkflowOverrides;

  recommendCampaignType: (itemData: Record<string, unknown>) => CampaignTypeRecommendation;
  recommendChannels: (input: RecommendChannelsInput) => ChannelRecommendation;
  prioritizeMedia: (assets: MediaAsset[], input: PrioritizeMediaInput) => MediaPrioritization;

  scheduleStrategy: ScheduleStrategy;

  supportedTriggers: AutopilotTriggerType[];
  triggerConfig: Partial<Record<AutopilotTriggerType, TriggerConfig>>;
  mapTriggerToCampaignType: (triggerType: AutopilotTriggerType, itemData: Record<string, unknown>) => CampaignTypeRecommendation;

  buildPromptContext: (itemData: Record<string, unknown>) => string | null;
  validateItemData: (itemData: Record<string, unknown>) => ValidationResult;
}
