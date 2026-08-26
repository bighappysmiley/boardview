"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/Button";
import { Container } from "@/components/layout";
import { BareInput, FormError } from "@/components/form";
import { SetupNotice } from "@/components/SetupNotice";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Classroom } from "@/lib/types";

type Row = Classroom & { cameras: { count: number }[] };

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [classrooms, setClassrooms] = useState<Row[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("classrooms")
      .select("*, cameras(count)")
      .order("created_at");
    setClassrooms((data ?? []) as Row[]);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setUser(data.user);
      await load();
      if (active) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) router.replace("/login");
      }
    );
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router, load]);

  async function createClassroom(event: React.FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name || !user) return;

    setError(null);
    setCreating(true);
    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("classrooms")
      .insert({ name, owner_id: user.id });
    setCreating(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNewName("");
    await load();
  }

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.push("/");
  }

  if (!isSupabaseConfigured) return <SetupNotice what="Teacher accounts" />;

  if (loading) {
    return (
      <div className="py-16 sm:py-20">
        <Container size="narrow">
          <p className="text-muted">Loading your classrooms…</p>
        </Container>
      </div>
    );
  }

  return (
    <div className="py-16 sm:py-20">
      <Container size="narrow">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Classrooms
            </h1>
            <p className="mt-1 text-muted">{user?.email}</p>
          </div>
          <Button variant="ghost" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>

        {error && (
          <div className="mt-6">
            <FormError message={error} />
          </div>
        )}

        <form
          onSubmit={createClassroom}
          className="mt-10 flex flex-col gap-3 sm:flex-row"
        >
          <label className="sr-only" htmlFor="classroom-name">
            Classroom name
          </label>
          <BareInput
            id="classroom-name"
            placeholder="Room 214 — Biology"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            maxLength={80}
          />
          <Button type="submit" disabled={creating} className="shrink-0">
            {creating ? "Adding…" : "Add classroom"}
          </Button>
        </form>

        <div className="mt-10 border-t border-black/10">
          {classrooms.length === 0 ? (
            <p className="py-8 text-muted">
              No classrooms yet. Add one for each room you&apos;re setting up.
            </p>
          ) : (
            <ul>
              {classrooms.map((classroom) => {
                const cameraCount = classroom.cameras?.[0]?.count ?? 0;
                return (
                  <li
                    key={classroom.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 py-4"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/account/classrooms/${classroom.id}`}
                        className="font-medium hover:underline"
                      >
                        {classroom.name}
                      </Link>
                      <p className="mt-0.5 text-sm text-muted">
                        {cameraCount} {cameraCount === 1 ? "camera" : "cameras"}
                        {classroom.blacked_out ? " · blacked out" : ""}
                      </p>
                    </div>
                    <Link
                      href={`/account/classrooms/${classroom.id}`}
                      className="shrink-0 text-sm text-accent hover:underline"
                    >
                      Open
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Container>
    </div>
  );
}
