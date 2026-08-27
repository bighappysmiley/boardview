"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { CommandMenu, useCommandComposer } from "@/components/CommandMenu";
import { DeleteClosed } from "@/components/DeleteClosed";
import { FormError, TextArea } from "@/components/form";
import { Container, Section } from "@/components/layout";
import { SetupNotice } from "@/components/SetupNotice";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import type { Ticket, TicketMessage } from "@/lib/types";
import { formatDateTime, messageAuthorLabel } from "@/lib/types";
import { findCommand, slashMenuQuery, type CommandDef } from "@/lib/commands";

export default function TicketThreadPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isStaff, permissions, loading } = useSession();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const composer = useCommandComposer(permissions);
  const replyRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    if (!ready || !isStaff) return;
    replyRef.current?.focus();
  }, [ready, isStaff]);

  const backHref = isStaff ? "/admin" : "/account/help";

  const sendBody = useCallback(
    async (text: string) => {
      if (!ticket) return;
      const body = text.trim();
      if (!body) return;
      setError(null);
      setSending(true);
      const response = await fetch("/api/support/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: ticket.id, body }),
      });
      const payload = (await response.json()) as {
        error?: string;
        command?: string;
      };
      setSending(false);
      if (!response.ok) {
        setError(payload.error ?? "We couldn't send that.");
        return;
      }
      if (payload.command === "delete") {
        router.push(backHref);
        return;
      }
      setReply("");
      await load();
    },
    [ticket, load, router, backHref]
  );

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
        <Link href="/account/help" className="mt-4 inline-block font-medium hover:underline">
          Back to support
        </Link>
      </Section>
    );
  }

  const canModerate = isStaff && permissions.moderate;
  const menuOpen = isStaff && slashMenuQuery(reply) !== null;

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !ticket) return;
    if (menuOpen) {
      const token = reply.trim().slice(1);
      const exact = token && !token.includes(" ") ? findCommand(token) : null;
      if (!exact) {
        const items = composer.itemsFor(reply);
        const picked = items[composer.activeIndex];
        if (picked) applyCommand(picked);
        return;
      }
      if (exact.hint) {
        setReply(composer.pickInsert(exact));
        composer.setActiveIndex(0);
        return;
      }
    }
    await sendBody(reply);
  }

  function applyCommand(command: CommandDef) {
    if (command.hint) {
      setReply(composer.pickInsert(command));
      composer.setActiveIndex(0);
      return;
    }
    void sendBody(`/${command.verb}`);
  }

  function onReplyKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const items = isStaff ? composer.itemsFor(reply) : [];
    if (items.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        composer.setActiveIndex((current) => (current + 1) % items.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        composer.setActiveIndex(
          (current) => (current - 1 + items.length) % items.length
        );
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        applyCommand(items[composer.activeIndex] ?? items[0]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setReply("");
        return;
      }
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  async function setStatus(status: Ticket["status"]) {
    await sendBody(status === "closed" ? "/close" : "/reopen");
  }

  async function deleteClosed() {
    await sendBody("/delete");
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
        {isStaff && ticket.subject !== "Support" && (
          <p className="mt-1 text-sm text-muted">{ticket.subject}</p>
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

        {(ticket.status === "open" || isStaff) && (
          <form onSubmit={sendReply} className="mt-10 space-y-4">
            {isStaff ? (
              <div className="relative">
                <CommandMenu
                  value={reply}
                  permissions={permissions}
                  activeIndex={composer.activeIndex}
                  onActiveIndex={composer.setActiveIndex}
                  onPick={applyCommand}
                />
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">
                    Reply
                  </span>
                  <textarea
                    ref={replyRef}
                    required
                    maxLength={4000}
                    value={reply}
                    onChange={(e) => {
                      setReply(e.target.value);
                      composer.setActiveIndex(0);
                    }}
                    onKeyDown={onReplyKeyDown}
                    placeholder="Write a reply, or / for commands"
                    className="min-h-24 w-full resize-y rounded-lg border border-black/10 bg-white px-3.5 py-2.5 text-base text-foreground placeholder:text-muted/70 transition-colors hover:border-black/20 focus-visible:border-foreground"
                  />
                  <span className="mt-1.5 block text-sm text-muted">
                    Enter to send. Shift+Enter for a new line. Type / for
                    commands.
                  </span>
                </label>
              </div>
            ) : (
              <TextArea
                label="Reply"
                required
                maxLength={4000}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={onReplyKeyDown}
                hint="Enter to send. Shift+Enter for a new line."
              />
            )}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={sending}>
                {sending ? "Sending…" : "Send"}
              </Button>
              {canModerate && ticket.status === "open" && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStatus("closed")}
                >
                  Close
                </Button>
              )}
              {canModerate && ticket.status === "closed" && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStatus("open")}
                  >
                    Reopen
                  </Button>
                  <DeleteClosed onDelete={deleteClosed} disabled={sending} />
                </>
              )}
            </div>
          </form>
        )}
      </Container>
    </div>
  );
}
