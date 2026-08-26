"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Container, Section } from "@/components/layout";
import { SetupNotice } from "@/components/SetupNotice";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import type { HardwareRequest, RequestStatus, Ticket } from "@/lib/types";
import { formatWhen, requestStatusLabel } from "@/lib/types";

const statuses: RequestStatus[] = [
  "submitted",
  "in_review",
  "approved",
  "declined",
  "fulfilled",
];

export default function AdminPage() {
  const router = useRouter();
  const { user, isAdmin, loading } = useSession();
  const [requests, setRequests] = useState<HardwareRequest[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [tab, setTab] = useState<"requests" | "tickets">("requests");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?next=/admin");
      return;
    }
    if (!isAdmin) {
      router.replace("/account");
      return;
    }

    const supabase = createClient();
    let active = true;
    Promise.all([
      supabase.from("requests").select("*").order("created_at", { ascending: false }),
      supabase.from("tickets").select("*").order("created_at", { ascending: false }),
    ]).then(([requestRes, ticketRes]) => {
      if (!active) return;
      setRequests((requestRes.data ?? []) as HardwareRequest[]);
      setTickets((ticketRes.data ?? []) as Ticket[]);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [user, isAdmin, loading, router]);

  async function updateRequestStatus(id: string, status: RequestStatus) {
    const previous = requests;
    setRequests((current) =>
      current.map((row) => (row.id === id ? { ...row, status } : row))
    );
    const { error } = await createClient()
      .from("requests")
      .update({ status })
      .eq("id", id);
    if (error) setRequests(previous);
  }

  if (!isSupabaseConfigured) return <SetupNotice what="Admin" />;

  if (loading || !isAdmin || !ready) {
    return (
      <Section>
        <p className="text-muted">One moment…</p>
      </Section>
    );
  }

  const openTickets = tickets.filter((ticket) => ticket.status === "open").length;

  return (
    <div className="py-16 sm:py-20">
      <Container size="wide">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Admin
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          Review trial and hardware requests, and reply to support tickets.
        </p>

        <div className="mt-8 flex gap-4 text-sm">
          <button
            type="button"
            onClick={() => setTab("requests")}
            className={tab === "requests" ? "font-medium" : "text-muted"}
          >
            Requests ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("tickets")}
            className={tab === "tickets" ? "font-medium" : "text-muted"}
          >
            Support ({openTickets} open)
          </button>
        </div>

        {tab === "requests" ? (
          <ul className="mt-8 border-t border-black/10">
            {requests.length === 0 && (
              <li className="py-8 text-muted">No requests yet.</li>
            )}
            {requests.map((item) => (
              <li
                key={item.id}
                className="grid gap-4 border-b border-black/10 py-6 sm:grid-cols-[minmax(0,1fr)_12rem]"
              >
                <div>
                  <p className="font-medium">
                    {item.kind === "trial" ? "Trial" : "Hardware"} · {item.school}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {item.contact_email} · {formatWhen(item.created_at)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {item.desk_sets} desk {item.desk_sets === 1 ? "set" : "sets"}
                    {item.extra_cameras ? ` · ${item.extra_cameras} extra cameras` : ""}
                    {item.extra_screens ? ` · ${item.extra_screens} extra screens` : ""}
                  </p>
                  {item.notes && (
                    <p className="mt-3 max-w-xl text-sm leading-relaxed">
                      {item.notes}
                    </p>
                  )}
                </div>
                <label className="text-sm">
                  <span className="mb-1.5 block text-muted">Status</span>
                  <select
                    className="w-full rounded-lg border border-black/10 bg-white px-3 py-2"
                    value={item.status}
                    onChange={(e) =>
                      updateRequestStatus(item.id, e.target.value as RequestStatus)
                    }
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {requestStatusLabel[status]}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-8 border-t border-black/10">
            {tickets.length === 0 && (
              <li className="py-8 text-muted">No support tickets yet.</li>
            )}
            {tickets.map((ticket) => (
              <li
                key={ticket.id}
                className="flex flex-wrap items-baseline justify-between gap-3 border-b border-black/10 py-4"
              >
                <div>
                  <Link
                    href={`/account/help/${ticket.id}`}
                    className="font-medium hover:underline"
                  >
                    {ticket.subject}
                  </Link>
                  <p className="mt-0.5 text-sm text-muted">
                    {ticket.contact_email} · {formatWhen(ticket.created_at)}
                  </p>
                </div>
                <span className="text-sm text-muted">
                  {ticket.status === "open" ? "Open" : "Closed"}
                </span>
              </li>
            ))}
          </ul>
        )}

        <Button variant="ghost" className="mt-10" onClick={() => router.push("/account")}>
          Classrooms
        </Button>
      </Container>
    </div>
  );
}
