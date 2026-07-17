-- ============================================================================
-- Seed data for the psychologist marketplace.
--
-- Migrates the 4 psychologists previously hardcoded in
-- apps/web/app/(app)/report/page.tsx (PSYCHOLOGISTS array + the
-- tr.report.psychologists i18n text) into real rows, plus two weeks of
-- availability slots (Mon/Wed/Fri, hourly 09:00-16:00 local) per
-- psychologist so the booking flow has real slots to show.
--
-- There is no psychologist-side login/dashboard yet, so availability is
-- seeded here rather than self-managed — run this again (safe: it clears
-- old un-booked seeded slots first) whenever you need to refresh the
-- calendar further into the future.
-- ============================================================================

insert into public.psychologists (id, display_name, photo_url, bio, specialties, price_per_session_idr, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'Dr. Sarah Widianti, M.Psi.',
   'https://i.pravatar.cc/150?u=sarah',
   'Pendekatan CBT & neurodivergent-affirming untuk klien dewasa dengan ADHD.',
   array['Klinis Dewasa', 'ADHD'], 150000, true),
  ('22222222-2222-2222-2222-222222222222', 'Dr. Budi Santoso, Sp.KJ',
   'https://i.pravatar.cc/150?u=budi',
   'Evaluasi menyeluruh, medikasi & terapi supportif.',
   array['Psikiater', 'Manajemen Medikasi'], 150000, true),
  ('33333333-3333-3333-3333-333333333333', 'Amanda Lestari, M.Psi.',
   'https://i.pravatar.cc/150?u=amanda',
   'Terapi EMDR & manajemen stres untuk trauma dan burnout.',
   array['Trauma', 'Burnout'], 150000, true),
  ('44444444-4444-4444-4444-444444444444', 'Reza Pratama, M.Psi.',
   'https://i.pravatar.cc/150?u=reza',
   'Pendekatan praktis & sistem manajemen waktu untuk produktivitas.',
   array['Coaching ADHD', 'Produktivitas'], 150000, true)
on conflict (id) do update set
  display_name = excluded.display_name,
  photo_url = excluded.photo_url,
  bio = excluded.bio,
  specialties = excluded.specialties,
  price_per_session_idr = excluded.price_per_session_idr,
  is_active = excluded.is_active;

-- Clear out any not-yet-booked seeded slots so re-running this doesn't
-- keep piling up duplicates, then generate fresh ones for the next 14 days.
delete from public.psychologist_availability
  where not is_booked
    and psychologist_id in (
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333',
      '44444444-4444-4444-4444-444444444444'
    );

insert into public.psychologist_availability (psychologist_id, start_at, end_at, is_booked)
select
  p.id,
  day_start + (hour_offset || ' hours')::interval,
  day_start + (hour_offset || ' hours')::interval + interval '1 hour',
  false
from public.psychologists p
cross join lateral (
  select date_trunc('day', now()) + (n || ' days')::interval as day_start
  from generate_series(1, 14) n
  where extract(isodow from date_trunc('day', now()) + (n || ' days')::interval) in (1, 3, 5) -- Mon/Wed/Fri
) days
cross join lateral (
  select unnest(array[9, 11, 13, 15]) as hour_offset -- 09:00, 11:00, 13:00, 15:00
) slots
where p.id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444'
);
