export type AuthIntent = "login" | "signup";

const DEFAULT_RETURN_TO = "/onboarding";
const SAFE_ORIGIN = "https://app.squadpitch.com";

export function safeReturnTo(
  candidate: string | null | undefined,
  fallback = DEFAULT_RETURN_TO,
): string {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }
  if (candidate.includes("\\") || /[\u0000-\u001f\u007f]/.test(candidate)) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, SAFE_ORIGIN);
    if (parsed.origin !== SAFE_ORIGIN) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function authPath(
  intent: AuthIntent,
  returnTo: string = DEFAULT_RETURN_TO,
): string {
  const route = intent === "signup" ? "/auth/signup" : "/auth/login";
  return `${route}?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`;
}

export function authHref(
  appOrigin: string,
  intent: AuthIntent,
  returnTo?: string,
): string {
  return new URL(authPath(intent, returnTo), appOrigin).toString();
}

export function authErrorMessage(
  code: string | null | undefined,
): string | null {
  if (!code) return null;
  if (code === "access_denied") {
    return "Login was cancelled. You can try again whenever you’re ready.";
  }
  return "We couldn’t complete authentication. Please try again.";
}
