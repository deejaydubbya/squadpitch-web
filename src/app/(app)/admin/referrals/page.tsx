'use client';

import { Gift } from 'lucide-react';
import { useAdminReferrals } from '@/hooks/useAdmin';

export default function AdminReferralsPage() {
  const { data, isLoading, isError } = useAdminReferrals();
  if (isLoading) return <div className="h-48 animate-pulse rounded-xl bg-white-5" />;
  if (isError || !data) return <p role="alert" className="text-accent-red">Unable to load referrals.</p>;
  return <div className="space-y-6">
    <header className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-accent-green-110/15"><Gift className="text-accent-green-110" aria-hidden="true" /></div><div><h1 className="text-2xl font-bold">Referrals</h1><p className="text-sm text-white-40">Attribution, qualification, and Stripe credit evidence.</p></div></header>
    <div className="overflow-x-auto rounded-xl border border-white-10 bg-sp-surface">
      <table className="min-w-[900px] w-full text-left text-sm"><thead className="border-b border-white-10 text-xs uppercase text-white-40"><tr><th className="p-4">Referrer</th><th className="p-4">Referred account</th><th className="p-4">Status</th><th className="p-4">Attributed</th><th className="p-4">Qualifies</th><th className="p-4">Reward evidence</th></tr></thead>
      <tbody className="divide-y divide-white-10">{data.items.map((item) => <tr key={item.id}><td className="p-4">{item.referrer?.email || 'Deleted account'}</td><td className="p-4">{item.referred?.email || 'Deleted account'}</td><td className="p-4"><span className="rounded-full bg-white-10 px-2 py-1 text-xs">{item.status}</span>{item.disqualificationReason && <p className="mt-1 text-xs text-accent-red">{item.disqualificationReason}</p>}</td><td className="p-4 text-white-60">{new Date(item.attributedAt).toLocaleString()}</td><td className="p-4 text-white-60">{item.qualifiesAt ? new Date(item.qualifiesAt).toLocaleString() : '—'}</td><td className="p-4 text-xs text-white-60">{item.reward ? `${item.reward.status} · $${(item.reward.amountCents / 100).toFixed(2)}${item.reward.stripeBalanceTransactionId ? ` · ${item.reward.stripeBalanceTransactionId}` : ''}` : 'Not created'}</td></tr>)}</tbody></table>
      {data.items.length === 0 && <p className="p-8 text-center text-white-40">No referrals recorded.</p>}
    </div>
  </div>;
}
