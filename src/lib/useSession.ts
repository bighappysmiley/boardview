"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
        return;
      }
      const { data: adminRow } = await supabase
        .from("admins")
        .select("email")
        .limit(1);
      if (active) setIsAdmin(Boolean(adminRow?.length));
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

  return { user, isAdmin, loading };
}
