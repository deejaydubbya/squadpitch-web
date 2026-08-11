"use client";

import { useState } from "react";
import {
  Instagram,
  Music2,
  Linkedin,
  Twitter,
  Facebook,
  Youtube,
  Pin,
  AtSign,
  Hash,
  Star,
  Loader2,
  Link2,
  Unlink,
  AlertTriangle,
} from "lucide-react";
import {
  useCheckGbpReviewAccess,
  useDisconnectChannel,
  useSyncFacebookComments,
  useSyncInstagramComments,
  useSyncThreadsReplies,
  type ChannelConnection,
  type Channel,
  type ChannelConnectionStatus,
} from "@/hooks/useSquadpitch";
import { useOAuthPopup } from "@/hooks/useOAuthPopup";
import { cn } from "@/lib/utils";
import { CHANNEL_REGISTRY } from "@/lib/channelRegistry";
import { PinterestBoardPicker } from "./PinterestBoardPicker";
import { GbpLocationPicker } from "./GbpLocationPicker";
import {
  INSTAGRAM_CONNECTION_DESCRIPTION,
  INSTAGRAM_RECONNECT_BANNER,
  instagramConnectionNeedsReconnect,
} from "@/lib/instagramScopes";

export type ChannelRecommendationTier = "primary" | "secondary" | "optional";

interface Props {
  clientId: string;
  channel: Channel;
  connection: ChannelConnection | null;
  recommendationTier?: ChannelRecommendationTier | null;
}

const CHANNEL_META: Record<
  Channel,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    real: boolean;
    /** Short copy shown under the label on "coming soon" tiles to
     *  explain why the channel exists and what it'll unlock. */
    description?: string;
  }
> = {
  INSTAGRAM: {
    label: "Instagram",
    icon: Instagram,
    real: true,
    // IG-04 — show the four Business Login scope explanations
    // before the user clicks Connect so reviewers + users can see
    // exactly which permissions get requested. Single source of
    // truth lives in `lib/instagramScopes.ts`.
    description: INSTAGRAM_CONNECTION_DESCRIPTION,
  },
  TIKTOK: { label: "TikTok", icon: Music2, real: true },
  LINKEDIN: { label: "LinkedIn Personal Profile", icon: Linkedin, real: true },
  LINKEDIN_ORGANIZATION_PAGE: {
    label: "LinkedIn Organization Page",
    icon: Linkedin,
    real: true,
  },
  X: { label: "X", icon: Twitter, real: true },
  FACEBOOK: { label: "Facebook", icon: Facebook, real: true },
  YOUTUBE: { label: "YouTube", icon: Youtube, real: true },
  PINTEREST: { label: "Pinterest", icon: Pin, real: true },
  THREADS: { label: "Threads", icon: AtSign, real: true },
  REDDIT: { label: "Reddit", icon: Hash, real: false },
  GOOGLE_BUSINESS_PROFILE: {
    label: "Google Business Profile",
    icon: Star,
    real: true,
    description:
      "Connect your Google Business Profile to bring reviews into SquadInbox and reply publicly. Requires business.manage scope.",
  },
};

const STATUS_PILL: Record<ChannelConnectionStatus, string> = {
  CONNECTED: "bg-zone-green/20 text-zone-green",
  EXPIRED: "bg-zone-yellow/20 text-zone-yellow",
  REVOKED: "bg-accent-red/20 text-accent-red",
  ERROR: "bg-accent-red/20 text-accent-red",
};

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const TIER_BADGE: Record<
  ChannelRecommendationTier,
  { label: string; className: string }
> = {
  primary: {
    label: "Recommended",
    className: "bg-accent-green-110/15 text-accent-green-110",
  },
  secondary: { label: "Good fit", className: "bg-blue-400/15 text-blue-400" },
  optional: { label: "Optional", className: "bg-white-10 text-white-40" },
};

export function ChannelConnectionCard({
  clientId,
  channel,
  connection,
  recommendationTier,
}: Props) {
  const meta = CHANNEL_META[channel];
  const availability = CHANNEL_REGISTRY[channel].availability;
  const Icon = meta.icon;
  const oauthPopup = useOAuthPopup(clientId);
  const disconnect = useDisconnectChannel(clientId);
  const [pinterestPickerOpen, setPinterestPickerOpen] = useState(false);
  const [gbpPickerOpen, setGbpPickerOpen] = useState(false);
  const checkGbpReviewAccess = useCheckGbpReviewAccess(clientId);
  const syncThreadsReplies = useSyncThreadsReplies(clientId);
  const syncFacebookComments = useSyncFacebookComments(clientId);
  const syncInstagramComments = useSyncInstagramComments(clientId);

  const isConnected = connection && connection.status === "CONNECTED";
  const isBroken =
    connection &&
    (connection.status === "EXPIRED" ||
      connection.status === "ERROR" ||
      connection.status === "REVOKED");

  // Pinterest board ids are numeric. Right after OAuth, externalAccountId
  // is the username; the user must pick a board before publishing works.
  const pinterestNeedsBoard =
    channel === "PINTEREST" &&
    isConnected &&
    !!connection?.externalAccountId &&
    !/^\d+$/.test(connection.externalAccountId);
  const pinterestHasBoard =
    channel === "PINTEREST" &&
    isConnected &&
    !!connection?.externalAccountId &&
    /^\d+$/.test(connection.externalAccountId);

  // GBP needs a location selected after OAuth. The post-OAuth
  // sentinel is "accounts/{a}"; the full canonical resource name
  // after picker is "accounts/{a}/locations/{l}". We use the
  // presence of "/locations/" to distinguish.
  const gbpNeedsLocation =
    channel === "GOOGLE_BUSINESS_PROFILE" &&
    isConnected &&
    !!connection?.externalAccountId &&
    !connection.externalAccountId.includes("/locations/");
  const gbpHasLocation =
    channel === "GOOGLE_BUSINESS_PROFILE" &&
    isConnected &&
    !!connection?.externalAccountId &&
    connection.externalAccountId.includes("/locations/");

  // The poller (and any reply attempt) stash a stable marker on
  // ChannelConnection.lastError when Google rejects reviews API
  // calls with the "your project isn't allowlisted" 403. We
  // surface that with a dedicated banner pointing at Google's
  // access-request form — distinct from the generic isBroken
  // banner (status stays CONNECTED in this case; only reviews
  // are gated, not OAuth itself).
  const gbpReviewAccessDenied =
    channel === "GOOGLE_BUSINESS_PROFILE" &&
    typeof connection?.lastError === "string" &&
    connection.lastError.startsWith("REVIEW_API_ACCESS_DENIED:");

  // IG-04 — flag existing Instagram connections that still carry
  // the pre-Business-Login scope shape so the user reconnects
  // before publishing / insights / comments start failing on Meta's
  // side. Stays false for non-IG channels and for fresh Business
  // Login connections.
  const instagramNeedsReconnect =
    channel === "INSTAGRAM" &&
    isConnected &&
    instagramConnectionNeedsReconnect(connection?.scopes);

  const handleConnect = () => oauthPopup.connect(channel);

  const handleDisconnect = () => {
    if (
      !window.confirm(
        `Disconnect ${meta.label}? You will need to reconnect to publish again.`,
      )
    ) {
      return;
    }
    disconnect.mutate(channel);
  };

  const errorMessage = oauthPopup.popupBlocked
    ? "Popup blocked. Please allow popups for this site."
    : (oauthPopup.error?.message ??
      (disconnect.error as Error | null)?.message ??
      null);

  return (
    <div className="card p-4">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start">
        <div className="w-10 h-10 rounded-xl bg-white-5 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-white-60" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white-100 font-semibold">{meta.label}</h3>
            {availability === "BETA" && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-zone-yellow">
                Beta
              </span>
            )}
            {!meta.real && (
              <span className="text-xs text-white-40 font-medium">
                Coming soon
              </span>
            )}
            {recommendationTier && (
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
                  TIER_BADGE[recommendationTier].className,
                )}
              >
                {TIER_BADGE[recommendationTier].label}
              </span>
            )}
            {connection && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
                  STATUS_PILL[connection.status],
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {connection.status}
              </span>
            )}
          </div>

          {connection?.displayName && (
            <p className="text-sm text-white-60 mt-1 truncate">
              {connection.displayName}
            </p>
          )}

          {meta.description && !connection && (
            <p className="text-xs text-white-50 mt-1 leading-snug">
              {meta.description}
            </p>
          )}

          {connection && (
            <p className="text-xs text-white-40 mt-1">
              Last validated {formatRelative(connection.lastValidatedAt)}
              {connection.tokenExpiresAt && (
                <>
                  {" · "}
                  token expires{" "}
                  {new Date(connection.tokenExpiresAt).toLocaleDateString()}
                </>
              )}
            </p>
          )}

          {isBroken && connection?.lastError && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-accent-red">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{connection.lastError}</span>
            </div>
          )}

          {instagramNeedsReconnect && (
            <div className="mt-2 flex items-center justify-between gap-2 p-2 rounded-md bg-zone-yellow/10 text-zone-yellow text-xs">
              <div className="flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{INSTAGRAM_RECONNECT_BANNER}</span>
              </div>
              <button
                onClick={handleConnect}
                disabled={oauthPopup.isPending}
                className="text-[11px] font-medium px-2 py-1 rounded-md bg-zone-yellow/20 hover:bg-zone-yellow/30 disabled:opacity-50"
              >
                Reconnect
              </button>
            </div>
          )}

          {channel === 'THREADS' && isConnected && (
            <div className="mt-2 flex items-center justify-between gap-2 p-2 rounded-md bg-white-5 text-white-60 text-xs">
              <div className="flex items-start gap-1.5">
                <span>
                  Threads replies sync every 15 min. Force a check now to pull
                  replies on your recently-published Threads posts.
                </span>
              </div>
              <button
                onClick={() => syncThreadsReplies.mutate()}
                disabled={syncThreadsReplies.isPending}
                className="text-[11px] font-medium px-2 py-1 rounded-md bg-white-10 hover:bg-white-15 disabled:opacity-50 whitespace-nowrap"
              >
                {syncThreadsReplies.isPending
                  ? "Syncing…"
                  : syncThreadsReplies.isSuccess
                    ? "Queued ✓"
                    : "Sync replies now"}
              </button>
            </div>
          )}
          {syncThreadsReplies.isError && (
            <div className="mt-1 flex items-start gap-1.5 text-xs text-accent-red">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                {(syncThreadsReplies.error as Error | null)?.message ??
                  "Failed to sync."}
              </span>
            </div>
          )}

          {/* Meta polling migration — replaces the removed Page-feed
              webhook subscription. Cron runs every 15 min; this button
              short-circuits the wait so users (and App Review reviewers)
              can see freshly-left Page-post comments arrive in Inbox. */}
          {channel === 'FACEBOOK' && isConnected && (
            <div className="mt-2 flex items-center justify-between gap-2 p-2 rounded-md bg-white-5 text-white-60 text-xs">
              <div className="flex items-start gap-1.5">
                <span>
                  Comments on your Squadpitch-published Facebook posts are
                  polled every 15 min. Force a check now.
                </span>
              </div>
              <button
                onClick={() => syncFacebookComments.mutate()}
                disabled={syncFacebookComments.isPending}
                className="text-[11px] font-medium px-2 py-1 rounded-md bg-white-10 hover:bg-white-15 disabled:opacity-50 whitespace-nowrap"
              >
                {syncFacebookComments.isPending
                  ? 'Syncing…'
                  : syncFacebookComments.isSuccess
                    ? 'Queued ✓'
                    : 'Sync comments now'}
              </button>
            </div>
          )}
          {syncFacebookComments.isError && (
            <div className="mt-1 flex items-start gap-1.5 text-xs text-accent-red">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                {(syncFacebookComments.error as Error | null)?.message ??
                  "Failed to sync."}
              </span>
            </div>
          )}

          {/* IG sync block — gated on !instagramNeedsReconnect so the
              reconnect banner stays the only CTA when scopes are stale.
              Without that gate we'd send users into an IG poll that
              will 401 against Meta until they reconnect. */}
          {channel === 'INSTAGRAM' && isConnected && !instagramNeedsReconnect && (
              <div className="mt-2 flex items-center justify-between gap-2 p-2 rounded-md bg-white-5 text-white-60 text-xs">
                <div className="flex items-start gap-1.5">
                  <span>
                    Comments on your Squadpitch-published Instagram posts are
                    polled every 15 min. Force a check now.
                  </span>
                </div>
                <button
                  onClick={() => syncInstagramComments.mutate()}
                  disabled={syncInstagramComments.isPending}
                  className="text-[11px] font-medium px-2 py-1 rounded-md bg-white-10 hover:bg-white-15 disabled:opacity-50 whitespace-nowrap"
                >
                  {syncInstagramComments.isPending
                    ? "Syncing…"
                    : syncInstagramComments.isSuccess
                      ? "Queued ✓"
                      : "Sync comments now"}
                </button>
              </div>
            )}
          {syncInstagramComments.isError && (
            <div className="mt-1 flex items-start gap-1.5 text-xs text-accent-red">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                {(syncInstagramComments.error as Error | null)?.message ??
                  "Failed to sync."}
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-accent-red">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {pinterestNeedsBoard && (
            <div className="mt-2 flex items-center justify-between gap-2 p-2 rounded-md bg-zone-yellow/10 text-zone-yellow text-xs">
              <div className="flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  Pick a board so Squadpitch knows where to publish Pins.
                </span>
              </div>
              <button
                onClick={() => setPinterestPickerOpen(true)}
                className="text-[11px] font-medium px-2 py-1 rounded-md bg-zone-yellow/20 hover:bg-zone-yellow/30"
              >
                Pick board
              </button>
            </div>
          )}

          {pinterestHasBoard && (
            <button
              onClick={() => setPinterestPickerOpen(true)}
              className="mt-1 text-[11px] text-white-40 hover:text-white-60 underline-offset-2 hover:underline"
            >
              Change board
            </button>
          )}

          {gbpNeedsLocation && (
            <div className="mt-2 flex items-center justify-between gap-2 p-2 rounded-md bg-zone-yellow/10 text-zone-yellow text-xs">
              <div className="flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  Pick a Google Business Profile location to start polling
                  reviews.
                </span>
              </div>
              <button
                onClick={() => setGbpPickerOpen(true)}
                className="text-[11px] font-medium px-2 py-1 rounded-md bg-zone-yellow/20 hover:bg-zone-yellow/30"
              >
                Pick location
              </button>
            </div>
          )}

          {gbpHasLocation && (
            <div className="mt-1 flex items-center gap-3">
              <button
                onClick={() => setGbpPickerOpen(true)}
                className="text-[11px] text-white-40 hover:text-white-60 underline-offset-2 hover:underline"
              >
                Change location
              </button>
              <span className="text-white-20">·</span>
              <button
                onClick={() => checkGbpReviewAccess.mutate()}
                disabled={checkGbpReviewAccess.isPending}
                className="text-[11px] text-white-40 hover:text-white-60 underline-offset-2 hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                title="Run a single reviews.list call to see if Google has approved review API access yet"
              >
                {checkGbpReviewAccess.isPending ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> Checking…
                  </>
                ) : (
                  "Check review API access"
                )}
              </button>
            </div>
          )}

          {checkGbpReviewAccess.data && (
            <div
              className={cn(
                "mt-2 flex items-start gap-2 p-2 rounded-md text-xs",
                checkGbpReviewAccess.data.status === "ok"
                  ? "bg-accent-green-110/10 text-accent-green-110"
                  : checkGbpReviewAccess.data.status === "access_denied"
                    ? "bg-zone-yellow/10 text-zone-yellow"
                    : "bg-accent-red/10 text-accent-red",
              )}
            >
              {checkGbpReviewAccess.data.status === "ok" ? (
                <Link2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">
                {checkGbpReviewAccess.data.message}
              </span>
            </div>
          )}

          {gbpReviewAccessDenied && (
            <div className="mt-2 flex items-start gap-2 p-2 rounded-md bg-zone-yellow/10 text-zone-yellow text-xs">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">
                <p>
                  Awaiting Google Business Profile API access approval. Account
                  and location connection works, but review sync requires Google
                  allowlisting.
                </p>
                <a
                  href="https://developers.google.com/my-business/content/prereqs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-[11px] font-medium underline-offset-2 hover:underline"
                >
                  Check status of API access request →
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0 sm:items-end">
          {!meta.real && !connection ? (
            <button
              disabled
              className="min-h-11 w-full text-xs px-3 py-1.5 rounded-md bg-white-10 text-white-40 cursor-not-allowed sm:min-h-0 sm:w-auto"
            >
              Unavailable
            </button>
          ) : isConnected ? (
            <button
              onClick={handleDisconnect}
              disabled={disconnect.isPending}
              className="flex min-h-11 w-full items-center justify-center gap-1 rounded-md bg-accent-red/20 px-3 py-1.5 text-xs text-accent-red hover:bg-accent-red/30 disabled:opacity-50 sm:min-h-0 sm:w-auto"
            >
              {disconnect.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Unlink className="w-3 h-3" />
              )}
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={oauthPopup.isPending || !meta.real}
              className="flex min-h-11 w-full items-center justify-center gap-1 rounded-md bg-accent-green-110/20 px-3 py-1.5 text-xs text-accent-green-110 hover:bg-accent-green-110/30 disabled:opacity-50 sm:min-h-0 sm:w-auto"
            >
              {oauthPopup.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Link2 className="w-3 h-3" />
              )}
              {isBroken ? "Reconnect" : `Connect ${meta.label}`}
            </button>
          )}
        </div>
      </div>

      {pinterestPickerOpen && (
        <PinterestBoardPicker
          clientId={clientId}
          currentBoardId={connection?.externalAccountId ?? null}
          onClose={() => setPinterestPickerOpen(false)}
        />
      )}

      {gbpPickerOpen && (
        <GbpLocationPicker
          clientId={clientId}
          currentLocationName={connection?.externalAccountId ?? null}
          onClose={() => setGbpPickerOpen(false)}
        />
      )}
    </div>
  );
}
