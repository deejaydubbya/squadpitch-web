'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle2, Eye, Loader2 } from 'lucide-react';
import { useClaimWorkspaceInvitation, type WorkspaceInvitation } from '@/hooks/useWorkspaceInvitations';

export function InvitationCard({ invitation, compact = false }: { invitation: WorkspaceInvitation; compact?: boolean }) {
  const claim = useClaimWorkspaceInvitation();
  const [claimedClientId, setClaimedClientId] = useState<string | null>(null);
  const channels = invitation.selectedChannels.map((channel) => channel.charAt(0) + channel.slice(1).toLowerCase()).join(', ');

  if (claimedClientId) return (
    <div className="rounded-xl border border-accent-green-110/25 bg-accent-green-110/5 p-4" role="status">
      <div className="flex items-center gap-2 text-sm font-semibold text-white-100"><CheckCircle2 className="h-4 w-4 text-accent-green-110" />Workspace claimed successfully</div>
      <div className="mt-3 flex flex-wrap gap-3"><Link href={`/workspaces/${claimedClientId}/getting-started?claimed=true`} className="btn min-h-11 bg-accent-green-110 text-sp-bg">Open workspace</Link><span className="inline-flex min-h-11 items-center text-sm text-white-50">You can stay here and open it later.</span></div>
    </div>
  );

  return (
    <article className="rounded-xl border border-dashed border-accent-green-110/30 bg-accent-green-110/[.04] p-4">
      <h3 className="font-semibold text-white-100">{invitation.businessName}</h3>
      <p className="mt-1 text-sm text-white-50">{invitation.preparedPostCount} prepared post{invitation.preparedPostCount === 1 ? '' : 's'}{channels ? ` · ${channels}` : ''}</p>
      {!compact && invitation.preparedPropertyCount > 0 && <p className="mt-1 text-xs text-white-40">Includes {invitation.preparedPropertyCount} prepared propert{invitation.preparedPropertyCount === 1 ? 'y' : 'ies'}.</p>}
      {claim.error && <p className="mt-3 text-sm text-red-300" role="alert">{claim.error.message}</p>}
      <div className="mt-4 flex flex-col gap-2 min-[360px]:flex-row">
        <Link href={invitation.previewPath} className="btn inline-flex min-h-11 items-center justify-center gap-2 border border-white-15 text-white-80"><Eye className="h-4 w-4" />View preview</Link>
        <button type="button" disabled={claim.isPending} onClick={() => claim.mutate(invitation.id, { onSuccess: (result) => setClaimedClientId(result.clientId) })} className="btn inline-flex min-h-11 items-center justify-center gap-2 bg-accent-green-110 text-sp-bg disabled:opacity-50">{claim.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{claim.isPending ? 'Claiming…' : 'Claim workspace'}</button>
      </div>
    </article>
  );
}
