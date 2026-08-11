'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { REListingFormData } from '@/lib/onboarding/configs/realEstate';
import { Check, Loader2 } from 'lucide-react';

const PROPERTY_TYPES = [
  'Single Family',
  'Condo',
  'Townhouse',
  'Multi-Family',
  'Land',
  'Commercial',
];

interface Props {
  onSubmit: (data: REListingFormData) => void;
  isSubmitting: boolean;
}

const inputCn = cn(
  'w-full min-h-11 px-3 py-2 rounded-lg text-base sm:text-sm',
  'bg-white-5 border border-white-10 text-white-90',
  'placeholder:text-white-30 focus:border-accent-green-110/50 focus:outline-none',
);

const textareaCn = cn(
  'w-full min-h-11 px-3 py-2 rounded-lg text-base sm:text-sm resize-y sm:resize-none',
  'bg-white-5 border border-white-10 text-white-90',
  'placeholder:text-white-30 focus:border-accent-green-110/50 focus:outline-none',
);

const selectCn = cn(
  'w-full min-h-11 px-2 py-2 rounded-lg text-base sm:text-sm appearance-none',
  'bg-white-5 border border-white-10 text-white-90',
  'focus:border-accent-green-110/50 focus:outline-none',
  '[&>option]:bg-sp-bg [&>option]:text-white-90',
);

export function REListingFormCard({ onSubmit, isSubmitting }: Props) {
  const [data, setData] = useState<REListingFormData>({});

  const update = (key: keyof REListingFormData, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const hasEnough = !!(data.address || data.description) && !!(data.city || data.price);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Property Basics ─────────────────────────────────────── */}
      <Section title="Property basics">
        <div>
          <Label>Address</Label>
          <input
            type="text"
            value={data.address ?? ''}
            onChange={(e) => update('address', e.target.value)}
            placeholder="123 Main St"
            className={inputCn}
          />
        </div>

        <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-3">
          <div>
            <Label>City</Label>
            <input
              type="text"
              value={data.city ?? ''}
              onChange={(e) => update('city', e.target.value)}
              placeholder="Springfield"
              className={inputCn}
            />
          </div>
          <div>
            <Label>State</Label>
            <input
              type="text"
              value={data.state ?? ''}
              onChange={(e) => update('state', e.target.value)}
              placeholder="CA"
              maxLength={2}
              className={inputCn}
            />
          </div>
          <div>
            <Label>Zip code</Label>
            <input
              type="text"
              value={data.zip ?? ''}
              onChange={(e) => update('zip', e.target.value)}
              placeholder="90210"
              maxLength={10}
              className={inputCn}
            />
          </div>
        </div>

        <div>
          <Label>Property type</Label>
          <select
            value={data.propertyType ?? ''}
            onChange={(e) => update('propertyType', e.target.value)}
            className={selectCn}
          >
            <option value="" className="bg-sp-bg text-white-40">Select</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t} className="bg-sp-bg text-white-90">{t}</option>
            ))}
          </select>
        </div>
      </Section>

      {/* ── Listing Facts ───────────────────────────────────────── */}
      <Section title="Listing facts">
        <div className="grid grid-cols-1 gap-2 min-[375px]:grid-cols-2">
          <div>
            <Label>Price</Label>
            <input
              type="text"
              value={data.price ?? ''}
              onChange={(e) => update('price', e.target.value)}
              placeholder="$450,000"
              className={inputCn}
            />
          </div>
          <div>
            <Label>Sqft</Label>
            <input
              type="text"
              value={data.sqft ?? ''}
              onChange={(e) => update('sqft', e.target.value)}
              placeholder="1,800"
              className={inputCn}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div>
            <Label>Beds</Label>
            <input
              type="text"
              value={data.beds ?? ''}
              onChange={(e) => update('beds', e.target.value)}
              placeholder="3"
              className={inputCn}
            />
          </div>
          <div>
            <Label>Baths</Label>
            <input
              type="text"
              value={data.baths ?? ''}
              onChange={(e) => update('baths', e.target.value)}
              placeholder="2"
              className={inputCn}
            />
          </div>
          <div>
            <Label>Lot size</Label>
            <input
              type="text"
              value={data.lotSize ?? ''}
              onChange={(e) => update('lotSize', e.target.value)}
              placeholder="0.25 acres"
              className={inputCn}
            />
          </div>
          <div>
            <Label>Year built</Label>
            <input
              type="text"
              value={data.yearBuilt ?? ''}
              onChange={(e) => update('yearBuilt', e.target.value)}
              placeholder="2005"
              maxLength={4}
              className={inputCn}
            />
          </div>
        </div>
      </Section>

      {/* ── Marketing Details ───────────────────────────────────── */}
      <Section title="Marketing details">
        <div>
          <Label>Description</Label>
          <textarea
            value={data.description ?? ''}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Describe the property — upgrades, views, layout..."
            rows={3}
            className={textareaCn}
          />
        </div>

        <div>
          <Label>Key features / highlights</Label>
          <textarea
            value={data.features ?? ''}
            onChange={(e) => update('features', e.target.value)}
            placeholder="e.g. Gourmet kitchen, pool, solar panels, corner lot..."
            rows={2}
            className={textareaCn}
          />
        </div>

        <div>
          <Label>Neighborhood / location notes</Label>
          <textarea
            value={data.neighborhood ?? ''}
            onChange={(e) => update('neighborhood', e.target.value)}
            placeholder="Nearby schools, parks, restaurants, commute details..."
            rows={2}
            className={textareaCn}
          />
        </div>

        <div>
          <Label>Showing instructions / call to action</Label>
          <input
            type="text"
            value={data.showingInstructions ?? ''}
            onChange={(e) => update('showingInstructions', e.target.value)}
            placeholder="e.g. Open house Saturday 1–3 PM, Call for a private showing"
            className={inputCn}
          />
        </div>
      </Section>

      <button
        onClick={() => onSubmit(data)}
        disabled={!hasEnough || isSubmitting}
        className={cn(
          'sticky bottom-0 z-10 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all sm:static sm:self-end sm:w-auto',
          hasEnough && !isSubmitting
            ? 'bg-accent-green-110 text-white hover:bg-accent-green-120 cursor-pointer'
            : 'bg-white-10 text-white-30 cursor-not-allowed',
        )}
      >
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Create content
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h4 className="text-xs font-medium text-white-50 uppercase tracking-wider">{title}</h4>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] text-white-40 mb-1 block">{children}</label>;
}
