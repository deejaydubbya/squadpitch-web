"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { ExternalLink, LoaderCircle, Mail, Pause, Play, RefreshCw, Search, Settings, Square } from "lucide-react";
import { useAgentOutreach, useAnalyzeAgentSource, useCreateSendingAccount, useDeleteSendingAccount, useDiscoverAgents, useGenerateOutreachPreview, usePauseDiscovery, usePrepareOutreachEmail, useResumeDiscovery, useSendOutreachEmail, useStopDiscovery, useTestSendingAccount, useUpdateOutreachTemplate, useUpdateSendingAccount, type AgentOutreachProspect, type AgentOutreachData, type DiscoveryAnalysis } from "@/hooks/useAdmin";
import { groupDiscoveryProspects, type DiscoveryCategory } from "./prospectCategories";

const tabs = ["Discover Agents", "Preview Queue", "Ready for Email", "Outreach"] as const;
type Tab = (typeof tabs)[number];

export default function AgentOutreachPage() {
  const { data, isLoading } = useAgentOutreach();
  const discover = useDiscoverAgents(),
    generate = useGenerateOutreachPreview(),
    prepare = usePrepareOutreachEmail(),
    send = useSendOutreachEmail();
  const [tab, setTab] = useState<Tab>("Discover Agents");
  const [discoveryView, setDiscoveryView] = useState<DiscoveryCategory>("qualified");
  const [selected, setSelected] = useState<string[]>([]);
  const [settings, setSettings] = useState(false);
  const [batchPaused, setBatchPaused] = useState(false);
  const [sendingAccountId, setSendingAccountId] = useState("");
  const batchPausedRef = useRef(false);
  const prospects = useMemo(() => data?.prospects ?? [], [data?.prospects]);
  const discoveryGroups = useMemo(() => groupDiscoveryProspects(prospects), [prospects]);
  const visible = useMemo(() => (tab === "Discover Agents" ? discoveryGroups[discoveryView] : prospects.filter((p) => (tab === "Preview Queue" ? ["QUALIFIED", "PREVIEW_PENDING", "PREVIEW_GENERATING", "PREVIEW_FAILED"].includes(p.status) : tab === "Ready for Email" ? ["READY_TO_EMAIL", "EMAIL_FAILED"].includes(p.status) : ["EMAIL_QUEUED", "EMAIL_SENDING", "EMAIL_SENT", "UNCLAIMED", "CLAIMED", "BOUNCED", "UNSUBSCRIBED", "EMAIL_FAILED"].includes(p.status)))), [discoveryGroups, discoveryView, prospects, tab]);

  async function batch(action: "preview" | "email") {
    setBatchPaused(false);
    batchPausedRef.current = false;
    const rows = (selected.length ? prospects.filter((p) => selected.includes(p.id)) : visible).filter((p) => (action === "preview" ? ["QUALIFIED", "PREVIEW_PENDING", "PREVIEW_FAILED"].includes(p.status) : ["READY_TO_EMAIL", "EMAIL_FAILED"].includes(p.status)));
    for (const row of rows) {
      if (batchPausedRef.current) break;
      if (action === "preview") await generate.mutateAsync({ id: row.id });
      else {
        const accountId = sendingAccountId || row.sendingAccountId || data?.accounts.find((a) => a.isDefault)?.id;
        await prepare.mutateAsync({
          id: row.id,
          body: { sendingAccountId: accountId },
        });
        await send.mutateAsync({
          id: row.id,
          body: { sendingAccountId: accountId },
        });
      }
    }
    setSelected([]);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white-100">Agent Outreach</h1>
          <p className="mt-1 text-sm text-white-40">Discover qualified agents, prepare claimable previews, and send controlled outreach.</p>
        </div>
        <button onClick={() => setSettings(!settings)} className="btn inline-flex items-center gap-2 bg-white-10 text-white-80">
          <Settings className="h-4 w-4" />
          Sending Accounts
        </button>
      </header>
      {settings && <SendingAccounts accounts={data?.accounts ?? []} />}
      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-white-10 bg-sp-card p-1">
        {tabs.map((name) => (
          <button key={name} onClick={() => setTab(name)} className={`min-h-11 whitespace-nowrap rounded-lg px-4 text-sm font-medium ${tab === name ? "bg-accent-green-110 text-sp-bg" : "text-white-50 hover:bg-white-5"}`}>
            {name}
          </button>
        ))}
      </nav>
      {tab === "Discover Agents" && (
        <>
          <DiscoveryPanel runs={data?.runs ?? []} pending={discover.isPending} onStart={(body) => discover.mutate({ body })} />
          <DiscoveryViews
            active={discoveryView}
            groups={discoveryGroups}
            onChange={(view) => {
              setDiscoveryView(view);
              setSelected([]);
            }}
          />
        </>
      )}
      {tab === "Ready for Email" && data?.template && <EmailTemplateEditor template={data.template} />}
      {(tab === "Preview Queue" || tab === "Ready for Email") && (
        <div className="flex flex-wrap gap-2">
          {tab === "Ready for Email" && (
            <select aria-label="Sending account" value={sendingAccountId} onChange={(e) => setSendingAccountId(e.target.value)} className="min-h-11 rounded-lg border border-white-10 bg-sp-bg px-3 text-white-100">
              <option value="">Default sending account</option>
              {data?.accounts
                .filter((a) => a.enabled)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.displayName} &lt;{a.fromEmail}&gt;
                  </option>
                ))}
            </select>
          )}
          <button onClick={() => batch(tab === "Preview Queue" ? "preview" : "email")} disabled={!visible.length} className="btn bg-accent-green-110 text-sp-bg">
            {tab === "Preview Queue" ? "Generate Selected / All Qualified" : "Send Selected / All Ready"}
          </button>
          <button
            onClick={() => {
              batchPausedRef.current = true;
              setBatchPaused(true);
            }}
            className="btn inline-flex items-center gap-2 bg-white-10"
          >
            <Pause className="h-4 w-4" />
            Pause
          </button>
          <button
            onClick={() => {
              batchPausedRef.current = false;
              setBatchPaused(false);
              batch(tab === "Preview Queue" ? "preview" : "email");
            }}
            className="btn inline-flex items-center gap-2 bg-white-10"
          >
            <Play className="h-4 w-4" />
            Resume
          </button>
          <button
            onClick={() => {
              batchPausedRef.current = true;
              setBatchPaused(true);
              setSelected([]);
            }}
            className="btn inline-flex items-center gap-2 bg-white-10"
          >
            <Square className="h-4 w-4" />
            Stop
          </button>
          {batchPaused && <span className="self-center text-xs text-amber-200">Batch paused</span>}
        </div>
      )}
      <ProspectTable
        rows={visible}
        loading={isLoading}
        selected={selected}
        setSelected={setSelected}
        allowSelection={tab !== "Discover Agents" || discoveryView === "qualified"}
        allowPreview={tab !== "Discover Agents" || discoveryView === "qualified"}
        allowRegenerate={tab === "Ready for Email"}
        allowPipelineActions={tab !== "Discover Agents"}
        showLastVerified={tab === "Discover Agents" && discoveryView === "rejected"}
        onGenerate={(id) => generate.mutate({ id })}
        onPrepare={(id) =>
          prepare.mutate({
            id,
            body: {
              sendingAccountId: sendingAccountId || data?.accounts.find((a) => a.isDefault)?.id,
            },
          })
        }
        onSend={(id) =>
          send.mutate({
            id,
            body: {
              sendingAccountId: sendingAccountId || data?.accounts.find((a) => a.isDefault)?.id,
            },
          })
        }
      />
    </div>
  );
}

function DiscoveryViews({ active, groups, onChange }: { active: DiscoveryCategory; groups: ReturnType<typeof groupDiscoveryProspects>; onChange: (view: DiscoveryCategory) => void }) {
  const views: Array<[DiscoveryCategory, string]> = [
    ["qualified", "Qualified"],
    ["rejected", "Rejected"],
    ["alreadyTargeted", "Already Targeted"],
  ];
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Discovery results">
      {views.map(([key, label]) => (
        <button key={key} type="button" role="tab" aria-selected={active === key} onClick={() => onChange(key)} className={`min-h-10 rounded-lg border px-3 text-sm font-medium ${active === key ? "border-accent-green-110 bg-accent-green-110 text-sp-bg" : "border-white-10 bg-sp-card text-white-60 hover:bg-white-5"}`}>
          {label} ({groups[key].length})
        </button>
      ))}
    </div>
  );
}

function DiscoveryPanel({ runs, pending, onStart }: { runs: AgentOutreachData["runs"]; pending: boolean; onStart: (body: { sourceUrl: string; maxPages?: number; maxAgents?: number }) => void }) {
  const analyze = useAnalyzeAgentSource();
  const pause = usePauseDiscovery(),
    resume = useResumeDiscovery(),
    stop = useStopDiscovery();
  const [analysis, setAnalysis] = useState<DiscoveryAnalysis | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [testLimit, setTestLimit] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  async function runAnalysis() {
    setAnalysis((await analyze.mutateAsync({ body: { sourceUrl } })) as DiscoveryAnalysis);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStartedAt(Date.now());
    onStart({ sourceUrl, ...(testLimit ? { maxPages: 1, maxAgents: 3 } : {}) });
  }
  const normalizedSource = sourceUrl.replace(/\/$/, "");
  const run = runs.find((candidate) => ["RUNNING", "PAUSED"].includes(candidate.status)) ?? (startedAt ? runs.find((candidate) => candidate.sourceUrl.replace(/\/$/, "") === normalizedSource && new Date(candidate.createdAt).getTime() >= startedAt - 1000) : undefined);
  const active = run && ["RUNNING", "PAUSED"].includes(run.status);
  const controls =
    run?.status === "RUNNING" ? (
      <div className="flex gap-2">
        <span className="self-center text-sm text-white-50">Discovery running</span>
        <button type="button" onClick={() => pause.mutate({ id: run.id })} className="btn bg-white-10">
          Pause
        </button>
        <button type="button" onClick={() => stop.mutate({ id: run.id })} className="btn bg-red-500/20 text-red-200">
          Stop
        </button>
      </div>
    ) : run?.status === "PAUSED" ? (
      <div className="flex gap-2">
        <span className="self-center text-sm text-amber-200">Discovery paused</span>
        <button type="button" onClick={() => resume.mutate({ id: run.id })} className="btn bg-accent-green-110 text-sp-bg">
          Resume
        </button>
        <button type="button" onClick={() => stop.mutate({ id: run.id })} className="btn bg-red-500/20 text-red-200">
          Stop
        </button>
      </div>
    ) : null;
  return (
    <section className="space-y-4 rounded-2xl border border-white-10 bg-sp-card p-5">
      {controls}
      <form onSubmit={submit} className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            name="sourceUrl"
            value={sourceUrl}
            onChange={(e) => {
              setSourceUrl(e.target.value);
              setAnalysis(null);
            }}
            type="url"
            required
            placeholder="https://www.coldwellbankerhomes.com/oh/columbus/agents/"
            className="min-h-11 flex-1 rounded-lg border border-white-10 bg-sp-bg px-3 text-white-100"
          />
          <button type="button" onClick={runAnalysis} disabled={!sourceUrl || analyze.isPending || Boolean(active)} className="btn inline-flex items-center justify-center gap-2 bg-white-10">
            <Search className="h-4 w-4" />
            {analyze.isPending ? "Analyzing…" : "Analyze Source"}
          </button>
          <button disabled={pending || !analysis?.ready || Boolean(active)} className="btn bg-accent-green-110 text-sp-bg">
            {pending ? "Starting…" : run ? "Start New Discovery" : "Start Discovery"}
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm text-white-50">
          <input type="checkbox" checked={testLimit} onChange={(e) => setTestLimit(e.target.checked)} disabled={Boolean(active)} />
          Development limit: one page, first 3 agents
        </label>
      </form>
      {analysis && (
        <div className="rounded-xl border border-white-10 bg-sp-bg p-4">
          <p className="font-medium text-white-90">
            {analysis.provider?.label || "Unsupported provider"} · {analysis.pageType.replaceAll("_", " ")}
          </p>
          <p className="mt-2 text-sm text-white-50">
            Agent links: {analysis.agentLinksFound} · Already targeted: {analysis.alreadyTargeted} · Potentially new: {analysis.potentiallyNew} · Pagination: {analysis.paginationDetected ? "Yes" : "No"}
          </p>
          {analysis.samples.length > 0 && <p className="mt-2 text-xs text-white-40">Samples: {analysis.samples.map((sample) => sample.name || sample.providerExternalId).join(", ")}</p>}
        </div>
      )}
      {run && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-8">
          {[
            ["Status", run.status],
            ["Current page", run.cursor?.currentPage ?? run.pagesScanned],
            ["Pages scanned", run.pagesScanned],
            ["Agent links", run.agentLinksFound],
            ["New", run.newAgentsCount],
            ["Qualified", run.qualifiedCount],
            ["Rejected", run.rejectedCount],
            ["Already targeted", run.duplicateCount],
            ["Suppressed", run.suppressedCount],
            ["Errors", run.errorCount],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-white-5 p-3">
              <p className="text-xs text-white-40">{label}</p>
              <p className="mt-1 font-semibold text-white-90">{value}</p>
            </div>
          ))}
        </div>
      )}
      {run?.lastError && <p className="text-sm text-red-300">{run.lastError}</p>}
    </section>
  );
}

function ProspectTable({ rows, loading, selected, setSelected, allowSelection = true, allowPreview = true, allowRegenerate = false, allowPipelineActions = true, showLastVerified = false, onGenerate, onPrepare, onSend }: { rows: AgentOutreachProspect[]; loading: boolean; selected: string[]; setSelected: (ids: string[]) => void; allowSelection?: boolean; allowPreview?: boolean; allowRegenerate?: boolean; allowPipelineActions?: boolean; showLastVerified?: boolean; onGenerate: (id: string) => void; onPrepare: (id: string) => void; onSend: (id: string) => void }) {
  const columnCount = showLastVerified ? 7 : 6;
  return (
    <div className="overflow-x-auto rounded-2xl border border-white-10">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-white-5 text-white-40">
          <tr>
            <th className="p-3">{allowSelection && <input type="checkbox" aria-label="Select all" checked={rows.length > 0 && rows.every((r) => selected.includes(r.id))} onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])} />}</th>
            <th className="p-3">Agent</th>
            <th className="p-3">Listings</th>
            <th className="p-3">Source</th>
            <th className="p-3">Status</th>
            {showLastVerified && <th className="p-3">Last verified</th>}
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columnCount} className="p-8 text-center text-white-40">
                Loading…
              </td>
            </tr>
          ) : !rows.length ? (
            <tr>
              <td colSpan={columnCount} className="p-8 text-center text-white-40">
                No agents in this stage.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-t border-white-10">
                <td className="p-3">{allowSelection && <input type="checkbox" aria-label={`Select ${row.fullName}`} checked={selected.includes(row.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, row.id] : selected.filter((id) => id !== row.id))} />}</td>
                <td className="p-3">
                  <p className="font-medium text-white-90">{row.fullName}</p>
                  <p className="text-xs text-white-40">{row.email || row.rejectionReason}</p>
                </td>
                <td className="p-3 text-white-60">{row.activeListingCount}</td>
                <td className="p-3">
                  <a href={row.profileUrl || row.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent-green-110">
                    {row.sourceDomain}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
                <td className="p-3">
                  <span className="rounded-full bg-white-10 px-2 py-1 text-xs font-semibold text-white-70">{row.rejectionReason || row.status}</span>
                  {row.lastError && <p className="mt-1 max-w-48 text-xs text-red-300">{row.lastError}</p>}
                </td>
                {showLastVerified && <td className="p-3 text-white-50">{row.lastVerifiedAt ? new Date(row.lastVerifiedAt).toLocaleDateString() : "—"}</td>}
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    {allowPreview && ["QUALIFIED", "PREVIEW_PENDING", "PREVIEW_FAILED"].includes(row.status) && (
                      <button onClick={() => onGenerate(row.id)} className="btn bg-white-10">
                        {row.status === "PREVIEW_FAILED" ? "Retry" : "Generate Preview"}
                      </button>
                    )}
                    {allowRegenerate && ["READY_TO_EMAIL", "EMAIL_FAILED"].includes(row.status) && (
                      <button onClick={() => onGenerate(row.id)} className="btn inline-flex items-center gap-2 bg-white-10">
                        <RefreshCw className="h-4 w-4" />
                        Regenerate Preview
                      </button>
                    )}
                    {row.status === "PREVIEW_GENERATING" && (
                      <button type="button" disabled aria-live="polite" className="btn inline-flex cursor-wait items-center gap-2 bg-white-10 text-white-60">
                        <LoaderCircle className="h-4 w-4 animate-spin text-accent-green-110" />
                        Preparing Preview…
                      </button>
                    )}
                    {row.status === "PREVIEW_PENDING" && (
                      <button type="button" disabled aria-live="polite" className="btn inline-flex cursor-wait items-center gap-2 bg-white-10 text-white-60">
                        <LoaderCircle className="h-4 w-4 animate-spin text-white-40" />
                        Queued…
                      </button>
                    )}
                    {allowPipelineActions && ["READY_TO_EMAIL", "EMAIL_FAILED", "EMAIL_SENT", "UNCLAIMED", "CLAIMED", "BOUNCED", "UNSUBSCRIBED"].includes(row.status) && row.claimUrl && (
                      <a href={row.claimUrl} target="_blank" rel="noreferrer" className="btn bg-white-10">
                        Preview
                      </a>
                    )}
                    {allowPipelineActions && ["READY_TO_EMAIL", "EMAIL_FAILED"].includes(row.status) && (
                      <button onClick={() => onPrepare(row.id)} title="Generate or regenerate email" className="btn bg-white-10">
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    )}
                    {allowPipelineActions && row.emailBody && (
                      <details className="max-w-64">
                        <summary className="cursor-pointer text-xs text-white-50">Email preview</summary>
                        {row.emailHtmlBody ? <div className="mt-2 max-h-96 overflow-auto rounded-lg bg-white p-3 text-sm text-slate-900" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(row.emailHtmlBody) }} /> : <p className="mt-2 whitespace-pre-wrap rounded-lg bg-sp-bg p-2 text-xs text-white-70">{row.emailBody}</p>}
                      </details>
                    )}
                    {allowPipelineActions && row.emailBody && ["READY_TO_EMAIL", "EMAIL_FAILED"].includes(row.status) && (
                      <button onClick={() => onSend(row.id)} className="btn bg-accent-green-110 text-sp-bg">
                        <Mail className="h-4 w-4" />
                      </button>
                    )}
                    {allowPipelineActions && row.status === "EMAIL_QUEUED" && <span className="text-xs text-white-50">Queued for sending…</span>}
                    {allowPipelineActions && row.status === "EMAIL_SENDING" && <span className="text-xs text-white-50">Sending…</span>}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function EmailTemplateEditor({ template }: { template: AgentOutreachData["template"] }) {
  const update = useUpdateOutreachTemplate();
  const [subject, setSubject] = useState(template.subject);
  const [htmlBody, setHtmlBody] = useState(template.htmlBody);
  const [textBody, setTextBody] = useState(template.textBody);
  return (
    <details className="rounded-2xl border border-white-10 bg-sp-card p-5">
      <summary className="cursor-pointer font-semibold text-white-90">Email Template</summary>
      <form className="mt-4 space-y-4" onSubmit={(event) => { event.preventDefault(); update.mutate({ body: { subject, htmlBody, textBody } }); }}>
        <label className="block text-sm text-white-60">Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={240} required className="mt-1 min-h-11 w-full rounded-lg border border-white-10 bg-sp-bg px-3 text-white-100" /></label>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block text-sm text-white-60">HTML<textarea value={htmlBody} onChange={(event) => setHtmlBody(event.target.value)} required rows={18} className="mt-1 w-full rounded-lg border border-white-10 bg-sp-bg p-3 font-mono text-xs text-white-100" /></label>
          <label className="block text-sm text-white-60">Plain Text<textarea value={textBody} onChange={(event) => setTextBody(event.target.value)} required rows={18} className="mt-1 w-full rounded-lg border border-white-10 bg-sp-bg p-3 font-mono text-xs text-white-100" /></label>
        </div>
        <div className="rounded-lg bg-white p-4 text-slate-900"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Sanitized HTML preview</p><div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlBody) }} /></div>
        <button disabled={update.isPending} className="btn bg-accent-green-110 text-sp-bg">{update.isPending ? "Saving…" : "Save Template"}</button>
      </form>
    </details>
  );
}

function SendingAccounts({ accounts }: { accounts: any[] }) {
  const create = useCreateSendingAccount(),
    test = useTestSendingAccount(),
    update = useUpdateSendingAccount(),
    remove = useDeleteSendingAccount();
  const [smtpPreset, setSmtpPreset] = useState("MICROSOFT_365");
  const [smtpHost, setSmtpHost] = useState("smtp.office365.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpEncryption, setSmtpEncryption] = useState<"STARTTLS" | "SSL_TLS" | "NONE">("STARTTLS");
  function applyPreset(value: string) {
    setSmtpPreset(value);
    if (value === "MICROSOFT_365") { setSmtpHost("smtp.office365.com"); setSmtpPort("587"); setSmtpEncryption("STARTTLS"); }
    if (value === "GOOGLE_WORKSPACE") { setSmtpHost("smtp.gmail.com"); setSmtpPort("587"); setSmtpEncryption("STARTTLS"); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    create.mutate({
      body: {
        provider: "SMTP",
        displayName: String(f.get("displayName")),
        fromEmail: String(f.get("fromEmail")),
        replyTo: String(f.get("replyTo") || ""),
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpUsername: String(f.get("smtpUsername")),
        smtpPassword: String(f.get("smtpPassword")),
        smtpEncryption,
        smtpSecure: smtpEncryption === "SSL_TLS",
        enabled: true,
        isDefault: f.get("isDefault") === "on",
        hourlyLimit: Number(f.get("hourlyLimit")),
        dailyLimit: Number(f.get("dailyLimit")),
        delaySeconds: Number(f.get("delaySeconds")),
      },
    });
  }
  return (
    <section className="space-y-4 rounded-2xl border border-white-10 bg-sp-card p-5">
      <div>
        <h2 className="font-semibold text-white-90">Sending Accounts</h2>
        <p className="text-sm text-white-40">SMTP credentials are encrypted and never returned. Use STARTTLS for Microsoft 365 and other providers on port 587; use SSL/TLS for implicit TLS on port 465.</p>
      </div>
      <div className="space-y-2">
        {accounts.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white-5 p-3">
            <span className="text-sm text-white-70">
              {a.displayName} &lt;{a.fromEmail}&gt; · {a.provider}
              {a.smtpEncryption ? ` · ${a.smtpEncryption.replace("_", "/")}` : ""}
              {a.isDefault ? " · Default" : ""}
              {!a.enabled ? " · Disabled" : ""}
            </span>
            <div className="flex flex-wrap gap-2">
                    <button onClick={() => test.mutate({ id: a.id })} disabled={test.isPending && test.variables?.id === a.id} className="btn bg-white-10">
                      {test.isPending && test.variables?.id === a.id ? "Testing…" : "Test"}
              </button>
              <button onClick={() => update.mutate({ id: a.id, body: { enabled: !a.enabled } })} className="btn bg-white-10">
                {a.enabled ? "Disable" : "Enable"}
              </button>
              {!a.isDefault && (
                <button onClick={() => update.mutate({ id: a.id, body: { isDefault: true } })} className="btn bg-white-10">
                  Make default
                </button>
              )}
              <button
                onClick={() => {
                  if (window.confirm("Remove this sending account?")) remove.mutate({ id: a.id });
                }}
                className="btn bg-red-500/10 text-red-200"
              >
                Remove
              </button>
            </div>
          </div>
          ))}
        </div>
        {test.isSuccess && <p role="status" className="text-sm text-accent-green-110">SMTP connection and credentials verified.</p>}
        {test.error && <p role="alert" className="text-sm text-red-300">{test.error.message}{"code" in test.error ? ` (${String(test.error.code)})` : ""}</p>}
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-3">
        <label className="text-xs text-white-50">Provider preset<select value={smtpPreset} onChange={(event) => applyPreset(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-white-10 bg-sp-bg px-3 text-white-100"><option value="MICROSOFT_365">Microsoft 365 / Outlook</option><option value="GOOGLE_WORKSPACE">Google Workspace</option><option value="GENERIC">Generic SMTP</option></select></label>
        <label className="text-xs text-white-50">SMTP hostname<input name="smtpHost" value={smtpHost} onChange={(event) => { setSmtpHost(event.target.value); setSmtpPreset("GENERIC"); }} required className="mt-1 min-h-11 w-full rounded-lg border border-white-10 bg-sp-bg px-3 text-white-100" /></label>
        <label className="text-xs text-white-50">Port<input name="smtpPort" type="number" value={smtpPort} onChange={(event) => { setSmtpPort(event.target.value); setSmtpPreset("GENERIC"); }} required className="mt-1 min-h-11 w-full rounded-lg border border-white-10 bg-sp-bg px-3 text-white-100" /></label>
        <label className="text-xs text-white-50">Encryption<select name="smtpEncryption" value={smtpEncryption} onChange={(event) => { setSmtpEncryption(event.target.value as "STARTTLS" | "SSL_TLS" | "NONE"); setSmtpPreset("GENERIC"); }} className="mt-1 min-h-11 w-full rounded-lg border border-white-10 bg-sp-bg px-3 text-white-100"><option value="STARTTLS">STARTTLS</option><option value="SSL_TLS">SSL/TLS</option><option value="NONE">None</option></select></label>
        {[
          ["displayName", "From name", "text"],
          ["fromEmail", "From email", "email"],
          ["replyTo", "Reply-to", "email"],
          ["smtpUsername", "Username", "text"],
          ["smtpPassword", "Password / app password", "password"],
          ["hourlyLimit", "Hourly limit", "number"],
          ["dailyLimit", "Daily limit", "number"],
          ["delaySeconds", "Delay seconds", "number"],
        ].map(([name, label, type]) => (
          <label key={name} className="text-xs text-white-50">
            {label}
            <input name={name} type={type} required={!["replyTo"].includes(name)} defaultValue={name === "smtpPort" ? "465" : name === "hourlyLimit" ? "25" : name === "dailyLimit" ? "100" : name === "delaySeconds" ? "60" : undefined} className="mt-1 min-h-11 w-full rounded-lg border border-white-10 bg-sp-bg px-3 text-white-100" />
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm text-white-60">
          <input name="isDefault" type="checkbox" defaultChecked={!accounts.length} />
          Default
        </label>
        <button disabled={create.isPending} className="btn bg-accent-green-110 text-sp-bg">
          Add SMTP account
        </button>
      </form>
      {create.error && <p className="text-sm text-red-300">{create.error.message}</p>}
    </section>
  );
}
