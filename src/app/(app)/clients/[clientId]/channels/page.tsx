'use client';
import { useParams } from 'next/navigation';
import { ChannelConnectionsList } from '@/components/studio/ChannelConnectionsList';
export default function ChannelsPage() {
  const params = useParams<{ clientId: string }>();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white-100">Channel connections</h2>
        <p className="text-sm text-white-40 mt-1">
          Connect external social accounts so Squadpitch can publish approved drafts directly.
        </p>
      </div>
      <ChannelConnectionsList clientId={params.clientId} />
    </div>
  );
}
