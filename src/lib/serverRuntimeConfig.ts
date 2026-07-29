function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function serverUrl(
  name: string,
  value: string | undefined,
  developmentFallback: string,
): string {
  const resolved = value?.trim();
  if (resolved) {
    const url = new URL(resolved);
    if (isProduction() && url.protocol !== "https:") {
      throw new Error(`${name} must use HTTPS in production`);
    }
    return url.origin;
  }

  if (isProduction()) {
    throw new Error(`${name} is required in production`);
  }
  return developmentFallback;
}

export function appBaseUrl(contextValue?: string): string {
  return serverUrl(
    "APP_BASE_URL",
    contextValue || process.env.APP_BASE_URL,
    "http://localhost:3000",
  );
}

export function squadpitchApiUrl(): string {
  return serverUrl(
    "SQUADPITCH_API_URL",
    process.env.SQUADPITCH_API_URL,
    "http://localhost:4000",
  );
}
