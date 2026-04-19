'use client';

import { useEffect, useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import {
  useBrandProfile,
  useUpsertBrandProfile,
  type UpsertBrandProfileInput,
} from '@/hooks/useSquadpitch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';

interface Props {
  clientId: string;
}

interface FormState {
  description: string;
  industry: string;
  audience: string;
  website: string;
  offers: string;
  competitors: string;
}

const EMPTY: FormState = {
  description: '',
  industry: '',
  audience: '',
  website: '',
  offers: '',
  competitors: '',
};

export function BrandProfileForm({ clientId }: Props) {
  const { data: brand, isLoading } = useBrandProfile(clientId);
  const upsert = useUpsertBrandProfile(clientId);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (brand) {
      setForm({
        description: brand.description ?? '',
        industry: brand.industry ?? '',
        audience: brand.audience ?? '',
        website: brand.website ?? '',
        offers: brand.offers ?? '',
        competitors: brand.competitors ?? '',
      });
    }
  }, [brand]);

  const handleSubmit = () => {
    const payload: UpsertBrandProfileInput = {
      description: form.description.trim() || null,
      industry: form.industry.trim() || null,
      audience: form.audience.trim() || null,
      website: form.website.trim() || null,
      offers: form.offers.trim() || null,
      competitors: form.competitors.trim() || null,
    };
    upsert.mutate(payload, {
      onSuccess: () => setSavedAt(Date.now()),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6">
        <LoadingSpinner size="sm" />
        <span className="text-white-40 text-sm">Loading brand profile…</span>
      </div>
    );
  }

  const showSaved = savedAt && Date.now() - savedAt < 3000;

  return (
    <div className="card p-5 space-y-5 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-white-100">Brand & Audience</h2>
        <p className="text-sm text-white-40 mt-0.5">
          This is the core info about your brand. It shapes every post
          Squadpitch creates.
        </p>
        <p className="text-xs text-white-30 mt-2">
          This information grounds every AI-generated post. The more specific you are, the better the output.
        </p>
      </div>

      <Field
        label="Description"
        hint="What does this brand do? Keep it short and vivid."
      >
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="e.g. Acme Fitness is a boutique studio for runners…"
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none"
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Industry">
          <input
            type="text"
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
            placeholder="Fitness, SaaS, Hospitality…"
            className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
          />
        </Field>
        <Field label="Website">
          <input
            type="text"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="https://…"
            className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 font-mono"
          />
        </Field>
      </div>

      <Field label="Audience" hint="Who are they talking to?">
        <textarea
          value={form.audience}
          onChange={(e) => setForm({ ...form, audience: e.target.value })}
          placeholder="e.g. Hobby runners aged 25-45 training for their first marathon."
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none"
        />
      </Field>

      <Field
        label="Offers"
        hint="Products, services, or programs to feature."
      >
        <textarea
          value={form.offers}
          onChange={(e) => setForm({ ...form, offers: e.target.value })}
          placeholder="Group coaching, 1:1 plans, Strength add-on…"
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none"
        />
      </Field>

      <Field
        label="Competitors"
        hint="Helps the model understand positioning and differentiation."
      >
        <textarea
          value={form.competitors}
          onChange={(e) => setForm({ ...form, competitors: e.target.value })}
          placeholder="e.g. Peloton, Nike Run Club…"
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 resize-none"
        />
      </Field>

      {upsert.error && (
        <StatusBanner error={(upsert.error as Error).message} />
      )}
      {showSaved && <StatusBanner success message="Saved" />}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={upsert.isPending}
          className="btn btn-primary text-xs flex items-center gap-1"
        >
          {upsert.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          Save brand profile
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-white-40 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-white-40 mt-1">{hint}</p>}
    </div>
  );
}
