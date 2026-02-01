-- Create user_data table for generic key-value storage
create table if not exists public.user_data (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  key text not null,
  value jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint user_data_user_key_unique unique (user_id, key)
);

-- Enable Row Level Security
alter table public.user_data enable row level security;

-- Policies
create policy "Users can view own data" on public.user_data
  for select using (auth.uid() = user_id);

create policy "Users can insert own data" on public.user_data
  for insert with check (auth.uid() = user_id);

create policy "Users can update own data" on public.user_data
  for update using (auth.uid() = user_id);

create policy "Users can delete own data" on public.user_data
  for delete using (auth.uid() = user_id);
