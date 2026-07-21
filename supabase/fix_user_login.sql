-- Fix owner/tenant login — profile missing ho to banao
-- Supabase SQL Editor me chalao (email apna likho)

-- 1) Check auth user + profile
select u.id, u.email, p.role, p.apartment_no, p.full_name
from auth.users u
left join public.profiles p on p.id = u.id
where u.email = 'owner@example.com';

-- 2) Profile insert/update (owner example — tenant ke liye role = 'tenant')
insert into public.profiles (id, full_name, email, role, apartment_no)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', 'Resident'),
  u.email,
  coalesce((u.raw_user_meta_data->>'role')::public.app_role, 'owner'),
  nullif(trim(u.raw_user_meta_data->>'apartment_no'), '')
from auth.users u
where u.email = 'owner@example.com'
on conflict (id) do update set
  email = excluded.email,
  role = excluded.role,
  apartment_no = excluded.apartment_no,
  full_name = excluded.full_name;

-- 3) Email confirm (login block na ho)
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email = 'owner@example.com';

-- Admin check
-- select email, role from public.profiles where role = 'admin';
