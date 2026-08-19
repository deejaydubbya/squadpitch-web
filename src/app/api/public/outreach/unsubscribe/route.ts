import { NextRequest, NextResponse } from "next/server";
import { squadpitchApiUrl } from "@/lib/serverRuntimeConfig";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const response = await fetch(`${squadpitchApiUrl()}/api/v1/public/outreach/unsubscribe?token=${encodeURIComponent(token)}`, { cache: "no-store" });
  return new NextResponse(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") || "text/html; charset=utf-8" } });
}
