create table if not exists public.wrd_users (
  username text primary key,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.wrd_schedules (
  id uuid primary key,
  owner_username text not null references public.wrd_users(username) on delete cascade,
  name text not null,
  roster jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wrd_schedules_owner_updated
  on public.wrd_schedules(owner_username, updated_at desc);

alter table public.wrd_users enable row level security;
alter table public.wrd_schedules enable row level security;

create policy "server service role manages users"
  on public.wrd_users
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "server service role manages schedules"
  on public.wrd_schedules
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
