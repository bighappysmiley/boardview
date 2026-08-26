"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { Section, SectionHeader } from "@/components/layout";
import { FormError, FormNotice } from "@/components/form";
import { hardwareItems, MAX_QTY } from "@/lib/hardwareKits";

function defaultQuantities(): Record<string, number> {
  return Object.fromEntries(
    hardwareItems.map((item) => [item.id, item.defaultQty])
  );
}

function PricingForm() {
  const searchParams = useSearchParams();
  const [quantities, setQuantities] = useState(defaultQuantities);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const thanked = searchParams.get("success") === "true";

  const totalPieces = useMemo(
    () => Object.values(quantities).reduce((sum, qty) => sum + qty, 0),
    [quantities]
  );

  function setQty(id: string, next: number) {
    const clamped = Math.min(MAX_QTY, Math.max(0, next));
    setQuantities((current) => ({ ...current, [id]: clamped }));
  }

  async function handleOrder() {
    setMessage(null);
    if (totalPieces === 0) {
      setMessage("Choose at least one item.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: hardwareItems.map((item) => ({
            id: item.id,
            quantity: quantities[item.id] ?? 0,
          })),
        }),
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
      setLoading(false);
    }
  }

  return (
    <Section className="!pt-20 sm:!pt-28">
      <SectionHeader
        title="Kits"
        lead="Choose how many you need. One desk set is a camera, a screen, and a battery pack. Add extra cameras or screens if the room needs them."
      />

      {thanked && (
        <div className="mb-10 max-w-xl">
          <FormNotice message="Thank you. We'll be in touch about shipping." />
        </div>
      )}

      {message && (
        <div className="mb-10 max-w-xl">
          <FormError message={message} />
        </div>
      )}

      <ul className="border-t border-black/10">
        {hardwareItems.map((item) => (
          <li
            key={item.id}
            className="grid items-center gap-4 border-b border-black/10 py-7 sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {item.title}
              </h2>
              <p className="mt-1 max-w-xl leading-relaxed text-muted">
                {item.blurb}
              </p>
            </div>
            <QuantityStepper
              label={item.title}
              value={quantities[item.id] ?? 0}
              onChange={(value) => setQty(item.id, value)}
            />
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Button disabled={loading || totalPieces === 0} onClick={handleOrder}>
          {loading ? "Please wait…" : "Order"}
        </Button>
        <p className="text-sm text-muted">
          {totalPieces === 0
            ? "Choose how many you'd like."
            : `${totalPieces} ${totalPieces === 1 ? "item" : "items"}`}
        </p>
      </div>

      <p className="mt-16 max-w-xl text-muted">
        Outfitting a whole district, or need a special mount? Write to{" "}
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

function QuantityStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={`Fewer ${label}`}
        disabled={value <= 0}
        onClick={() => onChange(value - 1)}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 text-lg leading-none text-muted transition-colors hover:bg-black/[.03] hover:text-foreground disabled:opacity-35"
      >
        −
      </button>
      <input
        aria-label={`${label} quantity`}
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_QTY}
        value={value}
        onChange={(event) => {
          const next = Number.parseInt(event.target.value, 10);
          onChange(Number.isFinite(next) ? next : 0);
        }}
        className="h-10 w-14 rounded-lg border border-black/10 bg-white text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label={`More ${label}`}
        disabled={value >= MAX_QTY}
        onClick={() => onChange(value + 1)}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 text-lg leading-none text-muted transition-colors hover:bg-black/[.03] hover:text-foreground disabled:opacity-35"
      >
        +
      </button>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <Section className="!pt-20 sm:!pt-28">
          <SectionHeader title="Kits" lead="Choose how many you need." />
        </Section>
      }
    >
      <PricingForm />
    </Suspense>
  );
}
