"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthCard, FormField, FormError, FormNotice } from "@/components/AuthCard";
import { Button } from "@/components/Button";
import { createClient, isNeonConfigured } from "@/lib/neon";
import { withTimeout } from "@/lib/auth";

export default function SignUpPage() {
  const [fullName, setFullName] = useState("");
  const [school, setSchool] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "verify" | "done">("form");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isNeonConfigured) {
      setError(
        "We can't sign you up just yet. Email hello@boardview.org and we'll help."
      );
      return;
    }

    setLoading(true);
    try {
      const db = createClient();
      const { data, error: signUpError } = await withTimeout(
        db.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, school, name: fullName },
          },
        }),
        20000
      );
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      const verified = Boolean(
        data?.user &&
          ((data.user as { email_confirmed_at?: string }).email_confirmed_at ||
            (data.user as { emailVerified?: boolean }).emailVerified)
      );
      if (data?.user && !verified && !data.session) {
        setStep("verify");
        return;
      }
      setStep("done");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't create that account. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const db = createClient();
      const { error: verifyError } = await withTimeout(
        db.auth.verifyOtp({ email, token: code.trim(), type: "email" }),
        20000
      );
      if (verifyError) {
        setError(verifyError.message);
        return;
      }
      setStep("done");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "That code didn't work. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setError(null);
    setLoading(true);
    try {
      const db = createClient();
      const { error: resendError } = await db.auth.resend({
        type: "signup",
        email,
      });
      if (resendError) {
        setError(resendError.message);
        return;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "We couldn't send another code."
      );
    } finally {
      setLoading(false);
    }
  }

  if (step === "verify") {
    return (
      <AuthCard
        title="Check your email"
        subtitle={`Enter the code we sent to ${email}.`}
      >
        <form onSubmit={handleVerify} className="space-y-5">
          {error && <FormError message={error} />}
          <FormField
            label="Verification code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Please wait…" : "Verify email"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          Didn’t get it?{" "}
          <button
            type="button"
            className="font-medium text-accent"
            onClick={() => void resendCode()}
            disabled={loading}
          >
            Send another code
          </button>
        </p>
      </AuthCard>
    );
  }

  if (step === "done") {
    return (
      <AuthCard title="You're signed up">
        <FormNotice message="You can log in and request a classroom when you're ready." />
        <p className="mt-6 text-sm text-muted">
          <Link href="/login" className="font-medium text-accent">
            Log in
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create an account"
      subtitle="After that you can request a classroom trial or hardware, and reach us for support."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <FormError message={error} />}
        <FormField
          label="Full name"
          type="text"
          autoComplete="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <FormField
          label="School or organization"
          type="text"
          autoComplete="organization"
          required
          value={school}
          onChange={(e) => setSchool(e.target.value)}
        />
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
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Please wait…" : "Create an account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
