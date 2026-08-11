'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight, Link2, FileText, ChevronDown, Loader2 } from 'lucide-react';

// ── URL classification heuristics ────────────────────────────────────────

const RE_LISTING_DOMAINS = [
  'zillow.com', 'realtor.com', 'redfin.com', 'trulia.com',
  'homes.com', 'homesnap.com', 'coldwellbanker.com',
  'century21.com', 'compass.com', 'sothebysrealty.com',
  'kw.com', 'bhhs.com', 'remax.com', 'cbhomes.com',
];

const RE_FEED_PATTERNS = [
  /idx/i, /\/listings\b/i, /\/properties\b/i,
  /\/search\b/i, /\/results\b/i, /feed/i,
];

const RE_LISTING_PATHS = [
  /\/homedetails\//i, /\/property\//i, /\/listing\//i,
  /\/home\//i, /\/address\//i, /\/detail\//i,
  /\/mls[-_]?/i,
];

export type QuickStartClassification =
  | { type: 'listing_url'; url: string }
  | { type: 'feed_url'; url: string }
  | { type: 'website_url'; url: string }
  | { type: 'text'; text: string };

export function classifyQuickStartInput(raw: string): QuickStartClassification {
  const trimmed = raw.trim();

  // Check if it looks like a URL
  const urlMatch = /^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed);
  if (!urlMatch) {
    // Could still be a bare domain — check for domain patterns
    const maybeDomain = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.[a-z]{2,}/i.test(trimmed);
    if (!maybeDomain) {
      return { type: 'text', text: trimmed };
    }
  }

  // Normalize to full URL
  let url = trimmed;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { type: 'text', text: trimmed };
  }

  const hostname = parsed.hostname.replace(/^www\./, '');
  const fullPath = parsed.pathname + parsed.search;

  // Check for known real estate listing domains
  const isREDomain = RE_LISTING_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`));

  if (isREDomain) {
    // Check if it's a single listing page vs a feed/search
    const isFeed = RE_FEED_PATTERNS.some((p) => p.test(fullPath));
    const isSingleListing = RE_LISTING_PATHS.some((p) => p.test(fullPath));

    if (isSingleListing && !isFeed) {
      return { type: 'listing_url', url };
    }
    if (isFeed) {
      return { type: 'feed_url', url };
    }
    // Known RE domain but unclear path — assume listing
    return { type: 'listing_url', url };
  }

  // Check for MLS-like patterns in the URL
  if (/mls/i.test(hostname) || /mls/i.test(fullPath)) {
    return { type: 'listing_url', url };
  }

  // Generic URL — business website
  return { type: 'website_url', url };
}

// ── Component ────────────────────────────────────────────────────────────

interface Props {
  onSubmit: (input: string, classification: QuickStartClassification) => void;
  onFallbackToIndustry: () => void;
  isProcessing?: boolean;
}

export function QuickStartInputCard({ onSubmit, onFallbackToIndustry, isProcessing }: Props) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = value.trim();
  const isEmpty = trimmed.length === 0;

  const handleSubmit = () => {
    if (isEmpty || isProcessing) return;
    const classification = classifyQuickStartInput(trimmed);
    onSubmit(trimmed, classification);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  // Detect what the user is typing for a hint
  const hint = !isEmpty ? getInputHint(trimmed) : null;

  return (
    <div className="space-y-3 pb-2">
      <div
        className={cn(
          'relative rounded-xl border transition-all duration-200',
          isFocused
            ? 'border-accent-green-110/40 bg-white-5 shadow-[0_0_12px_rgba(74,222,128,0.08)]'
            : 'border-white-10 bg-white-5 hover:border-white-15',
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
          placeholder="Paste a listing link, website, or describe what you want…"
          rows={1}
          className={cn(
            'w-full bg-transparent text-base text-white-90 placeholder:text-white-30 sm:text-sm',
            'px-4 pt-3.5 pb-12 resize-none outline-none',
            'leading-relaxed',
            isProcessing && 'opacity-50',
          )}
        />

        {/* Bottom bar inside the input */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
          {/* Input type hint */}
          <div className="flex items-center gap-1.5">
            {hint && (
              <span className="inline-flex items-center gap-1 text-[11px] text-white-30 font-medium">
                {hint.icon}
                {hint.label}
              </span>
            )}
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={isEmpty || isProcessing}
            className={cn(
              'inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all',
              isEmpty || isProcessing
                ? 'bg-white-5 text-white-20 cursor-not-allowed'
                : 'bg-accent-green-110 text-black hover:bg-accent-green-110/90 cursor-pointer',
            )}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                Get started
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Fallback link */}
      <button
        onClick={onFallbackToIndustry}
        disabled={isProcessing}
        className={cn(
          'flex min-h-11 items-center gap-1 text-[11px] text-white-30 hover:text-white-50 transition-colors mx-auto',
          isProcessing && 'opacity-50 pointer-events-none',
        )}
      >
        <ChevronDown className="w-3 h-3" />
        Or choose your industry manually
      </button>
    </div>
  );
}

function getInputHint(input: string): { label: string; icon: React.ReactNode } | null {
  const isUrl = /^https?:\/\//i.test(input) || /^www\./i.test(input) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(input);

  if (isUrl) {
    return {
      label: 'URL — we\u2019ll extract details and build your campaign',
      icon: <Link2 className="w-3 h-3" />,
    };
  }

  if (input.length > 20) {
    return {
      label: 'Description',
      icon: <FileText className="w-3 h-3" />,
    };
  }

  return null;
}
