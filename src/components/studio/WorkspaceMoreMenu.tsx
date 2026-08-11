'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CircleHelp,
  CreditCard,
  Database,
  Globe,
  Layers3,
  LogOut,
  Megaphone,
  Plug,
  Settings,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSuiteFlags, type Client } from '@/hooks/useSquadpitch';
import { useUnreadCount } from '@/hooks/useNotifications';

export function WorkspaceMoreMenu({ client }: { client: Client }) {
  const pathname = usePathname();
  const base = `/workspaces/${client.id}`;
  const { data: suiteFlags } = useSuiteFlags(client.id);
  const { data: unreadCount = 0 } = useUnreadCount();
  const inventoryLabel = client.industryKey === 'real_estate'
    ? 'Properties'
    : client.industryKey === 'car_sales'
      ? 'Vehicles'
      : 'Inventory & data';

  const workspaceItems = [
    { label: inventoryLabel, href: `${base}/data`, icon: Database },
    { label: 'Campaigns', href: `${base}/campaigns`, icon: Megaphone },
    { label: 'Analytics', href: `${base}/analytics`, icon: BarChart3 },
    { label: 'Contacts', href: `${base}/inbox`, icon: Users, enabled: Boolean(suiteFlags?.inbox) },
    { label: 'Sites', href: `${base}/sites`, icon: Globe, enabled: Boolean(suiteFlags?.sites) },
    { label: 'Ads', href: `${base}/ads`, icon: Layers3, enabled: Boolean(suiteFlags?.ads) },
  ].filter((item) => item.enabled !== false);

  const settingsItems = [
    { label: 'Integrations', href: `${base}/settings/integrations`, icon: Plug },
    { label: 'Workspace settings', href: `${base}/settings`, icon: Settings },
    { label: 'Billing', href: `${base}/settings/billing`, icon: CreditCard },
    { label: 'Notifications', href: '/notifications', icon: Bell, badge: unreadCount },
  ];

  const renderItem = (item: { label: string; href: string; icon: typeof Database; badge?: number }) => {
    const active = item.href === base ? pathname === base : pathname.startsWith(item.href);
    return (
      <Link key={item.href} href={item.href} className={cn('flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white-70 transition-colors hover:bg-white-5 hover:text-white-100', active && 'bg-accent-green-110/15 text-accent-green-110')}>
        <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="flex-1">{item.label}</span>
        {Boolean(item.badge) && <span className="rounded-full bg-accent-green-110 px-1.5 py-0.5 text-[10px] font-bold text-sp-bg">{item.badge! > 99 ? '99+' : item.badge}</span>}
      </Link>
    );
  };

  return (
    <div className="safe-area-top flex h-full flex-col overflow-y-auto p-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <div className="mb-3 flex items-center gap-3 border-b border-white-10 px-2 pb-4 pr-12">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-green-110/15">
          <BriefcaseBusiness className="h-5 w-5 text-accent-green-110" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white-100">{client.name}</p>
          <p className="text-xs text-white-40">More</p>
        </div>
      </div>

      <nav aria-label="Workspace destinations" className="space-y-1">
        {workspaceItems.map(renderItem)}
      </nav>
      <div className="my-3 border-t border-white-10" />
      <nav aria-label="Workspace configuration" className="space-y-1">
        {settingsItems.map(renderItem)}
      </nav>

      <div className="mt-auto space-y-1 border-t border-white-10 pt-3">
        {renderItem({ label: 'Switch workspace', href: '/workspaces', icon: BriefcaseBusiness })}
        {renderItem({ label: 'Help', href: '/help', icon: CircleHelp })}
        <Link href="/auth/logout" className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white-60 transition-colors hover:bg-white-5 hover:text-white-100">
          <LogOut className="h-5 w-5" aria-hidden="true" />
          Log out
        </Link>
      </div>
    </div>
  );
}
