-- Make this user ADMIN (run in Supabase SQL Editor)
-- Email: sundrammaurya1996@gmail.com

-- Step 1: Check current profile
select id, email, role, apartment_no, full_name
from public.profiles
where email = 'sundrammaurya1996@gmail.com';

-- Step 2: Set admin role
update public.profiles
set
  role = 'admin',
  apartment_no = null,
  full_name = coalesce(full_name, 'Society Admin')
where email = 'sundrammaurya1996@gmail.com';

-- Step 3: If profile missing (no row above), create from auth user:
insert into public.profiles (id, full_name, email, role, apartment_no)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', 'Society Admin'),
  u.email,
  'admin'::public.app_role,
  null
from auth.users u
where u.email = 'sundrammaurya1996@gmail.com'
  and not exists (
    select 1 from public.profiles p where p.id = u.id
  );

-- Step 4: Verify
select id, email, role, apartment_no from public.profiles
where email = 'sundrammaurya1996@gmail.com';
