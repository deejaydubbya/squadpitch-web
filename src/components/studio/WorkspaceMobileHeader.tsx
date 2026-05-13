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
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import type { Client } from '@/hooks/useSquadpitch';

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
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Close on route change. Using a pathname-dependent effect
  // (rather than the previous in-render ref hack) ensures the
  // drawer actually closes when a nav link is tapped.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape to close + body scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Focus management: focus the close button on open; restore
  // focus to the trigger when the drawer closes.
  useEffect(() => {
    if (open) {
      // requestAnimationFrame so the close button is mounted
      // before we try to focus it.
      requestAnimationFrame(() => closeRef.current?.focus());
    } else {
      triggerRef.current?.focus();
    }
  }, [open]);

  return (
    <>
      {/* Sticky top bar — mobile only. lg+ uses the persistent
          Sidebar so we hide this entirely above that breakpoint. */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 h-14 border-b border-white-10 bg-sp-bg/95 backdrop-blur supports-[backdrop-filter]:bg-sp-bg/80">
        <Link
          href={base}
          className="flex items-center gap-2 min-w-0"
          aria-label={`${client.name} home`}
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
          className="p-2 -mr-2 rounded-lg text-white-60 hover:text-white-100 hover:bg-white-10 active:bg-white-10"
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
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Workspace navigation"
          id="workspace-mobile-drawer"
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[80vw] shadow-2xl shadow-black/40">
            <Sidebar client={client} />
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-3 p-1.5 rounded-lg text-white-50 hover:text-white-100 hover:bg-white-10"
              aria-label="Close navigation menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
