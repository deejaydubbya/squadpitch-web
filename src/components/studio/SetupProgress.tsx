'use client';

import Link from 'next/link';
import {
  Globe,
  Share2,
  Database,
  CheckCircle2,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SetupStep {
  key: string;
  icon: React.ElementType;
  label: string;
  description: string;
  doneDescription: string;
  done: boolean;
  href: string;
}

interface Props {
  hasWebsite: boolean;
  hasChannels: boolean;
  hasSources: boolean;
  channelCount: number;
  connectedCount: number;
  sourceCount: number;
  base: string;
}

export function SetupProgress({
  hasWebsite,
  hasChannels,
  hasSources,
  channelCount,
  connectedCount,
  sourceCount,
  base,
}: Props) {
  const steps: SetupStep[] = [
    {
      key: 'website',
      icon: Globe,
      label: 'Business info',
      description: 'Add your website so Squadpitch understands your business',
      doneDescription: 'Squadpitch is using your website to understand your business',
      done: hasWebsite,
      href: `${base}/settings/brand`,
    },
    {
      key: 'channels',
      icon: Share2,
      label: 'Social channels',
      description: 'Connect your accounts to publish and track performance',
      doneDescription:
        connectedCount > 0
          ? `${connectedCount} channel${connectedCount !== 1 ? 's' : ''} connected — publishing and analytics active`
          : `${channelCount} channel${channelCount !== 1 ? 's' : ''} enabled but not connected`,
      done: connectedCount > 0,
      href: `${base}/settings/channels`,
    },
    {
      key: 'sources',
      icon: Database,
      label: 'Sources',
      description: 'Add business info, testimonials, or connect systems for smarter posts',
      doneDescription: `${sourceCount} source${sourceCount !== 1 ? 's' : ''} added — powering your recommendations`,
      done: hasSources,
      href: `${base}/sources`,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  // All setup complete — don't show
  if (doneCount === steps.length) return null;

  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="card p-5 border-white-10 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent-green-110" />
          <h2 className="text-sm font-semibold text-white-100">
            Make Squadpitch smarter
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-green-110/10 text-accent-green-110">
            {doneCount}/{steps.length} done
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 rounded-full bg-white-10 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent-green-110 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] text-white-30 font-medium">{pct}%</span>
        </div>
      </div>

      <p className="text-xs text-white-40">
        The more Squadpitch knows about your business, the better your posts and recommendations.
      </p>

      <div className="space-y-2">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.key}
              href={step.href}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border transition-all group',
                step.done
                  ? 'border-white-10 bg-white-5'
                  : 'border-accent-green-110/20 bg-accent-green-110/5 hover:border-accent-green-110/40'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  step.done
                    ? 'bg-green-500/15 text-green-400'
                    : 'bg-accent-green-110/10 text-accent-green-110'
                )}
              >
                {step.done ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium',
                    step.done ? 'text-white-60' : 'text-white-100'
                  )}
                >
                  {step.label}
                </p>
                <p className="text-[11px] text-white-30 mt-0.5">
                  {step.done ? step.doneDescription : step.description}
                </p>
              </div>
              {!step.done && (
                <span className="flex-shrink-0 px-2.5 py-1 rounded-md bg-accent-green-110/10 text-accent-green-110 text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  Set up
                </span>
              )}
              <ChevronRight
                className={cn(
                  'w-3.5 h-3.5 flex-shrink-0',
                  step.done ? 'text-white-10' : 'text-white-20'
                )}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
