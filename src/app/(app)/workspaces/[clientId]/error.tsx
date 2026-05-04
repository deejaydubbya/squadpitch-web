'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[WORKSPACE_ERROR]', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-12 h-12 rounded-xl bg-accent-red/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6 text-accent-red" />
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-semibold text-white-100">
            This page ran into an error
          </h2>
          <p className="text-sm text-white-40">
            Something unexpected happened loading this workspace page.
            Try refreshing, or go back and try again.
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
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white-10 text-white-60 text-sm font-medium hover:bg-white-5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
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
