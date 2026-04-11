'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wand2,
  Calendar,
  Library,
  BarChart3,
  Settings,
  Building2,
  Megaphone,
  Image as ImageIcon,
  Plug,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Client } from '@/hooks/useSquadpitch';
import { useUsage } from '@/hooks/useBilling';
import { PlanBadge } from '@/components/billing/PlanBadge';

interface Props {
  client: Client;
}

export function Sidebar({ client }: Props) {
  const pathname = usePathname();
  const base = `/clients/${client.id}`;

  const isSettingsRoute = pathname.startsWith(`${base}/settings`);
  const [settingsOpen, setSettingsOpen] = useState(isSettingsRoute);
  const { data: usage } = useUsage();

  const statusClass =
    client.status === 'ACTIVE'
      ? 'bg-green-500/20 text-green-400'
      : client.status === 'PAUSED'
        ? 'bg-yellow-500/20 text-yellow-400'
        : 'bg-white-10 text-white-60';

  const navItems = [
    { href: base, icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { href: `${base}/create`, icon: Wand2, label: 'Create Content', primary: true },
    { href: `${base}/planner`, icon: Calendar, label: 'Planner' },
    { href: `${base}/library`, icon: Library, label: 'Content Library' },
    { href: `${base}/analytics`, icon: BarChart3, label: 'Analytics' },
  ];

  const settingsItems = [
    { href: `${base}/settings/brand`, label: 'Brand' },
    { href: `${base}/settings/voice`, label: 'Voice' },
    { href: `${base}/settings/media`, label: 'Media' },
    { href: `${base}/settings/channels`, label: 'Channels' },
    { href: `${base}/settings/notifications`, label: 'Notifications' },
    { href: `${base}/settings/billing`, label: 'Billing' },
  ];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="w-64 flex-shrink-0 border-r border-white-10 bg-sp-bg flex flex-col min-h-screen sticky top-0">
      {/* Client header */}
      <Link
        href="/dashboard"
        className="flex items-center gap-3 p-5 border-b border-white-10 hover:bg-white-5 transition-colors group"
      >
        <div className="w-10 h-10 rounded-xl bg-accent-green-110/20 flex items-center justify-center overflow-hidden flex-shrink-0">
          {client.logoUrl ? (
            <img src={client.logoUrl} alt={client.name} className="w-full h-full object-cover" />
          ) : (
            <Briefcase className="w-5 h-5 text-accent-green-110" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white-100 truncate">{client.name}</p>
          <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium', statusClass)}>
            <span className="w-1 h-1 rounded-full bg-current" />
            {client.status}
          </span>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                item.primary && !active
                  ? 'text-green-400 bg-green-500/10 hover:bg-green-500/20'
                  : active
                    ? 'bg-accent-green-110/15 text-accent-green-110'
                    : 'text-white-60 hover:bg-white-5 hover:text-white-100'
              )}
            >
              <item.icon className={cn('w-4.5 h-4.5', item.primary && !active ? 'text-green-400' : '')} />
              {item.label}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="border-t border-white-10 my-3" />

        {/* Settings section */}
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full',
            isSettingsRoute
              ? 'bg-accent-green-110/15 text-accent-green-110'
              : 'text-white-60 hover:bg-white-5 hover:text-white-100'
          )}
        >
          <Settings className="w-4.5 h-4.5" />
          <span className="flex-1 text-left">Settings</span>
          {settingsOpen ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {settingsOpen && (
          <div className="ml-4 pl-4 border-l border-white-10 space-y-0.5">
            {settingsItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'block px-3 py-2 rounded-lg text-sm transition-colors',
                    active
                      ? 'text-accent-green-110 bg-accent-green-110/10'
                      : 'text-white-40 hover:text-white-100 hover:bg-white-5'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href={`${base}/settings`}
              className={cn(
                'block px-3 py-2 rounded-lg text-sm transition-colors',
                pathname === `${base}/settings`
                  ? 'text-accent-green-110 bg-accent-green-110/10'
                  : 'text-white-40 hover:text-white-100 hover:bg-white-5'
              )}
            >
              General
            </Link>
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white-10 space-y-2">
        {usage && (
          <div className="px-3 py-2">
            <PlanBadge tier={usage.tier} />
          </div>
        )}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white-40 hover:text-white-100 hover:bg-white-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All clients
        </Link>
      </div>
    </aside>
  );
}
