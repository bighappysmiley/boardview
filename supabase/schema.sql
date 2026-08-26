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
