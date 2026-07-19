-- Sample data only (2 rows) — prefer setup_all.sql for full install

insert into public.flats (apartment_no) values
  ('AUG0010201'),
  ('AUG0020104')
on conflict (apartment_no) do nothing;

insert into public.rfid_cards (sr_no, apartment_no, vehicle_no, rfid_no, holder_type, status) values
  (1, 'AUG0010201', 'DL9CBC8354', '14258616', 'vehicle', 'active'),
  (2, 'AUG0020104', 'UP14EY2926', '14258611', 'vehicle', 'active')
on conflict (rfid_no) do nothing;
