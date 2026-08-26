"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/Button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setUser(data.user);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });
    return () => listener.subscription.unsubscribe();
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <div className="glass-panel rounded-2xl p-8">
          <p className="text-muted">
            Accounts aren&apos;t configured yet. Set{" "}
            <code className="font-mono text-sm">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
            and{" "}
            <code className="font-mono text-sm">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
            .
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <p className="text-muted">Loading your account…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="glass-panel rounded-[2rem] p-8 sm:p-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}
        </h1>
        <p className="mt-2 text-muted">{user?.email}</p>

        <div className="mt-8 rounded-2xl bg-accent-soft px-5 py-4 text-sm text-accent">
          The camera framing and blackout controls for your classroom are
          coming soon. You&apos;ll manage everything from right here once your
          hardware is set up.
        </div>

        <Button variant="secondary" className="mt-8" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
