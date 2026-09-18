"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard, FormField, FormError, FormNotice } from "@/components/AuthCard";
import { Button } from "@/components/Button";
import { createClient, isNeonConfigured } from "@/lib/neon";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isNeonConfigured) {
      setError("We can't reset passwords just yet. Email hello@boardview.org and we'll help.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const db = createClient();
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      const { error: verifyError } = await db.auth.verifyOtp({
        token,
        type: "recovery",
      });
      if (verifyError) {
        setLoading(false);
        setError(verifyError.message);
        return;
      }
    }
    const { error: updateError } = await db.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message ?? "We couldn't update that password.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/account"), 1500);
  }

  if (done) {
    return (
      <AuthCard title="Password updated">
        <FormNotice message="Taking you to your classrooms…" />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Open this page from the link we emailed you."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <FormError message={error} />}
        <FormField
          label="New password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FormField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthCard>
  );
}
