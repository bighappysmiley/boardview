import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkSupportBan, refreshSession } from "@/lib/supabase/proxy";
import { isNeonConfigured } from "@/lib/neon";

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

  let response = NextResponse.next({ request });
  try {
    response = await refreshSession(request);
  } catch {
    response = NextResponse.next({ request });
  }

  if (!isNeonConfigured) return response;
  return checkSupportBan(request, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
