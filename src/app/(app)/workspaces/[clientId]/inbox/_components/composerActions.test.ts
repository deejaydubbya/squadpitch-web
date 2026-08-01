import { describe, expect, it } from 'vitest';
import type { ReplyActionDescriptor } from '@/hooks/useInbox';
import { isProviderConnectionAction, primaryReplyAction, shouldDefaultToPrimary } from './composerActions';

const item = (action: ReplyActionDescriptor['action'], available: boolean, requiresConfig = false): ReplyActionDescriptor =>
  ({ action, available, requiresConfig, label: action, reason: available ? null : 'blocked' });

describe('provider-aware composer actions', () => {
  it('keeps an Instagram public reply authoritative without inventing email', () => {
    const actions = [item('REPLY_PUBLIC_COMMENT', true), item('LOG_EXTERNAL_REPLY', true), item('INTERNAL_NOTE', true)];
    expect(primaryReplyAction(actions)?.action).toBe('REPLY_PUBLIC_COMMENT');
    expect(actions.some((action) => action.action === 'SEND_EMAIL')).toBe(false);
    expect(shouldDefaultToPrimary(actions)).toBe(true);
  });

  it('uses SEND_EMAIL only when the API includes it', () => {
    expect(primaryReplyAction([item('SEND_EMAIL', false)])?.action).toBe('SEND_EMAIL');
    expect(shouldDefaultToPrimary([item('SEND_EMAIL', false)])).toBe(false);
  });

  it('offers settings only for a real provider connection blocker', () => {
    expect(isProviderConnectionAction(item('REPLY_PUBLIC_COMMENT', false, true))).toBe(true);
    expect(isProviderConnectionAction(item('SEND_EMAIL', false, true))).toBe(false);
  });
});
