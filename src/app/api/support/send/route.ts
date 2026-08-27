import { NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/ip";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { canRunCommand, findCommand, helpText } from "@/lib/commands";
import { resolvePermissions, type StaffPermissions } from "@/lib/permissions";
import type { StaffRole } from "@/lib/types";

type StaffProfile = {
  display_name: string;
  title: string;
  role: StaffRole;
  permissions: StaffPermissions;
};

type TicketRow = {
  id: string;
  contact_email: string;
  subject: string;
  status: string;
  visitor_name: string | null;
  visitor_token: string | null;
  last_ip: string | null;
};

async function profileOf(
  supabase: ReturnType<typeof createRouteHandlerClient>
): Promise<StaffProfile | null> {
  const { data } = await supabase.rpc("my_staff_profile");
  const rowData = Array.isArray(data) ? data[0] : data;
  if (!rowData || typeof rowData !== "object") return null;
  const row = rowData as {
    display_name?: string;
    title?: string;
    role?: StaffRole;
    permissions?: unknown;
  };
  const role = row.role === "admin" ? "admin" : "staff";
  return {
    display_name: row.display_name?.trim() || "Support",
    title: row.title?.trim() || "Support",
    role,
    permissions: resolvePermissions(role, row.permissions),
  };
}

async function audit(
  supabase: ReturnType<typeof createRouteHandlerClient>,
  action: string,
  ticketId: string,
  target?: string | null,
  detail?: Record<string, unknown>
) {
  await supabase.rpc("write_audit", {
    p_action: action,
    p_ticket: ticketId,
    p_target: target ?? null,
    p_detail: detail ?? null,
  });
}

async function postNote(
  supabase: ReturnType<typeof createRouteHandlerClient>,
  ticketId: string,
  userId: string,
  body: string,
  profile: StaffProfile
) {
  return supabase.from("ticket_messages").insert({
    ticket_id: ticketId,
    author_id: userId,
    body,
    kind: "note",
    author_name: profile.display_name,
    author_title: profile.title,
  });
}

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
      const profile =
        (await profileOf(supabaseAuth)) ??
        ({
          display_name: "Support",
          title: "Support",
          role: "staff",
          permissions: resolvePermissions("staff"),
        } satisfies StaffProfile);

      const def = findCommand(verb);
      if (!def) {
        return NextResponse.json(
          { error: "Unknown command. Type / for a list." },
          { status: 400 }
        );
      }
      if (!canRunCommand(def, profile.permissions)) {
        return NextResponse.json(
          { error: "You don’t have permission for that." },
          { status: 403 }
        );
      }

      const { data: ticket } = await supabaseAuth
        .from("tickets")
        .select(
          "id, contact_email, subject, status, visitor_name, visitor_token, last_ip"
        )
        .eq("id", ticketId)
        .single();
      const row = ticket as TicketRow | null;

      if (def.macro) {
        const { error } = await supabaseAuth.from("ticket_messages").insert({
          ticket_id: ticketId,
          author_id: user.id,
          body: def.macro,
          kind: "staff",
          author_name: profile.display_name,
          author_title: profile.title,
        });
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        await audit(supabaseAuth, verb, ticketId, row?.contact_email);
        return NextResponse.json({ ok: true, command: verb });
      }

      if (verb === "ban" || verb === "spam") {
        const { error } = await supabaseAuth.rpc("ban_visitor", {
          p_ticket: ticketId,
        });
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        await audit(
          supabaseAuth,
          verb,
          ticketId,
          row?.contact_email,
          { ip: row?.last_ip }
        );
        return NextResponse.json({ ok: true, command: verb });
      }

      if (verb === "unban") {
        const { error } = await supabaseAuth.rpc("unban_visitor", {
          p_ticket: ticketId,
        });
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        await audit(supabaseAuth, "unban", ticketId, row?.contact_email);
        return NextResponse.json({ ok: true, command: "unban" });
      }

      if (verb === "close" || verb === "resolve") {
        await supabaseAuth
          .from("tickets")
          .update({ status: "closed" })
          .eq("id", ticketId);
        await supabaseAuth.rpc("post_system_message", {
          p_ticket: ticketId,
          p_body:
            verb === "resolve"
              ? "This has been resolved."
              : "This conversation is closed.",
        });
        await audit(supabaseAuth, verb, ticketId, row?.contact_email);
        return NextResponse.json({ ok: true, command: verb });
      }

      if (verb === "reopen") {
        await supabaseAuth
          .from("tickets")
          .update({ status: "open" })
          .eq("id", ticketId);
        await supabaseAuth.rpc("post_system_message", {
          p_ticket: ticketId,
          p_body: "This conversation is open again.",
        });
        await audit(supabaseAuth, "reopen", ticketId, row?.contact_email);
        return NextResponse.json({ ok: true, command: "reopen" });
      }

      if (verb === "subject") {
        if (!arg) {
          return NextResponse.json(
            { error: "Write the new subject after /subject." },
            { status: 400 }
          );
        }
        const { error } = await supabaseAuth
          .from("tickets")
          .update({ subject: arg.slice(0, 120) })
          .eq("id", ticketId);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        await postNote(
          supabaseAuth,
          ticketId,
          user.id,
          `Subject set to “${arg.slice(0, 120)}”.`,
          profile
        );
        await audit(supabaseAuth, "subject", ticketId, arg.slice(0, 120));
        return NextResponse.json({ ok: true, command: "subject" });
      }

      if (verb === "note") {
        if (!arg) {
          return NextResponse.json(
            { error: "Write a note after /note." },
            { status: 400 }
          );
        }
        const { error } = await postNote(
          supabaseAuth,
          ticketId,
          user.id,
          arg,
          profile
        );
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        await audit(supabaseAuth, "note", ticketId, row?.contact_email);
        return NextResponse.json({ ok: true, command: "note" });
      }

      if (verb === "who") {
        const lines = [
          `Name: ${row?.visitor_name || "—"}`,
          `Email: ${row?.contact_email || "—"}`,
          `Network: ${row?.last_ip || "—"}`,
          `Status: ${row?.status || "—"}`,
          `Subject: ${row?.subject || "—"}`,
        ].join("\n");
        const { error } = await postNote(
          supabaseAuth,
          ticketId,
          user.id,
          lines,
          profile
        );
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        await audit(supabaseAuth, "who", ticketId, row?.contact_email);
        return NextResponse.json({ ok: true, command: "who" });
      }

      if (verb === "help") {
        const { error } = await postNote(
          supabaseAuth,
          ticketId,
          user.id,
          helpText(profile.permissions),
          profile
        );
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
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

  const profile = await profileOf(supabaseAuth);
  const isStaff = Boolean(
    await supabaseAuth.rpc("is_staff").then((r) => r.data)
  );
  const display =
    profile?.display_name ??
    (await supabaseAuth.rpc("my_staff_display_name")).data ??
    user.user_metadata?.full_name ??
    "Support";

  const { error } = await supabaseAuth.from("ticket_messages").insert({
    ticket_id: ticketId,
    author_id: user.id,
    body: text,
    kind: isStaff ? "staff" : "user",
    author_name: isStaff ? display : name || "You",
    author_title: isStaff ? profile?.title ?? "Support" : null,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return outgoing;
}
