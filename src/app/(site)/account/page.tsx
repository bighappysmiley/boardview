"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/Button";
import { Card, Container } from "@/components/layout";
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

  const displayName = user?.user_metadata?.full_name as string | undefined;

  return (
    <div className="py-16 sm:py-20">
      <Container size="narrow">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold sm:text-4xl">
              {displayName ? `Hi, ${displayName}` : "Your classrooms"}
            </h1>
            <p className="mt-2 text-muted">{user?.email}</p>
          </div>
          <Button variant="secondary" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>

        <div className="mt-10 space-y-4">
          {classrooms.length === 0 && (
            <Card>
              <h2 className="text-lg font-semibold">No classrooms yet</h2>
              <p className="mt-2 text-muted">
                Create one for each room you&apos;re setting up. A classroom
                holds every camera in that room — the front board, a second
                board, a poster — and the screen cycles between them.
              </p>
            </Card>
          )}

          {classrooms.map((classroom) => {
            const cameraCount = classroom.cameras?.[0]?.count ?? 0;
            return (
              <Card key={classroom.id} className="!py-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">
                      {classroom.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      {cameraCount} {cameraCount === 1 ? "camera" : "cameras"}
                      {classroom.blacked_out && " · screen blacked out"}
                    </p>
                  </div>
                  <Link
                    href={`/account/classrooms/${classroom.id}`}
                    className="shrink-0 text-[0.95rem] font-medium text-accent hover:underline"
                  >
                    Manage
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="mt-8">
          <h2 className="text-lg font-semibold">Add a classroom</h2>
          <form
            onSubmit={createClassroom}
            className="mt-4 flex flex-col gap-3 sm:flex-row"
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
          {error && (
            <div className="mt-4">
              <FormError message={error} />
            </div>
          )}
        </Card>
      </Container>
    </div>
  );
}
