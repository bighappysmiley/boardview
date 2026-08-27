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

-- Customer-facing title (Hillel · Owner) vs access (admin/staff), plus
-- per-person permissions for what staff can see and do.
alter table public.staff add column if not exists title text;
update public.staff set title = 'Support' where title is null;
alter table public.staff alter column title set default 'Support';
alter table public.staff alter column title set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'staff_title_len'
  ) then
    alter table public.staff
      add constraint staff_title_len
      check (char_length(trim(title)) between 1 and 40);
  end if;
end $$;

alter table public.staff add column if not exists permissions jsonb;
update public.staff
   set permissions = '{"requests":false,"bans":true,"audit":false,"moderate":true}'::jsonb
 where permissions is null;
alter table public.staff
  alter column permissions set default '{"requests":false,"bans":true,"audit":false,"moderate":true}'::jsonb;
alter table public.staff alter column permissions set not null;

alter table public.ticket_messages add column if not exists author_title text;

update public.staff
   set display_name = 'Hillel',
       title = 'Owner'
 where lower(email) = 'hf@bighappysmiley.com';

create or replace function public.has_perm(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1 from public.staff
       where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
         and coalesce((permissions ->> p_key)::boolean, false)
    );
$$;

grant execute on function public.has_perm(text) to anon, authenticated;

create or replace function public.my_staff_profile()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'display_name', display_name,
    'title', coalesce(title, 'Support'),
    'role', role,
    'permissions', coalesce(permissions, '{}'::jsonb)
  )
    from public.staff
   where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
   limit 1;
$$;

create or replace function public.set_my_profile(p_name text, p_title text)
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
    raise exception 'Name must be 1–40 characters';
  end if;
  if char_length(trim(p_title)) < 1 or char_length(trim(p_title)) > 40 then
    raise exception 'Role must be 1–40 characters';
  end if;
  update public.staff
     set display_name = trim(p_name),
         title = trim(p_title)
   where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));
end;
$$;

grant execute on function public.my_staff_profile() to authenticated;
grant execute on function public.set_my_profile(text, text) to authenticated;

drop policy if exists "Teachers read own requests, admins read all" on public.requests;
create policy "Teachers read own requests, admins read all"
  on public.requests
  for select
  using (auth.uid() = owner_id or public.has_perm('requests'));

drop policy if exists "Admins update requests" on public.requests;
create policy "Admins update requests"
  on public.requests
  for update
  using (public.has_perm('requests'))
  with check (public.has_perm('requests'));

drop policy if exists "Admins update tickets" on public.tickets;
create policy "Admins update tickets"
  on public.tickets
  for update
  using (public.has_perm('moderate'))
  with check (public.has_perm('moderate'));

drop policy if exists "Staff read bans" on public.bans;
create policy "Staff read bans"
  on public.bans
  for select
  using (public.has_perm('bans'));

drop policy if exists "Staff manage bans" on public.bans;
create policy "Staff manage bans"
  on public.bans
  for all
  using (public.has_perm('bans'))
  with check (public.has_perm('bans'));

create or replace function public.ban_visitor(p_ticket uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.tickets;
begin
  if not public.has_perm('bans') then
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
  if not public.has_perm('bans') then
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

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,
  action text not null,
  ticket_id uuid references public.tickets (id) on delete set null,
  target text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_at_idx
  on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

drop policy if exists "Staff with audit can read the log" on public.audit_log;
create policy "Staff with audit can read the log"
  on public.audit_log
  for select
  using (public.has_perm('audit'));

grant select on public.audit_log to authenticated;

create or replace function public.write_audit(
  p_action text,
  p_ticket uuid default null,
  p_target text default null,
  p_detail jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'not allowed';
  end if;
  insert into public.audit_log (actor_email, action, ticket_id, target, detail)
  values (
    coalesce(auth.jwt() ->> 'email', ''),
    left(trim(p_action), 80),
    p_ticket,
    nullif(left(coalesce(p_target, ''), 200), ''),
    p_detail
  );
end;
$$;

grant execute on function public.write_audit(text, uuid, text, jsonb) to authenticated;

create or replace function public.delete_closed_ticket(p_ticket uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.tickets;
begin
  if not public.has_perm('moderate') then
    raise exception 'not allowed';
  end if;
  select * into t from public.tickets where id = p_ticket;
  if t.id is null then
    raise exception 'Conversation not found';
  end if;
  if t.status <> 'closed' then
    raise exception 'Close the conversation before deleting it.';
  end if;
  delete from public.tickets where id = p_ticket;
end;
$$;

grant execute on function public.delete_closed_ticket(uuid) to authenticated;

-- Seating chart, students, PINs, and per-desk screen pairing.
-- Anonymous desk devices never SELECT these tables; they only call the
-- security-definer functions below.

alter table public.classrooms
  add column if not exists pin_mode text not null default 'assigned_desk';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'classrooms_pin_mode_check'
  ) then
    alter table public.classrooms
      add constraint classrooms_pin_mode_check
      check (pin_mode in ('assigned_desk', 'pin_as_id'));
  end if;
end
$$;

create table if not exists public.desks (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  row integer not null check (row between 0 and 11),
  col integer not null check (col between 0 and 11),
  kind text not null check (kind in ('screen', 'empty', 'fixture')),
  label text check (
    label is null or char_length(trim(label)) between 1 and 40
  ),
  col_span integer not null default 1 check (col_span between 1 and 12),
  row_span integer not null default 1 check (row_span between 1 and 12),
  screen_token uuid unique,
  created_at timestamptz not null default now(),
  unique (classroom_id, row, col)
);

create index if not exists desks_classroom_id_idx on public.desks (classroom_id);

alter table public.desks drop constraint if exists desks_kind_check;
alter table public.desks add constraint desks_kind_check
  check (kind in ('screen', 'empty', 'fixture'));

alter table public.desks drop constraint if exists desks_row_check;
alter table public.desks add constraint desks_row_check
  check (row between 0 and 11);

alter table public.desks drop constraint if exists desks_col_check;
alter table public.desks add constraint desks_col_check
  check (col between 0 and 11);

alter table public.desks add column if not exists col_span integer not null default 1;
alter table public.desks add column if not exists row_span integer not null default 1;

alter table public.desks drop constraint if exists desks_col_span_check;
alter table public.desks add constraint desks_col_span_check
  check (col_span between 1 and 12);

alter table public.desks drop constraint if exists desks_row_span_check;
alter table public.desks add constraint desks_row_span_check
  check (row_span between 1 and 12);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  display_name text not null
    check (char_length(trim(display_name)) between 1 and 80),
  pin text not null check (pin ~ '^\d{4}$'),
  pin_hash text not null default '',
  desk_id uuid references public.desks (id) on delete set null,
  blacked_out boolean not null default false,
  created_at timestamptz not null default now(),
  unique (classroom_id, pin)
);

create unique index if not exists students_one_per_desk
  on public.students (desk_id)
  where desk_id is not null;

create index if not exists students_classroom_id_idx
  on public.students (classroom_id);

-- Device sessions after a PIN unlock. Not readable from the client.
create table if not exists public.desk_sessions (
  id uuid primary key default gen_random_uuid(),
  desk_id uuid not null references public.desks (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create index if not exists desk_sessions_desk_id_idx
  on public.desk_sessions (desk_id);

create table if not exists public.desk_unlock_attempts (
  desk_id uuid primary key references public.desks (id) on delete cascade,
  failed_count integer not null default 0,
  locked_until timestamptz
);

alter table public.desks enable row level security;
alter table public.students enable row level security;
alter table public.desk_sessions enable row level security;
alter table public.desk_unlock_attempts enable row level security;

drop policy if exists "Teachers manage desks in their own classrooms" on public.desks;
create policy "Teachers manage desks in their own classrooms"
  on public.desks
  for all
  using (
    exists (
      select 1 from public.classrooms c
      where c.id = desks.classroom_id and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.classrooms c
      where c.id = desks.classroom_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "Teachers manage students in their own classrooms" on public.students;
create policy "Teachers manage students in their own classrooms"
  on public.students
  for all
  using (
    exists (
      select 1 from public.classrooms c
      where c.id = students.classroom_id and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.classrooms c
      where c.id = students.classroom_id and c.owner_id = auth.uid()
    )
  );

revoke all on table public.desks from anon;
revoke all on table public.students from anon;
revoke all on table public.desk_sessions from anon, authenticated;
revoke all on table public.desk_unlock_attempts from anon, authenticated;

grant select, insert, update, delete on table public.desks to authenticated;
grant select, insert, update, delete on table public.students to authenticated;

create or replace function public.hash_student_pin()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if tg_op = 'INSERT' or new.pin is distinct from old.pin then
    new.pin_hash := crypt(new.pin, gen_salt('bf'));
  end if;
  return new;
end;
$$;

drop trigger if exists students_hash_pin on public.students;
create trigger students_hash_pin
  before insert or update of pin on public.students
  for each row execute function public.hash_student_pin();

create or replace function public.ensure_desk_token()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.kind = 'screen' then
    new.screen_token := coalesce(new.screen_token, gen_random_uuid());
    new.col_span := 1;
    new.row_span := 1;
  else
    new.screen_token := null;
    if new.kind = 'empty' then
      new.col_span := 1;
      new.row_span := 1;
    else
      new.col_span := least(greatest(coalesce(new.col_span, 1), 1), 12 - new.col);
      new.row_span := least(greatest(coalesce(new.row_span, 1), 1), 12 - new.row);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists desks_ensure_token on public.desks;
create trigger desks_ensure_token
  before insert or update of kind, screen_token, col_span, row_span, row, col on public.desks
  for each row execute function public.ensure_desk_token();

create or replace function public.clear_desk_sessions_on_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind <> 'screen' or new.screen_token is distinct from old.screen_token then
    delete from public.desk_sessions where desk_id = new.id;
    delete from public.desk_unlock_attempts where desk_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists desks_clear_sessions on public.desks;
create trigger desks_clear_sessions
  after update of kind, screen_token on public.desks
  for each row execute function public.clear_desk_sessions_on_change();

create or replace function public.desk_session_payload(
  p_desk uuid,
  p_student uuid,
  p_session uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'session_token', p_session,
    'classroom_id', c.id,
    'classroom_name', c.name,
    'classroom_blacked_out', c.blacked_out,
    'student_blacked_out', s.blacked_out,
    'cameras', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', cam.id,
          'classroom_id', cam.classroom_id,
          'label', cam.label,
          'stream_url', cam.stream_url,
          'position', cam.position,
          'created_at', cam.created_at
        )
        order by cam.position
      )
      from public.cameras cam
      where cam.classroom_id = c.id
    ), '[]'::jsonb)
  )
  from public.desks d
  join public.classrooms c on c.id = d.classroom_id
  join public.students s on s.id = p_student
  where d.id = p_desk;
$$;

create or replace function public.open_desk(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  d public.desks;
  c public.classrooms;
  seated boolean;
begin
  if p_token is null then
    raise exception 'This screen is not connected.';
  end if;

  select * into d
    from public.desks
   where screen_token = p_token
     and kind = 'screen';

  if d.id is null then
    raise exception 'This screen is not connected.';
  end if;

  select * into c from public.classrooms where id = d.classroom_id;
  select exists(
    select 1 from public.students s where s.desk_id = d.id
  ) into seated;

  return jsonb_build_object(
    'desk_id', d.id,
    'classroom_id', c.id,
    'classroom_name', c.name,
    'pin_mode', c.pin_mode,
    'seated', seated
  );
end;
$$;

create or replace function public.note_desk_failure(p_desk uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer := 0;
  until_ts timestamptz;
begin
  select failed_count, locked_until
    into n, until_ts
    from public.desk_unlock_attempts
   where desk_id = p_desk;

  if until_ts is not null and until_ts <= now() then
    n := 0;
  end if;

  n := coalesce(n, 0) + 1;

  insert into public.desk_unlock_attempts (desk_id, failed_count, locked_until)
  values (
    p_desk,
    n,
    case when n >= 5 then now() + interval '2 minutes' else null end
  )
  on conflict (desk_id) do update
    set failed_count = excluded.failed_count,
        locked_until = excluded.locked_until;
end;
$$;

create or replace function public.unlock_screen(p_token uuid, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  d public.desks;
  c public.classrooms;
  s public.students;
  until_ts timestamptz;
  sess uuid;
begin
  if p_token is null then
    raise exception 'That PIN didn''t work.';
  end if;

  select * into d
    from public.desks
   where screen_token = p_token
     and kind = 'screen';

  if d.id is null then
    raise exception 'That PIN didn''t work.';
  end if;

  select locked_until into until_ts
    from public.desk_unlock_attempts
   where desk_id = d.id;

  if until_ts is not null and until_ts > now() then
    raise exception 'Try again in a moment.';
  end if;

  select * into c from public.classrooms where id = d.classroom_id;

  if p_pin is null or p_pin !~ '^\d{4}$' then
    perform public.note_desk_failure(d.id);
    raise exception 'That PIN didn''t work.';
  end if;

  if c.pin_mode = 'assigned_desk' then
    select * into s from public.students where desk_id = d.id;
    if s.id is null or crypt(p_pin, s.pin_hash) <> s.pin_hash then
      perform public.note_desk_failure(d.id);
      raise exception 'That PIN didn''t work.';
    end if;
  else
    select * into s
      from public.students
     where classroom_id = c.id
       and pin = p_pin;

    if s.id is null or crypt(p_pin, s.pin_hash) <> s.pin_hash then
      perform public.note_desk_failure(d.id);
      raise exception 'That PIN didn''t work.';
    end if;

    update public.students
       set desk_id = null
     where desk_id = d.id
       and id <> s.id;

    update public.students
       set desk_id = d.id
     where id = s.id;
  end if;

  delete from public.desk_unlock_attempts where desk_id = d.id;
  delete from public.desk_sessions where desk_id = d.id;

  insert into public.desk_sessions (desk_id, student_id)
  values (d.id, s.id)
  returning token into sess;

  return public.desk_session_payload(d.id, s.id, sess);
end;
$$;

create or replace function public.desk_session(p_token uuid, p_session uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  d public.desks;
  sess public.desk_sessions;
  s public.students;
begin
  if p_token is null or p_session is null then
    raise exception 'Sign in with your PIN again.';
  end if;

  select * into sess from public.desk_sessions where token = p_session;
  if sess.id is null then
    raise exception 'Sign in with your PIN again.';
  end if;

  select * into d
    from public.desks
   where id = sess.desk_id
     and screen_token = p_token
     and kind = 'screen';

  if d.id is null then
    raise exception 'Sign in with your PIN again.';
  end if;

  select * into s from public.students where id = sess.student_id;
  if s.id is null or s.desk_id is distinct from d.id then
    raise exception 'Sign in with your PIN again.';
  end if;

  return public.desk_session_payload(d.id, s.id, sess.token);
end;
$$;

create or replace function public.rotate_desk_token(p_desk uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_token uuid;
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;

  update public.desks d
     set screen_token = gen_random_uuid()
    from public.classrooms c
   where d.id = p_desk
     and d.kind = 'screen'
     and c.id = d.classroom_id
     and c.owner_id = auth.uid()
  returning d.screen_token into new_token;

  if new_token is null then
    raise exception 'not allowed';
  end if;

  return new_token;
end;
$$;

revoke all on function public.open_desk(uuid) from public;
revoke all on function public.unlock_screen(uuid, text) from public;
revoke all on function public.desk_session(uuid, uuid) from public;
revoke all on function public.rotate_desk_token(uuid) from public;
revoke all on function public.desk_session_payload(uuid, uuid, uuid) from public;
revoke all on function public.note_desk_failure(uuid) from public;
revoke all on function public.hash_student_pin() from public;
revoke all on function public.ensure_desk_token() from public;
revoke all on function public.clear_desk_sessions_on_change() from public;

grant execute on function public.open_desk(uuid) to anon, authenticated;
grant execute on function public.unlock_screen(uuid, text) to anon, authenticated;
grant execute on function public.desk_session(uuid, uuid) to anon, authenticated;
grant execute on function public.rotate_desk_token(uuid) to authenticated;
grant execute on function public.hash_student_pin() to authenticated;
grant execute on function public.ensure_desk_token() to authenticated;
grant execute on function public.clear_desk_sessions_on_change() to authenticated;

