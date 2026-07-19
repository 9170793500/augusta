-- Augusta Wishtown — full setup
-- Admin = sab data | Flat owner = sirf apna apartment form + view
-- Run once in Supabase SQL Editor

-- ========== TYPES ==========
create type public.app_role as enum ('admin', 'owner', 'tenant');
create type public.employment_type as enum ('full_time', 'part_time');
create type public.staff_gender as enum ('male', 'female', 'other');
create type public.security_employee_type as enum (
  'security_guard', 'gardener', 'cleaner', 'technician', 'other'
);
create type public.shift_type as enum ('day', 'night', 'rotational');
create type public.rfid_status as enum ('active', 'blocked', 'expired', 'lost');
create type public.rfid_holder_type as enum ('vehicle');

-- ========== TABLES ==========
-- Login users (linked to Supabase Auth auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  role public.app_role not null default 'owner',
  apartment_no text,
  phone text,
  created_at timestamptz not null default now()
);

create table public.flats (
  id uuid primary key default gen_random_uuid(),
  apartment_no text not null unique,
  tower text,
  owner_name text,
  owner_phone text,
  status text default 'owner_occupied',
  created_at timestamptz not null default now()
);

create table public.rfid_cards (
  id uuid primary key default gen_random_uuid(),
  sr_no int,
  apartment_no text not null,
  vehicle_no text not null,
  rfid_no text not null unique,
  holder_type public.rfid_holder_type default 'vehicle',
  holder_name text,
  status public.rfid_status not null default 'active',
  valid_till date,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  apartment_no text not null,
  vehicle_no text,
  driver_name text not null,
  mobile text,
  licence_number text,
  licence_validity date,
  aadhar_number text,
  address text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.maids (
  id uuid primary key default gen_random_uuid(),
  apartment_no text not null,
  name text not null,
  age int,
  gender public.staff_gender,
  employment_type public.employment_type not null default 'part_time',
  aadhar_number text not null,
  mobile text,
  card_number text not null,
  employment_valid_till date,
  photo_url text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Society-level: admin only
create table public.security_staff (
  id uuid primary key default gen_random_uuid(),
  employee_type public.security_employee_type not null default 'security_guard',
  name text not null,
  mobile text not null,
  aadhar_number text,
  employee_id text,
  shift public.shift_type default 'day',
  rfid_no text,
  address text,
  photo_url text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_apartment on public.profiles(apartment_no);
create index idx_rfid_apartment on public.rfid_cards(apartment_no);
create index idx_drivers_apartment on public.drivers(apartment_no);
create index idx_maids_apartment on public.maids(apartment_no);

-- ========== HELPERS ==========
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

-- Auto profile on Auth signup
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

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger rfid_updated before update on public.rfid_cards
  for each row execute procedure public.set_updated_at();
create trigger drivers_updated before update on public.drivers
  for each row execute procedure public.set_updated_at();
create trigger maids_updated before update on public.maids
  for each row execute procedure public.set_updated_at();
create trigger security_updated before update on public.security_staff
  for each row execute procedure public.set_updated_at();

-- ========== RLS ==========
alter table public.profiles enable row level security;
alter table public.flats enable row level security;
alter table public.rfid_cards enable row level security;
alter table public.drivers enable row level security;
alter table public.maids enable row level security;
alter table public.security_staff enable row level security;

-- Profiles
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- Flats: admin all; owner only own apartment
create policy "flats_select" on public.flats
  for select using (public.owns_apartment(apartment_no));
create policy "flats_write_admin" on public.flats
  for all using (public.is_admin()) with check (public.is_admin());

-- RFID / Driver / Maid: own apartment only (admin = all)
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

-- Security: admin only
create policy "security_admin_all" on public.security_staff
  for all using (public.is_admin()) with check (public.is_admin());

-- ========== SAMPLE DATA (2 rows) ==========
insert into public.flats (apartment_no) values
  ('AUG0010201'),
  ('AUG0020104')
on conflict (apartment_no) do nothing;

insert into public.rfid_cards (sr_no, apartment_no, vehicle_no, rfid_no, holder_type, status) values
  (1, 'AUG0010201', 'DL9CBC8354', '14258616', 'vehicle', 'active'),
  (2, 'AUG0020104', 'UP14EY2926', '14258611', 'vehicle', 'active')
on conflict (rfid_no) do nothing;

-- ========== HOW TO CREATE LOGIN USERS ==========
-- 1) Dashboard → Authentication → Users → Add user
--    Admin example:
--      email: admin@augustawishtown.com
--      password: (your choice)
-- 2) Then run (replace UUID with that user's id from Auth):
--
-- update public.profiles
-- set role = 'admin', full_name = 'Society Admin', apartment_no = null
-- where email = 'admin@augustawishtown.com';
--
-- Flat owner example:
-- update public.profiles
-- set role = 'owner', full_name = 'Owner AUG0010201', apartment_no = 'AUG0010201'
-- where email = 'aug0010201@augustawishtown.com';
