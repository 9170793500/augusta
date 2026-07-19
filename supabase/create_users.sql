-- Create / assign logins AFTER adding users in Authentication → Users
-- Replace emails / apartment numbers with real ones when user list mil jayegi

-- ===== ADMIN =====
update public.profiles
set
  role = 'admin',
  full_name = coalesce(full_name, 'Society Admin'),
  apartment_no = null
where email = 'sundrammaurya1996@gmail.com';

-- ===== FLAT OWNERS (example — apne emails se replace karo) =====
update public.profiles
set
  role = 'owner',
  full_name = 'Owner AUG0010201',
  apartment_no = 'AUG0010201'
where email = 'aug0010201@augustawishtown.com';

update public.profiles
set
  role = 'owner',
  full_name = 'Owner AUG0020104',
  apartment_no = 'AUG0020104'
where email = 'aug0020104@augustawishtown.com';
