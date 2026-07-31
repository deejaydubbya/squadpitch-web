import { describe, expect, it } from 'vitest';
import { redactSentryEvent } from './sentryPrivacy';

describe('redactSentryEvent', () => {
  it('removes request credentials, content, and user PII while preserving safe context', () => {
    const event = redactSentryEvent({
      request: { headers: { authorization: 'Bearer secret' }, cookies: { session: 'secret' }, data: 'customer content', url: '/route?code=oauth-secret' },
      user: { id: 'user-id', email: 'person@example.com', ip_address: '127.0.0.1' },
      extra: { workspaceId: 'workspace-id', provider: 'stripe', accessToken: 'secret' },
    });
    expect(event.request).toMatchObject({ url: '/route' });
    expect(event.request.headers).toBeUndefined();
    expect(event.request.cookies).toBeUndefined();
    expect(event.request.data).toBeUndefined();
    expect(event.user).toEqual({ id: 'user-id' });
    expect(event.extra).toEqual({ workspaceId: 'workspace-id', provider: 'stripe', accessToken: '[Filtered]' });
    expect(JSON.stringify(event)).not.toContain('Bearer secret');
    expect(JSON.stringify(event)).not.toContain('person@example.com');
    expect(JSON.stringify(event)).not.toContain('oauth-secret');
  });
});
