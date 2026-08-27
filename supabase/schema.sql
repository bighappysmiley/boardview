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

-- Team: admin (everything) and staff (support). Emails can be added before
-- the person has an account. Display name is what visitors see in chat.
create table if not exists public.staff (
  email text primary key,
  display_name text not null default 'Support'
    check (char_length(trim(display_name)) between 1 and 40),
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

insert into public.staff (email, display_name, role)
select email, 'Support', 'admin' from public.admins
on conflict (email) do nothing;

alter table public.staff enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff
    where role = 'admin'
      and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  or exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.staff
    where role in ('admin', 'staff')
      and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;

drop policy if exists "Staff can see the team" on public.staff;
create policy "Staff can see the team"
  on public.staff
  for select
  using (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.is_staff()
  );

drop policy if exists "Admins manage the team" on public.staff;
create policy "Admins manage the team"
  on public.staff
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Guest conversations (Intercom-style name + email) and staff labels.
alter table public.tickets alter column owner_id drop not null;
alter table public.tickets add column if not exists visitor_name text;
alter table public.tickets add column if not exists visitor_token uuid;
alter table public.tickets add column if not exists last_ip text;

alter table public.ticket_messages alter column author_id drop not null;
alter table public.ticket_messages add column if not exists kind text not null default 'user';
alter table public.ticket_messages add column if not exists author_name text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ticket_messages_kind_check'
  ) then
    alter table public.ticket_messages
      add constraint ticket_messages_kind_check
      check (kind in ('user', 'staff', 'system', 'note'));
  end if;
end $$;

drop policy if exists "Teachers read own tickets, admins read all" on public.tickets;
create policy "Teachers read own tickets, admins read all"
  on public.tickets
  for select
  using (auth.uid() = owner_id or public.is_staff());

drop policy if exists "Admins update tickets" on public.tickets;
create policy "Admins update tickets"
  on public.tickets
  for update
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "Read messages on visible tickets" on public.ticket_messages;
create policy "Read messages on visible tickets"
  on public.ticket_messages
  for select
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_messages.ticket_id
        and (
          public.is_staff()
          or (
            t.owner_id = auth.uid()
            and ticket_messages.kind <> 'note'
          )
        )
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
        and (t.owner_id = auth.uid() or public.is_staff())
    )
  );

create table if not exists public.bans (
  id uuid primary key default gen_random_uuid(),
  ip text,
  email text,
  visitor_token uuid,
  ticket_id uuid references public.tickets (id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now()
);

create index if not exists bans_ip_idx on public.bans (ip);
create index if not exists bans_email_idx on public.bans (email);
create index if not exists bans_token_idx on public.bans (visitor_token);

alter table public.bans enable row level security;

drop policy if exists "Staff read bans" on public.bans;
create policy "Staff read bans"
  on public.bans
  for select
  using (public.is_staff());

drop policy if exists "Staff manage bans" on public.bans;
create policy "Staff manage bans"
  on public.bans
  for all
  using (public.is_staff())
  with check (public.is_staff());

grant select, insert, update, delete on public.staff to authenticated;
grant select, insert, delete on public.bans to authenticated;

create or replace function public.my_staff_display_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select display_name from public.staff
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1;
$$;

create or replace function public.set_my_display_name(p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'not allowed';
  end if;
  if char_length(trim(p_name)) < 1 or char_length(trim(p_name)) > 40 then
    raise exception 'Display name must be 1–40 characters';
  end if;
  update public.staff
     set display_name = trim(p_name)
   where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));
end;
$$;

create or replace function public.is_support_banned(check_ip text, check_token uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bans
    where (check_ip is not null and check_ip <> '' and ip = check_ip)
       or (check_token is not null and visitor_token = check_token)
  );
$$;

create or replace function public.start_support(
  p_name text,
  p_email text,
  p_token uuid,
  p_ip text,
  p_owner uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing uuid;
  new_id uuid;
begin
  if public.is_support_banned(p_ip, p_token) then
    raise exception 'banned';
  end if;
  if char_length(trim(p_name)) < 1 or char_length(trim(p_name)) > 80 then
    raise exception 'Enter your name';
  end if;
  if p_email !~* '^[^@]+@[^@]+\.[^@]+$' then
    raise exception 'Enter a valid email';
  end if;

  select id into existing
    from public.tickets
   where visitor_token = p_token
     and status = 'open'
   order by created_at desc
   limit 1;

  if existing is null and p_owner is not null then
    select id into existing
      from public.tickets
     where owner_id = p_owner
       and status = 'open'
     order by created_at desc
     limit 1;
  end if;

  if existing is not null then
    update public.tickets
       set visitor_name = trim(p_name),
           contact_email = lower(trim(p_email)),
           visitor_token = coalesce(visitor_token, p_token),
           last_ip = coalesce(nullif(p_ip, ''), last_ip)
     where id = existing;
    return existing;
  end if;

  insert into public.tickets (
    owner_id, contact_email, subject, visitor_name, visitor_token, last_ip
  ) values (
    p_owner,
    lower(trim(p_email)),
    'Support',
    trim(p_name),
    p_token,
    nullif(p_ip, '')
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.list_support_messages(p_ticket uuid, p_token uuid)
returns setof public.ticket_messages
language sql
stable
security definer
set search_path = public
as $$
  select m.*
    from public.ticket_messages m
    join public.tickets t on t.id = m.ticket_id
   where m.ticket_id = p_ticket
     and t.visitor_token = p_token
     and m.kind <> 'note'
   order by m.created_at;
$$;

create or replace function public.send_visitor_message(
  p_ticket uuid,
  p_token uuid,
  p_body text,
  p_ip text,
  p_name text
)
returns public.ticket_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.tickets;
  msg public.ticket_messages;
begin
  if public.is_support_banned(p_ip, p_token) then
    raise exception 'banned';
  end if;
  select * into t from public.tickets where id = p_ticket and visitor_token = p_token;
  if t.id is null then
    raise exception 'Conversation not found';
  end if;
  if t.status <> 'open' then
    raise exception 'This conversation is closed';
  end if;
  if char_length(trim(p_body)) < 1 or char_length(trim(p_body)) > 4000 then
    raise exception 'Enter a message';
  end if;

  update public.tickets
     set last_ip = coalesce(nullif(p_ip, ''), last_ip)
   where id = p_ticket;

  insert into public.ticket_messages (
    ticket_id, author_id, body, kind, author_name
  ) values (
    p_ticket, auth.uid(), trim(p_body), 'user', trim(p_name)
  )
  returning * into msg;

  return msg;
end;
$$;

create or replace function public.ban_visitor(p_ticket uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.tickets;
begin
  if not public.is_staff() then
    raise exception 'not allowed';
  end if;
  select * into t from public.tickets where id = p_ticket;
  if t.id is null then
    raise exception 'Conversation not found';
  end if;
  insert into public.bans (ip, email, visitor_token, ticket_id, created_by_email)
  values (
    nullif(t.last_ip, ''),
    t.contact_email,
    t.visitor_token,
    t.id,
    auth.jwt() ->> 'email'
  );
  insert into public.ticket_messages (ticket_id, author_id, body, kind, author_name)
  values (t.id, null, 'You have been banned.', 'system', null);
  update public.tickets set status = 'closed' where id = t.id;
end;
$$;

create or replace function public.unban_visitor(p_ticket uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.tickets;
begin
  if not public.is_staff() then
    raise exception 'not allowed';
  end if;
  select * into t from public.tickets where id = p_ticket;
  delete from public.bans
   where ticket_id = p_ticket
      or (t.last_ip is not null and ip = t.last_ip)
      or (t.visitor_token is not null and visitor_token = t.visitor_token)
      or (t.contact_email is not null and lower(email) = lower(t.contact_email));
  insert into public.ticket_messages (ticket_id, author_id, body, kind, author_name)
  values (t.id, null, 'Access has been restored.', 'system', null);
  update public.tickets set status = 'open' where id = t.id;
end;
$$;

create or replace function public.post_system_message(p_ticket uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'not allowed';
  end if;
  insert into public.ticket_messages (ticket_id, author_id, body, kind, author_name)
  values (p_ticket, null, trim(p_body), 'system', null);
end;
$$;

grant execute on function public.my_staff_display_name() to authenticated;
grant execute on function public.set_my_display_name(text) to authenticated;
grant execute on function public.is_support_banned(text, uuid) to anon, authenticated;
grant execute on function public.start_support(text, text, uuid, text, uuid) to anon, authenticated;
grant execute on function public.list_support_messages(uuid, uuid) to anon, authenticated;
grant execute on function public.send_visitor_message(uuid, uuid, text, text, text) to anon, authenticated;
grant execute on function public.ban_visitor(uuid) to authenticated;
grant execute on function public.unban_visitor(uuid) to authenticated;
grant execute on function public.post_system_message(uuid, text) to authenticated;

-- Live replies in the support chat. Guarded like classrooms/cameras above.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'ticket_messages'
    ) then
      alter publication supabase_realtime add table public.ticket_messages;
    end if;
  end if;
end
$$;

