-- Run in Supabase SQL Editor IF you already created the OLD tables.
-- Converts: unit_no/floor → apartment_no | maid RFID → card_number

-- Flats
alter table public.flats rename column unit_no to apartment_no;
alter table public.flats drop column if exists floor;

-- RFID (vehicle only)
alter table public.rfid_cards rename column unit_no to apartment_no;
update public.rfid_cards set vehicle_no = coalesce(vehicle_no, '') where vehicle_no is null;
alter table public.rfid_cards alter column vehicle_no set not null;

-- Drivers
alter table public.drivers rename column unit_no to apartment_no;
alter table public.drivers drop column if exists rfid_no;

-- Maids: remove RFID, add card number, rename apartment
alter table public.maids rename column unit_no to apartment_no;
alter table public.maids add column if not exists card_number text;
update public.maids set card_number = coalesce(nullif(card_number, ''), rfid_no, 'PENDING') where card_number is null or card_number = '';
alter table public.maids alter column card_number set not null;
alter table public.maids drop column if exists rfid_no;
alter table public.maids drop column if exists rfid_validity;
