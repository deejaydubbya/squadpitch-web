'use client';

import { ExternalLink, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ChecklistItem {
  key: string;
  label: string;
  description: string;
  done: boolean;
  href: string;
}

interface Props {
  clientId: string;
  hasListingFeed: boolean;
  hasTestimonials: boolean;
  hasDataItems: boolean;
  hasDrafts: boolean;
}

export function PlannerSetupChecklist({
  clientId,
  hasListingFeed,
  hasTestimonials,
  hasDataItems,
  hasDrafts,
}: Props) {
  const items: ChecklistItem[] = [
    {
      key: 'listing_feed',
      label: 'Add your properties',
      description: 'Add properties to generate listing campaigns',
      done: hasListingFeed,
      href: `/workspaces/${clientId}/listing-campaign`,
    },
    {
      key: 'testimonial',
      label: 'Add a testimonial',
      description: 'Client reviews build trust and engagement',
      done: hasTestimonials,
      href: `/workspaces/${clientId}/data`,
    },
    {
      key: 'data',
      label: 'Import business information',
      description: 'Stats, bios, and market insights power better content',
      done: hasDataItems,
      href: `/workspaces/${clientId}/data`,
    },
    {
      key: 'draft',
      label: 'Approve your first draft',
      description: 'Review and approve generated content to start publishing',
      done: hasDrafts,
      href: `/workspaces/${clientId}/planner`,
    },
  ];

  const completedCount = items.filter((i) => i.done).length;

  if (completedCount === items.length) return null;

  return (
    <div className="card p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white-100">
          Get started with your Planner
        </h3>
        <p className="text-xs text-white-40 mt-0.5">
          Complete these steps to unlock your first marketing plan.
          <span className="text-white-60 ml-1 font-medium">
            {completedCount}/{items.length} done
          </span>
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-white-10 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent-green-110 transition-all"
          style={{ width: `${(completedCount / items.length) * 100}%` }}
        />
      </div>

      <div className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
              item.done
                ? 'opacity-60'
                : 'hover:bg-white-5'
            )}
          >
            <div
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border',
                item.done
                  ? 'bg-accent-green-110/20 border-accent-green-110/30'
                  : 'border-white-20 group-hover:border-accent-green-110/40'
              )}
            >
              {item.done && (
                <Check className="w-3 h-3 text-accent-green-110" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-sm font-medium',
                  item.done ? 'text-white-40 line-through' : 'text-white-100'
                )}
              >
                {item.label}
              </p>
              <p className="text-xs text-white-40 truncate">
                {item.description}
              </p>
            </div>
            {!item.done && (
              <ExternalLink className="w-3.5 h-3.5 text-white-20 group-hover:text-white-40 flex-shrink-0" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
