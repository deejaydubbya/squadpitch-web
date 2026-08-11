'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Loader2, Link as LinkIcon, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import {
  useListingUrlImport,
  useListingUrlConfirm,
  type CanonicalListing,
  type ListingValidation,
} from '@/hooks/useSquadpitch';
import { cn } from '@/lib/utils';
import { StatusBanner } from '@/components/common/StatusBanner';
import { PropertyPhotosField } from './PropertyPhotosField';
import {
  type PropertyPhoto,
  addPhoto,
  buildPhotoDataJson,
} from './propertyPhotos.helpers';

// Spinstr-sites-01 — Import a property by listing URL.
//
// Wraps the existing POST /workspaces/:id/listings/url (analyze)
// + /listings/url/confirm (save) endpoints. The user pastes a URL,
// reviews the extracted fields + photos (editable), and saves. The
// API's intake dedup collapses duplicates against existing PROPERTY
// rows; we surface that result so the user knows whether the save
// created a new property or merged into an existing one.

interface Props {
  clientId: string;
  onClose: () => void;
}

type Stage = 'enter_url' | 'review' | 'saving' | 'done';

type ReviewFields = {
  street: string;
  city: string;
  state: string;
  zip: string;
  price: string;
  status: string;
  beds: string;
  baths: string;
  sqft: string;
  propertyType: string;
  yearBuilt: string;
  listingUrl: string;
  description: string;
};

const STATUS_OPTIONS = ['active', 'pending', 'sold', 'coming_soon', 'off_market', 'draft'];

function listingToFields(listing: CanonicalListing): ReviewFields {
  return {
    street: listing.address.street ?? '',
    city: listing.address.city ?? '',
    state: listing.address.state ?? '',
    zip: listing.address.zip ?? '',
    price: listing.price != null ? String(listing.price) : '',
    status: listing.status || 'active',
    beds: listing.beds != null ? String(listing.beds) : '',
    baths: listing.baths != null ? String(listing.baths) : '',
    sqft: listing.sqft != null ? String(listing.sqft) : '',
    propertyType: listing.propertyType ?? '',
    yearBuilt: listing.yearBuilt != null ? String(listing.yearBuilt) : '',
    listingUrl: listing.listingUrl ?? '',
    description: listing.description ?? '',
  };
}

export function ImportPropertyUrlModal({ clientId, onClose }: Props) {
  const router = useRouter();
  const analyze = useListingUrlImport(clientId);
  const confirm = useListingUrlConfirm(clientId);

  const [stage, setStage] = useState<Stage>('enter_url');
  const [url, setUrl] = useState('');
  const [fields, setFields] = useState<ReviewFields | null>(null);
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [validation, setValidation] = useState<ListingValidation | null>(null);
  const [quality, setQuality] = useState<{ grade: string; missing: string[] } | null>(null);
  const [normalized, setNormalized] = useState<CanonicalListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // URL-04 — after save we capture the resolved dataItemId so the
  // "Create campaign from this listing" CTA can route directly to
  // the property campaign flow. Falls back to existingId for the
  // duplicate path so the CTA always points at the right row.
  const [savedDataItemId, setSavedDataItemId] = useState<string | null>(null);
  const [savedWasDuplicate, setSavedWasDuplicate] = useState(false);

  const setField = <K extends keyof ReviewFields>(k: K, v: ReviewFields[K]) =>
    setFields((prev) => (prev ? { ...prev, [k]: v } : prev));

  const handleAnalyze = async () => {
    setError(null);
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      setError('Listing URL must start with http(s)://');
      return;
    }
    try {
      const result = await analyze.mutateAsync({ url: trimmed });
      setNormalized(result.normalized);
      setFields(listingToFields(result.normalized));
      setValidation(result.preview.validation);
      setQuality(result.quality ? { grade: result.quality.grade, missing: result.quality.missing } : null);
      const importedPhotos: PropertyPhoto[] = result.normalized.images.map((u) => ({
        url: u,
        source: 'import' as const,
      }));
      // First imported photo wins primary by default.
      if (importedPhotos.length > 0) importedPhotos[0].isPrimary = true;
      setPhotos(importedPhotos);
      setStage('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not analyze that URL.');
    }
  };

  const handleSave = async () => {
    if (!fields || !normalized) return;
    setError(null);
    setInfo(null);
    setStage('saving');
    const photoFields = buildPhotoDataJson(photos);
    const payload = {
      ...normalized,
      title: undefined, // let the server build from address
      description: fields.description || normalized.description,
      price: fields.price ? Number(fields.price.replace(/[^\d.]/g, '')) || normalized.price : normalized.price,
      status: fields.status || normalized.status,
      address: {
        street: fields.street || normalized.address.street,
        city: fields.city || normalized.address.city,
        state: fields.state || normalized.address.state,
        zip: fields.zip || normalized.address.zip,
      },
      beds: fields.beds ? Number(fields.beds) || normalized.beds : normalized.beds,
      baths: fields.baths ? Number(fields.baths) || normalized.baths : normalized.baths,
      sqft: fields.sqft ? Number(fields.sqft) || normalized.sqft : normalized.sqft,
      propertyType: fields.propertyType || normalized.propertyType,
      yearBuilt: fields.yearBuilt ? Number(fields.yearBuilt) || normalized.yearBuilt : normalized.yearBuilt,
      listingUrl: fields.listingUrl || normalized.listingUrl,
      images: photoFields.images,
    };
    try {
      const result = await confirm.mutateAsync(payload as unknown as Record<string, unknown>);
      // URL-04 — normalize the dataItemId resolution across the
      // new / duplicate shapes. listing.id is the canonical id of
      // the saved row in both cases; existingId is the dedupe
      // hit's id (matches listing.id for the duplicate path per
      // listingIngestion.service.js but kept here for clarity).
      const dataItemId =
        result.listing?.id ?? result.existingId ?? null;
      setSavedDataItemId(dataItemId);
      const isDuplicate = !result.created && Boolean(result.existingId);
      setSavedWasDuplicate(isDuplicate);
      if (isDuplicate) {
        // URL-04 — friendlier wording that points the user at the
        // next action (start a campaign) instead of just narrating
        // what happened.
        setInfo(
          'This listing already exists. We updated it and you can create a campaign from the saved listing.',
        );
      } else {
        setInfo('Property added to your library.');
      }
      setStage('done');
      // URL-04 — no auto-close. The "Create campaign from this
      // listing" CTA needs to be reachable; auto-closing 1.6s
      // after save robbed the user of the next-step.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the property.');
      setStage('review');
    }
  };

  // URL-04 — route to the property campaign flow using the saved
  // dataItemId. Mirrors the deep-link shape every other entry
  // point uses (Planner, Dashboard, CRM, URL-01 confirm response).
  const handleCreateCampaign = () => {
    if (!savedDataItemId) return;
    onClose();
    router.push(
      `/workspaces/${clientId}/create?intent=campaign&sourceType=property&sourceId=${encodeURIComponent(savedDataItemId)}`,
    );
  };

  const pending = analyze.isPending || confirm.isPending;

  return (
    <div
      className="mobile-dialog-backdrop fixed inset-0 z-50 flex justify-center overflow-y-auto bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Import property from URL"
    >
      <div className="mobile-dialog-surface flex w-full max-w-2xl flex-col rounded-t-2xl border border-white-10 bg-sp-card shadow-2xl sm:rounded-2xl">
        <header className="flex items-center justify-between p-5 border-b border-white-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/15 flex items-center justify-center">
              <LinkIcon className="w-4 h-4 text-teal-300" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white-100">Import from URL</h2>
              <p className="text-xs text-white-40 mt-0.5">
                Paste a listing URL — Autopilot extracts the address, price, photos, and details.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-white-40 transition-colors hover:bg-white-10 hover:text-white-100"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <StatusBanner error={error} />}
          {info && <StatusBanner success message={info} />}

          {stage === 'enter_url' && (
            <section className="space-y-3">
              <label className="block">
                <span className="text-xs text-white-50 block mb-1">Listing URL</span>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.realtor.com/realestateandhomes-detail/…"
                  className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAnalyze();
                    }
                  }}
                />
                <span className="text-[10px] text-white-40 mt-1 block">
                  We&apos;ll pull what we can from the page — you can edit anything before saving.
                </span>
              </label>
            </section>
          )}

          {stage === 'review' && fields && (
            <section className="space-y-4">
              {quality && quality.grade !== 'good' && (
                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-xs text-yellow-300">
                  <p className="font-semibold mb-1">
                    Partial extraction ({quality.grade}). Fill in missing fields before saving.
                  </p>
                  {quality.missing.length > 0 && (
                    <p className="text-yellow-300/80">Missing: {quality.missing.join(', ')}</p>
                  )}
                </div>
              )}

              <Section title="Address">
                <Field label="Street Address" value={fields.street} onChange={(v) => setField('street', v)} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="City" value={fields.city} onChange={(v) => setField('city', v)} />
                  <Field label="State" value={fields.state} onChange={(v) => setField('state', v)} />
                </div>
                <Field label="ZIP" value={fields.zip} onChange={(v) => setField('zip', v)} />
              </Section>

              <Section title="Listing details">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Price" value={fields.price} onChange={(v) => setField('price', v)} />
                  <SelectField label="Status" value={fields.status} onChange={(v) => setField('status', v)} options={STATUS_OPTIONS} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Beds" value={fields.beds} onChange={(v) => setField('beds', v)} />
                  <Field label="Baths" value={fields.baths} onChange={(v) => setField('baths', v)} />
                  <Field label="Sq Ft" value={fields.sqft} onChange={(v) => setField('sqft', v)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Property Type" value={fields.propertyType} onChange={(v) => setField('propertyType', v)} />
                  <Field label="Year Built" value={fields.yearBuilt} onChange={(v) => setField('yearBuilt', v)} />
                </div>
                <Field label="Listing URL" value={fields.listingUrl} onChange={(v) => setField('listingUrl', v)} />
              </Section>

              <Section title="Property photos">
                <PropertyPhotosField clientId={clientId} photos={photos} onChange={setPhotos} />
              </Section>

              <Section title="Description">
                <textarea
                  value={fields.description}
                  onChange={(e) => setField('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
                />
              </Section>

              {validation && validation.issues.length > 0 && (
                <p className="text-[11px] text-white-50">{validation.issues.join(' · ')}</p>
              )}
            </section>
          )}

          {stage === 'done' && (
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="w-10 h-10 text-accent-green-110 mx-auto" />
              <p className="text-sm text-white-80">{info ?? 'Saved.'}</p>
              {savedDataItemId && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleCreateCampaign}
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold',
                      'bg-accent-green-110 text-black hover:bg-accent-green-110/90 transition-colors',
                    )}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Create campaign from this listing
                  </button>
                  <p className="text-[11px] text-white-40">
                    {savedWasDuplicate
                      ? 'Routes you to the existing listing in the campaign flow.'
                      : 'Routes you straight into the Create assistant with this property selected.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 p-5 border-t border-white-10">
          {stage === 'enter_url' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-lg text-sm text-white-60 hover:bg-white-10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={pending || url.trim().length === 0}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold',
                  'bg-accent-green-110 text-black hover:bg-accent-green-110/90',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                )}
              >
                {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                Analyze
              </button>
            </>
          )}
          {stage === 'review' && (
            <>
              <button
                type="button"
                onClick={() => setStage('enter_url')}
                className="px-3 py-2 rounded-lg text-sm text-white-60 hover:bg-white-10 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={pending}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold',
                  'bg-accent-green-110 text-black hover:bg-accent-green-110/90',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                )}
              >
                {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save property
              </button>
            </>
          )}
          {stage === 'done' && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg text-sm text-white-60 hover:bg-white-10 transition-colors"
            >
              Done
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-white-40">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-white-50 block mb-1">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-xs text-white-50 block mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
    </label>
  );
}
