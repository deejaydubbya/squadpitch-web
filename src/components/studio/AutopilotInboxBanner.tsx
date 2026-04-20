'use client';

import { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';

interface AutopilotInboxBannerProps {
  clientId: string;
}

export function AutopilotInboxBanner({ clientId }: AutopilotInboxBannerProps) {
  const storageKey = `sp_autopilot_inbox_banner_${clientId}`;
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(storageKey) === 'dismissed');
  }, [storageKey]);

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'dismissed');
    setDismissed(true);
  };

  return (
    <div className="relative bg-accent-green-110/8 border border-accent-green-110/20 rounded-xl p-4 flex items-start gap-3">
      <Sparkles className="w-5 h-5 text-accent-green-110 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white-100">
          AI prepared these campaign ideas for you
        </p>
        <p className="text-xs text-white-50 mt-1 leading-relaxed">
          Autopilot detected listing events and prepared draft campaigns. Nothing publishes
          automatically — you review and approve each one before anything goes to your planner.
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="w-6 h-6 rounded-md flex items-center justify-center text-white-40 hover:text-white-100 hover:bg-white-10 transition-colors flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
