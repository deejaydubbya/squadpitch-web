'use client';

import { useEffect, useState } from 'react';
import { VerifiedWorkspaceGate } from '@/components/onboarding/VerifiedWorkspaceGate';

type ClaimInfo = { valid: boolean; businessName?: string };

export function ClaimClient() {
  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [claimToken, setClaimToken] = useState<string | null>(null);
  useEffect(() => {
    const saved = sessionStorage.getItem('squadpitch.prospectClaimToken');
    queueMicrotask(() => setClaimToken(saved));
    if (!saved) { queueMicrotask(() => setInfo({ valid: false })); return; }
    fetch('/api/public/prospects/claim', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ claimToken: saved }), cache: 'no-store' })
      .then((response) => response.json()).then(setInfo).catch(() => setInfo({ valid: false }));
  }, []);
  if (!info) return <div className="grid min-h-[70vh] place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1DBF60] border-t-transparent" /></div>;
  if (!info.valid || !claimToken) return <State title="Claim link unavailable" body="Open the secure preview invitation again. This link may also be expired, revoked, or already used." />;
  return <VerifiedWorkspaceGate claimToken={claimToken} onTokenClaimed={() => sessionStorage.removeItem('squadpitch.prospectClaimToken')}><State title="Claim unavailable" body="Open the secure preview invitation again." /></VerifiedWorkspaceGate>;
}

function State({ title, body }: { title: string; body: string }) { return <main className="grid min-h-[75vh] place-items-center px-4"><div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center"><h1 className="text-2xl font-semibold text-white">{title}</h1><p className="mt-3 text-white/55">{body}</p></div></main>; }
