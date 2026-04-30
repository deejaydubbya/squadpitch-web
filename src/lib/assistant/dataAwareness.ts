import type { Draft } from '@/hooks/useSquadpitch';
import type { DataAwareness, DataAwarenessLevel } from './normalizedPost.types';

// ── Display config per awareness level ──────────────────────────────

export interface DataAwarenessDisplayConfig {
  label: string;
  bgClass: string;
  textClass: string;
  icon: 'Database' | 'Sparkles' | 'AlertTriangle';
}

export const DATA_AWARENESS_CONFIG: Record<DataAwarenessLevel, DataAwarenessDisplayConfig> = {
  uses_user_data: {
    label: 'Uses your data',
    bgClass: 'bg-zone-green/15',
    textClass: 'text-zone-green',
    icon: 'Database',
  },
  general_content: {
    label: 'General content',
    bgClass: 'bg-white-10',
    textClass: 'text-white-50',
    icon: 'Sparkles',
  },
  missing_data: {
    label: 'No data available',
    bgClass: 'bg-accent-orange/15',
    textClass: 'text-accent-orange',
    icon: 'AlertTriangle',
  },
};

// ── Draft classifier (quick posts) ─────────────────────────────────

export function classifyDraftDataAwareness(draft: Draft): DataAwareness {
  const warnings = draft.warnings ?? [];
  const sourceMeta = draft.sourceMeta;

  // Idea post → general content
  if (warnings.some((w) => w === 'source:idea_post')) {
    return {
      level: 'general_content',
      dataSourcesUsed: ['Educational/idea post'],
    };
  }

  // Fallback → missing data
  if (warnings.some((w) => w.startsWith('re_fallback:'))) {
    return {
      level: 'missing_data',
      dataSourcesUsed: ['Listing data was requested but none available'],
    };
  }

  // Source meta indicates a specific data source
  if (sourceMeta?.source) {
    const sources: string[] = [];

    if (sourceMeta.source === 'listing') {
      sources.push(sourceMeta.listingTitle ? `Listing: ${sourceMeta.listingTitle}` : 'Listing data');
    } else if (sourceMeta.source === 'review') {
      sources.push('Client review');
    } else {
      sources.push(`Source: ${sourceMeta.source}`);
    }

    if (sourceMeta.autoBlueprint) {
      sources.push(`Blueprint: ${sourceMeta.autoBlueprint}`);
    }

    return {
      level: 'uses_user_data',
      sourceTitle: sourceMeta.listingTitle,
      sourceType: sourceMeta.source,
      dataSourcesUsed: sources,
    };
  }

  // Auto-listing or auto-asset warnings → uses user data
  const autoListingWarning = warnings.find((w) => w.startsWith('re_auto_listing:'));
  if (autoListingWarning) {
    const title = autoListingWarning.replace('re_auto_listing:', '').trim();
    return {
      level: 'uses_user_data',
      sourceTitle: title || undefined,
      sourceType: 'listing',
      dataSourcesUsed: [title ? `Listing: ${title}` : 'Auto-selected listing'],
    };
  }

  if (warnings.some((w) => w.startsWith('re_assets:'))) {
    return {
      level: 'uses_user_data',
      dataSourcesUsed: ['Real estate asset data'],
    };
  }

  if (warnings.some((w) => w.startsWith('auto_blueprint:'))) {
    return {
      level: 'uses_user_data',
      dataSourcesUsed: ['Auto-selected content blueprint'],
    };
  }

  // Default — no data signals
  return {
    level: 'general_content',
    dataSourcesUsed: ['General industry content'],
  };
}

// ── Campaign classifier ────────────────────────────────────────────

export function classifyCampaignDataAwareness(
  dataItemId: string | null,
  propertyData: Record<string, unknown> | null,
): DataAwareness {
  if (dataItemId) {
    const sources: string[] = [];
    // Try to get a descriptive title from propertyData
    const title =
      propertyData?.address ?? propertyData?.title ?? propertyData?.name;
    if (typeof title === 'string' && title) {
      sources.push(`Listing: ${title}`);
    } else {
      sources.push('Linked data item');
    }
    return {
      level: 'uses_user_data',
      sourceId: dataItemId,
      sourceType: 'listing',
      dataSourcesUsed: sources,
    };
  }

  if (propertyData && Object.keys(propertyData).length > 0) {
    const title =
      propertyData.address ?? propertyData.title ?? propertyData.name;
    return {
      level: 'uses_user_data',
      dataSourcesUsed: [
        typeof title === 'string' && title
          ? `Listing: ${title}`
          : 'Property data provided',
      ],
    };
  }

  return {
    level: 'missing_data',
    dataSourcesUsed: ['No listing data linked to this campaign'],
  };
}
