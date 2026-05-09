'use client';

import { Facebook, Instagram, CheckCircle2 } from 'lucide-react';
import {
  isMetaAppReviewDemo,
  META_APP_REVIEW_DEMO_LABELS as L,
} from '@/lib/metaAppReviewDemo';

interface Props {
  lastSyncedAt: string | null;
}

function formatSyncedAt(iso: string | null): string {
  if (!iso) return 'just now';
  const date = new Date(iso);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

// Connected-account summary card. Renders only when the Meta App
// Review demo flag is on — its purpose is to give Meta reviewers
// a visible header that proves the workspace has a Facebook Page
// and Instagram professional account connected and that platform
// insights are flowing through to the user-facing analytics page.
export function ConnectedMetaAccountsCard({ lastSyncedAt }: Props) {
  if (!isMetaAppReviewDemo()) return null;
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white-100">Connected Meta accounts</h2>
        <span className="text-[10px] text-white-40 font-mono">{L.source}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AccountRow
          icon={Facebook}
          platform="Facebook Page"
          accountName={L.facebookPageName}
          accountId={L.facebookPageId}
          accentClass="text-[#1877F2]"
        />
        <AccountRow
          icon={Instagram}
          platform="Instagram (Professional)"
          accountName={L.instagramHandle}
          accountId={L.instagramAccountId}
          accentClass="text-[#E1306C]"
        />
      </div>
      <p className="text-[10px] text-white-40">
        Last synced: <span className="font-mono text-white-60">{formatSyncedAt(lastSyncedAt)}</span>
      </p>
    </div>
  );
}

function AccountRow({
  icon: Icon,
  platform,
  accountName,
  accountId,
  accentClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  platform: string;
  accountName: string;
  accountId: string;
  accentClass: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white-10 bg-white-5 p-3">
      <Icon className={`w-5 h-5 ${accentClass}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-white-40 uppercase tracking-wider">{platform}</p>
        <p className="text-sm font-semibold text-white-100 truncate">{accountName}</p>
        <p className="text-[10px] text-white-40 font-mono truncate">ID: {accountId}</p>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-green-400">
        <CheckCircle2 className="w-3 h-3" />
        Connected
      </div>
    </div>
  );
}
