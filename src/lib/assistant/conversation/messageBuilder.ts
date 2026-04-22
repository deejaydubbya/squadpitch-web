import type { AssistantSessionState } from '../types';
import type { ChatMessage, CardType, MessageType, ResolvedPrompt } from './types';
import { getAdapterSafe } from '../adapterRegistry';

let messageCounter = 0;

function createId(): string {
  return `msg_${Date.now()}_${++messageCounter}`;
}

// ── Factories ────────────────────────────────────────────────────────────

export function buildAssistantText(content: string): ChatMessage {
  return {
    id: createId(),
    type: 'assistant_text',
    content,
    timestamp: Date.now(),
    status: 'resolved',
  };
}

export function buildUserText(content: string, payload?: Record<string, unknown>): ChatMessage {
  return {
    id: createId(),
    type: 'user_text',
    content,
    timestamp: Date.now(),
    status: 'resolved',
    payload,
  };
}

export function buildInteractivePrompt(content: string, cardType: CardType): ChatMessage {
  return {
    id: createId(),
    type: 'interactive_prompt',
    content,
    cardType,
    timestamp: Date.now(),
    status: 'active',
  };
}

export function buildConfirmation(content: string, payload?: Record<string, unknown>): ChatMessage {
  return {
    id: createId(),
    type: 'confirmation',
    content,
    timestamp: Date.now(),
    status: 'resolved',
    payload,
  };
}

export function buildSystemUpdate(content: string): ChatMessage {
  return {
    id: createId(),
    type: 'system_update',
    content,
    timestamp: Date.now(),
    status: 'resolved',
  };
}

// ── High-level builders ──────────────────────────────────────────────────

export function buildWelcomeMessage(session: AssistantSessionState): ChatMessage {
  return buildInteractivePrompt(
    `What would you like to create? I can help you build a multi-post campaign or a quick single post.`,
    'mode_select'
  );
}

export function buildNextPromptMessage(
  prompt: ResolvedPrompt,
  session: AssistantSessionState
): ChatMessage {
  const adapter = getAdapterSafe(session.industryKey);
  const t = adapter.terminology;

  switch (prompt.cardType) {
    case 'mode_select':
      return buildInteractivePrompt(
        `What would you like to create? I can help you build a multi-post campaign or a quick single post.`,
        'mode_select'
      );

    case 'property_select':
      return buildInteractivePrompt(
        `Which ${t.itemSingular} would you like to create content for?`,
        'property_select'
      );

    case 'campaign_type':
      return buildInteractivePrompt(
        `What type of campaign would you like to create?`,
        'campaign_type'
      );

    case 'channel_select':
      if (session.mode === 'campaign') {
        return buildInteractivePrompt(
          `Which channels should this campaign post to?`,
          'channel_select'
        );
      }
      return buildInteractivePrompt(
        `Which channel should this post go to?`,
        'channel_select'
      );

    case 'media_select':
      return buildInteractivePrompt(
        `Which images should we use for this campaign? I'll show property photos and your media library.`,
        'media_select'
      );

    case 'schedule_review':
      return buildInteractivePrompt(
        `Here's the proposed schedule. You can adjust timing and channels for each post.`,
        'schedule_review'
      );

    case 'generation':
      return buildInteractivePrompt(
        `Everything looks good! Ready to generate your campaign.`,
        'generation'
      );

    case 'campaign_review':
      return buildInteractivePrompt(
        `Your campaign has been generated! Review each post below, then save or launch.`,
        'campaign_review'
      );

    case 'quick_post_source':
      return buildInteractivePrompt(
        'Do you want to use your data or start from an idea?',
        'quick_post_source'
      );

    case 'quick_post_data':
      return buildInteractivePrompt(
        'Which data item should we base this post on? Search and select below.',
        'quick_post_data'
      );

    case 'quick_post_guidance':
      return buildInteractivePrompt(
        'What do you want to post about? Pick a recommendation, use a quick angle, or describe your idea.',
        'quick_post_guidance'
      );

    case 'quick_post_content_type':
      return buildInteractivePrompt(
        'What type of content is this?',
        'quick_post_content_type'
      );

    case 'quick_post_goal':
      return buildInteractivePrompt(
        "What's the goal of this post?",
        'quick_post_goal'
      );

    default:
      return buildAssistantText(`What would you like to do next?`);
  }
}

export function buildFieldConfirmation(
  field: string,
  value: string,
): ChatMessage {
  return buildConfirmation(`${value}`);
}

export function buildMultiFieldConfirmation(detectedFields: string[]): ChatMessage {
  if (detectedFields.length === 1) {
    return buildConfirmation(detectedFields[0]);
  }
  const list = detectedFields.join(' | ');
  return buildConfirmation(list);
}

export function buildReadyMessage(): ChatMessage {
  return buildInteractivePrompt(
    `All set! I have everything needed. Ready to generate when you are.`,
    'generation'
  );
}

export function buildRevisionMessage(field: string, newValue: string): ChatMessage {
  return buildConfirmation(`Updated: ${newValue}`);
}

export function buildInvalidationNotice(field: string): ChatMessage {
  return buildSystemUpdate(`${field} was reset due to a prior change.`);
}
