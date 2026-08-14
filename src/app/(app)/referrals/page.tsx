'use client';

import { useState } from 'react';
import { Check, Copy, Gift, Users } from 'lucide-react';
import { useReferralDashboard } from '@/hooks/useReferrals';

const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);

export default function ReferralsPage() {
  const { data, isLoading, isError } = useReferralDashboard();
  const [copied, setCopied] = useState(false);
  if (isLoading) return <main className="mx-auto max-w-5xl p-4 sm:p-8"><div className="h-48 animate-pulse rounded-2xl bg-white-5" /></main>;
  if (isError || !data) return <main className="mx-auto max-w-5xl p-4 sm:p-8"><p role="alert" className="rounded-xl border border-accent-red/30 bg-accent-red/10 p-4 text-accent-red">We couldn&apos;t load your referral program. Try again.</p></main>;
  const copy = async () => { await navigator.clipboard.writeText(data.referralLink); setCopied(true); window.setTimeout(() => setCopied(false), 2000); };
  return <main className="mx-auto max-w-5xl space-y-6 p-4 pb-24 sm:p-8">
    <section className="overflow-hidden rounded-2xl border border-accent-green-110/20 bg-gradient-to-br from-accent-green-110/15 to-sp-surface p-5 sm:p-8">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-accent-green-110 text-sp-bg"><Gift aria-hidden="true" /></div>
      <h1 className="text-2xl font-bold sm:text-3xl">Give a great recommendation. Earn $59.</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white-60 sm:text-base">Share Squadpitch with another agent. When they become a paying customer and remain qualified for 14 days, you earn a $59 account credit toward future Squadpitch invoices.</p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="referral-link">Your referral link</label>
        <input id="referral-link" readOnly value={data.referralLink} className="min-h-12 min-w-0 flex-1 rounded-xl border border-white-10 bg-sp-bg px-4 text-sm text-white" />
        <button type="button" onClick={copy} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-green-110 px-5 font-semibold text-sp-bg">{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? 'Copied' : 'Copy link'}</button>
      </div>
    </section>
    <section className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-white-10 bg-sp-surface p-5"><p className="text-sm text-white-50">Pending qualification</p><p className="mt-2 text-2xl font-bold">{money(data.pendingAmountCents)}</p></div>
      <div className="rounded-2xl border border-white-10 bg-sp-surface p-5"><p className="text-sm text-white-50">Credit earned</p><p className="mt-2 text-2xl font-bold text-accent-green-110">{money(data.earnedAmountCents)}</p></div>
    </section>
    <section className="rounded-2xl border border-white-10 bg-sp-surface p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2"><Users aria-hidden="true" className="text-accent-blue" /><h2 className="text-lg font-semibold">Your referrals</h2></div>
      {data.referrals.length === 0 ? <p className="rounded-xl bg-white-5 p-6 text-center text-sm text-white-50">No referrals yet. Copy your link and share it with an agent who would love Squadpitch.</p> : <ul className="divide-y divide-white-10">{data.referrals.map((referral, index) => <li key={referral.id} className="flex items-center justify-between gap-4 py-4"><div><p className="font-medium">Referral {data.referrals.length - index}</p><p className="text-xs text-white-40">Started {new Date(referral.attributedAt).toLocaleDateString()}</p></div><span className="rounded-full bg-white-10 px-3 py-1 text-xs text-white-70">{referral.status}</span></li>)}</ul>}
    </section>
    <p className="text-xs leading-5 text-white-40">Credits are not cash, cannot be transferred, and apply automatically to future Squadpitch invoices. Self-referrals and internal or synthetic accounts are not eligible.</p>
  </main>;
}
