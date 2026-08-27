"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { FormError, TextArea } from "@/components/form";
import { Container, Section } from "@/components/layout";
import { SetupNotice } from "@/components/SetupNotice";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import type { Ticket, TicketMessage } from "@/lib/types";
import { formatDateTime, messageAuthorLabel } from "@/lib/types";

export default function TicketThreadPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isStaff, loading } = useSession();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: ticketRow }, { data: messageRows }] = await Promise.all([
      supabase.from("tickets").select("*").eq("id", params.id).single(),
      supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", params.id)
        .order("created_at"),
    ]);
    setTicket((ticketRow as Ticket | null) ?? null);
    setMessages((messageRows ?? []) as TicketMessage[]);
  }, [params.id]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (loading) return;
    if (!user) {
      router.replace("/login?next=/account/help");
      return;
    }
    let active = true;
    Promise.resolve().then(async () => {
      await load();
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, [user, loading, load, router]);

  if (!isSupabaseConfigured) return <SetupNotice what="Support" />;

  if (loading) {
    return (
      <Section>
        <p className="text-muted">One moment…</p>
      </Section>
    );
  }

  if (!user || !ready) {
    return (
      <Section>
        <p className="text-muted">One moment…</p>
      </Section>
    );
  }

  if (!ticket) {
    return (
      <Section size="narrow">
        <p className="text-muted">We couldn&apos;t find that request.</p>
        <Link href="/account/help" className="mt-4 inline-block text-accent">
          Back to support
        </Link>
      </Section>
    );
  }

  const backHref = isStaff ? "/admin" : "/account/help";

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !ticket) return;
    setError(null);
    setSending(true);
    const response = await fetch("/api/support/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: ticket.id, body: reply.trim() }),
    });
    const payload = (await response.json()) as { error?: string };
    setSending(false);
    if (!response.ok) {
      setError(payload.error ?? "We couldn't send that.");
      return;
    }
    setReply("");
    await load();
  }

  async function setStatus(status: Ticket["status"]) {
    if (!ticket) return;
    await createClient().from("tickets").update({ status }).eq("id", ticket.id);
    await load();
  }

  return (
    <div className="py-16 sm:py-20">
      <Container size="narrow">
        <Link href={backHref} className="text-sm text-muted hover:text-foreground">
          {isStaff ? "Inbox" : "Support"}
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {ticket.visitor_name || ticket.subject}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {ticket.contact_email}
          {isStaff && ticket.last_ip ? ` · ${ticket.last_ip}` : ""} ·{" "}
          {ticket.status === "open" ? "Open" : "Closed"}
        </p>
        {isStaff && (
          <p className="mt-2 text-sm text-muted">
            Commands: /ban, /unban, /close, /note, /help — they are not shown
            as your message.
          </p>
        )}

        <ol className="mt-10 space-y-6">
          {messages.map((message) => (
            <li key={message.id} className="border-t border-black/10 pt-6">
              <p className="text-sm text-muted">
                {messageAuthorLabel(
                  message,
                  user.id,
                  ticket.visitor_name || ticket.contact_email
                )}{" "}
                · {formatDateTime(message.created_at)}
              </p>
              <p
                className={`mt-2 whitespace-pre-wrap leading-relaxed ${
                  message.kind === "note" ? "text-muted italic" : ""
                }`}
              >
                {message.body}
              </p>
            </li>
          ))}
        </ol>

        {error && (
          <div className="mt-8">
            <FormError message={error} />
          </div>
        )}

        {ticket.status === "open" ? (
          <form onSubmit={sendReply} className="mt-10 space-y-5">
            <TextArea
              label="Reply"
              required
              maxLength={4000}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={sending}>
                {sending ? "Sending…" : "Reply"}
              </Button>
              {isStaff && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStatus("closed")}
                >
                  Close
                </Button>
              )}
            </div>
          </form>
        ) : (
          isStaff && (
            <Button
              className="mt-10"
              variant="secondary"
              onClick={() => setStatus("open")}
            >
              Reopen
            </Button>
          )
        )}
      </Container>
    </div>
  );
}
