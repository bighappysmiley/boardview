"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Container, Section } from "@/components/layout";
import { FormError, FormNotice, TextField } from "@/components/form";
import { SetupNotice } from "@/components/SetupNotice";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import type {
  Ban,
  HardwareRequest,
  RequestStatus,
  StaffMember,
  StaffRole,
  Ticket,
} from "@/lib/types";
import { formatWhen, requestStatusLabel } from "@/lib/types";

const statuses: RequestStatus[] = [
  "submitted",
  "in_review",
  "approved",
  "declined",
  "fulfilled",
];

type Tab = "support" | "requests" | "team" | "bans" | "profile";

export default function AdminPage() {
  const router = useRouter();
  const { user, isAdmin, isStaff, displayName, loading } = useSession();
  const [requests, setRequests] = useState<HardwareRequest[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [team, setTeam] = useState<StaffMember[]>([]);
  const [bans, setBans] = useState<Ban[]>([]);
  const [tab, setTab] = useState<Tab>("support");
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<StaffRole>("staff");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!displayName) return;
    Promise.resolve().then(() => setName(displayName));
  }, [displayName]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (loading) return;
    if (!user) {
      router.replace("/login?next=/admin");
      return;
    }
    if (!isStaff) {
      router.replace("/account");
      return;
    }

    const supabase = createClient();
    let active = true;
    Promise.all([
      supabase.from("tickets").select("*").order("created_at", { ascending: false }),
      isAdmin
        ? supabase.from("requests").select("*").order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase.from("staff").select("*").order("created_at"),
      supabase.from("bans").select("*").order("created_at", { ascending: false }),
    ]).then(([ticketRes, requestRes, staffRes, banRes]) => {
      if (!active) return;
      setTickets((ticketRes.data ?? []) as Ticket[]);
      setRequests((requestRes.data ?? []) as HardwareRequest[]);
      setTeam((staffRes.data ?? []) as StaffMember[]);
      setBans((banRes.data ?? []) as Ban[]);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [user, isAdmin, isStaff, loading, router]);

  async function updateRequestStatus(id: string, status: RequestStatus) {
    const previous = requests;
    setRequests((current) =>
      current.map((row) => (row.id === id ? { ...row, status } : row))
    );
    const { error: updateError } = await createClient()
      .from("requests")
      .update({ status })
      .eq("id", id);
    if (updateError) setRequests(previous);
  }

  async function saveName(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNameSaved(false);
    const { error: rpcError } = await createClient().rpc("set_my_display_name", {
      p_name: name,
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setNameSaved(true);
  }

  async function addStaff(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const email = inviteEmail.trim().toLowerCase();
    const { error: insertError } = await createClient().from("staff").insert({
      email,
      role: inviteRole,
      display_name: "Support",
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setInviteEmail("");
    const { data } = await createClient().from("staff").select("*").order("created_at");
    setTeam((data ?? []) as StaffMember[]);
  }

  async function setMemberRole(email: string, role: StaffRole) {
    setError(null);
    const { error: updateError } = await createClient()
      .from("staff")
      .update({ role })
      .eq("email", email);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setTeam((current) =>
      current.map((row) => (row.email === email ? { ...row, role } : row))
    );
  }

  async function removeMember(email: string) {
    setError(null);
    const { error: deleteError } = await createClient()
      .from("staff")
      .delete()
      .eq("email", email);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setTeam((current) => current.filter((row) => row.email !== email));
  }

  async function removeBan(id: string) {
    await createClient().from("bans").delete().eq("id", id);
    setBans((current) => current.filter((row) => row.id !== id));
  }

  if (!isSupabaseConfigured) return <SetupNotice what="Inbox" />;

  if (loading || !isStaff || !ready) {
    return (
      <Section>
        <p className="text-muted">One moment…</p>
      </Section>
    );
  }

  const openTickets = tickets.filter((ticket) => ticket.status === "open").length;
  const tabs: { id: Tab; label: string; admin?: boolean }[] = [
    { id: "support", label: `Support (${openTickets} open)` },
    { id: "requests", label: `Requests (${requests.length})`, admin: true },
    { id: "team", label: "Team", admin: true },
    { id: "bans", label: `Bans (${bans.length})` },
    { id: "profile", label: "Your name" },
  ];

  return (
    <div className="py-16 sm:py-20">
      <Container size="wide">
        <p className="text-sm font-medium text-accent">
          {isAdmin ? "Admin" : "Staff"}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          Inbox
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          Support conversations, and {isAdmin ? "everything else on the site" : "the tools for this queue"}.
        </p>

        {error && (
          <div className="mt-6">
            <FormError message={error} />
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {tabs
            .filter((item) => !item.admin || isAdmin)
            .map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={tab === item.id ? "font-medium text-accent" : "text-muted"}
              >
                {item.label}
              </button>
            ))}
        </div>

        {tab === "support" && (
          <ul className="mt-8 border-t border-black/8">
            {tickets.length === 0 && (
              <li className="py-8 text-muted">No conversations yet.</li>
            )}
            {tickets.map((ticket) => (
              <li
                key={ticket.id}
                className="flex flex-wrap items-baseline justify-between gap-3 border-b border-black/8 py-4"
              >
                <div>
                  <Link
                    href={`/account/help/${ticket.id}`}
                    className="font-medium hover:underline"
                  >
                    {ticket.visitor_name || ticket.subject}
                  </Link>
                  <p className="mt-0.5 text-sm text-muted">
                    {ticket.contact_email}
                    {ticket.last_ip ? ` · ${ticket.last_ip}` : ""} ·{" "}
                    {formatWhen(ticket.created_at)}
                  </p>
                </div>
                <span className="text-sm text-muted">
                  {ticket.status === "open" ? "Open" : "Closed"}
                </span>
              </li>
            ))}
          </ul>
        )}

        {tab === "requests" && isAdmin && (
          <ul className="mt-8 border-t border-black/8">
            {requests.length === 0 && (
              <li className="py-8 text-muted">No requests yet.</li>
            )}
            {requests.map((item) => (
              <li
                key={item.id}
                className="grid gap-4 border-b border-black/8 py-6 sm:grid-cols-[minmax(0,1fr)_12rem]"
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
                    <p className="mt-3 max-w-xl text-sm leading-relaxed">{item.notes}</p>
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
        )}

        {tab === "team" && isAdmin && (
          <div className="mt-8">
            <p className="max-w-xl text-sm leading-relaxed text-muted">
              Admin can change requests, team, and bans. Staff can handle
              support, including chat commands like /ban.
            </p>
            <form onSubmit={addStaff} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
              <TextField
                className="flex-1"
                label="Email"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <label className="text-sm">
                <span className="mb-1.5 block font-medium">Role</span>
                <select
                  className="rounded-lg border border-black/10 bg-white px-3 py-2.5"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as StaffRole)}
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <Button type="submit" className="shrink-0">
                Add
              </Button>
            </form>
            <ul className="mt-8 border-t border-black/8">
              {team.map((member) => (
                <li
                  key={member.email}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-black/8 py-4"
                >
                  <div>
                    <p className="font-medium">{member.display_name}</p>
                    <p className="text-sm text-muted">{member.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                      value={member.role}
                      onChange={(e) =>
                        setMemberRole(member.email, e.target.value as StaffRole)
                      }
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                    {member.email.toLowerCase() !== user?.email?.toLowerCase() && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removeMember(member.email)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "bans" && (
          <ul className="mt-8 border-t border-black/8">
            {bans.length === 0 && (
              <li className="py-8 text-muted">No bans. Use /ban in a conversation.</li>
            )}
            {bans.map((ban) => (
              <li
                key={ban.id}
                className="flex flex-wrap items-baseline justify-between gap-3 border-b border-black/8 py-4"
              >
                <div>
                  <p className="font-medium">{ban.ip || "No IP stored"}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {ban.email} · {formatWhen(ban.created_at)}
                    {ban.created_by_email ? ` · by ${ban.created_by_email}` : ""}
                  </p>
                </div>
                <Button type="button" variant="secondary" onClick={() => removeBan(ban.id)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        {tab === "profile" && (
          <form onSubmit={saveName} className="mt-8 max-w-md space-y-5">
            <p className="text-sm leading-relaxed text-muted">
              This is the name visitors see when you reply. It is not
              “BoardView”.
            </p>
            <TextField
              label="Display name"
              required
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {nameSaved && <FormNotice message="Saved." />}
            <Button type="submit">Save name</Button>
          </form>
        )}

        <Button variant="ghost" className="mt-10" onClick={() => router.push("/account")}>
          Classrooms
        </Button>
      </Container>
    </div>
  );
}
