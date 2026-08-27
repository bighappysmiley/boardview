"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard, FormField, FormError } from "@/components/AuthCard";
import { Button } from "@/components/Button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  safeNextPath,
  setStaySignedIn,
  withTimeout,
  wantsStaySignedIn,
} from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [staySignedIn, setStay] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.resolve().then(() => setStay(wantsStaySignedIn()));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isSupabaseConfigured) {
      setError(
        "We can't log you in just yet. Email hello@boardview.org and we'll help."
      );
      return;
    }

    setLoading(true);
    try {
      setStaySignedIn(staySignedIn);
      const supabase = createClient();
      const { error: signInError } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        20000
      );

      if (signInError) {
        setError(
          signInError.message === "Invalid login credentials"
            ? "That email or password isn't right."
            : signInError.message
        );
        setLoading(false);
        return;
      }

      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(safeNextPath(next));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't log you in. Try again."
      );
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Log in">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <FormError message={error} />}
        <FormField
          label="Email address"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={staySignedIn}
            onChange={(e) => setStay(e.target.checked)}
          />
          Stay signed in
        </label>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-medium text-accent">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Need an account?{" "}
        <Link href="/signup" className="font-medium text-accent">
          Create one
        </Link>
      </p>
    </AuthCard>
  );
}
