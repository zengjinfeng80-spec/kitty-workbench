create table if not exists public.workbench_records (
  id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  record_type text not null check (record_type in ('task', 'account', 'fitness', 'event', 'keepsake', 'diary', 'cycle', 'profile')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  migration_id uuid,
  device_id text not null,
  primary key (user_id, id)
);

create index if not exists workbench_records_user_type_updated_idx
  on public.workbench_records (user_id, record_type, updated_at desc);

create table if not exists public.migration_batches (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  module_counts jsonb not null default '{}'::jsonb,
  status text not null check (status in ('running', 'completed', 'failed')),
  error_summary text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.workbench_records enable row level security;
alter table public.migration_batches enable row level security;

create policy "users read own workbench records"
  on public.workbench_records for select
  using (auth.uid() = user_id);

create policy "users insert own workbench records"
  on public.workbench_records for insert
  with check (auth.uid() = user_id);

create policy "users update own workbench records"
  on public.workbench_records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own workbench records"
  on public.workbench_records for delete
  using (auth.uid() = user_id);

create policy "users read own migration batches"
  on public.migration_batches for select
  using (auth.uid() = user_id);

create policy "users insert own migration batches"
  on public.migration_batches for insert
  with check (auth.uid() = user_id);

create policy "users update own migration batches"
  on public.migration_batches for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
