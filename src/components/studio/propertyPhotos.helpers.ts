// Shared photo-state helpers for the property modals (Add + Import).
// Kept in a .ts so unit tests can exercise the reducer logic without
// rendering React.

export interface PropertyPhoto {
  url: string;
  source: 'upload' | 'external_url' | 'import' | 'media_library';
  publicId?: string;
  alt?: string;
  isPrimary?: boolean;
}

/**
 * Read existing photos from a property's dataJson. Preserves
 * back-compat with rows that only carry `imageUrl` or `images[]`.
 * Returns the union with the first entry marked primary.
 */
export function readPhotosFromDataJson(
  data: Record<string, unknown> | null | undefined,
): PropertyPhoto[] {
  if (!data) return [];

  // _photos[] is the richer shape we write going forward.
  const meta = Array.isArray(data._photos) ? (data._photos as unknown[]) : [];
  const fromMeta: PropertyPhoto[] = [];
  for (const p of meta) {
    if (p && typeof p === 'object' && typeof (p as Record<string, unknown>).url === 'string') {
      const obj = p as Record<string, unknown>;
      fromMeta.push({
        url: String(obj.url),
        source:
          obj.source === 'upload' ||
          obj.source === 'external_url' ||
          obj.source === 'import' ||
          obj.source === 'media_library'
            ? (obj.source as PropertyPhoto['source'])
            : 'external_url',
        publicId: typeof obj.publicId === 'string' ? obj.publicId : undefined,
        alt: typeof obj.alt === 'string' ? obj.alt : undefined,
        isPrimary: obj.isPrimary === true,
      });
    }
  }

  // Legacy: images[] string array.
  const legacyArr = Array.isArray(data.images) ? (data.images as unknown[]) : [];
  const fromLegacyArr: PropertyPhoto[] = legacyArr
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .map((url) => ({ url, source: 'external_url' as const }));

  // Legacy: imageUrl single string.
  const heroUrl = typeof data.imageUrl === 'string' ? data.imageUrl : null;

  // Merge, preferring richer entries; dedup by URL.
  const seen = new Set<string>();
  const merged: PropertyPhoto[] = [];
  for (const p of fromMeta) {
    if (seen.has(p.url)) continue;
    seen.add(p.url);
    merged.push(p);
  }
  for (const p of fromLegacyArr) {
    if (seen.has(p.url)) continue;
    seen.add(p.url);
    merged.push(p);
  }
  if (heroUrl && !seen.has(heroUrl)) {
    merged.unshift({ url: heroUrl, source: 'external_url' });
  }

  // Ensure exactly one isPrimary if anything exists.
  if (merged.length > 0 && !merged.some((p) => p.isPrimary)) {
    // Prefer the hero URL if present.
    const heroIdx = heroUrl ? merged.findIndex((p) => p.url === heroUrl) : 0;
    merged[heroIdx >= 0 ? heroIdx : 0] = {
      ...merged[heroIdx >= 0 ? heroIdx : 0],
      isPrimary: true,
    };
  }
  return merged;
}

/**
 * Add a photo. Dedup on URL. First photo becomes primary
 * automatically.
 */
export function addPhoto(
  list: PropertyPhoto[],
  photo: PropertyPhoto,
): PropertyPhoto[] {
  if (list.some((p) => p.url === photo.url)) return list;
  const next = [...list, photo];
  if (!next.some((p) => p.isPrimary)) {
    next[0] = { ...next[0], isPrimary: true };
  }
  return next;
}

/** Remove a photo by URL. If the removed one was primary, promote the next. */
export function removePhoto(list: PropertyPhoto[], url: string): PropertyPhoto[] {
  const filtered = list.filter((p) => p.url !== url);
  if (filtered.length > 0 && !filtered.some((p) => p.isPrimary)) {
    filtered[0] = { ...filtered[0], isPrimary: true };
  }
  return filtered;
}

/** Promote a photo to primary. Demotes whatever was primary before. */
export function setPrimaryPhoto(list: PropertyPhoto[], url: string): PropertyPhoto[] {
  if (!list.some((p) => p.url === url)) return list;
  return list.map((p) => ({ ...p, isPrimary: p.url === url }));
}

/**
 * Build the dataJson photo fields we write back to the API. Preserves
 * the existing imageUrl + images[] convention for back-compat and
 * adds the richer _photos[] shadow for metadata (publicId, source).
 */
export function buildPhotoDataJson(list: PropertyPhoto[]): {
  imageUrl: string | null;
  images: string[];
  _photos: PropertyPhoto[];
} {
  if (list.length === 0) {
    return { imageUrl: null, images: [], _photos: [] };
  }
  const primary = list.find((p) => p.isPrimary) ?? list[0];
  return {
    imageUrl: primary.url,
    images: list.map((p) => p.url),
    _photos: list.map((p) => ({ ...p, isPrimary: p.url === primary.url })),
  };
}
