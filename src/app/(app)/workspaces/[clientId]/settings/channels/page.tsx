'use client';
import { useParams } from 'next/navigation';
import { useClient, useIndustries } from '@/hooks/useSquadpitch';
import { ChannelConnectionsList } from '@/components/studio/ChannelConnectionsList';

export default function SettingsChannelsPage() {
  const params = useParams<{ clientId: string }>();
  const { data: client } = useClient(params.clientId);
  const { data: industries } = useIndustries();

  const industryProfile = client?.industryKey && industries
    ? industries.find((p) => p.key === client.industryKey)
    : undefined;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white-100">Channel connections</h2>
        <p className="text-sm text-white-40 mt-1">
          Connect your social accounts to publish posts and help Squadpitch learn what works best for your audience.
        </p>
      </div>
      <ChannelConnectionsList
        clientId={params.clientId}
        channelRecommendations={industryProfile?.content.channelRecommendations}
      />
    </div>
  );
}
