'use client';

import { useState, useCallback } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useSaveCampaignDrafts,
  useGenerateListingCampaign,
  type CampaignPost,
  type CampaignType,
  type ListingCampaignResult,
} from '@/hooks/useSquadpitch';
import { CHANNEL_REGISTRY } from '@/lib/channelRegistry';
import { usePreferencesContext } from '@/hooks/useContentPreferences';
import { mapSessionToCampaignInput } from '@/lib/assistant/conversation/sessionToGeneration';
import type { AssistantAction, AssistantSessionState } from '@/lib/assistant/types';

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

  const result = session.generationResult as ListingCampaignResult | null;
  const posts = result?.campaign?.posts ?? [];

  const [phase, setPhase] = useState<ReviewPhase>('reviewing');
  const [expandedPost, setExpandedPost] = useState<number | null>(0); // first post expanded
  const [editedPosts, setEditedPosts] = useState<Map<number, string>>(new Map());
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(null);

  const getPostBody = (index: number): string => {
    return editedPosts.get(index) ?? posts[index]?.body ?? '';
  };

  const handleEditPost = (index: number, newBody: string) => {
    setEditedPosts((prev) => {
      const next = new Map(prev);
      next.set(index, newBody);
      return next;
    });
  };

  // Save to Planner
  const handleSave = useCallback((addToPlanner: boolean) => {
    if (!result || !session.propertyData) return;

    // Apply edits to posts
    const finalPosts = posts.map((post, i) => ({
      ...post,
      body: getPostBody(i),
    }));

    setPhase('saving');
    saveMutation.mutate(
      {
        campaign: { ...result.campaign, posts: finalPosts },
        propertyData: session.propertyData,
        campaignType: (session.campaignType as CampaignType) ?? undefined,
        dataItemId: result.dataItemId,
        addToPlanner,
        mediaAssetIds: session.selectedMediaIds.length > 0 ? session.selectedMediaIds : undefined,
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
  }, [result, session, posts, editedPosts, saveMutation]);

  // Regenerate entire campaign
  const handleRegenerate = useCallback(() => {
    const input = mapSessionToCampaignInput(session, preferencesContext);
    if (!input) return;

    setPhase('regenerating');
    generateMutation.mutate(input, {
      onSuccess: (data) => {
        setPhase('reviewing');
        setEditedPosts(new Map());
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

      {/* Post list */}
      <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
        {posts.map((post, i) => (
          <PostReviewItem
            key={i}
            post={post}
            index={i}
            isExpanded={expandedPost === i}
            onToggle={() => setExpandedPost(expandedPost === i ? null : i)}
            editedBody={editedPosts.get(i)}
            onEditBody={(body) => handleEditPost(i, body)}
          />
        ))}
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

// ── Individual Post Review Item ──────────────────────────────────────────

function PostReviewItem({
  post,
  index,
  isExpanded,
  onToggle,
  editedBody,
  onEditBody,
}: {
  post: CampaignPost;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  editedBody: string | undefined;
  onEditBody: (body: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const body = editedBody ?? post.body;
  const channelInfo = CHANNEL_REGISTRY[post.channel];

  const handleCopy = () => {
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={cn(
      'rounded-lg border transition-colors',
      isExpanded ? 'border-white-10 bg-white-5/50' : 'border-white-5 hover:border-white-10'
    )}>
      {/* Header — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
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
        <div className="px-3 pb-3 space-y-2">
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

          {/* Hashtags */}
          {post.hashtags && post.hashtags.length > 0 && !editing && (
            <div className="flex flex-wrap gap-1">
              {post.hashtags.map((tag, i) => (
                <span key={i} className="text-[10px] text-accent-green-110/80">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* CTA */}
          {post.cta && !editing && (
            <p className="text-[10px] text-white-40 italic">CTA: {post.cta}</p>
          )}

          {/* Actions */}
          {!editing && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setEditing(true)}
                className="text-[10px] text-white-40 hover:text-white-100 transition-colors"
              >
                Edit
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
        </div>
      )}
    </div>
  );
}
