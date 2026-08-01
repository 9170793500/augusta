-- Rename security_staff.rfid_no → designation (FMG / cleaner / guard post, not vehicle RFID)
alter table public.security_staff rename column rfid_no to designation;

notify pgrst, 'reload schema';
