import { NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/ip";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Support isn’t available yet." },
      { status: 503 }
    );
  }

  const body = (await request.json()) as {
    name?: string;
    email?: string;
    token?: string;
  };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const token =
    typeof body.token === "string" && body.token.length > 10
      ? body.token
      : crypto.randomUUID();

  const sessionResponse = NextResponse.json({});
  const session = createRouteHandlerClient(request, sessionResponse);
  const {
    data: { user },
  } = await session.auth.getUser();

  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc("start_support", {
    p_name: name,
    p_email: email,
    p_token: token,
    p_ip: getClientIp(request),
    p_owner: user?.id ?? null,
  });

  if (error) {
    const banned = error.message.toLowerCase().includes("banned");
    return NextResponse.json(
      { error: banned ? "banned" : error.message },
      { status: banned ? 403 : 400 }
    );
  }

  const outgoing = NextResponse.json({ token, ticketId: data });
  outgoing.cookies.set("bv_support_token", token, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return outgoing;
}
