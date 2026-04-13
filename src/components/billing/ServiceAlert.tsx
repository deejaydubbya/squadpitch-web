'use client';

import { AlertTriangle, XCircle, AlertCircle } from 'lucide-react';
import { useSystemHealth } from '@/hooks/useBilling';
import { cn } from '@/lib/utils';

export function ServiceAlert({ className }: { className?: string }) {
  const { data: health } = useSystemHealth();

  if (!health) return null;

  const { services, budget } = health;

  // Determine worst status
  const isDown = services.openai === 'down' || services.fal === 'down';
  const isDegraded = services.openai === 'degraded' || services.fal === 'degraded';
  const budgetWarning = budget.openai.status === 'warning' || budget.fal.status === 'warning';
  const budgetExceeded = budget.openai.status === 'exceeded' || budget.fal.status === 'exceeded';

  if (!isDown && !isDegraded && !budgetWarning && !budgetExceeded) return null;

  let variant: 'red' | 'yellow' | 'orange';
  let Icon: typeof AlertTriangle;
  let message: string;

  if (isDown) {
    variant = 'red';
    Icon = XCircle;
    const downServices = [
      services.openai === 'down' && 'text generation',
      services.fal === 'down' && 'image/video generation',
    ].filter(Boolean).join(' and ');
    message = `AI ${downServices} is temporarily unavailable. Please try again in a few minutes.`;
  } else if (budgetExceeded) {
    variant = 'red';
    Icon = XCircle;
    message = 'Some AI features are temporarily unavailable due to budget limits.';
  } else if (isDegraded) {
    variant = 'yellow';
    Icon = AlertTriangle;
    message = 'AI services are experiencing delays. Generation may take longer than usual.';
  } else {
    variant = 'orange';
    Icon = AlertCircle;
    message = 'AI budget is nearing its limit. Some features may be restricted.';
  }

  const colors = {
    red: 'border-accent-red/30 bg-accent-red/5 text-accent-red',
    yellow: 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400',
    orange: 'border-accent-orange/30 bg-accent-orange/5 text-accent-orange',
  };

  return (
    <div className={cn('flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm', colors[variant], className)}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
