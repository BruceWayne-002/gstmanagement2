-- Table: gstr3b_summary
-- Stores aggregated totals for GSTR-3B sections to support efficient fetching in the Prepare Online page.

create table if not exists gstr3b_summary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  gstin text,
  filing_year text not null,
  quarter text not null,
  period text not null,

  -- Section 3.1: Tax on outward and reverse charge inward supplies
  sec_3_1 jsonb, 
  -- Example structure: { "igst": 0, "cgst": 0, "sgst": 0, "cess": 0, "taxable": 0 }

  -- Section 3.2: Inter-state supplies (usually derived from 3.1 but can be stored if needed)
  sec_3_2 jsonb,

  -- Section 4: Eligible ITC
  sec_4 jsonb,
  -- Example structure: { "igst": 0, "cgst": 0, "sgst": 0, "cess": 0 }

  -- Section 5: Exempt, Nil and Non-GST inward supplies
  sec_5 jsonb,

  -- Section 5.1: Interest and Late fee
  sec_5_1 jsonb,

  -- Section 6.1: Payment of Tax
  sec_6_1 jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Ensure one summary row per return period
  unique (user_id, filing_year, quarter, period)
);

-- Enable RLS (if applicable to your project policy, otherwise standard access)
alter table gstr3b_summary enable row level security;

create policy "Users can insert their own summary"
  on gstr3b_summary for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own summary"
  on gstr3b_summary for update
  using (auth.uid() = user_id);

create policy "Users can select their own summary"
  on gstr3b_summary for select
  using (auth.uid() = user_id);
