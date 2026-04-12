'use client';
import { useParams } from 'next/navigation';
import { BusinessDataManager } from '@/components/studio/BusinessDataManager';
export default function BusinessDataPage() {
  const params = useParams<{ clientId: string }>();
  return <BusinessDataManager clientId={params.clientId} />;
}
