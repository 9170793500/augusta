-- Public Add Details -> writes into REAL society tables (security definer = no 401)
-- Run ALL of this in Supabase -> SQL Editor -> Run
-- Includes storage bucket for lease document uploads

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lease-documents',
  'lease-documents',
  true,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "lease_documents_public_read" on storage.objects;
create policy "lease_documents_public_read"
  on storage.objects for select
  using (bucket_id = 'lease-documents');

drop policy if exists "lease_documents_upload" on storage.objects;
create policy "lease_documents_upload"
  on storage.objects for insert
  with check (bucket_id = 'lease-documents');

drop policy if exists "lease_documents_update" on storage.objects;
create policy "lease_documents_update"
  on storage.objects for update
  using (bucket_id = 'lease-documents')
  with check (bucket_id = 'lease-documents');

alter table public.maids add column if not exists card_valid_from date;
alter table public.drivers add column if not exists licence_valid_from date;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Drop older overloads if any
drop function if exists public.submit_public_detail(uuid, text, text, text, text, jsonb);
drop function if exists public.fetch_public_submissions(uuid);

create or replace function public.submit_public_detail(
  p_token uuid,
  p_apartment_no text,
  p_submitter_mobile text,
  p_submitter_name text,
  p_category text,
  p_details jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_apt text := upper(trim(coalesce(p_apartment_no, '')));
  v_resident_id uuid;
  v_link_id uuid;
  v_record_id uuid;
  v_notes text;
  v_gender public.staff_gender;
  v_employment public.employment_type;
  v_linked public.linked_to;
  v_is_resident boolean;
  v_occupancy text;
begin
  if v_apt = '' then raise exception 'Apartment number is required'; end if;
  if p_category not in ('owner', 'tenant', 'lease', 'maid', 'driver', 'servant', 'vehicle') then
    raise exception 'Invalid category';
  end if;

  case p_category
    when 'owner' then
      if coalesce(trim(p_details->>'full_name'), '') = '' then
        raise exception 'Owner full name is required';
      end if;

      v_is_resident := coalesce((p_details->>'is_resident')::boolean, true);
      v_occupancy := case when v_is_resident then 'owner_occupied' else 'vacant' end;

      insert into public.flats (
        apartment_no, owner_name, owner_phone, owner_email, owner_aadhar,
        family_members, occupancy_status, status
      )
      values (
        v_apt,
        trim(p_details->>'full_name'),
        nullif(trim(p_details->>'mobile'), ''),
        nullif(trim(p_details->>'email'), ''),
        nullif(trim(p_details->>'aadhar_number'), ''),
        nullif(trim(p_details->>'family_members'), '')::int,
        v_occupancy,
        v_occupancy
      )
      on conflict (apartment_no) do update set
        owner_name = excluded.owner_name,
        owner_phone = excluded.owner_phone,
        owner_email = excluded.owner_email,
        owner_aadhar = excluded.owner_aadhar,
        family_members = excluded.family_members,
        occupancy_status = excluded.occupancy_status,
        status = excluded.status;

      if not v_is_resident then
        select id into v_record_id from public.flats where apartment_no = v_apt;
        return coalesce(v_record_id, gen_random_uuid());
      end if;

      insert into public.resident_master (
        full_name, father_name, aadhar_number, pan_number, email, mobile, alt_mobile
      )
      values (
        trim(p_details->>'full_name'),
        nullif(trim(p_details->>'father_name'), ''),
        nullif(trim(p_details->>'aadhar_number'), ''),
        nullif(upper(trim(p_details->>'pan_number')), ''),
        nullif(trim(p_details->>'email'), ''),
        nullif(trim(p_details->>'mobile'), ''),
        nullif(trim(p_details->>'alt_mobile'), '')
      )
      returning id into v_resident_id;

      select id into v_link_id
      from public.flat_residents
      where apartment_no = v_apt and occupancy_role = 'owner'
      order by created_at desc
      limit 1;

      if v_link_id is null then
        insert into public.flat_residents (apartment_no, resident_id, occupancy_role, is_current)
        values (v_apt, v_resident_id, 'owner', true)
        returning id into v_record_id;
      else
        update public.flat_residents
        set resident_id = v_resident_id, is_current = true
        where id = v_link_id;
        v_record_id := v_link_id;
      end if;

      return v_record_id;

    when 'tenant' then
      if coalesce(trim(p_details->>'full_name'), '') = '' then
        raise exception 'Tenant full name is required';
      end if;

      insert into public.resident_master (
        full_name, father_name, aadhar_number, pan_number, email, mobile, alt_mobile
      )
      values (
        trim(p_details->>'full_name'),
        nullif(trim(p_details->>'father_name'), ''),
        nullif(trim(p_details->>'aadhar_number'), ''),
        nullif(upper(trim(p_details->>'pan_number')), ''),
        nullif(trim(p_details->>'email'), ''),
        nullif(trim(p_details->>'mobile'), ''),
        nullif(trim(p_details->>'alt_mobile'), '')
      )
      returning id into v_resident_id;

      insert into public.flat_residents (apartment_no, resident_id, occupancy_role, is_current)
      values (v_apt, v_resident_id, 'tenant', true)
      returning id into v_record_id;

      if coalesce(trim(p_details->>'family_members'), '') <> '' then
        update public.flats
        set family_members = trim(p_details->>'family_members')::int
        where apartment_no = v_apt;
      end if;

      return v_record_id;

    when 'lease' then
      if coalesce(trim(p_details->>'tenant_name'), '') = '' then
        raise exception 'Tenant name is required for lease';
      end if;
      if coalesce(trim(p_details->>'lease_start'), '') = '' then
        raise exception 'Lease start date is required';
      end if;
      if coalesce(trim(p_details->>'lease_end'), '') = '' then
        raise exception 'Lease end date is required';
      end if;

      insert into public.leases (
        apartment_no, tenant_name, lease_start, lease_end, status, notes, document_url
      )
      values (
        v_apt,
        trim(p_details->>'tenant_name'),
        trim(p_details->>'lease_start')::date,
        trim(p_details->>'lease_end')::date,
        coalesce(nullif(trim(p_details->>'status'), ''), 'active')::public.lease_status,
        nullif(trim(p_details->>'notes'), ''),
        nullif(trim(p_details->>'document_url'), '')
      )
      returning id into v_record_id;

      return v_record_id;

    when 'maid', 'servant' then
      if coalesce(trim(p_details->>'name'), '') = '' then raise exception 'Name is required'; end if;
      if coalesce(trim(p_details->>'aadhar_number'), '') = '' then raise exception 'Aadhar number is required'; end if;
      if coalesce(trim(p_details->>'card_number'), '') = '' then raise exception 'Card number is required'; end if;

      v_gender := null;
      if nullif(trim(p_details->>'gender'), '') in ('male', 'female', 'other') then
        v_gender := trim(p_details->>'gender')::public.staff_gender;
      end if;

      v_employment := 'part_time';
      if coalesce(trim(p_details->>'employment_type'), '') = 'full_time' then
        v_employment := 'full_time';
      end if;

      v_notes := nullif(trim(p_details->>'notes'), '');
      if p_category = 'servant' and coalesce(trim(p_details->>'role'), '') <> '' then
        v_notes := 'Role: ' || trim(p_details->>'role') || coalesce('; ' || v_notes, '');
      end if;

      insert into public.maids (
        apartment_no, name, age, gender, employment_type,
        aadhar_number, mobile, card_number, card_valid_from, employment_valid_till, notes
      )
      values (
        v_apt,
        trim(p_details->>'name'),
        nullif(trim(p_details->>'age'), '')::int,
        v_gender,
        v_employment,
        trim(p_details->>'aadhar_number'),
        nullif(trim(p_details->>'mobile'), ''),
        trim(p_details->>'card_number'),
        nullif(trim(p_details->>'card_valid_from'), '')::date,
        nullif(trim(p_details->>'employment_valid_till'), '')::date,
        v_notes
      )
      returning id into v_record_id;

      return v_record_id;

    when 'driver' then
      if coalesce(trim(p_details->>'driver_name'), '') = '' then
        raise exception 'Driver name is required';
      end if;

      insert into public.drivers (
        apartment_no, vehicle_no, driver_name, mobile,
        licence_number, licence_valid_from, licence_validity, aadhar_number, address, notes
      )
      values (
        v_apt,
        nullif(upper(trim(p_details->>'vehicle_no')), ''),
        trim(p_details->>'driver_name'),
        nullif(trim(p_details->>'mobile'), ''),
        nullif(trim(p_details->>'licence_number'), ''),
        nullif(trim(p_details->>'licence_valid_from'), '')::date,
        nullif(trim(p_details->>'licence_validity'), '')::date,
        nullif(trim(p_details->>'aadhar_number'), ''),
        nullif(trim(p_details->>'address'), ''),
        nullif(trim(p_details->>'notes'), '')
      )
      returning id into v_record_id;

      return v_record_id;

    when 'vehicle' then
      if coalesce(trim(p_details->>'vehicle_no'), '') = '' then
        raise exception 'Vehicle number is required';
      end if;

      v_linked := 'owner';
      if coalesce(trim(p_details->>'linked_to'), '') = 'tenant' then
        v_linked := 'tenant';
      end if;

      insert into public.vehicles (
        apartment_no, vehicle_no, make_model, colour, linked_to,
        rc_number, puc_id, puc_validity, parking_slot,
        driver_name, driver_licence
      )
      values (
        v_apt,
        upper(trim(p_details->>'vehicle_no')),
        nullif(trim(p_details->>'make_model'), ''),
        nullif(trim(p_details->>'colour'), ''),
        v_linked,
        nullif(trim(p_details->>'rc_number'), ''),
        nullif(trim(p_details->>'puc_id'), ''),
        nullif(trim(p_details->>'puc_validity'), '')::date,
        nullif(trim(p_details->>'parking_slot'), ''),
        nullif(trim(p_details->>'driver_name'), ''),
        nullif(trim(p_details->>'driver_licence'), '')
      )
      returning id into v_record_id;

      return v_record_id;
  end case;

  raise exception 'Unhandled category';
end;
$$;

revoke all on function public.submit_public_detail(uuid, text, text, text, text, jsonb) from public;
grant execute on function public.submit_public_detail(uuid, text, text, text, text, jsonb) to anon, authenticated;

-- ========== UPDATE existing public submission (Edit) ==========
drop function if exists public.update_public_detail(uuid, text, text, jsonb);

create or replace function public.update_public_detail(
  p_record_id uuid,
  p_category text,
  p_apartment_no text,
  p_details jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_apt text := upper(trim(coalesce(p_apartment_no, '')));
  v_resident_id uuid;
  v_notes text;
  v_gender public.staff_gender;
  v_employment public.employment_type;
  v_linked public.linked_to;
begin
  if p_record_id is null then raise exception 'Record id is required'; end if;
  if v_apt = '' then raise exception 'Apartment number is required'; end if;
  if p_category not in ('owner', 'tenant', 'lease', 'maid', 'driver', 'servant', 'vehicle') then
    raise exception 'Invalid category';
  end if;

  case p_category
    when 'owner' then
      if coalesce(trim(p_details->>'full_name'), '') = '' then
        raise exception 'Owner full name is required';
      end if;

      update public.flats set
        owner_name = trim(p_details->>'full_name'),
        owner_phone = nullif(trim(p_details->>'mobile'), ''),
        owner_email = nullif(trim(p_details->>'email'), ''),
        owner_aadhar = nullif(trim(p_details->>'aadhar_number'), ''),
        family_members = nullif(trim(p_details->>'family_members'), '')::int,
        occupancy_status = case
          when coalesce((p_details->>'is_resident')::boolean, true) then 'owner_occupied'
          else 'vacant'
        end,
        status = case
          when coalesce((p_details->>'is_resident')::boolean, true) then 'owner_occupied'
          else 'vacant'
        end
      where apartment_no = v_apt;

      select resident_id into v_resident_id
      from public.flat_residents
      where id = p_record_id;

      if v_resident_id is not null then
        update public.resident_master set
          full_name = trim(p_details->>'full_name'),
          father_name = nullif(trim(p_details->>'father_name'), ''),
          aadhar_number = nullif(trim(p_details->>'aadhar_number'), ''),
          pan_number = nullif(upper(trim(p_details->>'pan_number')), ''),
          email = nullif(trim(p_details->>'email'), ''),
          mobile = nullif(trim(p_details->>'mobile'), ''),
          alt_mobile = nullif(trim(p_details->>'alt_mobile'), '')
        where id = v_resident_id;

        update public.flat_residents set is_current = true where id = p_record_id;
        return p_record_id;
      end if;

      if exists (
        select 1 from public.flats
        where id = p_record_id and apartment_no = v_apt
      ) then
        return p_record_id;
      end if;

      raise exception 'Owner record not found';

    when 'tenant' then
      if coalesce(trim(p_details->>'full_name'), '') = '' then
        raise exception 'Tenant full name is required';
      end if;

      select resident_id into v_resident_id
      from public.flat_residents
      where id = p_record_id;

      if v_resident_id is null then
        raise exception 'Tenant record not found';
      end if;

      update public.resident_master set
        full_name = trim(p_details->>'full_name'),
        father_name = nullif(trim(p_details->>'father_name'), ''),
        aadhar_number = nullif(trim(p_details->>'aadhar_number'), ''),
        pan_number = nullif(upper(trim(p_details->>'pan_number')), ''),
        email = nullif(trim(p_details->>'email'), ''),
        mobile = nullif(trim(p_details->>'mobile'), ''),
        alt_mobile = nullif(trim(p_details->>'alt_mobile'), '')
      where id = v_resident_id;

      if coalesce(trim(p_details->>'family_members'), '') <> '' then
        update public.flats
        set family_members = trim(p_details->>'family_members')::int
        where apartment_no = v_apt;
      end if;

      return p_record_id;

    when 'lease' then
      if coalesce(trim(p_details->>'tenant_name'), '') = '' then
        raise exception 'Tenant name is required for lease';
      end if;
      if coalesce(trim(p_details->>'lease_start'), '') = '' then
        raise exception 'Lease start date is required';
      end if;
      if coalesce(trim(p_details->>'lease_end'), '') = '' then
        raise exception 'Lease end date is required';
      end if;

      update public.leases set
        apartment_no = v_apt,
        tenant_name = trim(p_details->>'tenant_name'),
        lease_start = trim(p_details->>'lease_start')::date,
        lease_end = trim(p_details->>'lease_end')::date,
        status = coalesce(nullif(trim(p_details->>'status'), ''), 'active')::public.lease_status,
        notes = nullif(trim(p_details->>'notes'), ''),
        document_url = nullif(trim(p_details->>'document_url'), '')
      where id = p_record_id;

      if not found then raise exception 'Lease record not found'; end if;
      return p_record_id;

    when 'maid', 'servant' then
      if coalesce(trim(p_details->>'name'), '') = '' then raise exception 'Name is required'; end if;
      if coalesce(trim(p_details->>'aadhar_number'), '') = '' then raise exception 'Aadhar number is required'; end if;
      if coalesce(trim(p_details->>'card_number'), '') = '' then raise exception 'Card number is required'; end if;

      v_gender := null;
      if nullif(trim(p_details->>'gender'), '') in ('male', 'female', 'other') then
        v_gender := trim(p_details->>'gender')::public.staff_gender;
      end if;

      v_employment := 'part_time';
      if coalesce(trim(p_details->>'employment_type'), '') = 'full_time' then
        v_employment := 'full_time';
      end if;

      v_notes := nullif(trim(p_details->>'notes'), '');
      if p_category = 'servant' and coalesce(trim(p_details->>'role'), '') <> '' then
        v_notes := 'Role: ' || trim(p_details->>'role') || coalesce('; ' || v_notes, '');
      end if;

      update public.maids set
        apartment_no = v_apt,
        name = trim(p_details->>'name'),
        age = nullif(trim(p_details->>'age'), '')::int,
        gender = v_gender,
        employment_type = v_employment,
        aadhar_number = trim(p_details->>'aadhar_number'),
        mobile = nullif(trim(p_details->>'mobile'), ''),
        card_number = trim(p_details->>'card_number'),
        card_valid_from = nullif(trim(p_details->>'card_valid_from'), '')::date,
        employment_valid_till = nullif(trim(p_details->>'employment_valid_till'), '')::date,
        notes = v_notes
      where id = p_record_id;

      if not found then raise exception 'Domestic help record not found'; end if;
      return p_record_id;

    when 'driver' then
      if coalesce(trim(p_details->>'driver_name'), '') = '' then
        raise exception 'Driver name is required';
      end if;

      update public.drivers set
        apartment_no = v_apt,
        vehicle_no = nullif(upper(trim(p_details->>'vehicle_no')), ''),
        driver_name = trim(p_details->>'driver_name'),
        mobile = nullif(trim(p_details->>'mobile'), ''),
        licence_number = nullif(trim(p_details->>'licence_number'), ''),
        licence_valid_from = nullif(trim(p_details->>'licence_valid_from'), '')::date,
        licence_validity = nullif(trim(p_details->>'licence_validity'), '')::date,
        aadhar_number = nullif(trim(p_details->>'aadhar_number'), ''),
        address = nullif(trim(p_details->>'address'), ''),
        notes = nullif(trim(p_details->>'notes'), '')
      where id = p_record_id;

      if not found then raise exception 'Driver record not found'; end if;
      return p_record_id;

    when 'vehicle' then
      if coalesce(trim(p_details->>'vehicle_no'), '') = '' then
        raise exception 'Vehicle number is required';
      end if;

      v_linked := 'owner';
      if coalesce(trim(p_details->>'linked_to'), '') = 'tenant' then
        v_linked := 'tenant';
      end if;

      update public.vehicles set
        apartment_no = v_apt,
        vehicle_no = upper(trim(p_details->>'vehicle_no')),
        make_model = nullif(trim(p_details->>'make_model'), ''),
        colour = nullif(trim(p_details->>'colour'), ''),
        linked_to = v_linked,
        rc_number = nullif(trim(p_details->>'rc_number'), ''),
        puc_id = nullif(trim(p_details->>'puc_id'), ''),
        puc_validity = nullif(trim(p_details->>'puc_validity'), '')::date,
        parking_slot = nullif(trim(p_details->>'parking_slot'), ''),
        driver_name = nullif(trim(p_details->>'driver_name'), ''),
        driver_licence = nullif(trim(p_details->>'driver_licence'), '')
      where id = p_record_id;

      if not found then raise exception 'Vehicle record not found'; end if;
      return p_record_id;
  end case;

  raise exception 'Unhandled category';
end;
$$;

revoke all on function public.update_public_detail(uuid, text, text, jsonb) from public;
grant execute on function public.update_public_detail(uuid, text, text, jsonb) to anon, authenticated;

-- Society flats: 12 per tower (3, 4, 5)
delete from public.flats
where apartment_no in (
  'AUG0030005', 'AUG0030006', 'AUG0030105', 'AUG0030106', 'AUG0030205', 'AUG0030206',
  'AUG0030305', 'AUG0030306', 'AUG0030405', 'AUG0030406', 'AUG0030505', 'AUG0030506',
  'AUG0040007', 'AUG0040008', 'AUG0040107', 'AUG0040108', 'AUG0040207', 'AUG0040208',
  'AUG0040307', 'AUG0040308', 'AUG0040407', 'AUG0040408', 'AUG0040507', 'AUG0040508',
  'AUG0050008', 'AUG0050009', 'AUG0050108', 'AUG0050109', 'AUG0050208', 'AUG0050209',
  'AUG0050308', 'AUG0050309', 'AUG0050408', 'AUG0050409', 'AUG0050508', 'AUG0050509'
);

insert into public.flats (apartment_no, tower, floor, status, occupancy_status)
values
  ('AUG030005', '3', '0', 'vacant', 'vacant'),
  ('AUG030006', '3', '0', 'vacant', 'vacant'),
  ('AUG030105', '3', '1', 'vacant', 'vacant'),
  ('AUG030106', '3', '1', 'vacant', 'vacant'),
  ('AUG030205', '3', '2', 'vacant', 'vacant'),
  ('AUG030206', '3', '2', 'vacant', 'vacant'),
  ('AUG030305', '3', '3', 'vacant', 'vacant'),
  ('AUG030306', '3', '3', 'vacant', 'vacant'),
  ('AUG030405', '3', '4', 'vacant', 'vacant'),
  ('AUG030406', '3', '4', 'vacant', 'vacant'),
  ('AUG030505', '3', '5', 'vacant', 'vacant'),
  ('AUG030506', '3', '5', 'vacant', 'vacant'),
  ('AUG040007', '4', '0', 'vacant', 'vacant'),
  ('AUG040008', '4', '0', 'vacant', 'vacant'),
  ('AUG040107', '4', '1', 'vacant', 'vacant'),
  ('AUG040108', '4', '1', 'vacant', 'vacant'),
  ('AUG040207', '4', '2', 'vacant', 'vacant'),
  ('AUG040208', '4', '2', 'vacant', 'vacant'),
  ('AUG040307', '4', '3', 'vacant', 'vacant'),
  ('AUG040308', '4', '3', 'vacant', 'vacant'),
  ('AUG040407', '4', '4', 'vacant', 'vacant'),
  ('AUG040408', '4', '4', 'vacant', 'vacant'),
  ('AUG040507', '4', '5', 'vacant', 'vacant'),
  ('AUG040508', '4', '5', 'vacant', 'vacant'),
  ('AUG050008', '5', '0', 'vacant', 'vacant'),
  ('AUG050009', '5', '0', 'vacant', 'vacant'),
  ('AUG050108', '5', '1', 'vacant', 'vacant'),
  ('AUG050109', '5', '1', 'vacant', 'vacant'),
  ('AUG050208', '5', '2', 'vacant', 'vacant'),
  ('AUG050209', '5', '2', 'vacant', 'vacant'),
  ('AUG050308', '5', '3', 'vacant', 'vacant'),
  ('AUG050309', '5', '3', 'vacant', 'vacant'),
  ('AUG050408', '5', '4', 'vacant', 'vacant'),
  ('AUG050409', '5', '4', 'vacant', 'vacant'),
  ('AUG050508', '5', '5', 'vacant', 'vacant'),
  ('AUG050509', '5', '5', 'vacant', 'vacant')
on conflict (apartment_no) do update set
  tower = excluded.tower,
  floor = excluded.floor;

notify pgrst, 'reload schema';
