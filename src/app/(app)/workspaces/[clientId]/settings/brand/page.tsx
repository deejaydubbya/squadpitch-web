'use client';
import { useParams } from 'next/navigation';
import { BrandProfileForm } from '@/components/studio/BrandProfileForm';
export default function SettingsBrandPage() {
  const params = useParams<{ clientId: string }>();
  return <BrandProfileForm clientId={params.clientId} />;
}
