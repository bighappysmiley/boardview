"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { hardwareKits } from "@/lib/hardwareKits";

export default function PricingPage() {
  const [loadingKit, setLoadingKit] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleBuy(kitId: string) {
    setMessage(null);
    setLoadingKit(kitId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kitId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      window.location.assign(data.url);
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoadingKit(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Pricing</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
          The BoardView software is completely free — sign up and use it with
          any classroom. Hardware kits are purchased separately, one-time,
          per classroom.
        </p>
      </div>

      {message && (
        <p
          role="alert"
          className="mx-auto mt-8 max-w-xl rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700"
        >
          {message}
        </p>
      )}

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {hardwareKits.map((kit) => (
          <div key={kit.id} className="glass-panel flex flex-col rounded-2xl p-8">
            <h2 className="text-xl font-semibold">{kit.title}</h2>
            <p className="mt-2 text-muted">{kit.blurb}</p>
            <ul className="mt-6 flex-1 space-y-2 text-sm text-muted">
              {kit.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span aria-hidden="true" className="text-accent">
                    &#10003;
                  </span>
                  {bullet}
                </li>
              ))}
            </ul>
            <Button
              className="mt-8 w-full"
              disabled={loadingKit === kit.id}
              onClick={() => handleBuy(kit.id)}
            >
              {loadingKit === kit.id ? "Redirecting…" : "Buy now"}
            </Button>
          </div>
        ))}

        <div className="glass-panel flex flex-col rounded-2xl p-8 sm:col-span-2">
          <h2 className="text-xl font-semibold">District &amp; custom orders</h2>
          <p className="mt-2 text-muted">
            Outfitting an entire district, or need a custom mount? Reach out
            and we&apos;ll work out the details with you directly.
          </p>
          <a
            href="mailto:hello@boardview.org?subject=BoardView%20district%20order"
            className="mt-6 inline-flex w-fit items-center gap-2 rounded-full px-6 py-3 text-base font-medium text-accent hover:underline"
          >
            Email hello@boardview.org
          </a>
        </div>
      </div>
    </div>
  );
}
