# BoardView — project handoff

Read this first. It's the full picture of what BoardView is, what's built, how
it's put together, and what to do next. Written to be handed straight to an AI
coding assistant (Cursor, etc.) or a new developer.

---

## 1. What the product is

BoardView helps students who can't see the classroom board — because of low
vision, or because they're seated too far away.

It has three parts:

1. **Camera(s)** — small cameras mounted on the ceiling or wall, each pointed
   at something the student needs to see: the front whiteboard, a second
   board, a poster. Each runs off a rechargeable battery pack, optionally
   housed in a 3D-printed enclosure. Recharged between subjects.
2. **Screen** — a small screen (roughly iPad-mini sized, deliberately *not*
   tablet-like) sitting on the student's desk. It does exactly one job: show
   the board. It runs no other apps.
3. **This web app** — the marketing site, teacher accounts, and the controls
   the teacher uses to manage the room.

**Design intent, stated by the project owner:** it should look like a
professional Apple or Google product — light, clean, glass-morphic. It must
**not** have the "AI app" look: no dark mode with glowing accents, no heavy
rounded neon cards. Keep it restrained.

**Cost constraint:** the owner must not pay for any service to run this.
Everything is on free tiers (Netlify hosting, Supabase free tier). Stripe is
used for hardware sales — it has no monthly fee, only a per-transaction cut,
so it costs nothing to have wired up. **The software is free for schools; only
the physical hardware is paid for.**

---

## 2. Current state

### Built and working

| Area | Routes | Status |
|---|---|---|
| Marketing site | `/`, `/pricing` | Done |
| Auth | `/signup`, `/login`, `/forgot-password`, `/reset-password`, `/auth/callback` | Done (Supabase, email verification) |
| Teacher controls | `/account`, `/account/classrooms/[id]` | Done (seating, students, PINs, cameras) |
| Desk screen | `/screen/s/[token]` | Done (PIN pad, no teacher login) |
| Teacher preview | `/screen/[classroomId]` | Done (signed-in only) |
| Hardware checkout | `/api/checkout` | Done (needs Stripe keys to go live) |

### Not built yet — these are the next real milestones

1. **The actual camera feed.** This is the big one. Every camera row has a
   `stream_url` field and the screen renders it as an `<img>` when set, but
   *nothing produces that stream*. This needs the camera hardware chosen and
   a streaming approach picked (MJPEG over HTTP is the simplest thing that
   would work with the current `<img>` rendering; WebRTC if low latency
   matters). Until then the screen shows a framing placeholder.
2. **Drag-to-frame.** Right now "framing" means physically aiming the camera
   and pasting its stream URL. Cropping a region in the browser needs a real
   feed to crop first.
3. **Order fulfillment** after a Stripe purchase — shipping address capture,
   inventory, order records. Currently checkout succeeds and nothing records
   the order.
4. **Device software** for the camera side and the screen side.

---

## 3. Tech stack

- **Next.js 16.3.3**, App Router, Turbopack (default in 16 — no `--turbopack`
  flag needed). React 19.2.
- **TypeScript**, strict.
- **Tailwind CSS v4** (CSS-first config — there is no `tailwind.config.js`;
  tokens live in `@theme inline` inside `src/app/globals.css`).
- **Supabase** — auth, Postgres, Realtime.
- **Stripe** — hardware checkout only.
- **Netlify** — hosting, via `@netlify/plugin-nextjs`.

> **Important:** this Next.js version has breaking changes vs. older training
> data. `AGENTS.md` in the repo root says so, and the version-matched docs are
> bundled at `node_modules/next/dist/docs/`. **Read those before writing
> routing/API code** rather than relying on memory. That `AGENTS.md` block is
> auto-generated and re-added by `next dev` — don't delete it.

---

## 4. File map

```
src/
  app/
    layout.tsx                 Root layout — <html>/<body> only, no chrome
    globals.css                Design tokens + glass utilities (read before styling)
    (site)/                    Route group: everything WITH navbar + footer
      layout.tsx               Skip link, Navbar, <main>, Footer
      page.tsx                 Landing page
      login|signup|forgot-password|reset-password/page.tsx
      pricing/page.tsx
      account/page.tsx                     Classroom list + create
      account/classrooms/[id]/page.tsx     Seating, students, PINs, cameras
    screen/s/[token]/page.tsx      Paired desk — PIN then board, no teacher login
    screen/[classroomId]/page.tsx  Signed-in teacher preview
    auth/callback/route.ts        Email-verification code exchange
    api/checkout/route.ts         Stripe Checkout session
  components/
    layout.tsx        Container / Section / SectionHeader / Card  ← spacing system
    SeatingChart.tsx  Room grid (seats, screens, teacher's desk)
    StudentRoster.tsx Students, PINs, rename
    PinPad.tsx        Desk unlock
    ScreenCanvas.tsx  What the screen displays + DeviceFrame bezel
    Navbar.tsx Footer.tsx Logo.tsx Button.tsx form.tsx AuthCard.tsx SetupNotice.tsx
  lib/
    types.ts          Classroom, Desk, Student, Camera
    seating.ts        Grid occupancy and placement
    pins.ts           Four-digit PIN helpers
    supabase/client.ts  Browser client + isSupabaseConfigured
    supabase/server.ts  Route-handler client (cookie read/write)
    demo.ts           Sample data for /screen/demo and landing mocks
    useClock.ts       Hydration-safe clock
    hardwareKits.ts   Stripe kit definitions
supabase/schema.sql   Run this in the Supabase SQL editor
```

**Why the `(site)` route group exists:** `/screen/*` must render fullscreen
with no navbar or footer. Parentheses mean the folder doesn't appear in URLs.
If you add a new marketing/account page, put it in `(site)/`.

---

## 5. Data model

```
classrooms
  id           uuid pk
  owner_id     uuid -> auth.users(id) cascade
  name         text (1..80 chars)
  blacked_out  boolean default false   -- all screens
  pin_mode     assigned_desk | pin_as_id
  created_at   timestamptz

cameras
  id            uuid pk
  classroom_id  uuid -> classrooms(id) cascade
  label         text (1..80 chars)
  stream_url    text nullable
  position      integer
  created_at    timestamptz

desks
  id            uuid pk
  classroom_id  uuid -> classrooms(id) cascade
  row, col      0..11
  kind          screen | empty | fixture
  col_span, row_span   fixture size (seats/screens are 1×1)
  label         optional
  screen_token  uuid unique, only for kind=screen
  created_at    timestamptz

students
  id            uuid pk
  classroom_id  uuid -> classrooms(id) cascade
  display_name  text
  pin           4 digits, teacher-visible
  pin_hash      bcrypt, used by unlock RPC
  desk_id       nullable -> desks
  blacked_out   boolean
```

Teacher tables have **row-level security**: a teacher can only read/write rows
they own. Anonymous desk devices never SELECT these tables; they call
`open_desk`, `unlock_screen`, `desk_session`, and `lock_screen`. In PIN-as-ID
mode, Lock also unassigns that student from the desk so the next PIN can sit
there.

`position` is kept dense (0,1,2,…). Adding appends at `cameras.length`;
reordering and deleting rewrite every row's position. See `moveCamera` and
`removeCamera` in `account/classrooms/[id]/page.tsx`.

---

## 6. Design system — follow this, don't improvise

The whole point of the last design pass was to get everything onto **one**
scale. Please don't reintroduce ad-hoc padding.

**Base size lives on `html` (17px), not `body`.** This is deliberate and load-
bearing: Tailwind's spacing *and* type scales are both `rem`-based off `html`.
An earlier version set `body { font-size: 18px }`, which put text and padding
on two different scales — that's what made padding look subtly wrong
everywhere. **Never set a base font-size on `body`.** 17px (rather than 16)
gives slightly larger, more readable text, which matters for this audience.

**Use the primitives in `src/components/layout.tsx`:**

- `<Section>` — one vertical rhythm (`py-14 sm:py-16`) + container. Use for
  every top-level page section.
- `<Container size="wide" | "narrow" | "form">` — `wide` (max-w-5xl) for
  marketing and the classroom page, `narrow` for simple account pages, `form`
  for auth cards.
- `<SectionHeader title lead centered?>` — heading + lead, consistently spaced.
- `<Card solid?>` — every card. Uniform `p-7 sm:p-8`, `rounded-3xl`.

**Don't** write bespoke `px-6 py-20 max-w-6xl` on a new page. Use `<Section>`.

**Colors/effects** are CSS variables in `globals.css`: `--accent` (#1d4ed8),
`--muted`, `--screen` (#0b0d12), plus `.glass-panel` / `.glass-panel-solid`.
Light theme only, on purpose.

**Accessibility is a product requirement here, not a nice-to-have.** The users
are low-vision students and their teachers. Keep: the skip link, visible focus
rings (`:focus-visible` is styled globally), real `<label>`s on every input,
`aria-label` on icon-only buttons, and the `prefers-reduced-motion` block.

**The screen's appearance lives in exactly one place:** `ScreenCanvas.tsx`,
shared by the real `/screen` route, the classroom preview, and the landing-page
mocks. Change it there and all three stay in sync. Its three modes:

- `boot` — BoardView logo only (idle / no cameras)
- `live` — camera view + label + `n/total` + "Next view" button
- `blackout` — **only** "BoardView" top-left and the time top-right

---

## 7. Running it locally

```bash
npm install
cp .env.local.example .env.local   # then fill it in
npm run dev                        # http://localhost:3000
npm run build                      # production build
npx eslint .                       # lint
```

`/screen/demo` works with sample cameras and **no Supabase setup**, which
makes it the fastest way to see the screen UI.

### Environment variables

| Variable | Secret? | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | No | Public by design |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Public by design; RLS is what protects data |
| `STRIPE_SECRET_KEY` | **Yes** | Server-only, used in `/api/checkout` |
| `STRIPE_PRICE_CLASSROOM_KIT` | No | A `price_...` id |
| `STRIPE_PRICE_SCHOOL_BUNDLE` | No | A `price_...` id |

**Never** put Supabase's `service_role` / secret key in this project — it
bypasses RLS and `NEXT_PUBLIC_*` values are shipped to the browser.

---

## 8. Gotchas that will waste your time

1. **`NEXT_PUBLIC_*` values are frozen into the JavaScript at build time.**
   Adding or changing them in Netlify does nothing until you rebuild.
   *Verified:* a build without them contains no Supabase URL anywhere in the
   client bundle; a build with them has the URL and key inlined. On Netlify
   use **Deploys → Trigger deploy → Clear cache and deploy site**, then
   hard-refresh the browser. On Netlify, do **not** tick "contains secret
   values" for `NEXT_PUBLIC_*` vars — secret scanning will fail the build,
   because those values are *supposed* to be in the output.

2. **Route types go stale after moving files.** If `next build` fails with
   `Cannot find module '../../../src/app/<old path>/page.js'` in
   `.next/dev/types/validator.ts`, just `rm -rf .next` and rebuild.

3. **The ESLint config bans `setState` called synchronously in a `useEffect`
   body.** Set initial state in `useState` instead, or update inside a
   promise/event callback. This is why `useClock` uses `useSyncExternalStore`
   rather than a `setInterval` + `setState` effect — and why it renders
   `--:--` on the server, avoiding a hydration mismatch.

4. **`window.location.href = x` is flagged** by the immutability rule. Use
   `window.location.assign(x)`.

5. **Supabase redirect allow-list.** Auth → URL Configuration must include
   `http://localhost:3000/**` and your deployed URL, or verification links
   fail.

6. **Tailwind v4 has no JS config file.** Add tokens in `@theme inline` in
   `globals.css`.

---

## 9. Suggested next steps, in order

1. **Build the first physical kit** (thin, ~7", not a tablet). Camera feed
   software comes after these parts are on a desk.
   - Desk: [Waveshare 7inch HDMI LCD (H)](https://www.waveshare.com/7inch-hdmi-lcd-h.htm)
     **without** the bulky case (~7 mm panel) + Raspberry Pi 4 (2 GB) on the
     back, Chromium kiosk to `/screen/s/{token}`.
   - Camera: Raspberry Pi Zero 2 W + Camera Module 3 Wide + a slim USB-C
     power bank. Local MJPEG HTTP, pasted into the classroom camera link.
     No cloud cameras (Ring / Blink / Wyze / Nixplay).
2. **Record Stripe orders** — a `orders` table + a Stripe webhook route, so a
   purchase produces a shipping record.
3. **Test on that 7" panel** at real size; layout has only been checked at
   360–1440px in a desktop browser. School units can later be a 7" Android
   kiosk / photo-frame board with the same look, no Pi on the back.

---

## 10. What has and hasn't been tested

**Verified working:** production build and lint are clean; homepage, login, and the teacher
classroom path (create, rename, seating, move arrows, copy PINs, pair a desk,
unlock with a PIN, Lock, delete classroom) were driven in a real browser against
the live project. Camera cycling wraps correctly in both directions via button
and arrow keys. RLS policies verified against real PostgreSQL.

**Not verified:** Stripe checkout against real keys; the camera feed (doesn't
exist yet).
