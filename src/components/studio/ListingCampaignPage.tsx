'use client';

import { useState, useCallback } from 'react';
import {
  ArrowLeft,
  Link2,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Instagram,
  Facebook,
  Mail,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useListingUrlImport,
  useGenerateListingCampaign,
  type ListingCampaignOutput,
} from '@/hooks/useSquadpitch';

type Stage = 'entry' | 'form' | 'generating' | 'output';

interface PropertyForm {
  address: string;
  city: string;
  state: string;
  zip: string;
  price: string;
  beds: string;
  baths: string;
  sqft: string;
  propertyType: string;
  description: string;
  highlights: string;
  neighborhood: string;
  cta: string;
  agentName: string;
  brokerage: string;
}

const EMPTY_FORM: PropertyForm = {
  address: '',
  city: '',
  state: '',
  zip: '',
  price: '',
  beds: '',
  baths: '',
  sqft: '',
  propertyType: 'Single Family',
  description: '',
  highlights: '',
  neighborhood: '',
  cta: 'Schedule a showing today',
  agentName: '',
  brokerage: '',
};

const PROPERTY_TYPES = [
  'Single Family',
  'Condo',
  'Townhouse',
  'Multi-Family',
  'Land',
  'Commercial',
  'Other',
];

interface Props {
  clientId: string;
}

export function ListingCampaignPage({ clientId }: Props) {
  const [stage, setStage] = useState<Stage>('entry');
  const [form, setForm] = useState<PropertyForm>(EMPTY_FORM);
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [campaign, setCampaign] = useState<ListingCampaignOutput | null>(null);
  const [genError, setGenError] = useState('');

  const urlImport = useListingUrlImport(clientId);
  const generateCampaign = useGenerateListingCampaign(clientId);

  const handleUrlImport = useCallback(async () => {
    if (!url.trim()) return;
    setUrlError('');
    try {
      const result = await urlImport.mutateAsync({ url: url.trim() });
      const r = result as unknown as Record<string, unknown>;
      const d = r.preview ?? r;
      const data = d as Record<string, unknown>;
      setForm((prev) => ({
        ...prev,
        address: (data.address as string) || prev.address,
        price: data.price ? String(data.price) : prev.price,
        beds: data.beds ? String(data.beds) : prev.beds,
        baths: data.baths ? String(data.baths) : prev.baths,
        sqft: data.sqft ? String(data.sqft) : prev.sqft,
        description: (data.description as string) || prev.description,
        highlights: Array.isArray(data.highlights)
          ? (data.highlights as string[]).join(', ')
          : prev.highlights,
        propertyType: (data.propertyType as string) || prev.propertyType,
      }));
      setStage('form');
    } catch {
      setUrlError('Could not extract details from that URL. You can enter them manually.');
      setStage('form');
    }
  }, [url, urlImport]);

  const handleGenerate = useCallback(async () => {
    setGenError('');
    setStage('generating');

    const fullAddress = [form.address, form.city, form.state, form.zip]
      .filter(Boolean)
      .join(', ');

    try {
      const result = await generateCampaign.mutateAsync({
        address: fullAddress,
        price: form.price,
        beds: form.beds,
        baths: form.baths,
        sqft: form.sqft,
        propertyType: form.propertyType,
        description: form.description,
        highlights: form.highlights,
        neighborhood: form.neighborhood,
        cta: form.cta,
        agentName: form.agentName,
        brokerage: form.brokerage,
      });
      setCampaign(result.campaign);
      setStage('output');
    } catch {
      setGenError('Campaign generation failed. Please try again.');
      setStage('form');
    }
  }, [form, generateCampaign]);

  const resetWizard = () => {
    setStage('entry');
    setForm(EMPTY_FORM);
    setUrl('');
    setUrlError('');
    setCampaign(null);
    setGenError('');
  };

  const updateField = (field: keyof PropertyForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ── Entry Stage ──
  if (stage === 'entry') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold text-white-100 mb-2">Listing Campaign</h1>
        <p className="text-white-40 text-sm mb-8">
          Enter a property and generate a complete marketing campaign — Instagram, Facebook, listing description, and email — in one click.
        </p>

        <div className="bg-white-5 border border-white-10 rounded-2xl p-8">
          <label className="block text-sm font-medium text-white-60 mb-2">
            Import from URL
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white-30" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
                placeholder="Paste a Zillow, Realtor.com, or listing URL..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
              />
            </div>
            <button
              onClick={handleUrlImport}
              disabled={urlImport.isPending || !url.trim()}
              className="px-5 py-3 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {urlImport.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Import Details'
              )}
            </button>
          </div>
          {urlError && (
            <p className="text-orange-400 text-xs mt-2">{urlError}</p>
          )}

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 border-t border-white-10" />
            <span className="text-white-30 text-xs">or</span>
            <div className="flex-1 border-t border-white-10" />
          </div>

          <button
            onClick={() => setStage('form')}
            className="w-full py-3 rounded-xl bg-white-10 text-white-60 font-medium text-sm hover:bg-white-20 transition-colors"
          >
            Enter details manually
          </button>
        </div>
      </div>
    );
  }

  // ── Form Stage ──
  if (stage === 'form') {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <button
          onClick={() => setStage('entry')}
          className="flex items-center gap-1 text-white-40 text-sm hover:text-white-60 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h1 className="text-2xl font-bold text-white-100 mb-1">Property Details</h1>
        <p className="text-white-40 text-sm mb-8">
          Fill in the property info to generate your marketing campaign.
        </p>

        {genError && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {genError}
          </div>
        )}

        <div className="space-y-6">
          {/* Address section */}
          <div>
            <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Address</label>
            <input
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="123 Main Street"
              className="w-full px-4 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
            />
            <div className="grid grid-cols-3 gap-3 mt-2">
              <input
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="City"
                className="px-4 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
              />
              <input
                value={form.state}
                onChange={(e) => updateField('state', e.target.value)}
                placeholder="State"
                className="px-4 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
              />
              <input
                value={form.zip}
                onChange={(e) => updateField('zip', e.target.value)}
                placeholder="ZIP"
                className="px-4 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
              />
            </div>
          </div>

          {/* Specs row */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Price</label>
              <input
                value={form.price}
                onChange={(e) => updateField('price', e.target.value)}
                placeholder="450000"
                type="number"
                className="w-full px-4 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Beds</label>
              <input
                value={form.beds}
                onChange={(e) => updateField('beds', e.target.value)}
                placeholder="3"
                type="number"
                className="w-full px-4 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Baths</label>
              <input
                value={form.baths}
                onChange={(e) => updateField('baths', e.target.value)}
                placeholder="2"
                type="number"
                className="w-full px-4 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Sq Ft</label>
              <input
                value={form.sqft}
                onChange={(e) => updateField('sqft', e.target.value)}
                placeholder="1800"
                type="number"
                className="w-full px-4 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
              />
            </div>
          </div>

          {/* Property type */}
          <div>
            <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Property Type</label>
            <select
              value={form.propertyType}
              onChange={(e) => updateField('propertyType', e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Short Description</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              placeholder="Charming updated ranch with open floor plan..."
              className="w-full px-4 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30 resize-none"
            />
          </div>

          {/* Highlights */}
          <div>
            <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Notable Features / Highlights</label>
            <textarea
              value={form.highlights}
              onChange={(e) => updateField('highlights', e.target.value)}
              rows={2}
              placeholder="Pool, updated kitchen, corner lot, new roof..."
              className="w-full px-4 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30 resize-none"
            />
          </div>

          {/* Neighborhood */}
          <div>
            <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Neighborhood / Lifestyle Notes</label>
            <textarea
              value={form.neighborhood}
              onChange={(e) => updateField('neighborhood', e.target.value)}
              rows={2}
              placeholder="Walking distance to downtown, family-friendly, top-rated schools..."
              className="w-full px-4 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30 resize-none"
            />
          </div>

          {/* CTA */}
          <div>
            <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Call to Action</label>
            <input
              value={form.cta}
              onChange={(e) => updateField('cta', e.target.value)}
              placeholder="Schedule a showing today"
              className="w-full px-4 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
            />
          </div>

          {/* Agent info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Agent Name <span className="text-white-20">(optional)</span></label>
              <input
                value={form.agentName}
                onChange={(e) => updateField('agentName', e.target.value)}
                placeholder="Jane Smith"
                className="w-full px-4 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white-40 mb-1.5 uppercase tracking-wider">Brokerage <span className="text-white-20">(optional)</span></label>
              <input
                value={form.brokerage}
                onChange={(e) => updateField('brokerage', e.target.value)}
                placeholder="Smith Realty"
                className="w-full px-4 py-2.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
              />
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            className="w-full py-3.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors"
          >
            Generate Campaign
          </button>
        </div>
      </div>
    );
  }

  // ── Generating Stage ──
  if (stage === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-accent-green-110 mb-4" />
        <p className="text-white-60 text-sm animate-pulse">
          Creating your listing campaign...
        </p>
      </div>
    );
  }

  // ── Output Stage ──
  if (stage === 'output' && campaign) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white-100">Your Campaign</h1>
            <p className="text-white-40 text-sm mt-1">
              {form.address ? `${form.address}${form.city ? `, ${form.city}` : ''}` : 'Listing Campaign'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={generateCampaign.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white-10 text-white-60 font-semibold text-sm hover:bg-white-20 transition-colors"
            >
              <RefreshCw className={cn('w-4 h-4', generateCampaign.isPending && 'animate-spin')} />
              Regenerate All
            </button>
            <button
              onClick={resetWizard}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Another
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CampaignCard
            icon={Instagram}
            title="Instagram Caption"
            content={campaign.instagramCaption.body}
            hashtags={campaign.instagramCaption.hashtags}
            cta={campaign.instagramCaption.cta}
          />
          <CampaignCard
            icon={Facebook}
            title="Facebook Post"
            content={campaign.facebookPost.body}
            hashtags={campaign.facebookPost.hashtags}
            cta={campaign.facebookPost.cta}
          />
          <CampaignCard
            icon={FileText}
            title="Listing Description"
            content={campaign.listingDescription.body}
          />
          <CampaignCard
            icon={Mail}
            title="Email Promo"
            subject={campaign.emailPromo.subject}
            content={campaign.emailPromo.body}
            cta={campaign.emailPromo.cta}
          />
        </div>
      </div>
    );
  }

  return null;
}

// ── Campaign Card ──

function CampaignCard({
  icon: Icon,
  title,
  content,
  hashtags,
  cta,
  subject,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  content: string;
  hashtags?: string[];
  cta?: string;
  subject?: string;
}) {
  const [copied, setCopied] = useState(false);

  const fullText = [
    subject ? `Subject: ${subject}\n\n` : '',
    content,
    hashtags?.length ? `\n\n${hashtags.map((h) => `#${h}`).join(' ')}` : '',
    cta ? `\n\n${cta}` : '',
  ].join('');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white-5 border border-white-10 rounded-2xl p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-accent-green-110" />
          <span className="text-xs font-semibold text-white-60 uppercase tracking-wider">{title}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white-10 text-white-40 text-xs font-medium hover:bg-white-20 hover:text-white-60 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>

      {subject && (
        <p className="text-white-100 font-semibold text-sm mb-2">{subject}</p>
      )}

      <p className="text-white-80 text-sm leading-relaxed whitespace-pre-wrap flex-1">
        {content}
      </p>

      {hashtags && hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {hashtags.map((h) => (
            <span key={h} className="text-accent-green-110/70 text-xs">#{h}</span>
          ))}
        </div>
      )}

      {cta && (
        <p className="text-white-40 text-xs mt-3 pt-3 border-t border-white-10">
          {cta}
        </p>
      )}
    </div>
  );
}
