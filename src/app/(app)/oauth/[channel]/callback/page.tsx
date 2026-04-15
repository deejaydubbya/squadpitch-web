'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useCompleteOAuth } from '@/hooks/useSquadpitch';
import { useMediaImportCallback } from '@/hooks/useIntegrations';

const MEDIA_IMPORT_CHANNELS = ['DRIVE', 'DROPBOX', 'SHEETS'];

/** Channels where the opener handles the token exchange (not this page). */
const PASSTHROUGH_CHANNELS = ['GBP'];

type Phase = 'exchanging' | 'success' | 'error';

export default function OAuthCallbackPage() {
  const params = useParams<{ channel: string }>();
  const searchParams = useSearchParams();
  const completeOAuth = useCompleteOAuth();
  const completeMediaImport = useMediaImportCallback();

  const [phase, setPhase] = useState<Phase>('exchanging');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasRunRef = useRef(false);

  const channelUpper = params.channel?.toUpperCase() ?? '';
  const isMediaImport = MEDIA_IMPORT_CHANNELS.includes(channelUpper);
  const isPassthrough = PASSTHROUGH_CHANNELS.includes(channelUpper);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const oauthError = searchParams.get('error_description') ?? searchParams.get('error');

    if (oauthError) {
      setPhase('error');
      setErrorMessage(oauthError);
      return;
    }
    if (!code || !state) {
      setPhase('error');
      setErrorMessage('Missing code or state in callback URL.');
      return;
    }

    // GBP: forward raw code+state to opener — it handles the backend exchange
    if (isPassthrough) {
      setPhase('success');
      const targetOrigin =
        process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      try {
        window.opener?.postMessage(
          { type: `sp-${params.channel?.toLowerCase()}-oauth-complete`, code, state },
          targetOrigin,
        );
      } catch {
        // opener gone
      }
      setTimeout(() => window.close(), 500);
      return;
    }

    const onSuccess = () => {
      setPhase('success');
      const targetOrigin =
        process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      try {
        window.opener?.postMessage(
          { type: 'sp-oauth-complete', channel: params.channel },
          targetOrigin
        );
      } catch {
        // If opener is gone, fall through and let the user close the tab.
      }
      setTimeout(() => {
        window.close();
      }, 500);
    };

    const onError = (err: unknown) => {
      setPhase('error');
      setErrorMessage((err as Error).message);
    };

    if (isMediaImport) {
      completeMediaImport.mutate({ code, state }, { onSuccess, onError });
    } else {
      completeOAuth.mutate({ code, state }, { onSuccess, onError });
    }
  }, [searchParams, completeOAuth, completeMediaImport, params.channel, isMediaImport, isPassthrough]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="card p-8 max-w-md w-full text-center">
        {phase === 'exchanging' && (
          <>
            <Loader2 className="w-10 h-10 text-accent-green-110 mx-auto animate-spin" />
            <h1 className="text-lg font-semibold text-white-100 mt-4">
              Finishing connection…
            </h1>
            <p className="text-sm text-white-40 mt-1">
              Exchanging credentials with {params.channel}.
            </p>
          </>
        )}
        {phase === 'success' && (
          <>
            <CheckCircle2 className="w-10 h-10 text-zone-green mx-auto" />
            <h1 className="text-lg font-semibold text-white-100 mt-4">
              Connected!
            </h1>
            <p className="text-sm text-white-40 mt-1">
              You can close this window.
            </p>
          </>
        )}
        {phase === 'error' && (
          <>
            <AlertTriangle className="w-10 h-10 text-accent-red mx-auto" />
            <h1 className="text-lg font-semibold text-white-100 mt-4">
              Connection failed
            </h1>
            <p className="text-sm text-white-60 mt-2 break-words">
              {errorMessage ?? 'Unknown error'}
            </p>
            <button
              type="button"
              onClick={() => window.close()}
              className="mt-4 btn btn-ghost text-xs"
            >
              Close window
            </button>
          </>
        )}
      </div>
    </div>
  );
}
