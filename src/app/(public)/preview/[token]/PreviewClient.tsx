"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Eye, ImageIcon } from "lucide-react";
import { useClaimWorkspaceInvitation } from '@/hooks/useWorkspaceInvitations';

type Preview = {
  businessName: string;
  prospectName: string;
  logoUrl: string | null;
  brand: {
    description: string | null;
    website: string | null;
    city: string | null;
    state: string | null;
  } | null;
  items: Array<{
    type: string;
    title: string;
    summary: string | null;
    imageUrl: string | null;
    property?: { address: string; price: number | null; beds: number | null; baths: number | null; sqft: number | null; yearBuilt: number | null; status: string | null };
  }>;
  drafts: Array<{
    channel: string;
    body: string;
    mediaUrl: string | null;
    media?: Array<{ url: string | null; thumbnailUrl: string | null; assetType: string; altText?: string | null; orderIndex?: number }>;
  }>;
  claimAvailable: boolean;
  claimStatus: string;
  preparationState: "NOT_STARTED" | "READY_UNSELECTED" | "SELECTED";
};

export function PreviewClient({ token, invitationId }: { token?: string; invitationId?: string }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [failed, setFailed] = useState(false);
  const [claimToken, setClaimToken] = useState<string | null>(null);

  useEffect(() => {
    const match = window.location.hash.match(
      /^#claim=([A-Za-z0-9_-]{40,100})$/,
    );
    const endpoint = invitationId ? `/api/proxy/workspace-invitations/${encodeURIComponent(invitationId)}/preview` : `/api/public/prospects/preview/${encodeURIComponent(token!)}`;
    fetch(endpoint, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("unavailable");
        return response.json();
      })
      .then((data) => {
        setClaimToken(invitationId ? null : match?.[1] ?? null);
        setPreview(data);
      })
      .catch(() => setFailed(true));
  }, [token, invitationId]);

  if (failed)
    return (
      <State
        title="Preview unavailable"
        body="This preview may have been revoked or the link may be incorrect."
      />
    );
  if (!preview)
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1DBF60] border-t-transparent" />
      </div>
    );

  function continueToClaim() {
    if (!claimToken) return;
    sessionStorage.setItem("squadpitch.prospectClaimToken", claimToken);
    window.location.assign("/claim");
  }
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-14">
      <div className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-[#173a35] to-[#181225] p-6 shadow-2xl sm:p-10">
        <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#62e29a]">
          <Eye className="h-4 w-4" /> Pre-built Squadpitch preview
        </div>
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-5xl">
          A social workspace prepared for {preview.businessName}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/65">
          Hi {preview.prospectName}—this read-only workspace shows sample
          content prepared for your business. Nothing has been connected,
          scheduled, or published.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          {invitationId && preview.claimAvailable ? (
            <InvitationClaimAction invitationId={invitationId} />
          ) : claimToken && preview.claimAvailable ? (
            <button
              type="button"
              onClick={continueToClaim}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1DBF60] px-5 font-semibold text-[#0f241f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Claim this workspace <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/60">
              Use the secure claim invitation from your operator to claim this
              workspace.
            </div>
          )}
        </div>
        {claimToken && preview.claimAvailable && <p className="mt-3 text-sm text-white/50">Claim to edit these drafts, refine the campaign, and connect publishing when you&apos;re ready.</p>}
      </div>

      {preview.items.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-semibold text-white">
            {preview.items.some((item) => item.type === "PROPERTY") ? "Featured property" : "Business content"}
          </h2>
          <div className="grid gap-4">
            {preview.items.map((item, index) => (
              <article
                key={`${item.title}-${index}`}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.04]"
              >
                {item.imageUrl ? (
                  <Image
                    unoptimized
                    src={item.imageUrl}
                    width={800}
                    height={600}
                    alt=""
                    className="aspect-[16/9] w-full object-cover sm:aspect-[2/1]"
                  />
                ) : (
                  <div className="grid aspect-[4/3] place-items-center bg-white/5">
                    <ImageIcon className="h-8 w-8 text-white/25" />
                  </div>
                )}
                <div className="p-5 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#62e29a]">
                    {item.type.replaceAll("_", " ")}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white sm:text-xl">
                    {item.property?.address || item.title}
                  </h3>
                  {item.property && (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/70">
                      {item.property.price != null && <span>${item.property.price.toLocaleString()}</span>}
                      {item.property.beds != null && <span>{item.property.beds} beds</span>}
                      {item.property.baths != null && <span>{item.property.baths} baths</span>}
                      {item.property.sqft != null && <span>{item.property.sqft.toLocaleString()} sq ft</span>}
                      {item.property.yearBuilt != null && <span>Built in {item.property.yearBuilt}</span>}
                    </div>
                  )}
                  {item.summary && !item.property && (
                    <p className="mt-2 line-clamp-3 text-sm text-white/55">
                      {item.summary}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl font-semibold text-white">Sample social content</h2>
          {preview.drafts.length > 0 && <span className="rounded-full border border-[#62e29a]/25 bg-[#62e29a]/10 px-3 py-1 text-xs font-medium text-[#8aefb5]">{preview.drafts.length} prepared post{preview.drafts.length === 1 ? "" : "s"} · {preview.drafts.reduce((total, draft) => total + Math.max(draft.media?.filter((item) => item.url).length || 0, draft.mediaUrl ? 1 : 0), 0)} selected images</span>}
        </div>
        {preview.drafts.length > 0 && <p className="mb-5 text-sm text-white/50">A ready-to-review campaign prepared from this property. Each card shows its exact stored draft and assigned media.</p>}
        {preview.drafts.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {preview.drafts.map((draft, index) => (
              <article
                key={`${draft.channel}-${index}`}
                className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[.04] p-5 shadow-lg shadow-black/10"
              >
                <DraftMediaGallery draft={draft} />
                <div className="flex items-center justify-between gap-3">
                  <p className="rounded-full bg-[#1DBF60]/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[#62e29a]">{draft.channel.replaceAll("_", " ")}</p>
                  <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wide text-white/40">Draft preview</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-white/80">
                  {draft.body}
                </p>
              </article>
            ))}
          </div>
        ) : preview.preparationState === "READY_UNSELECTED" ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-white/45">
            Preview content hasn&apos;t been selected yet.
          </div>
        ) : preview.preparationState === "SELECTED" ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-white/45">
            No sample social posts were selected for this preview.
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-white/45">
            Preview setup has not started yet.
          </div>
        )}
      </section>
      <div className="mt-10 flex items-start gap-3 rounded-2xl border border-[#1DBF60]/20 bg-[#1DBF60]/5 p-4 text-sm text-white/65">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#62e29a]" />
        <p>
          This is a private draft preview. No social accounts or publishing
          credentials are connected, and no content shown here has been
          published.
        </p>
      </div>
    </main>
  );
}

function InvitationClaimAction({ invitationId }: { invitationId: string }) {
  const claim = useClaimWorkspaceInvitation();
  const [claimedClientId, setClaimedClientId] = useState<string | null>(null);
  if (claimedClientId) return <div className="flex flex-col gap-3 rounded-xl border border-[#62e29a]/25 bg-[#62e29a]/10 p-4 sm:flex-row sm:items-center"><span className="font-semibold text-white">Workspace claimed successfully</span><a href={`/workspaces/${claimedClientId}/getting-started?claimed=true`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1DBF60] px-4 font-semibold text-[#0f241f]">Open workspace</a><span className="text-sm text-white/55">Or stay here to finish reviewing.</span></div>;
  return <div><button type="button" disabled={claim.isPending} onClick={() => claim.mutate(invitationId, { onSuccess: (result) => setClaimedClientId(result.clientId) })} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1DBF60] px-5 font-semibold text-[#0f241f] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">{claim.isPending ? 'Claiming…' : 'Claim workspace'} <ArrowRight className="h-4 w-4" /></button>{claim.error && <p className="mt-3 text-sm text-red-300" role="alert">{claim.error.message}</p>}</div>;
}

function DraftMediaGallery({ draft }: { draft: Preview["drafts"][number] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const media = (draft.media || []).filter((item): item is typeof item & { url: string } => Boolean(item.url));
  if (!media.length && draft.mediaUrl) media.push({ url: draft.mediaUrl, thumbnailUrl: null, assetType: "image", orderIndex: 0 });
  if (!media.length) return null;
  const active = media[Math.min(activeIndex, media.length - 1)];
  const channel = draft.channel.replaceAll("_", " ");
  return (
    <div className="mb-5" aria-label={`${channel} selected media gallery`}>
      <div className="relative">
        <Image unoptimized src={active.url} width={800} height={600} alt={active.altText || `${channel} draft property media ${activeIndex + 1} of ${media.length}`} className="aspect-[4/3] w-full rounded-xl object-cover" />
        {media.length > 1 && (
          <>
            <button type="button" aria-label="Show previous image" onClick={() => setActiveIndex((activeIndex - 1 + media.length) % media.length)} className="absolute left-2 top-1/2 grid min-h-11 min-w-11 -translate-y-1/2 place-items-center rounded-full bg-black/65 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62e29a]"><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" aria-label="Show next image" onClick={() => setActiveIndex((activeIndex + 1) % media.length)} className="absolute right-2 top-1/2 grid min-h-11 min-w-11 -translate-y-1/2 place-items-center rounded-full bg-black/65 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62e29a]"><ChevronRight className="h-5 w-5" /></button>
            <span className="absolute bottom-3 right-3 rounded-full border border-white/20 bg-black/75 px-2.5 py-1 text-xs font-semibold text-white shadow" aria-live="polite">{activeIndex + 1} / {media.length}</span>
          </>
        )}
      </div>
      {media.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1" role="list" aria-label="Choose an image">
          {media.map((item, index) => (
            <button key={`${item.url}-${index}`} type="button" role="listitem" aria-label={`Show image ${index + 1} of ${media.length}`} aria-current={index === activeIndex ? "true" : undefined} onClick={() => setActiveIndex(index)} className={`min-h-11 min-w-11 shrink-0 overflow-hidden rounded-lg border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62e29a] ${index === activeIndex ? "border-[#62e29a]" : "border-transparent"}`}>
              <Image unoptimized src={item.thumbnailUrl || item.url} width={64} height={64} alt="" className="h-12 w-12 object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function State({ title, body }: { title: string; body: string }) {
  return (
    <main className="grid min-h-[75vh] place-items-center px-4">
      <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-3 text-white/55">{body}</p>
      </div>
    </main>
  );
}
