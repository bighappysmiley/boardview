"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { FormError, FormNotice, TextArea, TextField } from "@/components/form";
import { Container, Section } from "@/components/layout";
import { SetupNotice } from "@/components/SetupNotice";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import type { Ticket } from "@/lib/types";
import { formatWhen } from "@/lib/types";

export default function HelpPage() {
  const { user, loading } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await createClient()
      .from("tickets")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    setTickets((data ?? []) as Ticket[]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.resolve().then(async () => {
      await load();
      if (!active) return;
    });
    return () => {
      active = false;
    };
  }, [user, load]);

  if (!isSupabaseConfigured) return <SetupNotice what="Support" />;

  if (loading) {
    return (
      <Section>
        <p className="text-muted">One moment…</p>
      </Section>
    );
  }

  if (!user) {
    return (
      <Section size="narrow" className="!pt-20 sm:!pt-28">
        <h1 className="text-3xl font-semibold tracking-tight">Support</h1>
        <p className="mt-3 max-w-xl text-muted">
          Create an account first. Then you can open a support request and we
          will reply on your account.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="font-medium text-accent hover:underline"
          >
            Create an account
          </Link>
          <Link
            href="/login?next=/account/help"
            className="font-medium text-accent hover:underline"
          >
            Log in
          </Link>
        </div>
      </Section>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user?.email) return;
    setError(null);
    setSending(true);
    const supabase = createClient();
    const { data, error: ticketError } = await supabase
      .from("tickets")
      .insert({
        owner_id: user.id,
        contact_email: user.email,
        subject: subject.trim(),
      })
      .select("id")
      .single();

    if (ticketError || !data) {
      setSending(false);
      setError(ticketError?.message ?? "We couldn't send that.");
      return;
    }

    const { error: messageError } = await supabase.from("ticket_messages").insert({
      ticket_id: data.id,
      author_id: user.id,
      body: body.trim(),
    });
    setSending(false);

    if (messageError) {
      setError(messageError.message);
      return;
    }

    setSubject("");
    setBody("");
    setSent(true);
    await load();
  }

  return (
    <div className="py-16 sm:py-20">
      <Container size="narrow">
        <p className="text-sm text-muted">
          <Link href="/account" className="hover:text-foreground">
            Classrooms
          </Link>
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Support
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Open a request and we will reply here. For something urgent, email{" "}
          <a
            href="mailto:hello@boardview.org"
            className="font-medium text-accent hover:underline"
          >
            hello@boardview.org
          </a>
          .
        </p>

        {sent && (
          <div className="mt-8">
            <FormNotice message="Submitted. We will reply on this page." />
          </div>
        )}
        {error && (
          <div className="mt-8">
            <FormError message={error} />
          </div>
        )}

        <form onSubmit={submit} className="mt-10 space-y-5">
          <TextField
            label="Subject"
            required
            maxLength={120}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <TextArea
            label="Message"
            required
            maxLength={4000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button type="submit" disabled={sending}>
            {sending ? "Sending…" : "Submit"}
          </Button>
        </form>

        <div className="mt-16">
          <h2 className="text-lg font-semibold">Your tickets</h2>
          {tickets.length === 0 ? (
            <p className="mt-4 text-muted">None yet.</p>
          ) : (
            <ul className="mt-4 border-t border-black/10">
              {tickets.map((ticket) => (
                <li
                  key={ticket.id}
                  className="flex flex-wrap items-baseline justify-between gap-3 border-b border-black/10 py-4"
                >
                  <Link
                    href={`/account/help/${ticket.id}`}
                    className="font-medium hover:underline"
                  >
                    {ticket.subject}
                  </Link>
                  <span className="text-sm text-muted">
                    {ticket.status === "open" ? "Open" : "Closed"} ·{" "}
                    {formatWhen(ticket.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </div>
  );
}
