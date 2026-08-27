-- BoardView database schema.
-- Run this once in the Supabase SQL editor (Database -> SQL Editor -> New query).

-- A classroom groups the screen with every camera pointed at something in
-- that room: the main board, a second board, a poster on the wall, etc.
create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  blacked_out boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists classrooms_owner_id_idx on public.classrooms (owner_id);

-- Each camera belongs to exactly one classroom. `position` is the order the
-- screen's "Next view" button cycles through them in.
create table if not exists public.cameras (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 80),
  stream_url text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists cameras_classroom_id_idx
  on public.cameras (classroom_id, position);

-- Row level security: a teacher only ever sees their own rooms and cameras.
alter table public.classrooms enable row level security;
alter table public.cameras enable row level security;

drop policy if exists "Teachers manage their own classrooms" on public.classrooms;
create policy "Teachers manage their own classrooms"
  on public.classrooms
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Teachers manage cameras in their own classrooms" on public.cameras;
create policy "Teachers manage cameras in their own classrooms"
  on public.cameras
  for all
  using (
    exists (
      select 1 from public.classrooms c
      where c.id = cameras.classroom_id and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.classrooms c
      where c.id = cameras.classroom_id and c.owner_id = auth.uid()
    )
  );

-- Let the student screen react to the teacher's blackout toggle and camera
-- edits instantly, with no refresh on the device.
-- Guarded so the whole file stays safe to run more than once: adding a table
-- that is already in the publication is an error, unlike the statements above.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'classrooms'
    ) then
      alter publication supabase_realtime add table public.classrooms;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'cameras'
    ) then
      alter publication supabase_realtime add table public.cameras;
    end if;
  end if;
end
$$;

-- Admins (you). After you create your account, add your login email:
--   insert into public.admins (email) values ('you@example.com');
create table if not exists public.admins (
  email text primary key
);

alter table public.admins enable row level security;

drop policy if exists "A user can see if they are an admin" on public.admins;
create policy "A user can see if they are an admin"
  on public.admins
  for select
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- Hardware / trial requests from teachers.
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  contact_email text not null,
  kind text not null check (kind in ('trial', 'purchase')),
  status text not null default 'submitted'
    check (status in ('submitted', 'in_review', 'approved', 'declined', 'fulfilled')),
  school text not null check (char_length(trim(school)) between 1 and 120),
  desk_sets integer not null default 1 check (desk_sets between 0 and 50),
  extra_cameras integer not null default 0 check (extra_cameras between 0 and 50),
  extra_screens integer not null default 0 check (extra_screens between 0 and 50),
  notes text,
  created_at timestamptz not null default now(),
  constraint request_has_items check (desk_sets + extra_cameras + extra_screens >= 1)
);

create index if not exists requests_owner_id_idx on public.requests (owner_id);
create index if not exists requests_created_at_idx on public.requests (created_at desc);

alter table public.requests enable row level security;

drop policy if exists "Teachers insert their own requests" on public.requests;
create policy "Teachers insert their own requests"
  on public.requests
  for insert
  with check (
    auth.uid() = owner_id
    and lower(contact_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "Teachers read own requests, admins read all" on public.requests;
create policy "Teachers read own requests, admins read all"
  on public.requests
  for select
  using (auth.uid() = owner_id or public.is_admin());

drop policy if exists "Admins update requests" on public.requests;
create policy "Admins update requests"
  on public.requests
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- Support tickets.
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  contact_email text not null,
  subject text not null check (char_length(trim(subject)) between 1 and 120),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists tickets_owner_id_idx on public.tickets (owner_id);
create index if not exists tickets_created_at_idx on public.tickets (created_at desc);

alter table public.tickets enable row level security;

drop policy if exists "Teachers insert their own tickets" on public.tickets;
create policy "Teachers insert their own tickets"
  on public.tickets
  for insert
  with check (
    auth.uid() = owner_id
    and lower(contact_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "Teachers read own tickets, admins read all" on public.tickets;
create policy "Teachers read own tickets, admins read all"
  on public.tickets
  for select
  using (auth.uid() = owner_id or public.is_admin());

drop policy if exists "Admins update tickets" on public.tickets;
create policy "Admins update tickets"
  on public.tickets
  for update
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists ticket_messages_ticket_id_idx
  on public.ticket_messages (ticket_id, created_at);

alter table public.ticket_messages enable row level security;

drop policy if exists "Read messages on visible tickets" on public.ticket_messages;
create policy "Read messages on visible tickets"
  on public.ticket_messages
  for select
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_messages.ticket_id
        and (t.owner_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "Write messages on visible tickets" on public.ticket_messages;
create policy "Write messages on visible tickets"
  on public.ticket_messages
  for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_messages.ticket_id
        and (t.owner_id = auth.uid() or public.is_admin())
    )
  );

grant select on public.admins to authenticated;
grant select, insert, update on public.requests to authenticated;
grant select, insert, update on public.tickets to authenticated;
grant select, insert on public.ticket_messages to authenticated;
