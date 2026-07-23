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
    `What would you like to create?`,
    'mode_select'
  );
}

export function buildNextPromptMessage(
  prompt: ResolvedPrompt,
  session: AssistantSessionState
): ChatMessage {
  // industry-01 — neutral terminology when no industry is selected
  // so no-industry sessions don't see real-estate copy
  // ("Which listing should this campaign promote?").
  const adapter = getAdapterSafe(session.industryKey);
  const t = adapter?.terminology ?? {
    itemSingular: 'item',
    itemPlural: 'items',
    selectItemLabel: 'Pick an item',
    itemDataLabel: 'Item details',
    priceLabel: 'Price',
  };

  switch (prompt.cardType) {
    case 'mode_select':
      return buildInteractivePrompt(
        `What would you like to create?`,
        'mode_select'
      );

    case 'campaign_source':
      // Step inserted between mode-select and the source-specific
      // picker (property / content-asset / idea). Without this case
      // the message defaulted to the catch-all "What would you like
      // to do next?" text bubble and the source card never rendered.
      return buildInteractivePrompt(
        `What should this campaign be based on?`,
        'campaign_source'
      );

    case 'property_select':
      return buildInteractivePrompt(
        session.mode === 'campaign'
          ? `Which ${t.itemSingular} should this campaign promote?`
          : `Which ${t.itemSingular} would you like to create content for?`,
        'property_select'
      );

    case 'campaign_data_item':
      return buildInteractivePrompt(
        `Which content asset should this campaign use?`,
        'campaign_data_item'
      );

    case 'campaign_idea':
      return buildInteractivePrompt(
        `What should this campaign be about?`,
        'campaign_idea'
      );

    case 'campaign_url_source':
      return buildInteractivePrompt(
        `I'll analyze that URL and pull out the campaign source details.`,
        'campaign_url_source'
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
        `Pick images or video for your content. I'll show property photos and your media library.`,
        'media_select'
      );

    case 'schedule_review':
      return buildInteractivePrompt(
        `Here's the proposed schedule. You can adjust timing and channels for each post.`,
        'schedule_review'
      );

    case 'generation':
      return buildInteractivePrompt(
        session.mode === 'quick_post'
          ? `Everything looks good! Ready to generate your post.`
          : `Everything looks good! Ready to generate your campaign.`,
        'generation'
      );

    case 'campaign_review':
      return buildInteractivePrompt(
        `Your campaign is ready! Review each post, tweak anything, then save or queue.`,
        'campaign_review'
      );

    case 'quick_post_source':
      return buildInteractivePrompt(
        'How do you want to start? You can pull from your data or describe an idea.',
        'quick_post_source'
      );

    case 'quick_post_data':
      return buildInteractivePrompt(
        'Which data item should we base this post on? Search and select below.',
        'quick_post_data'
      );

    case 'quick_post_guidance':
      return buildInteractivePrompt(
        'What should this post be about? Pick a suggestion, try a quick angle, or describe your idea.',
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

export function buildReadyMessage(session?: AssistantSessionState): ChatMessage {
  const label = session?.mode === 'quick_post' ? 'your post' : 'your campaign';
  return buildInteractivePrompt(
    `All set! Ready to generate ${label}.`,
    'generation'
  );
}

export function buildRevisionMessage(field: string, newValue: string): ChatMessage {
  return buildConfirmation(`Updated: ${newValue}`);
}

export function buildInvalidationNotice(field: string): ChatMessage {
  return buildSystemUpdate(`${field} was reset due to a prior change.`);
}
