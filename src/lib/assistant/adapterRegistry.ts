import type { IndustryAdapter } from './industryAdapter';
import { realEstateAdapter } from './adapters/realEstate';
import { automotiveAdapter } from './adapters/automotive';

const adapters = new Map<string, IndustryAdapter>();

// Register built-in adapters at module load
adapters.set(realEstateAdapter.id, realEstateAdapter);
adapters.set(automotiveAdapter.id, automotiveAdapter);

/**
 * Get an adapter by industry key.
 * Throws if the adapter is not registered.
 */
export function getAdapter(industryKey: string): IndustryAdapter {
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
 * Safe version: returns real_estate adapter as fallback for unknown keys.
 * Use in UI rendering paths where throwing would crash the page.
 */
export function getAdapterSafe(industryKey: string): IndustryAdapter {
  return adapters.get(industryKey) ?? adapters.get('real_estate')!;
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
 */
export function getCampaignTypeLabel(value: string, industryKey: string = 'real_estate'): string {
  const adapter = adapters.get(industryKey);
  if (!adapter) return value.replace(/_/g, ' ');
  const option = adapter.campaignTypes.find((ct) => ct.value === value);
  return option?.label ?? value.replace(/_/g, ' ');
}
