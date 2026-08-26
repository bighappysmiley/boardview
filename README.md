# BoardView

BoardView helps low-vision students keep up in class. A small camera mounts
above a whiteboard, poster, or anything else important at the front of the
room; a teacher frames the shot from this website; and a small screen on the
student's desk shows a clear, live view of it — nothing else.

This repository is the web app: the marketing site, teacher sign-up/login,
and the (free) hardware purchase page. It's a Next.js app meant to be hosted
free on Netlify.

> **Picking this up as a developer (or handing it to an AI assistant)?** Start
> with **[HANDOFF.md](HANDOFF.md)** — architecture, data model, design system
> rules, known traps, the roadmap, and what has and hasn't been tested.

## What's here so far

- **Landing page** (`/`) — explains the product, with a working interactive
  mockup of the student screen.
- **Sign up / log in** (`/signup`, `/login`, `/forgot-password`,
  `/reset-password`) — email + password accounts with email verification,
  backed by [Supabase](https://supabase.com).
- **Teacher controls** (`/account`, `/account/classrooms/[id]`) — create a
  classroom, add as many cameras to it as the room needs, rename and reorder
  them, and black out the screen. A live preview shows exactly what the
  student is seeing.
- **Student screen** (`/screen/[classroomId]`) — the dedicated view for the
  desk device. Shows the BoardView logo when idle, the framed camera view
  when live, and only the time plus the BoardView name when blacked out.
- **Pricing / purchase** (`/pricing`) — the software is free; hardware kits
  are bought once via [Stripe](https://stripe.com) Checkout.

## Multiple cameras per classroom

A classroom holds any number of cameras — the front board, a second board, a
poster on the wall. The screen shows one at a time, and a **Next view**
button on the screen cycles to the next one in the order the teacher set.
The <kbd>→</kbd> / <kbd>←</kbd> keys do the same, so a physical button wired
to the camera box can send a key press instead of needing a touchscreen.

Blackout and camera edits reach the screen over Supabase Realtime, so the
device updates without anyone touching it.

You can try the screen (with sample cameras, no account needed) at
[`/screen/demo`](http://localhost:3000/screen/demo).

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
3. Open **Database → SQL Editor**, paste in
   [`supabase/schema.sql`](supabase/schema.sql), and run it. That creates the
   `classrooms` and `cameras` tables, locks them down with row-level security
   so a teacher only ever sees their own rooms, and switches on Realtime for
   the blackout toggle.
4. In **Authentication → URL Configuration**, add your site's URL (and
   `http://localhost:3000` for local dev) to the redirect allow-list so the
   `/auth/callback` route is permitted.
5. Email verification is on by default for new Supabase projects — no extra
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
3. Create a Product + Price for each item listed in
   `src/lib/hardwareKits.ts` (desk set, extra camera, extra screen), and put
   each Price ID (starts with `price_`) into the matching env var
   (`STRIPE_PRICE_DESK_SET`, and so on). The desk set still accepts the older
   `STRIPE_PRICE_CLASSROOM_KIT` name.
4. Until those are set, the order page still renders — it asks people to
   email you instead of erroring out.

### Deploying to Netlify (free)

1. Push this repo to GitHub and create a new Netlify site from it (or connect
   it in the Netlify dashboard) — `netlify.toml` already points Netlify at
   the official Next.js runtime, no extra config needed.
2. Add the same environment variables from `.env.local` under
   **Site configuration → Environment variables**.
3. Deploy. Netlify's free tier is enough for this app.

## Not built yet

- **The camera feed itself.** Each camera has a `stream_url` field, and the
  screen renders it when set, but nothing produces that stream yet — that
  needs the camera hardware and its streaming protocol chosen first. Until
  then the screen shows a framing placeholder.
- **Drag-to-frame.** Framing is currently "point the camera and set its
  stream URL"; cropping a region from the browser comes once there's a real
  feed to crop.
- **Pairing a screen without a teacher login.** The screen device currently
  signs in as the teacher once. A per-classroom screen token would be nicer.
- **Order fulfillment** after a Stripe purchase (shipping details,
  inventory).

## Tech stack

Next.js (App Router) + TypeScript + Tailwind CSS, Supabase for auth, Stripe
for hardware checkout, deployed on Netlify.
