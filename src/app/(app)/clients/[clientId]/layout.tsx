'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import {
  Briefcase,
  LayoutDashboard,
  Building2,
  Megaphone,
  Image as ImageIcon,
  Images,
  Plug,
  Wand2,
  ListTodo,
  Calendar,
  BarChart3,
  Settings,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';
import { useClient } from '@/hooks/useSquadpitch';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ clientId: string }>();
  const pathname = usePathname();
  const clientId = params.clientId;

  const { data: client, isLoading, error } = useClient(clientId);

  const base = `/clients/${clientId}`;
  const tabs = [
    { href: base, icon: LayoutDashboard, label: 'Overview', exact: true },
    { href: `${base}/brand`, icon: Building2, label: 'Brand' },
    { href: `${base}/voice`, icon: Megaphone, label: 'Voice' },
    { href: `${base}/media`, icon: ImageIcon, label: 'Media' },
    { href: `${base}/channels`, icon: Plug, label: 'Channels' },
    { href: `${base}/assets`, icon: Images, label: 'Assets' },
    { href: `${base}/generate`, icon: Wand2, label: 'Generate' },
    { href: `${base}/queue`, icon: ListTodo, label: 'Queue' },
    { href: `${base}/calendar`, icon: Calendar, label: 'Calendar' },
    { href: `${base}/analytics`, icon: BarChart3, label: 'Analytics' },
    { href: `${base}/settings`, icon: Settings, label: 'Settings' },
  ];

  const statusClass =
    client?.status === 'ACTIVE'
      ? 'bg-green-500/20 text-green-400'
      : client?.status === 'PAUSED'
        ? 'bg-yellow-500/20 text-yellow-400'
        : 'bg-white-10 text-white-60';

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-white-40 hover:text-white-100 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to all clients
      </Link>

      {isLoading && (
        <div className="flex items-center gap-2 py-6">
          <LoadingSpinner size="sm" />
          <span className="text-white-40 text-sm">Loading client…</span>
        </div>
      )}

      {error && <StatusBanner error={(error as Error).message} />}

      {!isLoading && !error && !client && (
        <div className="card p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-white-100 font-semibold">Client not found</h3>
              <p className="text-sm text-white-60 mt-1">
                No client with id <code>{clientId}</code>.{' '}
                <Link href="/dashboard" className="text-accent-green-110 hover:underline">
                  Back to list
                </Link>.
              </p>
            </div>
          </div>
        </div>
      )}

      {client && (
        <>
          <div className="card p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-green-110/20 flex items-center justify-center overflow-hidden">
                {client.logoUrl ? (
                  <img src={client.logoUrl} alt={client.name} className="w-full h-full object-cover" />
                ) : (
                  <Briefcase className="w-6 h-6 text-accent-green-110" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white-100">{client.name}</h2>
                <p className="text-white-40 text-sm font-mono">{client.slug}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', statusClass)}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {client.status}
                  </span>
                  {typeof client.draftCount === 'number' && (
                    <span className="text-xs text-white-40">
                      {client.draftCount} draft{client.draftCount === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-1 border-b border-white-10 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap border-b-2 -mb-px',
                    isActive
                      ? 'text-accent-green-110 border-accent-green-110'
                      : 'text-white-40 border-transparent hover:text-white-100'
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </Link>
              );
            })}
          </div>

          <div className="pt-2">{children}</div>
        </>
      )}
    </div>
  );
}
