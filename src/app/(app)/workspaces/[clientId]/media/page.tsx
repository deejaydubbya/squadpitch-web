'use client';

import { useParams } from 'next/navigation';
import { AssetLibrary } from '@/components/studio/AssetLibrary';

export default function MediaPage() {
  const params = useParams<{ clientId: string }>();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white-100">Media</h1>
        <p className="text-sm text-white-40 mt-1">Images, videos, and other media assets for your content.</p>
      </div>
      <AssetLibrary clientId={params.clientId} />
    </div>
  );
}
