'use client';

// Right pane — read-only contact card. Surfaces the data captured at
// first sight + any enrichment merged from later submissions. No
// editing for MVP (matches the spec's scope).

import { useState } from 'react';
import { Mail, Phone, User, ChevronDown, ChevronRight, Tag } from 'lucide-react';
import type { InboxContact, InboxConversationDetail } from '@/hooks/useInbox';
import { cn } from '@/lib/utils';

interface ContactSidebarProps {
  contact: InboxContact;
  conversation: Pick<InboxConversationDetail, 'pageId' | 'campaignId' | 'sourceType' | 'createdAt'>;
}

const STATUS_TONE: Record<string, string> = {
  NEW: 'text-accent-green-110 bg-accent-green-110/15',
  ENGAGED: 'text-blue-300 bg-blue-300/15',
  CUSTOMER: 'text-purple-300 bg-purple-300/15',
  LOST: 'text-white-40 bg-white-10',
  ARCHIVED: 'text-white-40 bg-white-10',
};

export function ContactSidebar({ contact, conversation }: ContactSidebarProps) {
  const [showRaw, setShowRaw] = useState(false);

  const submissions = readSubmissions(contact.enrichmentJson);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-white-10 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white-10 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-white-60" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white-100 truncate">
              {contact.name || contact.email || contact.phone || 'Unknown contact'}
            </h3>
            <span
              className={cn(
                'inline-block text-[10px] font-medium px-2 py-0.5 rounded uppercase tracking-wider mt-1',
                STATUS_TONE[contact.status] ?? 'text-white-40 bg-white-10',
              )}
            >
              {contact.status.toLowerCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Section title="Contact">
          {contact.email && (
            <Row
              icon={<Mail className="w-3.5 h-3.5" />}
              label={contact.email}
              href={`mailto:${contact.email}`}
            />
          )}
          {contact.phone && (
            <Row
              icon={<Phone className="w-3.5 h-3.5" />}
              label={contact.phone}
              href={`tel:${contact.phone}`}
            />
          )}
          {!contact.email && !contact.phone && (
            <p className="text-xs text-white-40">No contact channels on file.</p>
          )}
        </Section>

        <Section title="Origin">
          <div className="space-y-1 text-xs text-white-60">
            <p>
              Source: <span className="text-white-90">{contact.firstSeenVia}</span>
            </p>
            {conversation.pageId && (
              <p>
                Page:{' '}
                <span className="font-mono text-white-90 text-[11px]">
                  {conversation.pageId}
                </span>
              </p>
            )}
            {conversation.campaignId && (
              <p>
                Campaign:{' '}
                <span className="font-mono text-white-90 text-[11px]">
                  {conversation.campaignId}
                </span>
              </p>
            )}
            <p>
              First seen:{' '}
              <span className="text-white-90">{formatDate(contact.createdAt)}</span>
            </p>
          </div>
        </Section>

        {contact.tags.length > 0 && (
          <Section title="Tags">
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-[11px] text-white-70 bg-white-10 px-2 py-0.5 rounded"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          </Section>
        )}

        {submissions.length > 0 && (
          <Section title={`Submissions (${submissions.length})`}>
            <ul className="space-y-2">
              {submissions.map((s, idx) => (
                <li
                  key={idx}
                  className="text-xs border border-white-10 rounded-lg p-2 space-y-1"
                >
                  <div className="text-[10px] text-white-40 uppercase tracking-wider">
                    {formatDate(s.at)}
                  </div>
                  {s.data &&
                    Object.entries(s.data)
                      .filter(([, v]) => typeof v === 'string' && v.trim())
                      .slice(0, 4)
                      .map(([k, v]) => (
                        <div key={k} className="text-white-70">
                          <span className="text-white-40">{humanize(k)}:</span>{' '}
                          {String(v)}
                        </div>
                      ))}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {contact.enrichmentJson && (
          <div>
            <button
              type="button"
              onClick={() => setShowRaw((s) => !s)}
              className="text-[10px] text-white-40 hover:text-white-70 inline-flex items-center gap-1 uppercase tracking-wider"
            >
              {showRaw ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              Raw enrichment
            </button>
            {showRaw && (
              <pre className="mt-2 text-[10px] font-mono text-white-60 bg-white-5 border border-white-10 rounded p-2 max-h-48 overflow-auto whitespace-pre-wrap">
                {JSON.stringify(contact.enrichmentJson, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-semibold text-white-40 uppercase tracking-wider">
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-center gap-2 text-xs text-white-80 hover:text-white-100">
      <span className="text-white-30">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
  return href ? (
    <a href={href} className="block">
      {content}
    </a>
  ) : (
    content
  );
}

interface SubmissionEntry {
  at: string;
  data: Record<string, unknown> | null;
}

function readSubmissions(enrichment: Record<string, unknown> | null): SubmissionEntry[] {
  if (!enrichment || typeof enrichment !== 'object') return [];
  const raw = (enrichment as { submissions?: unknown }).submissions;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is { at?: string; data?: Record<string, unknown> } => !!s && typeof s === 'object')
    .map((s) => ({
      at: typeof s.at === 'string' ? s.at : '',
      data: s.data && typeof s.data === 'object' ? (s.data as Record<string, unknown>) : null,
    }))
    .reverse();
}

function humanize(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}
