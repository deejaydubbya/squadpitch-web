import type { Draft } from '@/hooks/useSquadpitch';

export interface CampaignGroup {
  campaignId: string;
  campaignName: string;
  campaignType: string;
  drafts: Draft[];
}

export function groupDraftsByCampaign(drafts: Draft[]): {
  campaignGroups: CampaignGroup[];
  standaloneDrafts: Draft[];
} {
  const groups = new Map<string, CampaignGroup>();
  const standalones: Draft[] = [];

  for (const d of drafts) {
    if (d.campaignId) {
      let group = groups.get(d.campaignId);
      if (!group) {
        group = {
          campaignId: d.campaignId,
          campaignName: d.campaignName || 'Unnamed Campaign',
          campaignType: d.campaignType || 'just_listed',
          drafts: [],
        };
        groups.set(d.campaignId, group);
      }
      group.drafts.push(d);
    } else {
      standalones.push(d);
    }
  }

  // Sort drafts within each group by campaignOrder
  for (const group of Array.from(groups.values())) {
    group.drafts.sort((a, b) => (a.campaignOrder ?? 0) - (b.campaignOrder ?? 0));
  }

  // Sort campaign groups by most recent first
  const sorted = Array.from(groups.values()).sort((a, b) => {
    const aDate = a.drafts.reduce((min, d) => {
      const dt = d.scheduledFor ?? d.publishedAt;
      return dt && (!min || dt < min) ? dt : min;
    }, null as string | null);
    const bDate = b.drafts.reduce((min, d) => {
      const dt = d.scheduledFor ?? d.publishedAt;
      return dt && (!min || dt < min) ? dt : min;
    }, null as string | null);
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return bDate.localeCompare(aDate);
  });

  return { campaignGroups: sorted, standaloneDrafts: standalones };
}
