"use client";

import { useEffect, useState } from "react";
import { createClient, isNeonConfigured, asAuthUser, type AuthUser } from "@/lib/neon";
import { endSessionIfBrowserClosed } from "@/lib/auth";
import type { StaffRole } from "@/lib/types";
import {
  defaultPermissions,
  resolvePermissions,
  type StaffPermissions,
} from "@/lib/permissions";

export function useSession() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [role, setRole] = useState<StaffRole | null>(null);
  const [permissions, setPermissions] =
    useState<StaffPermissions>(defaultPermissions);
  const [loading, setLoading] = useState(isNeonConfigured);

  useEffect(() => {
    if (!isNeonConfigured) return;
    const db = createClient();
    let active = true;

    async function applyUser(nextUser: AuthUser | null) {
      if (!active) return;
      setUser(nextUser);
      if (!nextUser?.email) {
        setIsAdmin(false);
        setIsStaff(false);
        setDisplayName(null);
        setTitle(null);
        setRole(null);
        setPermissions(defaultPermissions);
        return;
      }
      const { data: rows } = await db
        .from("staff")
        .select("email, role, display_name, title, permissions");
      if (!active) return;
      const mine = (rows ?? []).find(
        (row: { email: string }) =>
          row.email.toLowerCase() === nextUser.email!.toLowerCase()
      ) as
        | {
            email: string;
            role: StaffRole;
            display_name: string;
            title: string | null;
            permissions: unknown;
          }
        | undefined;
      setIsStaff(Boolean(mine));
      setIsAdmin(mine?.role === "admin");
      setRole(mine?.role ?? null);
      setDisplayName(mine?.display_name ?? null);
      setTitle(mine?.title ?? null);
      setPermissions(resolvePermissions(mine?.role, mine?.permissions));
    }

    Promise.resolve()
      .then(async () => {
        await endSessionIfBrowserClosed(() => db.auth.signOut());
        if (!active) return;
        const { data } = await db.auth.getSession();
        await applyUser(asAuthUser(data?.session?.user ?? null));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data: listener } = db.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      void applyUser(asAuthUser(session?.user ?? null));
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    isAdmin,
    isStaff,
    displayName,
    title,
    role,
    permissions,
    loading,
  };
}
