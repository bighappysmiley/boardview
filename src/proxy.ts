import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/ip";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname === "/banned" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/support")
  ) {
    return NextResponse.next();
  }

  if (request.cookies.get("bv_banned")?.value === "1") {
    return NextResponse.redirect(new URL("/banned", request.url));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.next();

  const ip = getClientIp(request);
  const token = request.cookies.get("bv_support_token")?.value ?? null;

  try {
    const response = await fetch(`${url}/rest/v1/rpc/is_support_banned`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ check_ip: ip, check_token: token }),
    });
    if (response.ok && (await response.json()) === true) {
      const blocked = NextResponse.redirect(new URL("/banned", request.url));
      blocked.cookies.set("bv_banned", "1", {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        httpOnly: true,
        sameSite: "lax",
      });
      return blocked;
    }
  } catch {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
