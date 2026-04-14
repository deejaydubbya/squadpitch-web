'use client';
import { useParams } from 'next/navigation';
import { PlannerView } from '@/components/studio/PlannerView';
export default function PlannerPage() {
  const params = useParams<{ clientId: string }>();
  return <PlannerView clientId={params.clientId} />;
}
