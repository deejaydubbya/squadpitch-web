'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Home, Inbox, Menu, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSuiteFlags } from '@/hooks/useSquadpitch';
import { useTranslations } from 'next-intl';

interface Props {
  clientId: string;
  onMore: () => void;
  moreOpen: boolean;
}

export function WorkspaceBottomNavigation({ clientId, onMore, moreOpen }: Props) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const base = `/workspaces/${clientId}`;
  const { data: suiteFlags } = useSuiteFlags(clientId);
  const items = [
    { label: t('home'), href: base, icon: Home, exact: true },
    suiteFlags?.inbox ? { label: t('inbox'), href: `${base}/inbox`, icon: Inbox } : null,
    { label: t('create'), href: `${base}/create`, icon: Plus, primary: true },
    { label: t('posts'), href: `${base}/planner`, icon: CalendarDays },
  ].filter(Boolean) as Array<{ label: string; href: string; icon: typeof Home; exact?: boolean; primary?: boolean }>;

  return (
    <nav className="safe-area-bottom fixed inset-x-0 bottom-0 z-40 grid min-h-[var(--sp-mobile-nav-height)] grid-cols-5 border-t border-white-10 bg-sp-bg/95 px-1 backdrop-blur lg:hidden" aria-label="Primary workspace navigation">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link key={item.label} href={item.href} className={cn('flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium text-white-50 transition-colors hover:text-white-100', active && 'text-accent-green-110', item.primary && 'text-green-400')} aria-current={active ? 'page' : undefined}>
            <item.icon className={cn('h-5 w-5', item.primary && 'rounded-full bg-accent-green-110 p-0.5 text-sp-bg')} aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
      <button type="button" onClick={onMore} className={cn('flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium text-white-50 transition-colors hover:text-white-100', moreOpen && 'text-accent-green-110')} aria-expanded={moreOpen} aria-controls="workspace-mobile-drawer">
        <Menu className="h-5 w-5" aria-hidden="true" />
        <span>{t('more')}</span>
      </button>
    </nav>
  );
}
