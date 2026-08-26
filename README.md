# BoardView

BoardView helps low-vision students keep up in class. A small camera mounts
above a whiteboard, poster, or anything else important at the front of the
room; a teacher frames the shot from this website; and a small screen on the
student's desk shows a clear, live view of it — nothing else.

This repository is the web app: the marketing site, teacher sign-up/login,
and the (free) hardware purchase page. It's a Next.js app meant to be hosted
free on Netlify.

## What's here so far

- **Landing page** (`/`) — explains the product and how it works.
- **Sign up / log in** (`/signup`, `/login`, `/forgot-password`,
  `/reset-password`) — email + password accounts with email verification,
  backed by [Supabase](https://supabase.com).
- **Account page** (`/account`) — placeholder for the teacher control panel
  (camera framing, screen blackout, etc.), which is a future milestone.
- **Pricing / purchase** (`/pricing`) — the software is free; hardware kits
  are bought once via [Stripe](https://stripe.com) Checkout.

## Local setup

```bash
npm install
cp .env.local.example .env.local
# fill in .env.local, see below
npm run dev
```

Open http://localhost:3000.

### Supabase (accounts + email verification)

1. Create a free project at [supabase.com](https://supabase.com).
2. In **Project Settings → API**, copy the **Project URL** and **anon public**
   key into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. In **Authentication → URL Configuration**, add your site's URL (and
   `http://localhost:3000` for local dev) to the redirect allow-list so the
   `/auth/callback` route is permitted.
4. Email verification is on by default for new Supabase projects — no extra
   setup needed. You can customize the verification email template under
   **Authentication → Email Templates**.

Supabase's free tier comfortably covers a school or small district's worth of
teacher accounts; the account model can grow into organizations/schools in
Postgres later without switching providers.

### Stripe (hardware purchases)

1. Create a free [Stripe](https://stripe.com) account. Stripe has no monthly
   fee — it only takes a percentage of real transactions, so it doesn't cost
   you anything to have it wired up.
2. In **Developers → API keys**, copy the **Secret key** into `.env.local` as
   `STRIPE_SECRET_KEY`.
3. Create a Product + Price for each hardware kit listed in
   `src/lib/hardwareKits.ts`, and put each Price ID (starts with `price_`)
   into the matching env var (`STRIPE_PRICE_CLASSROOM_KIT`, etc.).
4. Until those are set, the pricing page still renders — the buy buttons just
   show a message pointing people to email you instead of erroring out.

### Deploying to Netlify (free)

1. Push this repo to GitHub and create a new Netlify site from it (or connect
   it in the Netlify dashboard) — `netlify.toml` already points Netlify at
   the official Next.js runtime, no extra config needed.
2. Add the same environment variables from `.env.local` under
   **Site configuration → Environment variables**.
3. Deploy. Netlify's free tier is enough for this app.

## Not built yet

- The teacher control dashboard (live camera framing, screen blackout
  toggle) — `/account` is a placeholder until the camera/screen hardware and
  its streaming protocol are designed.
- The camera-side and screen-side device software.
- Order fulfillment after a Stripe purchase (shipping details, inventory).

## Tech stack

Next.js (App Router) + TypeScript + Tailwind CSS, Supabase for auth, Stripe
for hardware checkout, deployed on Netlify.
