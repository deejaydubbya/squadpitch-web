'use client';

// Hero card rendered for the first inbound FORM_SUBMISSION message
// of a conversation. Replaces the standard message bubble for that
// single message so the lead's submission feels like an artifact,
// not just another chat turn. Keeps the thread visually substantial
// even when only one message exists.

import { FileText, Calendar } from 'lucide-react';
import type {
  InboxMessage,
  InboxPageSummary,
  InboxCampaignSummary,
} from '@/hooks/useInbox';
import { formatDateTime, humanizeKey } from './inbox.helpers';

interface LeadCardProps {
  message: InboxMessage;
  page: InboxPageSummary | null;
  campaign: InboxCampaignSummary | null;
}

// Skip identity fields already pinned to the contact card on the
// sidebar — they'd clutter the answer table.
const SKIP_KEYS = new Set([
  'name',
  'fullname',
  'full_name',
  'firstname',
  'first_name',
  'lastname',
  'last_name',
  'email',
  'phone',
  'message',
  'comments',
  'details',
  'notes',
]);

export function LeadCard({ message, page, campaign }: LeadCardProps) {
  const payload =
    message.payloadJson && typeof message.payloadJson === 'object'
      ? (message.payloadJson as Record<string, unknown>)
      : null;

  const answers = payload
    ? Object.entries(payload).filter(
        ([k, v]) =>
          !SKIP_KEYS.has(k.toLowerCase()) &&
          typeof v === 'string' &&
          v.trim().length > 0,
      )
    : [];

  // The form-prose body the intake service composes. If "message"
  // was a real field we surface it here; otherwise it's a derived
  // summary and we skip rendering it to avoid duplicating answers.
  const proseBody =
    payload &&
    typeof payload.message === 'string' &&
    payload.message.trim().length > 0
      ? payload.message.trim()
      : null;

  return (
    <div className="card border-accent-green-110/20 bg-accent-green-110/5 p-4 sm:p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-accent-green-110/15 text-accent-green-110 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-accent-green-110">
            New lead
          </div>
          <h3 className="text-sm font-semibold text-white-100 mt-0.5">
            {page?.title
              ? `Submitted via ${page.title}`
              : campaign?.name
                ? `Submitted via ${campaign.name}`
                : 'Form submission'}
          </h3>
          <p className="text-xs text-white-50 mt-1 inline-flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {formatDateTime(message.createdAt)}
          </p>
        </div>
      </div>

      {proseBody && (
        <div className="bg-white-5 border border-white-10 rounded-lg p-3">
          <p className="text-sm text-white-90 whitespace-pre-wrap leading-relaxed">
            {proseBody}
          </p>
        </div>
      )}

      {answers.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-white-40 uppercase tracking-wider mb-2">
            Form answers
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-xs">
            {answers.map(([k, v]) => (
              <div
                key={k}
                className="contents"
              >
                <dt className="text-white-50 font-medium sm:text-right pr-1 sm:pr-3">
                  {humanizeKey(k)}
                </dt>
                <dd className="text-white-90 break-words border-b border-white-10/50 pb-2 sm:border-b-0 sm:pb-0">
                  {String(v)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {!proseBody && answers.length === 0 && (
        <p className="text-xs text-white-50 italic">
          This form submitted without any user-entered fields beyond contact
          details.
        </p>
      )}
    </div>
  );
}
