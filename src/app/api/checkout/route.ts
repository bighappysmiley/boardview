import { NextResponse } from "next/server";
import Stripe from "stripe";
import { hardwareKits } from "@/lib/hardwareKits";

export async function POST(request: Request) {
  const { kitId } = (await request.json()) as { kitId?: string };
  const kit = hardwareKits.find((k) => k.id === kitId);

  if (!kit) {
    return NextResponse.json({ error: "Unknown kit." }, { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env[kit.envKey];

  if (!secretKey || !priceId) {
    return NextResponse.json(
      {
        error:
          "Purchasing isn't set up yet. Email hello@boardview.org to order.",
      },
      { status: 501 }
    );
  }

  const stripe = new Stripe(secretKey);
  const { origin } = new URL(request.url);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/pricing?success=true`,
    cancel_url: `${origin}/pricing?canceled=true`,
  });

  return NextResponse.json({ url: session.url });
}
