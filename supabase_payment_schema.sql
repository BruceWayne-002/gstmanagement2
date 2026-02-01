
create table if not exists gstr3b_payment_of_tax (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  gstin text,
  filing_year text,
  quarter text,
  period text,

  col6 numeric default 0,
  col7 numeric default 0,
  col8 numeric default 0,
  col9 numeric default 0,
  col10 numeric default 0,
  col12 numeric generated always as (col7 + col8 + col9) stored,
  col13 numeric generated always as (col6) stored,
  col18 numeric default 0,
  col19 numeric generated always as ((col7 + col8 + col9 + col6) - col18) stored,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(user_id, filing_year, period)
);
