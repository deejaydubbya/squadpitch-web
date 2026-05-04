'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface OverflowMenuItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'danger';
  disabled?: boolean;
  loading?: boolean;
}

interface Props {
  items: OverflowMenuItem[];
}

export function OverflowMenu({ items }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-md text-white-60 hover:text-white-100 hover:bg-white-10 transition-colors"
        title="More actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-1 min-w-[180px] rounded-lg bg-sp-card border border-white-10 shadow-xl z-50 py-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => {
                  if (item.disabled || item.loading) return;
                  item.onClick();
                  setOpen(false);
                }}
                disabled={item.disabled || item.loading}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                  item.variant === 'danger'
                    ? 'text-accent-red hover:bg-accent-red/10'
                    : 'text-white-80 hover:bg-white-10'
                )}
              >
                {item.loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                )}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
