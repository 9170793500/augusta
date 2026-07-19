-- Disable public self-signup (admin creates users only)
-- Supabase Dashboard: Authentication → Providers → Email → Confirm email OFF (optional)
-- Authentication → Settings → disable "Allow new users to sign up" if available

-- Admin can read all owner profiles
drop policy if exists "profiles_admin_select_all" on public.profiles;
create policy "profiles_admin_select_all" on public.profiles
  for select using (public.is_admin() or id = auth.uid());

-- Deploy edge function for admin user creation:
--   supabase functions deploy create-user --project-ref tzbzsgyhwsnzrgusridb
