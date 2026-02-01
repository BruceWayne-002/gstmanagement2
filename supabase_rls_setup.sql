-- Enable RLS on all tables
-- This script assumes tables might not exist, so it creates them.
-- If they exist, it adds user_id and enables RLS.

-- 1. PROFILES
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  username text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- Profiles Policies
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- 2. USER_DASHBOARD
create table if not exists public.user_dashboard (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  email text,
  ip text,
  "returnsFiled" numeric,
  "pendingReturns" numeric,
  "totalTaxPaid" numeric,
  "inputTaxCredit" numeric,
  "lastLogin" timestamptz,
  created_at timestamptz default now(),
  constraint user_dashboard_user_id_key unique (user_id)
);
alter table public.user_dashboard enable row level security;

create policy "Users can view own dashboard" on public.user_dashboard
  for select using (auth.uid() = user_id);

create policy "Users can insert own dashboard" on public.user_dashboard
  for insert with check (auth.uid() = user_id);

create policy "Users can update own dashboard" on public.user_dashboard
  for update using (auth.uid() = user_id);

create policy "Users can delete own dashboard" on public.user_dashboard
  for delete using (auth.uid() = user_id);

-- 3. ANNOUNCEMENTS
create table if not exists public.announcements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  content text,
  date timestamptz,
  created_at timestamptz default now()
);
alter table public.announcements enable row level security;

create policy "Users can view own announcements" on public.announcements
  for select using (auth.uid() = user_id);

create policy "Users can insert own announcements" on public.announcements
  for insert with check (auth.uid() = user_id);

create policy "Users can update own announcements" on public.announcements
  for update using (auth.uid() = user_id);

create policy "Users can delete own announcements" on public.announcements
  for delete using (auth.uid() = user_id);

-- 4. ACTIVITIES
create table if not exists public.activities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  description text,
  created_at timestamptz default now()
);
alter table public.activities enable row level security;

create policy "Users can view own activities" on public.activities
  for select using (auth.uid() = user_id);

create policy "Users can insert own activities" on public.activities
  for insert with check (auth.uid() = user_id);

create policy "Users can update own activities" on public.activities
  for update using (auth.uid() = user_id);

create policy "Users can delete own activities" on public.activities
  for delete using (auth.uid() = user_id);

-- 5. GST_RETURNS
create table if not exists public.gst_returns (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  financial_year text,
  quarter text,
  period text,
  status text,
  data jsonb,
  created_at timestamptz default now()
);
alter table public.gst_returns enable row level security;

create policy "Users can view own gst_returns" on public.gst_returns
  for select using (auth.uid() = user_id);

create policy "Users can insert own gst_returns" on public.gst_returns
  for insert with check (auth.uid() = user_id);

create policy "Users can update own gst_returns" on public.gst_returns
  for update using (auth.uid() = user_id);

create policy "Users can delete own gst_returns" on public.gst_returns
  for delete using (auth.uid() = user_id);

-- 6. B2B_RECORDS
create table if not exists public.b2b_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  gstin text,
  recipient_name text,
  invoice_number text,
  invoice_date date,
  total_value numeric,
  data jsonb,
  created_at timestamptz default now()
);
alter table public.b2b_records enable row level security;

create policy "Users can view own b2b_records" on public.b2b_records
  for select using (auth.uid() = user_id);

create policy "Users can insert own b2b_records" on public.b2b_records
  for insert with check (auth.uid() = user_id);

create policy "Users can update own b2b_records" on public.b2b_records
  for update using (auth.uid() = user_id);

create policy "Users can delete own b2b_records" on public.b2b_records
  for delete using (auth.uid() = user_id);

-- 7. B2C_RECORDS
create table if not exists public.b2c_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  pos_code text,
  taxable_value numeric,
  rate numeric,
  data jsonb,
  created_at timestamptz default now()
);
alter table public.b2c_records enable row level security;

create policy "Users can view own b2c_records" on public.b2c_records
  for select using (auth.uid() = user_id);

create policy "Users can insert own b2c_records" on public.b2c_records
  for insert with check (auth.uid() = user_id);

create policy "Users can update own b2c_records" on public.b2c_records
  for update using (auth.uid() = user_id);

create policy "Users can delete own b2c_records" on public.b2c_records
  for delete using (auth.uid() = user_id);

-- 8. DOCUMENTS
create table if not exists public.documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text,
  document_number text,
  date date,
  data jsonb,
  created_at timestamptz default now()
);
alter table public.documents enable row level security;

create policy "Users can view own documents" on public.documents
  for select using (auth.uid() = user_id);

create policy "Users can insert own documents" on public.documents
  for insert with check (auth.uid() = user_id);

create policy "Users can update own documents" on public.documents
  for update using (auth.uid() = user_id);

create policy "Users can delete own documents" on public.documents
  for delete using (auth.uid() = user_id);

-- 9. FILE_RETURNS
create table if not exists public.file_returns (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  return_type text,
  period text,
  ack_number text,
  data jsonb,
  created_at timestamptz default now()
);
alter table public.file_returns enable row level security;

create policy "Users can view own file_returns" on public.file_returns
  for select using (auth.uid() = user_id);

create policy "Users can insert own file_returns" on public.file_returns
  for insert with check (auth.uid() = user_id);

create policy "Users can update own file_returns" on public.file_returns
  for update using (auth.uid() = user_id);

create policy "Users can delete own file_returns" on public.file_returns
  for delete using (auth.uid() = user_id);
