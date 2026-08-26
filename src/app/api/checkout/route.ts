import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getProduct, MAX_QTY, priceEnvKeys } from "@/lib/shop";

type OrderLine = { id?: string; quantity?: unknown };

function parseQuantity(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QTY) {
    return null;
  }
  return quantity;
}

export async function POST(request: Request) {
  const body = (await request.json()) as { items?: OrderLine[] };
  const requested = Array.isArray(body.items) ? body.items : [];

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  for (const line of requested) {
    const product = typeof line.id === "string" ? getProduct(line.id) : undefined;
    const quantity = parseQuantity(line.quantity);
    if (!product || quantity === null) {
      return NextResponse.json(
        { error: "That order doesn't look right." },
        { status: 400 }
      );
    }
    if (quantity === 0) continue;

    const priceId = priceEnvKeys(product)
      .map((key) => process.env[key])
      .find(Boolean);

    if (!priceId) {
      return NextResponse.json(
        {
          error:
            "Ordering isn't set up yet. Email hello@boardview.org and we'll take the order.",
        },
        { status: 501 }
      );
    }

    lineItems.push({ price: priceId, quantity });
  }

  if (lineItems.length === 0) {
    return NextResponse.json(
      { error: "Add something to your bag first." },
      { status: 400 }
    );
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      {
        error:
          "Ordering isn't set up yet. Email hello@boardview.org and we'll take the order.",
      },
      { status: 501 }
    );
  }

  const stripe = new Stripe(secretKey);
  const { origin } = new URL(request.url);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    shipping_address_collection: {
      allowed_countries: ["US", "CA", "GB", "AU", "IE", "NZ"],
    },
    billing_address_collection: "required",
    success_url: `${origin}/shop?success=true`,
    cancel_url: `${origin}/shop?canceled=true`,
  });

  return NextResponse.json({ url: session.url });
}
