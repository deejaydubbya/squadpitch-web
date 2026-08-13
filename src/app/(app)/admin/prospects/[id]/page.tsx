"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, ExternalLink, LoaderCircle, Sparkles, X } from "lucide-react";
import {
  useAdminProspect,
  usePrepareAdminProspect,
  useUpdateProspectPreview,
  type ProspectPreviewSelection,
} from "@/hooks/useAdmin";

export default function ProspectPreviewEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const prepare = usePrepareAdminProspect();
  const { data, isLoading, isFetching } = useAdminProspect(id);
  const update = useUpdateProspectPreview();
  const [selected, setSelected] = useState<ProspectPreviewSelection[]>([]);
  const [selectionDirty, setSelectionDirty] = useState(false);
  useEffect(() => {
    if (data?.selectedPreviewItems && !selectionDirty) {
      // The query is the source of truth after save/refetch; synchronize the editor draft.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(data.selectedPreviewItems);
    }
  }, [data, selectionDirty]);
  const candidates = data?.eligiblePreviewItems ?? [];
  const keys = new Set(selected.map((item) => `${item.itemType}:${item.id}`));
  const normalize = (items: ProspectPreviewSelection[]) =>
    items.map((item, sortOrder) => ({ ...item, sortOrder }));
  function toggle(item: { id: string; itemType: "DATA_ITEM" | "DRAFT" }) {
    const key = `${item.itemType}:${item.id}`;
    setSelected(
      normalize(
        keys.has(key)
          ? selected.filter((value) => `${value.itemType}:${value.id}` !== key)
          : [...selected, { ...item, sortOrder: selected.length }],
      ),
    );
    setSelectionDirty(true);
  }
  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= selected.length) return;
    const next = [...selected];
    [next[index], next[target]] = [next[target], next[index]];
    setSelected(normalize(next));
    setSelectionDirty(true);
  }

  if (isLoading)
    return <p className="text-white-50">Loading preview editor…</p>;
  if (!data)
    return <p className="text-red-300">Prospect workspace not found.</p>;
  const run = data.preparationRun;
  const preparationActive = run?.status === "QUEUED" || run?.status === "RUNNING";
  const fallbackCount = run ? Object.values(run.platformStates).filter((state) => state.status === "FALLBACK_ACCEPTED").length : 0;
  const platformStatus = (state: NonNullable<typeof run>["platformStates"][string]) => {
    if (state.status === "AI_ACCEPTED") return "AI generated [ok]";
    if (state.status === "FALLBACK_ACCEPTED") return "Safe fallback [warning]";
    if (state.status === "RETRYING") return `Retrying - attempt ${Math.min(state.attemptCount + 1, 3)} of 3`;
    if (state.status === "VALIDATING") return "Validating";
    if (state.status === "GENERATING") return `Generating - attempt ${state.attemptCount} of 3`;
    if (state.status === "FAILED") return "Failed";
    return "Not started";
  };
  const stageLabels: Record<string, string> = { QUEUED: "Waiting for a preparation worker", IMPORTING_LISTING: "Importing listing", ENRICHING: "Normalizing and enriching verified facts", PROCESSING_MEDIA: "Processing and classifying listing images", GENERATING: "Generating and validating social drafts", SELECTING: "Assigning media and finalizing campaign" };
  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/admin/prospects"
          className="text-sm text-white-50 underline"
        >
          Back to prospects
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white-100">
          Curate {data.businessName}
        </h1>
        <p className="mt-1 text-sm text-white-50">
          Only selected content is visible in the public prospect preview.
        </p>
      </header>
      <section className="rounded-2xl border border-white-10 bg-sp-card p-5">
        <h2 className="font-semibold text-white-90">Preview preparation</h2>
        {data.industryKey === "real_estate" && data.sourceUrl && (!run || run.status === "FAILED" || data.sourcePreparationState !== "IMPORTED" || preparationActive) && (
          <>
            <p className="mt-2 text-sm text-white-50">Import the supplied listing through Squadpitch&apos;s property pipeline, enrich known facts, and generate private property-specific drafts.</p>
            <button
              disabled={prepare.isPending || preparationActive}
              onClick={() => prepare.mutate({ id })}
              aria-describedby={preparationActive ? "authoritative-preparation-status" : undefined}
              className="btn mt-4 bg-accent-green-110 text-sp-bg disabled:cursor-wait disabled:opacity-80"
            >
              {prepare.isPending || preparationActive ? <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 inline h-4 w-4" />}
              {prepare.isPending || preparationActive ? "Preparation in progress..." : run?.status === "FAILED" ? "Retry preparation" : "Prepare sample content"}
            </button>
          </>
        )}
        {preparationActive && <div id="authoritative-preparation-status" aria-live="polite" className="mt-4 rounded-xl border border-accent-green-110/20 bg-accent-green-110/5 p-4"><p className="text-sm font-medium text-white-80">Preparing {data.businessName} preview</p><p className="mt-1 text-sm text-white-50">{run.readyCount} of {run.expectedCount} posts available{fallbackCount ? ` | ${fallbackCount} fallback` : ""}{isFetching ? " | Checking for updates..." : ""}</p><p className="mt-3 text-xs text-white-50"><LoaderCircle className="mr-1 inline h-3.5 w-3.5 animate-spin text-accent-green-110" /> {stageLabels[run.stage] ?? "Preparing campaign"}</p><div className="mt-3 space-y-1">{Object.entries(run.platformStates).map(([channel, state]) => <p key={channel} className="text-xs text-white-60">{channel.charAt(0) + channel.slice(1).toLowerCase()} | {platformStatus(state)}</p>)}</div></div>}
        {!preparationActive && run?.status === "COMPLETE" && <p className="mt-2 text-sm text-accent-green-110">Preparation complete. {run.readyCount} of {run.expectedCount} posts ready. Sample content is ready for review.</p>}
        {!preparationActive && run?.status === "COMPLETE_WITH_WARNINGS" && <div className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-100"><p>Preparation completed with warnings. {run.readyCount} of {run.expectedCount} posts ready.</p><p className="mt-1 text-xs">{run.warningCount} platform {run.warningCount === 1 ? "used a" : "used"} safe fallback after AI attempts were exhausted.</p></div>}
        {!preparationActive && run?.status === "FAILED" && <p role="alert" className="mt-3 text-sm text-red-300">Preparation failed. {run.failureMessage ?? "Retry when ready."}</p>}
        {!run && !prepare.isPending && data.preparationState === "READY_UNSELECTED" && <p className="mt-2 text-sm text-amber-200">Sample content is ready. Select what you want to show publicly below.</p>}
        {!run && !prepare.isPending && data.preparationState === "SELECTED" && <p className="mt-2 text-sm text-accent-green-110">Public preview content has been selected.</p>}
        {prepare.error && <p role="alert" className="mt-3 text-sm text-red-300">{prepare.error.message} Retry import, or add the property through the normal manual property flow after claim.</p>}
      </section>
      <section className="rounded-2xl border border-white-10 bg-sp-card p-5">
        <h2 className="font-semibold text-white-90">Selected and ordered</h2>
        {selected.length === 0 && (
          <p className="mt-3 rounded-lg border border-dashed border-white-15 p-4 text-sm text-white-40">
            Nothing selected. Prepare sample content above, then explicitly choose what the public preview may show.
          </p>
        )}
        <div className="mt-3 space-y-2">
          {selected.map((item, index) => {
            const candidate = candidates.find(
              (value) =>
                value.id === item.id && value.itemType === item.itemType,
            );
            return (
              <div
                key={`${item.itemType}:${item.id}`}
                className="flex items-center gap-2 rounded-lg bg-white-5 p-3"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-white-80">
                  {candidate?.title ?? "Unavailable — remove or replace"}
                </span>
                <button
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move preview item up"
                  className="grid min-h-11 min-w-11 place-items-center rounded bg-white-10 disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => move(index, 1)}
                  disabled={index === selected.length - 1}
                  aria-label="Move preview item down"
                  className="grid min-h-11 min-w-11 place-items-center rounded bg-white-10 disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggle(item)}
                  aria-label="Remove preview item"
                  className="grid min-h-11 min-w-11 place-items-center rounded bg-white-10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
        <h2 className="mt-6 font-semibold text-white-90">Eligible content</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {candidates.map((item) => {
            const included = keys.has(`${item.itemType}:${item.id}`);
            return (
              <button
                key={`${item.itemType}:${item.id}`}
                onClick={() => toggle(item)}
                className={`min-h-11 rounded-lg border p-3 text-left text-sm ${included ? "border-accent-green-110 bg-accent-green-110/10 text-white-90" : "border-white-10 text-white-60"}`}
              >
                <span className="block truncate">{item.title}</span>
                <span className="text-xs text-white-30">
                  {item.subtitle} · {included ? "Selected" : "Not selected"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            disabled={update.isPending}
            onClick={() =>
              update.mutate({
                id,
                items: selected.map(({ id: itemId, itemType }) => ({
                  id: itemId,
                  itemType,
                })),
              })
            }
            className="btn bg-accent-green-110 text-sp-bg"
          >
            {update.isPending ? "Saving…" : "Save preview selection"}
          </button>
          <span
            title="Rotate or copy a preview link from the prospect list"
            className="btn border border-white-15 text-white-40"
          >
            <ExternalLink className="mr-2 inline h-4 w-4" />
            Preview final result from issued link
          </span>
        </div>
        {update.isSuccess && (
          <p className="mt-3 text-sm text-accent-green-110">
            Preview selection saved.
          </p>
        )}
        {update.error && (
          <p role="alert" className="mt-3 text-sm text-red-300">
            {update.error.message}
          </p>
        )}
      </section>
    </div>
  );
}
