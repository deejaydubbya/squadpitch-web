'use client';

import Link from 'next/link';
import { Briefcase, ArrowRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Client } from '@/hooks/useSquadpitch';

interface Props {
  client: Client;
  onDelete?: (e: React.MouseEvent) => void;
}

export function ClientCard({ client, onDelete }: Props) {
  const statusClass =
    client.status === 'ACTIVE'
      ? 'bg-zone-green/20 text-zone-green'
      : client.status === 'PAUSED'
        ? 'bg-zone-yellow/20 text-zone-yellow'
        : 'bg-white-10 text-white-60';

  return (
    <Link
      href={`/workspaces/${client.id}`}
      className="card-hover p-5 group block"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-accent-green-110/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {client.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={client.logoUrl}
              alt={client.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Briefcase className="w-6 h-6 text-accent-green-110" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-white-100 font-semibold text-lg group-hover:text-accent-green-110 transition-colors truncate">
              {client.name}
            </h3>
            <ArrowRight className="w-4 h-4 text-white-20 group-hover:text-accent-green-110 transition-colors flex-shrink-0" />
          </div>
          <p className="text-sm text-white-40 font-mono truncate">
            {client.slug}
          </p>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
                  statusClass
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {client.status}
              </span>
              {typeof client.draftCount === 'number' && (
                <span className="text-xs text-white-40">
                  {client.draftCount} draft{client.draftCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 rounded-lg text-white-30 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                title="Delete workspace"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
