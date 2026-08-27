"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import type { TicketMessage } from "@/lib/types";
import { messageAuthorLabel } from "@/lib/types";
import { TextField } from "@/components/form";

const STORAGE_KEY = "bv_support";

type Saved = {
  token: string;
  name: string;
  email: string;
  ticketId: string;
};

function readSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Saved;
    if (parsed.token && parsed.ticketId && parsed.name && parsed.email) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function writeSaved(value: Saved) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function SupportChat() {
  const { user, isStaff, loading } = useSession();
  const router = useRouter();
  const panelId = useId();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    Promise.resolve().then(() => {
      const saved = readSaved();
      if (saved) {
        setName(saved.name);
        setEmail(saved.email);
        setToken(saved.token);
        setTicketId(saved.ticketId);
      } else if (user?.email) {
        setEmail(user.email);
        const full = user.user_metadata?.full_name as string | undefined;
        if (full) setName(full);
      }
      setReady(true);
    });
  }, [user]);

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
    if (!open || !ticketId) return;
    inputRef.current?.focus();
  }, [open, ticketId]);

  useEffect(() => {
    if (!isSupabaseConfigured || !ticketId || !token) return;
    let active = true;
    const supabase = createClient();

    async function load() {
      const { data } = await supabase.rpc("list_support_messages", {
        p_ticket: ticketId,
        p_token: token,
      });
      if (active) setMessages((data ?? []) as TicketMessage[]);
    }

    Promise.resolve().then(load);
    const interval = window.setInterval(() => void load(), 3000);
    const channel = supabase
      .channel(`support:${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const row = payload.new as TicketMessage;
          if (row.kind === "note") return;
          setMessages((current) =>
            current.some((message) => message.id === row.id)
              ? current
              : [...current, row]
          );
        }
      )
      .subscribe();

    return () => {
      active = false;
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [ticketId, token]);

  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [open, messages.length]);

  const lastVisible = [...messages].reverse().find((m) => m.kind !== "note");
  const unread = Boolean(
    lastVisible && lastVisible.kind !== "user" && !open
  );

  async function startConversation(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSending(true);
    const response = await fetch("/api/support/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, token }),
    });
    const payload = (await response.json()) as {
      token?: string;
      ticketId?: string;
      error?: string;
    };
    setSending(false);
    if (payload.error === "banned" || response.status === 403) {
      router.push("/banned");
      return;
    }
    if (!response.ok || !payload.ticketId || !payload.token) {
      setError(payload.error ?? "We couldn't start that.");
      return;
    }
    setToken(payload.token);
    setTicketId(payload.ticketId);
    writeSaved({
      token: payload.token,
      name: name.trim(),
      email: email.trim(),
      ticketId: payload.ticketId,
    });
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !ticketId || !token) return;
    setError(null);
    setSending(true);
    const response = await fetch("/api/support/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId,
        token,
        name,
        body: text,
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      message?: TicketMessage;
    };
    setSending(false);
    if (payload.error === "banned" || response.status === 403) {
      router.push("/banned");
      return;
    }
    if (!response.ok) {
      setError(payload.error ?? "We couldn't send that.");
      return;
    }
    if (payload.message) {
      setMessages((current) =>
        current.some((message) => message.id === payload.message!.id)
          ? current
          : [...current, payload.message!]
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

  const inChat = Boolean(ticketId && token);

  return (
    <div className="pointer-events-none fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] flex flex-col items-end sm:right-6 sm:bottom-6">
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
      className="pointer-events-auto mb-3 flex h-[min(30rem,72vh)] w-[min(22.5rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.12)]"
        >
          <div className="border-b border-black/8 px-4 py-3">
            <h2 id={titleId} className="text-[0.95rem] font-semibold">
              Support
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              We usually reply here. We’ll also have your email.
            </p>
          </div>

          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {!isSupabaseConfigured ? (
              <p className="text-sm leading-relaxed text-muted">
                Chat isn’t available yet. Email{" "}
                <a
                  href="mailto:hello@boardview.org"
                  className="font-medium text-accent hover:underline"
                >
                  hello@boardview.org
                </a>
                .
              </p>
            ) : loading || !ready ? (
              <p className="text-sm text-muted">One moment…</p>
            ) : isStaff ? (
              <div className="space-y-3 text-sm leading-relaxed">
                <p className="text-muted">
                  Reply from the inbox so your name is the one visitors see.
                </p>
                <Link
                  href="/admin"
                  className="font-medium text-accent hover:underline"
                >
                  Open inbox
                </Link>
              </div>
            ) : !inChat ? (
              <form onSubmit={startConversation} className="space-y-3">
                <p className="text-sm leading-relaxed text-muted">
                  Leave your name and email so we can write back if you close
                  this window.
                </p>
                <TextField
                  label="Name"
                  required
                  maxLength={80}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <TextField
                  label="Email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {error && (
                  <p role="alert" className="text-sm font-medium text-red-800">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {sending ? "Starting…" : "Start conversation"}
                </button>
              </form>
            ) : messages.length === 0 ? (
              <p className="text-sm leading-relaxed text-muted">
                Send a message and we’ll reply here.
              </p>
            ) : (
              <ol className="space-y-3">
                {messages.map((message) => {
                  const mine = message.kind === "user";
                  const system = message.kind === "system";
                  return (
                    <li key={message.id}>
                      <p className="text-xs text-muted">
                        {messageAuthorLabel(message, user?.id, name)}
                      </p>
                      <p
                        className={`mt-1 whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-relaxed ${
                          system
                            ? "bg-black/[0.04] text-foreground"
                            : mine
                              ? "bg-foreground text-white"
                              : "border border-black/8 bg-white"
                        }`}
                      >
                        {message.body}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
            {inChat && error && (
              <p role="alert" className="mt-3 text-sm font-medium text-red-800">
                {error}
              </p>
            )}
          </div>

          {isSupabaseConfigured && inChat && !isStaff && (
            <form onSubmit={send} className="border-t border-black/8 p-3">
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
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-accent px-3.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
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
          <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-white">
            <span className="sr-only">New reply</span>
          </span>
        )}
      </button>
    </div>
  );
}

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
