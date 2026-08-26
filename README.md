# BoardView

BoardView helps low-vision students keep up in class. A small camera mounts
above a whiteboard, poster, or anything else important at the front of the
room; a teacher frames the shot from this website; and a small screen on the
student's desk shows a clear, live view of it — nothing else.

This repository is the web app: the marketing site, teacher sign-up/login,
and the (free) hardware purchase page. It's a Next.js app meant to be hosted
free on Netlify.

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
- **Shop** (`/shop`) — desk sets, extra cameras, extra screens. People add
  what they need to a bag and pay with [Stripe](https://stripe.com) Checkout.
  `/pricing` still sends them there.

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

### Set up Stripe (shop)

Stay in **Test mode** until a real card works. Stripe is free until you take
a payment — it only takes a cut of each sale.

**1. Create an account**

Go to [stripe.com](https://stripe.com) and sign up. Confirm your email.

**2. Copy the secret key**

In Stripe: **Developers → API keys**. Copy the **Secret key**
(`sk_test_...` while testing). Put it in `.env.local` as:

```
STRIPE_SECRET_KEY=sk_test_...
```

Never put this in `NEXT_PUBLIC_*`. Never commit it.

**3. Create a product for each shop item**

In Stripe: **Product catalog → Add product**. For each of these, set a name
and a one-time price (your real selling price), then save:

| Shop item     | Suggested Stripe name |
| ------------- | --------------------- |
| Desk set      | BoardView desk set    |
| Extra camera  | BoardView extra camera |
| Extra screen  | BoardView extra screen |

On the product page, copy the **Price ID** (`price_...`, not the product
id `prod_...`).

**4. Put each Price ID in `.env.local`**

```
STRIPE_PRICE_DESK_SET=price_...
STRIPE_PRICE_EXTRA_CAMERA=price_...
STRIPE_PRICE_EXTRA_SCREEN=price_...
```

Restart `npm run dev` after saving. (If you already created a classroom-kit
price, `STRIPE_PRICE_CLASSROOM_KIT` still works for the desk set.)

**5. Try a test order**

Open `/shop`, add something, check out. Use card `4242 4242 4242 4242`, any
future expiry, any CVC, any ZIP. You should land back on `/shop` with a
thank-you. In Stripe: **Payments** should show the test payment.

**6. Same keys on Netlify**

**Site configuration → Environment variables.** Add the same names and
values. Redeploy after changing them.

**7. Go live**

In Stripe, switch from Test to **Live**. Repeat steps 2–4 with `sk_live_...`
and live `price_...` ids (test and live ids are different). Update Netlify
and redeploy.

**Add another item later**

1. Create the Product + Price in Stripe, copy `price_...`.
2. Add `STRIPE_PRICE_YOUR_THING=price_...` to `.env.local` and Netlify.
3. Add one object to the list in `src/lib/shop.ts` (`id`, `envKey`, `title`,
   `blurb`). The shop page and checkout pick it up on their own.


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
