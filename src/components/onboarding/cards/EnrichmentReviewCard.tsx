'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, Loader2, Building2, FileSpreadsheet, Globe, FileText } from 'lucide-react';
import type { useOnboardingEngine } from '@/hooks/useOnboardingEngine';
import type { PendingEnrichment } from '@/lib/onboarding/types';

type Engine = ReturnType<typeof useOnboardingEngine>;

interface Props {
  engine: Engine;
}

export function EnrichmentReviewCard({ engine }: Props) {
  const pending = engine.session.pendingEnrichment;
  const [busy, setBusy] = useState(false);

  if (!pending) return null;

  const handleAccept = async () => {
    setBusy(true);
    await engine.acceptEnrichment();
    setBusy(false);
  };

  const handleReject = () => {
    engine.rejectEnrichment();
  };

  return (
    <div className="flex flex-col gap-3">
      <ReviewContent pending={pending} />

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleAccept}
          disabled={busy}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            busy
              ? 'bg-accent-green-110/50 text-white cursor-wait'
              : 'bg-accent-green-110 text-white hover:bg-accent-green-120 cursor-pointer',
          )}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Accept
        </button>
        <button
          onClick={handleReject}
          disabled={busy}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            'bg-white-5 text-white-60 hover:bg-white-10 hover:text-white-80 cursor-pointer',
            busy && 'opacity-50 cursor-not-allowed',
          )}
        >
          <X className="w-4 h-4" />
          Discard
        </button>
      </div>
    </div>
  );
}

// ── Type-specific review content ──────────────────────────────────────────

function ReviewContent({ pending }: { pending: PendingEnrichment }) {
  switch (pending.type) {
    case 'license':
      return <LicenseReview pending={pending} />;
    case 'crm':
      return <CrmReview pending={pending} />;
    case 'urls':
    case 'description':
      return <UrlsDescriptionReview pending={pending} />;
    default:
      return null;
  }
}

function LicenseReview({ pending }: { pending: Extract<PendingEnrichment, { type: 'license' }> }) {
  const s = pending.source;
  const fields: [string, string | undefined][] = [
    ['Agent Name', s.agentName],
    ['Brokerage', s.brokerageName],
    ['License #', s.licenseNumber],
    ['Specialties', s.specialties?.join(', ')],
    ['Service Areas', s.serviceAreas?.join(', ')],
  ];

  const hasData = fields.some(([, v]) => v);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm text-white-60">
        <Building2 className="w-4 h-4 text-accent-green-110" />
        <span className="font-medium text-white-80">License Lookup</span>
      </div>
      {hasData ? (
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {fields.map(([label, value]) =>
            value ? (
              <KeyValue key={label} label={label} value={value} />
            ) : null,
          )}
        </div>
      ) : (
        <p className="text-sm text-white-40">No profile data found.</p>
      )}
    </div>
  );
}

function CrmReview({ pending }: { pending: Extract<PendingEnrichment, { type: 'crm' }> }) {
  const s = pending.source;
  const profileFields: [string, string | undefined][] = [
    ['Service Areas', s.serviceAreas?.join(', ')],
    ['Specialties', s.specialties?.join(', ')],
    ['City', s.primaryCity],
  ];
  const hasProfile = profileFields.some(([, v]) => v);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm text-white-60">
        <FileSpreadsheet className="w-4 h-4 text-accent-green-110" />
        <span className="font-medium text-white-80">CRM Import</span>
      </div>
      {hasProfile && (
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {profileFields.map(([label, value]) =>
            value ? <KeyValue key={label} label={label} value={value} /> : null,
          )}
        </div>
      )}
      {pending.importedCount > 0 && (
        <p className="text-sm text-white-60">
          <span className="text-accent-green-110 font-medium">{pending.importedCount}</span>{' '}
          listing{pending.importedCount !== 1 ? 's' : ''} ready to import
        </p>
      )}
      {!hasProfile && pending.importedCount === 0 && (
        <p className="text-sm text-white-40">No data extracted from CSV.</p>
      )}
    </div>
  );
}

function UrlsDescriptionReview({
  pending,
}: {
  pending: Extract<PendingEnrichment, { type: 'urls' | 'description' }>;
}) {
  const r = pending.analyzeResult;
  const brand = r.brandData;
  const Icon = pending.type === 'urls' ? Globe : FileText;
  const label = pending.type === 'urls' ? 'URL Analysis' : 'Description Analysis';

  const brandFields: [string, string | undefined][] = [
    ['Name', brand.name],
    ['Description', brand.description],
    ['Audience', brand.audience],
    ['Services', brand.offers],
  ];
  const hasBrand = brandFields.some(([, v]) => v);
  const dataItems = r.dataItems ?? [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm text-white-60">
        <Icon className="w-4 h-4 text-accent-green-110" />
        <span className="font-medium text-white-80">{label}</span>
      </div>
      {hasBrand && (
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {brandFields.map(([l, v]) =>
            v ? <KeyValue key={l} label={l} value={v} /> : null,
          )}
        </div>
      )}
      {dataItems.length > 0 && (
        <div className="flex flex-col gap-1 mt-1">
          <p className="text-xs text-white-40 uppercase tracking-wide">
            {dataItems.length} listing{dataItems.length !== 1 ? 's' : ''} found
          </p>
          <ul className="text-sm text-white-60 list-disc list-inside">
            {dataItems.slice(0, 5).map((item, i) => (
              <li key={i} className="truncate">{item.title}</li>
            ))}
            {dataItems.length > 5 && (
              <li className="text-white-30">+{dataItems.length - 5} more</li>
            )}
          </ul>
        </div>
      )}
      {!hasBrand && dataItems.length === 0 && (
        <p className="text-sm text-white-40">No data extracted.</p>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-white-40 whitespace-nowrap">{label}</span>
      <span className="text-white-80 truncate">{value}</span>
    </>
  );
}
