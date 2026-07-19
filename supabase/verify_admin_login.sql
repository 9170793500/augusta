-- Admin login fix — Supabase SQL Editor me chalao
-- Email apna admin email likho

-- 1) Auth user exists?
select id, email, email_confirmed_at, last_sign_in_at
from auth.users
where email = 'sundrammaurya1996@gmail.com';

-- 2) Profile admin hai?
select id, email, role, apartment_no from public.profiles
where email = 'sundrammaurya1996@gmail.com';

-- 3) Admin role set karo (profile missing ho to insert)
update public.profiles
set role = 'admin', apartment_no = null
where email = 'sundrammaurya1996@gmail.com';

insert into public.profiles (id, full_name, email, role, apartment_no)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', 'Admin'), u.email, 'admin'::public.app_role, null
from auth.users u
where u.email = 'sundrammaurya1996@gmail.com'
  and not exists (select 1 from public.profiles p where p.id = u.id);

-- 4) Email confirm (agar confirmed nahi)
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email = 'sundrammaurya1996@gmail.com';
