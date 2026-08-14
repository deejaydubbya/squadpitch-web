'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Sparkles,
  BarChart3,
  Settings,
  CalendarDays,
  ArrowLeft,
  Briefcase,
  Activity,
  Database,
  Zap,
  ImageIcon,
  Globe,
  Inbox as InboxIcon,
  Megaphone,
  Gift,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Client } from '@/hooks/useSquadpitch';
import { useAutopilotCampaignStats, useSuiteFlags } from '@/hooks/useSquadpitch';
import { useUsage } from '@/hooks/useBilling';
import { PlanBadge } from '@/components/billing/PlanBadge';
import { NotificationBell } from './NotificationBell';
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog';
import { useTranslations } from 'next-intl';


interface Props {
  client: Client;
}

export function Sidebar({ client }: Props) {
  const pathname = usePathname();
  const base = `/workspaces/${client.id}`;
  // Phase 3 multilingual — dashboard nav labels via next-intl.
  // Keys live in `messages/{en,es}.json` under `nav.*`.
  const t = useTranslations('nav');

  const isSettingsRoute = pathname.startsWith(`${base}/settings`);
  const { data: usage } = useUsage(client.id);
  const { data: campaignStats } = useAutopilotCampaignStats(client.id);
  const autopilotBadgeCount = (campaignStats?.pendingCount ?? 0) + (campaignStats?.readyCount ?? 0);
  // Suite-module flags. While the query is loading we render
  // nothing so workspaces without access never see the entry
  // even briefly. Flag state is cached for 5 min so this is a
  // one-time hit per session.
  const { data: suiteFlags } = useSuiteFlags(client.id);
  const suiteItems = [
    suiteFlags?.sites && { href: `${base}/sites`, icon: Globe, label: t('sites'), key: 'sites' },
    suiteFlags?.inbox && { href: `${base}/inbox`, icon: InboxIcon, label: t('inbox'), key: 'inbox' },
    suiteFlags?.ads && { href: `${base}/ads`, icon: Megaphone, label: t('ads'), key: 'ads' },
  ].filter(Boolean) as Array<{ href: string; icon: typeof Globe; label: string; key: string }>;


  const statusClass =
    client.status === 'ACTIVE'
      ? 'bg-green-500/20 text-green-400'
      : client.status === 'PAUSED'
        ? 'bg-yellow-500/20 text-yellow-400'
        : 'bg-white-10 text-white-60';

  // ── "Do" group ──
  const doItems = [
    { href: `${base}/create`, icon: Sparkles, label: t('create'), key: 'create', primary: true },
    { href: `${base}/planner`, icon: CalendarDays, label: t('planner'), key: 'planner' },
    { href: `${base}/autopilot`, icon: Zap, label: t('autopilot'), key: 'autopilot' },
  ];

  // ── "Manage" group ──
  const manageItems = [
    { href: `${base}/data`, icon: Database, label: t('data'), key: 'data' },
    { href: `${base}/media`, icon: ImageIcon, label: t('media'), key: 'media' },
    { href: `${base}/analytics`, icon: BarChart3, label: t('analytics'), key: 'analytics' },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 flex-shrink-0 border-r border-white-10 bg-sp-bg flex flex-col h-screen">
      {/* Client header */}
      <Link
        href="/workspaces"
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
      <nav className="flex-1 overflow-y-auto scrollbar-hide py-4 px-3 space-y-1">
        {/* Home */}
        <Link
          href={base}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            pathname === base
              ? 'bg-accent-green-110/15 text-accent-green-110'
              : 'text-white-60 hover:bg-white-5 hover:text-white-100'
          )}
        >
          <LayoutDashboard className="w-4.5 h-4.5" />
          <span>{t('home')}</span>
        </Link>

        {/* ── Do ── */}
        <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white-30">{t('groupDo')}</p>
        {doItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                item.primary && !active
                  ? 'text-green-400 hover:bg-green-500/10'
                  : active
                    ? 'bg-accent-green-110/15 text-accent-green-110'
                    : 'text-white-60 hover:bg-white-5 hover:text-white-100'
              )}
            >
              <item.icon className={cn('w-4.5 h-4.5', item.primary && !active ? 'text-green-400' : '')} />
              <span className="flex-1">{item.label}</span>
              {item.key === 'autopilot' && autopilotBadgeCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/20 text-green-400">
                  {autopilotBadgeCount}
                </span>
              )}
            </Link>
          );
        })}

        {/* ── Manage ── */}
        <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white-30">{t('groupManage')}</p>
        {manageItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-accent-green-110/15 text-accent-green-110'
                  : 'text-white-60 hover:bg-white-5 hover:text-white-100'
              )}
            >
              <item.icon className="w-4.5 h-4.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* ── Suite ── (flag-gated) */}
        {suiteItems.length > 0 && (
          <>
            <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white-30">{t('groupSuite')}</p>
            {suiteItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    active
                      ? 'bg-accent-green-110/15 text-accent-green-110'
                      : 'text-white-60 hover:bg-white-5 hover:text-white-100'
                  )}
                >
                  <item.icon className="w-4.5 h-4.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </>
        )}

        {/* Divider */}
        <div className="border-t border-white-10 my-3" />

        {/* Notifications & Activity */}
        <NotificationBell />
        <Link
          href="/activity"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            pathname === '/activity'
              ? 'bg-accent-green-110/15 text-accent-green-110'
              : 'text-white-60 hover:bg-white-5 hover:text-white-100',
          )}
        >
          <Activity className="w-4.5 h-4.5" />
          {t('activity')}
        </Link>

        {/* Divider */}
        <div className="border-t border-white-10 my-3" />

        {/* Settings — flat link; sub-nav lives inside the settings
            page itself (settings/layout.tsx) to avoid two places
            owning the same list. */}
        <Link
          href={`${base}/settings`}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isSettingsRoute
              ? 'bg-accent-green-110/15 text-accent-green-110'
              : 'text-white-60 hover:bg-white-5 hover:text-white-100'
          )}
        >
          <Settings className="w-4.5 h-4.5" />
          {t('settings')}
        </Link>
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white-10 space-y-2">
        <Link href="/referrals" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white-60 transition-colors hover:bg-white-5 hover:text-white-100">
          <Gift className="h-4.5 w-4.5" aria-hidden="true" />
          Refer an agent
        </Link>
        <FeedbackDialog clientId={client.id} />
        {usage && (
          <div className="px-3 py-2">
            <PlanBadge tier={usage.tier} />
          </div>
        )}
        <Link
          href="/workspaces"
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white-40 hover:text-white-100 hover:bg-white-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All workspaces
        </Link>
      </div>
    </aside>
  );
}
