import { describe, it, expect } from 'vitest';
import {
  INSTAGRAM_BUSINESS_LOGIN_SCOPES,
  INSTAGRAM_CONNECTION_DESCRIPTION,
  INSTAGRAM_RECONNECT_BANNER,
  INSTAGRAM_SCOPE_EXPLANATIONS,
  instagramConnectionNeedsReconnect,
} from './instagramScopes';

describe('INSTAGRAM_BUSINESS_LOGIN_SCOPES', () => {
  it('is exactly the four Business Login scopes per the spec', () => {
    expect(INSTAGRAM_BUSINESS_LOGIN_SCOPES).toEqual([
      'instagram_business_basic',
      'instagram_business_content_publish',
      'instagram_business_manage_insights',
      'instagram_business_manage_comments',
    ]);
  });

  it('has a one-line explanation per scope', () => {
    for (const scope of INSTAGRAM_BUSINESS_LOGIN_SCOPES) {
      expect(INSTAGRAM_SCOPE_EXPLANATIONS[scope]).toBeTruthy();
      expect(typeof INSTAGRAM_SCOPE_EXPLANATIONS[scope]).toBe('string');
    }
  });
});

describe('INSTAGRAM_CONNECTION_DESCRIPTION', () => {
  it('frames the flow as direct Instagram Login (no "Facebook Page" language)', () => {
    expect(INSTAGRAM_CONNECTION_DESCRIPTION).toContain('Instagram Login');
    expect(INSTAGRAM_CONNECTION_DESCRIPTION).toContain('Business or Creator');
    expect(INSTAGRAM_CONNECTION_DESCRIPTION).not.toMatch(/Facebook Page/i);
    expect(INSTAGRAM_CONNECTION_DESCRIPTION).not.toMatch(/linked Page/i);
  });

  it('lists each Business Login scope with its explanation', () => {
    for (const scope of INSTAGRAM_BUSINESS_LOGIN_SCOPES) {
      expect(INSTAGRAM_CONNECTION_DESCRIPTION).toContain(scope);
      expect(INSTAGRAM_CONNECTION_DESCRIPTION).toContain(
        INSTAGRAM_SCOPE_EXPLANATIONS[scope],
      );
    }
  });

  it('does NOT mention any legacy or Page scope', () => {
    for (const legacy of [
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_insights',
      'instagram_manage_comments',
      'instagram_manage_messages',
      'business_management',
      'pages_show_list',
      'pages_read_engagement',
    ]) {
      // Substring check needs word boundary safety — the new scope
      // names contain the substring "instagram_" too.
      const pattern = new RegExp(`(^|\\W)${legacy}(\\W|$)`);
      expect(INSTAGRAM_CONNECTION_DESCRIPTION).not.toMatch(pattern);
    }
  });
});

describe('INSTAGRAM_RECONNECT_BANNER', () => {
  it('uses the exact wording from the spec', () => {
    expect(INSTAGRAM_RECONNECT_BANNER).toBe(
      'Instagram changed to direct Instagram Login. Please reconnect Instagram to grant the new Business permissions.',
    );
  });
});

describe('instagramConnectionNeedsReconnect', () => {
  it('returns false for null / undefined / empty (no false positives before the API reports)', () => {
    expect(instagramConnectionNeedsReconnect(null)).toBe(false);
    expect(instagramConnectionNeedsReconnect(undefined)).toBe(false);
    expect(instagramConnectionNeedsReconnect([])).toBe(false);
  });

  it('returns false for a clean Business Login scope set', () => {
    expect(
      instagramConnectionNeedsReconnect([
        'instagram_business_basic',
        'instagram_business_content_publish',
        'instagram_business_manage_insights',
        'instagram_business_manage_comments',
      ]),
    ).toBe(false);
  });

  it('returns true when ANY legacy scope is present', () => {
    expect(
      instagramConnectionNeedsReconnect([
        'instagram_business_basic',
        'instagram_business_content_publish',
        'instagram_business_manage_insights',
        'instagram_business_manage_comments',
        // legacy bleed-through — should still flag reconnect
        'instagram_basic',
      ]),
    ).toBe(true);
  });

  it('returns true when ANY of the four new scopes is missing', () => {
    expect(
      instagramConnectionNeedsReconnect([
        'instagram_business_basic',
        'instagram_business_content_publish',
        'instagram_business_manage_insights',
        // comments scope missing
      ]),
    ).toBe(true);
  });

  it('returns true for the OLD Facebook-Login-via-Page scope shape', () => {
    expect(
      instagramConnectionNeedsReconnect([
        'instagram_basic',
        'instagram_content_publish',
        'instagram_manage_insights',
        'pages_show_list',
        'pages_read_engagement',
        'business_management',
      ]),
    ).toBe(true);
  });

  it('returns true when a Page scope sneaks onto the Instagram connection', () => {
    expect(
      instagramConnectionNeedsReconnect([
        'instagram_business_basic',
        'instagram_business_content_publish',
        'instagram_business_manage_insights',
        'instagram_business_manage_comments',
        'pages_show_list', // shouldn't be on the IG connection
      ]),
    ).toBe(true);
  });
});
