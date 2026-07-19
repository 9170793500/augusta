-- ============================================================
-- TUMHARE LIYE YE FILE RUN KARO (tables pehle se hain)
-- setup_all.sql MAT chalao — usme types dubara banate hain
-- File: upgrade_existing.sql
-- ============================================================

-- 1) Column renames (sirf agar purana naam ho)
do $$
begin
  -- flats.unit_no → apartment_no
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='flats' and column_name='unit_no')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='flats' and column_name='apartment_no')
  then
    alter table public.flats rename column unit_no to apartment_no;
  end if;

  -- flats.floor hatao
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='flats' and column_name='floor') then
    alter table public.flats drop column floor;
  end if;

  -- rfid_cards.unit_no → apartment_no
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='rfid_cards' and column_name='unit_no')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='rfid_cards' and column_name='apartment_no')
  then
    alter table public.rfid_cards rename column unit_no to apartment_no;
  end if;

  -- drivers.unit_no → apartment_no
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='drivers' and column_name='unit_no')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='drivers' and column_name='apartment_no')
  then
    alter table public.drivers rename column unit_no to apartment_no;
  end if;

  -- maids.unit_no → apartment_no
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='maids' and column_name='unit_no')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='maids' and column_name='apartment_no')
  then
    alter table public.maids rename column unit_no to apartment_no;
  end if;

  -- profiles.flat_unit → apartment_no
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='flat_unit')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='apartment_no')
  then
    alter table public.profiles rename column flat_unit to apartment_no;
  end if;
end $$;

-- 2) RFID vehicle_no not null (safe)
update public.rfid_cards set vehicle_no = coalesce(nullif(vehicle_no, ''), 'UNKNOWN') where vehicle_no is null or vehicle_no = '';
alter table public.rfid_cards alter column vehicle_no set not null;

-- 3) Drivers: RFID hatao (gaadi RFID alag table mein)
alter table public.drivers drop column if exists rfid_no;

-- 4) Maids: card_number, RFID columns hatao
alter table public.maids add column if not exists card_number text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'maids' and column_name = 'rfid_no'
  ) then
    update public.maids
    set card_number = coalesce(nullif(card_number, ''), nullif(rfid_no, ''), 'PENDING')
    where card_number is null or card_number = '';
  else
    update public.maids
    set card_number = coalesce(nullif(card_number, ''), 'PENDING')
    where card_number is null or card_number = '';
  end if;
end $$;

alter table public.maids alter column card_number set not null;
alter table public.maids drop column if exists rfid_no;
alter table public.maids drop column if exists rfid_validity;

-- 5) Profiles extras
alter table public.profiles add column if not exists phone text;
alter table public.profiles alter column role set default 'owner';

-- 6) Role helpers
create or replace function public.current_role()
returns public.app_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.my_apartment()
returns text
language sql stable security definer set search_path = public
as $$
  select apartment_no from public.profiles where id = auth.uid();
$$;

create or replace function public.owns_apartment(apt text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_admin()
    or (apt is not null and apt = public.my_apartment());
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, apartment_no)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'owner'),
    nullif(upper(trim(new.raw_user_meta_data->>'apartment_no')), '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7) Purani open policies hatao + nayi (own apartment) policies
drop policy if exists "flats_all_auth" on public.flats;
drop policy if exists "rfid_all_auth" on public.rfid_cards;
drop policy if exists "drivers_all_auth" on public.drivers;
drop policy if exists "maids_all_auth" on public.maids;
drop policy if exists "security_all_auth" on public.security_staff;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
drop policy if exists "flats_select" on public.flats;
drop policy if exists "flats_write_admin" on public.flats;
drop policy if exists "rfid_select" on public.rfid_cards;
drop policy if exists "rfid_insert" on public.rfid_cards;
drop policy if exists "rfid_update" on public.rfid_cards;
drop policy if exists "rfid_delete" on public.rfid_cards;
drop policy if exists "drivers_select" on public.drivers;
drop policy if exists "drivers_insert" on public.drivers;
drop policy if exists "drivers_update" on public.drivers;
drop policy if exists "drivers_delete" on public.drivers;
drop policy if exists "maids_select" on public.maids;
drop policy if exists "maids_insert" on public.maids;
drop policy if exists "maids_update" on public.maids;
drop policy if exists "maids_delete" on public.maids;
drop policy if exists "security_admin_all" on public.security_staff;

create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

create policy "flats_select" on public.flats
  for select using (public.owns_apartment(apartment_no));
create policy "flats_write_admin" on public.flats
  for all using (public.is_admin()) with check (public.is_admin());

create policy "rfid_select" on public.rfid_cards
  for select using (public.owns_apartment(apartment_no));
create policy "rfid_insert" on public.rfid_cards
  for insert with check (public.is_admin());
create policy "rfid_update" on public.rfid_cards
  for update using (public.is_admin())
  with check (public.is_admin());
create policy "rfid_delete" on public.rfid_cards
  for delete using (public.is_admin());

create policy "drivers_select" on public.drivers
  for select using (public.owns_apartment(apartment_no));
create policy "drivers_insert" on public.drivers
  for insert with check (public.is_admin());
create policy "drivers_update" on public.drivers
  for update using (public.is_admin())
  with check (public.is_admin());
create policy "drivers_delete" on public.drivers
  for delete using (public.is_admin());

create policy "maids_select" on public.maids
  for select using (public.owns_apartment(apartment_no));
create policy "maids_insert" on public.maids
  for insert with check (public.is_admin());
create policy "maids_update" on public.maids
  for update using (public.is_admin())
  with check (public.is_admin());
create policy "maids_delete" on public.maids
  for delete using (public.is_admin());

create policy "security_admin_all" on public.security_staff
  for all using (public.is_admin()) with check (public.is_admin());

-- 8) Sample data (agar pehle se nahi hai)
insert into public.flats (apartment_no) values
  ('AUG0010201'),
  ('AUG0020104')
on conflict (apartment_no) do nothing;

insert into public.rfid_cards (sr_no, apartment_no, vehicle_no, rfid_no, holder_type, status) values
  (1, 'AUG0010201', 'DL9CBC8354', '14258616', 'vehicle', 'active'),
  (2, 'AUG0020104', 'UP14EY2926', '14258611', 'vehicle', 'active')
on conflict (rfid_no) do nothing;

-- Flat signup: owner apna flat row insert/update kar sake — DISABLED (admin only)
drop policy if exists "flats_insert_own" on public.flats;
drop policy if exists "flats_update_own" on public.flats;

-- ========== 9) BRD + View-only — supabase/brd_and_view_only.sql chalao ==========
-- (leases, vehicles, parking, dues, noc, kyc, alerts + owner/tenant read-only)

