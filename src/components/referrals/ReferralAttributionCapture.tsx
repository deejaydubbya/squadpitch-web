'use client';

import { useEffect } from 'react';

export function ReferralAttributionCapture() {
  useEffect(() => {
    void fetch('/api/referrals/attach', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
  }, []);
  return null;
}
