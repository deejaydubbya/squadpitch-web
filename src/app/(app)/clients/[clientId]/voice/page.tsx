'use client';
import { useParams } from 'next/navigation';
import { VoiceProfileForm } from '@/components/studio/VoiceProfileForm';
export default function VoicePage() {
  const params = useParams<{ clientId: string }>();
  return <VoiceProfileForm clientId={params.clientId} />;
}
