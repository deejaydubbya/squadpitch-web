'use client';

interface Props {
  label: string;
  value: string;
  helper?: string;
  variant?: 'blue' | 'purple' | 'default';
}

const VALUE_COLORS = {
  blue: 'text-blue-400',
  purple: 'text-purple-400',
  default: 'text-white-100',
} as const;

export function MetricCard({ label, value, helper, variant = 'default' }: Props) {
  return (
    <div className="card p-4">
      <p className="text-xs text-white-40 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${VALUE_COLORS[variant]}`}>{value}</p>
      {helper && <p className="text-[11px] text-white-40 mt-0.5">{helper}</p>}
    </div>
  );
}
