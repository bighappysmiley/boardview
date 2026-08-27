import { NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/ip";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const HELP = [
  "/ban — block this visitor’s network",
  "/unban — restore access",
  "/close — close the conversation",
  "/note … — private note (visitor cannot see it)",
  "/help — this list",
].join("\n");

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Support isn’t available yet." },
      { status: 503 }
    );
  }

  const body = (await request.json()) as {
    ticketId?: string;
    token?: string;
    name?: string;
    body?: string;
  };
  const ticketId = typeof body.ticketId === "string" ? body.ticketId : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const token = typeof body.token === "string" ? body.token : "";
  const name = typeof body.name === "string" ? body.name.trim() : "Visitor";

  if (!ticketId || !text) {
    return NextResponse.json({ error: "Enter a message." }, { status: 400 });
  }

  const outgoing = NextResponse.json({ ok: true });
  const supabaseAuth = createRouteHandlerClient(request, outgoing);
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  const command = text.startsWith("/")
    ? text.slice(1).match(/^(\w+)\s*([\s\S]*)$/)
    : null;

  if (user && command) {
    const verb = command[1].toLowerCase();
    const arg = command[2].trim();
    const { data: staff } = await supabaseAuth.rpc("is_staff");
    if (staff) {
      if (verb === "ban") {
        const { error } = await supabaseAuth.rpc("ban_visitor", {
          p_ticket: ticketId,
        });
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json({ ok: true, command: "ban" });
      }
      if (verb === "unban") {
        const { error } = await supabaseAuth.rpc("unban_visitor", {
          p_ticket: ticketId,
        });
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json({ ok: true, command: "unban" });
      }
      if (verb === "close") {
        await supabaseAuth
          .from("tickets")
          .update({ status: "closed" })
          .eq("id", ticketId);
        await supabaseAuth.rpc("post_system_message", {
          p_ticket: ticketId,
          p_body: "This conversation is closed.",
        });
        return NextResponse.json({ ok: true, command: "close" });
      }
      if (verb === "note") {
        if (!arg) {
          return NextResponse.json(
            { error: "Write a note after /note." },
            { status: 400 }
          );
        }
        const display =
          (await supabaseAuth.rpc("my_staff_display_name")).data ?? "Support";
        const { error } = await supabaseAuth.from("ticket_messages").insert({
          ticket_id: ticketId,
          author_id: user.id,
          body: arg,
          kind: "note",
          author_name: display,
        });
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json({ ok: true, command: "note" });
      }
      if (verb === "help") {
        const display =
          (await supabaseAuth.rpc("my_staff_display_name")).data ?? "Support";
        await supabaseAuth.from("ticket_messages").insert({
          ticket_id: ticketId,
          author_id: user.id,
          body: HELP,
          kind: "note",
          author_name: display,
        });
        return NextResponse.json({ ok: true, command: "help" });
      }
    }
  }

  if (token) {
    const anon = createAnonClient();
    const { data, error } = await anon.rpc("send_visitor_message", {
      p_ticket: ticketId,
      p_token: token,
      p_body: text,
      p_ip: getClientIp(request),
      p_name: name,
    });
    if (error) {
      const banned = error.message.toLowerCase().includes("banned");
      return NextResponse.json(
        { error: banned ? "banned" : error.message },
        { status: banned ? 403 : 400 }
      );
    }
    return NextResponse.json({ ok: true, message: data });
  }

  if (!user) {
    return NextResponse.json({ error: "Sign in to reply." }, { status: 401 });
  }

  const display =
    (await supabaseAuth.rpc("my_staff_display_name")).data ??
    user.user_metadata?.full_name ??
    "Support";
  const isStaff = Boolean(await supabaseAuth.rpc("is_staff").then((r) => r.data));

  const { error } = await supabaseAuth.from("ticket_messages").insert({
    ticket_id: ticketId,
    author_id: user.id,
    body: text,
    kind: isStaff ? "staff" : "user",
    author_name: isStaff ? display : name || "You",
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return outgoing;
}
