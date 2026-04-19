'use client';

interface Props {
  title: string;
  badge: 'Measured' | 'AI Analysis';
  isEmpty: boolean;
  emptyMessage: string;
  children: React.ReactNode;
}

export function AnalyticsSection({ title, badge, isEmpty, emptyMessage, children }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
          {title}
        </h2>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            badge === 'Measured'
              ? 'bg-blue-500/15 text-blue-400'
              : 'bg-purple-500/15 text-purple-400'
          }`}
        >
          {badge}
        </span>
      </div>

      {isEmpty ? (
        <div className="card p-6 text-center">
          <p className="text-sm text-white-40">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </section>
  );
}
