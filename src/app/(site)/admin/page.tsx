"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Container, Section } from "@/components/layout";
import { FormError, FormNotice, TextField } from "@/components/form";
import { SetupNotice } from "@/components/SetupNotice";
import { DeleteClosed } from "@/components/DeleteClosed";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import type {
  AuditEntry,
  Ban,
  HardwareRequest,
  RequestStatus,
  StaffMember,
  StaffRole,
  Ticket,
} from "@/lib/types";
import { formatDateTime, formatWhen, requestStatusLabel } from "@/lib/types";
import {
  defaultPermissions,
  permissionLabels,
  parsePermissions,
  type StaffPermissions,
} from "@/lib/permissions";

const statuses: RequestStatus[] = [
  "submitted",
  "in_review",
  "approved",
  "declined",
  "fulfilled",
];

type Tab = "support" | "requests" | "team" | "bans" | "audit" | "profile";

async function logAction(
  action: string,
  target?: string,
  detail?: Record<string, unknown>
) {
  await createClient().rpc("write_audit", {
    p_action: action,
    p_ticket: null,
    p_target: target ?? null,
    p_detail: detail ?? null,
  });
}

export default function AdminPage() {
  const router = useRouter();
  const {
    user,
    isAdmin,
    isStaff,
    displayName,
    title,
    permissions,
    loading,
  } = useSession();
  const [requests, setRequests] = useState<HardwareRequest[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [team, setTeam] = useState<StaffMember[]>([]);
  const [bans, setBans] = useState<Ban[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [tab, setTab] = useState<Tab>("support");
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [myTitle, setMyTitle] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<StaffRole>("staff");
  const [inviteTitle, setInviteTitle] = useState("Support");
  const [error, setError] = useState<string | null>(null);

  const canRequests = permissions.requests;
  const canBans = permissions.bans;
  const canAudit = permissions.audit;
  const canModerate = permissions.moderate;

  useEffect(() => {
    Promise.resolve().then(() => {
      if (displayName) setName(displayName);
      if (title) setMyTitle(title);
    });
  }, [displayName, title]);

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
      canRequests
        ? supabase.from("requests").select("*").order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase.from("staff").select("*").order("created_at"),
      canBans
        ? supabase.from("bans").select("*").order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      canAudit
        ? supabase
            .from("audit_log")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(200)
        : Promise.resolve({ data: [] }),
    ]).then(([ticketRes, requestRes, staffRes, banRes, auditRes]) => {
      if (!active) return;
      setTickets((ticketRes.data ?? []) as Ticket[]);
      setRequests((requestRes.data ?? []) as HardwareRequest[]);
      setTeam((staffRes.data ?? []) as StaffMember[]);
      setBans((banRes.data ?? []) as Ban[]);
      setAudit((auditRes.data ?? []) as AuditEntry[]);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [user, isStaff, loading, router, canRequests, canBans, canAudit]);

  async function updateRequestStatus(id: string, status: RequestStatus) {
    const previous = requests;
    setRequests((current) =>
      current.map((row) => (row.id === id ? { ...row, status } : row))
    );
    const { error: updateError } = await createClient()
      .from("requests")
      .update({ status })
      .eq("id", id);
    if (updateError) {
      setRequests(previous);
      return;
    }
    await logAction("request.status", id, { status });
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNameSaved(false);
    const { error: rpcError } = await createClient().rpc("set_my_profile", {
      p_name: name,
      p_title: myTitle,
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    await logAction("profile.update", user?.email ?? undefined, {
      name,
      title: myTitle,
    });
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
      title: inviteTitle.trim() || "Support",
      permissions: defaultPermissions,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    await logAction("staff.add", email, { role: inviteRole, title: inviteTitle });
    setInviteEmail("");
    setInviteTitle("Support");
    const { data } = await createClient().from("staff").select("*").order("created_at");
    setTeam((data ?? []) as StaffMember[]);
  }

  async function saveMember(member: StaffMember, patch: Partial<StaffMember>) {
    setError(null);
    const next = { ...member, ...patch };
    const { error: updateError } = await createClient()
      .from("staff")
      .update({
        display_name: next.display_name,
        title: next.title,
        role: next.role,
        permissions:
          next.role === "admin" ? defaultPermissions : next.permissions,
      })
      .eq("email", member.email);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await logAction("staff.update", member.email, {
      display_name: next.display_name,
      title: next.title,
      role: next.role,
      permissions: next.permissions,
    });
    setTeam((current) =>
      current.map((row) => (row.email === member.email ? next : row))
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
    await logAction("staff.remove", email);
    setTeam((current) => current.filter((row) => row.email !== email));
  }

  async function removeBan(id: string) {
    await createClient().from("bans").delete().eq("id", id);
    await logAction("ban.remove", id);
    setBans((current) => current.filter((row) => row.id !== id));
  }

  async function deleteTicket(id: string) {
    setError(null);
    const response = await fetch("/api/support/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: id, body: "/delete" }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "We couldn't delete that.");
      return;
    }
    setTickets((current) => current.filter((row) => row.id !== id));
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
  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "support", label: `Support (${openTickets} open)`, show: true },
    {
      id: "requests",
      label: `Requests (${requests.length})`,
      show: canRequests,
    },
    { id: "team", label: "Team", show: isAdmin },
    { id: "bans", label: `Bans (${bans.length})`, show: canBans },
    { id: "audit", label: "Audit log", show: canAudit },
    { id: "profile", label: "Your name", show: true },
  ];

  return (
    <div className="py-16 sm:py-20">
      <Container size="wide">
        <p className="text-sm text-muted">
          {isAdmin ? "Admin" : "Staff"}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          Inbox
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          Support conversations
          {isAdmin ? ", team, and what each person can see and do" : " and the tools for this queue"}.
        </p>

        {error && (
          <div className="mt-6">
            <FormError message={error} />
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {tabs
            .filter((item) => item.show)
            .map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={tab === item.id ? "font-medium text-foreground" : "text-muted"}
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
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-muted">
                    {ticket.status === "open" ? "Open" : "Closed"}
                  </span>
                  {canModerate && ticket.status === "closed" && (
                    <DeleteClosed onDelete={() => deleteTicket(ticket.id)} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {tab === "requests" && canRequests && (
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
            <p className="max-w-2xl text-sm leading-relaxed text-muted">
              Access is what they can do here: Admin sees everything; Staff
              only what you check. Role is what customers see in support, next
              to their name — for example Hillel · Owner.
            </p>
            <form
              onSubmit={addStaff}
              className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto] sm:items-end"
            >
              <TextField
                label="Email"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <label className="text-sm">
                <span className="mb-1.5 block font-medium">Access</span>
                <select
                  className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as StaffRole)}
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <TextField
                label="Role shown"
                required
                maxLength={40}
                value={inviteTitle}
                onChange={(e) => setInviteTitle(e.target.value)}
              />
              <Button type="submit" className="shrink-0">
                Add
              </Button>
            </form>
            <ul className="mt-8 space-y-6">
              {team.map((member) => (
                <TeamRow
                  key={member.email}
                  member={member}
                  self={member.email.toLowerCase() === user?.email?.toLowerCase()}
                  onSave={saveMember}
                  onRemove={removeMember}
                />
              ))}
            </ul>
          </div>
        )}

        {tab === "bans" && canBans && (
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

        {tab === "audit" && canAudit && (
          <ul className="mt-8 border-t border-black/8">
            {audit.length === 0 && (
              <li className="py-8 text-muted">Nothing recorded yet.</li>
            )}
            {audit.map((entry) => (
              <li key={entry.id} className="border-b border-black/8 py-4">
                <p className="font-medium">
                  {entry.actor_email} · {entry.action}
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {entry.target ? `${entry.target} · ` : ""}
                  {formatDateTime(entry.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}

        {tab === "profile" && (
          <form onSubmit={saveProfile} className="mt-8 max-w-md space-y-5">
            <p className="text-sm leading-relaxed text-muted">
              Customers see your name and role when you reply — for example
              Hillel · Owner. Access (staff or admin) is set on Team.
            </p>
            <TextField
              label="Name"
              required
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              label="Role shown in chat"
              required
              maxLength={40}
              hint="Owner, Support, Sales — whatever people should see."
              value={myTitle}
              onChange={(e) => setMyTitle(e.target.value)}
            />
            {nameSaved && <FormNotice message="Saved." />}
            <Button type="submit">Save</Button>
          </form>
        )}

        <Button variant="ghost" className="mt-10" onClick={() => router.push("/account")}>
          Classrooms
        </Button>
      </Container>
    </div>
  );
}

function TeamRow({
  member,
  self,
  onSave,
  onRemove,
}: {
  member: StaffMember;
  self: boolean;
  onSave: (member: StaffMember, patch: Partial<StaffMember>) => Promise<void>;
  onRemove: (email: string) => Promise<void>;
}) {
  const [name, setName] = useState(member.display_name);
  const [title, setTitle] = useState(member.title || "Support");
  const [role, setRole] = useState<StaffRole>(member.role);
  const [perms, setPerms] = useState<StaffPermissions>(() =>
    parsePermissions(member.permissions ?? defaultPermissions)
  );

  useEffect(() => {
    Promise.resolve().then(() => {
      setName(member.display_name);
      setTitle(member.title || "Support");
      setRole(member.role);
      setPerms(parsePermissions(member.permissions ?? defaultPermissions));
    });
  }, [member]);

  return (
    <li className="rounded-2xl border border-black/8 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">{member.email}</p>
        {self && <p className="text-sm text-muted">You</p>}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <TextField
          label="Name"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Role shown in chat"
          maxLength={40}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label className="text-sm">
          <span className="mb-1.5 block font-medium">Access</span>
          <select
            className="w-full rounded-lg border border-black/10 bg-white px-3.5 py-2.5"
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </label>
      </div>
      {role === "staff" && (
        <fieldset className="mt-4">
          <legend className="text-sm font-medium">What they can see and do</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {permissionLabels.map((item) => (
              <label key={item.key} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={perms[item.key]}
                  onChange={(e) =>
                    setPerms((current) => ({
                      ...current,
                      [item.key]: e.target.checked,
                    }))
                  }
                />
                <span>
                  <span className="font-medium">{item.label}</span>
                  <span className="block text-muted">{item.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {role === "admin" && (
        <p className="mt-4 text-sm text-muted">
          Admin can see and do everything, including Team.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() =>
            onSave(member, {
              display_name: name,
              title,
              role,
              permissions: perms,
            })
          }
        >
          Save
        </Button>
        {!self && (
          <Button type="button" variant="ghost" onClick={() => onRemove(member.email)}>
            Remove
          </Button>
        )}
      </div>
    </li>
  );
}
