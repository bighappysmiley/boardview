"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { StaffRole } from "@/lib/types";

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [role, setRole] = useState<StaffRole | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    let active = true;

    async function applyUser(nextUser: User | null) {
      if (!active) return;
      setUser(nextUser);
      if (!nextUser?.email) {
        setIsAdmin(false);
        setIsStaff(false);
        setDisplayName(null);
        setRole(null);
        return;
      }
      const { data: rows } = await supabase
        .from("staff")
        .select("email, role, display_name");
      if (!active) return;
      const mine = (rows ?? []).find(
        (row: { email: string }) =>
          row.email.toLowerCase() === nextUser.email!.toLowerCase()
      ) as
        | { email: string; role: StaffRole; display_name: string }
        | undefined;
      setIsStaff(Boolean(mine));
      setIsAdmin(mine?.role === "admin");
      setRole(mine?.role ?? null);
      setDisplayName(mine?.display_name ?? null);
    }

    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      await applyUser(data.user ?? null);
      if (active) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void applyUser(session?.user ?? null);
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { user, isAdmin, isStaff, displayName, role, loading };
}
