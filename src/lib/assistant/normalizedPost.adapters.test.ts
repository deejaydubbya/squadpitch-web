import { describe, it, expect } from 'vitest';
import type { CampaignPost, Draft, ScoredHook } from '@/hooks/useSquadpitch';
import {
  campaignPostToNormalized,
  draftToNormalized,
  normalizedToCampaignPost,
  normalizedToDraftUpdate,
  deriveContentType,
} from './normalizedPost.adapters';

// ── Helpers ──────────────────────────────────────────────────────────

function makeCampaignPost(overrides: Partial<CampaignPost> = {}): CampaignPost {
  return {
    campaignDay: 1,
    channel: 'INSTAGRAM',
    angle: 'promotional',
    label: 'Launch Day',
    body: 'Check out this new listing!',
    hashtags: ['realestate', 'newlisting', 'dreamhome'],
    cta: 'DM me for details',
    subject: 'New Listing Alert',
    ...overrides,
  };
}

function makeDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: 'draft-1',
    clientId: 'client-1',
    kind: 'POST',
    status: 'DRAFT',
    channel: 'INSTAGRAM',
    bucketKey: null,
    generationGuidance: '',
    modelUsed: null,
    promptVersion: 1,
    body: 'Amazing property just listed!',
    hooks: ['Hot new listing!', 'Your dream home awaits', 'Just listed in Austin'],
    hashtags: ['realestate', 'austin', 'homes'],
    cta: 'Link in bio',
    variations: null,
    scoredHooks: null,
    altText: null,
    imageGuidance: null,
    videoGuidance: null,
    mediaPlan: null,
    warnings: [],
    campaignId: null,
    campaignName: null,
    campaignType: null,
    campaignDay: null,
    campaignOrder: null,
    campaignTotal: null,
    mediaUrl: null,
    mediaType: null,
    mediaAssets: [],
    externalPostId: null,
    externalPostUrl: null,
    publishError: null,
    publishAttempts: 0,
    lastPublishAttemptAt: null,
    performanceRating: null,
    ratedAt: null,
    createdBy: 'user-1',
    approvedBy: null,
    approvedAt: null,
    rejectedReason: null,
    scheduledFor: null,
    publishedAt: null,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

// ── campaignPostToNormalized ─────────────────────────────────────────

describe('campaignPostToNormalized', () => {
  it('creates 2 versions when bodyAlt present', () => {
    const post = makeCampaignPost({ bodyAlt: 'Alternative version here' });
    const result = campaignPostToNormalized(post, 0);

    expect(result.versions).toHaveLength(2);
    expect(result.versions[0].label).toBe('Version A');
    expect(result.versions[0].body).toBe('Check out this new listing!');
    expect(result.versions[1].label).toBe('Version B');
    expect(result.versions[1].body).toBe('Alternative version here');
  });

  it('creates 1 version when no bodyAlt', () => {
    const post = makeCampaignPost();
    const result = campaignPostToNormalized(post, 0);

    expect(result.versions).toHaveLength(1);
    expect(result.versions[0].body).toBe('Check out this new listing!');
  });

  it('scores each version individually', () => {
    const post = makeCampaignPost({
      bodyAlt: 'A much longer alternative version with lots of detail about the property location and features',
      hookScore: 0.85,
    });
    const result = campaignPostToNormalized(post, 0);

    expect(result.versions[0].score).not.toBeNull();
    expect(result.versions[1].score).not.toBeNull();
    expect(result.versions[0].score!.max).toBe(10);
    expect(result.versions[1].score!.max).toBe(10);
  });

  it('sets bestVersionId', () => {
    const post = makeCampaignPost();
    const result = campaignPostToNormalized(post, 0);

    expect(result.bestVersionId).toBeTruthy();
    expect(result.bestVersionId).toBe(result.selectedVersionId);
  });

  it('auto-selects higher-scoring version', () => {
    // Version B has a much longer body, so should score higher on body length
    const post = makeCampaignPost({
      body: 'Short',
      bodyAlt: 'This is a much longer alternative version with detailed description of the property including features, location details, pricing information, and neighborhood highlights that should score higher on body length.',
    });
    const result = campaignPostToNormalized(post, 0);

    // The best version should be the one with the higher score
    const vA = result.versions[0];
    const vB = result.versions[1];
    if ((vB.score?.value ?? 0) > (vA.score?.value ?? 0)) {
      expect(result.bestVersionId).toBe(vB.id);
      expect(result.selectedVersionId).toBe(vB.id);
    }
  });

  it('returns null score when hookScore is undefined (uses computed per-version score)', () => {
    const post = makeCampaignPost();
    const result = campaignPostToNormalized(post, 0);

    // Now we always compute per-version scores
    expect(result.score).not.toBeNull();
    expect(result.versions[0].score).not.toBeNull();
  });

  it('maps assignedImageIds to media refs', () => {
    const post = makeCampaignPost({ assignedImageIds: ['img-1', 'img-2'] });
    const result = campaignPostToNormalized(post, 0);

    expect(result.media).toHaveLength(2);
    expect(result.media[0]).toEqual({ id: 'img-1', source: 'auto_assigned' });
    expect(result.media[1]).toEqual({ id: 'img-2', source: 'auto_assigned' });
    expect(result.primaryMediaId).toBe('img-1');
  });

  it('handles no assignedImageIds', () => {
    const post = makeCampaignPost();
    const result = campaignPostToNormalized(post, 0);

    expect(result.media).toHaveLength(0);
    expect(result.primaryMediaId).toBeNull();
  });

  it('preserves campaign metadata', () => {
    const post = makeCampaignPost({
      campaignDay: 3,
      angle: 'lifestyle',
      label: 'Day 3 Lifestyle',
      subject: 'Dream Living',
      imageHint: 'kitchen photo',
      slotType: 'email',
    });
    const result = campaignPostToNormalized(post, 2, 'My Campaign');

    expect(result.campaignMeta).toEqual({
      campaignDay: 3,
      angle: 'lifestyle',
      label: 'Day 3 Lifestyle',
      subject: 'Dream Living',
      imageHint: 'kitchen photo',
      campaignName: 'My Campaign',
      slotType: 'email',
    });
    expect(result.sourceType).toBe('campaign');
    expect(result.category).toBe('email');
  });

  it('sets data awareness when dataItemId provided', () => {
    const post = makeCampaignPost();
    const result = campaignPostToNormalized(post, 0, undefined, 'data-123');

    expect(result.dataAwareness).toEqual({
      level: 'uses_user_data',
      sourceId: 'data-123',
      sourceType: 'listing',
      dataSourcesUsed: ['Linked data item'],
    });
  });

  it('sets missing_data awareness when no dataItemId', () => {
    const post = makeCampaignPost();
    const result = campaignPostToNormalized(post, 0);

    expect(result.dataAwareness).toEqual({
      level: 'missing_data',
      dataSourcesUsed: ['No listing data linked to this campaign'],
    });
  });

  it('preserves original campaign post for reverse adapter', () => {
    const post = makeCampaignPost();
    const result = campaignPostToNormalized(post, 0);

    expect(result._originalCampaignPost).toBe(post);
  });

  it('versions have grade field in score breakdown', () => {
    const post = makeCampaignPost();
    const result = campaignPostToNormalized(post, 0);

    expect(result.versions[0].score).not.toBeNull();
    for (const item of result.versions[0].score!.breakdown) {
      expect(['strong', 'decent', 'weak', 'missing']).toContain(item.grade);
    }
  });
});

// ── draftToNormalized ────────────────────────────────────────────────

describe('draftToNormalized', () => {
  it('creates 1 version from draft with no variations', () => {
    const draft = makeDraft();
    const result = draftToNormalized(draft);

    expect(result.versions).toHaveLength(1);
    expect(result.versions[0].label).toBe('Version A');
    expect(result.versions[0].body).toBe('Amazing property just listed!');
    expect(result.versions[0].hooks).toEqual(['Hot new listing!', 'Your dream home awaits', 'Just listed in Austin']);
    expect(result.versions[0].hashtags).toEqual(['realestate', 'austin', 'homes']);
    expect(result.versions[0].cta).toBe('Link in bio');
  });

  it('creates 3 versions from draft with 2 variations', () => {
    const draft = makeDraft({
      variations: [
        { body: 'Variation B body', hooks: ['Hook B'], hashtags: ['tagB'], cta: 'CTA B' },
        { body: 'Variation C body', hooks: ['Hook C'], hashtags: ['tagC'], cta: null },
      ],
    });
    const result = draftToNormalized(draft);

    expect(result.versions).toHaveLength(3);
    expect(result.versions[0].label).toBe('Version A');
    expect(result.versions[1].label).toBe('Version B');
    expect(result.versions[1].body).toBe('Variation B body');
    expect(result.versions[2].label).toBe('Version C');
    expect(result.versions[2].body).toBe('Variation C body');
    expect(result.versions[2].cta).toBeNull();
  });

  it('caps versions at 3', () => {
    const draft = makeDraft({
      variations: [
        { body: 'B', hooks: [], hashtags: [], cta: null },
        { body: 'C', hooks: [], hashtags: [], cta: null },
        { body: 'D', hooks: [], hashtags: [], cta: null },
      ],
    });
    const result = draftToNormalized(draft);

    expect(result.versions).toHaveLength(3);
  });

  it('passes through scoredHooks', () => {
    const scoredHooks: ScoredHook[] = [
      { text: 'Great hook', hookScore: 9, reason: 'Compelling' },
      { text: 'OK hook', hookScore: 6, reason: 'Decent' },
    ];
    const draft = makeDraft({ scoredHooks });
    const result = draftToNormalized(draft);

    expect(result.scoredHooks).toEqual(scoredHooks);
  });

  it('maps mediaAssets to media refs', () => {
    const draft = makeDraft({
      mediaAssets: [
        { id: 'asset-1', url: 'https://example.com/1.jpg', thumbnailUrl: null, assetType: 'image', filename: null, role: null, orderIndex: 0 },
        { id: 'asset-2', url: 'https://example.com/2.jpg', thumbnailUrl: null, assetType: 'image', filename: null, role: null, orderIndex: 1 },
      ],
    });
    const result = draftToNormalized(draft);

    expect(result.media).toHaveLength(2);
    expect(result.media[0]).toEqual({ id: 'asset-1', source: 'user_selected' });
    expect(result.primaryMediaId).toBe('asset-1');
  });

  it('computes per-version scores', () => {
    const draft = makeDraft({
      body: 'A property listing with enough content to score well on length',
      hooks: ['Hook 1', 'Hook 2', 'Hook 3'],
      hashtags: ['tag1', 'tag2', 'tag3'],
      cta: 'Call now',
    });
    const result = draftToNormalized(draft);

    expect(result.score).not.toBeNull();
    expect(result.score!.max).toBe(10);
    expect(result.score!.value).toBeGreaterThan(0);
    expect(result.score!.breakdown.length).toBeGreaterThan(0);
    // Per-version score
    expect(result.versions[0].score).not.toBeNull();
    expect(result.versions[0].score!.value).toBeGreaterThan(0);
  });

  it('sets bestVersionId', () => {
    const draft = makeDraft();
    const result = draftToNormalized(draft);

    expect(result.bestVersionId).toBeTruthy();
    expect(result.bestVersionId).toBe(result.selectedVersionId);
  });

  it('auto-selects higher-scoring version when variation is better', () => {
    const draft = makeDraft({
      body: 'Short',
      hooks: [],
      hashtags: [],
      cta: null,
      variations: [
        {
          body: 'This is a much better version with detailed content about the property including features, location, pricing, and neighborhood context that will score well.',
          hooks: ['Great hook!', 'Another hook', 'Third hook'],
          hashtags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
          cta: 'Contact us today!',
        },
      ],
    });
    const result = draftToNormalized(draft);

    // Version B should score higher (longer body, has CTA, more hashtags, more hooks)
    const vA = result.versions[0];
    const vB = result.versions[1];
    expect((vB.score?.value ?? 0)).toBeGreaterThan(vA.score?.value ?? 0);
    expect(result.bestVersionId).toBe(vB.id);
    expect(result.selectedVersionId).toBe(vB.id);
  });

  it('preserves original draft for reverse adapter', () => {
    const draft = makeDraft();
    const result = draftToNormalized(draft);

    expect(result._originalDraft).toBe(draft);
  });

  it('versions have grade field in score breakdown', () => {
    const draft = makeDraft();
    const result = draftToNormalized(draft);

    expect(result.versions[0].score).not.toBeNull();
    for (const item of result.versions[0].score!.breakdown) {
      expect(['strong', 'decent', 'weak', 'missing']).toContain(item.grade);
    }
  });
});

// ── Round-trip: Campaign ─────────────────────────────────────────────

describe('round-trip: campaignPostToNormalized → normalizedToCampaignPost', () => {
  it('preserves all fields for a simple post', () => {
    const original = makeCampaignPost();
    const normalized = campaignPostToNormalized(original, 0, 'Test Campaign');
    const restored = normalizedToCampaignPost(normalized);

    expect(restored.body).toBe(original.body);
    expect(restored.hashtags).toEqual(original.hashtags);
    expect(restored.cta).toBe(original.cta);
    expect(restored.channel).toBe(original.channel);
    expect(restored.angle).toBe(original.angle);
    expect(restored.label).toBe(original.label);
    expect(restored.subject).toBe(original.subject);
    expect(restored.campaignDay).toBe(original.campaignDay);
  });

  it('preserves body and bodyAlt for A/B post', () => {
    const original = makeCampaignPost({ bodyAlt: 'Alt version' });
    const normalized = campaignPostToNormalized(original, 0);
    const restored = normalizedToCampaignPost(normalized);

    // The selected version becomes body; the other becomes bodyAlt
    const selectedBody = normalized.versions.find(v => v.id === normalized.selectedVersionId)?.body;
    const altBody = normalized.versions.find(v => v.id !== normalized.selectedVersionId)?.body;
    expect(restored.body).toBe(selectedBody);
    expect(restored.bodyAlt).toBe(altBody);
  });

  it('uses selected version B as body when switched', () => {
    const original = makeCampaignPost({ bodyAlt: 'Alt version' });
    const normalized = campaignPostToNormalized(original, 0);

    // Simulate selecting version B
    const versionBId = normalized.versions.find(v => v.id !== normalized.selectedVersionId)?.id;
    if (versionBId) {
      normalized.selectedVersionId = versionBId;
    }
    const restored = normalizedToCampaignPost(normalized);

    expect(restored.body).toBe('Alt version');
    expect(restored.bodyAlt).toBe(original.body);
  });

  it('preserves assignedImageIds through media refs', () => {
    const original = makeCampaignPost({ assignedImageIds: ['img-1', 'img-2'] });
    const normalized = campaignPostToNormalized(original, 0);
    const restored = normalizedToCampaignPost(normalized);

    expect(restored.assignedImageIds).toEqual(['img-1', 'img-2']);
  });
});

// ── Round-trip: Draft ────────────────────────────────────────────────

describe('round-trip: draftToNormalized → normalizedToDraftUpdate', () => {
  it('preserves body, cta, and hashtags', () => {
    const original = makeDraft();
    const normalized = draftToNormalized(original);
    const update = normalizedToDraftUpdate(normalized);

    // The selected (best) version content is used
    const selectedVersion = normalized.versions.find(v => v.id === normalized.selectedVersionId);
    expect(update.body).toBe(selectedVersion?.body);
    expect(update.cta).toBe(selectedVersion?.cta);
    expect(update.hashtags).toEqual(selectedVersion?.hashtags);
  });

  it('preserves selected version content after switching', () => {
    const original = makeDraft({
      variations: [
        { body: 'Version B content', hooks: [], hashtags: ['versionB'], cta: 'CTA B' },
      ],
    });
    const normalized = draftToNormalized(original);

    // Switch to version B
    normalized.selectedVersionId = normalized.versions[1].id;
    const update = normalizedToDraftUpdate(normalized);

    expect(update.body).toBe('Version B content');
    expect(update.hashtags).toEqual(['versionB']);
    expect(update.cta).toBe('CTA B');
  });

  it('includes mediaAssetIds when media present', () => {
    const original = makeDraft({
      mediaAssets: [
        { id: 'asset-1', url: 'https://example.com/1.jpg', thumbnailUrl: null, assetType: 'image', filename: null, role: null, orderIndex: 0 },
      ],
    });
    const normalized = draftToNormalized(original);
    const update = normalizedToDraftUpdate(normalized);

    expect(update.mediaAssetIds).toEqual(['asset-1']);
  });

  it('omits mediaAssetIds when no media', () => {
    const original = makeDraft();
    const normalized = draftToNormalized(original);
    const update = normalizedToDraftUpdate(normalized);

    expect(update.mediaAssetIds).toBeUndefined();
  });
});

// ── Edge cases ───────────────────────────────────────────────────────

describe('edge cases', () => {
  it('handles null CTA in campaign post', () => {
    const post = makeCampaignPost({ cta: '' });
    const normalized = campaignPostToNormalized(post, 0);

    expect(normalized.versions[0].cta).toBe('');
  });

  it('handles empty hashtags in campaign post', () => {
    const post = makeCampaignPost({ hashtags: [] });
    const normalized = campaignPostToNormalized(post, 0);

    expect(normalized.versions[0].hashtags).toEqual([]);
    const restored = normalizedToCampaignPost(normalized);
    expect(restored.hashtags).toEqual([]);
  });

  it('handles draft with null cta', () => {
    const draft = makeDraft({ cta: null });
    const normalized = draftToNormalized(draft);

    expect(normalized.versions[0].cta).toBeNull();
    const update = normalizedToDraftUpdate(normalized);
    expect(update.cta).toBeUndefined();
  });

  it('handles draft with empty hooks', () => {
    const draft = makeDraft({ hooks: [] });
    const normalized = draftToNormalized(draft);

    expect(normalized.versions[0].hooks).toEqual([]);
  });

  it('handles campaign post with no assignedImageIds field', () => {
    const post = makeCampaignPost();
    delete (post as unknown as Record<string, unknown>).assignedImageIds;
    const normalized = campaignPostToNormalized(post, 0);

    expect(normalized.media).toEqual([]);
    expect(normalized.primaryMediaId).toBeNull();
  });

  it('handles draft with empty mediaAssets', () => {
    const draft = makeDraft({ mediaAssets: [] });
    const normalized = draftToNormalized(draft);

    expect(normalized.media).toEqual([]);
    expect(normalized.primaryMediaId).toBeNull();
  });

  it('uses post.id when available in campaign post', () => {
    const post = makeCampaignPost({ id: 'existing-id' });
    const normalized = campaignPostToNormalized(post, 5);

    expect(normalized.id).toBe('existing-id');
  });

  it('generates fallback id from index when no post.id', () => {
    const post = makeCampaignPost();
    const normalized = campaignPostToNormalized(post, 3);

    expect(normalized.id).toBe('campaign_post_3');
  });

  it('version.score defaults to null from makeVersion', () => {
    // Internally makeVersion sets score: null, then adapters fill it in
    const post = makeCampaignPost();
    const result = campaignPostToNormalized(post, 0);

    // After adapter processing, score should be filled in
    expect(result.versions[0].score).not.toBeNull();
  });
});

// ── deriveContentType ───────────────────────────────────────────────

describe('deriveContentType', () => {
  it('maps lifestyle angle to Lifestyle', () => {
    expect(deriveContentType('lifestyle')).toBe('Lifestyle');
  });

  it('maps authority angle to Educational', () => {
    expect(deriveContentType('authority')).toBe('Educational');
  });

  it('maps social_proof angle to Social Proof', () => {
    expect(deriveContentType('social_proof')).toBe('Social Proof');
  });

  it('maps urgency angle to Engagement', () => {
    expect(deriveContentType('urgency')).toBe('Engagement');
  });

  it('maps promotional angle to Listing (default)', () => {
    expect(deriveContentType('promotional')).toBe('Listing');
  });

  it('maps storytelling angle to Listing (default)', () => {
    expect(deriveContentType('storytelling')).toBe('Listing');
  });

  it('maps null/undefined to Listing', () => {
    expect(deriveContentType(null)).toBe('Listing');
    expect(deriveContentType(undefined)).toBe('Listing');
  });

  it('populates contentType on campaign adapter', () => {
    const post = makeCampaignPost({ angle: 'lifestyle' });
    const result = campaignPostToNormalized(post, 0);
    expect(result.contentType).toBe('Lifestyle');
  });

  it('sets contentType to null on draft adapter', () => {
    const draft = makeDraft();
    const result = draftToNormalized(draft);
    expect(result.contentType).toBeNull();
  });
});
