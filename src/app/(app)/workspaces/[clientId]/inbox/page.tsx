'use client';

// SquadInbox page — header + two-pane layout (list + detail). Lead
// details (the contact profile) opens as a right-side slide-over
// drawer triggered from the conversation header — no permanent
// third column even on xl. Keeps the feature-flag gate verbatim;
// when off, falls back to the ModuleShell "Coming Soon" surface.

import Link from 'next/link';
import { useCallback, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Inbox as InboxIcon, ArrowRight } from 'lucide-react';
import { useSuiteFlags } from '@/hooks/useSquadpitch';
import { useInboxConversation } from '@/hooks/useInbox';
import { ModuleShell, type ModuleShellLink } from '@/components/suite/ModuleShell';
import { ConversationList } from './_components/ConversationList';
import { ConversationDetail } from './_components/ConversationDetail';
import { ContactSidebar } from './_components/ContactSidebar';
import { InboxHeader } from './_components/InboxHeader';
import { cn } from '@/lib/utils';

export default function InboxPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: flags, isLoading: flagsLoading } = useSuiteFlags(clientId);

  // Selected conversation is held in the URL so refresh / back work.
  const selectedId = searchParams.get('c');
  const navigateInbox = (
    changes: { conversationId?: string | null; details?: boolean },
    method: 'push' | 'replace' = 'push',
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    if ('conversationId' in changes) {
      if (changes.conversationId) params.set('c', changes.conversationId);
      else params.delete('c');
    }
    if ('details' in changes) {
      if (changes.details) params.set('details', '1');
      else params.delete('details');
    }
    const qs = params.toString();
    router[method](qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Detail must be loaded for the contact drawer — it carries the
  // contact graph + page/campaign summaries. List rows only have a
  // slimmed-down contact projection.
  const { data: selectedConv } = useInboxConversation(
    clientId,
    selectedId ?? undefined,
  );

  // Lead-details drawer state. Always opt-in via the header button —
  // no permanent column anywhere, so the thread gets the full width
  // on every breakpoint.
  const detailsOpen = Boolean(selectedId && searchParams.get('details') === '1');
  const goBack = useCallback(() => router.back(), [router]);

  if (flags && !flags.inbox) {
    const links: ModuleShellLink[] = [
      {
        label: 'Sites',
        href: `/workspaces/${clientId}/sites`,
        description: 'Form submissions from landing pages will land in Inbox.',
      },
      {
        label: 'Notifications',
        href: `/workspaces/${clientId}/settings/notifications`,
        description: 'Tune which Inbox events email or page you when something arrives.',
      },
      {
        label: 'Integrations',
        href: `/workspaces/${clientId}/settings/integrations`,
        description: 'Slack, webhooks, and CRMs — outbound destinations for Inbox events.',
      },
    ];
    return (
      <ModuleShell
        Icon={InboxIcon}
        title="Manage leads and conversations"
        description="Collect form submissions, comments, and messages in one place."
        enabled={false}
        isLoading={flagsLoading}
        links={links}
        accentClass="bg-blue-500/15 text-blue-300"
      />
    );
  }

  const sitesHref = `/workspaces/${clientId}/sites`;

  return (
    <div className="flex h-full min-h-0 flex-col bg-sp-bg">
      <div className={cn(selectedId && 'hidden lg:block')}>
        <InboxHeader clientId={clientId} />
      </div>

      {/* Two-pane: list (fixed) + detail (flex). Mobile is single-pane
          flow — the list hides itself when a conversation is open and
          the detail takes the screen. */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_1fr]">
        <aside
          className={cn(
            'border-r border-white-10 lg:block min-h-0 overflow-hidden',
            selectedId ? 'hidden' : 'block',
          )}
        >
          <ConversationList
            clientId={clientId}
            selectedId={selectedId}
            onSelect={(id) => {
              navigateInbox({ conversationId: id, details: false });
            }}
          />
        </aside>

        <main
          className={cn(
            'min-h-0 overflow-hidden lg:block',
            selectedId ? 'block' : 'hidden',
          )}
        >
          {selectedId ? (
            <ConversationDetail
              key={selectedId}
              clientId={clientId}
              conversationId={selectedId}
              onBack={goBack}
              onOpenDetails={() => navigateInbox({ details: true })}
            />
          ) : (
            <EmptyDetailState sitesHref={sitesHref} />
          )}
        </main>
      </div>

      {/* Lead-details slide-over. Always rendered as a drawer — never
          a permanent column. Backdrop click + X button close it.
          Esc handling via keydown is intentionally omitted for MVP;
          adding a global listener costs more than it's worth here. */}
      {detailsOpen && selectedConv && (
        <LeadDetailsDrawer onClose={goBack}>
          <ContactSidebar
            clientId={clientId}
            conversation={selectedConv}
            onClose={goBack}
          />
        </LeadDetailsDrawer>
      )}
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────

function EmptyDetailState({ sitesHref }: { sitesHref: string }) {
  return (
    <div className="h-full hidden lg:flex items-center justify-center px-6">
      <div className="text-center space-y-3 max-w-sm">
        <div className="w-12 h-12 rounded-2xl bg-white-5 border border-white-10 mx-auto flex items-center justify-center">
          <InboxIcon className="w-5 h-5 text-white-40" />
        </div>
        <p className="text-sm font-semibold text-white-90">
          Select a lead to view the conversation.
        </p>
        <p className="text-xs text-white-50 leading-relaxed">
          New SquadSites form submissions will appear here.
        </p>
        <Link
          href={sitesHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-green-110 hover:text-accent-green-100 transition-colors pt-1"
        >
          Manage Sites
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

// ── Slide-over chrome ───────────────────────────────────────────────────

interface DrawerProps {
  onClose: () => void;
  children: React.ReactNode;
}

function LeadDetailsDrawer({ onClose, children }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Lead details"
    >
      <button type="button" className="absolute inset-0 hidden bg-transparent sm:block" onClick={onClose} aria-label="Close lead details" />
      <div ref={panelRef} tabIndex={-1} className="relative w-full bg-sp-bg shadow-2xl outline-none animate-in slide-in-from-right duration-200 sm:max-w-md sm:border-l sm:border-white-15">
        {children}
      </div>
    </div>
  );
}

