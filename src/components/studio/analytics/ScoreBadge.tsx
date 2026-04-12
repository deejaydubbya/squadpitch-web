'use client';

interface Props {
  score: number | null;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

interface Tier {
  color: string;
  label: string;
}

function getTier(score: number): Tier {
  if (score >= 90) return { color: 'bg-zone-green/20 text-zone-green', label: 'Exceptional' };
  if (score >= 70) return { color: 'bg-teal-500/20 text-teal-400', label: 'Strong' };
  if (score >= 50) return { color: 'bg-zone-yellow/20 text-zone-yellow', label: 'Average' };
  if (score >= 30) return { color: 'bg-orange-500/20 text-orange-400', label: 'Below Avg' };
  return { color: 'bg-accent-red/20 text-accent-red', label: 'Needs Work' };
}

export function ScoreBadge({ score, showLabel = false, size = 'sm' }: Props) {
  if (score == null) return null;

  const tier = getTier(score);
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';

  return (
    <span className={`${padding} rounded-full ${textSize} font-semibold ${tier.color}`}>
      {Math.round(score)}
      {showLabel && <span className="ml-1 font-normal">{tier.label}</span>}
    </span>
  );
}
