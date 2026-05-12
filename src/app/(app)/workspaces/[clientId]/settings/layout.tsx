'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'General', suffix: '' },
  { label: 'Brand', suffix: '/brand' },
  { label: 'Create Preferences', suffix: '/create-preferences' },
  { label: 'Channels', suffix: '/channels' },
  { label: 'Integrations', suffix: '/integrations' },
  { label: 'Notifications', suffix: '/notifications' },
  { label: 'Billing', suffix: '/billing' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ clientId: string }>();
  const pathname = usePathname();
  const base = `/workspaces/${params.clientId}/settings`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white-100">Settings</h1>
        <p className="text-sm text-white-40 mt-1">Manage your workspace, brand, channels, and billing.</p>
      </div>

      <div className="flex flex-wrap gap-x-0.5 border-b border-white-10">
        {tabs.map((tab) => {
          const href = `${base}${tab.suffix}`;
          const isActive = tab.suffix === ''
            ? pathname === base
            : pathname.startsWith(href);
          return (
            <Link
              key={tab.label}
              href={href}
              className={cn(
                'px-3 py-2.5 text-[13px] leading-tight font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
                isActive
                  ? 'text-accent-green-110 border-accent-green-110'
                  : 'text-white-40 border-transparent hover:text-white-80 hover:border-white-10'
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
