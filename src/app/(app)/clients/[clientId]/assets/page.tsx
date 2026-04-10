'use client';
import { useParams } from 'next/navigation';
import { AssetLibrary } from '@/components/studio/AssetLibrary';
export default function AssetsPage() {
  const params = useParams<{ clientId: string }>();
  return <AssetLibrary clientId={params.clientId} />;
}
