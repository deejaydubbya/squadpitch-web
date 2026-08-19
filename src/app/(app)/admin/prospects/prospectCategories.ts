import type { AgentOutreachProspect } from "@/hooks/useAdmin";

export const rejectedDiscoveryStatuses = new Set([
  "DISCOVERED",
  "NO_EMAIL",
  "INVALID_EMAIL",
  "NO_ACTIVE_LISTINGS",
  "SUPPRESSED",
  "SCRAPE_ERROR",
  "UNSUPPORTED_PAGE",
]);

export const alreadyTargetedStatuses = new Set([
  "ALREADY_TARGETED",
  "DUPLICATE",
  "PREVIEW_PENDING",
  "PREVIEW_GENERATING",
  "PREVIEW_FAILED",
  "READY_TO_EMAIL",
  "EMAIL_QUEUED",
  "EMAIL_SENDING",
  "EMAIL_SENT",
  "EMAIL_FAILED",
  "CLAIMED",
  "BOUNCED",
  "UNSUBSCRIBED",
]);

export type DiscoveryCategory = "qualified" | "rejected" | "alreadyTargeted";

export function discoveryCategory(
  prospect: AgentOutreachProspect,
): DiscoveryCategory | null {
  if (!prospect.discoveryRunId) return null;
  if (
    prospect.status === "QUALIFIED" &&
    Boolean(prospect.email) &&
    prospect.activeListingCount >= 1 &&
    !prospect.rejectionReason
  )
    return "qualified";
  if (alreadyTargetedStatuses.has(prospect.status)) return "alreadyTargeted";
  if (
    rejectedDiscoveryStatuses.has(prospect.status) ||
    prospect.status !== "QUALIFIED"
  )
    return "rejected";
  return "rejected";
}

export function groupDiscoveryProspects(prospects: AgentOutreachProspect[]) {
  const groups: Record<DiscoveryCategory, AgentOutreachProspect[]> = {
    qualified: [],
    rejected: [],
    alreadyTargeted: [],
  };
  for (const prospect of prospects) {
    const category = discoveryCategory(prospect);
    if (category) groups[category].push(prospect);
  }
  return groups;
}
