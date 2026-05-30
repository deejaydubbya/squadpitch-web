// Shared helper that turns a WorkspaceDataItem of type=PROPERTY
// into a predictable, FE-safe shape. Used by:
//   - the Sites editor source-context pill
//   - "Pull from property" block autofill
//   - future media picker / Sites templates
//
// Pure (no React, no side effects, doesn't mutate the input).

import type { WorkspaceDataItem } from '@/hooks/useSquadpitch';

export interface NormalizedProperty {
  /** Item id — the same one Autopilot recommendations reference. */
  id: string;
  /** Display title — prefers item.title, falls back to assembled address. */
  title: string;
  /** Street address. */
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  /** Single-line composite address for thumbnails / pills. */
  addressLine: string;
  /** Numeric price; null when missing or unparseable. */
  price: number | null;
  /** Formatted price (e.g. "$425,000") for display. */
  priceFormatted: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  propertyType: string | null;
  yearBuilt: number | null;
  description: string | null;
  /** Primary photo URL (read precedence: _photos[isPrimary] > imageUrl > images[0]). */
  primaryImage: string | null;
  /** All photo URLs in display order, deduped. */
  images: string[];
  listingUrl: string | null;
  /** active / pending / sold / coming_soon / off_market / draft. */
  status: string | null;
  /** External listing id (MLS, etc.). */
  externalListingId: string | null;
}

function toNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^\d.\-]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toStr(v: unknown): string | null {
  if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  if (typeof v === 'number') return String(v);
  return null;
}

function fmtPrice(n: number | null): string | null {
  if (n == null) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Normalize a PROPERTY data item. Returns null when the input is
 * missing or doesn't look like a property.
 */
export function normalizeProperty(
  item: WorkspaceDataItem | null | undefined,
): NormalizedProperty | null {
  if (!item || !item.id) return null;
  const d = (item.dataJson ?? {}) as Record<string, unknown>;

  const street = toStr(d.street) ?? toStr(d.address);
  const city = toStr(d.city);
  const state = toStr(d.state);
  const zip = toStr(d.zip) ?? toStr(d.zipCode) ?? toStr(d.postalCode);

  const composedAddress = [street, city, state, zip].filter(Boolean).join(', ');
  const itemTitle = toStr(item.title);
  const titleNotPlaceholder =
    itemTitle && itemTitle !== 'Untitled Listing' ? itemTitle : null;
  const title =
    titleNotPlaceholder ?? (composedAddress.length > 0 ? composedAddress : 'Untitled property');
  const addressLine =
    composedAddress.length > 0 ? composedAddress : titleNotPlaceholder ?? 'Unknown address';

  const price = toNum(d.price);

  // Photos: _photos[isPrimary] > imageUrl > images[0]. Build a
  // deduped union for display.
  const photoMeta = Array.isArray(d._photos)
    ? (d._photos as Array<{ url?: string; isPrimary?: boolean }>)
    : [];
  const primaryFromMeta = photoMeta.find((p) => p?.isPrimary === true)?.url ?? null;
  const heroImage = toStr(d.imageUrl);
  const imagesRaw = Array.isArray(d.images) ? (d.images as unknown[]) : [];
  const seen = new Set<string>();
  const images: string[] = [];
  for (const url of [
    primaryFromMeta,
    heroImage,
    ...imagesRaw,
    ...photoMeta.map((p) => p?.url ?? null),
  ]) {
    if (typeof url !== 'string' || url.length === 0) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    images.push(url);
  }
  const primaryImage = primaryFromMeta ?? heroImage ?? images[0] ?? null;

  return {
    id: item.id,
    title,
    street,
    city,
    state,
    zip,
    addressLine,
    price,
    priceFormatted: fmtPrice(price),
    beds: toNum(d.bedrooms ?? d.beds),
    baths: toNum(d.bathrooms ?? d.baths),
    sqft: toNum(d.sqft ?? d.squareFeet),
    propertyType: toStr(d.propertyType),
    yearBuilt: toNum(d.yearBuilt),
    description: toStr(d.description),
    primaryImage,
    images,
    listingUrl: toStr(d.listingUrl),
    status: toStr(d.status),
    externalListingId:
      toStr(d.externalListingId) ?? toStr(d.mlsId) ?? toStr(d.sourceId) ?? null,
  };
}

/**
 * Build the row pairs we feed into a `key_details` block when the
 * user clicks "Pull from property". Returns only fields with data
 * so the block isn't littered with blank rows.
 */
export function buildKeyDetailItems(
  prop: NormalizedProperty,
): Array<{ label: string; value: string }> {
  const items: Array<{ label: string; value: string }> = [];
  if (prop.priceFormatted) items.push({ label: 'Price', value: prop.priceFormatted });
  if (prop.beds != null) items.push({ label: 'Beds', value: String(prop.beds) });
  if (prop.baths != null) items.push({ label: 'Baths', value: String(prop.baths) });
  if (prop.sqft != null) items.push({ label: 'Sq Ft', value: prop.sqft.toLocaleString() });
  if (prop.propertyType) items.push({ label: 'Type', value: prop.propertyType });
  if (prop.yearBuilt != null) items.push({ label: 'Year Built', value: String(prop.yearBuilt) });
  if (prop.status) items.push({ label: 'Status', value: prop.status.replace(/_/g, ' ') });
  return items;
}

/**
 * Short pitch line for a hero subheadline. Uses available facts;
 * never invents anything not present in the property data.
 */
export function buildHeroSubheadline(prop: NormalizedProperty): string {
  const parts: string[] = [];
  if (prop.beds != null && prop.baths != null) {
    parts.push(`${prop.beds} bed / ${prop.baths} bath`);
  }
  if (prop.sqft != null) parts.push(`${prop.sqft.toLocaleString()} sq ft`);
  if (prop.priceFormatted) parts.push(prop.priceFormatted);
  if (prop.propertyType) parts.push(prop.propertyType);
  return parts.join(' · ');
}

/**
 * Short factual description from known fields when the property
 * has no narrative description. Conservative — only uses fields
 * that are present.
 */
export function buildSafeDescription(prop: NormalizedProperty): string {
  if (prop.description) return prop.description;
  const sentences: string[] = [];
  if (prop.beds != null && prop.baths != null && prop.sqft != null) {
    sentences.push(
      `${prop.title} offers ${prop.beds} bedrooms, ${prop.baths} bathrooms, and ${prop.sqft.toLocaleString()} square feet.`,
    );
  } else if (prop.beds != null && prop.baths != null) {
    sentences.push(
      `${prop.title} offers ${prop.beds} bedrooms and ${prop.baths} bathrooms.`,
    );
  }
  if (prop.propertyType && prop.yearBuilt != null) {
    sentences.push(`Built in ${prop.yearBuilt} as a ${prop.propertyType.toLowerCase()}.`);
  } else if (prop.yearBuilt != null) {
    sentences.push(`Built in ${prop.yearBuilt}.`);
  } else if (prop.propertyType) {
    sentences.push(`Property type: ${prop.propertyType}.`);
  }
  if (prop.priceFormatted) {
    sentences.push(`Currently listed at ${prop.priceFormatted}.`);
  }
  return sentences.join(' ');
}
