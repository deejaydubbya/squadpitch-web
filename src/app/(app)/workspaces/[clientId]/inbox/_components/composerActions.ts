import type { ReplyActionDescriptor, ReplyActionId } from '@/hooks/useInbox';

const PRIMARY_ACTIONS: ReplyActionId[] = ['REPLY_REVIEW', 'REPLY_PUBLIC_COMMENT', 'SEND_EMAIL'];

export function primaryReplyAction(actions: ReplyActionDescriptor[]) {
  return PRIMARY_ACTIONS.map((id) => actions.find((a) => a.action === id)).find(
    (action): action is ReplyActionDescriptor => Boolean(action),
  ) ?? null;
}

export function shouldDefaultToPrimary(actions: ReplyActionDescriptor[]) {
  return primaryReplyAction(actions)?.available === true;
}

export function isProviderConnectionAction(action: ReplyActionDescriptor | null) {
  return Boolean(action?.requiresConfig && ['REPLY_PUBLIC_COMMENT', 'REPLY_REVIEW', 'REPLY_DM'].includes(action.action));
}
