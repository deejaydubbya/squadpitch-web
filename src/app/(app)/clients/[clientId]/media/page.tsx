'use client';
import { useParams } from 'next/navigation';
import { MediaProfileForm } from '@/components/studio/MediaProfileForm';
import { ChannelSettingsTable } from '@/components/studio/ChannelSettingsTable';
export default function MediaPage() {
  const params = useParams<{ clientId: string }>();
  return (
    <div className="space-y-6">
      <MediaProfileForm clientId={params.clientId} />
      <ChannelSettingsTable clientId={params.clientId} />
    </div>
  );
}
