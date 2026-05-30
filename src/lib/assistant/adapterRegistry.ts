import type { IndustryAdapter } from './industryAdapter';
import { realEstateAdapter } from './adapters/realEstate';
import { automotiveAdapter } from './adapters/automotive';

const adapters = new Map<string, IndustryAdapter>();

// Register built-in adapters at module load
adapters.set(realEstateAdapter.id, realEstateAdapter);
adapters.set(automotiveAdapter.id, automotiveAdapter);

/**
 * Get an adapter by industry key.
 * Throws if the adapter is not registered or the key is missing.
 */
export function getAdapter(industryKey: string | null | undefined): IndustryAdapter {
  if (!industryKey) {
    const available = Array.from(adapters.keys()).join(', ');
    throw new Error(
      `No industryKey provided. Available adapters: ${available}`,
    );
  }
  const adapter = adapters.get(industryKey);
  if (!adapter) {
    const available = Array.from(adapters.keys()).join(', ');
    throw new Error(
      `No industry adapter registered for "${industryKey}". Available: ${available}`,
    );
  }
  return adapter;
}

/**
 * Safe version: returns null for unknown / missing industry keys
 * so the caller can render a neutral UI instead of silently
 * showing real-estate copy on a non-real-estate workspace.
 *
 * industry-01 — previously fell back to the `real_estate` adapter,
 * which masked missing industry selection and let real-estate
 * terminology bleed into every other workspace. Callers must now
 * handle `null` (typical pattern: `getAdapterSafe(k)?.terminology
 * ?? NEUTRAL_TERMINOLOGY`).
 */
export function getAdapterSafe(
  industryKey: string | null | undefined,
): IndustryAdapter | null {
  if (!industryKey) return null;
  return adapters.get(industryKey) ?? null;
}

/**
 * Register a custom industry adapter.
 */
export function registerAdapter(adapter: IndustryAdapter): void {
  adapters.set(adapter.id, adapter);
}

/**
 * List all registered adapter keys.
 */
export function listAdapterKeys(): string[] {
  return Array.from(adapters.keys());
}

/**
 * Resolve a campaign type value to its label for the given industry.
 * Usable outside React (constants, utilities, server code).
 *
 * industry-01 — `industryKey` is now required. Passing null/undefined
 * returns the bare value with underscores stripped (no real-estate
 * label assumed).
 */
export function getCampaignTypeLabel(
  value: string,
  industryKey: string | null | undefined,
): string {
  if (!industryKey) return value.replace(/_/g, ' ');
  const adapter = adapters.get(industryKey);
  if (!adapter) return value.replace(/_/g, ' ');
  const option = adapter.campaignTypes.find((ct) => ct.value === value);
  return option?.label ?? value.replace(/_/g, ' ');
}
