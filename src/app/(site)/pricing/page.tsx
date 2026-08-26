"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Card, Section, SectionHeader } from "@/components/layout";
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
    <Section className="!pt-10 sm:!pt-14">
      <SectionHeader
        centered
        title="Pricing"
        lead="The BoardView software is completely free — sign up and use it with any classroom. Hardware kits are bought once, per room."
      />

      {message && (
        <div className="mx-auto mb-8 max-w-xl">
          <FormError message={message} />
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {hardwareKits.map((kit) => (
          <Card key={kit.id} className="flex flex-col">
            <h2 className="text-lg font-semibold">{kit.title}</h2>
            <p className="mt-2 leading-relaxed text-muted">{kit.blurb}</p>
            <ul className="mt-6 flex-1 space-y-2.5">
              {kit.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2.5 text-muted">
                  <span aria-hidden="true" className="text-accent">
                    &#10003;
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <Button
              className="mt-7 w-full"
              disabled={loadingKit === kit.id}
              onClick={() => handleBuy(kit.id)}
            >
              {loadingKit === kit.id ? "Redirecting…" : "Buy now"}
            </Button>
          </Card>
        ))}
      </div>

      <Card className="mt-5">
        <h2 className="text-lg font-semibold">District &amp; custom orders</h2>
        <p className="mt-2 max-w-2xl leading-relaxed text-muted">
          Outfitting an entire district, or need a custom mount? Reach out and
          we&apos;ll work out the details with you directly.
        </p>
        <a
          href="mailto:hello@boardview.org?subject=BoardView%20district%20order"
          className="mt-5 inline-block font-medium text-accent hover:underline"
        >
          hello@boardview.org
        </a>
      </Card>
    </Section>
  );
}
