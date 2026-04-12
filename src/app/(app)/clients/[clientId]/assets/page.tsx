'use client';

import { useParams } from 'next/navigation';
import { AssetLibrary } from '@/components/studio/AssetLibrary';

export default function MediaLibraryPage() {
  const { clientId } = useParams<{ clientId: string }>();

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-white-100">Media Library</h1>
      <AssetLibrary clientId={clientId} />
    </div>
  );
}
