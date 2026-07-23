import { describe, expect, it } from 'vitest';
import { INITIAL_SESSION } from '../defaults';
import { buildNextPromptMessage } from './messageBuilder';

describe('buildNextPromptMessage', () => {
  it('renders the campaign URL source card instead of the fallback message', () => {
    const msg = buildNextPromptMessage(
      { field: 'campaignSourceUrl', cardType: 'campaign_url_source', priority: 10 },
      { ...INITIAL_SESSION, mode: 'campaign', campaignSourceType: 'url' },
    );

    expect(msg.type).toBe('interactive_prompt');
    expect(msg.cardType).toBe('campaign_url_source');
    expect(msg.content).not.toBe('What would you like to do next?');
  });

  it('still renders the campaign source picker card', () => {
    const msg = buildNextPromptMessage(
      { field: 'campaignSourceType', cardType: 'campaign_source', priority: 5 },
      { ...INITIAL_SESSION, mode: 'campaign' },
    );

    expect(msg.type).toBe('interactive_prompt');
    expect(msg.cardType).toBe('campaign_source');
  });
});
