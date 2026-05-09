'use client';

// Meta App Review API check tool — TEMPORARY.
//
// Renders a single button that POSTs to
// /api/v1/workspaces/:id/dev/meta/app-review-checks. The backend hits
// one Page-level Insights endpoint (read_insights) and one IG
// user-level Insights endpoint (instagram_manage_insights), then
// returns a structured pass/fail per platform.
//
// Visibility gates (any one is sufficient):
//   1. User has the admin or developer role.
//   2. NEXT_PUBLIC_META_APP_REVIEW_TOOLS=true (dev gate without role).
//   3. NEXT_PUBLIC_META_APP_REVIEW_DEMO=true (kept so the same demo
//      build that already exposes the analytics demo also exposes
//      this tool).
//
// Delete this file (and the env helper, hook, and route) once the
// App Review tool is retired. See docs/meta-app-review-api-checks.md.

import { useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  Play,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  useMetaAppReviewChecks,
  type MetaAppReviewChecksResponse,
  type MetaAppReviewCheckResult,
} from '@/hooks/useSquadpitch';
import { isMetaAppReviewToolsEnabled } from '@/lib/metaAppReviewTools';
import { isMetaAppReviewDemo } from '@/lib/metaAppReviewDemo';

interface Props {
  clientId: string;
}

export function MetaAppReviewChecksButton({ clientId }: Props) {
  const { isInternalUser } = useCurrentUser();
  const toolsEnabled = isMetaAppReviewToolsEnabled();
  const demo = isMetaAppReviewDemo();
  const checks = useMetaAppReviewChecks(clientId);
  const [result, setResult] = useState<MetaAppReviewChecksResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isInternalUser && !toolsEnabled && !demo) return null;

  const onClick = async () => {
    setErrorMessage(null);
    try {
      const r = await checks.mutateAsync();
      setResult(r);
    } catch (err) {
      setResult(null);
      setErrorMessage((err as Error)?.message ?? 'Request failed');
    }
  };

  return (
    <section className="card p-4 space-y-3 border border-amber-500/20 bg-amber-500/5">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white-100">
            Meta App Review API checks
          </h3>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-amber-400 font-medium">
          Dev tool
        </span>
      </header>
      <p className="text-xs text-white-60 leading-relaxed">
        Makes one Facebook Page Insights call (proves{' '}
        <code className="text-white-100">read_insights</code>) and one Instagram
        Insights call (proves{' '}
        <code className="text-white-100">instagram_manage_insights</code>).
        After both succeed, Meta&apos;s App Review dashboard typically updates
        within 30–60 minutes.
      </p>
      <button
        type="button"
        onClick={onClick}
        disabled={checks.isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white-10 bg-white-5 text-white-100 hover:bg-white-10 disabled:opacity-50 transition-colors text-xs"
      >
        {checks.isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Play className="w-3.5 h-3.5" />
        )}
        {checks.isPending
          ? 'Running Meta API checks…'
          : 'Run Meta App Review API checks'}
      </button>
      {errorMessage && (
        <p className="text-xs text-red-400">{errorMessage}</p>
      )}
      {result && !checks.isPending && (
        <div className="space-y-3 pt-1">
          <CheckRow result={result.facebook} platformLabel="Facebook" />
          <CheckRow result={result.instagram} platformLabel="Instagram" />
          {(result.tokenScopes.facebook || result.tokenScopes.instagram) && (
            <div className="rounded-md bg-white-5 px-3 py-2 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-white-40">
                Granted token scopes (best-effort)
              </p>
              {result.tokenScopes.facebook && (
                <ScopeLine
                  label="Facebook"
                  scopes={result.tokenScopes.facebook}
                  required="read_insights"
                />
              )}
              {result.tokenScopes.instagram && (
                <ScopeLine
                  label="Instagram"
                  scopes={result.tokenScopes.instagram}
                  required="instagram_manage_insights"
                />
              )}
            </div>
          )}
          {result.nextSteps.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-white-40">
                Next steps
              </p>
              <ul className="text-xs text-white-60 space-y-1 list-disc pl-4">
                {result.nextSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-[10px] text-white-40 italic">
            After successful calls, Meta may take 30–60 minutes to update the
            required API call status.
          </p>
        </div>
      )}
    </section>
  );
}

function CheckRow({
  result,
  platformLabel,
}: {
  result: MetaAppReviewCheckResult;
  platformLabel: string;
}) {
  const Icon = result.success ? CheckCircle2 : XCircle;
  const colorClass = result.success ? 'text-green-400' : 'text-red-400';
  return (
    <div className="rounded-md bg-white-5 px-3 py-2 space-y-1">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${colorClass}`} />
        <span className="text-sm font-medium text-white-100">
          {platformLabel}
        </span>
        <span className="text-[10px] font-mono text-white-40">
          {result.scope}
        </span>
        {result.errorCode && (
          <span className="text-[10px] font-mono text-red-300/80">
            code {result.errorCode}
          </span>
        )}
      </div>
      <p className="text-xs text-white-60">{result.message}</p>
      <p className="text-[10px] font-mono text-white-30 break-all">
        {result.endpoint}
      </p>
      {result.metrics.length > 0 && (
        <p className="text-[10px] text-white-40">
          Metrics returned:{' '}
          <span className="text-white-60">{result.metrics.join(', ')}</span>
        </p>
      )}
    </div>
  );
}

function ScopeLine({
  label,
  scopes,
  required,
}: {
  label: string;
  scopes: string[];
  required: string;
}) {
  const has = scopes.includes(required);
  return (
    <p className="text-[11px] text-white-60">
      <span className="font-medium text-white-100">{label}:</span>{' '}
      <span className={has ? 'text-green-400' : 'text-amber-400'}>
        {has ? `includes ${required}` : `missing ${required}`}
      </span>
      <span className="text-white-30">
        {' '}
        (granted {scopes.length} scope{scopes.length === 1 ? '' : 's'})
      </span>
    </p>
  );
}
