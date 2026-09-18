import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/ip";

const dataApiUrl = process.env.NEXT_PUBLIC_NEON_DATA_API_URL;

/**
 * Neon Auth keeps the session in the browser client. Ban checks still run
 * here so a blocked network is turned away before the page loads.
 */
export async function refreshSession(request: NextRequest) {
  return NextResponse.next({ request });
}

export async function checkSupportBan(request: NextRequest, response: NextResponse) {
  if (!dataApiUrl) return response;

  const ip = getClientIp(request);
  const token = request.cookies.get("bv_support_token")?.value ?? null;

  try {
    const banned = await fetch(`${dataApiUrl.replace(/\/$/, "")}/rpc/is_support_banned`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ check_ip: ip, check_token: token }),
      signal: AbortSignal.timeout(2000),
    });
    if (banned.ok && (await banned.json()) === true) {
      const blocked = NextResponse.redirect(new URL("/banned", request.url));
      for (const cookie of response.cookies.getAll()) {
        blocked.cookies.set(cookie.name, cookie.value);
      }
      blocked.cookies.set("bv_banned", "1", {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        httpOnly: true,
        sameSite: "lax",
      });
      return blocked;
    }
  } catch {
    return response;
  }

  return response;
}
