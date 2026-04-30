import type { Channel } from '@/hooks/useSquadpitch';

// ── Action IDs ──────────────────────────────────────────────────────

export type TextImproveActionId =
  | 'stronger_hook'
  | 'make_professional'
  | 'make_casual'
  | 'make_local'
  | 'shorten_caption'
  | 'stronger_cta'
  | 'rewrite_for_instagram'
  | 'rewrite_for_facebook'
  | 'rewrite_for_linkedin'
  | 'turn_into_video_idea';

export type MediaImproveActionId = 'generate_matching_image' | 'generate_matching_video';

export type ImproveActionId = TextImproveActionId | MediaImproveActionId;

export interface ImproveAction {
  id: ImproveActionId;
  category: 'text' | 'media';
  label: string;
  description: string;
}

export const IMPROVE_ACTIONS: ImproveAction[] = [
  // Text improvements
  { id: 'stronger_hook', category: 'text', label: 'Stronger hook', description: 'Rewrite the opening line to grab attention' },
  { id: 'make_professional', category: 'text', label: 'Make professional', description: 'Adjust tone to be more polished and authoritative' },
  { id: 'make_casual', category: 'text', label: 'Make casual', description: 'Lighten the tone for a friendlier feel' },
  { id: 'make_local', category: 'text', label: 'Add local flair', description: 'Reference the local area or community' },
  { id: 'shorten_caption', category: 'text', label: 'Shorten', description: 'Cut to under 150 characters' },
  { id: 'stronger_cta', category: 'text', label: 'Stronger CTA', description: 'Make the call to action more compelling' },
  { id: 'rewrite_for_instagram', category: 'text', label: 'Optimize for Instagram', description: 'Adjust length, hashtags, and tone for Instagram' },
  { id: 'rewrite_for_facebook', category: 'text', label: 'Optimize for Facebook', description: 'Adjust length and tone for Facebook' },
  { id: 'rewrite_for_linkedin', category: 'text', label: 'Optimize for LinkedIn', description: 'Adjust tone and format for LinkedIn' },
  { id: 'turn_into_video_idea', category: 'text', label: 'Turn into video idea', description: 'Rewrite as a short-form video script concept' },
  // Media
  { id: 'generate_matching_image', category: 'media', label: 'Generate matching image', description: 'Create an AI image based on the post content' },
  { id: 'generate_matching_video', category: 'media', label: 'Generate matching video', description: 'Create an AI video based on the post content' },
];

export const TEXT_ACTIONS = IMPROVE_ACTIONS.filter((a) => a.category === 'text');
export const MEDIA_ACTIONS = IMPROVE_ACTIONS.filter((a) => a.category === 'media');

// ── Prompt builders ─────────────────────────────────────────────────

export interface PromptContext {
  body: string;
  cta: string | null;
  hashtags: string[];
  channel?: Channel;
  propertyAddress?: string;
}

const ACTION_INSTRUCTIONS: Record<TextImproveActionId, (ctx: PromptContext) => string> = {
  stronger_hook: () =>
    'Rewrite the opening line to be a powerful attention-grabbing hook. Keep the rest of the post similar.',
  make_professional: () =>
    'Rewrite with a polished, professional, and authoritative tone. Suitable for business audiences.',
  make_casual: () =>
    'Rewrite with a friendly, casual, approachable tone. Use conversational language.',
  make_local: (ctx) =>
    `Add local community references and neighborhood flair.${ctx.propertyAddress ? ` The property is at ${ctx.propertyAddress}.` : ''} Mention nearby landmarks or the vibe of the area.`,
  shorten_caption: () =>
    'Shorten this post to under 150 characters while keeping the core message and impact.',
  stronger_cta: (ctx) =>
    `Make the call to action much more compelling and urgent.${ctx.cta ? ` Current CTA: "${ctx.cta}".` : ' Add a clear CTA if missing.'}`,
  rewrite_for_instagram: () =>
    'Rewrite optimized for Instagram: engaging opener, 100-300 characters body, 5-15 relevant hashtags, emoji where natural.',
  rewrite_for_facebook: () =>
    'Rewrite optimized for Facebook: conversational tone, 100-500 characters, 2-5 hashtags, question or call-to-action to drive engagement.',
  rewrite_for_linkedin: () =>
    'Rewrite optimized for LinkedIn: professional tone, 200-700 characters, 3-5 industry hashtags, thought-leadership angle.',
  turn_into_video_idea: () =>
    'Rewrite this as a short-form video script concept. Include a hook (first 3 seconds), key talking points, and a closing CTA. Format as a numbered shot list.',
};

export function buildImproveGuidance(actionId: TextImproveActionId, ctx: PromptContext): string {
  const instruction = ACTION_INSTRUCTIONS[actionId](ctx);
  const channelNote = ctx.channel ? `Target channel: ${ctx.channel}.` : '';
  const hashtagNote = ctx.hashtags.length > 0 ? `Current hashtags: ${ctx.hashtags.map((h) => `#${h}`).join(' ')}.` : '';

  return [
    'Improve the following social media post.',
    instruction,
    channelNote,
    hashtagNote,
    "Don't invent new facts about the property or product. Only use information present in the original.",
    '',
    '--- CURRENT POST ---',
    ctx.body,
    ctx.cta ? `CTA: ${ctx.cta}` : '',
    '--- END ---',
    '',
    'Return ONLY the improved post body. Do not include explanations.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildMediaGuidance(body: string, channel?: Channel): string {
  const channelNote = channel ? ` for ${channel}` : '';
  return `Create a visually striking image${channelNote} that matches this post: ${body.slice(0, 500)}`;
}
