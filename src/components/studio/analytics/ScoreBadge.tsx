'use client';

type Variant = 'quality' | 'observed' | 'composite';

interface Props {
  score: number | null;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  variant?: Variant;
}

interface Tier {
  color: string;
  label: string;
}

function getCompositeTier(score: number): Tier {
  if (score >= 90) return { color: 'bg-zone-green/20 text-zone-green', label: 'Exceptional' };
  if (score >= 70) return { color: 'bg-teal-500/20 text-teal-400', label: 'Strong' };
  if (score >= 50) return { color: 'bg-zone-yellow/20 text-zone-yellow', label: 'Average' };
  if (score >= 30) return { color: 'bg-orange-500/20 text-orange-400', label: 'Below Avg' };
  return { color: 'bg-accent-red/20 text-accent-red', label: 'Needs Work' };
}

function getVariantStyle(variant: Variant, score: number): Tier {
  if (variant === 'quality') {
    if (score >= 70) return { color: 'bg-purple-500/20 text-purple-400', label: 'High' };
    if (score >= 40) return { color: 'bg-purple-500/15 text-purple-300', label: 'Medium' };
    return { color: 'bg-purple-500/10 text-purple-200', label: 'Low' };
  }
  if (variant === 'observed') {
    if (score >= 70) return { color: 'bg-blue-500/20 text-blue-400', label: 'Strong' };
    if (score >= 40) return { color: 'bg-blue-500/15 text-blue-300', label: 'Average' };
    return { color: 'bg-blue-500/10 text-blue-200', label: 'Below Avg' };
  }
  return getCompositeTier(score);
}

export function ScoreBadge({ score, showLabel = false, size = 'sm', variant = 'composite' }: Props) {
  if (score == null) return null;

  const tier = getVariantStyle(variant, score);
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';

  return (
    <span className={`${padding} rounded-full ${textSize} font-semibold ${tier.color}`}>
      {Math.round(score)}
      {showLabel && <span className="ml-1 font-normal">{tier.label}</span>}
    </span>
  );
}
