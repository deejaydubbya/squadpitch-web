import { apiFetch } from '@/lib/apiFetch';

type PropertyImageInput =
  | string
  | { url?: string; src?: string; imageUrl?: string; label?: string; filename?: string };

interface NormalizeResult {
  syntheticToReal: Map<string, string>;
  allRealIds: string[];
  errors: Array<{ syntheticId: string; message: string }>;
}

/** Timeout for each upload-from-url call (30 seconds) */
const UPLOAD_TIMEOUT_MS = 30_000;

/**
 * Wrap apiFetch with a timeout so we don't hang forever.
 */
function apiFetchWithTimeout<T>(url: string, init: RequestInit): Promise<T> {
  return Promise.race([
    apiFetch<T>(url, init),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Upload timed out after ${UPLOAD_TIMEOUT_MS / 1000}s`)), UPLOAD_TIMEOUT_MS)
    ),
  ]);
}

/**
 * Resolve the URL from a property image entry that may be a plain string or an object.
 * Supports: string, .url, .src, .imageUrl
 */
function resolveImageUrl(entry: PropertyImageInput): string | undefined {
  if (typeof entry === 'string') return entry || undefined;
  return entry?.url || entry?.src || entry?.imageUrl || undefined;
}

function resolveImageLabel(entry: PropertyImageInput, fallbackIndex: number): string {
  if (typeof entry === 'string') return `property_photo_${fallbackIndex}`;
  return entry?.label || entry?.filename || `property_photo_${fallbackIndex}`;
}

/**
 * Extract the asset ID from a potentially varied response shape.
 * Accepts: { id }, { asset: { id } }, { mediaAsset: { id } }, { data: { id } }
 */
function extractAssetId(response: unknown): string | undefined {
  if (!response || typeof response !== 'object') return undefined;
  const r = response as Record<string, unknown>;
  if (typeof r.id === 'string' && r.id) return r.id;
  if (r.asset && typeof r.asset === 'object' && typeof (r.asset as Record<string, unknown>).id === 'string')
    return (r.asset as Record<string, unknown>).id as string;
  if (r.mediaAsset && typeof r.mediaAsset === 'object' && typeof (r.mediaAsset as Record<string, unknown>).id === 'string')
    return (r.mediaAsset as Record<string, unknown>).id as string;
  if (r.data && typeof r.data === 'object' && typeof (r.data as Record<string, unknown>).id === 'string')
    return (r.data as Record<string, unknown>).id as string;
  return undefined;
}

/**
 * Convert synthetic property_img_N and item_img_N IDs to real MediaAsset IDs
 * by uploading the source URL via the upload-from-url endpoint.
 * Serial uploads to avoid rate limits, best-effort on individual failures.
 *
 * propertyImages accepts string[], {url,label}[], {src}[], {imageUrl}[] formats.
 */
export async function normalizeAssignedMediaForSave(
  clientId: string,
  syntheticIds: string[],
  propertyImages: PropertyImageInput[],
  dataItemImages?: PropertyImageInput[]
): Promise<NormalizeResult> {
  const syntheticToReal = new Map<string, string>();
  const errors: NormalizeResult['errors'] = [];

  for (const synId of syntheticIds) {
    // Match property_img_N
    const propMatch = synId.match(/^property_img_(\d+)$/);
    if (propMatch) {
      const idx = parseInt(propMatch[1], 10);
      const entry = propertyImages[idx];
      if (!entry) {
        errors.push({ syntheticId: synId, message: 'No property image at this index' });
        continue;
      }
      const url = resolveImageUrl(entry);
      if (!url) {
        errors.push({ syntheticId: synId, message: 'No URL found for property image' });
        continue;
      }

      try {
        const result = await apiFetchWithTimeout<unknown>(
          `workspaces/${clientId}/assets/upload-from-url`,
          {
            method: 'POST',
            body: JSON.stringify({ url, filename: resolveImageLabel(entry, idx) }),
          }
        );
        const assetId = extractAssetId(result);
        if (assetId) {
          syntheticToReal.set(synId, assetId);
        } else {
          errors.push({
            syntheticId: synId,
            message: `Upload succeeded but no asset ID in response (keys: ${Object.keys(result as object).join(',')})`,
          });
        }
      } catch (err) {
        errors.push({
          syntheticId: synId,
          message: `${err instanceof Error ? err.message : 'Upload failed'} (url: ${url.slice(0, 80)})`,
        });
      }
      continue;
    }

    // Match item_img_N
    const itemMatch = synId.match(/^item_img_(\d+)$/);
    if (itemMatch) {
      const idx = parseInt(itemMatch[1], 10);
      const items = dataItemImages ?? [];
      const entry = items[idx];
      if (!entry) {
        errors.push({ syntheticId: synId, message: 'No data item image at this index' });
        continue;
      }
      const url = resolveImageUrl(entry);
      if (!url) {
        errors.push({ syntheticId: synId, message: 'No URL found for data item image' });
        continue;
      }

      try {
        const result = await apiFetchWithTimeout<unknown>(
          `workspaces/${clientId}/assets/upload-from-url`,
          {
            method: 'POST',
            body: JSON.stringify({ url, filename: `data_item_photo_${idx}` }),
          }
        );
        const assetId = extractAssetId(result);
        if (assetId) {
          syntheticToReal.set(synId, assetId);
        } else {
          errors.push({
            syntheticId: synId,
            message: `Upload succeeded but no asset ID in response (keys: ${Object.keys(result as object).join(',')})`,
          });
        }
      } catch (err) {
        errors.push({
          syntheticId: synId,
          message: `${err instanceof Error ? err.message : 'Upload failed'} (url: ${url.slice(0, 80)})`,
        });
      }
      continue;
    }
  }

  const allRealIds = Array.from(syntheticToReal.values());
  return { syntheticToReal, allRealIds, errors };
}

/**
 * Primary entry point for normalizing media IDs before save.
 * Keeps real MediaAsset IDs as-is, converts synthetic property_img_N / item_img_N
 * to real assets via upload-from-url. Returns only real MediaAsset IDs ready to attach.
 */
export async function normalizeMediaIdsForSave({
  clientId,
  ids,
  propertyImages,
  itemImages,
}: {
  clientId: string;
  ids: string[];
  propertyImages: PropertyImageInput[];
  itemImages?: PropertyImageInput[];
}): Promise<{ realIds: string[]; syntheticToReal: Map<string, string>; errors: NormalizeResult['errors'] }> {
  const realIds: string[] = [];
  const syntheticIds: string[] = [];

  for (const id of ids) {
    if (id.startsWith('property_img_') || id.startsWith('item_img_')) {
      syntheticIds.push(id);
    } else {
      realIds.push(id);
    }
  }

  if (syntheticIds.length === 0) {
    return { realIds, syntheticToReal: new Map(), errors: [] };
  }

  const result = await normalizeAssignedMediaForSave(
    clientId,
    syntheticIds,
    propertyImages,
    itemImages
  );

  return {
    realIds: [...realIds, ...result.allRealIds],
    syntheticToReal: result.syntheticToReal,
    errors: result.errors,
  };
}

/**
 * Legacy wrapper — delegates to normalizeMediaIdsForSave.
 */
export async function normalizeQuickPostMediaForSave({
  clientId,
  selectedMediaIds,
  propertyData,
  dataItemImages,
}: {
  clientId: string;
  selectedMediaIds: string[];
  propertyData?: Record<string, unknown> | null;
  dataItemImages?: PropertyImageInput[];
}): Promise<{ realMediaAssetIds: string[]; errors: NormalizeResult['errors'] }> {
  const rawPropImages = propertyData?.images;
  const propertyImages: PropertyImageInput[] = Array.isArray(rawPropImages)
    ? (rawPropImages as PropertyImageInput[])
    : [];

  const result = await normalizeMediaIdsForSave({
    clientId,
    ids: selectedMediaIds,
    propertyImages,
    itemImages: dataItemImages,
  });

  return {
    realMediaAssetIds: result.realIds,
    errors: result.errors,
  };
}

/**
 * Replace synthetic IDs in an array with their real counterparts.
 * IDs not found in the map are filtered out.
 */
export function replaceSyntheticIds(
  ids: string[],
  syntheticToReal: Map<string, string>
): string[] {
  return ids
    .map((id) => syntheticToReal.get(id) ?? id)
    .filter((id) => !id.startsWith('property_img_') && !id.startsWith('item_img_'));
}
