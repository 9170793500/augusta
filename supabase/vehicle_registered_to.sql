-- Vehicle: whose name the car is registered under (owner vs spouse in the flat)
alter table public.vehicles add column if not exists registered_to text default 'owner';
alter table public.vehicles add column if not exists registered_to_name text;

notify pgrst, 'reload schema';
