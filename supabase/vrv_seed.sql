-- Seed VRV AMC 2026-2027 (idempotent). Run after vrv_schema.sql + flats exist.

insert into public.vrv_amc_contracts (
  apartment_code, tower, flat_no, service, annual_amount, period_label, start_date, legacy_id
)
values
  ('AUG030005', 3, '5', 'VRV Service & Repair', 35000, '2026-2027', '2026-10-01', 'Tower3-5-2026'),
  ('AUG030006', 3, '6', 'VRV Service & Repair', 35000, '2026-2027', null, null),
  ('AUG030105', 3, '105', 'VRV Service & Repair', 35000, '2026-2027', null, null),
  ('AUG030205', 3, '205', 'VRV Service & Repair', 35000, '2026-2027', null, null),
  ('AUG030305', 3, '305', 'VRV Service & Repair', 35000, '2026-2027', null, null),
  ('AUG030405', 3, '405', 'VRV Service & Repair', 35000, '2026-2027', null, null),
  ('AUG040007', 4, '7', 'VRV Service & Repair', 35000, '2026-2027', null, null),
  ('AUG040008', 4, '8', 'VRV Service & Repair', 35000, '2026-2027', null, null),
  ('AUG040107', 4, '107', 'VRV Service & Repair', 35000, '2026-2027', null, null),
  ('AUG040207', 4, '207', 'VRV Service & Repair', 35000, '2026-2027', null, null),
  ('AUG040307', 4, '307', 'VRV Service & Repair', 35000, '2026-2027', null, null),
  ('AUG040407', 4, '407', 'VRV Service & Repair', 35000, '2026-2027', null, null),
  ('AUG050010', 5, '10', 'VRV Service & Repair', 35000, '2026-2027', null, null),
  ('AUG050110', 5, '110', 'VRV Service & Repair', 35000, '2026-2027', null, null),
  ('AUG050409', 5, '409', 'VRV Service & Repair', 35000, '2026-2027', null, null),
  ('AUG050510', 5, '510', 'VRV Service & Repair', 35000, '2026-2027', null, null)
on conflict (apartment_code, period_label) do update set
  tower = excluded.tower,
  flat_no = excluded.flat_no,
  annual_amount = excluded.annual_amount,
  start_date = coalesce(excluded.start_date, public.vrv_amc_contracts.start_date);

-- Owner prefill from flats
update public.vrv_amc_contracts c
set
  owner_name = coalesce(c.owner_name, f.owner_name),
  mobile = coalesce(c.mobile, f.owner_phone)
from public.flats f
where f.apartment_no = c.apartment_code
  and c.period_label = '2026-2027';

insert into public.vrv_payments (contract_id, payment_date, amount, mode, received_by)
select c.id, '2026-10-01'::date, 3000, 'Cheque'::public.vrv_payment_mode, 'AOA Office'
from public.vrv_amc_contracts c
where c.apartment_code = 'AUG030005' and c.period_label = '2026-2027'
  and not exists (
    select 1 from public.vrv_payments p
    where p.contract_id = c.id and p.amount = 3000 and p.payment_date = '2026-10-01'
  );
