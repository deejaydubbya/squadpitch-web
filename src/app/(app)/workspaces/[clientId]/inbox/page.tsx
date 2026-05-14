'use client';

// SquadInbox page — three-pane layout (list / detail / contact)
// wired to the inbox API. The feature flag still gates the page;
// when off, we fall back to the original ModuleShell "Coming Soon"
// surface so the route never 404s for un-enabled workspaces.

import { useState } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Inbox as InboxIcon, PanelRightOpen } from 'lucide-react';
import { useSuiteFlags } from '@/hooks/useSquadpitch';
import { useInboxConversation } from '@/hooks/useInbox';
import { ModuleShell, type ModuleShellLink } from '@/components/suite/ModuleShell';
import { ConversationList } from './_components/ConversationList';
import { ConversationDetail } from './_components/ConversationDetail';
import { ContactSidebar } from './_components/ContactSidebar';
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
  const setSelectedId = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set('c', id);
    else params.delete('c');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Detail must be loaded for the contact sidebar — it carries the
  // contact graph. List rows only have a slimmed-down contact.
  const { data: selectedConv } = useInboxConversation(
    clientId,
    selectedId ?? undefined,
  );

  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);

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

  return (
    <div className="h-[calc(100vh-4rem)] -mx-4 sm:-mx-6 -my-4 sm:-my-6 grid grid-cols-1 lg:grid-cols-[320px_1fr_320px] xl:grid-cols-[360px_1fr_360px] bg-sp-bg">
      {/* List — hidden when a conversation is open on mobile so the
          detail takes the full screen. */}
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
            setSelectedId(id);
            setSidebarOpenMobile(false);
          }}
        />
      </aside>

      {/* Detail */}
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
            onBack={() => setSelectedId(null)}
            rightAction={
              selectedConv ? (
                <button
                  type="button"
                  onClick={() => setSidebarOpenMobile(true)}
                  className="xl:hidden p-1.5 rounded-lg text-white-60 hover:text-white-100 hover:bg-white-10"
                  aria-label="Show contact"
                >
                  <PanelRightOpen className="w-4 h-4" />
                </button>
              ) : null
            }
          />
        ) : (
          <div className="h-full hidden lg:flex items-center justify-center">
            <p className="text-sm text-white-50">Select a conversation to read.</p>
          </div>
        )}
      </main>

      {/* Contact sidebar — desktop xl is always visible, smaller
          screens open it as an overlay. */}
      <aside className="hidden xl:block border-l border-white-10 min-h-0 overflow-hidden">
        {selectedConv ? (
          <ContactSidebar contact={selectedConv.contact} conversation={selectedConv} />
        ) : (
          <div className="h-full flex items-center justify-center px-6">
            <p className="text-xs text-white-40 text-center">
              Contact details appear here once a conversation is open.
            </p>
          </div>
        )}
      </aside>

      {/* Mobile / tablet sidebar overlay */}
      {sidebarOpenMobile && selectedConv && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40 xl:hidden"
          onClick={() => setSidebarOpenMobile(false)}
        >
          <div
            className="w-full max-w-sm bg-sp-bg border-l border-white-15"
            onClick={(e) => e.stopPropagation()}
          >
            <ContactSidebar contact={selectedConv.contact} conversation={selectedConv} />
          </div>
        </div>
      )}
    </div>
  );
}
