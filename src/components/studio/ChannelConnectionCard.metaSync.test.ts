// Source-level lock-in tests for the Meta polling migration UI surface
// added on the ChannelConnectionCard. We assert against the file source
// rather than rendering React because the project doesn't carry
// @testing-library/react (see the existing source-level pattern in
// `src/app/legalContent.test.ts`).
//
// These tests defend three things:
//   1. The new hooks exist and hit the exact endpoints prompt 03 shipped.
//   2. ChannelConnectionCard renders the FB + IG sync blocks under the
//      right gating conditions (and the IG block is hidden when the
//      reconnect banner is visible, so we don't double-CTA the user).
//   3. The webhooks→polling copy is right ("Sync comments now",
//      polled every 15 min, etc.) — protects against accidental
//      rebrand to "subscribe" or "webhook" wording.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../..');

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const HOOKS = read('src/hooks/useSquadpitch.ts');
const CARD = read('src/components/studio/ChannelConnectionCard.tsx');

describe('useSyncFacebookComments hook', () => {
  it('is exported from src/hooks/useSquadpitch.ts', () => {
    expect(HOOKS).toMatch(/export function useSyncFacebookComments\(clientId: string\)/);
  });

  it('POSTs to workspaces/${clientId}/connections/FACEBOOK/sync-comments', () => {
    // Pull the function body and assert against it specifically so a
    // typo elsewhere in the file can't satisfy this check.
    const start = HOOKS.indexOf('export function useSyncFacebookComments');
    expect(start).toBeGreaterThan(-1);
    const slice = HOOKS.slice(start, start + 600);
    expect(slice).toContain('`workspaces/${clientId}/connections/FACEBOOK/sync-comments`');
    expect(slice).toContain("method: 'POST'");
  });

  it('types the return as the queued envelope shape', () => {
    const start = HOOKS.indexOf('export function useSyncFacebookComments');
    const slice = HOOKS.slice(start, start + 600);
    expect(slice).toContain(
      "apiFetch<{ status: 'queued'; connectionId: string; message: string }>",
    );
  });
});

describe('useSyncInstagramComments hook', () => {
  it('is exported from src/hooks/useSquadpitch.ts', () => {
    expect(HOOKS).toMatch(/export function useSyncInstagramComments\(clientId: string\)/);
  });

  it('POSTs to workspaces/${clientId}/connections/INSTAGRAM/sync-comments', () => {
    const start = HOOKS.indexOf('export function useSyncInstagramComments');
    expect(start).toBeGreaterThan(-1);
    const slice = HOOKS.slice(start, start + 600);
    expect(slice).toContain('`workspaces/${clientId}/connections/INSTAGRAM/sync-comments`');
    expect(slice).toContain("method: 'POST'");
  });

  it('types the return as the queued envelope shape', () => {
    const start = HOOKS.indexOf('export function useSyncInstagramComments');
    const slice = HOOKS.slice(start, start + 600);
    expect(slice).toContain(
      "apiFetch<{ status: 'queued'; connectionId: string; message: string }>",
    );
  });
});

describe('ChannelConnectionCard wires both new hooks', () => {
  it('imports useSyncFacebookComments and useSyncInstagramComments', () => {
    expect(CARD).toContain('useSyncFacebookComments');
    expect(CARD).toContain('useSyncInstagramComments');
  });

  it('instantiates both hooks scoped to the clientId prop', () => {
    expect(CARD).toContain('const syncFacebookComments = useSyncFacebookComments(clientId);');
    expect(CARD).toContain('const syncInstagramComments = useSyncInstagramComments(clientId);');
  });
});

describe('Facebook sync-comments block', () => {
  it('renders only when channel === FACEBOOK && isConnected', () => {
    expect(CARD).toContain("channel === 'FACEBOOK' && isConnected");
  });

  it('uses the spec helper copy ("polled every 15 min. Force a check now.")', () => {
    expect(CARD).toMatch(
      /Comments on your Squadpitch-published Facebook posts are[\s\S]*polled every 15 min\. Force a check now\./,
    );
  });

  it('button cycles label through "Sync comments now" → "Syncing…" → "Queued ✓"', () => {
    // The cycle lives in a single ternary block; pin all three labels.
    expect(CARD).toContain('syncFacebookComments.isPending');
    expect(CARD).toContain('syncFacebookComments.isSuccess');
    expect(CARD).toContain("'Sync comments now'");
    expect(CARD).toContain("'Syncing…'");
    expect(CARD).toContain("'Queued ✓'");
  });

  it('button is disabled while pending and fires the mutation on click', () => {
    expect(CARD).toContain('onClick={() => syncFacebookComments.mutate()}');
    expect(CARD).toContain('disabled={syncFacebookComments.isPending}');
  });

  it('renders an error row when the mutation fails', () => {
    expect(CARD).toMatch(/syncFacebookComments\.isError[\s\S]*syncFacebookComments\.error/);
  });
});

describe('Instagram sync-comments block', () => {
  it('renders only when channel === INSTAGRAM && isConnected && !instagramNeedsReconnect', () => {
    // The !instagramNeedsReconnect gate is load-bearing: it suppresses
    // the Sync block when the reconnect banner is the only CTA we want
    // to show, so the user can't pre-emptively kick a poll that's
    // guaranteed to 401 against Meta with the stale scope shape.
    expect(CARD).toContain(
      "channel === 'INSTAGRAM' && isConnected && !instagramNeedsReconnect",
    );
  });

  it('uses the spec helper copy ("polled every 15 min. Force a check now.")', () => {
    expect(CARD).toMatch(
      /Comments on your Squadpitch-published Instagram posts are[\s\S]*polled every 15 min\. Force a check now\./,
    );
  });

  it('button cycles label through "Sync comments now" → "Syncing…" → "Queued ✓"', () => {
    expect(CARD).toContain('syncInstagramComments.isPending');
    expect(CARD).toContain('syncInstagramComments.isSuccess');
    expect(CARD).toContain('onClick={() => syncInstagramComments.mutate()}');
    expect(CARD).toContain('disabled={syncInstagramComments.isPending}');
  });

  it('renders an error row when the mutation fails', () => {
    expect(CARD).toMatch(/syncInstagramComments\.isError[\s\S]*syncInstagramComments\.error/);
  });

  it('IG reconnect banner block is preserved (still rendered when scopes are stale)', () => {
    // Regression guard: don't let a future refactor of the IG sync
    // block accidentally remove the existing reconnect banner.
    expect(CARD).toContain('{instagramNeedsReconnect && (');
    expect(CARD).toContain('INSTAGRAM_RECONNECT_BANNER');
  });
});

describe('Threads sync block (regression — must not be broken)', () => {
  it('still renders for channel === THREADS && isConnected', () => {
    expect(CARD).toContain("channel === 'THREADS' && isConnected");
  });

  it('still calls useSyncThreadsReplies and mutates on click', () => {
    expect(CARD).toContain('const syncThreadsReplies = useSyncThreadsReplies(clientId);');
    expect(CARD).toContain('onClick={() => syncThreadsReplies.mutate()}');
  });
});

describe('Allowed-scope hygiene — no forbidden DM/Messenger copy in the card', () => {
  // Spec explicitly forbids DM / private-message scope copy anywhere
  // in the polling-migration surfaces.
  const FORBIDDEN = [
    'instagram_business_manage_messages',
    'pages_messaging',
    'pages_messaging_subscriptions',
    'private message',
    'direct message',
    'DM scope',
  ];

  for (const term of FORBIDDEN) {
    it(`does not mention "${term}"`, () => {
      expect(CARD.toLowerCase()).not.toContain(term.toLowerCase());
    });
  }
});
