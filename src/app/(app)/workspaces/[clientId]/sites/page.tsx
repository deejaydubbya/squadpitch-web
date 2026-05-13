'use client';

// SquadSites workspace overview. Tabbed shell switches between the
// four operational surfaces: Pages | Forms | Submissions | Settings.
// Feature flag gate still applies — when the flag is off we fall
// back to the original ModuleShell placeholder.

import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  Globe,
  FileText,
  ClipboardList,
  Inbox,
  Settings as SettingsIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useSuiteFlags } from '@/hooks/useSquadpitch';
import { useSite, useUpdateSite } from '@/hooks/useSites';
import { useClient } from '@/hooks/useSquadpitch';
import { ModuleShell, type ModuleShellLink } from '@/components/suite/ModuleShell';
import { cn } from '@/lib/utils';
import { PagesPanel } from './_components/PagesPanel';
import { FormsPanel } from './_components/FormsPanel';
import { SubmissionsPanel } from './_components/SubmissionsPanel';
import { SiteSettingsPanel } from './_components/SiteSettingsPanel';

type Tab = 'pages' | 'forms' | 'submissions' | 'settings';

const TABS: { id: Tab; label: string; Icon: typeof FileText }[] = [
  { id: 'pages', label: 'Pages', Icon: FileText },
  { id: 'forms', label: 'Forms', Icon: ClipboardList },
  { id: 'submissions', label: 'Submissions', Icon: Inbox },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
];

export default function SitesPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;

  const { data: flags, isLoading: flagsLoading } = useSuiteFlags(clientId);
  const enabled = flags?.sites ?? false;

  const { data: client } = useClient(clientId);
  const { data: site, isLoading: siteLoading } = useSite(enabled ? clientId : undefined);
  const updateSite = useUpdateSite(clientId);

  const [tab, setTab] = useState<Tab>('pages');

  // Flag-disabled fallback — keep the original empty-state pitch so
  // users still understand what the module is for.
  if (!flagsLoading && !enabled) {
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
        enabled={false}
        isLoading={flagsLoading}
        links={links}
      />
    );
  }

  if (flagsLoading || siteLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-5 h-5 border-2 border-white-20 border-t-accent-green-110 rounded-full animate-spin" />
      </div>
    );
  }

  // Site is auto-created on first fetch (getOrCreateSite on the API).
  const liveDomain = client?.slug
    ? `${client.slug}.squadpitchsites.com`
    : null;
  const sitePublished = site?.status === 'PUBLISHED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-accent-green-110/15 text-accent-green-110">
              <Globe className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white-100">Sites</h1>
              {liveDomain && (
                <p className="text-xs text-white-50 mt-0.5 truncate">
                  {sitePublished ? (
                    <a
                      href={`https://${liveDomain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent-green-110 hover:underline"
                    >
                      {liveDomain}
                    </a>
                  ) : (
                    <>
                      <span className="font-mono">{liveDomain}</span>{' '}
                      <span className="text-amber-300">· site draft</span>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
        {site && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cn(
                'btn text-sm',
                sitePublished ? 'btn-ghost border border-white-15' : 'btn-primary',
              )}
              onClick={() =>
                updateSite.mutate({
                  status: sitePublished ? 'DRAFT' : 'PUBLISHED',
                })
              }
              disabled={updateSite.isPending}
            >
              {sitePublished ? 'Unpublish site' : 'Publish site'}
            </button>
            {liveDomain && sitePublished && (
              <Link
                href={`https://${liveDomain}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost border border-white-15 text-sm"
              >
                View live
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-white-10 flex items-center gap-1 overflow-x-auto">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                active
                  ? 'border-accent-green-110 text-white-100'
                  : 'border-transparent text-white-50 hover:text-white-80',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div>
        {tab === 'pages' && <PagesPanel clientId={clientId} clientSlug={client?.slug} />}
        {tab === 'forms' && <FormsPanel clientId={clientId} />}
        {tab === 'submissions' && <SubmissionsPanel clientId={clientId} />}
        {tab === 'settings' && <SiteSettingsPanel clientId={clientId} />}
      </div>
    </div>
  );
}
