"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Copy, ExternalLink, Plus, RotateCw, ShieldOff } from "lucide-react";
import {
  useAdminProspects,
  useCreateAdminProspect,
  useRotateProspectClaim,
  useRevokeProspectClaim,
  type ProspectWorkspaceItem,
} from "@/hooks/useAdmin";

export default function AdminProspectsPage() {
  const { data, isLoading } = useAdminProspects();
  const create = useCreateAdminProspect();
  const rotate = useRotateProspectClaim();
  const revoke = useRevokeProspectClaim();
  const [showForm, setShowForm] = useState(false);
  const [issued, setIssued] = useState<ProspectWorkspaceItem | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await create.mutateAsync({
      prospectName: String(form.get("prospectName")),
      prospectEmail: String(form.get("prospectEmail")),
      businessName: String(form.get("businessName")),
      industryKey: String(form.get("industryKey")) as
        "real_estate" | "car_sales",
      websiteUrl: String(form.get("websiteUrl") || ""),
      sourceUrl: String(form.get("sourceUrl") || ""),
      acquisitionSource: String(form.get("acquisitionSource") || ""),
      operatorNote: String(form.get("operatorNote") || ""),
    });
    setIssued(result);
    setShowForm(false);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white-100">
            Prospect Workspaces
          </h1>
          <p className="mt-1 text-sm text-white-40">
            Prepare restricted previews, then securely attach the existing
            workspace after claim.
          </p>
        </div>
        <button
          onClick={() => setShowForm((value) => !value)}
          className="btn inline-flex items-center gap-2 bg-accent-green-110 text-sp-bg"
        >
          <Plus className="h-4 w-4" />
          New prospect
        </button>
      </header>
      {showForm && (
        <form
          onSubmit={submit}
          className="grid gap-4 rounded-2xl border border-white-10 bg-sp-card p-5 md:grid-cols-2"
        >
          <Field name="prospectName" label="Prospect name" required />
          <Field
            name="prospectEmail"
            label="Prospect email"
            type="email"
            required
          />
          <Field name="businessName" label="Business name" required />
          <label className="text-sm text-white-60">
            Industry
            <select
              name="industryKey"
              className="mt-1 min-h-11 w-full rounded-lg border border-white-10 bg-sp-bg px-3 text-white-100"
            >
              <option value="real_estate">Real Estate</option>
              <option value="car_sales">Car Sales</option>
            </select>
          </label>
          <Field name="websiteUrl" label="Website URL" type="url" />
          <Field name="sourceUrl" label="Listing/source URL" type="url" />
          <Field name="acquisitionSource" label="Acquisition source" />
          <label className="text-sm text-white-60">
            Operator note
            <textarea
              name="operatorNote"
              className="mt-1 min-h-24 w-full rounded-lg border border-white-10 bg-sp-bg p-3 text-white-100"
            />
          </label>
          <div className="md:col-span-2">
            <button
              disabled={create.isPending}
              className="btn bg-accent-green-110 text-sp-bg"
            >
              {create.isPending ? "Creating…" : "Create restricted workspace"}
            </button>
            {create.error && (
              <p role="alert" className="mt-2 text-sm text-red-300">
                {create.error.message}
              </p>
            )}
          </div>
        </form>
      )}
      {issued?.previewToken && issued.claimToken && (
        <IssuedLinks item={issued} onClose={() => setIssued(null)} />
      )}
      <div className="overflow-x-auto rounded-2xl border border-white-10">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-white-5 text-white-40">
            <tr>
              <th className="p-3">Business</th>
              <th className="p-3">Prospect</th>
              <th className="p-3">Claim</th>
              <th className="p-3">Expires</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-white-40">
                  Loading…
                </td>
              </tr>
            ) : (
              data?.items.map((item) => (
                <tr key={item.id} className="border-t border-white-10">
                  <td className="p-3 font-medium text-white-90">
                    {item.businessName}
                  </td>
                  <td className="p-3 text-white-60">
                    {item.prospectName}
                    <br />
                    <span className="text-xs text-white-30">
                      {item.prospectEmail}
                    </span>
                  </td>
                  <td className="p-3">
                    <Status value={item.claimStatus} />
                  </td>
                  <td className="p-3 text-white-50">
                    {new Date(item.claimExpiresAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/prospects/${item.id}`}
                        title="Curate public preview"
                        aria-label={`Curate preview for ${item.businessName}`}
                        className="grid min-h-11 min-w-11 place-items-center rounded-lg bg-white-10"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        title="Generate a new one-time claim link"
                        aria-label={`Regenerate claim link for ${item.businessName}`}
                        disabled={item.claimStatus === "CLAIMED"}
                        onClick={async () =>
                          setIssued(await rotate.mutateAsync(item.id))
                        }
                        className="grid min-h-11 min-w-11 place-items-center rounded-lg bg-white-10 disabled:opacity-40"
                      >
                        <RotateCw className="h-4 w-4" />
                      </button>
                      <button
                        title="Revoke claim link"
                        aria-label={`Revoke claim link for ${item.businessName}`}
                        disabled={item.claimStatus === "CLAIMED"}
                        onClick={() => revoke.mutate(item.id)}
                        className="grid min-h-11 min-w-11 place-items-center rounded-lg bg-white-10 disabled:opacity-40"
                      >
                        <ShieldOff className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm text-white-60">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1 min-h-11 w-full rounded-lg border border-white-10 bg-sp-bg px-3 text-white-100"
      />
    </label>
  );
}
function Status({ value }: { value: string }) {
  return (
    <span className="rounded-full bg-white-10 px-2 py-1 text-xs font-semibold text-white-70">
      {value}
    </span>
  );
}
function IssuedLinks({
  item,
  onClose,
}: {
  item: ProspectWorkspaceItem;
  onClose: () => void;
}) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const preview = `${origin}/preview/${item.previewToken}`;
  const invitation = `${preview}#claim=${item.claimToken}`;
  return (
    <section className="rounded-2xl border border-amber-300/25 bg-amber-300/5 p-5">
      <h2 className="font-semibold text-amber-100">Copy these links now</h2>
      <p className="mt-1 text-sm text-white-50">
        Raw credentials are never stored and cannot be shown again. Regenerating
        invalidates the prior claim link.
      </p>
      <LinkRow label="Preview only" value={preview} />
      <LinkRow label="Secure preview + claim invitation" value={invitation} />
      <button
        onClick={onClose}
        className="mt-3 text-sm text-white-50 underline"
      >
        I have saved the links
      </button>
    </section>
  );
}
function LinkRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-white-40">{label}</p>
        <code className="block truncate text-xs text-white-70">{value}</code>
      </div>
      <button
        onClick={() => navigator.clipboard.writeText(value)}
        aria-label={`Copy ${label}`}
        className="grid min-h-11 min-w-11 place-items-center rounded-lg bg-white-10"
      >
        <Copy className="h-4 w-4" />
      </button>
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${label}`}
        className="grid min-h-11 min-w-11 place-items-center rounded-lg bg-white-10"
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
