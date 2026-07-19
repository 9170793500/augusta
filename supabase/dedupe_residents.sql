-- Duplicate flat_residents hatao (ek flat + role + person = ek hi row)
-- Supabase SQL Editor me ek baar chalao

-- Owner: har flat par sirf ek active owner link rakho (sabse naya)
delete from public.flat_residents fr
where fr.occupancy_role = 'owner'
  and fr.id not in (
    select distinct on (apartment_no) id
    from public.flat_residents
    where occupancy_role = 'owner'
    order by apartment_no, created_at desc
  );

-- Tenant: same person + same flat duplicate hatao
delete from public.flat_residents fr
where fr.occupancy_role = 'tenant'
  and fr.id not in (
    select distinct on (apartment_no, resident_id) id
    from public.flat_residents
    where occupancy_role = 'tenant'
    order by apartment_no, resident_id, created_at desc
  );

-- Optional: unique constraint future duplicates roke
create unique index if not exists idx_flat_residents_one_owner_per_flat
  on public.flat_residents (apartment_no)
  where occupancy_role = 'owner';

create unique index if not exists idx_flat_residents_one_tenant_per_person_flat
  on public.flat_residents (apartment_no, resident_id)
  where occupancy_role = 'tenant';
