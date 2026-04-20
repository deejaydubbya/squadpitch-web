import type { InlineActionConfig } from './types';

export const INLINE_ACTIONS: InlineActionConfig[] = [
  {
    type: 'rewrite_post',
    label: 'Rewrite',
    description: 'Rewrite with a fresh perspective',
    icon: 'RefreshCw',
    outputMode: 'replace',
    allowedStatuses: ['DRAFT', 'PENDING_REVIEW'],
    params: [
      {
        key: 'focus',
        label: 'Focus on',
        type: 'select',
        options: [
          { value: 'clarity', label: 'Clarity' },
          { value: 'engagement', label: 'Engagement' },
          { value: 'storytelling', label: 'Storytelling' },
          { value: 'brevity', label: 'Brevity' },
        ],
      },
    ],
  },
  {
    type: 'generate_variations',
    label: 'Variations',
    description: 'Create 3 different variations',
    icon: 'CopyPlus',
    outputMode: 'duplicate',
    allowedStatuses: ['DRAFT', 'PENDING_REVIEW', 'APPROVED'],
  },
  {
    type: 'improve_caption',
    label: 'Improve',
    description: 'Polish grammar, hook, and flow',
    icon: 'Sparkles',
    outputMode: 'replace',
    allowedStatuses: ['DRAFT', 'PENDING_REVIEW'],
  },
  {
    type: 'adjust_tone',
    label: 'Adjust Tone',
    description: 'Rewrite in a different tone',
    icon: 'Palette',
    outputMode: 'replace',
    allowedStatuses: ['DRAFT', 'PENDING_REVIEW'],
    params: [
      {
        key: 'tone',
        label: 'Tone',
        type: 'select',
        options: [
          { value: 'professional', label: 'Professional' },
          { value: 'casual', label: 'Casual' },
          { value: 'witty', label: 'Witty' },
          { value: 'inspirational', label: 'Inspirational' },
          { value: 'urgent', label: 'Urgent' },
        ],
      },
    ],
  },
  {
    type: 'expand_post',
    label: 'Expand',
    description: 'Add more detail and storytelling',
    icon: 'Maximize2',
    outputMode: 'replace',
    allowedStatuses: ['DRAFT', 'PENDING_REVIEW'],
  },
  {
    type: 'optimize_schedule',
    label: 'Best Time',
    description: 'Find the optimal posting time',
    icon: 'Clock',
    outputMode: 'preview',
    allowedStatuses: ['APPROVED', 'SCHEDULED'],
  },
];

export function getActionsForStatus(status: string): InlineActionConfig[] {
  return INLINE_ACTIONS.filter((a) => a.allowedStatuses.includes(status as never));
}
