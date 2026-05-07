// Maps a backend `publishError` string to a customer-safe message and a
// next action. The backend stores `err.message` (a sentence we wrote) — so
// this is best-effort string matching, not a code lookup. We never show
// the raw error verbatim to the customer because some upstream providers
// echo internal IDs, stack-trace fragments, or Meta error codes.

export type PublishActionKind =
  | 'reconnect'
  | 'retry'
  | 'edit'
  | 'contact_support';

export interface PublishAction {
  kind: PublishActionKind;
  label: string;
  /** Relative href for navigation actions; absent for inline button actions. */
  href?: string;
}

export interface FriendlyPublishError {
  /** One-line, customer-safe summary. Never raw stack/IDs. */
  message: string;
  /** Optional one-liner to expand on the message. */
  detail?: string;
  /** What the user should do next. */
  actions: PublishAction[];
}

interface PublishErrorInput {
  publishError: string | null | undefined;
  channel: string;
  clientId: string;
}

const channelsLabel = (raw: string) => {
  if (!raw) return 'this channel';
  const lower = raw.toLowerCase();
  // Title-case the few channels we care about for display.
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

export function interpretPublishError({
  publishError,
  channel,
  clientId,
}: PublishErrorInput): FriendlyPublishError | null {
  if (!publishError || !publishError.trim()) return null;

  const lower = publishError.toLowerCase();
  const settingsHref = `/workspaces/${clientId}/settings/channels`;
  const channelLabel = channelsLabel(channel);

  // Order matters: most specific patterns first.

  // CHANNEL_NOT_CONNECTED
  if (
    lower.includes('not connected') ||
    lower.includes('channel_not_connected')
  ) {
    return {
      message: `${channelLabel} isn't connected for this workspace.`,
      detail: 'Connect the channel and try again.',
      actions: [
        { kind: 'reconnect', label: `Connect ${channelLabel}`, href: settingsHref },
      ],
    };
  }

  // TOKEN_EXPIRED / NEEDS_RECONNECT
  if (
    lower.includes('token_expired') ||
    lower.includes('access has expired') ||
    lower.includes('needs_reconnect') ||
    lower.includes('needs reconnect') ||
    lower.includes('expired')
  ) {
    return {
      message: `${channelLabel} access has expired.`,
      detail: 'Reconnect the channel to publish.',
      actions: [
        { kind: 'reconnect', label: `Reconnect ${channelLabel}`, href: settingsHref },
      ],
    };
  }

  // PROVIDER_AUTH_FAILED — token rejected upstream after refresh
  if (
    lower.includes('provider_auth_failed') ||
    lower.includes('unauthorized') ||
    lower.includes('forbidden') ||
    lower.includes('oauth')
  ) {
    return {
      message: `${channelLabel} rejected our credentials.`,
      detail: 'This usually means you revoked access on the provider. Reconnect to fix it.',
      actions: [
        { kind: 'reconnect', label: `Reconnect ${channelLabel}`, href: settingsHref },
      ],
    };
  }

  // RATE_LIMITED
  if (
    lower.includes('rate_limited') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests')
  ) {
    return {
      message: `${channelLabel} is rate-limiting our publishes.`,
      detail: 'Try again in a few minutes.',
      actions: [{ kind: 'retry', label: 'Try publishing again' }],
    };
  }

  // PROVIDER_TIMEOUT
  if (
    lower.includes('provider_timeout') ||
    lower.includes('timed out') ||
    lower.includes('timeout')
  ) {
    return {
      message: `${channelLabel} took too long to respond.`,
      detail: 'This is usually temporary. Retry the publish.',
      actions: [{ kind: 'retry', label: 'Retry publish' }],
    };
  }

  // VALIDATION_FAILED
  if (
    lower.includes('validation_failed') ||
    lower.includes('caption') ||
    lower.includes('media') ||
    lower.includes('invalid')
  ) {
    return {
      message: `${channelLabel} rejected this post.`,
      detail: 'Edit the caption or media so it meets the channel’s requirements, then retry.',
      actions: [
        { kind: 'edit', label: 'Edit post' },
        { kind: 'retry', label: 'Retry publish' },
      ],
    };
  }

  // PROVIDER_NO_EXTERNAL_ID — provider returned success without an ID
  if (lower.includes('no external post id')) {
    return {
      message: `${channelLabel} accepted the post but didn’t confirm publication.`,
      detail: 'Retrying is safe — duplicate publishes are blocked.',
      actions: [{ kind: 'retry', label: 'Retry publish' }],
    };
  }

  // Generic transient
  return {
    message: `${channelLabel} couldn’t publish this post.`,
    detail: 'Something went wrong upstream. Retry the publish, or contact support if it keeps happening.',
    actions: [
      { kind: 'retry', label: 'Retry publish' },
      { kind: 'contact_support', label: 'Contact support' },
    ],
  };
}
