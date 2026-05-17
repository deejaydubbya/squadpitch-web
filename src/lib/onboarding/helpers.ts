import type {
  CrawlPage,
  CrawlPageError,
  StreamCallbacks,
} from './types';
import type {
  OnboardingAnalyzeResult,
  OnboardingBrandData,
  OnboardingDataItem,
} from '@/hooks/useSquadpitch';
import type {
  AgentProfileDraft,
  Channel,
} from '@/hooks/useSquadpitch';
import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Car,
  Building2,
  ShoppingBag,
  Landmark,
  Shield,
  Scale,
  TrendingUp,
  Wrench,
  Dumbbell,
  UtensilsCrossed,
  Scissors,
  Mic,
  Store,
  Briefcase,
  Stethoscope,
  PartyPopper,
} from 'lucide-react';

// ── Utilities ────────────────────────────────────────────────────────────

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

export function isUrl(value: string): boolean {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.[a-z]{2,}/i.test(trimmed) && !trimmed.includes(' ')) return true;
  return false;
}

export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// ── Industry icon map ────────────────────────────────────────────────────

export const INDUSTRY_ICON_MAP: Record<string, LucideIcon> = {
  Home,
  Car,
  Building2,
  ShoppingBag,
  Landmark,
  Shield,
  Scale,
  TrendingUp,
  Wrench,
  Dumbbell,
  UtensilsCrossed,
  Scissors,
  Mic,
  Store,
  Briefcase,
  Stethoscope,
  PartyPopper,
};

// ── SSE stream consumer ─────────────────────────────────────────────────

export async function consumeAnalyzeStream(
  body: {
    input: string;
    inputType: string;
    documentTexts?: string[];
    industryKey?: string;
    agentProfileDraft?: AgentProfileDraft;
  },
  callbacks: StreamCallbacks,
): Promise<OnboardingAnalyzeResult | null> {
  const res = await fetch('/api/proxy/onboarding/analyze-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    callbacks.onError('Failed to connect to analysis service.');
    return null;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: OnboardingAnalyzeResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        switch (data.event) {
          case 'crawl:start':
            callbacks.onCrawlStart(data.url || null);
            break;
          case 'crawl:discovered':
            callbacks.onCrawlDiscovered(data.totalExpected || 0);
            break;
          case 'crawl:page':
            callbacks.onCrawlPage(data as CrawlPage);
            break;
          case 'crawl:page:error':
            callbacks.onCrawlPageError(data as CrawlPageError);
            break;
          case 'crawl:done':
            callbacks.onCrawlDone();
            break;
          case 'images:found':
            callbacks.onImagesFound(data.count || 0);
            break;
          case 'extract:start':
            callbacks.onExtractStart();
            break;
          case 'brand:done':
            callbacks.onBrandDone({ ...data.brandData, logoUrl: data.logoUrl || undefined });
            break;
          case 'data:progress':
            callbacks.onDataProgress(data.items || [], data.count || 0);
            break;
          case 'data:done':
            callbacks.onDataDone(data.items || [], data.count || 0);
            break;
          case 'done':
            finalResult = data as OnboardingAnalyzeResult;
            console.log('[analyzeStream] done event - dataItems:', finalResult.dataItems?.length ?? 0, 'images:', finalResult.images?.length ?? 0);
            break;
          case 'error':
            callbacks.onError(data.message || 'Analysis failed.', data.code);
            break;
        }
      } catch {
        // skip malformed event
      }
    }
  }

  return finalResult;
}

// ── Profile save ─────────────────────────────────────────────────────────

async function checkedFetch(url: string, init: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message || `Request failed (${res.status})`);
  }
  return res;
}

export async function saveProfiles(
  clientId: string,
  result: OnboardingAnalyzeResult,
  mergedDraft?: AgentProfileDraft | null,
): Promise<void> {
  // Brand profile
  await checkedFetch(`/api/proxy/workspaces/${clientId}/brand`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: result.brandData.description,
      industry: result.brandData.industry,
      audience: result.brandData.audience,
      website: result.brandData.website || null,
      offers: result.brandData.offers,
      competitors: result.brandData.competitors,
      city: mergedDraft?.primaryCity || null,
      state: mergedDraft?.primaryState || null,
      marketArea: mergedDraft?.serviceAreas?.[0] || mergedDraft?.primaryCity || null,
      serviceAreas: mergedDraft?.serviceAreas || null,
    }),
  });

  // Voice profile
  await checkedFetch(`/api/proxy/workspaces/${clientId}/voice`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tone: result.voiceData.tone,
      voiceRulesJson: {
        do: result.voiceData.doRules,
        dont: result.voiceData.dontRules,
      },
      bannedPhrases: [],
      contentBuckets: result.voiceData.contentBuckets,
    }),
  });

  // Media profile
  await checkedFetch(`/api/proxy/workspaces/${clientId}/media`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'BRAND_ASSETS_PLUS_AI' }),
  });

  // Channel settings
  const channels = result.suggestedChannels.length > 0
    ? result.suggestedChannels
    : ['INSTAGRAM' as Channel];
  await checkedFetch(`/api/proxy/workspaces/${clientId}/channels`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: channels.map((ch: Channel) => ({ channel: ch, isEnabled: true })),
    }),
  });
}

// ── Merge drafts ─────────────────────────────────────────────────────────

export function mergeDrafts(drafts: AgentProfileDraft[]): AgentProfileDraft {
  if (drafts.length === 0) return { sourceType: 'manual' };
  if (drafts.length === 1) return { ...drafts[0] };

  const merged: AgentProfileDraft = { sourceType: 'manual' };
  const priority = ['manual', 'license_lookup', 'zillow_profile', 'website', 'crm_import', 'documents'];
  const sorted = [...drafts].sort((a, b) => {
    const ai = priority.indexOf(a.sourceType);
    const bi = priority.indexOf(b.sourceType);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // String fields — take first non-empty value
  const stringFields = [
    'agentName', 'brokerageName', 'teamName', 'bio',
    'primaryCity', 'primaryState', 'licenseNumber', 'licenseState',
    'licenseStatus', 'websiteUrl', 'zillowProfileUrl',
  ] as const;

  for (const field of stringFields) {
    for (const draft of sorted) {
      const val = draft[field];
      if (val && String(val).trim()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (merged as any)[field] = val;
        break;
      }
    }
  }

  // Array fields — merge and deduplicate
  const arrayFields = [
    'specialties', 'serviceAreas', 'inferredAudience', 'inferredPriceBands', 'notes',
  ] as const;

  for (const field of arrayFields) {
    const all: string[] = [];
    for (const draft of sorted) {
      const arr = draft[field];
      if (Array.isArray(arr)) all.push(...arr);
    }
    if (all.length > 0) {
      const seen = new Set<string>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (merged as any)[field] = all.filter((v) => {
        const key = v.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
  }

  // Merge example listings
  const listings = sorted.flatMap((d) => d.exampleListings ?? []);
  if (listings.length > 0) merged.exampleListings = listings;

  // Merge social links
  const socialLinks: Record<string, string> = {};
  for (const draft of sorted) {
    if (draft.socialLinks) {
      for (const [k, v] of Object.entries(draft.socialLinks)) {
        if (v && !socialLinks[k]) socialLinks[k] = v;
      }
    }
  }
  if (Object.keys(socialLinks).length > 0) {
    merged.socialLinks = socialLinks as AgentProfileDraft['socialLinks'];
  }

  return merged;
}
