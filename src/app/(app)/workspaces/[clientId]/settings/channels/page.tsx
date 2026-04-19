'use client';
import { useParams } from 'next/navigation';
import { useClient, useIndustries } from '@/hooks/useSquadpitch';
import { ChannelConnectionsList } from '@/components/studio/ChannelConnectionsList';
import { ChannelSettingsTable } from '@/components/studio/ChannelSettingsTable';

export default function SettingsChannelsPage() {
  const params = useParams<{ clientId: string }>();
  const { data: client } = useClient(params.clientId);
  const { data: industries } = useIndustries();

  const industryProfile = client?.industryKey && industries
    ? industries.find((p) => p.key === client.industryKey)
    : undefined;

  return (
    <div className="space-y-8">
      {/* Section A — Connected Accounts */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white-100">Connected Accounts</h2>
          <p className="text-sm text-white-40 mt-1">
            Connect your social accounts to publish posts and help Squadpitch learn what works best for your audience.
          </p>
        </div>
        <ChannelConnectionsList
          clientId={params.clientId}
          channelRecommendations={industryProfile?.content.channelRecommendations}
        />
      </section>

      {/* Section B — Publishing Rules */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white-100">Publishing Rules</h2>
          <p className="text-sm text-white-40 mt-1">
            Configure per-channel publishing preferences, posting schedules, and content rules.
          </p>
        </div>
        <ChannelSettingsTable clientId={params.clientId} />
      </section>
    </div>
  );
}
