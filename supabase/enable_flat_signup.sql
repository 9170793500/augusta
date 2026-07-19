-- Flat owners signup ke baad flats table mein apna apartment insert kar sakein
-- Admin Supabase Auth mein manually banao, phir neeche wala UPDATE chalao

-- Allow owner to create their own flat row on signup
drop policy if exists "flats_insert_own" on public.flats;
create policy "flats_insert_own" on public.flats
  for insert with check (
    public.is_admin()
    or apartment_no = public.my_apartment()
  );

-- Allow owner to update own flat basic info
drop policy if exists "flats_update_own" on public.flats;
create policy "flats_update_own" on public.flats
  for update using (public.owns_apartment(apartment_no))
  with check (public.owns_apartment(apartment_no));

-- ===== ADMIN (tum Supabase Auth → Users → Add user se banao) =====
-- Uske baad ye Run karo (email replace karo):
--
-- update public.profiles
-- set role = 'admin', apartment_no = null, full_name = 'Society Admin'
-- where email = 'YOUR_ADMIN_EMAIL@example.com';
