'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiFetch';

type PendingClaim = { id: string; businessName: string; industryKey: string | null; preparedPostCount: number; preparedPropertyCount: number; selectedChannels: string[] };
type Verification = { email: string | null; emailVerified: boolean; pendingClaims: PendingClaim[] };

export function VerifiedWorkspaceGate({ children, claimToken, onTokenClaimed }: { children: ReactNode; claimToken?: string | null; onTokenClaimed?: () => void }) {
  const router = useRouter();
  const [state, setState] = useState<Verification | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [continueDifferent, setContinueDifferent] = useState(false);

  const refresh = useCallback(async () => {
    setChecking(true); setError(null);
    try { setState(await apiFetch<Verification>('identity/verification', { cache: 'no-store' })); }
    catch (err) { setError(err instanceof Error ? err.message : 'Verification status could not be checked.'); }
    finally { setChecking(false); }
  }, []);
  useEffect(() => {
    // The gate must revalidate the current Auth0 identity on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function resend() {
    setChecking(true); setError(null);
    try { await apiFetch('identity/verification/resend', { method: 'POST', body: '{}' }); setError('Verification email requested. Check your inbox and spam folder.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Verification email could not be resent.'); }
    finally { setChecking(false); }
  }
  async function claim(id?: string) {
    setChecking(true); setError(null);
    try {
      const result = await apiFetch<{ clientId: string }>(id ? `prospect-claims/${id}/claim` : 'prospect-claims/claim', { method: 'POST', body: JSON.stringify(id ? {} : { claimToken }) });
      onTokenClaimed?.();
      router.replace(`/workspaces/${result.clientId}/getting-started?claimed=true`);
    } catch (err) { setError(err instanceof Error ? err.message : 'This workspace could not be claimed.'); setChecking(false); }
  }

  if (!state) return <GateCard title="Checking your account"><p className="text-white-60" aria-live="polite">{error || 'Checking verification and pending workspaces...'}</p></GateCard>;
  if (!state.emailVerified) return <GateCard title="Verify your email"><p className="text-white-60">We sent a verification link to <span className="font-medium text-white-90">{state.email || 'your email address'}</span>. Verify your email before creating or claiming a Squadpitch workspace.</p>{error && <p className="mt-4 text-sm text-amber-200" role="status" aria-live="polite">{error}</p>}<div className="mt-6 flex flex-col gap-3 sm:flex-row"><button disabled={checking} onClick={refresh} className="btn min-h-11 bg-accent-green-110 text-sp-bg">{checking ? 'Checking...' : "I've verified my email"}</button><button disabled={checking} onClick={resend} className="btn min-h-11 border border-white-15 text-white-80">Resend verification email</button><a href="/auth/logout" className="btn min-h-11 border border-white-10 text-center text-white-60">Sign out</a></div></GateCard>;
  if (claimToken) return <GateCard title="Your Squadpitch workspace is ready"><p className="text-white-60">Your verified account can now securely claim the prepared workspace.</p>{error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}<button disabled={checking} onClick={() => claim()} className="btn mt-6 min-h-11 w-full bg-accent-green-110 text-sp-bg">{checking ? 'Claiming...' : 'Claim workspace'}</button></GateCard>;
  if (!continueDifferent && state.pendingClaims.length) return <GateCard title={state.pendingClaims.length === 1 ? 'Your Squadpitch workspace is ready' : 'You have workspace invitations'}><div className="mt-4 space-y-3">{state.pendingClaims.map((pending) => <div key={pending.id} className="rounded-xl border border-white-10 p-4"><h2 className="font-semibold text-white-90">{pending.businessName}</h2><p className="mt-1 text-sm text-white-50">{pending.preparedPostCount} prepared posts · {pending.selectedChannels.map((channel) => channel.charAt(0) + channel.slice(1).toLowerCase()).join(', ')}</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><a href={`/invitations/${pending.id}/preview`} className="btn min-h-11 border border-white-15 text-center text-white-80">View preview</a><button disabled={checking} onClick={() => claim(pending.id)} className="btn min-h-11 bg-accent-green-110 text-sp-bg">Claim workspace</button></div></div>)}</div>{error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}<button onClick={() => setContinueDifferent(true)} className="mt-5 min-h-11 text-sm text-white-60 underline">Create a different workspace</button></GateCard>;
  return <>{children}</>;
}

function GateCard({ title, children }: { title: string; children: ReactNode }) { return <main className="grid min-h-dvh place-items-center px-4 py-10"><section className="w-full max-w-xl rounded-3xl border border-white-10 bg-sp-card p-6 shadow-xl sm:p-9"><h1 className="text-2xl font-bold text-white-100 sm:text-3xl">{title}</h1><div className="mt-4">{children}</div></section></main>; }
