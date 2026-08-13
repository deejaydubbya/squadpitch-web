'use client';

// Mobile-only header + slide-in drawer for the authenticated
// workspace shell. Hidden on lg+ where the persistent Sidebar
// takes over.
//
// The drawer embeds the same <Sidebar /> component used on
// desktop so suite-flag gating, active-state highlighting, and
// nav-link sets stay in lockstep without duplication. Anything
// new added to Sidebar.tsx — including future Suite items —
// automatically appears in the mobile drawer too.
//
// Behavioral guarantees:
//   - Drawer auto-closes when the route changes (so tapping
//     a link feels like normal navigation).
//   - Escape and backdrop click close.
//   - Focus moves to the close button on open so keyboard
//     users can dismiss without hunting; original trigger is
//     re-focused on close.
//   - Body scroll locks while the drawer is open so the page
//     doesn't drift behind the backdrop.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import type { Client } from '@/hooks/useSquadpitch';
import { MobileSheet } from '@/components/mobile/MobileSheet';
import { WorkspaceBottomNavigation } from './WorkspaceBottomNavigation';
import { WorkspaceMoreMenu } from './WorkspaceMoreMenu';

interface Props {
  client: Client;
}

// Pretty-print the current top-level section in the header so
// users have a "where am I" cue even before opening the drawer.
// Sub-routes (e.g. /sites/pages/:id) collapse to the parent
// section name. Returns null when the route is the workspace
// home so we don't render an awkward "Home" tag right next to
// the workspace title.
function getSectionLabel(pathname: string, base: string): string | null {
  if (pathname === base) return null;
  const rest = pathname.slice(base.length).replace(/^\//, '');
  const seg = rest.split('/')[0];
  switch (seg) {
    case 'create':
      return 'Create';
    case 'planner':
      return 'Planner';
    case 'autopilot':
      return 'Autopilot';
    case 'data':
      return 'Data';
    case 'media':
      return 'Media';
    case 'analytics':
      return 'Analytics';
    case 'sites':
      return 'Sites';
    case 'inbox':
      return 'Inbox';
    case 'ads':
      return 'Ads';
    case 'settings':
      return 'Settings';
    case 'getting-started':
      return null;
    default:
      return null;
  }
}

export function WorkspaceMobileHeader({ client }: Props) {
  const pathname = usePathname();
  const base = `/workspaces/${client.id}`;
  const sectionLabel = getSectionLabel(pathname, base);

  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Close on route change. Using a pathname-dependent effect
  // (rather than the previous in-render ref hack) ensures the
  // drawer actually closes when a nav link is tapped.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Sticky top bar — mobile only. lg+ uses the persistent
          Sidebar so we hide this entirely above that breakpoint. */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 h-14 border-b border-white-10 bg-sp-bg/95 backdrop-blur supports-[backdrop-filter]:bg-sp-bg/80">
        <Link
          href={base}
          className="flex items-center gap-2 min-w-0"
          aria-label={`${client.name}${sectionLabel ? `, ${sectionLabel}` : ''} home`}
          title={sectionLabel ? `${client.name} / ${sectionLabel}` : client.name}
        >
          <Image
            src="/icon-192.png"
            alt=""
            width={24}
            height={24}
            className="shrink-0 rounded"
          />
          <span className="text-sm font-semibold text-white-90 truncate">
            {client.name}
          </span>
          {sectionLabel && (
            <>
              <span
                className="text-white-30 text-sm shrink-0"
                aria-hidden="true"
              >
                /
              </span>
              <span className="text-sm text-white-50 truncate">
                {sectionLabel}
              </span>
            </>
          )}
        </Link>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          className="-mr-2 grid min-h-11 min-w-11 place-items-center rounded-lg text-white-60 hover:bg-white-10 hover:text-white-100 active:bg-white-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-green-110"
          aria-label="Open navigation menu"
          aria-expanded={open}
          aria-controls="workspace-mobile-drawer"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Drawer + backdrop. role="dialog" makes the drawer's
          purpose explicit to assistive tech. The aria-modal hint
          is honored by most screen readers. */}
      <MobileSheet open={open} onClose={() => setOpen(false)} title="Workspace navigation" side="left">
        <div id="workspace-mobile-drawer" className="h-full"><WorkspaceMoreMenu client={client} /></div>
      </MobileSheet>
      <WorkspaceBottomNavigation clientId={client.id} onMore={() => setOpen(true)} moreOpen={open} />
    </>
  );
}
