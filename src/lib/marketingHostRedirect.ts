export const REAL_ESTATE_MARKETING_URL = "https://real-estate.squadpitch.com";

export function normalizeRequestHost(host: string | null): string {
  return (host ?? "").split(":")[0].trim().toLowerCase();
}

export function mainMarketingRedirect(
  host: string | null,
  pathname: string,
  search: string,
): URL | null {
  if (normalizeRequestHost(host) !== "squadpitch.com" || pathname !== "/") {
    return null;
  }

  const destination = new URL(REAL_ESTATE_MARKETING_URL);
  destination.search = search;
  return destination;
}
