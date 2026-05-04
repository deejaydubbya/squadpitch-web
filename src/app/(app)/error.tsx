'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[APP_ERROR]', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-sp-bg px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-accent-red/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7 text-accent-red" />
        </div>

        <div className="space-y-2">
          <h1 className="text-lg font-semibold text-white-100">
            Something went wrong
          </h1>
          <p className="text-sm text-white-40">
            An unexpected error occurred. This has been logged and we&apos;ll look into it.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-green-110 text-sp-bg text-sm font-medium hover:bg-accent-green-110/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white-10 text-white-60 text-sm font-medium hover:bg-white-5 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go home
          </a>
        </div>

        {error.digest && (
          <p className="text-xs text-white-20">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
