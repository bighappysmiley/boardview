# BoardView

BoardView helps low-vision students keep up in class. A small camera mounts
above a whiteboard, poster, or anything else important at the front of the
room; a teacher frames the shot from this website; and a small screen on the
student's desk shows a clear, live view of it — nothing else.

This repository is the web app: the public site, teacher accounts, classroom
controls, hardware/trial requests, support tickets, and an admin inbox. It's
a Next.js app meant to be hosted free on Netlify.

> **Picking this up as a developer (or handing it to an AI assistant)?** Start
> with **[HANDOFF.md](HANDOFF.md)** — architecture, data model, design system
> rules, known traps, the roadmap, and what has and hasn't been tested.

## What's here so far

- **Landing page** (`/`) — explains the product for teachers and schools.
- **Sign up / log in** (`/signup`, `/login`, `/forgot-password`,
  `/reset-password`) — email + password accounts with email verification,
  backed by [Supabase](https://supabase.com). Create an account first; then
  submit a request.
- **Request** (`/request`) — signed-in schools submit a classroom trial or
  hardware request (quantities and notes). There is no cart or checkout.
  `/shop` and `/pricing` redirect here.
- **Support** (`/account/help`) — conversations with a name and email form in
  the floating chat, like a typical support widget. Staff replies show each
  person’s display name, not “BoardView”. Commands such as `/ban` are not
  shown as chat; the visitor is told they have been banned, and that network
  cannot use the site.
- **Admin / Inbox** (`/admin`) — **Admin** can do everything (requests, team
  roles, bans). **Staff** can handle support. Set the name visitors see under
  Your name. Add people by email before they have an account.
- **Teacher controls** (`/account`, `/account/classrooms/[id]`) — seating
  chart, students and PINs, cameras, and class or per-student blackout. Each
  screen desk has its own link to open on the device.
- **Desk screen** (`/screen/s/[token]`) — the student device. A PIN unlocks
  the board. No teacher login on the desk. `/screen/[classroomId]` is a
  signed-in teacher preview.

## Multiple cameras per classroom

A classroom holds any number of cameras — the front board, a second board, a
poster on the wall. The screen shows one at a time, and a **Next view**
button on the screen cycles to the next one in the order the teacher set.
The <kbd>→</kbd> / <kbd>←</kbd> keys do the same, so a physical button wired
to the camera box can send a key press instead of needing a touchscreen.

Blackout and camera edits reach a paired desk over a short session poll, so
the device updates without anyone touching it.

## Local setup

```bash
npm install
cp .env.local.example .env.local
# fill in .env.local, see below
npm run dev
```

Open http://localhost:3000.

### Supabase (accounts, requests, tickets)

1. Create a free project at [supabase.com](https://supabase.com).
2. In **Project Settings → API**, copy the **Project URL** and **anon public**
   key into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Open **Database → SQL Editor**, paste in
   [`supabase/schema.sql`](supabase/schema.sql), and run it. That creates
   classrooms, cameras, staff, requests, tickets, messages, and bans.
   **Re-run this file after pulling schema changes** — it is written to be
   safe to run again.
4. After you have signed up once, make your login an admin:

   ```sql
   insert into public.staff (email, display_name, role)
   values ('you@example.com', 'Your name', 'admin')
   on conflict (email) do update set role = 'admin';
   ```

5. In **Authentication → URL Configuration**, add your site's URL (and
   `http://localhost:3000` for local dev) to the redirect allow-list so the
   `/auth/callback` route is permitted.
6. Email verification is on by default for new Supabase projects — no extra
   setup needed. You can customize the verification email template under
   **Authentication → Email Templates**.

Supabase's free tier comfortably covers a school or small district's worth of
teacher accounts. No `service_role` key is used.

There is no self-serve checkout. Schools request a trial or hardware; you
review those from **Admin**. Stripe keys in `.env.local.example` are unused
while requests are handled by hand.

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
- **Fulfillment after an approved request** (shipping details, inventory).

## Tech stack

Next.js (App Router) + TypeScript + Tailwind CSS, Supabase for auth and
requests, deployed on Netlify.
