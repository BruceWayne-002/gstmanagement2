
-- Add source column to gstr3b_section_3_1 table
alter table gstr3b_section_3_1 
add column if not exists source text default 'AUTO';

-- Check constraint to ensure source is either 'AUTO' or 'MANUAL'
alter table gstr3b_section_3_1 
drop constraint if exists gstr3b_section_3_1_source_check;

alter table gstr3b_section_3_1 
add constraint gstr3b_section_3_1_source_check 
check (source in ('AUTO', 'MANUAL'));
