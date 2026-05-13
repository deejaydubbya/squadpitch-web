'use client';

// Ads module shell. Suite-foundation prompt 04 — surfaces the
// product entry point behind a workspace-scoped feature flag.
// Real AdCampaign / AdCreative / AdAudience / AdBudget /
// AdPlatformConnection models ship later. MVP plan calls for an
// export-only flow (no live platform launch) so this shell will
// eventually open into a draft-creative builder.

import { useParams } from 'next/navigation';
import { Megaphone } from 'lucide-react';
import { useSuiteFlags } from '@/hooks/useSquadpitch';
import { ModuleShell, type ModuleShellLink } from '@/components/suite/ModuleShell';

export default function AdsShellPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const { data: flags, isLoading } = useSuiteFlags(clientId);
  const enabled = flags?.ads ?? false;

  const links: ModuleShellLink[] = [
    {
      label: 'Create campaign',
      href: `/workspaces/${clientId}/create?intent=campaign`,
      description: 'Ad creatives spin off from an existing campaign once Ads ships.',
    },
    {
      label: 'Sites',
      href: `/workspaces/${clientId}/sites`,
      description: 'Landing pages become the destination URL for ads.',
    },
    {
      label: 'Analytics',
      href: `/workspaces/${clientId}/analytics`,
      description: 'Measure ad impact alongside organic content performance.',
    },
  ];

  return (
    <ModuleShell
      Icon={Megaphone}
      title="Promote your best content"
      description="Turn posts, campaigns, and landing pages into export-ready ad campaigns."
      enabled={enabled}
      isLoading={isLoading}
      links={links}
      accentClass="bg-purple-500/15 text-purple-300"
    />
  );
}
