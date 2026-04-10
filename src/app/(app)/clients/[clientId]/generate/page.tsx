'use client';
import { useParams } from 'next/navigation';
import { GenerateForm } from '@/components/studio/GenerateForm';
export default function GeneratePage() {
  const params = useParams<{ clientId: string }>();
  return <GenerateForm clientId={params.clientId} />;
}
