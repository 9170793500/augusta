-- Owner & Tenant: VIEW ONLY
-- ⚠️ Ab ye file use karo: supabase/brd_and_view_only.sql
-- (BRD tables + view-only policies — ek hi baar me sab ho jata hai)
--
-- Agar sirf policies update karni ho aur BRD tables pehle se hain:
-- niche wala code chala sakte ho.
-- ========== Core tables: write = admin only, read = own apartment ==========
drop policy if exists "rfid_insert" on public.rfid_cards;
drop policy if exists "rfid_update" on public.rfid_cards;
drop policy if exists "rfid_delete" on public.rfid_cards;
create policy "rfid_insert" on public.rfid_cards for insert with check (public.is_admin());
create policy "rfid_update" on public.rfid_cards for update using (public.is_admin()) with check (public.is_admin());
create policy "rfid_delete" on public.rfid_cards for delete using (public.is_admin());

drop policy if exists "drivers_insert" on public.drivers;
drop policy if exists "drivers_update" on public.drivers;
drop policy if exists "drivers_delete" on public.drivers;
create policy "drivers_insert" on public.drivers for insert with check (public.is_admin());
create policy "drivers_update" on public.drivers for update using (public.is_admin()) with check (public.is_admin());
create policy "drivers_delete" on public.drivers for delete using (public.is_admin());

drop policy if exists "maids_insert" on public.maids;
drop policy if exists "maids_update" on public.maids;
drop policy if exists "maids_delete" on public.maids;
create policy "maids_insert" on public.maids for insert with check (public.is_admin());
create policy "maids_update" on public.maids for update using (public.is_admin()) with check (public.is_admin());
create policy "maids_delete" on public.maids for delete using (public.is_admin());

-- Flats: residents view only (admin writes via flats_write_admin)
drop policy if exists "flats_insert_own" on public.flats;
drop policy if exists "flats_update_own" on public.flats;
drop policy if exists "flats_insert_admin" on public.flats;
create policy "flats_update_own" on public.flats
  for update using (public.is_admin()) with check (public.is_admin());

-- Helper used by BRD modules
create or replace function public.can_edit_apartment(apt text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin();
$$;

-- ========== BRD tables — sirf tab jab table exist kare ==========
do $$ declare t text; begin
  foreach t in array array['leases','vehicles','parking_amenities','maintenance_dues','noc_charges','kyc_documents'] loop
    if not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      raise notice 'Skipping % — table does not exist yet. Run brd_schema.sql first.', t;
      continue;
    end if;

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

-- Alerts table (optional — brd_schema.sql ke baad)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'alerts') then
    drop policy if exists "alerts_select" on public.alerts;
    create policy "alerts_select" on public.alerts
      for select using (public.is_admin() or apartment_no = public.my_apartment() or apartment_no is null);
    drop policy if exists "alerts_admin_write" on public.alerts;
    create policy "alerts_admin_write" on public.alerts
      for all using (public.is_admin()) with check (public.is_admin());
  else
    raise notice 'Skipping alerts — table does not exist yet. Run brd_schema.sql first.';
  end if;
end $$;
