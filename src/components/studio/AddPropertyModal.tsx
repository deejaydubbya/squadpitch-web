'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, Home } from 'lucide-react';
import {
  useManualListingImport,
  useUpdateDataItem,
  type WorkspaceDataItem,
  type ManualListingInput,
} from '@/hooks/useSquadpitch';
import { cn } from '@/lib/utils';
import { StatusBanner } from '@/components/common/StatusBanner';

// Spinstr425 — Add/Edit Property form. POSTs to listings/manual on
// create (which runs intake dedup against existing PROPERTY rows) and
// PATCHes /business-data/:itemId on edit (preserves item id so
// Autopilot recommendation links stay stable).

interface Props {
  clientId: string;
  /** Pass an item to open in edit mode; omit / null for create. */
  editItem?: WorkspaceDataItem | null;
  onClose: () => void;
}

type FormState = {
  street: string;
  city: string;
  state: string;
  zip: string;
  price: string;
  status: string;
  bedrooms: string;
  bathrooms: string;
  sqft: string;
  propertyType: string;
  yearBuilt: string;
  listingUrl: string;
  externalListingId: string;
  imageUrl: string;
  description: string;
};

const STATUS_OPTIONS = ['active', 'pending', 'sold', 'coming_soon', 'off_market', 'draft'];

const EMPTY: FormState = {
  street: '',
  city: '',
  state: '',
  zip: '',
  price: '',
  status: 'active',
  bedrooms: '',
  bathrooms: '',
  sqft: '',
  propertyType: '',
  yearBuilt: '',
  listingUrl: '',
  externalListingId: '',
  imageUrl: '',
  description: '',
};

function prefillFromItem(item: WorkspaceDataItem): FormState {
  const d = (item.dataJson ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (v == null ? '' : String(v));
  const images = Array.isArray(d.images) ? (d.images as string[]) : [];
  return {
    street: str(d.street ?? d.address),
    city: str(d.city),
    state: str(d.state),
    zip: str(d.zip ?? d.zipCode ?? d.postalCode),
    price: str(d.price),
    status: str(d.status) || 'active',
    bedrooms: str(d.bedrooms ?? d.beds),
    bathrooms: str(d.bathrooms ?? d.baths),
    sqft: str(d.sqft ?? d.squareFeet),
    propertyType: str(d.propertyType),
    yearBuilt: str(d.yearBuilt),
    listingUrl: str(d.listingUrl),
    externalListingId: str(d.externalListingId ?? d.mlsId ?? d.sourceId),
    imageUrl: str(d.imageUrl ?? images[0] ?? ''),
    description: str(d.description),
  };
}

export function AddPropertyModal({ clientId, editItem, onClose }: Props) {
  const isEdit = Boolean(editItem);
  const create = useManualListingImport(clientId);
  const update = useUpdateDataItem(clientId);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    setForm(editItem ? prefillFromItem(editItem) : EMPTY);
    setError(null);
    setInfo(null);
  }, [editItem]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!form.street.trim() && !form.listingUrl.trim() && !form.externalListingId.trim()) {
      setError('Add at least a street address, a listing URL, or an MLS / external listing ID.');
      return;
    }

    if (isEdit && editItem) {
      try {
        await update.mutateAsync({
          id: editItem.id,
          dataJson: buildDataJson(form, editItem),
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save changes.');
      }
      return;
    }

    const payload: ManualListingInput = {
      street: form.street || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      zip: form.zip || undefined,
      price: form.price || undefined,
      status: form.status || undefined,
      beds: form.bedrooms || undefined,
      baths: form.bathrooms || undefined,
      sqft: form.sqft || undefined,
      propertyType: form.propertyType || undefined,
      yearBuilt: form.yearBuilt || undefined,
      listingUrl: form.listingUrl || undefined,
      imageUrl: form.imageUrl || undefined,
      description: form.description || undefined,
    };

    try {
      const result = await create.mutateAsync(payload);
      if (!result.created && result.existingId) {
        setInfo(
          'A property at this address (or with this MLS id / URL) already exists. Updated the existing record instead of creating a duplicate.',
        );
        // Close after a short pause so the user reads the note.
        setTimeout(() => onClose(), 1600);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the property.');
    }
  };

  const pending = create.isPending || update.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-sp-card border border-white-10 shadow-2xl flex flex-col max-h-[90vh]">
        <header className="flex items-center justify-between p-5 border-b border-white-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/15 flex items-center justify-center">
              <Home className="w-4 h-4 text-teal-300" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white-100">
                {isEdit ? 'Edit Property' : 'Add Property'}
              </h2>
              <p className="text-xs text-white-40 mt-0.5">
                {isEdit
                  ? 'Update this property record. Linked Autopilot recommendations stay attached.'
                  : 'Enter a property manually. Autopilot will surface it as soon as it matches a trigger.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-white-40 hover:text-white-100 hover:bg-white-10 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <StatusBanner error={error} />}
          {info && <StatusBanner success message={info} />}

          <Section title="Address">
            <Field label="Street Address" value={form.street} onChange={(v) => setField('street', v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" value={form.city} onChange={(v) => setField('city', v)} />
              <Field label="State" value={form.state} onChange={(v) => setField('state', v)} />
            </div>
            <Field label="ZIP" value={form.zip} onChange={(v) => setField('zip', v)} />
          </Section>

          <Section title="Listing details">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price" value={form.price} onChange={(v) => setField('price', v)} placeholder="425000" />
              <SelectField
                label="Status"
                value={form.status}
                onChange={(v) => setField('status', v)}
                options={STATUS_OPTIONS}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Beds" value={form.bedrooms} onChange={(v) => setField('bedrooms', v)} />
              <Field label="Baths" value={form.bathrooms} onChange={(v) => setField('bathrooms', v)} />
              <Field label="Sq Ft" value={form.sqft} onChange={(v) => setField('sqft', v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Property Type"
                value={form.propertyType}
                onChange={(v) => setField('propertyType', v)}
                placeholder="single_family"
              />
              <Field label="Year Built" value={form.yearBuilt} onChange={(v) => setField('yearBuilt', v)} />
            </div>
          </Section>

          <Section title="Sources & media">
            <Field
              label="Listing URL"
              value={form.listingUrl}
              onChange={(v) => setField('listingUrl', v)}
              placeholder="https://…"
            />
            <Field
              label="MLS / External Listing ID"
              value={form.externalListingId}
              onChange={(v) => setField('externalListingId', v)}
              placeholder="MLS-12345"
              helper="Used for intake dedup so re-imports don't create duplicates."
            />
            <Field
              label="Primary Image URL"
              value={form.imageUrl}
              onChange={(v) => setField('imageUrl', v)}
              placeholder="https://cdn/photo.jpg"
              helper="Photo upload is on the roadmap — paste a URL for now."
            />
          </Section>

          <Section title="Description">
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
              placeholder="A short description of the property…"
            />
          </Section>
        </form>

        <footer className="flex items-center justify-end gap-2 p-5 border-t border-white-10">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-sm text-white-60 hover:bg-white-10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={pending}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold',
              'bg-accent-green-110 text-black hover:bg-accent-green-110/90',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? 'Save changes' : 'Add property'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function buildDataJson(form: FormState, existing: WorkspaceDataItem): Record<string, unknown> {
  // Edit path: merge over the existing dataJson so we never clobber
  // server-managed fields like _events / _priceHistory / _statusHistory.
  const existingData = (existing.dataJson ?? {}) as Record<string, unknown>;
  const num = (v: string): number | string | undefined => {
    if (v.trim() === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
  };
  const dollars = (v: string): number | undefined => {
    if (v.trim() === '') return undefined;
    const cleaned = v.replace(/[^\d.]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : undefined;
  };
  const merged: Record<string, unknown> = {
    ...existingData,
    street: form.street.trim() || existingData.street,
    city: form.city.trim() || existingData.city,
    state: form.state.trim() || existingData.state,
    zip: form.zip.trim() || existingData.zip,
    price: dollars(form.price) ?? existingData.price,
    status: form.status || existingData.status,
    bedrooms: num(form.bedrooms) ?? existingData.bedrooms,
    bathrooms: num(form.bathrooms) ?? existingData.bathrooms,
    sqft: num(form.sqft) ?? existingData.sqft,
    propertyType: form.propertyType.trim() || existingData.propertyType,
    yearBuilt: num(form.yearBuilt) ?? existingData.yearBuilt,
    listingUrl: form.listingUrl.trim() || existingData.listingUrl,
    externalListingId: form.externalListingId.trim() || existingData.externalListingId,
    imageUrl: form.imageUrl.trim() || existingData.imageUrl,
    description: form.description.trim() || existingData.description,
  };
  return merged;
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
  placeholder,
  helper,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  helper?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-white-50 block mb-1">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
      />
      {helper && <span className="text-[10px] text-white-40 mt-1 block">{helper}</span>}
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
