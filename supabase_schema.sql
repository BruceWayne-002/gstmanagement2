-- Table: gstr3b_section_3_1
create table if not exists gstr3b_section_3_1 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  gstin text,
  filing_year text not null,
  quarter text,
  period text not null,
  row_code text not null check (row_code in ('a','b','c','d','e')),
  taxable_value numeric(15,2) default 0,
  igst numeric(15,2) default 0,
  cgst numeric(15,2) default 0,
  sgst numeric(15,2) default 0,
  cess numeric(15,2) default 0,
  source text default 'AUTO' check (source in ('AUTO', 'MANUAL')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, filing_year, period, row_code)
);

-- Table: gstr3b_3_1_summary
create table if not exists gstr3b_3_1_summary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  filing_year text not null,
  quarter text not null,
  period text not null,
  taxable_value numeric(15,2) default 0,
  igst numeric(15,2) default 0,
  cgst numeric(15,2) default 0,
  sgst numeric(15,2) default 0,
  cess numeric(15,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, filing_year, quarter, period)
);
