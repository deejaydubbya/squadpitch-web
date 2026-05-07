/**
 * Returns true if the user should be auto-redirected from /workspaces to
 * /onboarding. Used by the workspaces page to skip the empty-state for
 * brand-new accounts.
 *
 * Rules:
 *   - Don't redirect while clients are still loading.
 *   - Don't redirect if the API errored — let the user see the error.
 *   - Don't redirect if `clients` is not yet an array (defensive against
 *     undefined during the first render).
 *   - Redirect only when the array is *empty* (a returning user has at
 *     least one workspace).
 */
export function shouldRedirectToOnboarding(state: {
  isLoading: boolean;
  error: unknown;
  clients: ReadonlyArray<unknown> | undefined | null;
}): boolean {
  if (state.isLoading) return false;
  if (state.error) return false;
  if (!Array.isArray(state.clients)) return false;
  return state.clients.length === 0;
}
