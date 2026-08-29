-- Spouse contact fields on resident_master (owner + tenant)
-- Run in Supabase SQL Editor after residents_schema.sql

alter table public.resident_master add column if not exists spouse_name text;
alter table public.resident_master add column if not exists spouse_mobile text;

notify pgrst, 'reload schema';
