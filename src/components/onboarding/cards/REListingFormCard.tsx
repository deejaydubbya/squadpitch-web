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

export function REListingFormCard({ onSubmit, isSubmitting }: Props) {
  const [data, setData] = useState<REListingFormData>({});

  const update = (key: keyof REListingFormData, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const hasEnough = !!(data.address || data.description) && !!(data.city || data.price);

  return (
    <div className="flex flex-col gap-3">
      {/* Address */}
      <div>
        <label className="text-[11px] text-white-40 mb-1 block">Address</label>
        <input
          type="text"
          value={data.address ?? ''}
          onChange={(e) => update('address', e.target.value)}
          placeholder="123 Main St"
          className={cn(
            'w-full px-3 py-2 rounded-lg text-sm',
            'bg-white-5 border border-white-10 text-white-90',
            'placeholder:text-white-30 focus:border-accent-green-110/50 focus:outline-none',
          )}
        />
      </div>

      {/* City / State row */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-white-40 mb-1 block">City</label>
          <input
            type="text"
            value={data.city ?? ''}
            onChange={(e) => update('city', e.target.value)}
            placeholder="Springfield"
            className={cn(
              'w-full px-3 py-2 rounded-lg text-sm',
              'bg-white-5 border border-white-10 text-white-90',
              'placeholder:text-white-30 focus:border-accent-green-110/50 focus:outline-none',
            )}
          />
        </div>
        <div>
          <label className="text-[11px] text-white-40 mb-1 block">State</label>
          <input
            type="text"
            value={data.state ?? ''}
            onChange={(e) => update('state', e.target.value)}
            placeholder="CA"
            maxLength={2}
            className={cn(
              'w-full px-3 py-2 rounded-lg text-sm',
              'bg-white-5 border border-white-10 text-white-90',
              'placeholder:text-white-30 focus:border-accent-green-110/50 focus:outline-none',
            )}
          />
        </div>
      </div>

      {/* Price / Property Type row */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-white-40 mb-1 block">Price</label>
          <input
            type="text"
            value={data.price ?? ''}
            onChange={(e) => update('price', e.target.value)}
            placeholder="$450,000"
            className={cn(
              'w-full px-3 py-2 rounded-lg text-sm',
              'bg-white-5 border border-white-10 text-white-90',
              'placeholder:text-white-30 focus:border-accent-green-110/50 focus:outline-none',
            )}
          />
        </div>
        <div>
          <label className="text-[11px] text-white-40 mb-1 block">Property type</label>
          <select
            value={data.propertyType ?? ''}
            onChange={(e) => update('propertyType', e.target.value)}
            className={cn(
              'w-full px-2 py-2 rounded-lg text-sm',
              'bg-white-5 border border-white-10 text-white-90',
              'focus:border-accent-green-110/50 focus:outline-none',
            )}
          >
            <option value="">Select</option>
            {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Beds / Baths / Sqft row */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[11px] text-white-40 mb-1 block">Beds</label>
          <input
            type="text"
            value={data.beds ?? ''}
            onChange={(e) => update('beds', e.target.value)}
            placeholder="3"
            className={cn(
              'w-full px-3 py-2 rounded-lg text-sm',
              'bg-white-5 border border-white-10 text-white-90',
              'placeholder:text-white-30 focus:border-accent-green-110/50 focus:outline-none',
            )}
          />
        </div>
        <div>
          <label className="text-[11px] text-white-40 mb-1 block">Baths</label>
          <input
            type="text"
            value={data.baths ?? ''}
            onChange={(e) => update('baths', e.target.value)}
            placeholder="2"
            className={cn(
              'w-full px-3 py-2 rounded-lg text-sm',
              'bg-white-5 border border-white-10 text-white-90',
              'placeholder:text-white-30 focus:border-accent-green-110/50 focus:outline-none',
            )}
          />
        </div>
        <div>
          <label className="text-[11px] text-white-40 mb-1 block">Sqft</label>
          <input
            type="text"
            value={data.sqft ?? ''}
            onChange={(e) => update('sqft', e.target.value)}
            placeholder="1,800"
            className={cn(
              'w-full px-3 py-2 rounded-lg text-sm',
              'bg-white-5 border border-white-10 text-white-90',
              'placeholder:text-white-30 focus:border-accent-green-110/50 focus:outline-none',
            )}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-[11px] text-white-40 mb-1 block">Description / features</label>
        <textarea
          value={data.description ?? ''}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Highlight key features, upgrades, views..."
          rows={3}
          className={cn(
            'w-full px-3 py-2 rounded-lg text-sm resize-none',
            'bg-white-5 border border-white-10 text-white-90',
            'placeholder:text-white-30 focus:border-accent-green-110/50 focus:outline-none',
          )}
        />
      </div>

      <button
        onClick={() => onSubmit(data)}
        disabled={!hasEnough || isSubmitting}
        className={cn(
          'self-end flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
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
