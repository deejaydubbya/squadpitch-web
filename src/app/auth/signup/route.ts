import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { safeReturnTo } from "@/lib/authFlow";

export async function GET(request: NextRequest) {
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const session = await auth0.getSession(request);

  if (session) {
    return NextResponse.redirect(new URL(returnTo, request.nextUrl.origin));
  }

  const login = new URL("/auth/login", request.nextUrl.origin);
  login.searchParams.set("screen_hint", "signup");
  login.searchParams.set("returnTo", returnTo);
  return NextResponse.redirect(login);
}
