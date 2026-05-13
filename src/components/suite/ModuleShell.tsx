'use client';

// Shared chrome for the Sites / Inbox / Ads module shells. Each
// shell is currently a placeholder — the empty-state copy is the
// product surface today. When the feature flag is off for a
// workspace we render a "Coming Soon" version with the same
// layout but slightly different copy so the user knows the
// module exists but isn't enabled for them yet.

import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModuleShellLink {
  label: string;
  href: string;
  /** Optional one-liner shown under the link title. */
  description?: string;
}

interface ModuleShellProps {
  /** Icon for the hero panel. */
  Icon: LucideIcon;
  /** "Build landing pages from your campaigns" */
  title: string;
  /** Long-form pitch shown under the title. */
  description: string;
  /** Whether this workspace has the flag enabled. */
  enabled: boolean;
  /** Whether we're still resolving the flag (suppresses the placeholder flash). */
  isLoading: boolean;
  /** Cross-links rendered as a list of cards in the empty state. */
  links: ModuleShellLink[];
  /** Optional accent color class on the icon background. Defaults to accent-green. */
  accentClass?: string;
}

export function ModuleShell({
  Icon,
  title,
  description,
  enabled,
  isLoading,
  links,
  accentClass = 'bg-accent-green-110/15 text-accent-green-110',
}: ModuleShellProps) {
  // While the flag query is loading, render nothing rather than
  // briefly flash the "Coming Soon" copy and then swap to the
  // empty state. A tiny pause feels less janky than a flicker.
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-5 h-5 border-2 border-white-20 border-t-accent-green-110 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Hero — same shape for enabled + Coming Soon. The copy
          tweaks based on the flag. */}
      <div className="card p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              accentClass,
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white-100">{title}</h1>
            {!enabled && (
              <p className="text-xs text-amber-300 mt-0.5 font-medium uppercase tracking-wider">
                Coming Soon
              </p>
            )}
          </div>
        </div>
        <p className="text-sm text-white-50 leading-relaxed">
          {description}
        </p>
        {!enabled && (
          <p className="text-xs text-white-40 leading-relaxed border-t border-white-10 pt-4">
            This module isn&apos;t enabled for your workspace yet.
            Once it ships you&apos;ll see the same panel filled in with
            real content. Reach out if you&apos;d like early access.
          </p>
        )}
      </div>

      {/* Cross-links — show even when disabled so users can still
          navigate to related areas of the product. */}
      {links.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-white-40 uppercase tracking-wider mb-3">
            Related
          </h2>
          <ul className="space-y-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="card p-4 flex items-center gap-3 hover:bg-white-5 hover:border-white-20 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white-80 group-hover:text-white-100">
                      {link.label}
                    </p>
                    {link.description && (
                      <p className="text-xs text-white-40 mt-0.5">
                        {link.description}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-white-30 group-hover:text-accent-green-110 transition-colors shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
