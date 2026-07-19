-- ============================================================
-- RESIDENT MASTER + FLAT OCCUPANCY (Owner / Tenant mapping)
-- Supabase SQL Editor me run karo (upgrade_existing ke baad)
-- Ya brd_and_view_only.sql ke baad ye alag chalao
-- ============================================================

-- Occupancy type
do $$ begin
  create type public.occupancy_role as enum ('owner', 'tenant');
exception when duplicate_object then null; end $$;

-- ========== 1) RESIDENT MASTER — saara personal data ek jagah ==========
create table if not exists public.resident_master (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  father_name text,
  aadhar_number text,
  pan_number text,
  email text,
  mobile text,
  alt_mobile text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_resident_master_name on public.resident_master(full_name);
create index if not exists idx_resident_master_aadhar on public.resident_master(aadhar_number);

-- ========== 2) FLAT RESIDENTS — kis flat me kaun rah raha hai ==========
create table if not exists public.flat_residents (
  id uuid primary key default gen_random_uuid(),
  apartment_no text not null,
  resident_id uuid not null references public.resident_master(id) on delete cascade,
  occupancy_role public.occupancy_role not null default 'owner',
  is_current boolean not null default true,
  move_in_date date,
  move_out_date date,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_flat_residents_apartment on public.flat_residents(apartment_no);
create index if not exists idx_flat_residents_resident on public.flat_residents(resident_id);

-- ========== Triggers ==========
drop trigger if exists resident_master_updated on public.resident_master;
create trigger resident_master_updated before update on public.resident_master
  for each row execute procedure public.set_updated_at();

drop trigger if exists flat_residents_updated on public.flat_residents;
create trigger flat_residents_updated before update on public.flat_residents
  for each row execute procedure public.set_updated_at();

-- ========== RLS ==========
alter table public.resident_master enable row level security;
alter table public.flat_residents enable row level security;

-- Resident master: admin full; owner/tenant dekh sake agar unke flat se linked ho
drop policy if exists "resident_master_select" on public.resident_master;
create policy "resident_master_select" on public.resident_master
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.flat_residents fr
      where fr.resident_id = resident_master.id
        and public.owns_apartment(fr.apartment_no)
    )
  );

drop policy if exists "resident_master_write" on public.resident_master;
create policy "resident_master_write" on public.resident_master
  for all using (public.is_admin()) with check (public.is_admin());

-- Flat residents: admin write; owner/tenant read own flat
drop policy if exists "flat_residents_select" on public.flat_residents;
create policy "flat_residents_select" on public.flat_residents
  for select using (public.owns_apartment(apartment_no));

drop policy if exists "flat_residents_write" on public.flat_residents;
create policy "flat_residents_write" on public.flat_residents
  for all using (public.is_admin()) with check (public.is_admin());

-- ========== Migrate existing flat owner/tenant names (optional) ==========
insert into public.resident_master (full_name, aadhar_number, pan_number, mobile, email)
select distinct trim(f.owner_name), nullif(trim(f.owner_aadhar), ''), null, nullif(trim(f.owner_phone), ''), nullif(trim(f.owner_email), '')
from public.flats f
where f.owner_name is not null and trim(f.owner_name) <> ''
  and not exists (
    select 1 from public.resident_master rm
    where lower(rm.full_name) = lower(trim(f.owner_name))
  );

insert into public.flat_residents (apartment_no, resident_id, occupancy_role, is_current)
select f.apartment_no, rm.id, 'owner'::public.occupancy_role, true
from public.flats f
join public.resident_master rm on lower(rm.full_name) = lower(trim(f.owner_name))
where f.owner_name is not null and trim(f.owner_name) <> ''
  and not exists (
    select 1 from public.flat_residents fr
    where fr.apartment_no = f.apartment_no and fr.resident_id = rm.id and fr.occupancy_role = 'owner'
  );

insert into public.resident_master (full_name, aadhar_number, pan_number, mobile)
select distinct trim(f.tenant_name), nullif(trim(f.tenant_aadhar), ''), nullif(trim(f.tenant_pan), ''), nullif(trim(f.tenant_phone), '')
from public.flats f
where f.tenant_name is not null and trim(f.tenant_name) <> ''
  and not exists (
    select 1 from public.resident_master rm
    where lower(rm.full_name) = lower(trim(f.tenant_name))
  );

insert into public.flat_residents (apartment_no, resident_id, occupancy_role, is_current)
select f.apartment_no, rm.id, 'tenant'::public.occupancy_role, true
from public.flats f
join public.resident_master rm on lower(rm.full_name) = lower(trim(f.tenant_name))
where f.tenant_name is not null and trim(f.tenant_name) <> ''
  and not exists (
    select 1 from public.flat_residents fr
    where fr.apartment_no = f.apartment_no and fr.resident_id = rm.id and fr.occupancy_role = 'tenant'
  );
