'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiFetch';

type ClaimInfo = { valid: boolean; businessName?: string };

export function ClaimClient() {
  const router = useRouter();
  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  useEffect(() => {
    const saved = sessionStorage.getItem('squadpitch.prospectClaimToken');
    if (!saved) { queueMicrotask(() => setInfo({ valid: false })); return; }
    fetch('/api/public/prospects/claim', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ claimToken: saved }), cache: 'no-store' })
      .then((response) => response.json()).then(setInfo).catch(() => setInfo({ valid: false }));
  }, []);
  async function claim() {
    const token = sessionStorage.getItem('squadpitch.prospectClaimToken');
    if (!token) return;
    setClaiming(true); setError(null);
    try {
      const result = await apiFetch<{ clientId: string }>('prospect-claims/claim', { method: 'POST', body: JSON.stringify({ claimToken: token }) });
      sessionStorage.removeItem('squadpitch.prospectClaimToken');
      router.replace(`/workspaces/${result.clientId}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'This workspace could not be claimed.'); setClaiming(false); }
  }
  if (!info) return <div className="grid min-h-[70vh] place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1DBF60] border-t-transparent" /></div>;
  if (!info.valid) return <State title="Claim link unavailable" body="Open the secure preview invitation again. This link may also be expired, revoked, or already used." />;
  return <main className="grid min-h-[75vh] place-items-center px-4 py-12"><div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[.04] p-6 shadow-xl sm:p-9"><p className="text-sm font-semibold text-[#62e29a]">Secure workspace claim</p><h1 className="mt-3 text-3xl font-bold text-white">Claim {info.businessName}</h1><p className="mt-4 leading-7 text-white/60">You are signed in. Confirm to attach this existing pre-built workspace—including its prepared content—to your Squadpitch account.</p><p className="mt-3 text-sm text-white/45">The verified email on your account must match the invitation.</p>{error && <div role="alert" className="mt-5 rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}<button type="button" disabled={claiming} onClick={claim} className="mt-7 min-h-12 w-full rounded-xl bg-[#1DBF60] px-5 font-semibold text-[#0f241f] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">{claiming ? 'Claiming securely…' : 'Claim this workspace'}</button></div></main>;
}
function State({ title, body }: { title: string; body: string }) { return <main className="grid min-h-[75vh] place-items-center px-4"><div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center"><h1 className="text-2xl font-semibold text-white">{title}</h1><p className="mt-3 text-white/55">{body}</p></div></main>; }
