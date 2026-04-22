'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  Send,
  Pencil,
  Plus,
  X,
  ImageIcon,
  GripVertical,
  Video,
  AlertCircle,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
} from '@/hooks/useSquadpitch';
import { CHANNEL_REGISTRY } from '@/lib/channelRegistry';
import { usePreferencesContext } from '@/hooks/useContentPreferences';
import { useUsage } from '@/hooks/useBilling';
import { mapSessionToCampaignInput } from '@/lib/assistant/conversation/sessionToGeneration';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';
import { AssetPreviewModal } from './AssetPreviewModal';

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
  const { data: assetsData } = useAssets(clientId, { status: 'READY' });
  const { data: mediaProfile } = useMediaProfile(clientId);
  const generateMedia = useGenerateMedia(clientId);
  const generateVideoMutation = useGenerateVideo(clientId);
  const { data: usage } = useUsage();

  const aiImageAvailable = mediaProfile?.mode === 'BRAND_ASSETS_PLUS_AI' || mediaProfile?.mode === 'AI_CHARACTER';
  const atImageLimit = !!(usage && isFinite(usage.limits.images) && usage.usage.images >= usage.limits.images);
  const atVideoLimit = !!(usage && isFinite(usage.limits.videos) && usage.usage.videos >= usage.limits.videos);

  const assetMap = useMemo(() => {
    const map = new Map<string, MediaAsset>();
    for (const a of assetsData ?? []) map.set(a.id, a);
    return map;
  }, [assetsData]);

  const result = session.generationResult as ListingCampaignResult | null;
  const posts = result?.campaign?.posts ?? [];

  const [phase, setPhase] = useState<ReviewPhase>('reviewing');
  const [expandedPost, setExpandedPost] = useState<number | null>(0);
  const [editedPosts, setEditedPosts] = useState<Map<number, string>>(new Map());
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(null);

  // Post ordering — tracks original indices
  const [postOrder, setPostOrder] = useState<number[]>(() => posts.map((_, i) => i));

  // Sync postOrder when posts change (e.g., regeneration)
  useMemo(() => {
    if (posts.length !== postOrder.length) {
      setPostOrder(posts.map((_, i) => i));
    }
  }, [posts.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handlePostDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setPostOrder((prev) => {
      const oldIdx = prev.indexOf(Number(active.id));
      const newIdx = prev.indexOf(Number(over.id));
      const next = [...prev];
      next.splice(oldIdx, 1);
      next.splice(newIdx, 0, Number(active.id));
      return next;
    });
  };

  // A/B version tracking per post
  const [versionMap, setVersionMap] = useState<Map<number, 'A' | 'B'>>(new Map());

  // Hashtag edits per post
  const [hashtagEdits, setHashtagEdits] = useState<Map<number, string[]>>(new Map());

  // CTA edits per post
  const [ctaEdits, setCtaEdits] = useState<Map<number, string>>(new Map());

  // Image assignment edits per post
  const [imageEdits, setImageEdits] = useState<Map<number, string[]>>(new Map());

  // Auto-assign images to posts: two-pass (hint match → round-robin)
  const [autoAssigned, setAutoAssigned] = useState(false);

  // Build ordered image pool: hero first → property images → library assets
  const imagePool = useMemo(() => {
    const pool: Array<{ id: string; label: string }> = [];
    // Hero image first
    if (session.heroImageId) {
      const heroAsset = assetMap.get(session.heroImageId);
      if (heroAsset) {
        pool.push({ id: session.heroImageId, label: heroAsset.filename || session.heroImageId });
      }
    }
    // Property images
    const propImages = session.propertyData?.images as Array<{ label?: string }> | undefined;
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
      if (asset) pool.push({ id, label: asset.filename || asset.id });
    }
    return pool;
  }, [session.propertyData, session.selectedMediaIds, session.heroImageId, assetMap]);

  useEffect(() => {
    if (autoAssigned || posts.length === 0 || imagePool.length === 0) return;
    setAutoAssigned(true);

    const edits = new Map<number, string[]>();
    const usedIds = new Set<string>();

    // Pass 1: Match posts that have imageHint against pool labels
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      if (post.assignedImageIds && post.assignedImageIds.length > 0) continue;
      if (!post.imageHint) continue;
      const hint = post.imageHint.toLowerCase();
      const match = imagePool.find((p) => !usedIds.has(p.id) && p.label.toLowerCase().includes(hint));
      if (match) {
        edits.set(i, [match.id]);
        usedIds.add(match.id);
      }
    }

    // Pass 2: Round-robin remaining pool items to unassigned posts
    const remainingPool = imagePool.filter((p) => !usedIds.has(p.id));
    if (remainingPool.length > 0) {
      let poolIdx = 0;
      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        if (post.assignedImageIds && post.assignedImageIds.length > 0) continue;
        if (edits.has(i)) continue;
        edits.set(i, [remainingPool[poolIdx % remainingPool.length].id]);
        poolIdx++;
      }
    }

    if (edits.size > 0) {
      setImageEdits((prev) => {
        const next = new Map(prev);
        edits.forEach((ids, idx) => next.set(idx, ids));
        return next;
      });
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
    setImageEdits((prev) => {
      const next = new Map(prev);
      next.set(index, imageIds);
      return next;
    });
  };

  // Generate a single AI image/video and add to the campaign media pool
  const handleGenerateAsset = useCallback((type: 'image' | 'video') => {
    const campaignName = result?.campaign?.campaignName ?? '';
    const guidance = campaignName || posts.map((p) => p.label).join(', ');
    const mutation = type === 'image' ? generateMedia : generateVideoMutation;

    mutation.mutate(
      { clientId, guidance },
      {
        onSuccess: (asset) => {
          // Add the new asset to the image pool so it can be assigned to posts
          assetMap.set(asset.id, asset);
          // Auto-assign to first post that has no media, or leave unassigned for manual pick
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
        },
      }
    );
  }, [result, posts, generateMedia, generateVideoMutation, clientId, assetMap]);

  // Save to Planner
  const handleSave = useCallback((addToPlanner: boolean) => {
    if (!result || !session.propertyData) return;

    // Apply all edits to posts, respecting reorder
    const finalPosts = postOrder.map((origIdx, displayIdx) => ({
      ...posts[origIdx],
      campaignDay: displayIdx + 1, // Renumber days based on new order
      body: getPostBody(origIdx),
      hashtags: getPostHashtags(origIdx),
      cta: getPostCta(origIdx),
      assignedImageIds: getPostImageIds(origIdx),
    }));

    setPhase('saving');
    saveMutation.mutate(
      {
        campaign: { ...result.campaign, posts: finalPosts },
        propertyData: session.propertyData,
        campaignType: (session.campaignType as CampaignType) ?? undefined,
        dataItemId: result.dataItemId,
        addToPlanner,
        mediaAssetIds: (() => {
          const realIds = session.selectedMediaIds.filter(
            (id) => !id.startsWith('property_img_') && !id.startsWith('item_img_')
          );
          return realIds.length > 0 ? realIds : undefined;
        })(),
      },
      {
        onSuccess: (data) => {
          setPhase('saved');
          setSavedCampaignId(data.campaignId);
        },
        onError: () => {
          setPhase('reviewing');
        },
      }
    );
  }, [result, session, posts, editedPosts, hashtagEdits, ctaEdits, imageEdits, versionMap, saveMutation, clientId]);

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
      <p className="text-xs text-white-40">No campaign data available.</p>
    );
  }

  // Saved state
  if (phase === 'saved') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-green-110/10 border border-accent-green-110/20">
          <CheckCircle2 className="w-4 h-4 text-accent-green-110" />
          <div>
            <p className="text-xs font-medium text-white-100">Campaign saved — {posts.length} posts queued</p>
            <Link
              href={`/workspaces/${clientId}/planner${savedCampaignId ? `?campaignId=${savedCampaignId}` : ''}`}
              className="text-[11px] text-accent-green-110 hover:underline"
            >
              View in Planner &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Saving / Regenerating loading
  if (phase === 'saving' || phase === 'regenerating') {
    return (
      <div className="flex items-center gap-3 py-4">
        <Loader2 className="w-5 h-5 text-accent-green-110 animate-spin" />
        <p className="text-xs text-white-60">
          {phase === 'saving' ? 'Saving campaign...' : 'Regenerating campaign...'}
        </p>
      </div>
    );
  }

  // Review state
  return (
    <div className="space-y-3">
      {/* Campaign name */}
      <p className="text-[11px] text-white-40 font-medium uppercase tracking-wider">
        {result.campaign.campaignName} — {posts.length} posts
      </p>

      {/* Post list — drag to reorder */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePostDragEnd}>
        <SortableContext items={postOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {postOrder.map((origIdx) => (
              <SortablePostItem
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
                allAssets={assetsData ?? []}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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
          {generateVideoMutation.isPending ? 'Generating…' : 'Generate Video'}
          {atVideoLimit && <span className="text-accent-red text-[9px] ml-0.5">Limit</span>}
        </button>
        {generateMedia.isSuccess && (
          <span className="text-[10px] text-accent-green-110">Image added to pool</span>
        )}
        {generateVideoMutation.isSuccess && (
          <span className="text-[10px] text-accent-green-110">Video added to pool</span>
        )}
        {(generateMedia.isError || generateVideoMutation.isError) && (
          <span className="text-[10px] text-red-400">Generation failed</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <button
          onClick={() => handleSave(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90 transition-colors"
        >
          <Send className="w-3 h-3" />
          Save & Queue
        </button>
        <button
          onClick={() => handleSave(false)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white-60 hover:text-white-100 hover:bg-white-5 transition-colors"
        >
          Save as Drafts
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
  allAssets: MediaAsset[];
};

function SortablePostItem(props: PostReviewItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <PostReviewItem {...props} dragListeners={listeners} />
    </div>
  );
}

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
  allAssets,
  dragListeners,
}: PostReviewItemProps & { dragListeners?: Record<string, unknown> }) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addingHashtag, setAddingHashtag] = useState(false);
  const [newHashtag, setNewHashtag] = useState('');
  const [editingCta, setEditingCta] = useState(false);
  const [ctaDraft, setCtaDraft] = useState(cta);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const channelInfo = CHANNEL_REGISTRY[post.channel];

  const body = editedBody ?? (selectedVersion === 'B' && post.bodyAlt ? post.bodyAlt : post.body);
  const hasAltVersion = !!post.bodyAlt;

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
      <div className="flex items-center">
        <div
          {...dragListeners}
          className="shrink-0 px-1 py-2 cursor-grab active:cursor-grabbing text-white-20 hover:text-white-40 transition-colors"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-2 px-1 py-2 text-left min-w-0"
        >
        <span className="text-[10px] font-semibold text-accent-green-110 tabular-nums w-10">
          Day {post.campaignDay}
        </span>
        <span className="text-[10px] text-white-40">
          {channelInfo?.label ?? post.channel}
        </span>
        <span className="text-[11px] text-white-60 truncate flex-1">
          {post.label}
        </span>

        {/* A/B toggle in header */}
        {hasAltVersion && (
          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onVersionToggle('A')}
              className={cn(
                'px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors',
                selectedVersion === 'A'
                  ? 'bg-accent-green-110/20 text-accent-green-110'
                  : 'text-white-30 hover:text-white-60'
              )}
            >
              A
            </button>
            <button
              onClick={() => onVersionToggle('B')}
              className={cn(
                'px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors',
                selectedVersion === 'B'
                  ? 'bg-accent-green-110/20 text-accent-green-110'
                  : 'text-white-30 hover:text-white-60'
              )}
            >
              B
            </button>
          </div>
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
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Assigned media */}
          <div className="flex items-center gap-1.5">
            {assignedImageIds.length > 0 ? (
              <div className="flex gap-1 overflow-x-auto">
                {assignedImageIds.slice(0, 4).map((id) => {
                  const asset = assetMap.get(id);
                  const thumb = asset?.assetType === 'video' ? (asset.thumbnailUrl || asset.url) : (asset?.url || asset?.thumbnailUrl);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => asset && setPreviewAsset(asset)}
                      className="relative w-8 h-8 rounded border border-white-10 bg-white-5 flex-shrink-0 overflow-hidden hover:border-accent-green-110/40 transition-colors"
                    >
                      {thumb ? (
                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-3 h-3 text-white-20 m-auto mt-2" />
                      )}
                      {asset?.assetType === 'video' && (
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[7px] text-white text-center leading-tight">VID</span>
                      )}
                    </button>
                  );
                })}
                {assignedImageIds.length > 4 && (
                  <span className="text-[9px] text-white-40 self-center">+{assignedImageIds.length - 4}</span>
                )}
              </div>
            ) : (
              <span className="text-[10px] text-white-30 italic">No media assigned</span>
            )}
            <button
              onClick={() => setShowImagePicker(!showImagePicker)}
              className="text-[10px] text-accent-green-110 hover:underline shrink-0"
            >
              {assignedImageIds.length > 0 ? 'Change' : 'Add media'}
            </button>
          </div>

          {/* Mini media picker */}
          {showImagePicker && (
            <MiniMediaPicker
              selectedMediaIds={selectedMediaIds}
              assignedIds={assignedImageIds}
              assetMap={assetMap}
              allAssets={allAssets}
              onConfirm={(ids) => {
                onImageReassign(ids);
                setShowImagePicker(false);
              }}
              onCancel={() => setShowImagePicker(false)}
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
              <button
                onClick={() => setEditing(false)}
                className="text-[10px] text-accent-green-110 hover:underline"
              >
                Done editing
              </button>
            </div>
          ) : (
            <p className="text-[12px] text-white-80 whitespace-pre-wrap leading-relaxed">
              {body}
            </p>
          )}

          {/* Actions row */}
          {!editing && (
            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-0.5 text-[10px] text-white-40 hover:text-white-100 transition-colors"
              >
                <Pencil className="w-2.5 h-2.5" />
                Edit body
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-0.5 text-[10px] text-white-40 hover:text-white-100 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-accent-green-110" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
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
        </div>
      )}

      {/* Asset preview modal */}
      {previewAsset && (
        <AssetPreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />
      )}
    </div>
  );
}

// ── Mini Media Picker ──────────────────────────────────────────────────

function MiniMediaPicker({
  selectedMediaIds,
  assignedIds,
  assetMap,
  allAssets,
  onConfirm,
  onCancel,
}: {
  selectedMediaIds: string[];
  assignedIds: string[];
  assetMap: Map<string, MediaAsset>;
  allAssets: MediaAsset[];
  onConfirm: (ids: string[]) => void;
  onCancel: () => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set(assignedIds));

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Real selected assets (non-synthetic), shown first
  const poolIds = useMemo(() => {
    return selectedMediaIds.filter(
      (id) => !id.startsWith('property_img_') && !id.startsWith('item_img_')
    );
  }, [selectedMediaIds]);
  const poolSet = useMemo(() => new Set(poolIds), [poolIds]);

  // Library assets not already in the selected pool
  const libraryAssets = useMemo(() => {
    return (allAssets ?? []).filter(
      (a) => a.status === 'READY' && !poolSet.has(a.id) && (a.url || a.thumbnailUrl)
    );
  }, [allAssets, poolSet]);

  const renderThumb = (id: string, asset: MediaAsset | undefined) => {
    const thumb = asset?.assetType === 'video' ? (asset.thumbnailUrl || asset.url) : (asset?.url || asset?.thumbnailUrl);
    return (
      <button
        key={id}
        onClick={() => toggle(id)}
        className={cn(
          'relative w-10 h-10 rounded border flex-shrink-0 overflow-hidden transition-colors',
          picked.has(id)
            ? 'border-accent-green-110 ring-1 ring-accent-green-110/40'
            : 'border-white-10 hover:border-white-20'
        )}
      >
        {thumb ? (
          <img src={thumb} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-white-5 flex items-center justify-center">
            <ImageIcon className="w-3 h-3 text-white-20" />
          </div>
        )}
        {asset?.assetType === 'video' && (
          <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[7px] text-white text-center leading-tight">VID</span>
        )}
        {picked.has(id) && (
          <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-accent-green-110 flex items-center justify-center rounded-bl">
            <Check className="w-2 h-2 text-sp-surface" />
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="border border-white-10 rounded-lg p-2 space-y-1.5">
      {poolIds.length > 0 && (
        <>
          <p className="text-[9px] text-white-40 uppercase tracking-wider">From your selection</p>
          <div className="flex gap-1 flex-wrap max-h-[80px] overflow-y-auto">
            {poolIds.map((id) => renderThumb(id, assetMap.get(id)))}
          </div>
        </>
      )}
      {libraryAssets.length > 0 && (
        <>
          <p className="text-[9px] text-white-40 uppercase tracking-wider">
            {poolIds.length > 0 ? 'Media Library' : 'Select from library'}
          </p>
          <div className="flex gap-1 flex-wrap max-h-[100px] overflow-y-auto">
            {libraryAssets.map((a) => renderThumb(a.id, a))}
          </div>
        </>
      )}
      {poolIds.length === 0 && libraryAssets.length === 0 && (
        <p className="text-[10px] text-white-30 italic py-1">No media available</p>
      )}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onConfirm(Array.from(picked))}
          className="text-[10px] text-accent-green-110 hover:underline"
        >
          Apply ({picked.size})
        </button>
        <button
          onClick={onCancel}
          className="text-[10px] text-white-40 hover:text-white-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
