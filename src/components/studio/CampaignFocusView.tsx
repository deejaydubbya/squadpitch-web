'use client';

import { type Draft } from '@/hooks/useSquadpitch';
import { CampaignSection } from './CampaignSection';

interface CampaignFocusViewProps {
  clientId: string;
  campaignDrafts: Draft[];
  onExitFocusMode: () => void;
  selectedIds: Set<string>;
  onSelect?: (id: string, checked: boolean) => void;
}

export function CampaignFocusView({
  clientId,
  campaignDrafts,
  onExitFocusMode,
  selectedIds,
  onSelect,
}: CampaignFocusViewProps) {
  const campaignId = campaignDrafts[0]?.campaignId ?? '';

  return (
    <CampaignSection
      clientId={clientId}
      campaignId={campaignId}
      campaignDrafts={campaignDrafts}
      expanded={true}
      onToggleExpand={() => {}}
      selectedIds={selectedIds}
      onSelect={onSelect}
      focusMode={true}
      onExitFocusMode={onExitFocusMode}
    />
  );
}
