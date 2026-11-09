-- VRV Servicing module (AMC accounts) — run after main schema + is_admin() / my_apartment()

create type public.vrv_payment_mode as enum ('Cash', 'UPI', 'Cheque', 'Bank Transfer', 'Credit');
create type public.vrv_cashbook_type as enum ('Income', 'Expense');

create table if not exists public.vrv_settings (
  id int primary key default 1 check (id = 1),
  opening_balance int not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.vrv_settings (id, opening_balance) values (1, 0)
on conflict (id) do nothing;

create table if not exists public.vrv_amc_contracts (
  id uuid primary key default gen_random_uuid(),
  apartment_code text not null,
  tower int not null check (tower in (3, 4, 5)),
  flat_no text not null,
  owner_name text,
  mobile text,
  service text not null default 'VRV Service & Repair',
  annual_amount int not null default 35000 check (annual_amount >= 0),
  period_label text not null,
  start_date date,
  preferred_payment_mode public.vrv_payment_mode,
  remarks text,
  legacy_id text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique (apartment_code, period_label)
);

create index if not exists idx_vrv_contracts_period on public.vrv_amc_contracts(period_label);
create index if not exists idx_vrv_contracts_apt on public.vrv_amc_contracts(apartment_code);

create table if not exists public.vrv_payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.vrv_amc_contracts(id) on delete restrict,
  payment_date date not null,
  amount int not null check (amount > 0),
  mode public.vrv_payment_mode not null,
  reference_no text,
  cheque_date date,
  received_by text,
  remarks text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vrv_payments_contract on public.vrv_payments(contract_id);
create index if not exists idx_vrv_payments_date on public.vrv_payments(payment_date desc);

create table if not exists public.vrv_salary_payments (
  id uuid primary key default gen_random_uuid(),
  employee_name text not null,
  role text,
  salary_month date not null,
  salary_due int not null check (salary_due >= 0),
  payment_date date not null,
  amount_paid int not null check (amount_paid > 0),
  mode public.vrv_payment_mode not null,
  reference_no text,
  paid_by text,
  remarks text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vrv_materials (
  id uuid primary key default gen_random_uuid(),
  purchase_date date not null,
  material_name text not null,
  category text,
  qty numeric(12, 3) not null check (qty > 0),
  unit text not null,
  rate int not null check (rate >= 0),
  paid_amount int not null default 0 check (paid_amount >= 0),
  mode public.vrv_payment_mode not null,
  vendor text,
  bill_no text,
  bill_attachment text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vrv_cashbook (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  type public.vrv_cashbook_type not null,
  description text not null,
  category text,
  amount int not null check (amount > 0),
  mode public.vrv_payment_mode not null,
  reference text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.vrv_settings enable row level security;
alter table public.vrv_amc_contracts enable row level security;
alter table public.vrv_payments enable row level security;
alter table public.vrv_salary_payments enable row level security;
alter table public.vrv_materials enable row level security;
alter table public.vrv_cashbook enable row level security;

create policy "vrv_settings_admin" on public.vrv_settings for all
  using (public.is_admin()) with check (public.is_admin());

create policy "vrv_contracts_select" on public.vrv_amc_contracts for select using (
  deleted_at is null and (
    public.is_admin()
    or apartment_code = public.my_apartment()
  )
);
create policy "vrv_contracts_write" on public.vrv_amc_contracts for all
  using (public.is_admin() and deleted_at is null)
  with check (public.is_admin());

create policy "vrv_payments_select" on public.vrv_payments for select using (
  deleted_at is null and (
    public.is_admin()
    or exists (
      select 1 from public.vrv_amc_contracts c
      where c.id = contract_id and c.apartment_code = public.my_apartment()
    )
  )
);
create policy "vrv_payments_write" on public.vrv_payments for all
  using (public.is_admin() and deleted_at is null)
  with check (public.is_admin());

create policy "vrv_salary_select" on public.vrv_salary_payments for select using (
  deleted_at is null and public.is_admin()
);
create policy "vrv_salary_write" on public.vrv_salary_payments for all
  using (public.is_admin() and deleted_at is null)
  with check (public.is_admin());

create policy "vrv_materials_select" on public.vrv_materials for select using (
  deleted_at is null and public.is_admin()
);
create policy "vrv_materials_write" on public.vrv_materials for all
  using (public.is_admin() and deleted_at is null)
  with check (public.is_admin());

create policy "vrv_cashbook_select" on public.vrv_cashbook for select using (
  deleted_at is null and public.is_admin()
);
create policy "vrv_cashbook_write" on public.vrv_cashbook for all
  using (public.is_admin() and deleted_at is null)
  with check (public.is_admin());
