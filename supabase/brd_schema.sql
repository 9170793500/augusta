-- BRD modules migration (run after upgrade_existing.sql)
-- Flat Master, Lease, Vehicles, Parking, Dues, NOC, KYC Documents, Alerts

-- ========== ENUMS ==========
do $$ begin
  create type public.flat_status as enum ('owner_occupied', 'rented', 'vacant');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lease_status as enum ('active', 'expired', 'renewed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.linked_to as enum ('owner', 'tenant');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_type as enum (
    'owner_aadhar', 'tenant_aadhar', 'tenant_pan', 'lease_copy',
    'maid_aadhar', 'maid_photo', 'security_aadhar', 'security_photo',
    'vehicle_rc', 'vehicle_licence', 'vehicle_puc', 'other'
  );
exception when duplicate_object then null; end $$;

-- ========== FLAT MASTER (extend flats) ==========
alter table public.flats add column if not exists tower text;
alter table public.flats add column if not exists floor text;
alter table public.flats add column if not exists owner_phone text;
alter table public.flats add column if not exists owner_email text;
alter table public.flats add column if not exists owner_aadhar text;
alter table public.flats add column if not exists tenant_name text;
alter table public.flats add column if not exists tenant_phone text;
alter table public.flats add column if not exists tenant_email text;
alter table public.flats add column if not exists tenant_aadhar text;
alter table public.flats add column if not exists tenant_pan text;
alter table public.flats add column if not exists family_members int default 0;
alter table public.flats add column if not exists occupancy_status text default 'owner_occupied';

-- ========== LEASES ==========
create table if not exists public.leases (
  id uuid primary key default gen_random_uuid(),
  apartment_no text not null,
  tenant_name text not null,
  lease_start date not null,
  lease_end date not null,
  status public.lease_status not null default 'active',
  document_url text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_leases_apartment on public.leases(apartment_no);
create index if not exists idx_leases_end on public.leases(lease_end);

-- ========== VEHICLES (BRD full fields) ==========
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  apartment_no text not null,
  vehicle_no text not null,
  make_model text,
  colour text,
  linked_to public.linked_to default 'owner',
  driver_name text,
  driver_licence text,
  driver_licence_validity date,
  rc_number text,
  puc_id text,
  puc_validity date,
  parking_slot text,
  extra_parking boolean default false,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_vehicles_apartment on public.vehicles(apartment_no);

-- ========== PARKING & GYM ==========
create table if not exists public.parking_amenities (
  id uuid primary key default gen_random_uuid(),
  apartment_no text not null unique,
  parking_slot text,
  extra_parking boolean default false,
  extra_parking_charge numeric(10,2) default 0,
  gym_access boolean default false,
  gym_valid_till date,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== MAINTENANCE DUES ==========
create table if not exists public.maintenance_dues (
  id uuid primary key default gen_random_uuid(),
  apartment_no text not null,
  year int not null,
  annual_amount numeric(10,2) not null default 0,
  paid_amount numeric(10,2) not null default 0,
  pending_amount numeric(10,2) generated always as (annual_amount - paid_amount) stored,
  payment_date date,
  payment_mode text,
  receipt_no text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_dues_apartment on public.maintenance_dues(apartment_no);

-- ========== NOC (Tenant) ==========
create table if not exists public.noc_charges (
  id uuid primary key default gen_random_uuid(),
  apartment_no text not null,
  tenant_name text not null,
  amount numeric(10,2) not null,
  charge_type text default 'entry',
  paid boolean default false,
  payment_date date,
  receipt_no text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_noc_apartment on public.noc_charges(apartment_no);

-- ========== KYC DOCUMENTS ==========
create table if not exists public.kyc_documents (
  id uuid primary key default gen_random_uuid(),
  apartment_no text,
  document_type public.document_type not null,
  holder_name text,
  reference_no text,
  file_url text,
  valid_till date,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_kyc_apartment on public.kyc_documents(apartment_no);

-- ========== IN-APP ALERTS ==========
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  apartment_no text,
  alert_type text not null,
  message text not null,
  due_date date,
  is_read boolean default false,
  created_at timestamptz not null default now()
);

-- ========== TRIGGERS ==========
drop trigger if exists leases_updated on public.leases;
create trigger leases_updated before update on public.leases
  for each row execute procedure public.set_updated_at();
drop trigger if exists vehicles_updated on public.vehicles;
create trigger vehicles_updated before update on public.vehicles
  for each row execute procedure public.set_updated_at();
drop trigger if exists parking_updated on public.parking_amenities;
create trigger parking_updated before update on public.parking_amenities
  for each row execute procedure public.set_updated_at();
drop trigger if exists dues_updated on public.maintenance_dues;
create trigger dues_updated before update on public.maintenance_dues
  for each row execute procedure public.set_updated_at();
drop trigger if exists noc_updated on public.noc_charges;
create trigger noc_updated before update on public.noc_charges
  for each row execute procedure public.set_updated_at();

-- Tenant role helper
create or replace function public.is_tenant()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'tenant');
$$;

create or replace function public.can_edit_apartment(apt text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin();
$$;

-- ========== RLS ==========
alter table public.leases enable row level security;
alter table public.vehicles enable row level security;
alter table public.parking_amenities enable row level security;
alter table public.maintenance_dues enable row level security;
alter table public.noc_charges enable row level security;
alter table public.kyc_documents enable row level security;
alter table public.alerts enable row level security;

-- Flats update policies for owners
drop policy if exists "flats_update_own" on public.flats;
create policy "flats_update_own" on public.flats
  for update using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "flats_insert_admin" on public.flats;
-- flats_write_admin from upgrade handles admin insert

-- Generic apartment-scoped policies
do $$ declare t text; begin
  foreach t in array array['leases','vehicles','parking_amenities','maintenance_dues','noc_charges','kyc_documents'] loop
    execute format('drop policy if exists "%s_select" on public.%I', t, t);
    execute format('drop policy if exists "%s_insert" on public.%I', t, t);
    execute format('drop policy if exists "%s_update" on public.%I', t, t);
    execute format('drop policy if exists "%s_delete" on public.%I', t, t);
    execute format('create policy "%s_select" on public.%I for select using (public.owns_apartment(apartment_no))', t, t);
    execute format('create policy "%s_insert" on public.%I for insert with check (public.is_admin())', t, t);
    execute format('create policy "%s_update" on public.%I for update using (public.is_admin()) with check (public.is_admin())', t, t);
    execute format('create policy "%s_delete" on public.%I for delete using (public.is_admin())', t, t);
  end loop;
end $$;

-- Security: admin full, owner view only, tenant no access
drop policy if exists "security_select" on public.security_staff;
drop policy if exists "security_admin_all" on public.security_staff;
create policy "security_select" on public.security_staff
  for select using (public.is_admin() or (public.current_role() = 'owner'));
create policy "security_write_admin" on public.security_staff
  for all using (public.is_admin()) with check (public.is_admin());

-- Alerts: own apartment or admin
drop policy if exists "alerts_select" on public.alerts;
create policy "alerts_select" on public.alerts
  for select using (public.is_admin() or apartment_no = public.my_apartment() or apartment_no is null);
drop policy if exists "alerts_admin_write" on public.alerts;
create policy "alerts_admin_write" on public.alerts
  for all using (public.is_admin()) with check (public.is_admin());

-- Generate expiry alerts (run periodically or on demand)
create or replace function public.refresh_expiry_alerts()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.alerts where alert_type in ('lease_expiry','rfid_expiry','licence_expiry','puc_expiry');

  insert into public.alerts (apartment_no, alert_type, message, due_date)
  select apartment_no, 'lease_expiry', 'Lease expiring for ' || tenant_name, lease_end
  from public.leases
  where status = 'active' and lease_end <= current_date + interval '30 days';

  insert into public.alerts (apartment_no, alert_type, message, due_date)
  select apartment_no, 'rfid_expiry', 'RFID ' || rfid_no || ' expiring', valid_till
  from public.rfid_cards
  where valid_till is not null and valid_till <= current_date + interval '30 days';

  insert into public.alerts (apartment_no, alert_type, message, due_date)
  select apartment_no, 'licence_expiry', 'Driver licence expiring for ' || driver_name, licence_validity
  from public.drivers
  where licence_validity is not null and licence_validity <= current_date + interval '30 days';

  insert into public.alerts (apartment_no, alert_type, message, due_date)
  select apartment_no, 'puc_expiry', 'PUC expiring for ' || vehicle_no, puc_validity
  from public.vehicles
  where puc_validity is not null and puc_validity <= current_date + interval '30 days';
end;
$$;

select public.refresh_expiry_alerts();
