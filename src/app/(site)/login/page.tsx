"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard, FormField, FormError } from "@/components/AuthCard";
import { Button } from "@/components/Button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push("/account");
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
          Get started
        </Link>
      </p>
    </AuthCard>
  );
}
