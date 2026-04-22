// ── Search URL builder (same logic as PropertyDetailDrawer) ──────────

export function buildSearchUrls(d: Record<string, unknown>) {
  const street = String(d.street ?? '');
  const city = String(d.city ?? '');
  const state = String(d.state ?? '');
  const zip = String(d.zip ?? '');
  if (!street && !city) return { zillow: null, realtor: null, redfin: null };

  const zillowSlug = [street, city, state, zip]
    .filter(Boolean)
    .join('-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '');
  const zillow = zillowSlug
    ? `https://www.zillow.com/homes/${zillowSlug}_rb/`
    : null;

  const realtorSlug = street
    ? `${street.replace(/\s+/g, '_')}_${city}_${state}_${zip}`.replace(
        /[^a-zA-Z0-9_]/g,
        ''
      )
    : null;
  const realtor = realtorSlug
    ? `https://www.realtor.com/realestateandhomes-detail/${realtorSlug}`
    : null;

  const encoded = encodeURIComponent(
    [street, city, state, zip].filter(Boolean).join(', ')
  );
  const redfin = encoded
    ? `https://www.redfin.com/search#combined=${encoded}`
    : null;

  return { zillow, realtor, redfin };
}

// ── Video duration formatter ─────────────────────────────────────────

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ── Score badge color ────────────────────────────────────────────────

export function scoreColor(score: number | null | undefined): string {
  if (score == null) return 'bg-white-20';
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}
