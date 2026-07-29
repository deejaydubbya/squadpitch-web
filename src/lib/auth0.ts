import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";
import { appBaseUrl } from "@/lib/serverRuntimeConfig";
import { safeReturnTo } from "@/lib/authFlow";

let _auth0: Auth0Client | undefined;

export function getAuth0(): Auth0Client {
  if (!_auth0) {
    _auth0 = new Auth0Client({
      authorizationParameters: {
        audience: process.env.AUTH0_AUDIENCE,
        // offline_access requests a refresh token so the proxy can
        // silently refresh expired access tokens. Requires "Allow
        // Offline Access" to be enabled on the Auth0 API/audience.
        scope: "openid profile email offline_access",
      },
      async onCallback(error: any, ctx: any) {
        if (error) {
          console.error(
            "[auth0] Callback error:",
            error.code,
            error.message,
            error.cause,
          );
          return NextResponse.redirect(
            new URL(
              `/?auth_error=${encodeURIComponent(error.code || "unknown")}`,
              appBaseUrl(ctx.appBaseUrl),
            ),
          );
        }
        const returnTo = safeReturnTo(ctx.returnTo);
        return NextResponse.redirect(
          new URL(returnTo, appBaseUrl(ctx.appBaseUrl)),
        );
      },
    });
  }
  return _auth0;
}

// Lazily initialized proxy that binds methods to the real Auth0Client instance.
// This avoids build-time crashes (env vars unavailable in Docker build) while
// ensuring private fields are accessible (Auth0Client uses WeakMap-based #private).
export const auth0 = new Proxy({} as Auth0Client, {
  get(_, prop) {
    const target = getAuth0();
    const value = (target as any)[prop];
    if (typeof value === "function") {
      return value.bind(target);
    }
    return value;
  },
});
