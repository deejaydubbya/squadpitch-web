'use client';

// Left pane of the inbox — conversation rows with status/spam/search
// filters and cursor pagination. Modeled structurally on the
// SubmissionsPanel; visually trimmed to single-line rows so a dense
// thread list fits without scrolling per-row.

import { useState } from 'react';
import { Inbox as InboxIcon, Search, Mail, Phone } from 'lucide-react';
import {
  useInboxConversations,
  type ConversationStatus,
  type InboxConversationListRow,
} from '@/hooks/useInbox';
import { cn } from '@/lib/utils';

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
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-white-10 space-y-3">
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setStatus(f.value);
                setCursor(undefined);
              }}
              className={cn(
                'text-xs font-medium px-2.5 py-1 rounded-lg transition-colors',
                status === f.value
                  ? 'bg-accent-green-110/15 text-accent-green-110'
                  : 'text-white-50 hover:text-white-100 hover:bg-white-10',
              )}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setShowSpam((s) => !s);
              setCursor(undefined);
            }}
            className={cn(
              'text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ml-auto',
              showSpam
                ? 'bg-amber-400/15 text-amber-300'
                : 'text-white-50 hover:text-white-100 hover:bg-white-10',
            )}
            title="Show spam"
          >
            Spam
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-white-30 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCursor(undefined);
            }}
            placeholder="Search name, email, phone"
            className="w-full bg-white-5 border border-white-10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white-90 placeholder:text-white-30 focus:outline-none focus:border-white-20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-6 text-xs text-white-50">Loading conversations…</div>
        )}
        {!isLoading && rows.length === 0 && (
          <div className="p-8 text-center space-y-2">
            <InboxIcon className="w-7 h-7 text-white-30 mx-auto" />
            <p className="text-sm font-medium text-white-80">
              {search ? 'No matches' : showSpam ? 'No spam' : 'Inbox is empty'}
            </p>
            <p className="text-xs text-white-50">
              {showSpam
                ? 'Conversations marked as spam appear here.'
                : 'Leads from your site forms will appear here.'}
            </p>
          </div>
        )}
        {!isLoading && rows.length > 0 && (
          <ul>
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

interface RowProps {
  row: InboxConversationListRow;
  selected: boolean;
  onSelect: () => void;
}

function ConversationRow({ row, selected, onSelect }: RowProps) {
  const lastMsg = row.messages[0];
  const headline =
    row.contact.name || row.contact.email || row.contact.phone || 'Unknown lead';
  const ContactIcon = row.contact.email ? Mail : row.contact.phone ? Phone : InboxIcon;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'w-full text-left px-3 py-3 border-b border-white-10 last:border-b-0 transition-colors',
          selected
            ? 'bg-accent-green-110/10'
            : row.unread
              ? 'bg-white-5 hover:bg-white-10'
              : 'hover:bg-white-5',
        )}
      >
        <div className="flex items-start gap-2.5">
          {row.unread ? (
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green-110 mt-2 shrink-0" />
          ) : (
            <span className="w-1.5 h-1.5 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <ContactIcon className="w-3.5 h-3.5 text-white-30 shrink-0" />
              <span
                className={cn(
                  'text-sm truncate',
                  row.unread ? 'text-white-100 font-medium' : 'text-white-80',
                )}
              >
                {headline}
              </span>
              <span className="text-[10px] text-white-30 ml-auto shrink-0">
                {formatRelative(row.lastMessageAt)}
              </span>
            </div>
            {lastMsg && (
              <p className="text-xs text-white-40 truncate mt-1 pl-5">
                {lastMsg.party === 'WORKSPACE' && (
                  <span className="text-white-30">You: </span>
                )}
                {lastMsg.body}
              </p>
            )}
            {row.status !== 'OPEN' && (
              <span className="inline-block mt-1.5 ml-5 text-[10px] uppercase tracking-wider text-white-40">
                {row.status.toLowerCase()}
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
