-- ============================================================
-- Tower 5 flat codes correction — NO data delete
-- Renames wrong *08 flats to correct *10 (same floor, 2nd unit).
-- Keeps *09 flats unchanged (009, 109, 209, …).
--
-- Run in Supabase SQL Editor.
-- Safe to re-run: already-renamed codes are skipped.
-- ============================================================

create temp table if not exists tower5_renames (
  old_code text primary key,
  new_code text not null unique
) on commit drop;

truncate tower5_renames;

insert into tower5_renames (old_code, new_code) values
  ('AUG050008', 'AUG050010'),
  ('AUG050108', 'AUG050110'),
  ('AUG050208', 'AUG050210'),
  ('AUG050308', 'AUG050310'),
  ('AUG050408', 'AUG050410'),
  ('AUG050508', 'AUG050510')
on conflict do nothing;

-- Helper: rename apartment_no in any table (two-step via temp suffix to avoid unique clashes)
do $$
declare
  t text;
  tables text[] := array[
    'flats',
    'flat_residents',
    'leases',
    'vehicles',
    'drivers',
    'maids',
    'rfid_cards',
    'parking_amenities',
    'maintenance_dues',
    'noc_charges',
    'kyc_documents',
    'alerts'
  ];
  r record;
  tmp text;
begin
  foreach t in array tables loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'apartment_no'
    ) then
      continue;
    end if;

    for r in select old_code, new_code from tower5_renames loop
      tmp := r.old_code || '__TMP__';

      execute format(
        'update public.%I set apartment_no = $1 where apartment_no = $2',
        t
      ) using tmp, r.old_code;

      execute format(
        'update public.%I set apartment_no = $1 where apartment_no = $2',
        t
      ) using r.new_code, tmp;
    end loop;
  end loop;

  -- profiles.apartment_no (optional user link)
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'apartment_no'
  ) then
    for r in select old_code, new_code from tower5_renames loop
      tmp := r.old_code || '__TMP__';
      update public.profiles set apartment_no = tmp where apartment_no = r.old_code;
      update public.profiles set apartment_no = r.new_code where apartment_no = tmp;
    end loop;
  end if;
end $$;

-- Ensure all 12 correct Tower 5 rows exist in flats (add missing only)
insert into public.flats (apartment_no, tower, floor, status, occupancy_status)
values
  ('AUG050009', '5', '0', 'vacant', 'vacant'),
  ('AUG050010', '5', '0', 'vacant', 'vacant'),
  ('AUG050109', '5', '1', 'vacant', 'vacant'),
  ('AUG050110', '5', '1', 'vacant', 'vacant'),
  ('AUG050209', '5', '2', 'vacant', 'vacant'),
  ('AUG050210', '5', '2', 'vacant', 'vacant'),
  ('AUG050309', '5', '3', 'vacant', 'vacant'),
  ('AUG050310', '5', '3', 'vacant', 'vacant'),
  ('AUG050409', '5', '4', 'vacant', 'vacant'),
  ('AUG050410', '5', '4', 'vacant', 'vacant'),
  ('AUG050509', '5', '5', 'vacant', 'vacant'),
  ('AUG050510', '5', '5', 'vacant', 'vacant')
on conflict (apartment_no) do update set
  tower = excluded.tower,
  floor = excluded.floor;

-- Fix tower/floor on unchanged *09 codes
update public.flats set tower = '5', floor = '0' where apartment_no = 'AUG050009';
update public.flats set tower = '5', floor = '1' where apartment_no = 'AUG050109';
update public.flats set tower = '5', floor = '2' where apartment_no = 'AUG050209';
update public.flats set tower = '5', floor = '3' where apartment_no = 'AUG050309';
update public.flats set tower = '5', floor = '4' where apartment_no = 'AUG050409';
update public.flats set tower = '5', floor = '5' where apartment_no = 'AUG050509';

-- Verify
select apartment_no, tower, floor, owner_name, occupancy_status
from public.flats
where tower = '5'
order by floor, apartment_no;

notify pgrst, 'reload schema';
