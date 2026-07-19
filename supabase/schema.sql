-- Augusta Wishtown — Supabase schema
-- RFID = vehicles only | Maids = card_number | Use apartment_no (not floor)

create type public.app_role as enum ('admin', 'owner', 'tenant');
create type public.employment_type as enum ('full_time', 'part_time');
create type public.staff_gender as enum ('male', 'female', 'other');
create type public.security_employee_type as enum (
  'security_guard', 'gardener', 'cleaner', 'technician', 'other'
);
create type public.shift_type as enum ('day', 'night', 'rotational');
create type public.rfid_status as enum ('active', 'blocked', 'expired', 'lost');
create type public.rfid_holder_type as enum ('vehicle');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  role public.app_role not null default 'admin',
  flat_unit text,
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

-- Vehicle RFID only
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

-- Maids: card_number (NO RFID)
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

create index idx_rfid_apartment on public.rfid_cards(apartment_no);
create index idx_drivers_apartment on public.drivers(apartment_no);
create index idx_maids_apartment on public.maids(apartment_no);
create index idx_security_type on public.security_staff(employee_type);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'admin')
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

alter table public.profiles enable row level security;
alter table public.flats enable row level security;
alter table public.rfid_cards enable row level security;
alter table public.drivers enable row level security;
alter table public.maids enable row level security;
alter table public.security_staff enable row level security;

create or replace function public.current_role()
returns public.app_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.current_role() = 'admin');
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid() or public.current_role() = 'admin');

create policy "flats_all_auth" on public.flats
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "rfid_all_auth" on public.rfid_cards
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "drivers_all_auth" on public.drivers
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "maids_all_auth" on public.maids
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "security_all_auth" on public.security_staff
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
