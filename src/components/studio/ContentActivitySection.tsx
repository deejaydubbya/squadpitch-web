'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Calendar,
  Megaphone,
  ChevronRight,
  Pencil,
  Check,
  Send,
  CopyPlus,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  useApproveDraft,
  usePublishDraft,
  useScheduleDraft,
  type Draft,
} from '@/hooks/useSquadpitch';
import type { CampaignGroup } from '@/components/studio/campaignGrouping';

interface ContentActivitySectionProps {
  drafts: Draft[] | undefined;
  draftsLoading: boolean;
  upcomingPosts: Draft[];
  activeCampaigns: CampaignGroup[];
  base: string;
  isRE: boolean;
  onDuplicate: (draftId: string) => void;
}

export function ContentActivitySection({
  drafts,
  draftsLoading,
  upcomingPosts,
  activeCampaigns,
  base,
  isRE,
  onDuplicate,
}: ContentActivitySectionProps) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-accent-green-110" />
          <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
            Content &amp; Campaigns
          </h2>
        </div>
        <Link
          href={`${base}/planner`}
          className="text-xs text-accent-green-110 hover:underline"
        >
          View all
        </Link>
      </div>

      {/* Two-column layout on desktop */}
      <div className="flex flex-col md:flex-row md:gap-6">
        {/* Left: Recent Drafts */}
        <div className="flex-1 min-w-0">
          {draftsLoading && (
            <div className="flex items-center gap-2 py-4">
              <LoadingSpinner size="sm" />
              <span className="text-white-40 text-sm">Loading...</span>
            </div>
          )}

          {drafts && drafts.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-sm text-white-40 mb-4">
                No posts yet. Create your first one:
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link
                  href={`${base}/create`}
                  className="px-4 py-2.5 rounded-xl bg-accent-green-110 text-sp-dark text-sm font-semibold hover:bg-accent-green-110/90 transition-colors"
                >
                  Create a quick post
                </Link>
                <Link
                  href={isRE ? `${base}/listing-campaign` : `${base}/campaigns`}
                  className="px-4 py-2.5 rounded-xl bg-white-10 text-white-100 text-sm font-semibold hover:bg-white-20 transition-colors"
                >
                  {isRE ? 'Create a listing campaign' : 'Create a campaign'}
                </Link>
              </div>
            </div>
          )}

          {drafts && drafts.length > 0 && (
            <div className="space-y-2">
              {drafts.map((d) => (
                <DraftCard
                  key={d.id}
                  draft={d}
                  base={base}
                  onDuplicate={() => onDuplicate(d.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Coming Up */}
        {(upcomingPosts.length > 0 || activeCampaigns.length > 0) && (
          <div className="md:w-80 flex-shrink-0 mt-4 md:mt-0">
            <div className="card p-4 border-white-10">
              {/* Upcoming scheduled posts */}
              {upcomingPosts.length > 0 && (
                <div className="space-y-2 mb-3">
                  <p className="text-[10px] text-white-25 uppercase tracking-wider mb-1.5">
                    Scheduled
                  </p>
                  {upcomingPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`${base}/planner`}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white-5 transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white-80 truncate">
                          {post.body?.slice(0, 50) || post.channel}
                        </p>
                        <p className="text-[10px] text-white-30">
                          {post.channel} ·{' '}
                          {new Date(post.scheduledFor!).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <ChevronRight className="w-3 h-3 text-white-20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </div>
              )}

              {/* Active campaigns */}
              {activeCampaigns.length > 0 && (
                <div
                  className={
                    upcomingPosts.length > 0 ? 'pt-3 border-t border-white-10' : ''
                  }
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Megaphone className="w-3.5 h-3.5 text-accent-green-110" />
                    <span className="text-xs font-medium text-white-60">
                      {activeCampaigns.length} active campaign
                      {activeCampaigns.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {activeCampaigns.slice(0, 3).map((campaign) => (
                      <Link
                        key={campaign.campaignId}
                        href={`${base}/campaigns`}
                        className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white-5 transition-colors group"
                      >
                        <span className="text-sm text-white-80 group-hover:text-white-100 transition-colors truncate">
                          {campaign.campaignName}
                        </span>
                        <span className="text-[11px] text-white-30 flex-shrink-0 ml-2">
                          {campaign.drafts.length} post
                          {campaign.drafts.length !== 1 ? 's' : ''}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DraftCard (private sub-component) ──────────────────────────────────

function DraftCard({
  draft,
  base,
  onDuplicate,
}: {
  draft: Draft;
  base: string;
  onDuplicate: () => void;
}) {
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');

  const approve = useApproveDraft(draft.id);
  const publish = usePublishDraft(draft.id);
  const schedule = useScheduleDraft(draft.id);

  const canEdit = draft.status === 'DRAFT' || draft.status === 'PENDING_REVIEW';
  const canApprove = draft.status === 'PENDING_REVIEW';
  const canSchedule = draft.status === 'APPROVED';
  const canPublish = draft.status === 'APPROVED' || draft.status === 'SCHEDULED';
  const isPending = approve.isPending || publish.isPending || schedule.isPending;

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-white-10 text-white-60',
    PENDING_REVIEW: 'bg-yellow-500/10 text-yellow-400',
    APPROVED: 'bg-green-500/10 text-green-400',
    SCHEDULED: 'bg-blue-500/10 text-blue-400',
    PUBLISHED: 'bg-accent-green-110/10 text-accent-green-110',
    REJECTED: 'bg-red-500/10 text-red-400',
    FAILED: 'bg-red-500/10 text-red-400',
  };

  const handleSchedule = () => {
    if (scheduleDate) {
      schedule.mutate(new Date(scheduleDate).toISOString());
      setShowSchedule(false);
      setScheduleDate('');
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 flex-wrap mb-1.5">
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[draft.status] ?? 'bg-white-10 text-white-60'}`}
        >
          {draft.status.replace(/_/g, ' ')}
        </span>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white-10 text-white-60">
          {draft.channel}
        </span>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white-10 text-white-60">
          {draft.kind}
        </span>
        <span className="text-xs text-white-40 ml-auto">
          {new Date(draft.createdAt).toLocaleString()}
        </span>
      </div>

      <p className="text-sm text-white-80 line-clamp-2 mb-3">
        {draft.body || <span className="italic text-white-40">(empty)</span>}
      </p>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {canEdit && (
          <Link
            href={`${base}/planner`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </Link>
        )}
        {canApprove && (
          <button
            onClick={() => approve.mutate()}
            disabled={isPending}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors disabled:opacity-50"
          >
            <Check className="w-3 h-3" />
            Approve
          </button>
        )}
        {canSchedule && !showSchedule && (
          <button
            onClick={() => setShowSchedule(true)}
            disabled={isPending}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors disabled:opacity-50"
          >
            <Calendar className="w-3 h-3" />
            Schedule
          </button>
        )}
        {canPublish && (
          <button
            onClick={() => publish.mutate()}
            disabled={isPending}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent-green-110/10 text-accent-green-110 text-xs font-medium hover:bg-accent-green-110/20 transition-colors disabled:opacity-50"
          >
            <Send className="w-3 h-3" />
            Publish
          </button>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            onDuplicate();
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors"
        >
          <CopyPlus className="w-3 h-3" />
          Duplicate
        </button>
      </div>

      {/* Inline schedule picker */}
      {showSchedule && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="datetime-local"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="px-2 py-1.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110"
          />
          <button
            onClick={handleSchedule}
            disabled={!scheduleDate || schedule.isPending}
            className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            onClick={() => {
              setShowSchedule(false);
              setScheduleDate('');
            }}
            className="px-3 py-1.5 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
