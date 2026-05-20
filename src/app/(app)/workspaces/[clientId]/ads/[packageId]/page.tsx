'use client';

// SquadAds detail / editor. Loads an AdPackage and lets the user
// inspect + edit the four child sections (creatives, audience,
// budget, destination), acknowledge review, mark ready, and export.
//
// On first load with ?autogenerate=1 (the wizard's hand-off) we
// kick off a generation if the package has no creatives yet. This
// keeps the wizard's submit fast — the AI work happens here, where
// we can show progress.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Loader2,
  Download,
  CheckCircle2,
  ImageIcon,
  RotateCw,
  X,
} from 'lucide-react';
import {
  useAdPackage,
  useGenerateAdPackage,
  useUpdateAdPackage,
  useUpdateAudience,
  useUpdateBudget,
  useUpdateDestination,
  useExportAdPackage,
  useUpsertCreative,
  type AdCreative,
  type AdExportResult,
  type AdPackageDetail,
} from '@/hooks/useAds';
import { ApiError } from '@/lib/apiFetch';
import { cn } from '@/lib/utils';
import { ExportPanel } from '../_components/ExportPanel';
import { SitePagePicker } from '../_components/SitePagePicker';
import { AssetPicker } from '../_components/AssetPicker';
import { useAssets, type MediaAsset } from '@/hooks/useSquadpitch';

export default function AdsDetailPage() {
  const params = useParams<{ clientId: string; packageId: string }>();
  const clientId = params.clientId;
  const packageId = params.packageId;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: pkg, isLoading, error } = useAdPackage(clientId, packageId);
  const generate = useGenerateAdPackage(clientId, packageId);
  const update = useUpdateAdPackage(clientId);
  const exportPkg = useExportAdPackage(clientId, packageId);

  // Auto-generate on first arrival from the wizard.
  const autogenAttempted = useRef(false);
  useEffect(() => {
    if (!pkg) return;
    if (autogenAttempted.current) return;
    if (searchParams.get('autogenerate') !== '1') return;
    if (pkg.creatives.length > 0) return;
    autogenAttempted.current = true;
    generate.mutate({ regenerate: 'all' });
    // Strip the param so a refresh doesn't re-fire.
    const next = new URLSearchParams(searchParams.toString());
    next.delete('autogenerate');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkg?.id]);

  // Ads-03 — keep the full export result (not just the string) so
  // the in-modal Download uses the server-issued filename + MIME
  // type instead of guessing `.txt`. The bundle is unused here but
  // future tabs (JSON tree view, etc.) can read it without a
  // second round-trip.
  const [exportResult, setExportResult] = useState<AdExportResult | null>(null);

  if (isLoading) {
    return (
      <div className="card p-8 text-sm text-white-50 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading ad package…
      </div>
    );
  }
  if (error || !pkg) {
    return (
      <div className="card p-8 text-sm text-white-50 space-y-3">
        <p>{error instanceof ApiError ? error.message : 'Ad package not found.'}</p>
        <Link
          href={`/workspaces/${clientId}/ads`}
          className="inline-flex items-center gap-1.5 text-xs text-accent-green-110"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to ad packages
        </Link>
      </div>
    );
  }

  const handleMarkReady = () => {
    update.mutate(
      { packageId: pkg.id, patch: { status: 'READY' } },
      {
        onError: () => {
          // Errors surface in the page via update.error.
        },
      },
    );
  };

  const handleAcknowledge = () => {
    update.mutate({ packageId: pkg.id, patch: { acknowledgeReview: true } });
  };

  // Ads-03 — preview opens the modal without mutating the package.
  // Download triggers the real export (status flip + history append)
  // and saves the bytes to disk using the server-issued filename
  // and MIME type. Keeping the two paths separate means a button
  // labelled "Preview" can never silently flip status.
  //
  // Ads-09 — `format` is now any registered exporter slug; the FE
  // doesn't enumerate them itself, the ExportPanel pulls the
  // catalog from /export-formats.
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const handlePreview = async (format: string) => {
    setExportingFormat(format);
    try {
      const res = await exportPkg.mutateAsync({ format, mode: 'preview' });
      setExportResult(res);
    } catch {
      // Falls through to errorBanner UI below.
    } finally {
      setExportingFormat(null);
    }
  };

  const handleDownload = async (format: string) => {
    setExportingFormat(format);
    try {
      const res = await exportPkg.mutateAsync({ format, mode: 'download' });
      saveExportToDisk(res);
      setExportResult(res);
    } catch {
      // Falls through to errorBanner UI below.
    } finally {
      setExportingFormat(null);
    }
  };

  const generating = generate.isPending;
  // Ads-09 — surface the API's checklist-style errors:
  // READY_PRECONDITIONS_FAILED carries `missing[]` (what to fix
  // before mark-ready), COMPLIANCE_COPY_REVIEW_FAILED carries
  // `findings[]` (which variant/field has risky language). Anything
  // else falls back to the flat message.
  const latestError =
    (update.error instanceof ApiError && update.error) ||
    (exportPkg.error instanceof ApiError && exportPkg.error) ||
    null;

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <Link
          href={`/workspaces/${clientId}/ads`}
          className="inline-flex items-center gap-1.5 text-xs text-white-50 hover:text-white-100 mb-2"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to ad packages
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white-100">{pkg.name}</h1>
            <p className="text-xs text-white-50 mt-0.5">
              {pkg.objective.toLowerCase()} · {pkg.status.toLowerCase()} ·{' '}
              {pkg.sourceType.toLowerCase().replace(/_/g, ' ')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {pkg.status === 'DRAFT' && (
              <>
                <button
                  type="button"
                  onClick={() => generate.mutate({ regenerate: 'all' })}
                  disabled={generating}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-white-15 text-white-80 hover:bg-white-10 inline-flex items-center gap-1.5"
                >
                  {generating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RotateCw className="w-3 h-3" />
                  )}
                  {pkg.creatives.length === 0
                    ? generating
                      ? 'Generating…'
                      : 'Generate'
                    : 'Regenerate all'}
                </button>
                <button
                  type="button"
                  onClick={handleMarkReady}
                  disabled={update.isPending}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent-green-110 text-sp-bg hover:bg-accent-green-100 inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Mark ready
                </button>
              </>
            )}
            {/*
              Ads-09 — export buttons moved into <ExportPanel/> below.
              The header keeps only the package-state actions (generate,
              mark-ready) so the export catalog can render with proper
              cards, badges, and disabled-with-reason states.
            */}
          </div>
        </div>
      </header>

      {latestError && <ReadinessErrorBanner error={latestError} />}

      {pkg.specialCategory !== 'NONE' && (
        <ComplianceBanner
          category={pkg.specialCategory}
          acknowledged={Boolean(pkg.reviewedAt)}
          onAcknowledge={handleAcknowledge}
          pending={update.isPending}
        />
      )}

      <NotLaunchedNotice />

      {pkg.sourceSummary && (
        <section className="card p-4 space-y-2">
          <h2 className="text-xs font-semibold text-white-40 uppercase tracking-wider">
            Source
          </h2>
          <SourceSummaryView summary={pkg.sourceSummary} />
        </section>
      )}

      <CreativesSection
        pkg={pkg}
        clientId={clientId}
        generating={generating}
        onGenerate={() => generate.mutate({ regenerate: 'all' })}
      />

      <AudienceSection pkg={pkg} clientId={clientId} />
      <BudgetSection pkg={pkg} clientId={clientId} />
      <DestinationSection pkg={pkg} clientId={clientId} />

      <ExportPanel
        clientId={clientId}
        pkg={pkg}
        exporting={exportPkg.isPending}
        exportingFormat={exportingFormat}
        onPreview={handlePreview}
        onDownload={handleDownload}
      />

      {pkg.reviewNotes && (
        <section className="card p-4 space-y-2">
          <h2 className="text-xs font-semibold text-white-40 uppercase tracking-wider">
            Compliance notes
          </h2>
          <p className="text-sm text-white-80 whitespace-pre-wrap leading-relaxed">
            {pkg.reviewNotes}
          </p>
        </section>
      )}

      {exportResult && (
        <ExportPreviewModal
          result={exportResult}
          isPreview={exportResult.mode !== 'download'}
          downloading={exportPkg.isPending}
          onClose={() => setExportResult(null)}
          onDownload={async () => {
            // Ads-09 — re-export in download mode using the exact
            // format slug the server echoed back. No more
            // ".md" → "markdown" guessing — works for every
            // exporter the registry exposes.
            const format = exportResult.format ?? 'squadads_json';
            await handleDownload(format);
          }}
        />
      )}
    </div>
  );
}

// ── Readiness error banner ─────────────────────────────────────────────

function ReadinessErrorBanner({ error }: { error: ApiError }) {
  const isReadiness = error.code === 'READY_PRECONDITIONS_FAILED';
  const isCompliance = error.code === 'COMPLIANCE_COPY_REVIEW_FAILED';
  const heading = isReadiness
    ? 'Fix these before marking the package Ready'
    : isCompliance
      ? 'Compliance review — protected-class language flagged'
      : 'Action needed';

  return (
    <div className="card p-3 text-xs text-amber-200 bg-amber-400/5 border-amber-400/30 space-y-2">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-semibold text-amber-100">{heading}</p>
          {!isReadiness && !isCompliance && (
            <p className="mt-0.5 text-amber-200/90">{error.message}</p>
          )}
        </div>
      </div>
      {isReadiness && Array.isArray(error.missing) && error.missing.length > 0 && (
        <ul className="list-disc list-inside space-y-0.5 pl-1 text-amber-200/90">
          {error.missing.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
      {isCompliance && Array.isArray(error.findings) && error.findings.length > 0 && (
        <ul className="list-disc list-inside space-y-0.5 pl-1 text-amber-200/90">
          {error.findings.map((f, i) => (
            <li key={`${f.variantIndex ?? '?'}-${f.field ?? '?'}-${f.phrase ?? i}`}>
              {f.variantIndex != null && (
                <span className="font-semibold">Variant {f.variantIndex}</span>
              )}
              {f.field && <> · <code className="text-amber-100">{f.field}</code></>}
              {f.phrase && <> · phrase: <em>&ldquo;{f.phrase}&rdquo;</em></>}
              {f.reason && <> — {f.reason}</>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Ads-03 — turn the server's export result into a real save-as
// using the issued filename + MIME type. Previously this was a
// hard-coded `.txt` Blob which mis-labelled JSON / Markdown
// downloads and made them open in the wrong editor.
function saveExportToDisk(res: AdExportResult) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([res.content], { type: res.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = res.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Compliance banner ──────────────────────────────────────────────────

function ComplianceBanner({
  category,
  acknowledged,
  onAcknowledge,
  pending,
}: {
  category: string;
  acknowledged: boolean;
  onAcknowledge: () => void;
  pending: boolean;
}) {
  return (
    <div className="card p-4 bg-amber-400/5 border-amber-400/30 space-y-2">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-200 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-amber-100">
            Special Ad Category: {category.toLowerCase()}
          </h2>
          <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
            Squadpitch has cleared demographic targeting (age 18–65, all
            genders, no ZIP-only locations) to comply with Fair Housing /
            special-category rules. You&apos;ll need to mark the campaign
            as <strong>{category}</strong> in Meta Ads Manager when you
            launch it yourself.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onAcknowledge}
        disabled={pending || acknowledged}
        className={cn(
          'text-[11px] font-medium px-2.5 py-1 rounded inline-flex items-center gap-1.5',
          acknowledged
            ? 'bg-amber-400/15 text-amber-100 cursor-default'
            : 'bg-amber-400/20 text-amber-100 hover:bg-amber-400/30',
        )}
      >
        <CheckCircle2 className="w-3 h-3" />
        {acknowledged ? 'Reviewed' : 'I understand'}
      </button>
    </div>
  );
}

// ── Not-launched notice ────────────────────────────────────────────────

function NotLaunchedNotice() {
  return (
    <div className="text-[11px] text-white-50 leading-snug px-1">
      <Sparkles className="w-3 h-3 inline-block mr-1 text-accent-green-110 align-text-bottom" />
      Squadpitch does not launch ads. Exports include copy, targeting
      suggestions, budget suggestions, destination URLs, and setup notes —
      your team copies them into Ads Manager, Google Ads, TikTok Ads, or
      hands them to a paid-media specialist.
    </div>
  );
}

// ── Source summary ─────────────────────────────────────────────────────

function SourceSummaryView({ summary }: { summary: AdPackageDetail['sourceSummary'] }) {
  if (!summary) return null;
  const label =
    summary.name ||
    summary.title ||
    summary.text?.slice(0, 200) ||
    summary.id ||
    '(unknown)';
  const meta = summary.campaignType || summary.type || summary.channel || summary.slug;
  return (
    <div>
      <p className="text-sm text-white-90 truncate">{label}</p>
      {meta && (
        <p className="text-[11px] text-white-50 uppercase tracking-wider mt-0.5">
          {meta}
        </p>
      )}
      {summary.bodyPreview && (
        <p className="text-xs text-white-60 mt-1 leading-relaxed">
          {summary.bodyPreview}
        </p>
      )}
    </div>
  );
}

// ── Creatives ──────────────────────────────────────────────────────────

function CreativesSection({
  pkg,
  clientId,
  generating,
  onGenerate,
}: {
  pkg: AdPackageDetail;
  clientId: string;
  generating: boolean;
  onGenerate: () => void;
}) {
  const [activeVariant, setActiveVariant] = useState(
    pkg.creatives[0]?.variantIndex ?? 1,
  );
  const upsert = useUpsertCreative(clientId, pkg.id);
  const active = pkg.creatives.find((c) => c.variantIndex === activeVariant);

  if (pkg.creatives.length === 0) {
    return (
      <section className="card p-6 text-center space-y-3">
        <Sparkles className="w-7 h-7 mx-auto text-accent-green-110" />
        <h2 className="text-sm font-semibold text-white-90">No creatives yet</h2>
        <p className="text-xs text-white-50 max-w-prose mx-auto">
          Click Generate to produce 2–3 copy variants, an audience suggestion,
          and a budget recommendation based on your source.
        </p>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent-green-110 text-sp-bg hover:bg-accent-green-100 inline-flex items-center gap-1.5"
        >
          {generating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          {generating ? 'Generating…' : 'Generate'}
        </button>
      </section>
    );
  }

  return (
    <section className="card p-4 space-y-3">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xs font-semibold text-white-40 uppercase tracking-wider">
          Creatives ({pkg.creatives.length})
        </h2>
        <div className="flex items-center gap-1 flex-wrap">
          {pkg.creatives.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveVariant(c.variantIndex)}
              className={cn(
                'text-xs font-medium px-2.5 py-1 rounded border transition-colors',
                activeVariant === c.variantIndex
                  ? 'bg-accent-green-110/15 text-accent-green-110 border-accent-green-110/30'
                  : 'border-white-10 text-white-60 hover:border-white-20',
              )}
            >
              Variant {c.variantIndex}
            </button>
          ))}
        </div>
      </header>

      {active && (
        <CreativeEditor
          creative={active}
          clientId={clientId}
          onSave={(input) => upsert.mutate(input)}
          pending={upsert.isPending}
        />
      )}
    </section>
  );
}

function CreativeEditor({
  creative,
  clientId,
  onSave,
  pending,
}: {
  creative: AdCreative;
  clientId: string;
  onSave: (input: {
    variantIndex: number;
    headline: string;
    primaryText: string;
    description?: string | null;
    cta?: string | null;
    primaryAssetId?: string | null;
    additionalAssetIds?: string[];
    rationale?: string | null;
  }) => void;
  pending: boolean;
}) {
  const [headline, setHeadline] = useState(creative.headline);
  const [primaryText, setPrimaryText] = useState(creative.primaryText);
  const [description, setDescription] = useState(creative.description ?? '');
  const [cta, setCta] = useState(creative.cta ?? '');
  // Ads-10 — asset picker state. We round-trip these alongside the
  // text fields on Save so the user can adjust copy + assets in
  // one motion.
  const [primaryAssetId, setPrimaryAssetId] = useState<string | null>(
    creative.primaryAssetId,
  );
  const [additionalAssetIds, setAdditionalAssetIds] = useState<string[]>(
    creative.additionalAssetIdsJson ?? [],
  );
  const [pickerMode, setPickerMode] = useState<'primary' | 'additional' | null>(null);

  // Re-sync when the user switches variants.
  useEffect(() => {
    setHeadline(creative.headline);
    setPrimaryText(creative.primaryText);
    setDescription(creative.description ?? '');
    setCta(creative.cta ?? '');
    setPrimaryAssetId(creative.primaryAssetId);
    setAdditionalAssetIds(creative.additionalAssetIdsJson ?? []);
  }, [creative.id]);

  // Pull every asset in the workspace once so we can render
  // thumbnails for already-attached ids. Cached by useAssets so
  // switching variants doesn't refetch. Backend re-validates on
  // upsert; this is purely for display.
  const { data: allAssets } = useAssets(clientId, { status: 'READY', limit: 500 });
  const assetsById = useMemo(() => {
    const m = new Map<string, MediaAsset>();
    for (const a of allAssets ?? []) m.set(a.id, a);
    return m;
  }, [allAssets]);

  const arraysEqual = (a: string[], b: string[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]);

  const dirty =
    headline !== creative.headline ||
    primaryText !== creative.primaryText ||
    (description ?? '') !== (creative.description ?? '') ||
    (cta ?? '') !== (creative.cta ?? '') ||
    primaryAssetId !== creative.primaryAssetId ||
    !arraysEqual(additionalAssetIds, creative.additionalAssetIdsJson ?? []);

  return (
    <div className="space-y-3">
      <Field label="Headline">
        <input
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          maxLength={400}
          className="w-full bg-white-5 border border-white-10 rounded-lg px-3 py-2 text-sm text-white-90 focus:outline-none focus:border-white-30"
        />
      </Field>
      <Field label="Primary text">
        <textarea
          value={primaryText}
          onChange={(e) => setPrimaryText(e.target.value)}
          rows={4}
          maxLength={4000}
          className="w-full bg-white-5 border border-white-10 rounded-lg px-3 py-2 text-sm text-white-90 focus:outline-none focus:border-white-30 resize-none"
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Description (optional)">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            className="w-full bg-white-5 border border-white-10 rounded-lg px-3 py-2 text-sm text-white-90 focus:outline-none focus:border-white-30"
          />
        </Field>
        <Field label="CTA">
          <input
            type="text"
            value={cta}
            onChange={(e) => setCta(e.target.value)}
            maxLength={80}
            placeholder="Learn More / Schedule Tour / etc."
            className="w-full bg-white-5 border border-white-10 rounded-lg px-3 py-2 text-sm text-white-90 placeholder:text-white-40 focus:outline-none focus:border-white-30"
          />
        </Field>
      </div>

      {/* Ads-10 — asset attachment. Primary (single) + additional
          (multi). Backend tenant-validates each id on upsert; UI
          only shows assets from this workspace. */}
      <Field label="Primary asset">
        <PrimaryAssetSlot
          assetsById={assetsById}
          assetId={primaryAssetId}
          onPick={() => setPickerMode('primary')}
          onClear={() => setPrimaryAssetId(null)}
        />
      </Field>

      <Field label="Additional assets (optional)">
        <AdditionalAssetGrid
          assetsById={assetsById}
          ids={additionalAssetIds}
          onAdd={() => setPickerMode('additional')}
          onRemove={(id) =>
            setAdditionalAssetIds((prev) => prev.filter((x) => x !== id))
          }
        />
      </Field>

      {creative.rationale && (
        <p className="text-[11px] text-white-50 italic leading-snug">
          <Sparkles className="w-3 h-3 inline-block mr-1 text-accent-green-110 align-text-bottom" />
          {creative.rationale}
        </p>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() =>
            onSave({
              variantIndex: creative.variantIndex,
              headline,
              primaryText,
              description: description.trim() || null,
              cta: cta.trim() || null,
              primaryAssetId,
              additionalAssetIds,
            })
          }
          disabled={!dirty || pending}
          className={cn(
            'text-xs font-medium px-3 py-1.5 rounded-lg border border-white-15 text-white-80 hover:bg-white-10',
            (!dirty || pending) && 'opacity-50 cursor-not-allowed',
          )}
        >
          {pending ? 'Saving…' : dirty ? 'Save variant' : 'Saved'}
        </button>
      </div>

      {pickerMode && (
        <AssetPicker
          clientId={clientId}
          mode={pickerMode}
          excludeIds={
            pickerMode === 'primary'
              ? primaryAssetId
                ? [primaryAssetId]
                : []
              : additionalAssetIds
          }
          onClose={() => setPickerMode(null)}
          onSelect={(a) => {
            if (pickerMode === 'primary') {
              setPrimaryAssetId(a.id);
            } else {
              setAdditionalAssetIds((prev) =>
                prev.includes(a.id) ? prev : [...prev, a.id],
              );
            }
          }}
        />
      )}
    </div>
  );
}

function PrimaryAssetSlot({
  assetsById,
  assetId,
  onPick,
  onClear,
}: {
  assetsById: Map<string, MediaAsset>;
  assetId: string | null;
  onPick: () => void;
  onClear: () => void;
}) {
  const asset = assetId ? assetsById.get(assetId) ?? null : null;

  if (!assetId) {
    return (
      <div className="rounded-lg border border-dashed border-white-15 bg-white-5 px-3 py-3 space-y-2">
        <p className="text-[11px] text-white-50 leading-snug">
          <AlertCircle className="w-3 h-3 inline-block mr-1 text-amber-200 align-text-bottom" />
          No primary asset attached — you can still mark this package Ready,
          but you&apos;ll need to upload the creative manually in the ad
          platform when you launch.
        </p>
        <button
          type="button"
          onClick={onPick}
          className="text-xs font-medium px-2.5 py-1 rounded-md border border-white-15 text-white-80 hover:bg-white-10 inline-flex items-center gap-1.5"
        >
          <ImageIcon className="w-3 h-3" /> Pick from library
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white-10 bg-white-5 p-2 flex items-center gap-3">
      <AssetThumb asset={asset} idFallback={assetId} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-white-90 truncate">
          {asset?.filename ?? assetId}
        </p>
        <p className="text-[10px] text-white-50 truncate">
          {assetMetaLine(asset)}
        </p>
        {asset?.altText && (
          <p className="text-[10px] text-white-40 truncate italic">
            {asset.altText}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onPick}
          className="text-[11px] font-medium px-2 py-1 rounded border border-white-15 text-white-80 hover:bg-white-10"
        >
          Replace
        </button>
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] font-medium px-2 py-1 rounded text-white-50 hover:text-white-100"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

function AdditionalAssetGrid({
  assetsById,
  ids,
  onAdd,
  onRemove,
}: {
  assetsById: Map<string, MediaAsset>;
  ids: string[];
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {ids.length === 0 ? (
        <p className="text-[11px] text-white-50 italic leading-snug">
          None attached — useful for carousel ads or alternate-aspect uploads.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {ids.map((id) => {
            const a = assetsById.get(id) ?? null;
            return (
              <li
                key={id}
                className="relative rounded-lg border border-white-10 bg-white-5 overflow-hidden w-20"
              >
                <AssetThumb asset={a} idFallback={id} small />
                <button
                  type="button"
                  onClick={() => onRemove(id)}
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white-100 rounded p-0.5 hover:bg-black/80"
                  aria-label="Remove asset"
                  title="Remove"
                >
                  <X className="w-3 h-3" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={onAdd}
        className="text-xs font-medium px-2.5 py-1 rounded-md border border-white-15 text-white-80 hover:bg-white-10 inline-flex items-center gap-1.5"
      >
        <ImageIcon className="w-3 h-3" /> Add asset
      </button>
    </div>
  );
}

function AssetThumb({
  asset,
  idFallback,
  small = false,
}: {
  asset: MediaAsset | null;
  idFallback: string;
  small?: boolean;
}) {
  const previewUrl = asset?.thumbnailUrl || asset?.url || null;
  const sizeClass = small ? 'w-20 h-20' : 'w-14 h-14';
  if (previewUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={previewUrl}
        alt={asset?.altText ?? asset?.filename ?? ''}
        className={cn(sizeClass, 'object-cover rounded')}
      />
    );
  }
  return (
    <div
      className={cn(
        sizeClass,
        'rounded bg-white-10 flex items-center justify-center text-white-40',
      )}
      title={asset?.id ?? idFallback}
    >
      <ImageIcon className="w-4 h-4" />
    </div>
  );
}

function assetMetaLine(a: MediaAsset | null): string {
  if (!a) return 'Asset not in this workspace (resolves on next refresh)';
  const parts: string[] = [];
  if (a.assetType) parts.push(a.assetType);
  if (a.width && a.height) parts.push(`${a.width}×${a.height}`);
  if (a.mimeType) parts.push(a.mimeType);
  if (a.videoDurationSec) parts.push(`${a.videoDurationSec}s`);
  return parts.join(' · ') || a.id;
}

// ── Audience ───────────────────────────────────────────────────────────

function AudienceSection({
  pkg,
  clientId,
}: {
  pkg: AdPackageDetail;
  clientId: string;
}) {
  const update = useUpdateAudience(clientId, pkg.id);
  const a = pkg.audience;
  const [interests, setInterests] = useState(a?.interestsJson?.join(', ') ?? '');
  const [locations, setLocations] = useState(
    a?.locationsJson?.map((l) => `${l.kind}:${l.value}`).join(', ') ?? '',
  );

  useEffect(() => {
    setInterests(a?.interestsJson?.join(', ') ?? '');
    setLocations(
      a?.locationsJson?.map((l) => `${l.kind}:${l.value}`).join(', ') ?? '',
    );
  }, [a?.id]);

  const handleSave = () => {
    const locationList = locations
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [kind, ...rest] = s.split(':');
        const value = rest.join(':').trim();
        return value && ['country', 'region', 'city', 'postal'].includes(kind)
          ? { kind: kind as 'country' | 'region' | 'city' | 'postal', value }
          : null;
      })
      .filter(Boolean) as { kind: 'country' | 'region' | 'city' | 'postal'; value: string }[];
    const interestList = interests
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    update.mutate({ locations: locationList, interests: interestList });
  };

  return (
    <section className="card p-4 space-y-3">
      <header>
        <h2 className="text-xs font-semibold text-white-40 uppercase tracking-wider">
          Audience
        </h2>
      </header>
      {a?.housingRestricted && (
        <p className="text-[11px] text-amber-200/80 leading-snug">
          <AlertCircle className="w-3 h-3 inline-block mr-1 align-text-bottom" />
          Demographic targeting is restricted under {pkg.specialCategory.toLowerCase()}{' '}
          Special Ad Category rules. Age fixed at 18–65, genders set to all.
        </p>
      )}
      <Field label="Locations (kind:value, comma-separated)">
        <input
          type="text"
          value={locations}
          onChange={(e) => setLocations(e.target.value)}
          placeholder="city:Cary NC, region:Wake County, country:US"
          className="w-full bg-white-5 border border-white-10 rounded-lg px-3 py-2 text-sm text-white-90 placeholder:text-white-40 focus:outline-none focus:border-white-30"
        />
      </Field>
      <Field label="Interests (comma-separated)">
        <input
          type="text"
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          placeholder="home buying, real estate, relocation"
          className="w-full bg-white-5 border border-white-10 rounded-lg px-3 py-2 text-sm text-white-90 placeholder:text-white-40 focus:outline-none focus:border-white-30"
        />
      </Field>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={update.isPending}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-white-15 text-white-80 hover:bg-white-10"
        >
          {update.isPending ? 'Saving…' : 'Save audience'}
        </button>
      </div>
    </section>
  );
}

// ── Budget ─────────────────────────────────────────────────────────────

function BudgetSection({ pkg, clientId }: { pkg: AdPackageDetail; clientId: string }) {
  const update = useUpdateBudget(clientId, pkg.id);
  const b = pkg.budget;
  const [daily, setDaily] = useState(
    b?.dailyBudgetCents != null ? String(b.dailyBudgetCents / 100) : '',
  );
  const [duration, setDuration] = useState(b?.durationDays != null ? String(b.durationDays) : '');

  useEffect(() => {
    setDaily(b?.dailyBudgetCents != null ? String(b.dailyBudgetCents / 100) : '');
    setDuration(b?.durationDays != null ? String(b.durationDays) : '');
  }, [b?.id]);

  const handleSave = () => {
    const cents = Number.isFinite(parseFloat(daily))
      ? Math.round(parseFloat(daily) * 100)
      : null;
    const days = Number.isFinite(parseInt(duration, 10)) ? parseInt(duration, 10) : null;
    update.mutate({
      dailyBudgetCents: cents,
      durationDays: days,
    });
  };

  return (
    <section className="card p-4 space-y-3">
      <header>
        <h2 className="text-xs font-semibold text-white-40 uppercase tracking-wider">
          Budget
        </h2>
        {b?.suggestedDailyBudgetCents != null && (
          <p className="text-[11px] text-white-50 mt-1">
            Suggested: ${(b.suggestedDailyBudgetCents / 100).toFixed(0)} / day{' '}
            {b.suggestedTotalBudgetCents != null &&
              `(total ~$${(b.suggestedTotalBudgetCents / 100).toFixed(0)})`}
          </p>
        )}
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Daily budget (USD)">
          <input
            type="number"
            min="0"
            step="1"
            value={daily}
            onChange={(e) => setDaily(e.target.value)}
            placeholder="50"
            className="w-full bg-white-5 border border-white-10 rounded-lg px-3 py-2 text-sm text-white-90 placeholder:text-white-40 focus:outline-none focus:border-white-30"
          />
        </Field>
        <Field label="Duration (days)">
          <input
            type="number"
            min="1"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="14"
            className="w-full bg-white-5 border border-white-10 rounded-lg px-3 py-2 text-sm text-white-90 placeholder:text-white-40 focus:outline-none focus:border-white-30"
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={update.isPending}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-white-15 text-white-80 hover:bg-white-10"
        >
          {update.isPending ? 'Saving…' : 'Save budget'}
        </button>
      </div>
    </section>
  );
}

// ── Destination ────────────────────────────────────────────────────────

function DestinationSection({
  pkg,
  clientId,
}: {
  pkg: AdPackageDetail;
  clientId: string;
}) {
  const update = useUpdateDestination(clientId, pkg.id);
  const d = pkg.destination;
  const preview = pkg.destinationPreview;
  const [kind, setKind] = useState(d?.kind ?? 'EXTERNAL_URL');
  const [externalUrl, setExternalUrl] = useState(d?.externalUrl ?? '');
  const [social, setSocial] = useState(d?.socialProfile ?? '');
  const [sitePageId, setSitePageId] = useState(d?.sitePageId ?? '');

  useEffect(() => {
    setKind(d?.kind ?? 'EXTERNAL_URL');
    setExternalUrl(d?.externalUrl ?? '');
    setSocial(d?.socialProfile ?? '');
    setSitePageId(d?.sitePageId ?? '');
  }, [d?.id]);

  const handleSave = () => {
    update.mutate({
      kind,
      sitePageId: kind === 'SITE_PAGE' ? sitePageId || null : null,
      externalUrl: kind === 'EXTERNAL_URL' ? externalUrl || null : null,
      socialProfile: kind === 'SOCIAL_PROFILE' ? social || null : null,
    });
  };

  return (
    <section className="card p-4 space-y-3">
      <header>
        <h2 className="text-xs font-semibold text-white-40 uppercase tracking-wider">
          Destination
        </h2>
      </header>
      <div className="flex flex-wrap gap-1">
        {(['SITE_PAGE', 'EXTERNAL_URL', 'SOCIAL_PROFILE'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn(
              'text-xs font-medium px-2.5 py-1 rounded border',
              kind === k
                ? 'bg-accent-green-110/15 text-accent-green-110 border-accent-green-110/30'
                : 'border-white-10 text-white-60 hover:border-white-20',
            )}
          >
            {k === 'SITE_PAGE'
              ? 'SquadSite page'
              : k === 'EXTERNAL_URL'
                ? 'External URL'
                : 'Social profile'}
          </button>
        ))}
      </div>
      {kind === 'SITE_PAGE' && (
        <>
          {/*
            Ads-09 — replaced the raw "paste a site page id" input with
            a real picker. Lists every page in the workspace with title,
            slug, and a status pill so the user can tell published from
            draft at a glance.
          */}
          <SitePagePicker
            clientId={clientId}
            selectedId={sitePageId || null}
            onSelect={(id) => setSitePageId(id ?? '')}
          />
          {preview?.resolvedUrl && (
            <div className="text-[11px] text-white-50 leading-snug">
              <span className="text-white-40">Will export as:</span>{' '}
              <a
                href={preview.resolvedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent-green-110 hover:text-accent-green-100 break-all"
              >
                {preview.resolvedUrl}
              </a>
            </div>
          )}
          {preview?.warning && (
            <div className="flex items-start gap-2 text-[11px] text-amber-200 bg-amber-400/5 border border-amber-400/30 rounded-lg px-2.5 py-2">
              <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
              <span>{preview.warning}</span>
            </div>
          )}
        </>
      )}
      {kind === 'EXTERNAL_URL' && (
        <Field label="URL">
          <input
            type="url"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://example.com/landing"
            className="w-full bg-white-5 border border-white-10 rounded-lg px-3 py-2 text-sm text-white-90 placeholder:text-white-40 focus:outline-none focus:border-white-30"
          />
        </Field>
      )}
      {kind === 'SOCIAL_PROFILE' && (
        <Field label="Social profile (e.g. instagram:smithrealty)">
          <input
            type="text"
            value={social}
            onChange={(e) => setSocial(e.target.value)}
            placeholder="instagram:smithrealty"
            className="w-full bg-white-5 border border-white-10 rounded-lg px-3 py-2 text-sm text-white-90 placeholder:text-white-40 focus:outline-none focus:border-white-30"
          />
        </Field>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={update.isPending}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-white-15 text-white-80 hover:bg-white-10"
        >
          {update.isPending ? 'Saving…' : 'Save destination'}
        </button>
      </div>
    </section>
  );
}

// ── Export preview modal ───────────────────────────────────────────────

function ExportPreviewModal({
  result,
  isPreview,
  downloading,
  onClose,
  onDownload,
}: {
  result: AdExportResult;
  isPreview: boolean;
  downloading: boolean;
  onClose: () => void;
  onDownload: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-sp-bg border border-white-15 rounded-2xl max-w-3xl w-full max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white-10 gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white-100">
              {isPreview ? 'Export preview' : 'Exported'}
            </h2>
            <p className="text-[11px] text-white-50 mt-0.5 truncate">
              {result.filename} · {result.mimeType.split(';')[0]}
              {isPreview && ' · not yet marked as exported'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isPreview ? (
              <button
                type="button"
                onClick={onDownload}
                disabled={downloading}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent-green-110 text-sp-bg hover:bg-accent-green-100 inline-flex items-center gap-1.5 disabled:opacity-50"
                title="Download the bundle and mark this package as exported"
              >
                <Download className="w-3 h-3" />
                {downloading ? 'Downloading…' : 'Download'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onDownload}
                disabled={downloading}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-white-15 text-white-80 hover:bg-white-10 inline-flex items-center gap-1.5 disabled:opacity-50"
                title="Re-download the exported bundle"
              >
                <Download className="w-3 h-3" />
                {downloading ? 'Downloading…' : 'Download again'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-white-60 hover:text-white-100 hover:bg-white-10"
            >
              Close
            </button>
          </div>
        </div>
        <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-white-80 whitespace-pre-wrap leading-relaxed">
          {result.content}
        </pre>
      </div>
    </div>
  );
}

// ── Pieces ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-white-70 space-y-1.5">
      <span>{label}</span>
      {children}
    </label>
  );
}
