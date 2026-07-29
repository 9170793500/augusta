-- Run once in Supabase SQL Editor before public_details_submissions.sql (if columns missing)

alter table public.maids add column if not exists card_valid_from date;
alter table public.drivers add column if not exists licence_valid_from date;

notify pgrst, 'reload schema';
