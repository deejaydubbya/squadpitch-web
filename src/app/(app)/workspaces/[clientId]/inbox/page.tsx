'use client';

// Inbox module shell. Suite-foundation prompt 04 — surfaces the
// product entry point behind a workspace-scoped feature flag.
// Real Conversation / Message / Contact models ship later. Phase B
// of SquadSites lands form submissions into a FormSubmission
// table, which Inbox will eventually consume; until then this
// renders the pitch + cross-links.

import { useParams } from 'next/navigation';
import { Inbox as InboxIcon } from 'lucide-react';
import { useSuiteFlags } from '@/hooks/useSquadpitch';
import { ModuleShell, type ModuleShellLink } from '@/components/suite/ModuleShell';

export default function InboxShellPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const { data: flags, isLoading } = useSuiteFlags(clientId);
  const enabled = flags?.inbox ?? false;

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
      enabled={enabled}
      isLoading={isLoading}
      links={links}
      accentClass="bg-blue-500/15 text-blue-300"
    />
  );
}
