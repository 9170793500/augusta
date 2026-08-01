-- Society flats seed (36 flats: 12 per tower)
-- Re-run safely — removes old wrong-format rows first, then inserts correct codes.

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
