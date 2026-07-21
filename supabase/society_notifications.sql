-- Public society notifications (login page + admin panel)
-- Supabase SQL Editor me ek baar chalao

create table if not exists public.society_notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  notification_type text not null default 'announcement'
    check (notification_type in ('meeting', 'announcement', 'general')),
  event_date timestamptz,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_society_notifications_published
  on public.society_notifications (is_published, event_date desc nulls last, created_at desc);

drop trigger if exists society_notifications_updated on public.society_notifications;
create trigger society_notifications_updated before update on public.society_notifications
  for each row execute procedure public.set_updated_at();

alter table public.society_notifications enable row level security;

drop policy if exists "society_notifications_public_read" on public.society_notifications;
create policy "society_notifications_public_read" on public.society_notifications
  for select using (is_published = true);

drop policy if exists "society_notifications_admin_all" on public.society_notifications;
create policy "society_notifications_admin_all" on public.society_notifications
  for all using (public.is_admin()) with check (public.is_admin());

-- Sample meeting notice (optional — delete if not needed)
insert into public.society_notifications (title, message, notification_type, event_date, is_published)
select
  'Society General Meeting',
  'All owners and tenants are invited to the monthly society meeting.',
  'meeting',
  now() + interval '7 days',
  true
where not exists (select 1 from public.society_notifications limit 1);
