'use client';

// Pages panel — the inventory view inside the Sites module.
// Lists every SitePage in the workspace, lets the user create new
// ones inline, and drills into the editor route for full block
// editing. Per-row publish/unpublish/delete actions cover the
// common state transitions without leaving the list.

import Link from 'next/link';
import { useState } from 'react';
import {
  Plus,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Circle,
  AlertCircle,
} from 'lucide-react';
import {
  usePages,
  useCreatePage,
  useDeletePage,
  usePublishPage,
  useUnpublishPage,
  type PageStatus,
} from '@/hooks/useSites';
import { ApiError } from '@/lib/apiFetch';
import { cn } from '@/lib/utils';

interface PagesPanelProps {
  clientId: string;
  clientSlug: string | undefined;
}

export function PagesPanel({ clientId, clientSlug }: PagesPanelProps) {
  const { data: pages, isLoading } = usePages(clientId);
  const createPage = useCreatePage(clientId);

  const [creating, setCreating] = useState(false);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    try {
      const slugified = slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (!slugified) {
        setCreateError('Slug is required');
        return;
      }
      if (!title.trim()) {
        setCreateError('Title is required');
        return;
      }
      await createPage.mutateAsync({ slug: slugified, title: title.trim() });
      setSlug('');
      setTitle('');
      setCreating(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setCreateError(err.message);
      } else {
        setCreateError('Failed to create page');
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-white-50">
          Pages live at{' '}
          <span className="font-mono text-white-70">
            {clientSlug ?? '<workspace>'}.squadpitchsites.com/[slug]
          </span>
          . Drafts are private; publish to make them reachable.
        </p>
        {!creating && (
          <button
            type="button"
            className="btn btn-primary text-sm inline-flex items-center gap-1.5"
            onClick={() => setCreating(true)}
          >
            <Plus className="w-4 h-4" />
            New page
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="card p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white-50 uppercase tracking-wider mb-1.5">
                Slug
              </label>
              <input
                className="input font-mono"
                placeholder="open-house-summer"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white-50 uppercase tracking-wider mb-1.5">
                Page title
              </label>
              <input
                className="input"
                placeholder="Summer open house"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>
          {createError && (
            <div className="flex items-center gap-2 text-xs text-accent-red">
              <AlertCircle className="w-3.5 h-3.5" />
              {createError}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="btn btn-primary text-sm"
              disabled={createPage.isPending}
            >
              {createPage.isPending ? 'Creating…' : 'Create page'}
            </button>
            <button
              type="button"
              className="btn btn-ghost text-sm"
              onClick={() => {
                setCreating(false);
                setCreateError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading && (
        <div className="card p-6 text-sm text-white-50">Loading pages…</div>
      )}

      {!isLoading && pages && pages.length === 0 && !creating && (
        <div className="card p-8 text-center space-y-2">
          <p className="text-sm font-medium text-white-80">No pages yet</p>
          <p className="text-xs text-white-50">
            Create your first landing page to start capturing leads.
          </p>
        </div>
      )}

      {!isLoading && pages && pages.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white-5 border-b border-white-10">
              <tr>
                <th className="text-left text-xs font-medium text-white-50 uppercase tracking-wider px-4 py-3">
                  Page
                </th>
                <th className="text-left text-xs font-medium text-white-50 uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-white-50 uppercase tracking-wider px-4 py-3">
                  Updated
                </th>
                <th className="text-right text-xs font-medium text-white-50 uppercase tracking-wider px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <PageRow
                  key={page.id}
                  clientId={clientId}
                  clientSlug={clientSlug}
                  page={page}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface PageRowProps {
  clientId: string;
  clientSlug: string | undefined;
  page: {
    id: string;
    slug: string;
    title: string;
    status: PageStatus;
    updatedAt: string;
  };
}

function PageRow({ clientId, clientSlug, page }: PageRowProps) {
  const publishPage = usePublishPage(clientId, page.id);
  const unpublishPage = useUnpublishPage(clientId, page.id);
  const deletePage = useDeletePage(clientId);
  const [confirming, setConfirming] = useState(false);

  const editorHref = `/workspaces/${clientId}/sites/pages/${page.id}`;
  const liveUrl =
    clientSlug && page.status === 'PUBLISHED'
      ? `https://${clientSlug}.squadpitchsites.com/${page.slug}`
      : null;

  return (
    <tr className="border-b border-white-10 last:border-b-0 hover:bg-white-5">
      <td className="px-4 py-3">
        <Link href={editorHref} className="block">
          <div className="text-sm font-medium text-white-90 hover:text-accent-green-110">
            {page.title}
          </div>
          <div className="text-xs text-white-40 font-mono mt-0.5">/{page.slug}</div>
        </Link>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={page.status} />
      </td>
      <td className="px-4 py-3 text-xs text-white-50">
        {formatRelative(page.updatedAt)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          {liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg text-white-50 hover:text-white-100 hover:bg-white-10"
              title="View live"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {page.status === 'PUBLISHED' ? (
            <button
              type="button"
              className="text-xs px-2.5 py-1.5 rounded-lg text-white-60 hover:text-white-100 hover:bg-white-10"
              onClick={() => unpublishPage.mutate()}
              disabled={unpublishPage.isPending}
            >
              Unpublish
            </button>
          ) : (
            <button
              type="button"
              className="text-xs px-2.5 py-1.5 rounded-lg text-accent-green-110 hover:bg-accent-green-110/15"
              onClick={() => publishPage.mutate()}
              disabled={publishPage.isPending}
            >
              Publish
            </button>
          )}
          <Link
            href={editorHref}
            className="text-xs px-2.5 py-1.5 rounded-lg text-white-60 hover:text-white-100 hover:bg-white-10"
          >
            Edit
          </Link>
          {confirming ? (
            <>
              <button
                type="button"
                className="text-xs px-2.5 py-1.5 rounded-lg text-accent-red hover:bg-accent-red/15"
                onClick={async () => {
                  await deletePage.mutateAsync(page.id);
                  setConfirming(false);
                }}
                disabled={deletePage.isPending}
              >
                Confirm
              </button>
              <button
                type="button"
                className="text-xs px-2 py-1.5 rounded-lg text-white-50 hover:text-white-100"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              className="p-2 rounded-lg text-white-50 hover:text-accent-red hover:bg-accent-red/10"
              title="Delete page"
              onClick={() => setConfirming(true)}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: PageStatus }) {
  if (status === 'PUBLISHED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-green-110">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Published
      </span>
    );
  }
  if (status === 'UNPUBLISHED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white-40">
        <Circle className="w-3.5 h-3.5" />
        Unpublished
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300">
      <Circle className="w-3.5 h-3.5" />
      Draft
    </span>
  );
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return date.toLocaleDateString();
}
