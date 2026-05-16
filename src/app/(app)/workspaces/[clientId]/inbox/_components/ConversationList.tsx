'use client';

// Left pane of the inbox — conversation rows with status/spam/search
// filters and cursor pagination. Rebuilt to feel like a real inbox
// list: initials avatar, two-line row, source badge, stronger active
// state, clearer empty state.

import { useState } from 'react';
import Link from 'next/link';
import { Inbox as InboxIcon, Search, ArrowRight } from 'lucide-react';
import {
  useInboxConversations,
  type ConversationStatus,
  type InboxConversationListRow,
} from '@/hooks/useInbox';
import { cn } from '@/lib/utils';
import {
  contactHeadline,
  formatRelative,
  initialsFromContact,
  sourceBadge,
} from './inbox.helpers';

type StatusFilter = ConversationStatus | 'ALL';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'ALL', label: 'All' },
];

interface ConversationListProps {
  clientId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({
  clientId,
  selectedId,
  onSelect,
}: ConversationListProps) {
  const [status, setStatus] = useState<StatusFilter>('OPEN');
  const [showSpam, setShowSpam] = useState(false);
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data, isLoading } = useInboxConversations(clientId, {
    status: status === 'ALL' ? undefined : status,
    // Filter spam OUT by default. When the toggle is on, show only spam.
    spam: showSpam ? true : false,
    search: search.trim() || undefined,
    cursor,
    limit: 50,
  });

  const rows = data?.conversations ?? [];

  return (
    <div className="flex flex-col h-full bg-sp-bg">
      <div className="px-3 pt-3 pb-2 space-y-3 border-b border-white-10">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-white-30 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCursor(undefined);
            }}
            placeholder="Search by name, email, or phone"
            className="w-full bg-white-5 border border-white-10 rounded-lg pl-8 pr-3 py-2 text-xs text-white-90 placeholder:text-white-40 focus:outline-none focus:border-white-30 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <FilterPill
              key={f.value}
              active={!showSpam && status === f.value}
              onClick={() => {
                setStatus(f.value);
                setShowSpam(false);
                setCursor(undefined);
              }}
            >
              {f.label}
            </FilterPill>
          ))}
          <FilterPill
            tone="warn"
            active={showSpam}
            onClick={() => {
              setShowSpam((s) => !s);
              setCursor(undefined);
            }}
          >
            Spam
          </FilterPill>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-6 text-xs text-white-50">Loading conversations…</div>
        )}
        {!isLoading && rows.length === 0 && (
          <EmptyState
            clientId={clientId}
            filter={search ? 'search' : showSpam ? 'spam' : status}
          />
        )}
        {!isLoading && rows.length > 0 && (
          <ul className="divide-y divide-white-10">
            {rows.map((row) => (
              <ConversationRow
                key={row.id}
                row={row}
                selected={row.id === selectedId}
                onSelect={() => onSelect(row.id)}
              />
            ))}
          </ul>
        )}
        {data?.nextCursor && (
          <button
            type="button"
            onClick={() => setCursor(data.nextCursor!)}
            className="w-full text-xs text-white-50 hover:text-white-100 py-3 border-t border-white-10"
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────────

interface FilterPillProps {
  active: boolean;
  onClick: () => void;
  tone?: 'default' | 'warn';
  children: React.ReactNode;
}

function FilterPill({ active, onClick, tone = 'default', children }: FilterPillProps) {
  const activeClass =
    tone === 'warn'
      ? 'bg-amber-400/15 text-amber-200 border-amber-400/30'
      : 'bg-accent-green-110/15 text-accent-green-110 border-accent-green-110/30';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors',
        active
          ? activeClass
          : 'border-transparent text-white-50 hover:text-white-100 hover:bg-white-10',
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({
  clientId,
  filter,
}: {
  clientId: string;
  filter: 'search' | 'spam' | ConversationStatus | 'ALL';
}) {
  const copy =
    filter === 'search'
      ? {
          title: 'No matches',
          body: 'Try a different name, email, or phone fragment.',
        }
      : filter === 'spam'
        ? {
            title: 'No spam',
            body: 'Conversations marked as spam appear here.',
          }
        : filter === 'CLOSED'
          ? {
              title: 'No closed conversations',
              body: 'Resolved leads will appear in this view.',
            }
          : filter === 'PENDING'
            ? {
                title: 'No pending conversations',
                body: 'Snoozed or follow-up leads appear here.',
              }
            : {
                title: 'No leads yet',
                body: 'Publish a SquadSite with a lead form and submissions will appear here.',
              };
  // Only the default "no leads at all" state gets the Sites CTA —
  // it's the actionable case. Search / spam / closed states are
  // about the current filter, not about needing to set up Sites.
  const showSitesCta = filter !== 'search' && filter !== 'spam' && filter !== 'CLOSED' && filter !== 'PENDING';
  return (
    <div className="px-6 py-10 text-center space-y-2">
      <InboxIcon className="w-7 h-7 text-white-30 mx-auto" />
      <p className="text-sm font-medium text-white-80">{copy.title}</p>
      <p className="text-xs text-white-50 leading-relaxed max-w-[28ch] mx-auto">
        {copy.body}
      </p>
      {showSitesCta && (
        <Link
          href={`/workspaces/${clientId}/sites`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-green-110 hover:text-accent-green-100 transition-colors pt-1"
        >
          Manage Sites
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

interface RowProps {
  row: InboxConversationListRow;
  selected: boolean;
  onSelect: () => void;
}

function ConversationRow({ row, selected, onSelect }: RowProps) {
  const lastMsg = row.messages[0];
  const headline = contactHeadline(row.contact);
  const initials = initialsFromContact(row.contact);
  const badge = sourceBadge(row);

  const badgeClass =
    badge.tone === 'campaign'
      ? 'bg-purple-400/10 text-purple-300 border-purple-400/20'
      : badge.tone === 'form'
        ? 'bg-blue-400/10 text-blue-300 border-blue-400/20'
        : badge.tone === 'social'
          ? 'bg-pink-400/10 text-pink-300 border-pink-400/20'
          : badge.tone === 'email'
            ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20'
            : 'bg-white-5 text-white-50 border-white-10';

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'w-full text-left px-3 py-3 transition-colors relative flex items-start gap-3',
          selected
            ? 'bg-accent-green-110/8 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-accent-green-110'
            : row.unread
              ? 'hover:bg-white-5 bg-white-3'
              : 'hover:bg-white-5',
        )}
      >
        <Avatar initials={initials} unread={row.unread} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm truncate',
                row.unread ? 'text-white-100 font-semibold' : 'text-white-90 font-medium',
              )}
            >
              {headline}
            </span>
            <span className="text-[10px] text-white-40 shrink-0 ml-auto tabular-nums">
              {formatRelative(row.lastMessageAt)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={cn(
                'inline-block text-[9px] font-medium px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0',
                badgeClass,
              )}
            >
              {badge.label}
            </span>
            {row.spam && (
              <span className="inline-block text-[9px] font-medium px-1.5 py-0.5 rounded border uppercase tracking-wider bg-amber-400/10 text-amber-300 border-amber-400/20 shrink-0">
                Spam
              </span>
            )}
            {row.status !== 'OPEN' && (
              <span className="text-[10px] text-white-40 uppercase tracking-wider shrink-0">
                {row.status.toLowerCase()}
              </span>
            )}
          </div>
          {lastMsg && (
            <p
              className={cn(
                'text-xs truncate mt-1',
                row.unread ? 'text-white-70' : 'text-white-40',
              )}
            >
              {lastMsg.party === 'WORKSPACE' && (
                <span className="text-white-30">You: </span>
              )}
              {lastMsg.body}
            </p>
          )}
        </div>
      </button>
    </li>
  );
}

function Avatar({ initials, unread }: { initials: string; unread: boolean }) {
  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold uppercase tracking-wider',
          unread
            ? 'bg-accent-green-110/15 text-accent-green-110'
            : 'bg-white-10 text-white-70',
        )}
      >
        {initials}
      </div>
      {unread && (
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent-green-110 ring-2 ring-sp-bg" />
      )}
    </div>
  );
}
