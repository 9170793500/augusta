-- If OLD setup already ran — apply role/RLS upgrade (do NOT re-run setup_all)

-- profiles: flat_unit → apartment_no
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'flat_unit'
  ) then
    alter table public.profiles rename column flat_unit to apartment_no;
  end if;
end $$;

alter table public.profiles add column if not exists phone text;
alter table public.profiles alter column role set default 'owner';

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

-- Drop old open policies
drop policy if exists "flats_all_auth" on public.flats;
drop policy if exists "rfid_all_auth" on public.rfid_cards;
drop policy if exists "drivers_all_auth" on public.drivers;
drop policy if exists "maids_all_auth" on public.maids;
drop policy if exists "security_all_auth" on public.security_staff;
drop policy if exists "profiles_update_own" on public.profiles;

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
drop policy if exists "profiles_update_own_or_admin" on public.profiles;

create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

create policy "flats_select" on public.flats
  for select using (public.owns_apartment(apartment_no));
create policy "flats_write_admin" on public.flats
  for all using (public.is_admin()) with check (public.is_admin());

create policy "rfid_select" on public.rfid_cards
  for select using (public.owns_apartment(apartment_no));
create policy "rfid_insert" on public.rfid_cards
  for insert with check (public.owns_apartment(apartment_no));
create policy "rfid_update" on public.rfid_cards
  for update using (public.owns_apartment(apartment_no))
  with check (public.owns_apartment(apartment_no));
create policy "rfid_delete" on public.rfid_cards
  for delete using (public.owns_apartment(apartment_no));

create policy "drivers_select" on public.drivers
  for select using (public.owns_apartment(apartment_no));
create policy "drivers_insert" on public.drivers
  for insert with check (public.owns_apartment(apartment_no));
create policy "drivers_update" on public.drivers
  for update using (public.owns_apartment(apartment_no))
  with check (public.owns_apartment(apartment_no));
create policy "drivers_delete" on public.drivers
  for delete using (public.owns_apartment(apartment_no));

create policy "maids_select" on public.maids
  for select using (public.owns_apartment(apartment_no));
create policy "maids_insert" on public.maids
  for insert with check (public.owns_apartment(apartment_no));
create policy "maids_update" on public.maids
  for update using (public.owns_apartment(apartment_no))
  with check (public.owns_apartment(apartment_no));
create policy "maids_delete" on public.maids
  for delete using (public.owns_apartment(apartment_no));

create policy "security_admin_all" on public.security_staff
  for all using (public.is_admin()) with check (public.is_admin());
