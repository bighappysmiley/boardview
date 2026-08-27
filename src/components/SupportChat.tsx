"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import type { Ticket, TicketMessage } from "@/lib/types";

export function SupportChat() {
  const pathname = usePathname();
  const { user, loading } = useSession();
  const panelId = useId();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const loginNext =
    pathname.startsWith("/login") || pathname.startsWith("/signup")
      ? "/account"
      : pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open, user, ready]);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;
    let active = true;
    const supabase = createClient();
    Promise.resolve().then(async () => {
      if (!active) return;
      setReady(false);
      const { data } = await supabase
        .from("tickets")
        .select("*")
        .eq("owner_id", user.id)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!active) return;
      const nextTicket = (data as Ticket | null) ?? null;
      setTicket(nextTicket);
      if (!nextTicket) {
        setMessages([]);
        setReady(true);
        return;
      }
      const { data: rows } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", nextTicket.id)
        .order("created_at");
      if (!active) return;
      setMessages((rows ?? []) as TicketMessage[]);
      setReady(true);
    });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!isSupabaseConfigured || !ticket?.id) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`support:${ticket.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${ticket.id}`,
        },
        (payload) => {
          const row = payload.new as TicketMessage;
          setMessages((current) =>
            current.some((message) => message.id === row.id)
              ? current
              : [...current, row]
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket?.id]);

  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [open, messages.length]);

  const lastMessage = messages[messages.length - 1];
  const unread =
    Boolean(user && lastMessage && lastMessage.author_id !== user.id);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !user?.email) return;

    setError(null);
    setSending(true);
    const supabase = createClient();
    let ticketId = ticket?.id;

    if (!ticketId) {
      const subject = text.length > 80 ? `${text.slice(0, 77)}…` : text;
      const { data, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          owner_id: user.id,
          contact_email: user.email,
          subject,
        })
        .select("*")
        .single();
      if (ticketError || !data) {
        setSending(false);
        setError(ticketError?.message ?? "We couldn't send that.");
        return;
      }
      ticketId = data.id;
      setTicket(data as Ticket);
    }

    const { data: inserted, error: messageError } = await supabase
      .from("ticket_messages")
      .insert({
        ticket_id: ticketId,
        author_id: user.id,
        body: text,
      })
      .select("*")
      .single();
    setSending(false);

    if (messageError) {
      setError(messageError.message);
      return;
    }

    if (inserted) {
      const row = inserted as TicketMessage;
      setMessages((current) =>
        current.some((message) => message.id === row.id)
          ? current
          : [...current, row]
      );
    }
    setDraft("");
  }

  function onDraftKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div className="pointer-events-none fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] flex flex-col items-end sm:right-6 sm:bottom-6">
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className="pointer-events-auto mb-3 flex h-[min(28rem,70vh)] w-[min(22.5rem,calc(100vw-2rem))] flex-col rounded-xl border border-black/10 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
        >
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
            <h2 id={titleId} className="text-[0.95rem] font-semibold">
              Support
            </h2>
            <p className="text-sm text-muted">BoardView</p>
          </div>

          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {!isSupabaseConfigured ? (
              <p className="text-sm leading-relaxed text-muted">
                Chat isn&apos;t available yet. Email{" "}
                <a
                  href="mailto:hello@boardview.org"
                  className="font-medium text-accent hover:underline"
                >
                  hello@boardview.org
                </a>
                .
              </p>
            ) : loading || (user && !ready) ? (
              <p className="text-sm text-muted">One moment…</p>
            ) : !user ? (
              <div className="space-y-3 text-sm leading-relaxed">
                <p className="text-muted">
                  Create an account first. Then you can chat with us here —
                  we&apos;ll reply on this same conversation.
                </p>
                <p>
                  <Link
                    href="/signup"
                    className="font-medium text-accent hover:underline"
                  >
                    Create an account
                  </Link>
                  <span className="text-muted"> · </span>
                  <Link
                    href={`/login?next=${encodeURIComponent(loginNext)}`}
                    className="font-medium text-accent hover:underline"
                  >
                    Log in
                  </Link>
                </p>
              </div>
            ) : messages.length === 0 ? (
              <p className="text-sm leading-relaxed text-muted">
                Send a message and we&apos;ll reply here. For something urgent,
                email{" "}
                <a
                  href="mailto:hello@boardview.org"
                  className="font-medium text-accent hover:underline"
                >
                  hello@boardview.org
                </a>
                .
              </p>
            ) : (
              <ol className="space-y-3">
                {messages.map((message) => {
                  const mine = message.author_id === user.id;
                  return (
                    <li key={message.id}>
                      <p className="text-xs text-muted">
                        {mine ? "You" : "BoardView"}
                      </p>
                      <p
                        className={`mt-1 whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed ${
                          mine
                            ? "bg-foreground text-white"
                            : "border border-black/10 bg-accent-soft"
                        }`}
                      >
                        {message.body}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
            {error && (
              <p role="alert" className="mt-3 text-sm font-medium text-red-800">
                {error}
              </p>
            )}
          </div>

          {isSupabaseConfigured && user && (
            <form
              onSubmit={send}
              className="border-t border-black/10 p-3"
            >
              <label className="sr-only" htmlFor={`${panelId}-draft`}>
                Message
              </label>
              <div className="flex items-end gap-2">
                <textarea
                  id={`${panelId}-draft`}
                  ref={inputRef}
                  rows={1}
                  required
                  maxLength={4000}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={onDraftKeyDown}
                  placeholder="Write a message"
                  className="min-h-11 flex-1 resize-none rounded-lg border border-black/10 bg-white px-3 py-2.5 text-base placeholder:text-muted/70"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-foreground px-3.5 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
                >
                  {sending ? "…" : "Send"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        aria-label={open ? "Close support chat" : "Open support chat"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] hover:bg-black"
      >
        {open ? <CloseIcon /> : <ChatIcon />}
        {unread && !open && (
          <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-accent">
            <span className="sr-only">New reply</span>
          </span>
        )}
      </button>
    </div>
  );
}

function ChatIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7A2.5 2.5 0 0 1 16.5 16H10l-4.2 3.15A.75.75 0 0 1 4.5 18.5V6.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
