'use client';

import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Lock } from 'lucide-react';

export default function ConfigPage() {
  const { isAdmin } = useCurrentUser();

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-white">Config</h1>
        {!isAdmin && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-orange/20 text-accent-orange">
            <Lock className="w-3 h-3" />
            Read-only
          </span>
        )}
      </div>
      <p className="text-zinc-400">Coming soon. This section will provide system configuration management. {isAdmin ? 'Full access.' : 'Developer access is read-only.'}</p>
    </div>
  );
}
