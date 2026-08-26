"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { QuantityStepper } from "@/components/QuantityStepper";
import { Section, SectionHeader } from "@/components/layout";
import { FormError, FormNotice } from "@/components/form";
import { getProduct, MAX_QTY, shopProducts } from "@/lib/shop";

const CART_KEY = "boardview-shop-cart";

type Cart = Record<string, number>;

function clampQty(value: number): number {
  return Math.min(MAX_QTY, Math.max(0, value));
}

function readCart(): Cart {
  try {
    const raw = sessionStorage.getItem(CART_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Cart;
    const cart: Cart = {};
    for (const product of shopProducts) {
      const qty = parsed[product.id];
      if (typeof qty === "number" && qty > 0) cart[product.id] = clampQty(qty);
    }
    return cart;
  } catch {
    return {};
  }
}

function writeCart(cart: Cart) {
  sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function ShopPage() {
  const searchParams = useSearchParams();
  const [cart, setCart] = useState<Cart>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const thanked = searchParams.get("success") === "true";

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setCart(readCart());
    });
    return () => {
      active = false;
    };
  }, []);

  function updateCart(next: Cart) {
    const cleaned: Cart = {};
    for (const [id, qty] of Object.entries(next)) {
      if (qty > 0) cleaned[id] = clampQty(qty);
    }
    setCart(cleaned);
    writeCart(cleaned);
  }

  function add(id: string) {
    updateCart({ ...cart, [id]: (cart[id] ?? 0) + 1 });
  }

  function setQty(id: string, qty: number) {
    updateCart({ ...cart, [id]: qty });
  }

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, quantity]) => {
          const product = getProduct(id);
          return product ? { product, quantity } : null;
        })
        .filter((line) => line !== null),
    [cart]
  );

  const totalPieces = lines.reduce((sum, line) => sum + line.quantity, 0);

  async function checkout() {
    setMessage(null);
    if (totalPieces === 0) {
      setMessage("Add something to your bag first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((line) => ({
            id: line.product.id,
            quantity: line.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      writeCart({});
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
        title="Shop"
        lead="Add what you need to your bag, then check out. Desk set is a camera, a screen, and a battery pack."
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

      <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <ul className="border-t border-black/10">
          {shopProducts.map((product) => {
            const inBag = cart[product.id] ?? 0;
            return (
              <li
                key={product.id}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 py-7"
              >
                <div className="min-w-0 max-w-xl">
                  <h2 className="text-lg font-semibold tracking-tight">
                    {product.title}
                  </h2>
                  <p className="mt-1 leading-relaxed text-muted">
                    {product.blurb}
                  </p>
                </div>
                {inBag > 0 ? (
                  <QuantityStepper
                    label={product.title}
                    value={inBag}
                    onChange={(value) => setQty(product.id, value)}
                  />
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => add(product.id)}
                  >
                    Add
                  </Button>
                )}
              </li>
            );
          })}
        </ul>

        <aside className="border-t border-black/10 pt-7 lg:sticky lg:top-24 lg:border-t-0 lg:pt-0">
          <h2 className="text-lg font-semibold tracking-tight">Bag</h2>
          {lines.length === 0 ? (
            <p className="mt-3 text-muted">Empty. Add something from the list.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {lines.map(({ product, quantity }) => (
                <li
                  key={product.id}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span>{product.title}</span>
                  <span className="tabular-nums text-muted">{quantity}</span>
                </li>
              ))}
            </ul>
          )}
          <Button
            className="mt-6 w-full"
            disabled={loading || totalPieces === 0}
            onClick={checkout}
          >
            {loading ? "Please wait…" : "Check out"}
          </Button>
          <p className="mt-3 text-sm text-muted">
            You&apos;ll add your address on the next page.
          </p>
        </aside>
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

export default function Shop() {
  return (
    <Suspense
      fallback={
        <Section className="!pt-20 sm:!pt-28">
          <SectionHeader title="Shop" lead="Add what you need to your bag." />
        </Section>
      }
    >
      <ShopPage />
    </Suspense>
  );
}
