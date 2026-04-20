import type {
  AssistantMode,
  AssistantSessionState,
  AssistantStepId,
  WorkflowStep,
} from './types';
import { getAdapter } from './adapterRegistry';
import type { IndustryAdapter, WorkflowOverrides } from './industryAdapter';

// ── Step Definitions (shared base) ──────────────────────────────────────

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 'mode_select',
    label: 'Choose Mode',
    modes: ['campaign', 'quick_post'],
    required: ['mode'],
  },
  {
    id: 'property_select',
    label: 'Select Item',
    modes: ['campaign', 'quick_post'],
    required: ['selectedPropertyId'],
  },
  {
    id: 'campaign_config',
    label: 'Campaign Settings',
    modes: ['campaign'],
    required: ['campaignType', 'channels'],
  },
  {
    id: 'quick_post_config',
    label: 'Post Settings',
    modes: ['quick_post'],
    required: ['quickPostChannel'],
  },
  {
    id: 'media_select',
    label: 'Select Media',
    modes: ['campaign', 'quick_post'],
    required: [],
  },
  {
    id: 'schedule_review',
    label: 'Review Schedule',
    modes: ['campaign'],
    required: ['slots'],
  },
  {
    id: 'generate',
    label: 'Generate',
    modes: ['campaign', 'quick_post'],
    required: [],
  },
];

// ── Industry-Aware Helpers ──────────────────────────────────────────────

/**
 * Returns workflow steps for a given mode, filtered by industry overrides.
 * Steps with `exclude: true` in the adapter's workflowOverrides are removed.
 */
export function getStepsForMode(mode: AssistantMode, industryKey?: string): WorkflowStep[] {
  const overrides = industryKey ? getAdapter(industryKey).workflowOverrides : undefined;
  return WORKFLOW_STEPS
    .filter((step) => step.modes.includes(mode))
    .filter((step) => {
      const stepOverride = overrides?.steps?.[step.id];
      return !stepOverride?.exclude;
    });
}

export function getStepIndex(mode: AssistantMode, stepId: AssistantStepId, industryKey?: string): number {
  const steps = getStepsForMode(mode, industryKey);
  return steps.findIndex((s) => s.id === stepId);
}

/**
 * Determines if a step is skippable, respecting industry overrides.
 */
export function isStepSkippable(
  stepId: AssistantStepId,
  session: AssistantSessionState
): boolean {
  const overrides = getAdapter(session.industryKey).workflowOverrides;
  const stepOverride = overrides?.steps?.[stepId];

  // Explicit adapter override
  if (stepOverride?.skippable !== undefined) return stepOverride.skippable;

  // Base rules
  if (stepId === 'property_select' && session.mode === 'quick_post') {
    return !(overrides?.quickPostRequiresItem);
  }
  if (stepId === 'media_select') {
    return !(overrides?.campaignRequiresMedia);
  }
  return false;
}

export function isStepComplete(
  stepId: AssistantStepId,
  session: AssistantSessionState
): boolean {
  const step = WORKFLOW_STEPS.find((s) => s.id === stepId);
  if (!step) return false;

  // Steps with no required fields are always "complete" (passthrough)
  if (step.required.length === 0) return true;

  return step.required.every((field) => {
    const value = session[field];
    if (value === null || value === undefined) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  });
}

/**
 * Returns the display label for a workflow step, adapted to the active industry.
 * Priority: adapter step override label > adapter terminology > base label.
 */
export function getStepLabel(step: WorkflowStep, industryKey: string = 'real_estate'): string {
  const adapter = getAdapter(industryKey);
  const stepOverride = adapter.workflowOverrides?.steps?.[step.id];

  if (stepOverride?.label) return stepOverride.label;
  if (step.id === 'property_select') return adapter.terminology.selectItemLabel;
  return step.label;
}

/**
 * Returns an optional description/hint for a step from the adapter.
 */
export function getStepDescription(stepId: AssistantStepId, industryKey: string = 'real_estate'): string | undefined {
  const adapter = getAdapter(industryKey);
  return adapter.workflowOverrides?.steps?.[stepId]?.description;
}
