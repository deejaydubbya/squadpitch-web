'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  FileSearch,
  Plug,
  Send,
  Globe,
  FlaskConical,
  Cog,
  Activity,
  Webhook,
  Lock,
  ArrowLeft,
  Shield,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  isAdmin: boolean;
  roleBadge: string;
}

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Overview', exact: true },
  { href: '/admin/workspaces', icon: Building2, label: 'Workspaces' },
  { href: '/admin/prospects', icon: UserPlus, label: 'Prospect Workspaces', adminOnly: true },
  { href: '/admin/content-debugger', icon: FileSearch, label: 'Content Debugger' },
  { href: '/admin/integrations', icon: Plug, label: 'Integrations' },
  { href: '/admin/publishing', icon: Send, label: 'Publishing' },
  { href: '/admin/external-services', icon: Globe, label: 'External Services' },
  { href: '/admin/beta-ops', icon: FlaskConical, label: 'Beta Ops' },
  { href: '/admin/jobs', icon: Cog, label: 'Jobs' },
  { href: '/admin/webhooks', icon: Webhook, label: 'Webhooks' },
  { href: '/admin/system-health', icon: Activity, label: 'System Health' },
  { href: '/admin/config', icon: Lock, label: 'Config', adminOnly: true },
];

export function AdminSidebar({ isAdmin, roleBadge }: Props) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 flex-shrink-0 border-r border-white-10 bg-sp-bg flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 p-5 border-b border-white-10">
        <div className="w-10 h-10 rounded-xl bg-accent-green-110/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-accent-green-110" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white-100">Admin Console</p>
          <span className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
            isAdmin
              ? 'bg-accent-red/20 text-accent-red'
              : 'bg-accent-blue/20 text-accent-blue',
          )}>
            {roleBadge}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          const locked = item.adminOnly && !isAdmin;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-accent-green-110/15 text-accent-green-110'
                  : 'text-white-60 hover:bg-white-5 hover:text-white-100',
                locked && 'opacity-60',
              )}
            >
              <item.icon className="w-4.5 h-4.5" />
              <span className="flex-1">{item.label}</span>
              {item.adminOnly && (
                <Lock className="w-3 h-3 text-white-30" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white-10">
        <Link
          href="/workspaces"
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white-40 hover:text-white-100 hover:bg-white-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to app
        </Link>
      </div>
    </aside>
  );
}
