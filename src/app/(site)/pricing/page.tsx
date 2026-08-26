"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Section, SectionHeader } from "@/components/layout";
import { FormError } from "@/components/form";
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
    <Section className="!pt-12 sm:!pt-16">
      <SectionHeader
        title="Hardware"
        lead="The BoardView software is free. Kits are bought once, per room."
      />

      {message && (
        <div className="mb-10 max-w-xl">
          <FormError message={message} />
        </div>
      )}

      <div className="grid gap-10 sm:grid-cols-2 sm:gap-16">
        {hardwareKits.map((kit) => (
          <div key={kit.id} className="flex flex-col border-t border-black/10 pt-8">
            <h2 className="text-xl font-semibold tracking-tight">{kit.title}</h2>
            <p className="mt-2 leading-relaxed text-muted">{kit.blurb}</p>
            <ul className="mt-6 flex-1 space-y-2 text-muted">
              {kit.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            <Button
              className="mt-8 w-full sm:w-auto"
              disabled={loadingKit === kit.id}
              onClick={() => handleBuy(kit.id)}
            >
              {loadingKit === kit.id ? "Redirecting…" : "Buy now"}
            </Button>
          </div>
        ))}
      </div>

      <p className="mt-16 max-w-xl text-muted">
        Outfitting a district, or need a custom mount?{" "}
        <a
          href="mailto:hello@boardview.org?subject=BoardView%20district%20order"
          className="font-medium text-accent hover:underline"
        >
          hello@boardview.org
        </a>
      </p>
    </Section>
  );
}
