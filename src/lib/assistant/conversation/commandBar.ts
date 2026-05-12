// Contextual command-bar helpers for the AI Assistant's bottom input.
//
// The assistant's free-form input technically accepts a lot — channel
// names, schedule presets, skip commands, revision language, freeform
// quick-post guidance, step navigation — but historically the
// placeholder and surrounding UI gave no hint. Users treated it like
// a passive chat box.
//
// These helpers turn the bottom input into a "command bar" by
// surfacing per-step:
//   - a tiny helper label above the textarea
//   - a contextual placeholder
//   - 3–6 shortcut chips (each fires through sendMessage so typed
//     and clicked commands stay consistent)
//   - an Examples popover list
//   - a graceful fallback when input can't be parsed
//
// Pure functions — no side effects, no React state. The UI component
// (AssistantCommandBar.tsx) imports and renders the results.

import { resolveNextPrompts } from './stateResolver';
import type { AssistantSessionState } from '../types';

export interface CommandBarChip {
  /** Short label shown on the chip */
  label: string;
  /** Text that gets sent through sendMessage when the chip is clicked */
  command: string;
}

export interface CommandBarContext {
  helperLabel: string;
  placeholder: string;
  chips: CommandBarChip[];
  examples: string[];
}

// ── Resolving "what step is the user on?" ───────────────────────────

// The placeholder/chips/examples key off whichever field the resolver
// thinks is next. After generation we treat the step as 'review' so
// chips switch to revision/approval commands.
type Step =
  | 'mode'
  | 'campaignSourceType'
  | 'selectedPropertyId'
  | 'campaignDataItemId'
  | 'campaignIdea'
  | 'campaignType'
  | 'channels'
  | 'selectedMediaIds'
  | 'slots'
  | 'quickPostSource'
  | 'quickPostDataItemId'
  | 'quickPostGuidance'
  | 'quickPostContentType'
  | 'quickPostChannel'
  | 'quickPostGoal'
  | 'ready'
  | 'review';

function resolveStep(
  session: AssistantSessionState,
  ready: boolean,
  hasGenerationResult: boolean,
): Step {
  if (hasGenerationResult) return 'review';
  if (ready) return 'ready';
  const next = resolveNextPrompts(session)[0];
  if (!next) return 'ready';
  return next.field as Step;
}

// ── Helper label ────────────────────────────────────────────────────
//
// One tiny line that teaches users what the box is for. Changes by
// step so the lesson is always relevant to what's on screen.

export function getContextualHelperLabel(
  session: AssistantSessionState,
  ready: boolean,
  hasGenerationResult: boolean,
): string {
  const step = resolveStep(session, ready, hasGenerationResult);

  if (step === 'review') {
    return 'Ask for edits, regenerate, or approve when ready.';
  }
  if (step === 'ready') {
    return 'Type any final tweaks, or just hit Generate.';
  }
  if (step === 'selectedMediaIds') {
    return "Type a media instruction like 'use the best 3 photos' or 'skip media'.";
  }
  if (step === 'slots') {
    return "Type a schedule like 'use recommended' or 'spread it over 10 days'.";
  }
  if (step === 'channels' || step === 'quickPostChannel') {
    return "Type a channel like 'Instagram and Facebook' — or use a chip.";
  }
  if (step === 'campaignType') {
    return 'Type a campaign type, or pick from the card above.';
  }
  if (step === 'campaignSourceType' || step === 'quickPostSource') {
    return 'Tell me what to build the post around, or pick a chip.';
  }
  if (step === 'campaignIdea' || step === 'quickPostGuidance') {
    return 'Describe the post in your own words.';
  }
  if (step === 'mode') {
    return "Try 'create a campaign' or 'make one post'.";
  }
  return 'Type an answer, make a change, or use a shortcut.';
}

// ── Placeholder ─────────────────────────────────────────────────────

export function getContextualPlaceholder(
  session: AssistantSessionState,
  ready: boolean,
  hasGenerationResult: boolean,
): string {
  const step = resolveStep(session, ready, hasGenerationResult);

  switch (step) {
    case 'review':
      return "Try: 'make it shorter', 'more professional', 'stronger CTA', or 'regenerate'";
    case 'ready':
      return session.mode === 'quick_post'
        ? "Ready to generate your post. Type anything to adjust."
        : "Ready to generate your campaign. Type anything to adjust.";
    case 'mode':
      return "Try: 'create a campaign' or 'make one Instagram post'";
    case 'campaignSourceType':
      return "Try: 'use a property', 'use a content asset', or 'start from an idea'";
    case 'selectedPropertyId':
      return "Try: 'use 508 King George Court', or pick from the list";
    case 'campaignDataItemId':
      return "Try: 'use the spring buyer guide', or pick from the list";
    case 'campaignIdea':
      return "e.g. 'Promote our new buyer concierge service over two weeks'";
    case 'quickPostSource':
      return "Try: 'use my data' or 'start from an idea about buyer tips'";
    case 'quickPostDataItemId':
      return "Try: 'use the most recent testimonial', or pick from the list";
    case 'quickPostGuidance':
      return "Try: 'announce my new listing with a friendly tone'";
    case 'quickPostContentType':
      return "Try: 'a testimonial', 'an educational post', or 'a market update'";
    case 'channels':
    case 'quickPostChannel':
      return "Try: 'use Instagram', 'Facebook and LinkedIn', or 'change to TikTok'";
    case 'campaignType':
      return "Try: 'just listed', 'price drop', or 'an educational campaign'";
    case 'selectedMediaIds':
      return "Try: 'use the best photos', 'use exterior photos', or 'skip media'";
    case 'slots':
      return "Try: 'use recommended', 'fast launch', or 'spread it over 10 days'";
    case 'quickPostGoal':
      return "Try: 'for growth', 'for engagement', or 'for sales'";
    default:
      return 'Type your instructions or use the options above…';
  }
}

// ── Chips ───────────────────────────────────────────────────────────
//
// Each chip's `command` is sent verbatim through sendMessage on click.
// The existing parser handles the resulting text the same way it
// would handle a typed command — typed and clicked commands stay
// consistent and we avoid a parallel "action dispatcher" surface.

export function getContextualChips(
  session: AssistantSessionState,
  ready: boolean,
  hasGenerationResult: boolean,
): CommandBarChip[] {
  const step = resolveStep(session, ready, hasGenerationResult);

  switch (step) {
    case 'mode':
      return [
        { label: 'Campaign', command: 'create a campaign' },
        { label: 'Single Post', command: 'make one post' },
      ];

    case 'campaignSourceType':
      return [
        { label: 'Property / Listing', command: 'use a property' },
        { label: 'Content Asset', command: 'use a content asset' },
        { label: 'From an idea', command: 'start from an idea' },
      ];

    case 'quickPostSource':
      return [
        { label: 'Use my data', command: 'use my data' },
        { label: 'Start from an idea', command: 'start from an idea' },
      ];

    case 'channels':
    case 'quickPostChannel':
      return [
        { label: 'Instagram', command: 'use Instagram' },
        { label: 'Facebook', command: 'use Facebook' },
        { label: 'LinkedIn', command: 'use LinkedIn' },
        { label: 'TikTok', command: 'use TikTok' },
      ];

    case 'campaignType': {
      // Property campaigns get listing-specific chips; data-item /
      // idea campaigns get the generic cross-industry set. Mirrors
      // the option list logic in CampaignTypeCard.
      if (session.campaignSourceType === 'property') {
        return [
          { label: 'Just Listed', command: 'just listed' },
          { label: 'Open House', command: 'open house' },
          { label: 'Price Drop', command: 'price drop' },
          { label: 'Listing Spotlight', command: 'listing spotlight' },
        ];
      }
      return [
        { label: 'Awareness', command: 'an awareness campaign' },
        { label: 'Lead Gen', command: 'a lead generation campaign' },
        { label: 'Educational', command: 'an educational campaign' },
        { label: 'Promotion', command: 'a promotion campaign' },
      ];
    }

    case 'selectedMediaIds':
      return [
        { label: 'Use best photos', command: 'use the best photos' },
        { label: 'Exterior photos', command: 'use exterior photos' },
        { label: 'Skip media', command: 'skip media' },
      ];

    case 'slots':
      return [
        { label: 'Recommended', command: 'use recommended' },
        { label: 'Fast launch', command: 'fast launch' },
        { label: 'Standard', command: 'standard cadence' },
        { label: 'Extended', command: 'extended campaign' },
      ];

    case 'quickPostContentType':
      return [
        { label: 'Educational', command: 'an educational post' },
        { label: 'Testimonial', command: 'a testimonial' },
        { label: 'Market update', command: 'a market update' },
        { label: 'Personal story', command: 'a personal story' },
      ];

    case 'quickPostGoal':
      return [
        { label: 'Growth', command: 'for growth' },
        { label: 'Engagement', command: 'for engagement' },
        { label: 'Sales', command: 'for sales' },
      ];

    case 'campaignIdea':
    case 'quickPostGuidance':
      // Freeform fields — let the user write. No chips would be
      // useful here because every workspace has different ideas.
      return [];

    case 'review':
      return [
        { label: 'Make shorter', command: 'make it shorter' },
        { label: 'More professional', command: 'more professional' },
        { label: 'Stronger CTA', command: 'stronger CTA' },
        { label: 'Regenerate', command: 'regenerate' },
      ];

    case 'ready':
      return [
        { label: 'Generate now', command: 'generate' },
      ];

    default:
      return [];
  }
}

// ── Examples popover ────────────────────────────────────────────────
//
// Slightly longer list shown when the user clicks "Examples". Mixes
// step-specific examples with always-useful navigation/skip commands
// so users learn the input's broader capabilities.

export function getContextualExamples(
  session: AssistantSessionState,
  ready: boolean,
  hasGenerationResult: boolean,
): string[] {
  const step = resolveStep(session, ready, hasGenerationResult);
  const stepSpecific: string[] = (() => {
    switch (step) {
      case 'review':
        return [
          'Make it shorter',
          'More professional',
          'Stronger CTA',
          'Add hashtags',
          'Regenerate',
        ];
      case 'selectedMediaIds':
        return [
          'Use the best 3 photos',
          'Use exterior photos',
          'Use interior photos',
          'Skip media',
        ];
      case 'slots':
        return [
          'Use recommended',
          'Fast launch',
          'Spread it over 10 days',
          'Use an extended campaign',
        ];
      case 'channels':
      case 'quickPostChannel':
        return [
          'Use Instagram and Facebook',
          'Just LinkedIn',
          'Change to TikTok',
        ];
      case 'campaignType':
        return session.campaignSourceType === 'property'
          ? ['Just listed', 'Open house', 'Price drop', 'Listing spotlight']
          : ['Awareness campaign', 'Lead generation', 'Educational', 'Promotion'];
      case 'campaignSourceType':
        return ['Use a property', 'Use a content asset', 'Start from an idea'];
      case 'quickPostSource':
        return [
          'Use my data',
          'Start from an idea about buyer tips',
        ];
      case 'quickPostContentType':
        return ['Educational', 'Testimonial', 'Market update', 'Personal story'];
      case 'mode':
        return ['Create a campaign', 'Make one Instagram post'];
      default:
        return [];
    }
  })();

  // Always-useful commands appended at the bottom so the user
  // learns the navigation/skip vocabulary regardless of step.
  const evergreen = [
    'Change the channel',
    'Change the source',
    'Skip this step',
    'Help me choose',
  ];

  return [...stepSpecific, ...evergreen];
}

// ── Unknown-input fallback ──────────────────────────────────────────
//
// When the parser can't make sense of the input, we want a helpful
// reply showing 2–4 commands that WOULD work given the current
// step — not a generic "I didn't catch that".

export function getUnknownInputSuggestions(
  session: AssistantSessionState,
  ready: boolean,
  hasGenerationResult: boolean,
): string[] {
  // Take the first ~4 chip commands; if none, fall back to evergreen
  // navigation hints.
  const chips = getContextualChips(session, ready, hasGenerationResult);
  if (chips.length > 0) {
    return chips.slice(0, 4).map((c) => c.label);
  }
  return ['Change the channel', 'Skip this step', 'Help me choose', 'Start over'];
}
