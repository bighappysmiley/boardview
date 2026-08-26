import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requested = searchParams.get("next") ?? "/account";
  const next =
    requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/account";

  const redirectTo = (path: string) => NextResponse.redirect(`${origin}${path}`);

  if (!code) {
    return redirectTo("/login");
  }

  const response = redirectTo(next);
  const supabase = createRouteHandlerClient(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectTo(`/login?error=${encodeURIComponent(error.message)}`);
  }

  return response;
}
