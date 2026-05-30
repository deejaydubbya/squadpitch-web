'use client';

// Ads-09 — SitePage picker for the SquadAds destination editor.
//
// Replaces the raw "paste a site page id" input on the package
// detail page. Shows title, slug, and a status pill so the user
// can tell published pages from drafts at a glance; warns when
// the selected page isn't PUBLISHED (export will fail at READY,
// per the ads-02 validator).

import { useMemo, useState } from 'react';
import { AlertCircle, Check, Globe, Search } from 'lucide-react';
import { usePages, type PageListItem } from '@/hooks/useSites';
import { cn } from '@/lib/utils';

interface SitePagePickerProps {
  clientId: string;
  selectedId: string | null;
  onSelect: (pageId: string | null) => void;
}

export function SitePagePicker({
  clientId,
  selectedId,
  onSelect,
}: SitePagePickerProps) {
  const { data: pages, isLoading } = usePages(clientId);
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    const all = pages ?? [];
    const q = filter.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q),
    );
  }, [pages, filter]);

  const selected = pages?.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white-40 pointer-events-none" />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search by title or slug…"
          className="w-full bg-white-5 border border-white-10 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white-90 placeholder:text-white-40 focus:outline-none focus:border-white-30"
        />
      </div>

      {isLoading ? (
        <p className="text-xs text-white-50 px-1">Loading pages…</p>
      ) : (pages ?? []).length === 0 ? (
        <p className="text-xs text-white-50 px-1">
          No SquadSite pages in this workspace yet. Create one in Sites first
          so it can serve as an ad destination.
        </p>
      ) : (
        <ul className="max-h-48 overflow-y-auto space-y-0.5 border border-white-10 rounded-lg p-1">
          {filtered.length === 0 ? (
            <li className="text-xs text-white-50 px-2.5 py-1.5">
              No pages match “{filter}”.
            </li>
          ) : (
            filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  className={cn(
                    'w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors flex items-start gap-2',
                    selectedId === p.id
                      ? 'bg-accent-green-110/15 text-accent-green-110'
                      : 'text-white-80 hover:bg-white-10',
                  )}
                >
                  <Globe className="w-3 h-3 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium truncate">{p.title}</span>
                      <StatusPill status={p.status} />
                    </div>
                    <div className="text-[10px] text-white-40 truncate">
                      /{p.slug}
                    </div>
                  </div>
                  {selectedId === p.id && (
                    <Check className="w-3 h-3 shrink-0 mt-0.5" />
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {selected && selected.status !== 'PUBLISHED' && (
        <div className="flex items-start gap-2 text-[11px] text-amber-200 bg-amber-400/5 border border-amber-400/30 rounded-lg px-2.5 py-2">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <span>
            <strong>{selected.title}</strong> is{' '}
            <strong>{selected.status.toLowerCase()}</strong>. Marking this
            package Ready will fail until the page is Published in Sites —
            export needs a real public URL, never a placeholder.
          </span>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: PageListItem['status'] }) {
  const cls =
    status === 'PUBLISHED'
      ? 'bg-accent-green-110/15 text-accent-green-110'
      : status === 'DRAFT'
        ? 'bg-white-10 text-white-60'
        : status === 'UNPUBLISHED'
          ? 'bg-amber-400/15 text-amber-200'
          : 'bg-white-5 text-white-40';
  return (
    <span
      className={cn(
        'inline-block text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded',
        cls,
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}
