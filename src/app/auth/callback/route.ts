import { NextResponse } from "next/server";

/**
 * Password-reset and verification links from Neon Auth land here with a
 * token. The browser client completes the flow on /reset-password.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const requested = searchParams.get("next") ?? "/reset-password";
  const next =
    requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/reset-password";

  const token =
    searchParams.get("token") ??
    searchParams.get("code") ??
    "";
  const url = new URL(next, origin);
  if (token) url.searchParams.set("token", token);
  return NextResponse.redirect(url);
}
