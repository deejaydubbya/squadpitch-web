'use client';

import Link from 'next/link';

interface EmptyAction {
  label: string;
  href: string;
}

interface Props {
  title: string;
  badge: 'Measured' | 'Derived' | 'AI Analysis';
  isEmpty: boolean;
  emptyMessage: string;
  emptyAction?: EmptyAction;
  emptyHint?: string;
  children: React.ReactNode;
}

const BADGE_STYLES = {
  Measured: 'bg-blue-500/15 text-blue-400',
  Derived: 'bg-amber-500/15 text-amber-400',
  'AI Analysis': 'bg-purple-500/15 text-purple-400',
} as const;

export function AnalyticsSection({
  title,
  badge,
  isEmpty,
  emptyMessage,
  emptyAction,
  emptyHint,
  children,
}: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
          {title}
        </h2>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${BADGE_STYLES[badge]}`}>
          {badge}
        </span>
      </div>

      {isEmpty ? (
        <div className="card p-6 text-center space-y-3">
          <p className="text-sm text-white-40">{emptyMessage}</p>
          {emptyHint && (
            <p className="text-xs text-white-30">{emptyHint}</p>
          )}
          {emptyAction && (
            <Link
              href={emptyAction.href}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors"
            >
              {emptyAction.label}
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </section>
  );
}
