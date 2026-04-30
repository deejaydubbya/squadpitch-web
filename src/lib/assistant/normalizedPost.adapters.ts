import type {
  CampaignPost,
  Draft,
  ContentVariation,
  ScoredHook,
  Channel,
} from '@/hooks/useSquadpitch';
import type {
  NormalizedPost,
  PostVersion,
  PostMediaRef,
  CampaignMeta,
  PostScore,
  MediaDisplayType,
} from './normalizedPost.types';
import { computePostStrength, selectBestVersion } from './normalizedPost.scoring';
import { classifyCampaignDataAwareness, classifyDraftDataAwareness } from './dataAwareness';

// ── Helpers ──────────────────────────────────────────────────────────

let _counter = 0;
function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${++_counter}`;
}

function makeVersion(
  id: string,
  label: string,
  body: string,
  hooks: string[],
  hashtags: string[],
  cta: string | null,
): PostVersion {
  return { id, label, body, hooks, hashtags, cta, score: null };
}

// ── Campaign Post → NormalizedPost ───────────────────────────────────

/**
 * Convert a backend CampaignPost to a NormalizedPost.
 *
 * @param post       - The campaign post from the API
 * @param index      - Post index within the campaign (used for id generation)
 * @param campaignName - Optional campaign name for metadata
 * @param dataItemId   - Optional data item id for data-awareness info
 */
export function campaignPostToNormalized(
  post: CampaignPost,
  index: number,
  campaignName?: string,
  dataItemId?: string | null,
): NormalizedPost {
  const versions: PostVersion[] = [];

  // Synthetic scored hooks from hookScore for per-version scoring
  const syntheticHooks: ScoredHook[] | null =
    post.hookScore != null
      ? [{ text: '', hookScore: Math.round(post.hookScore * 10), reason: 'AI-assessed' }]
      : null;

  // Media refs from assignedImageIds
  const media: PostMediaRef[] = (post.assignedImageIds ?? []).map((id) => ({
    id,
    source: 'auto_assigned' as const,
  }));

  // Version A — always exists
  const versionAId = uid('cv');
  const versionA = makeVersion(versionAId, 'Version A', post.body, [], post.hashtags, post.cta);
  versionA.score = computePostStrength({
    body: post.body,
    cta: post.cta,
    hashtags: post.hashtags,
    hooks: [],
    scoredHooks: syntheticHooks,
    channel: post.channel,
    mediaRefs: media,
  });
  versions.push(versionA);

  // Version B — only if bodyAlt present
  if (post.bodyAlt) {
    const versionB = makeVersion(uid('cv'), 'Version B', post.bodyAlt, [], post.hashtags, post.cta);
    versionB.score = computePostStrength({
      body: post.bodyAlt,
      cta: post.cta,
      hashtags: post.hashtags,
      hooks: [],
      scoredHooks: syntheticHooks,
      channel: post.channel,
      mediaRefs: media,
    });
    versions.push(versionB);
  }

  // Auto-select best version
  const bestVersionId = selectBestVersion(versions);

  // Overall score = best version's score
  const bestVersion = versions.find((v) => v.id === bestVersionId);
  const score: PostScore | null = bestVersion?.score ?? null;

  const campaignMeta: CampaignMeta = {
    campaignDay: post.campaignDay,
    angle: post.angle,
    label: post.label,
    subject: post.subject,
    imageHint: post.imageHint,
    campaignName,
    slotType: post.slotType,
  };

  return {
    id: post.id ?? `campaign_post_${index}`,
    sourceType: 'campaign',
    category: post.slotType ?? 'social_post',
    selectedVersionId: bestVersionId,
    bestVersionId,
    versions,
    score,
    scoredHooks: null,
    media,
    primaryMediaId: media[0]?.id ?? null,
    mediaDisplayType: (media.length > 1 ? 'carousel' : 'single') as MediaDisplayType,
    mediaMatchExplanation: null,
    dataAwareness: classifyCampaignDataAwareness(dataItemId ?? null, null),
    channels: [post.channel],
    status: 'reviewing',
    campaignMeta,
    mediaPlan: post.mediaPlan ?? null,
    _originalCampaignPost: post,
  };
}

// ── Draft → NormalizedPost ───────────────────────────────────────────

/**
 * Convert a Draft (quick post generation result) to a NormalizedPost.
 */
export function draftToNormalized(draft: Draft): NormalizedPost {
  const versions: PostVersion[] = [];

  // Media refs from mediaAssets[]
  const media: PostMediaRef[] = draft.mediaAssets.map((a) => ({
    id: a.id,
    source: 'user_selected' as const,
  }));

  // Location context from sourceMeta if available
  const locationContext = (draft as unknown as Record<string, unknown>).sourceMeta
    ? ((draft as unknown as Record<string, unknown>).sourceMeta as Record<string, string>)?.location
    : undefined;

  // Version A — primary draft content
  const versionAId = uid('dv');
  const versionA = makeVersion(
    versionAId,
    'Version A',
    draft.body,
    draft.hooks ?? [],
    draft.hashtags ?? [],
    draft.cta,
  );
  versionA.score = computePostStrength({
    body: draft.body,
    cta: draft.cta,
    hashtags: draft.hashtags ?? [],
    hooks: draft.hooks ?? [],
    scoredHooks: draft.scoredHooks,
    channel: draft.channel,
    mediaRefs: media,
    locationContext,
  });
  versions.push(versionA);

  // Additional versions from variations[]
  if (draft.variations) {
    draft.variations.forEach((v: ContentVariation, i: number) => {
      const labels = ['Version B', 'Version C', 'Version D'];
      const ver = makeVersion(
        uid('dv'),
        labels[i] ?? `Version ${String.fromCharCode(66 + i)}`,
        v.body ?? '',
        v.hooks ?? [],
        v.hashtags ?? [],
        v.cta ?? null,
      );
      ver.score = computePostStrength({
        body: v.body ?? '',
        cta: v.cta ?? null,
        hashtags: v.hashtags ?? [],
        hooks: v.hooks ?? [],
        scoredHooks: null,
        channel: draft.channel,
        mediaRefs: media,
        locationContext,
      });
      versions.push(ver);
    });
  }

  const capped = versions.slice(0, 3); // Max 3 versions

  // Auto-select best version
  const bestVersionId = selectBestVersion(capped);

  // Overall score = best version's score
  const bestVersion = capped.find((v) => v.id === bestVersionId);
  const score = bestVersion?.score ?? computePostStrength({
    body: draft.body,
    cta: draft.cta,
    hashtags: draft.hashtags ?? [],
    hooks: draft.hooks ?? [],
    scoredHooks: draft.scoredHooks,
  });

  return {
    id: draft.id,
    sourceType: 'quick_post',
    category: draft.kind,
    selectedVersionId: bestVersionId,
    bestVersionId,
    versions: capped,
    score,
    scoredHooks: draft.scoredHooks ?? null,
    media,
    primaryMediaId: media[0]?.id ?? null,
    mediaDisplayType: (media.length > 1 ? 'carousel' : 'single') as MediaDisplayType,
    mediaMatchExplanation: null,
    dataAwareness: classifyDraftDataAwareness(draft),
    channels: [draft.channel],
    status: 'reviewing',
    campaignMeta: draft.campaignId
      ? {
          campaignDay: draft.campaignDay ?? 1,
          angle: 'promotional',
          label: '',
          subject: '',
          campaignName: draft.campaignName ?? undefined,
        }
      : null,
    mediaPlan: draft.mediaPlan ?? null,
    _originalDraft: draft,
  };
}

// ── NormalizedPost → CampaignPost ───────────────────────────────────

/**
 * Convert a NormalizedPost back to a CampaignPost for saving.
 * The selected version becomes `body`; the first non-selected version
 * (if any) becomes `bodyAlt`.
 */
export function normalizedToCampaignPost(normalized: NormalizedPost): CampaignPost {
  const selectedVersion = normalized.versions.find(
    (v) => v.id === normalized.selectedVersionId,
  );
  const altVersion = normalized.versions.find(
    (v) => v.id !== normalized.selectedVersionId,
  );

  const body = selectedVersion?.body ?? normalized.versions[0]?.body ?? '';
  const hashtags = selectedVersion?.hashtags ?? [];
  const cta = selectedVersion?.cta ?? '';

  const base = normalized._originalCampaignPost;

  return {
    ...(base ?? {}),
    id: base?.id,
    campaignDay: normalized.campaignMeta?.campaignDay ?? base?.campaignDay ?? 1,
    channel: normalized.channels[0] ?? base?.channel ?? 'INSTAGRAM',
    angle: normalized.campaignMeta?.angle ?? base?.angle ?? 'promotional',
    label: normalized.campaignMeta?.label ?? base?.label ?? '',
    body,
    bodyAlt: altVersion?.body,
    hashtags,
    cta,
    subject: normalized.campaignMeta?.subject ?? base?.subject ?? '',
    imageHint: normalized.campaignMeta?.imageHint ?? base?.imageHint,
    hookScore: base?.hookScore,
    assignedImageIds: normalized.media.map((m) => m.id),
    slotType: normalized.campaignMeta?.slotType ?? base?.slotType,
    mediaPlan: base?.mediaPlan,
  };
}

// ── NormalizedPost → Draft update payload ───────────────────────────

/**
 * Extract an update payload from a NormalizedPost for the Draft update mutation.
 * Returns only the editable fields that the updateDraft endpoint accepts.
 */
export function normalizedToDraftUpdate(
  normalized: NormalizedPost,
): {
  body: string;
  cta?: string;
  hashtags: string[];
  mediaAssetIds?: string[];
} {
  const selectedVersion = normalized.versions.find(
    (v) => v.id === normalized.selectedVersionId,
  );

  const body = selectedVersion?.body ?? normalized.versions[0]?.body ?? '';
  const cta = selectedVersion?.cta ?? undefined;
  const hashtags = selectedVersion?.hashtags ?? [];

  const mediaAssetIds =
    normalized.media.length > 0
      ? normalized.media.map((m) => m.id)
      : undefined;

  return {
    body,
    ...(cta != null && { cta }),
    hashtags,
    ...(mediaAssetIds && { mediaAssetIds }),
  };
}
