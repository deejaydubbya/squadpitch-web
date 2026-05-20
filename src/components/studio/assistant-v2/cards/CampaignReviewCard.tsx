'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  Pencil,
  Plus,
  X,
  ImageIcon,
  Video,
  AlertCircle,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Tag,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useSaveCampaignDrafts,
  useGenerateListingCampaign,
  useAssets,
  useGenerateMedia,
  useGenerateVideo,
  useMediaProfile,
  type CampaignPost,
  type CampaignType,
  type ListingCampaignResult,
  type MediaAsset,
  type MediaPlan,
} from '@/hooks/useSquadpitch';
import { CHANNEL_REGISTRY } from '@/lib/channelRegistry';
import { usePreferencesContext } from '@/hooks/useContentPreferences';
import { useContentPreferences } from '@/hooks/useSquadpitch';
import { useUsage } from '@/hooks/useBilling';
import { mapSessionToCampaignInput } from '@/lib/assistant/conversation/sessionToGeneration';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';
import { AssetPreviewModal } from './AssetPreviewModal';
import { normalizeMediaIdsForSave, replaceSyntheticIds } from '@/lib/assistant/media/normalizeMedia';
import { apiFetch } from '@/lib/apiFetch';
import { PersonaRecommendationBadge } from './PersonaRecommendationBadge';
import { assignImagesToPosts, getConfidenceTier, getConfidenceLabel, type ImagePoolEntry, type AssignmentOptions } from '@/lib/assistant/media/mediaAssignment';
import { getGenerationErrorInfo } from '@/lib/assistant/media/generationErrors';
import { checkPostQuality } from '@/lib/assistant/media/postQualityChecker';
import { validateCampaignBeforeSave, type ValidationIssue } from '@/lib/assistant/media/preSaveValidation';
import { PostMediaStrip, PostMediaSelector, MediaPlanBanner, DataAwarenessBadge, VersionPicker, PostScoreMeter, ImproveMenu } from './post-editor';
import type { ImproveState } from './post-editor/usePostEditorState';
import { classifyCampaignDataAwareness } from '@/lib/assistant/dataAwareness';
import type { ContentType, DataAwareness, PostVersion, ScoreBreakdownItem } from '@/lib/assistant/normalizedPost.types';
import { deriveContentType } from '@/lib/assistant/normalizedPost.adapters';
import type { VersionSelection, MediaReplacement } from '@/lib/assistant/types';
import { computePostStrength, selectBestVersion } from '@/lib/assistant/normalizedPost.scoring';
import { useGenerateContent } from '@/hooks/useSquadpitch';
import { buildImproveGuidance, buildMediaGuidance, type TextImproveActionId, type MediaImproveActionId, type PromptContext } from '@/lib/assistant/improveActions';
import { PostMediaActions, type SmartVideoStatus } from './PostMediaActions';
import { SmartVideoOverlay } from './SmartVideoOverlay';
import { resolveThumbUrl } from '@/lib/assistant/media/resolveThumb';

// ── Auto Mode Helpers ────────────────────────────────────────────────

type PostReadiness = 'ready' | 'needs_review';

function computePostReadiness(
  scoreValue: number | null,
  mediaIds: string[],
  channel: string,
): PostReadiness {
  const hasMedia = mediaIds.length > 0;
  const MEDIA_REQUIRED_CHANNELS = ['INSTAGRAM', 'TIKTOK', 'YOUTUBE'];
  const needsMedia = MEDIA_REQUIRED_CHANNELS.includes(channel);
  const isReady = (scoreValue ?? 0) >= 6 && (!needsMedia || hasMedia);
  return isReady ? 'ready' : 'needs_review';
}

function composeWhyThisWorks(
  score: { value: number; breakdown: ScoreBreakdownItem[] } | null,
  assignmentReason: string | undefined,
  dataAwareness: DataAwareness | null | undefined,
  postLabel: string,
  channel?: string,
): string[] {
  const points: string[] = [];
  if (postLabel) points.push(postLabel);
  if (score) {
    const strong = score.breakdown
      .filter((b) => b.grade === 'strong')
      .map((b) => b.label);
    points.push(...strong.slice(0, 2));
  }
  if (assignmentReason && assignmentReason !== 'Auto-assigned') {
    points.push(`Media: ${assignmentReason}`);
  }
  if (dataAwareness?.level === 'uses_user_data') {
    points.push('Uses your listing data');
  }
  // Channel optimization hint
  if (channel) {
    const reg = CHANNEL_REGISTRY[channel as import('@/hooks/useSquadpitch').Channel];
    if (reg) points.push(`Optimized for ${reg.label}`);
  }
  return points.slice(0, 4);
}

/** Build a single concise AI decision label for a post. */
function buildAIDecisionLabel(
  assignmentReason: string | undefined,
  contentType: ContentType | null | undefined,
  channel: string,
): string | null {
  const reg = CHANNEL_REGISTRY[channel as import('@/hooks/useSquadpitch').Channel];
  const parts: string[] = [];
  if (assignmentReason && assignmentReason !== 'Auto-assigned' && assignmentReason !== 'Best scored match') {
    // Extract the meaningful part — e.g. "Body match: kitchen" → "Using kitchen images"
    const bodyMatch = assignmentReason.match(/Body match:\s*(.+)/i);
    if (bodyMatch) {
      parts.push(`Using ${bodyMatch[1]} images to match post focus`);
    } else {
      parts.push(assignmentReason);
    }
  }
  if (reg && !parts.some((p) => p.includes(reg.label))) {
    parts.push(`Optimized for ${reg.label} engagement`);
  }
  if (contentType && !parts.some((p) => p.toLowerCase().includes(contentType.toLowerCase()))) {
    parts.push(`${contentType} content`);
  }
  return parts.length > 0 ? parts[0] : null;
}

interface Props {
  session: AssistantSessionState;
  clientId: string;
  onSelection: (action: AssistantAction, confirmationText: string) => void;
}

type ReviewPhase = 'reviewing' | 'saving' | 'saved' | 'regenerating';

export function CampaignReviewCard({ session, clientId, onSelection }: Props) {
  const saveMutation = useSaveCampaignDrafts(clientId);
  const generateMutation = useGenerateListingCampaign(clientId);
  const preferencesContext = usePreferencesContext(clientId);
  // Read the raw preferences too — `alwaysRequireReview` decides
  // whether "Save as Drafts" or "Approve & Schedule" is the visual
  // primary action. The user can still pick either; we only flip
  // which one gets highlighted so the default action respects the
  // preference.
  const { data: contentPreferences } = useContentPreferences(clientId);
  const alwaysRequireReview = contentPreferences?.alwaysRequireReview ?? true;
  const { data: assetsData } = useAssets(clientId, { status: 'READY' });
  const { data: mediaProfile } = useMediaProfile(clientId);
  const generateMedia = useGenerateMedia(clientId);
  const generateVideoMutation = useGenerateVideo(clientId);
  const { data: usage } = useUsage();

  const aiImageAvailable = mediaProfile?.mode === 'BRAND_ASSETS_PLUS_AI' || mediaProfile?.mode === 'AI_CHARACTER';
  const atImageLimit = !!(usage && isFinite(usage.limits.images) && usage.usage.images >= usage.limits.images);
  const atVideoLimit = !!(usage && isFinite(usage.limits.videos) && usage.usage.videos >= usage.limits.videos);

  // Locally-generated assets that aren't yet in the query cache
  const [localAssets, setLocalAssets] = useState<Map<string, MediaAsset>>(new Map());

  const assetMap = useMemo(() => {
    const map = new Map<string, MediaAsset>();
    for (const a of assetsData ?? []) map.set(a.id, a);
    localAssets.forEach((a, id) => map.set(id, a));
    return map;
  }, [assetsData, localAssets]);

  // Property images for synthetic ID resolution
  const propertyImages = useMemo(() => {
    const raw = session.propertyData?.images;
    return Array.isArray(raw) ? (raw as Array<string | { url?: string; src?: string; imageUrl?: string; label?: string }>) : [];
  }, [session.propertyData]);

  const result = session.generationResult as ListingCampaignResult | null;
  const posts = result?.campaign?.posts ?? [];

  const campaignDataAwareness = useMemo(
    () => classifyCampaignDataAwareness(result?.dataItemId ?? null, session.propertyData ?? null),
    [result?.dataItemId, session.propertyData],
  );

  const [phase, setPhase] = useState<ReviewPhase>('reviewing');
  const [autoMode, setAutoMode] = useState(true);
  const [expandedPost, setExpandedPost] = useState<number | null>(0);
  const [editedPosts, setEditedPosts] = useState<Map<number, string>>(new Map());
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(null);
  const [savedAssetCount, setSavedAssetCount] = useState(0);
  // Tracks whether the saved state should read "scheduled" or "saved
  // as drafts" — set from the addToPlanner flag at save time.
  const [savedAsScheduled, setSavedAsScheduled] = useState(false);
  // Confirmation modal for Approve & Schedule. Shows the user the
  // exact schedule summary (count, channels, dates) before any
  // database writes happen.
  const [scheduleConfirmOpen, setScheduleConfirmOpen] = useState(false);

  // Post ordering — tracks original indices
  const [postOrder, setPostOrder] = useState<number[]>(() => posts.map((_, i) => i));

  // Sync postOrder when posts change (e.g., regeneration)
  useMemo(() => {
    if (posts.length !== postOrder.length) {
      setPostOrder(posts.map((_, i) => i));
    }
  }, [posts.length]);

  // A/B version tracking per post
  const [versionMap, setVersionMap] = useState<Map<number, 'A' | 'B'>>(new Map());

  // Hashtag edits per post
  const [hashtagEdits, setHashtagEdits] = useState<Map<number, string[]>>(new Map());

  // CTA edits per post
  const [ctaEdits, setCtaEdits] = useState<Map<number, string>>(new Map());

  // Image assignment edits per post
  const [imageEdits, setImageEdits] = useState<Map<number, string[]>>(new Map());

  // Persona recommendation tracking
  const [personaAcceptedPosts, setPersonaAcceptedPosts] = useState<Set<number>>(new Set());
  const personaAutoAppliedRef = useRef(false);

  // Auto-apply persona for posts where autoApply is true
  useEffect(() => {
    if (personaAutoAppliedRef.current || posts.length === 0) return;
    personaAutoAppliedRef.current = true;
    const autoSet = new Set<number>();
    for (let i = 0; i < posts.length; i++) {
      if (posts[i].personaRecommendation?.autoApply) {
        autoSet.add(i);
      }
    }
    if (autoSet.size > 0) setPersonaAcceptedPosts(autoSet);
  }, [posts]);

  // Auto-select best version per post on initial load
  const [versionAutoSelected, setVersionAutoSelected] = useState(false);
  useEffect(() => {
    if (versionAutoSelected || posts.length === 0) return;
    setVersionAutoSelected(true);
    const bestMap = new Map<number, 'A' | 'B'>();
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      if (!post.bodyAlt) continue; // only 1 version, default 'A' is fine
      // Quick score comparison to pick best
      const scoreA = computePostStrength({
        body: post.body, cta: post.cta, hashtags: post.hashtags,
        hooks: [], scoredHooks: null, channel: post.channel,
      });
      const scoreB = computePostStrength({
        body: post.bodyAlt, cta: post.cta, hashtags: post.hashtags,
        hooks: [], scoredHooks: null, channel: post.channel,
      });
      if (scoreB.value > scoreA.value) bestMap.set(i, 'B');
    }
    if (bestMap.size > 0) setVersionMap(bestMap);
  }, [posts, versionAutoSelected]);

  // Score-based image auto-assignment
  const [autoAssigned, setAutoAssigned] = useState(false);
  const [assignmentReasons, setAssignmentReasons] = useState<Map<number, string>>(new Map());
  // Per-post per-image match reasons (index → imageId → reason)
  const [imageMatchReasons, setImageMatchReasons] = useState<Map<number, Map<string, string>>>(new Map());
  // Per-post confidence scores (index → confidences[])
  const [imageConfidences, setImageConfidences] = useState<Map<number, number[]>>(new Map());

  // ── Learning hooks (lightweight data capture) ─────────────────────
  const [versionSelections, setVersionSelections] = useState<VersionSelection[]>([]);
  const [mediaReplacements, setMediaReplacements] = useState<MediaReplacement[]>([]);

  // ── AI Improve state per post ──────────────────────────────────────
  const [improvedVersions, setImprovedVersions] = useState<Map<number, PostVersion[]>>(new Map());
  const [improveStates, setImproveStates] = useState<Map<number, ImproveState>>(new Map());
  const generateContentMutation = useGenerateContent();

  const handleTextImprove = useCallback((postIndex: number, actionId: TextImproveActionId) => {
    const post = posts[postIndex];
    if (!post) return;

    // Set loading state for this post
    setImproveStates((prev) => {
      const next = new Map(prev);
      next.set(postIndex, { status: 'loading', error: null, lastActionId: actionId });
      return next;
    });

    const body = editedPosts.get(postIndex)
      ?? (versionMap.get(postIndex) === 'B' && post.bodyAlt ? post.bodyAlt : post.body);
    const postHashtags = hashtagEdits.get(postIndex) ?? post.hashtags ?? [];
    const postCta = ctaEdits.get(postIndex) ?? post.cta ?? '';

    const ctx: PromptContext = {
      body,
      cta: postCta || null,
      hashtags: postHashtags,
      channel: post.channel,
      propertyAddress: session.propertyData?.address as string | undefined,
    };
    const guidance = buildImproveGuidance(actionId, ctx);

    generateContentMutation.mutate(
      { clientId, kind: 'POST', channel: post.channel, guidance },
      {
        onSuccess: (draft) => {
          const score = computePostStrength({
            body: draft.body,
            cta: draft.cta,
            hashtags: draft.hashtags,
            hooks: draft.hooks ?? [],
            scoredHooks: draft.scoredHooks ?? null,
            channel: post.channel,
          });

          const version: PostVersion = {
            id: `ai_improved_${postIndex}_${Date.now()}`,
            label: 'AI Improved',
            body: draft.body,
            hooks: draft.hooks ?? [],
            hashtags: draft.hashtags ?? [],
            cta: draft.cta ?? null,
            score,
          };

          // Store improved version
          setImprovedVersions((prev) => {
            const next = new Map(prev);
            const existing = next.get(postIndex) ?? [];
            next.set(postIndex, [...existing, version].slice(-2)); // keep last 2
            return next;
          });

          // Apply the improved body/hashtags/cta as edits
          setEditedPosts((prev) => new Map(prev).set(postIndex, draft.body));
          if (draft.hashtags?.length > 0) {
            setHashtagEdits((prev) => new Map(prev).set(postIndex, draft.hashtags));
          }
          if (draft.cta) {
            setCtaEdits((prev) => new Map(prev).set(postIndex, draft.cta!));
          }

          // Clear improve state
          setImproveStates((prev) => {
            const next = new Map(prev);
            next.set(postIndex, { status: 'idle', error: null, lastActionId: null });
            return next;
          });
        },
        onError: (err) => {
          setImproveStates((prev) => {
            const next = new Map(prev);
            next.set(postIndex, {
              status: 'error',
              error: err instanceof Error ? err.message : 'AI improvement failed',
              lastActionId: actionId,
            });
            return next;
          });
        },
      },
    );
  }, [posts, editedPosts, versionMap, hashtagEdits, ctaEdits, session.propertyData, clientId, generateContentMutation]);

  const handleDismissImproveError = useCallback((postIndex: number) => {
    setImproveStates((prev) => {
      const next = new Map(prev);
      next.set(postIndex, { status: 'idle', error: null, lastActionId: null });
      return next;
    });
  }, []);

  // Build ordered image pool: hero first → property images → library assets
  const imagePool = useMemo(() => {
    const pool: ImagePoolEntry[] = [];
    // Hero image first
    if (session.heroImageId) {
      const heroAsset = assetMap.get(session.heroImageId);
      if (heroAsset) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ha = heroAsset as any;
        pool.push({
          id: session.heroImageId,
          label: heroAsset.filename || session.heroImageId,
          tags: ha.tags,
          altText: ha.altText,
          isHero: true,
        });
      }
    }
    // Property images
    const propImages = session.propertyData?.images as Array<{ label?: string; url?: string }> | undefined;
    if (Array.isArray(propImages)) {
      propImages.forEach((img, i) => {
        const id = `property_img_${i}`;
        if (id !== session.heroImageId) {
          pool.push({ id, label: img.label || `photo_${i + 1}` });
        }
      });
    }
    // Selected library assets
    for (const id of session.selectedMediaIds) {
      if (id === session.heroImageId) continue;
      if (id.startsWith('property_img_') || id.startsWith('item_img_')) continue;
      const asset = assetMap.get(id);
      if (asset) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const a = asset as any;
        pool.push({
          id,
          label: asset.filename || asset.id,
          tags: a.tags,
          altText: a.altText,
        });
      }
    }
    return pool;
  }, [session.propertyData, session.selectedMediaIds, session.heroImageId, assetMap]);

  useEffect(() => {
    if (autoAssigned || posts.length === 0 || imagePool.length === 0) return;
    setAutoAssigned(true);

    // Skip posts that already have assigned images
    const postsInfo = posts.map((p) => ({
      label: p.label || '',
      imageHint: p.imageHint,
      angle: (p as any).angle as string | undefined,
      channel: p.channel,
      campaignDay: p.campaignDay,
      body: p.body,
    }));

    // Target 3-5 images per post; property campaigns aim higher
    const hasPropertyData = !!(session.propertyData && (session.propertyData as any).images?.length);
    const target = hasPropertyData ? 5 : 3;

    const results = assignImagesToPosts(postsInfo, imagePool, {
      imagesPerPost: Math.min(target, imagePool.length),
      maxImagesPerPost: 5,
      secondaryThreshold: 5,
    });
    const edits = new Map<number, string[]>();
    const reasons = new Map<number, string>();
    const perImageReasons = new Map<number, Map<string, string>>();
    const confidences = new Map<number, number[]>();

    for (const r of results) {
      const post = posts[r.postIndex];
      if (post.assignedImageIds && post.assignedImageIds.length > 0) continue;
      edits.set(r.postIndex, r.imageIds);
      reasons.set(r.postIndex, r.reasons[0] ?? 'Auto-assigned');
      confidences.set(r.postIndex, r.confidences);
      // Store per-image reasons for the RecommendedPhotos section
      const imgReasons = new Map<string, string>();
      for (let i = 0; i < r.imageIds.length; i++) {
        imgReasons.set(r.imageIds[i], r.reasons[i] ?? 'Auto-assigned');
      }
      perImageReasons.set(r.postIndex, imgReasons);
    }

    if (edits.size > 0) {
      setImageEdits((prev) => {
        const next = new Map(prev);
        edits.forEach((ids, idx) => next.set(idx, ids));
        return next;
      });
      setAssignmentReasons(reasons);
      setImageMatchReasons(perImageReasons);
      setImageConfidences(confidences);
    }
  }, [posts, imagePool, autoAssigned]);

  const getSelectedVersion = (index: number): 'A' | 'B' => {
    return versionMap.get(index) ?? 'A';
  };

  const getPostBody = (index: number): string => {
    const version = getSelectedVersion(index);
    if (editedPosts.has(index)) return editedPosts.get(index)!;
    if (version === 'B' && posts[index]?.bodyAlt) return posts[index].bodyAlt!;
    return posts[index]?.body ?? '';
  };

  const getPostHashtags = (index: number): string[] => {
    return hashtagEdits.get(index) ?? posts[index]?.hashtags ?? [];
  };

  const getPostCta = (index: number): string => {
    return ctaEdits.get(index) ?? posts[index]?.cta ?? '';
  };

  const getPostImageIds = (index: number): string[] => {
    return imageEdits.get(index) ?? posts[index]?.assignedImageIds ?? [];
  };

  // ── Post readiness for auto mode ──────────────────────────────────
  const postScores = useMemo(() => {
    return posts.map((post, i) => {
      const body = getPostBody(i);
      return computePostStrength({
        body,
        cta: getPostCta(i),
        hashtags: getPostHashtags(i),
        hooks: [],
        scoredHooks: post.hookScore != null
          ? [{ text: '', hookScore: Math.round(post.hookScore * 10), reason: '' }]
          : null,
        channel: post.channel,
        mediaRefs: getPostImageIds(i).map((id) => ({ id, source: 'auto_assigned' as const })),
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, editedPosts, hashtagEdits, ctaEdits, imageEdits, versionMap]);

  const postReadiness = useMemo(() => {
    return posts.map((post, i) => {
      const score = postScores[i];
      return computePostReadiness(score?.value ?? null, getPostImageIds(i), post.channel);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, postScores, imageEdits]);

  const readyCount = postReadiness.filter((r) => r === 'ready').length;

  // Auto-expand first needs_review post only when auto-mode is toggled on (not on every readiness change)
  const prevAutoMode = useRef(autoMode);
  useEffect(() => {
    if (!autoMode) {
      prevAutoMode.current = false;
      return;
    }
    if (prevAutoMode.current) return; // already on — don't re-expand
    prevAutoMode.current = true;
    const firstNeedsReview = postOrder.find((origIdx) => postReadiness[origIdx] === 'needs_review');
    setExpandedPost(firstNeedsReview ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMode, postReadiness]);

  const handleEditPost = (index: number, newBody: string) => {
    setEditedPosts((prev) => {
      const next = new Map(prev);
      next.set(index, newBody);
      return next;
    });
  };

  const handleVersionToggle = (index: number, version: 'A' | 'B') => {
    setVersionMap((prev) => {
      const next = new Map(prev);
      next.set(index, version);
      return next;
    });
    // Clear body edit when switching version so fresh text shows
    setEditedPosts((prev) => {
      const next = new Map(prev);
      next.delete(index);
      return next;
    });
    // Learning: capture version selection
    setVersionSelections((prev) => [
      ...prev,
      { postIndex: index, selected: version.toLowerCase() as 'a' | 'b', wasAutoSelected: false },
    ]);
  };

  const handleHashtagRemove = (index: number, tagIndex: number) => {
    const current = getPostHashtags(index);
    const updated = current.filter((_, i) => i !== tagIndex);
    setHashtagEdits((prev) => {
      const next = new Map(prev);
      next.set(index, updated);
      return next;
    });
  };

  const handleHashtagAdd = (index: number, tag: string) => {
    const cleaned = tag.replace(/^#+/, '').trim();
    if (!cleaned) return;
    const current = getPostHashtags(index);
    if (current.includes(cleaned)) return;
    setHashtagEdits((prev) => {
      const next = new Map(prev);
      next.set(index, [...current, cleaned]);
      return next;
    });
  };

  const handleCtaEdit = (index: number, cta: string) => {
    setCtaEdits((prev) => {
      const next = new Map(prev);
      next.set(index, cta);
      return next;
    });
  };

  const handleImageReassign = (index: number, imageIds: string[]) => {
    const originalIds = getPostImageIds(index);
    setImageEdits((prev) => {
      const next = new Map(prev);
      next.set(index, imageIds);
      return next;
    });
    // Learning: capture media replacement
    if (JSON.stringify(originalIds) !== JSON.stringify(imageIds)) {
      setMediaReplacements((prev) => [
        ...prev,
        { postIndex: index, originalIds, newIds: imageIds },
      ]);
    }
  };

  // Poll a PENDING asset until READY (or FAILED), max ~60s
  const pollAssetUntilReady = useCallback(async (assetId: string): Promise<MediaAsset | null> => {
    const MAX_POLLS = 20;
    const POLL_INTERVAL = 3000;
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      try {
        const fresh = await apiFetch<MediaAsset>(`assets/${assetId}`);
        if (fresh.status === 'READY' && fresh.url) return fresh;
        if (fresh.status === 'FAILED') return fresh;
      } catch {
        // Network hiccup — keep trying
      }
    }
    return null;
  }, []);

  // Generate a single AI image/video and add to the campaign media pool
  const handleGenerateAsset = useCallback((type: 'image' | 'video') => {
    const campaignName = result?.campaign?.campaignName ?? '';
    const guidance = campaignName || posts.map((p) => p.label).join(', ');
    const mutation = type === 'image' ? generateMedia : generateVideoMutation;

    mutation.mutate(
      { clientId, guidance },
      {
        onSuccess: async (asset) => {
          // Add pending asset immediately
          setLocalAssets((prev) => new Map(prev).set(asset.id, asset));
          // Auto-assign to first post that has no media
          setImageEdits((prev) => {
            const next = new Map(prev);
            for (let i = 0; i < posts.length; i++) {
              const currentIds = next.get(i) ?? posts[i]?.assignedImageIds ?? [];
              if (currentIds.length === 0) {
                next.set(i, [asset.id]);
                break;
              }
            }
            return next;
          });

          // Poll until ready if the asset is still pending
          if (asset.status !== 'READY' || !asset.url) {
            const ready = await pollAssetUntilReady(asset.id);
            if (ready && ready.status === 'READY' && ready.url) {
              setLocalAssets((prev) => new Map(prev).set(ready.id, ready));
            }
          }
        },
      }
    );
  }, [result, posts, generateMedia, generateVideoMutation, clientId, pollAssetUntilReady]);

  // Generate media for a specific post via Improve menu
  const handleMediaImprove = useCallback((postIndex: number, actionId: MediaImproveActionId) => {
    const post = posts[postIndex];
    if (!post) return;
    const body = editedPosts.get(postIndex)
      ?? (versionMap.get(postIndex) === 'B' && post.bodyAlt ? post.bodyAlt : post.body);
    const guidance = buildMediaGuidance(body, post.channel);
    const type = actionId === 'generate_matching_image' ? 'image' : 'video';
    const mutation = type === 'image' ? generateMedia : generateVideoMutation;

    mutation.mutate(
      { clientId, guidance },
      {
        onSuccess: async (asset) => {
          setLocalAssets((prev) => new Map(prev).set(asset.id, asset));
          setImageEdits((prev) => {
            const next = new Map(prev);
            const currentIds = next.get(postIndex) ?? posts[postIndex]?.assignedImageIds ?? [];
            next.set(postIndex, [...currentIds, asset.id]);
            return next;
          });

          if (asset.status !== 'READY' || !asset.url) {
            const ready = await pollAssetUntilReady(asset.id);
            if (ready && ready.status === 'READY' && ready.url) {
              setLocalAssets((prev) => new Map(prev).set(ready.id, ready));
            }
          }
        },
      },
    );
  }, [posts, editedPosts, versionMap, generateMedia, generateVideoMutation, clientId, pollAssetUntilReady]);

  // Save to Planner
  const [conversionStatus, setConversionStatus] = useState<string | null>(null);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[] | null>(null);
  const [pendingSaveAction, setPendingSaveAction] = useState<boolean | null>(null);

  // Campaign media debug panel state
  const [campaignMediaDebug, setCampaignMediaDebug] = useState<{
    propertyImageCount: number;
    propertyUrls: string[];
    assignedIdsBefore: Record<number, string[]>;
    syntheticToReal: Record<string, string>;
    assignedIdsAfter: Record<number, string[]>;
    conversionErrors: Array<{ syntheticId: string; message: string }>;
  } | null>(null);

  const executeSave = useCallback(async (addToPlanner: boolean) => {
    if (!result || !session.propertyData) return;

    setPhase('saving');
    setConversionError(null);
    setCampaignMediaDebug(null);

    // Collect all unique synthetic IDs across all posts
    const allPostImageIds = posts.flatMap((_, i) => getPostImageIds(i));
    const syntheticIds = Array.from(new Set(allPostImageIds.filter(
      (id) => id.startsWith('property_img_') || id.startsWith('item_img_')
    )));

    // Build debug info
    const propImages = (session.propertyData?.images ?? []) as Array<string | { url?: string; src?: string; imageUrl?: string; label?: string }>;
    const debugAssignedBefore: Record<number, string[]> = {};
    posts.forEach((_, i) => { debugAssignedBefore[i] = getPostImageIds(i); });

    // Convert synthetic IDs to real assets
    let syntheticToReal = new Map<string, string>();
    let conversionErrors: Array<{ syntheticId: string; message: string }> = [];
    if (syntheticIds.length > 0) {
      setConversionStatus(`Converting ${syntheticIds.length} property image(s)...`);

      try {
        const normResult = await normalizeMediaIdsForSave({
          clientId,
          ids: syntheticIds,
          propertyImages: propImages,
        });
        syntheticToReal = normResult.syntheticToReal;
        conversionErrors = normResult.errors;

        // Block save if ALL conversions failed
        if (syntheticIds.length > 0 && normResult.syntheticToReal.size === 0) {
          setCampaignMediaDebug({
            propertyImageCount: propImages.length,
            propertyUrls: propImages.slice(0, 3).map((img) =>
              typeof img === 'string' ? img.slice(0, 80) : (img?.url || img?.src || img?.imageUrl || '(none)').slice(0, 80)
            ),
            assignedIdsBefore: debugAssignedBefore,
            syntheticToReal: {},
            assignedIdsAfter: {},
            conversionErrors: normResult.errors,
          });
          setConversionError('Property images could not be attached. Please import these images into your media library first or choose media library images.');
          setConversionStatus(null);
          setPhase('reviewing');
          return;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setConversionError(`Image conversion failed: ${msg}`);
        setConversionStatus(null);
        setPhase('reviewing');
        return;
      }
      setConversionStatus(null);
    }

    // Apply all edits to posts, respecting reorder, replacing synthetic IDs
    const finalPosts = postOrder.map((origIdx, displayIdx) => ({
      ...posts[origIdx],
      campaignDay: displayIdx + 1,
      body: getPostBody(origIdx),
      hashtags: getPostHashtags(origIdx),
      cta: getPostCta(origIdx),
      assignedImageIds: replaceSyntheticIds(getPostImageIds(origIdx), syntheticToReal),
    }));

    // Assert: no synthetic IDs remain in final posts
    const remainingSynthetics = finalPosts.flatMap((p) =>
      (p.assignedImageIds ?? []).filter((id: string) => id.startsWith('property_img_') || id.startsWith('item_img_'))
    );
    if (remainingSynthetics.length > 0) {
      const debugAfter: Record<number, string[]> = {};
      finalPosts.forEach((p, i) => { debugAfter[i] = p.assignedImageIds ?? []; });
      setCampaignMediaDebug({
        propertyImageCount: propImages.length,
        propertyUrls: propImages.slice(0, 3).map((img) =>
          typeof img === 'string' ? img.slice(0, 80) : (img?.url || img?.src || img?.imageUrl || '(none)').slice(0, 80)
        ),
        assignedIdsBefore: debugAssignedBefore,
        syntheticToReal: Object.fromEntries(syntheticToReal),
        assignedIdsAfter: debugAfter,
        conversionErrors,
      });
      setConversionError(`Images were not converted into media assets. ${remainingSynthetics.length} synthetic ID(s) remain.`);
      setPhase('reviewing');
      return;
    }

    // Build top-level mediaAssetIds from original real IDs + converted IDs
    const originalRealIds = session.selectedMediaIds.filter(
      (id) => !id.startsWith('property_img_') && !id.startsWith('item_img_')
    );
    const convertedIds = Array.from(syntheticToReal.values());
    const allMediaAssetIds = Array.from(new Set([...originalRealIds, ...convertedIds]));

    // Populate debug panel
    const debugAfter: Record<number, string[]> = {};
    finalPosts.forEach((p, i) => { debugAfter[i] = p.assignedImageIds ?? []; });
    setCampaignMediaDebug({
      propertyImageCount: propImages.length,
      propertyUrls: propImages.slice(0, 3).map((img) =>
        typeof img === 'string' ? img.slice(0, 80) : (img?.url || img?.src || img?.imageUrl || '(none)').slice(0, 80)
      ),
      assignedIdsBefore: debugAssignedBefore,
      syntheticToReal: Object.fromEntries(syntheticToReal),
      assignedIdsAfter: debugAfter,
      conversionErrors,
    });

    // Build the propertyData-shaped object per source type. The save
    // endpoint historically required propertyData (validates it
    // exists + is an object), so we synthesize a minimal one for
    // content-asset and idea campaigns. The backend uses sourceType
    // (passed separately below) to pick the right campaign name +
    // attribution; propertyData here is just the carrier blob.
    // URL-02 — review card is only reachable AFTER the URL flow has
    // dispatched SET_PROPERTY (which flips campaignSourceType to
    // 'property'). Defensively coerce any lingering 'url' value to
    // 'property' so the narrow type expected by saveMutation
    // (property | data_item | idea) holds.
    const rawSourceType = session.campaignSourceType ?? 'property';
    const sourceType: 'property' | 'data_item' | 'idea' =
      rawSourceType === 'url' ? 'property' : rawSourceType;
    let savePropertyData: Record<string, unknown> | null;
    if (sourceType === 'property') {
      savePropertyData = session.propertyData;
    } else if (sourceType === 'data_item') {
      const itemJson = (session.campaignDataItemData ?? {}) as Record<string, unknown>;
      savePropertyData = {
        ...itemJson,
        title: session.campaignDataItemTitle ?? (itemJson.title as string | undefined) ?? 'Content Asset',
        _dataItemType: session.campaignDataItemType ?? null,
      };
    } else {
      savePropertyData = {
        title: 'Custom campaign idea',
        idea: session.campaignIdea ?? '',
      };
    }

    saveMutation.mutate(
      {
        campaign: { ...result.campaign, posts: finalPosts },
        propertyData: savePropertyData,
        campaignType: (session.campaignType as CampaignType) ?? undefined,
        // dataItemId — for property campaigns this is the listing's
        // WorkspaceDataItem id; for content-asset campaigns it's the
        // selected asset's id; for idea campaigns it's undefined.
        dataItemId:
          sourceType === 'data_item'
            ? session.campaignDataItemId ?? undefined
            : result.dataItemId,
        addToPlanner,
        mediaAssetIds: allMediaAssetIds.length > 0 ? allMediaAssetIds : undefined,
        // Source attribution — lets the backend build a smart
        // campaign name (no more "Listing Campaign" for non-property
        // sources) and persist source metadata for Planner display.
        sourceType,
        sourceTitle:
          sourceType === 'property'
            ? (session.propertyData?.address as string | undefined) ??
              (session.propertyData?.title as string | undefined) ??
              null
            : sourceType === 'data_item'
              ? session.campaignDataItemTitle ?? null
              : null,
        sourceDataItemType:
          sourceType === 'data_item' ? session.campaignDataItemType ?? null : null,
        campaignIdea: sourceType === 'idea' ? session.campaignIdea ?? null : null,
        // Pass the user's confirmed schedule through so the backend
        // honors the chosen start date + slot positions instead of
        // re-deriving from a generic preset starting "today".
        startDate: session.campaignStartDate ?? undefined,
        slots:
          session.slots.length > 0
            ? session.slots.map((s) => ({
                channel: s.channel,
                campaignDay: s.campaignDay,
                label: s.label,
                slotType: s.slotType,
                angle: s.angle,
              }))
            : undefined,
      },
      {
        onSuccess: (data) => {
          const expectedImages = allMediaAssetIds.length;
          const attached = data.attachedAssetCount ?? 0;
          if (expectedImages > 0 && attached === 0) {
            setConversionError(`Campaign saved, but no images were attached (expected ${expectedImages}). Please check media library.`);
            setPhase('reviewing');
            return;
          }
          // Generate persona images for accepted posts
          Array.from(personaAcceptedPosts).forEach((postIdx) => {
            const p = posts[postIdx];
            if (p) {
              const guidance = p.imageHint || p.mediaPlan?.prompt || p.label || p.body.slice(0, 500);
              generateMedia.mutate({ clientId, guidance, usePersona: true });
            }
          });
          setPhase('saved');
          setSavedCampaignId(data.campaignId);
          setSavedAssetCount(attached);
          setSavedAsScheduled(addToPlanner);
        },
        onError: () => {
          setPhase('reviewing');
        },
      }
    );
  }, [result, session, posts, editedPosts, hashtagEdits, ctaEdits, imageEdits, versionMap, saveMutation, clientId, postOrder, personaAcceptedPosts, generateMedia]);

  const handleSave = useCallback((addToPlanner: boolean) => {
    // Pre-save validation
    const postsForValidation = posts.map((p, i) => ({
      body: getPostBody(i),
      channel: p.channel,
      assignedImageIds: getPostImageIds(i),
      label: p.label,
      campaignDay: p.campaignDay,
    }));
    const issues = validateCampaignBeforeSave(postsForValidation);
    const hasErrors = issues.some((i) => i.severity === 'error');

    if (hasErrors || issues.length > 0) {
      setValidationIssues(issues);
      setPendingSaveAction(addToPlanner);
      return;
    }

    executeSave(addToPlanner);
  }, [posts, executeSave]);

  // Regenerate entire campaign
  const handleRegenerate = useCallback(() => {
    const input = mapSessionToCampaignInput(session, preferencesContext);
    if (!input) return;

    setPhase('regenerating');
    generateMutation.mutate(input, {
      onSuccess: (data) => {
        setPhase('reviewing');
        setEditedPosts(new Map());
        setVersionMap(new Map());
        setHashtagEdits(new Map());
        setCtaEdits(new Map());
        setImageEdits(new Map());
        setExpandedPost(0);
        onSelection(
          { type: 'SET_GENERATION_RESULT', payload: data },
          'Campaign regenerated'
        );
      },
      onError: () => {
        setPhase('reviewing');
      },
    });
  }, [session, preferencesContext, generateMutation, onSelection]);

  if (!result || posts.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3">
        <AlertCircle className="w-4 h-4 text-white-30" />
        <p className="text-xs text-white-40">No campaign data available.</p>
      </div>
    );
  }

  // Saved state — copy depends on whether scheduling actually
  // happened. Scheduled posts hit the publisher worker once
  // scheduledFor passes; drafts sit untouched until the user opens
  // the planner.
  if (phase === 'saved') {
    const totalSelectedMedia = posts.reduce((sum, _, i) => sum + getPostImageIds(i).length, 0);
    const mediaMissing = totalSelectedMedia > 0 && savedAssetCount === 0;
    const headline = savedAsScheduled
      ? `Campaign scheduled — ${posts.length} post${posts.length === 1 ? '' : 's'} queued for publishing`
      : `Campaign saved as draft${posts.length === 1 ? '' : 's'} — ${posts.length} post${posts.length === 1 ? '' : 's'}`;
    const subhead = savedAsScheduled
      ? 'Posts will publish automatically at their scheduled times per your connected channel permissions.'
      : 'Posts are saved as drafts. Open the planner to schedule them whenever you’re ready.';
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-green-110/10 border border-accent-green-110/20">
          <CheckCircle2 className="w-4 h-4 text-accent-green-110" />
          <div>
            <p className="text-xs font-medium text-white-100">
              {headline}
              {savedAssetCount > 0 && ` (${savedAssetCount} image${savedAssetCount === 1 ? '' : 's'} attached)`}
            </p>
            <p className="text-[10px] text-white-40">{subhead}</p>
            <div className="flex items-center gap-3 mt-0.5">
              <Link
                href={`/workspaces/${clientId}/planner${savedCampaignId ? `?campaignId=${savedCampaignId}` : ''}`}
                className="text-[11px] text-accent-green-110 hover:underline"
              >
                View in Planner &rarr;
              </Link>
              {savedCampaignId && (
                <Link
                  href={`/workspaces/${clientId}/sites/new?sourceType=CAMPAIGN&sourceId=${savedCampaignId}&pageGoal=LEAD_CAPTURE`}
                  className="text-[11px] text-accent-green-110 hover:underline"
                >
                  Build landing page &rarr;
                </Link>
              )}
            </div>
          </div>
        </div>
        {mediaMissing && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-accent-red/10 border border-accent-red/20">
            <AlertCircle className="w-3.5 h-3.5 text-accent-red flex-shrink-0" />
            <span className="text-[11px] text-accent-red">
              Images were selected but not saved. Please try again.
            </span>
          </div>
        )}
      </div>
    );
  }

  // Saving / Regenerating loading
  if (phase === 'saving' || phase === 'regenerating') {
    return (
      <div className="flex items-center gap-3 py-4">
        <Loader2 className="w-5 h-5 text-accent-green-110 animate-spin" />
        <p className="text-xs text-white-60">
          {conversionStatus ?? (phase === 'saving' ? 'Saving campaign...' : 'Regenerating campaign...')}
        </p>
      </div>
    );
  }

  // Review state
  return (
    <div className="space-y-3">
      {/* Schedule confirmation modal — shows the user the exact
          schedule summary before any DB writes happen. Triggered by
          the Approve & Schedule button below. */}
      {scheduleConfirmOpen && (
        <ScheduleConfirmModal
          posts={posts}
          startDate={session.campaignStartDate ?? null}
          slots={session.slots}
          onCancel={() => setScheduleConfirmOpen(false)}
          onConfirm={() => {
            setScheduleConfirmOpen(false);
            handleSave(true);
          }}
        />
      )}

      {/* Pre-save validation dialog */}
      {validationIssues && (
        <div className="rounded-lg border border-accent-orange/30 bg-accent-orange/5 p-3 space-y-2">
          <p className="text-xs font-medium text-accent-orange">Review before saving</p>
          <ul className="space-y-1">
            {validationIssues.map((issue, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1',
                  issue.severity === 'error' ? 'bg-accent-red' : 'bg-accent-orange'
                )} />
                <span className={cn(
                  'text-[11px]',
                  issue.severity === 'error' ? 'text-accent-red' : 'text-accent-orange'
                )}>
                  {issue.message}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                setValidationIssues(null);
                if (pendingSaveAction !== null) executeSave(pendingSaveAction);
                setPendingSaveAction(null);
              }}
              className="px-3 py-1 rounded-lg text-[11px] font-medium bg-accent-orange/20 text-accent-orange hover:bg-accent-orange/30 transition-colors"
            >
              Save anyway
            </button>
            <button
              onClick={() => {
                setValidationIssues(null);
                setPendingSaveAction(null);
              }}
              className="text-[11px] text-white-40 hover:text-white-60 transition-colors"
            >
              Go back and fix
            </button>
          </div>
        </div>
      )}

      {/* Campaign readiness banner */}
      {readyCount === posts.length ? (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-accent-green-110/10 border border-accent-green-110/20">
          <CheckCircle2 className="w-4 h-4 text-accent-green-110 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-accent-green-110">Your campaign is ready</p>
            <p className="text-[10px] text-white-40">All {posts.length} posts optimized</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white-5 border border-white-10">
          <Sparkles className="w-4 h-4 text-accent-green-110/60 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-white-80">
              {readyCount} post{readyCount !== 1 ? 's' : ''} ready, {posts.length - readyCount} could be improved
            </p>
            <p className="text-[10px] text-white-40">Based on your content style</p>
          </div>
        </div>
      )}

      {/* Campaign header with auto mode toggle */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-white-40 font-medium uppercase tracking-wider truncate">
          {result.campaign.campaignName}
        </p>
        <button
          onClick={() => setAutoMode(!autoMode)}
          className="flex items-center gap-1 text-[10px] text-white-40 hover:text-white-60 transition-colors shrink-0"
          title={autoMode ? 'Auto mode: ready posts collapsed' : 'Auto mode off'}
        >
          {autoMode ? (
            <ToggleRight className="w-4 h-4 text-accent-green-110" />
          ) : (
            <ToggleLeft className="w-4 h-4" />
          )}
          Auto
        </button>
      </div>

      {/* Post list grouped by content type */}
      {(() => {
        // Group posts by category
        type GroupKey = string;
        const groups = new Map<GroupKey, number[]>();
        for (const origIdx of postOrder) {
          const ct = deriveContentType((posts[origIdx] as any).angle) ?? 'Other';
          const existing = groups.get(ct) ?? [];
          existing.push(origIdx);
          groups.set(ct, existing);
        }
        // Sort groups: Listing first, then alpha
        const ORDER = ['Listing', 'Educational', 'Engagement', 'Personal', 'Other'];
        const sortedKeys = Array.from(groups.keys()).sort(
          (a, b) => (ORDER.indexOf(a) === -1 ? 99 : ORDER.indexOf(a)) - (ORDER.indexOf(b) === -1 ? 99 : ORDER.indexOf(b))
        );
        const showGroups = sortedKeys.length > 1;

        return (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {sortedKeys.map((groupKey) => {
              const indices = groups.get(groupKey)!;
              return (
                <div key={groupKey}>
                  {showGroups && (
                    <p className="text-[9px] text-white-30 uppercase tracking-wider font-medium mb-1 mt-1 flex items-center gap-1.5">
                      <Tag className="w-2.5 h-2.5" />
                      {groupKey} ({indices.length})
                    </p>
                  )}
                  <div className="space-y-1.5">
                    {indices.map((origIdx) => (
                      <PostReviewItem
                        key={origIdx}
                        id={origIdx}
                        post={posts[origIdx]}
                        index={origIdx}
                        isExpanded={expandedPost === origIdx}
                        onToggle={() => setExpandedPost(expandedPost === origIdx ? null : origIdx)}
                        editedBody={editedPosts.get(origIdx)}
                        onEditBody={(body) => handleEditPost(origIdx, body)}
                        selectedVersion={getSelectedVersion(origIdx)}
                        onVersionToggle={(v) => handleVersionToggle(origIdx, v)}
                        hashtags={getPostHashtags(origIdx)}
                        onHashtagRemove={(tagIdx) => handleHashtagRemove(origIdx, tagIdx)}
                        onHashtagAdd={(tag) => handleHashtagAdd(origIdx, tag)}
                        cta={getPostCta(origIdx)}
                        onCtaEdit={(cta) => handleCtaEdit(origIdx, cta)}
                        assignedImageIds={getPostImageIds(origIdx)}
                        selectedMediaIds={session.selectedMediaIds}
                        onImageReassign={(ids) => handleImageReassign(origIdx, ids)}
                        assetMap={assetMap}
                        propertyImages={propertyImages}
                        assignmentReason={assignmentReasons.get(origIdx)}
                        imageMatchReasons={imageMatchReasons.get(origIdx)}
                        clientId={clientId}
                        aiAvailable={aiImageAvailable}
                        onLocalAssetAdded={(asset) => setLocalAssets((prev) => new Map(prev).set(asset.id, asset))}
                        mediaPlan={posts[origIdx].mediaPlan}
                        dataAwareness={campaignDataAwareness}
                        improveState={improveStates.get(origIdx) ?? { status: 'idle', error: null, lastActionId: null }}
                        onTextImprove={(actionId) => handleTextImprove(origIdx, actionId)}
                        onMediaImprove={(actionId) => handleMediaImprove(origIdx, actionId)}
                        onDismissImproveError={() => handleDismissImproveError(origIdx)}
                        improvedVersions={improvedVersions.get(origIdx) ?? []}
                        atImageLimit={atImageLimit}
                        atVideoLimit={atVideoLimit}
                        readiness={postReadiness[origIdx]}
                        autoMode={autoMode}
                        contentType={deriveContentType((posts[origIdx] as any).angle)}
                        primaryConfidence={imageConfidences.get(origIdx)?.[0] ?? null}
                        showDayLabel={posts.length > 3}
                        onPersonaAccepted={() => setPersonaAcceptedPosts((prev) => new Set(prev).add(origIdx))}
                        personaAutoApplied={personaAcceptedPosts.has(origIdx)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Media-required channel warning */}
      {(() => {
        const MEDIA_REQUIRED_CHANNELS = ['INSTAGRAM', 'TIKTOK', 'YOUTUBE'];
        const postsWithoutMedia = posts.filter((p, i) =>
          MEDIA_REQUIRED_CHANNELS.includes(p.channel) && getPostImageIds(i).length === 0
        );
        if (postsWithoutMedia.length === 0) return null;
        return (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-accent-orange/10 border border-accent-orange/20">
            <AlertCircle className="w-3.5 h-3.5 text-accent-orange flex-shrink-0" />
            <span className="text-[11px] text-accent-orange">
              {postsWithoutMedia.length} post(s) on media-required channels have no images assigned
            </span>
          </div>
        );
      })()}

      {/* AI Media Generation */}
      <div className="flex items-center gap-2 flex-wrap">
        {aiImageAvailable && (
          <button
            onClick={() => handleGenerateAsset('image')}
            disabled={generateMedia.isPending || atImageLimit}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors',
              atImageLimit
                ? 'opacity-50 cursor-not-allowed bg-white-5 text-white-40'
                : 'bg-white-5 text-white-60 hover:bg-white-10 hover:text-white-100'
            )}
          >
            {generateMedia.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ImageIcon className="w-3 h-3" />
            )}
            {generateMedia.isPending ? 'Generating…' : 'Generate Image'}
            {atImageLimit && <span className="text-accent-red text-[9px] ml-0.5">Limit</span>}
          </button>
        )}
        <button
          onClick={() => handleGenerateAsset('video')}
          disabled={generateVideoMutation.isPending || atVideoLimit}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors',
            atVideoLimit
              ? 'opacity-50 cursor-not-allowed bg-white-5 text-white-40'
              : 'bg-white-5 text-white-60 hover:bg-white-10 hover:text-white-100'
          )}
        >
          {generateVideoMutation.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Video className="w-3 h-3" />
          )}
          {generateVideoMutation.isPending ? 'Generating AI Video…' : 'Generate AI Video'}
          {atVideoLimit && <span className="text-accent-red text-[9px] ml-0.5">Limit</span>}
        </button>
        {generateMedia.isSuccess && (
          <span className="text-[10px] text-accent-green-110">Image added to pool</span>
        )}
        {generateVideoMutation.isSuccess && (
          <span className="text-[10px] text-accent-green-110">Video added to pool</span>
        )}
        {(generateMedia.isError || generateVideoMutation.isError) && (() => {
          const info = getGenerationErrorInfo(generateMedia.error ?? generateVideoMutation.error);
          return (
            <div className="w-full rounded-lg bg-accent-red/5 border border-accent-red/20 p-2 space-y-1">
              <p className="text-[10px] text-accent-red font-medium">{info.title}</p>
              <p className="text-[10px] text-white-40">{info.description}</p>
              {info.showRetry && (
                <button
                  onClick={() => handleGenerateAsset(generateVideoMutation.isError ? 'video' : 'image')}
                  className="text-[10px] text-white-60 hover:text-white-100"
                >
                  Retry
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* Conversion error */}
      {conversionError && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-accent-red/10 border border-accent-red/20">
          <AlertCircle className="w-3.5 h-3.5 text-accent-red flex-shrink-0" />
          <span className="text-[11px] text-accent-red">{conversionError}</span>
        </div>
      )}

      {/* Campaign media debug panel */}
      {process.env.NODE_ENV === 'development' && campaignMediaDebug && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-2.5 space-y-1.5 text-[10px] font-mono text-white-60">
          <p className="font-semibold text-yellow-500 text-[11px]">Campaign Media Debug</p>
          <p>Property images: {campaignMediaDebug.propertyImageCount}</p>
          {campaignMediaDebug.propertyUrls.length > 0 && (
            <p>First URLs: {campaignMediaDebug.propertyUrls.join(' | ')}</p>
          )}
          <p className="font-semibold pt-1">Assigned IDs before conversion:</p>
          {Object.entries(campaignMediaDebug.assignedIdsBefore).map(([idx, ids]) => (
            <p key={idx}>Post {idx}: [{ids.join(', ')}]</p>
          ))}
          {Object.keys(campaignMediaDebug.syntheticToReal).length > 0 && (
            <>
              <p className="font-semibold pt-1">Synthetic → Real mapping:</p>
              {Object.entries(campaignMediaDebug.syntheticToReal).map(([syn, real]) => (
                <p key={syn}>{syn} → {real}</p>
              ))}
            </>
          )}
          {Object.keys(campaignMediaDebug.assignedIdsAfter).length > 0 && (
            <>
              <p className="font-semibold pt-1">Assigned IDs after conversion:</p>
              {Object.entries(campaignMediaDebug.assignedIdsAfter).map(([idx, ids]) => (
                <p key={idx}>Post {idx}: [{(ids as string[]).join(', ')}]</p>
              ))}
            </>
          )}
          {campaignMediaDebug.conversionErrors.length > 0 && (
            <>
              <p className="font-semibold pt-1 text-accent-red">Conversion errors:</p>
              {campaignMediaDebug.conversionErrors.map((e, i) => (
                <p key={i} className="text-accent-red">{e.syntheticId}: {e.message}</p>
              ))}
            </>
          )}
        </div>
      )}

      {/* Actions — sticky footer.
          Button order + styling depends on alwaysRequireReview:
          - true  → "Save as Drafts" is primary, "Approve & Schedule"
                    is secondary. Drafts land in the planner queue
                    for human review before scheduling.
          - false → "Approve & Schedule" is primary, drafts are
                    scheduled immediately on save.
          Both buttons are always available; the preference only
          changes which one is highlighted as the default action. */}
      <div className="flex items-center gap-2 flex-wrap pt-2 sticky bottom-0 bg-sp-bg/95 backdrop-blur-sm pb-2 -mb-2 z-10 border-t border-white-5">
        {alwaysRequireReview ? (
          <>
            <button
              onClick={() => handleSave(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90 transition-colors"
              title="Saves to your planner for review — matches your Always require review preference"
            >
              <Check className="w-3 h-3" />
              Save as Drafts
            </button>
            <button
              onClick={() => setScheduleConfirmOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white-60 hover:text-white-100 hover:bg-white-5 transition-colors"
            >
              Approve & Schedule
            </button>
          </>
        ) : (
          <>
            <button
              // Primary action — opens the schedule-confirm modal,
              // which (on confirm) calls handleSave(true).
              // Scheduling sets Draft.scheduledFor and
              // status=SCHEDULED; the publish worker picks them up
              // at scheduledFor.
              onClick={() => setScheduleConfirmOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90 transition-colors"
            >
              <Check className="w-3 h-3" />
              Approve & Schedule
            </button>
            <button
              onClick={() => handleSave(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white-60 hover:text-white-100 hover:bg-white-5 transition-colors"
            >
              Save as Drafts
            </button>
          </>
        )}
        <button
          onClick={() => {
            setAutoAssigned(false);
            setImageEdits(new Map());
            setAssignmentReasons(new Map());
          }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white-40 hover:text-white-100 hover:bg-white-5 transition-colors"
        >
          <ImageIcon className="w-3 h-3" />
          Redistribute media
        </button>
        <button
          onClick={handleRegenerate}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white-40 hover:text-white-100 hover:bg-white-5 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Regenerate
        </button>
      </div>
    </div>
  );
}

// ── Sortable Post Wrapper ────────────────────────────────────────────────

type PostReviewItemProps = {
  id: number;
  post: CampaignPost;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  editedBody: string | undefined;
  onEditBody: (body: string) => void;
  selectedVersion: 'A' | 'B';
  onVersionToggle: (version: 'A' | 'B') => void;
  hashtags: string[];
  onHashtagRemove: (tagIndex: number) => void;
  onHashtagAdd: (tag: string) => void;
  cta: string;
  onCtaEdit: (cta: string) => void;
  assignedImageIds: string[];
  selectedMediaIds: string[];
  onImageReassign: (ids: string[]) => void;
  assetMap: Map<string, MediaAsset>;
  propertyImages: Array<string | { url?: string; src?: string; imageUrl?: string; label?: string }>;
  assignmentReason?: string;
  imageMatchReasons?: Map<string, string>;
  clientId: string;
  aiAvailable: boolean;
  onLocalAssetAdded: (asset: MediaAsset) => void;
  mediaPlan?: MediaPlan;
  dataAwareness?: DataAwareness | null;
  improveState?: ImproveState;
  onTextImprove?: (actionId: TextImproveActionId) => void;
  onMediaImprove?: (actionId: MediaImproveActionId) => void;
  onDismissImproveError?: () => void;
  improvedVersions?: PostVersion[];
  atImageLimit?: boolean;
  atVideoLimit?: boolean;
  readiness?: PostReadiness;
  autoMode?: boolean;
  contentType?: ContentType | null;
  primaryConfidence?: number | null;
  showDayLabel?: boolean;
  onPersonaAccepted?: () => void;
  personaAutoApplied?: boolean;
};

// ── Individual Post Review Item ──────────────────────────────────────────

function PostReviewItem({
  post,
  index,
  isExpanded,
  onToggle,
  editedBody,
  onEditBody,
  selectedVersion,
  onVersionToggle,
  hashtags,
  onHashtagRemove,
  onHashtagAdd,
  cta,
  onCtaEdit,
  assignedImageIds,
  selectedMediaIds,
  onImageReassign,
  assetMap,
  propertyImages,
  assignmentReason,
  imageMatchReasons,
  clientId,
  aiAvailable,
  onLocalAssetAdded,
  mediaPlan,
  dataAwareness,
  improveState,
  onTextImprove,
  onMediaImprove,
  onDismissImproveError,
  improvedVersions,
  atImageLimit,
  atVideoLimit,
  readiness,
  autoMode,
  contentType,
  primaryConfidence,
  showDayLabel = true,
  onPersonaAccepted,
  personaAutoApplied,
}: PostReviewItemProps) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addingHashtag, setAddingHashtag] = useState(false);
  const [newHashtag, setNewHashtag] = useState('');
  const [editingCta, setEditingCta] = useState(false);
  const [ctaDraft, setCtaDraft] = useState(cta);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const [whyExpanded, setWhyExpanded] = useState(false);
  const [personaDismissed, setPersonaDismissed] = useState(false);
  // Smart Video lifecycle for THIS post only. Scoped to each
  // PostReviewItem so per-post media state stays isolated — clicking
  // Create Smart Video on post #2 must never affect post #1.
  const [smartVideoStatus, setSmartVideoStatus] = useState<SmartVideoStatus | null>(null);
  // Saved at attach time so the user can revert to the original
  // image selection.
  const [preVideoMediaIds, setPreVideoMediaIds] = useState<string[] | null>(null);
  const channelInfo = CHANNEL_REGISTRY[post.channel];

  const body = editedBody ?? (selectedVersion === 'B' && post.bodyAlt ? post.bodyAlt : post.body);
  const hasAltVersion = !!post.bodyAlt;

  // Build per-version scoring for VersionPicker
  const versions = useMemo(() => {
    const syntheticHooks = post.hookScore != null
      ? [{ text: '', hookScore: Math.round(post.hookScore * 10), reason: '' }]
      : null;
    const mediaRefs = (assignedImageIds ?? []).map((id) => ({
      id,
      source: 'auto_assigned' as const,
    }));

    const vA: PostVersion = {
      id: 'A', label: 'Version A', body: post.body,
      hooks: [], hashtags: post.hashtags, cta: post.cta,
      score: computePostStrength({
        body: post.body, cta: post.cta, hashtags: post.hashtags,
        hooks: [], scoredHooks: syntheticHooks,
        channel: post.channel, mediaRefs,
      }),
    };
    const result: PostVersion[] = [vA];

    if (post.bodyAlt) {
      const vB: PostVersion = {
        id: 'B', label: 'Version B', body: post.bodyAlt,
        hooks: [], hashtags: post.hashtags, cta: post.cta,
        score: computePostStrength({
          body: post.bodyAlt, cta: post.cta, hashtags: post.hashtags,
          hooks: [], scoredHooks: syntheticHooks,
          channel: post.channel, mediaRefs,
        }),
      };
      result.push(vB);
    }
    // Append AI-improved versions (cap at 4 total)
    if (improvedVersions && improvedVersions.length > 0) {
      for (const iv of improvedVersions) {
        if (result.length >= 4) break;
        result.push(iv);
      }
    }
    return result;
  }, [post.body, post.bodyAlt, post.cta, post.hashtags, post.hookScore, post.channel, assignedImageIds, improvedVersions]);

  const bestVersionId = useMemo(() => selectBestVersion(versions), [versions]);
  const currentSelectedId = selectedVersion;
  const currentScore = versions.find((v) => v.id === currentSelectedId)?.score ?? null;

  const handleCopy = () => {
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleHashtagSubmit = () => {
    if (newHashtag.trim()) {
      onHashtagAdd(newHashtag);
      setNewHashtag('');
    }
    setAddingHashtag(false);
  };

  const handleCtaSubmit = () => {
    onCtaEdit(ctaDraft);
    setEditingCta(false);
  };

  return (
    <div className={cn(
      'rounded-lg border transition-colors',
      isExpanded ? 'border-accent-green-110/20 bg-transparent' : 'border-white-5/50 hover:border-white-10'
    )}>
      {/* Header — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2 py-2 text-left min-w-0"
      >
        {showDayLabel && (
          <span className="text-[10px] font-semibold text-accent-green-110 tabular-nums w-10">
            Day {post.campaignDay}
          </span>
        )}
        <span className="text-[10px] text-white-40">
          {channelInfo?.label ?? post.channel}
        </span>
        <span className="text-[11px] text-white-60 truncate flex-1">
          {post.label}
        </span>

        {/* Content type tag */}
        {contentType && (
          <span className="text-[9px] text-white-30 bg-white-5 px-1.5 py-0.5 rounded shrink-0">
            {contentType}
          </span>
        )}

        {/* Readiness badge */}
        {readiness && (
          <span className={cn(
            'flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0',
            readiness === 'ready'
              ? 'text-accent-green-110 bg-accent-green-110/10'
              : 'text-accent-orange bg-accent-orange/10'
          )}>
            <span className={cn(
              'w-1.5 h-1.5 rounded-full',
              readiness === 'ready' ? 'bg-accent-green-110' : 'bg-accent-orange'
            )} />
            {readiness === 'ready' ? 'Ready' : 'Review'}
          </span>
        )}

        {/* Version score badge in header */}
        {currentScore && (
          <span className={cn(
            'text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded',
            currentScore.value >= 8 ? 'text-accent-green-110 bg-accent-green-110/10' :
            currentScore.value >= 6 ? 'text-accent-green-110/70 bg-accent-green-110/5' :
            currentScore.value >= 3 ? 'text-accent-orange bg-accent-orange/10' :
            'text-accent-red bg-accent-red/10'
          )}>
            {currentScore.value}/{currentScore.max}
          </span>
        )}

        {editedBody !== undefined && (
          <span className="text-[9px] text-yellow-400 px-1 py-0.5 rounded bg-yellow-400/10">Edited</span>
        )}
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 text-white-30" />
        ) : (
          <ChevronDown className="w-3 h-3 text-white-30" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2.5 animate-in fade-in-0 slide-in-from-top-1 duration-200">
          {/* AI decision label */}
          {(() => {
            const aiLabel = buildAIDecisionLabel(assignmentReason, contentType, post.channel);
            if (!aiLabel) return null;
            return (
              <p className="text-[10px] text-white-40 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-accent-green-110/60 shrink-0" />
                {aiLabel}
              </p>
            );
          })()}

          {/* "Why this works" section */}
          {(() => {
            const reasons = composeWhyThisWorks(currentScore, assignmentReason, dataAwareness, post.label, post.channel);
            if (reasons.length === 0) return null;
            return whyExpanded ? (
              <div className="rounded-lg border border-accent-green-110/10 bg-accent-green-110/5 p-2.5 space-y-1">
                <button
                  onClick={() => setWhyExpanded(false)}
                  className="text-[10px] font-medium text-accent-green-110 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Why this works
                </button>
                <ul className="space-y-0.5">
                  {reasons.map((r, i) => (
                    <li key={i} className="text-[11px] text-white-60 flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-accent-green-110 flex-shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <button
                onClick={() => setWhyExpanded(true)}
                className="text-[11px] text-white-40 italic hover:text-white-60 transition-colors"
              >
                {reasons.join(' · ')}
              </button>
            );
          })()}

          {/* Educational + missing data warning */}
          {contentType === 'Educational' && dataAwareness?.level === 'missing_data' && (
            <p className="text-[10px] text-accent-orange">
              Educational posts work best with real data
            </p>
          )}

          {/* Version picker (replaces old A/B toggle) */}
          {(hasAltVersion || (improvedVersions && improvedVersions.length > 0)) && (
            <div onClick={(e) => e.stopPropagation()}>
              <VersionPicker
                versions={versions}
                selectedId={currentSelectedId}
                bestVersionId={bestVersionId}
                onSelect={(id) => {
                  if (id === 'A' || id === 'B') {
                    onVersionToggle(id);
                  } else {
                    // AI-improved version — apply its body as an edit
                    const v = versions.find((ver) => ver.id === id);
                    if (v) {
                      onEditBody(v.body);
                    }
                  }
                }}
              />
            </div>
          )}

          {/* Post score — compact when VersionPicker is visible */}
          {currentScore && (
            <PostScoreMeter
              score={currentScore}
              compact={hasAltVersion || (improvedVersions != null && improvedVersions.length > 0)}
            />
          )}

          {/* Data awareness — expanded detail */}
          {dataAwareness && (
            <DataAwarenessBadge awareness={dataAwareness} showDetail={true} />
          )}

          {/* Persona recommendation badge */}
          {post.personaRecommendation && !personaDismissed && !personaAutoApplied && (
            <PersonaRecommendationBadge
              recommendation={post.personaRecommendation}
              onUsePersona={() => {
                onPersonaAccepted?.();
                setPersonaDismissed(true);
              }}
              onSkip={() => setPersonaDismissed(true)}
            />
          )}

          {/* Media confidence badge */}
          {primaryConfidence != null && (
            <div className="flex items-center gap-1.5">
              {(() => {
                const tier = getConfidenceTier(primaryConfidence);
                const label = getConfidenceLabel(
                  primaryConfidence,
                  assignedImageIds[0] ? assetMap.get(assignedImageIds[0])?.filename ?? undefined : undefined,
                );
                return (
                  <>
                    <span className={cn(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded',
                      tier === 'high' ? 'text-accent-green-110 bg-accent-green-110/10' :
                      tier === 'medium' ? 'text-white-60 bg-white-5' :
                      'text-accent-orange bg-accent-orange/10'
                    )}>
                      {label}
                    </span>
                    {tier === 'low' && (
                      <button
                        onClick={() => setShowImagePicker(true)}
                        className="text-[10px] text-accent-green-110 hover:underline"
                      >
                        Generate better match?
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Media plan banner */}
          {mediaPlan && (() => {
            // Only pass IDs that resolve to actual thumbnails
            const resolvedIds = assignedImageIds.filter((id) =>
              resolveThumbUrl(id, assetMap, propertyImages as any).url,
            );
            return (
              <MediaPlanBanner
                mediaPlan={mediaPlan}
                matchedMediaIds={resolvedIds.length > 0 ? resolvedIds : undefined}
                matchExplanation={assignmentReason}
                onAttachMedia={(ids) => onImageReassign(ids)}
                onOpenGenerate={() => setShowImagePicker(true)}
              />
            );
          })()}

          {/* Assigned media (wrapped so the Smart Video overlay can
              cover this post's media area while a video is being
              composed or attached). */}
          <div className="relative">
            <PostMediaStrip
              mediaIds={assignedImageIds}
              assetMap={assetMap}
              propertyImages={propertyImages}
              maxVisible={4}
              thumbSize="sm"
              onRemove={(id) => onImageReassign(assignedImageIds.filter((mid) => mid !== id))}
              onPreview={(asset) => setPreviewAsset(asset)}
              onTogglePicker={() => setShowImagePicker(!showImagePicker)}
              emptyLabel="No media assigned"
            />
            <SmartVideoOverlay
              status={smartVideoStatus}
              onRevert={
                preVideoMediaIds
                  ? () => {
                      onImageReassign(preVideoMediaIds);
                      setPreVideoMediaIds(null);
                    }
                  : undefined
              }
              onDismissDone={() =>
                setSmartVideoStatus((s) => (s?.phase === 'done' ? { ...s, phase: 'idle' } : s))
              }
            />
          </div>

          {/* Recommended photos with match reasons */}
          {assignedImageIds.length > 0 && imageMatchReasons && imageMatchReasons.size > 0 && (() => {
            // Only show thumbnails that actually resolve to a URL
            const resolved = assignedImageIds.slice(0, 5).map((id) => ({
              id,
              reason: imageMatchReasons.get(id),
              thumb: resolveThumbUrl(id, assetMap, propertyImages as any),
            }));
            const withUrls = resolved.filter((r) => r.thumb.url);
            if (withUrls.length === 0) return null;
            return (
              <div className="space-y-1">
                <p className="text-[9px] text-white-40 uppercase tracking-wider font-medium">Recommended photos</p>
                <div className="flex gap-1.5 overflow-x-auto">
                  {withUrls.map(({ id, reason, thumb }) => (
                    <div key={id} className="flex flex-col items-center gap-0.5 shrink-0">
                      <div className="w-10 h-10 rounded border border-accent-green-110/30 bg-white-5 overflow-hidden">
                        {thumb.isVideo ? (
                          <video
                            src={thumb.url!}
                            muted
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img src={thumb.url!} alt={thumb.label} className="w-full h-full object-cover" />
                        )}
                      </div>
                      {reason && (
                        <span className="text-[8px] text-white-40 leading-tight max-w-[60px] text-center truncate" title={reason}>
                          {reason}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Media picker */}
          {showImagePicker && (
            <PostMediaSelector
              clientId={clientId}
              mediaIds={assignedImageIds}
              onMediaChange={(ids) => {
                onImageReassign(ids);
                setShowImagePicker(false);
              }}
              assetMap={assetMap}
              propertyImages={propertyImages}
              suggestedIds={selectedMediaIds.map((id) => ({
                id,
                reason: assignedImageIds.includes(id) && assignmentReason
                  ? `Matches: ${assignmentReason}`
                  : 'From campaign selection',
              }))}
              sessionSelectedMediaIds={selectedMediaIds}
              aiAvailable={aiAvailable}
              defaultGuidance={mediaPlan?.prompt || post.body.slice(0, 300)}
              mediaPlan={mediaPlan}
              onLocalAssetAdded={onLocalAssetAdded}
              onClose={() => setShowImagePicker(false)}
            />
          )}

          {/* Post body */}
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={body}
                onChange={(e) => onEditBody(e.target.value)}
                rows={4}
                className="w-full text-[12px] text-white-100 bg-white-5 border border-white-10 rounded-lg p-2 resize-none focus:outline-none focus:border-accent-green-110"
              />
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setEditing(false)}
                  className="text-[10px] text-accent-green-110 hover:underline"
                >
                  Done editing
                </button>
                {/* Character counter */}
                {(() => {
                  const maxLen = channelInfo?.maxCaptionLength;
                  if (!maxLen) return null;
                  const over = body.length > maxLen;
                  return (
                    <span className={cn(
                      'text-[10px] tabular-nums',
                      over ? 'text-accent-red font-medium' : 'text-white-30'
                    )}>
                      {over ? 'Over limit' : `${body.length.toLocaleString()} / ${maxLen.toLocaleString()}`}
                    </span>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[12px] text-white-80 whitespace-pre-wrap leading-relaxed">
                {body}
              </p>
              {/* Character counter */}
              {(() => {
                const maxLen = channelInfo?.maxCaptionLength;
                if (!maxLen) return null;
                const over = body.length > maxLen;
                return (
                  <span className={cn(
                    'text-[10px] tabular-nums mt-1 block',
                    over ? 'text-accent-red font-medium' : 'text-white-30'
                  )}>
                    {over ? 'Over limit' : `${body.length.toLocaleString()} / ${maxLen.toLocaleString()}`}
                  </span>
                );
              })()}
            </div>
          )}

          {/* Actions row */}
          {!editing && (
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-white-60 hover:text-white-100 hover:bg-white-5 transition-colors"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
              <PostMediaActions
                mediaIds={assignedImageIds ?? []}
                assetMap={assetMap}
                propertyImages={propertyImages as any}
                imageMatchReasons={imageMatchReasons}
                body={body}
                cta={cta || null}
                channel={post.channel}
                clientId={clientId}
                onVideoAttached={(asset, replaceImages) => {
                  // Snapshot the pre-attach media so the user can
                  // revert via the SmartVideoOverlay's "Use original
                  // images" link if they don't like the swap.
                  setPreVideoMediaIds(assignedImageIds ?? []);
                  if (replaceImages) {
                    onImageReassign([asset.id]);
                  } else {
                    const current = assignedImageIds ?? [];
                    onImageReassign(current.includes(asset.id) ? current : [...current, asset.id]);
                  }
                }}
                onLocalAssetAdded={onLocalAssetAdded}
                onSmartVideoStatusChange={setSmartVideoStatus}
                variant="padded"
              />
              {improveState && onTextImprove && onDismissImproveError && (
                <ImproveMenu
                  improveState={improveState}
                  onTextAction={onTextImprove}
                  onMediaAction={onMediaImprove}
                  onDismissError={onDismissImproveError}
                  hasUserEdits={editedBody !== undefined}
                  atImageLimit={atImageLimit}
                  atVideoLimit={atVideoLimit}
                />
              )}
            </div>
          )}

          {/* Hashtags */}
          {(hashtags.length > 0 || !editing) && (
            <div className="flex flex-wrap items-center gap-1">
              {hashtags.map((tag, i) => (
                <span
                  key={i}
                  className="group/tag flex items-center gap-0.5 text-[10px] text-accent-green-110/80 bg-accent-green-110/5 border border-accent-green-110/10 px-1.5 py-0.5 rounded-full"
                >
                  #{tag}
                  <button
                    onClick={() => onHashtagRemove(i)}
                    className="opacity-0 group-hover/tag:opacity-100 transition-opacity text-white-40 hover:text-red-400"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
              {addingHashtag ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleHashtagSubmit();
                  }}
                  className="flex items-center gap-0.5"
                >
                  <input
                    autoFocus
                    value={newHashtag}
                    onChange={(e) => setNewHashtag(e.target.value)}
                    onBlur={handleHashtagSubmit}
                    placeholder="#tag"
                    className="w-16 text-[10px] bg-white-5 border border-white-10 rounded px-1.5 py-0.5 text-white-100 focus:outline-none focus:border-accent-green-110"
                  />
                </form>
              ) : (
                <button
                  onClick={() => setAddingHashtag(true)}
                  className="flex items-center gap-0.5 text-[10px] text-white-30 hover:text-white-60 transition-colors"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          )}

          {/* CTA */}
          {(cta || !editing) && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-white-30">CTA:</span>
              {editingCta ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCtaSubmit();
                  }}
                  className="flex-1 flex items-center gap-1"
                >
                  <input
                    autoFocus
                    value={ctaDraft}
                    onChange={(e) => setCtaDraft(e.target.value)}
                    onBlur={handleCtaSubmit}
                    className="flex-1 text-[10px] bg-white-5 border border-white-10 rounded px-1.5 py-0.5 text-white-100 focus:outline-none focus:border-accent-green-110"
                  />
                </form>
              ) : (
                <>
                  <span className="text-[10px] text-white-40 italic">{cta || 'None'}</span>
                  <button
                    onClick={() => {
                      setCtaDraft(cta);
                      setEditingCta(true);
                    }}
                    className="text-white-30 hover:text-white-60 transition-colors"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Inline quality warnings */}
          {(() => {
            const warnings = checkPostQuality({
              body,
              cta: cta || null,
              hashtags,
              channel: post.channel,
              hasMedia: assignedImageIds.length > 0,
            });
            if (warnings.length === 0) return null;
            return (
              <div className="space-y-0.5 pt-1">
                {warnings.map((w, i) => (
                  <p key={i} className={cn(
                    'text-[10px]',
                    w.severity === 'error' ? 'text-accent-red' : w.severity === 'warning' ? 'text-accent-orange' : 'text-white-30'
                  )}>
                    {w.message}
                  </p>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Asset preview modal */}
      {previewAsset && (
        <AssetPreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />
      )}
    </div>
  );
}

// ── Schedule confirmation modal ──────────────────────────────────────────
//
// Shown when the user clicks "Approve & Schedule". Summarizes the
// exact schedule — count, channels, date range, start, cadence — so
// the user can confirm before we set Draft.scheduledFor and let the
// publish worker take over.

interface ScheduleConfirmModalProps {
  posts: CampaignPost[];
  startDate: string | null;
  slots: AssistantSessionState['slots'];
  onCancel: () => void;
  onConfirm: () => void;
}

function ScheduleConfirmModal({
  posts,
  startDate,
  slots,
  onCancel,
  onConfirm,
}: ScheduleConfirmModalProps) {
  const channels = Array.from(new Set(posts.map((p) => p.channel))).filter(Boolean);
  const maxDay = Math.max(1, ...posts.map((p) => p.campaignDay ?? 1));
  const cadenceDays = Math.max(1, maxDay);
  const formattedStart = formatDateForDisplay(startDate);
  const formattedEnd = formatDateForDisplay(addDaysIso(startDate, cadenceDays - 1));
  // Cadence summary: prefer slot count over post count when slots
  // were chosen explicitly (single-channel campaigns sometimes have
  // more posts than slots due to A/B variants).
  const cadenceCount = slots.length > 0 ? slots.length : posts.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-sp-bg/80 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-white-10 bg-sp-surface p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white-100">Schedule this campaign?</h3>
          <p className="text-[11px] text-white-40 mt-0.5">
            Review the schedule before we set it. You can edit individual posts in the planner.
          </p>
        </div>
        <dl className="space-y-1.5 text-[11px]">
          <SummaryRow label="Posts" value={`${cadenceCount} post${cadenceCount === 1 ? '' : 's'}`} />
          <SummaryRow
            label="Channels"
            value={channels.length > 0 ? channels.join(', ') : '—'}
          />
          <SummaryRow label="Start date" value={formattedStart} />
          <SummaryRow label="End date" value={formattedEnd} />
          <SummaryRow
            label="Cadence"
            value={`${cadenceCount} post${cadenceCount === 1 ? '' : 's'} over ${cadenceDays} day${cadenceDays === 1 ? '' : 's'}`}
          />
        </dl>
        <p className="text-[10px] text-white-40 leading-relaxed">
          Posts will publish automatically at their scheduled times, subject to your connected channel permissions. You can pause, edit, or unschedule any post from the planner.
        </p>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white-60 hover:text-white-100 hover:bg-white-5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90 transition-colors"
          >
            <Check className="w-3 h-3" />
            Confirm & Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-white-40">{label}</dt>
      <dd className="text-white-100 font-medium">{value}</dd>
    </div>
  );
}

function formatDateForDisplay(iso: string | null): string {
  if (!iso) return 'Today';
  // Accepts YYYY-MM-DD or full ISO. Render as e.g. "Jan 15, 2026".
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T10:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function addDaysIso(iso: string | null, days: number): string | null {
  const base = iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T10:00:00Z`) : new Date();
  if (Number.isNaN(base.getTime())) return null;
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return next.toISOString().slice(0, 10);
}
