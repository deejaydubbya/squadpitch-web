'use client';

// Sites module shell. Suite-foundation prompt 04 — surfaces the
// product entry point behind a workspace-scoped feature flag.
// Real Site / SitePage / LeadForm models + the page builder ship
// in Phase B; until then this renders the empty-state pitch and
// cross-links to adjacent product areas.

import { useParams } from 'next/navigation';
import { Globe } from 'lucide-react';
import { useSuiteFlags } from '@/hooks/useSquadpitch';
import { ModuleShell, type ModuleShellLink } from '@/components/suite/ModuleShell';

export default function SitesShellPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const { data: flags, isLoading } = useSuiteFlags(clientId);
  const enabled = flags?.sites ?? false;

  const links: ModuleShellLink[] = [
    {
      label: 'Create campaign',
      href: `/workspaces/${clientId}/create?intent=campaign`,
      description:
        'Generate a campaign first — landing pages spawn from a campaign once Sites ships.',
    },
    {
      label: 'Content Sources',
      href: `/workspaces/${clientId}/settings/content-sources`,
      description:
        'Properties, content assets, testimonials, FAQs — the source material your pages will pull from.',
    },
    {
      label: 'Planner',
      href: `/workspaces/${clientId}/planner`,
      description: 'See the drafts and campaigns this workspace already has scheduled.',
    },
  ];

  return (
    <ModuleShell
      Icon={Globe}
      title="Build landing pages from your campaigns"
      description="Turn listings, offers, testimonials, and campaigns into lead-capture pages at [client].squadpitchsites.com/[campaign]."
      enabled={enabled}
      isLoading={isLoading}
      links={links}
    />
  );
}
