'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BriefcaseBusiness, X } from 'lucide-react';
import { useWorkspaceInvitations } from '@/hooks/useWorkspaceInvitations';

const DISMISS_KEY = 'squadpitch.workspaceInvitations.bannerDismissed';

export function WorkspaceInvitationBanner() {
  const { data } = useWorkspaceInvitations();
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => { setDismissed(sessionStorage.getItem(DISMISS_KEY) === 'true'); }, []); // eslint-disable-line react-hooks/set-state-in-effect -- session-only announcement preference is browser state
  if (dismissed || !data?.count) return null;
  return (
    <aside className="mb-5 flex flex-col gap-3 rounded-2xl border border-accent-green-110/25 bg-accent-green-110/[.06] p-4 sm:flex-row sm:items-center" aria-label="Workspace invitations">
      <BriefcaseBusiness className="h-5 w-5 shrink-0 text-accent-green-110" aria-hidden="true" />
      <div className="min-w-0 flex-1"><p className="font-semibold text-white-100">You have {data.count} workspace invitation{data.count === 1 ? '' : 's'}</p><p className="mt-0.5 text-sm text-white-50">{data.count === 1 ? 'A workspace has' : 'Workspaces have'} been prepared for you.</p></div>
      <div className="flex items-center gap-2"><Link href="/workspaces#pending-invitations" className="btn inline-flex min-h-11 items-center border border-white-15 text-white-90">View invitations</Link><button type="button" aria-label="Dismiss invitation announcement" className="grid min-h-11 min-w-11 place-items-center rounded-xl text-white-50 hover:bg-white-10" onClick={() => { sessionStorage.setItem(DISMISS_KEY, 'true'); setDismissed(true); }}><X className="h-4 w-4" /></button></div>
    </aside>
  );
}
