"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/Button";
import { QuantityStepper } from "@/components/QuantityStepper";
import { FormError, FormNotice, TextArea, TextField } from "@/components/form";
import { Container, Section, SectionHeader } from "@/components/layout";
import { SetupNotice } from "@/components/SetupNotice";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import type { HardwareRequest, RequestKind } from "@/lib/types";
import { requestStatusLabel, formatWhen } from "@/lib/types";

export default function RequestPage() {
  const { user, loading } = useSession();
  const [kind, setKind] = useState<RequestKind>("trial");
  const [school, setSchool] = useState("");
  const [deskSets, setDeskSets] = useState(1);
  const [cameras, setCameras] = useState(0);
  const [screens, setScreens] = useState(0);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [existing, setExisting] = useState<HardwareRequest[]>([]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    let active = true;
    Promise.resolve().then(async () => {
      if (!active) return;
      const schoolName = user.user_metadata?.school as string | undefined;
      if (schoolName) setSchool(schoolName);
      const { data } = await supabase
        .from("requests")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (active) setExisting((data ?? []) as HardwareRequest[]);
    });
    return () => {
      active = false;
    };
  }, [user]);

  if (!isSupabaseConfigured) return <SetupNotice what="Requests" />;

  if (loading) {
    return (
      <Section>
        <p className="text-muted">One moment…</p>
      </Section>
    );
  }

  if (!user) {
    return (
      <Section className="!pt-20 sm:!pt-28" size="narrow">
        <SectionHeader
          title="Request BoardView"
          lead="Create an account first. Then you can submit a request for a classroom trial, or for hardware for your school."
        />
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/signup">Create an account</ButtonLink>
          <ButtonLink href="/login?next=/request" variant="secondary">
            Log in
          </ButtonLink>
        </div>
      </Section>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user?.email) return;
    const total = deskSets + cameras + screens;
    if (total < 1) {
      setError("Choose at least one desk set, camera, or screen.");
      return;
    }

    setError(null);
    setSending(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("requests").insert({
      owner_id: user.id,
      contact_email: user.email,
      kind,
      school: school.trim(),
      desk_sets: deskSets,
      extra_cameras: cameras,
      extra_screens: screens,
      notes: notes.trim() || null,
    });
    setSending(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSent(true);
    const { data } = await supabase
      .from("requests")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    setExisting((data ?? []) as HardwareRequest[]);
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
          Request BoardView
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Submit a request for a classroom trial or for hardware. We review
          every request and follow up at {user.email} before anything is sent
          or billed.
        </p>

        {sent && (
          <div className="mt-8">
            <FormNotice message="Your request has been submitted. We'll email you when we have reviewed it." />
          </div>
        )}

        {error && (
          <div className="mt-8">
            <FormError message={error} />
          </div>
        )}

        <form onSubmit={submit} className="mt-10 space-y-8">
          <fieldset>
            <legend className="text-sm font-medium">Type of request</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <KindOption
                selected={kind === "trial"}
                title="Classroom trial"
                body="Use BoardView in one room. We will follow up with next steps."
                onSelect={() => {
                  setKind("trial");
                  setDeskSets(1);
                }}
              />
              <KindOption
                selected={kind === "purchase"}
                title="Hardware"
                body="Request desk sets and extra parts for your school. Nothing is billed until we confirm."
                onSelect={() => setKind("purchase")}
              />
            </div>
          </fieldset>

          <TextField
            label="School or organization"
            required
            maxLength={120}
            value={school}
            onChange={(e) => setSchool(e.target.value)}
          />

          <div>
            <p className="text-sm font-medium">Quantities</p>
            <ul className="mt-3 border-t border-black/10">
              <QtyRow
                title="Desk set"
                blurb="Camera, desk screen, and battery pack."
                value={deskSets}
                onChange={setDeskSets}
              />
              <QtyRow
                title="Extra camera"
                blurb="Another board or poster in the same room."
                value={cameras}
                onChange={setCameras}
              />
              <QtyRow
                title="Extra screen"
                blurb="Another student in the same room."
                value={screens}
                onChange={setScreens}
              />
            </ul>
          </div>

          <TextArea
            label="Notes"
            hint="Room names, how many students, or anything we should know."
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <Button type="submit" disabled={sending}>
            {sending ? "Sending…" : "Submit request"}
          </Button>
        </form>

        {existing.length > 0 && (
          <div className="mt-16">
            <h2 className="text-lg font-semibold">Your requests</h2>
            <ul className="mt-4 border-t border-black/10">
              {existing.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-baseline justify-between gap-3 border-b border-black/10 py-4"
                >
                  <div>
                    <p className="font-medium">
                      {item.kind === "trial" ? "Trial" : "Hardware"} ·{" "}
                      {item.school}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      {item.desk_sets} desk{" "}
                      {item.desk_sets === 1 ? "set" : "sets"}
                      {item.extra_cameras
                        ? ` · ${item.extra_cameras} extra cameras`
                        : ""}
                      {item.extra_screens
                        ? ` · ${item.extra_screens} extra screens`
                        : ""}
                    </p>
                  </div>
                  <span className="text-sm text-muted">
                    {requestStatusLabel[item.status]} · {formatWhen(item.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Container>
    </div>
  );
}

function KindOption({
  selected,
  title,
  body,
  onSelect,
}: {
  selected: boolean;
  title: string;
  body: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`rounded-xl border p-5 text-left transition-colors ${
        selected
          ? "border-foreground bg-black/[.03]"
          : "border-black/10 hover:border-black/20"
      }`}
    >
      <span className="font-medium">{title}</span>
      <span className="mt-1 block text-sm leading-relaxed text-muted">
        {body}
      </span>
    </button>
  );
}

function QtyRow({
  title,
  blurb,
  value,
  onChange,
}: {
  title: string;
  blurb: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 py-4">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted">{blurb}</p>
      </div>
      <QuantityStepper label={title} value={value} onChange={onChange} />
    </li>
  );
}
