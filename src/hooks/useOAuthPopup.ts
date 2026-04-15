'use client';

import { useRef, useState } from 'react';
import { useStartOAuth, type Channel } from '@/hooks/useSquadpitch';

export function useOAuthPopup(clientId: string) {
  const startOAuth = useStartOAuth(clientId);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const popupRef = useRef<Window | null>(null);

  const connect = (channel: Channel) => {
    setPopupBlocked(false);

    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return;
    }

    const popup = window.open(
      'about:blank',
      'sp-oauth-popup',
      'width=600,height=720',
    );
    if (!popup) {
      setPopupBlocked(true);
      return;
    }
    popupRef.current = popup;

    startOAuth.mutate(channel, {
      onSuccess: (data) => {
        if (popup.closed) {
          popupRef.current = null;
          return;
        }
        popup.location.href = data.authUrl;
      },
      onError: () => {
        popup.close();
        popupRef.current = null;
      },
    });
  };

  return {
    connect,
    isPending: startOAuth.isPending,
    popupBlocked,
    error: startOAuth.error as Error | null,
  };
}
