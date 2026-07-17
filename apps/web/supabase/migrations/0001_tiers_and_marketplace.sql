-- ============================================================================
-- NeuroPulse — tiers, usage limits, XP ledger, focus sessions,
-- psychologist marketplace & bookings.
--
-- Personal/behavioral data (tasks, RSD log, mood log, dopamine history)
-- stays in browser localStorage (see apps/web/lib/storage.ts) — this schema
-- only covers state that gates paid features or must be tamper-resistant,
-- so it can't be edited by the client directly. All writes to `profiles`,
-- `usage_counters`, `xp_ledger`, `focus_sessions` and `bookings` happen
-- through SECURITY DEFINER RPCs below, called with the user's own session
-- (anon key + JWT) — RLS blocks direct table writes from the client.
--
-- Run this file once in the Supabase SQL Editor (or via `supabase db push`)
-- against the project referenced by NEXT_PUBLIC_SUPABASE_URL.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  tier              text not null default 'free' check (tier in ('free','murah','standar','mahal')),
  tier_started_at   timestamptz not null default now(),
  tier_renews_at    timestamptz,
  free_session_used boolean not null default false,
  total_xp          integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.usage_counters (
  user_id    uuid not null references auth.users(id) on delete cascade,
  period_ym  text not null, -- 'YYYY-MM', new month = new row (no cron reset needed)
  feature    text not null check (feature in ('task_decompose', 'bionic_reading', 'clinical_report', 'psych_free_session_month')),
  count      integer not null default 0,
  primary key (user_id, period_ym, feature)
);

create table if not exists public.xp_ledger (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  amount     integer not null,
  reason     text not null,
  source     text not null, -- 'focus_session' | 'clinical_report' | 'booking' | ...
  created_at timestamptz not null default now()
);

create table if not exists public.focus_sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  started_at         timestamptz not null default now(),
  ended_at           timestamptz,
  last_heartbeat_at  timestamptz,
  planned_duration_s integer not null,
  actual_focused_s   integer not null default 0,
  distracted_s       integer not null default 0,
  blink_count        integer not null default 0,
  reward_count       integer not null default 0,
  xp_awarded         integer not null default 0,
  status             text not null default 'active' check (status in ('active','ended','abandoned'))
);

create table if not exists public.psychologists (
  id                     uuid primary key default gen_random_uuid(),
  display_name           text not null,
  photo_url              text,
  bio                    text,
  specialties            text[] not null default '{}',
  price_per_session_idr  integer not null default 150000,
  is_active              boolean not null default true,
  created_at             timestamptz not null default now()
);

create table if not exists public.psychologist_availability (
  id               uuid primary key default gen_random_uuid(),
  psychologist_id  uuid not null references public.psychologists(id) on delete cascade,
  start_at         timestamptz not null,
  end_at           timestamptz not null,
  is_booked        boolean not null default false
);

create table if not exists public.bookings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  psychologist_id  uuid not null references public.psychologists(id),
  availability_id  uuid not null unique references public.psychologist_availability(id),
  status           text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  is_free_session  boolean not null default false,
  price_idr        integer not null default 0,
  discount_pct     integer not null default 0,
  payment_status   text not null default 'pending' check (payment_status in ('pending','stub_paid','failed')),
  payment_ref      text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_focus_sessions_user on public.focus_sessions(user_id);
create index if not exists idx_availability_open on public.psychologist_availability(psychologist_id, start_at) where not is_booked;
create index if not exists idx_bookings_user on public.bookings(user_id);

-- ----------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up.
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- RLS — every table is owner-readable only; no table is directly writable
-- by the client. All mutation happens via the RPCs below.
-- ----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.usage_counters enable row level security;
alter table public.xp_ledger enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.psychologists enable row level security;
alter table public.psychologist_availability enable row level security;
alter table public.bookings enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);

create policy "usage_counters_select_own" on public.usage_counters
  for select using (auth.uid() = user_id);

create policy "xp_ledger_select_own" on public.xp_ledger
  for select using (auth.uid() = user_id);

create policy "focus_sessions_select_own" on public.focus_sessions
  for select using (auth.uid() = user_id);

create policy "psychologists_select_active" on public.psychologists
  for select using (is_active);

create policy "availability_select_authenticated" on public.psychologist_availability
  for select using (auth.role() = 'authenticated');

create policy "bookings_select_own" on public.bookings
  for select using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Tier limit / discount lookup helpers (single source of truth for the
-- numbers in the pricing page — keep in sync with apps/web/app/page.tsx).
-- -1 = unlimited.
-- ----------------------------------------------------------------------------

create or replace function public._tier_limit(p_tier text, p_feature text)
returns integer
language sql
immutable
as $$
  select case p_feature
    when 'task_decompose' then case p_tier
      when 'free' then 15 when 'murah' then 60 else -1 end
    when 'bionic_reading' then case p_tier
      when 'free' then 20 when 'murah' then 100 else -1 end
    when 'clinical_report' then case p_tier
      when 'free' then 1 when 'murah' then 2 when 'standar' then 4 else -1 end
    else 0
  end;
$$;

create or replace function public._tier_discount_pct(p_tier text)
returns integer
language sql
immutable
as $$
  select case p_tier
    when 'murah' then 10 when 'standar' then 25 when 'mahal' then 40 else 0
  end;
$$;

create or replace function public._tier_max_focus_minutes(p_tier text)
returns integer
language sql
immutable
as $$
  select case p_tier
    when 'free' then 25 when 'murah' then 45 when 'standar' then 90 else 120
  end;
$$;

-- ----------------------------------------------------------------------------
-- RPC: increment_usage_and_check_limit
-- Checks + increments a monthly per-feature usage counter against the
-- caller's tier limit in one transaction (so two concurrent requests can't
-- both slip past the limit).
-- ----------------------------------------------------------------------------

create or replace function public.increment_usage_and_check_limit(p_feature text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tier text;
  v_period text := to_char(now(), 'YYYY-MM');
  v_limit integer;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select tier into v_tier from public.profiles where user_id = v_uid for update;
  if v_tier is null then
    v_tier := 'free';
    insert into public.profiles (user_id) values (v_uid) on conflict (user_id) do nothing;
  end if;

  v_limit := public._tier_limit(v_tier, p_feature);

  insert into public.usage_counters (user_id, period_ym, feature, count)
    values (v_uid, v_period, p_feature, 0)
    on conflict (user_id, period_ym, feature) do nothing;

  select count into v_count
    from public.usage_counters
    where user_id = v_uid and period_ym = v_period and feature = p_feature
    for update;

  if v_limit >= 0 and v_count >= v_limit then
    return jsonb_build_object('allowed', false, 'remaining', 0, 'limit', v_limit, 'tier', v_tier);
  end if;

  update public.usage_counters set count = count + 1
    where user_id = v_uid and period_ym = v_period and feature = p_feature;

  return jsonb_build_object(
    'allowed', true,
    'remaining', case when v_limit < 0 then -1 else v_limit - v_count - 1 end,
    'limit', v_limit,
    'tier', v_tier
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- RPC: award_xp — append-only ledger + running total on profiles.
-- ----------------------------------------------------------------------------

create or replace function public.award_xp(p_amount integer, p_reason text, p_source text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_total integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.profiles (user_id) values (v_uid) on conflict (user_id) do nothing;

  insert into public.xp_ledger (user_id, amount, reason, source)
    values (v_uid, p_amount, p_reason, p_source);

  update public.profiles set total_xp = total_xp + p_amount, updated_at = now()
    where user_id = v_uid
    returning total_xp into v_total;

  return v_total;
end;
$$;

-- ----------------------------------------------------------------------------
-- RPC: Focus Mirror server-authoritative session clock.
-- Client pings heartbeat_focus_session every ~20s; the server derives
-- actual_focused_s / distracted_s from its OWN elapsed time between
-- heartbeats, never from a client-reported total, so a session can't be
-- faked by editing client state.
-- ----------------------------------------------------------------------------

create or replace function public.start_focus_session(p_planned_duration_s integer)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.focus_sessions (user_id, planned_duration_s, last_heartbeat_at)
    values (v_uid, p_planned_duration_s, now())
    returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.heartbeat_focus_session(p_session_id uuid, p_focused boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_last timestamptz;
  v_status text;
  v_elapsed integer;
begin
  select last_heartbeat_at, status into v_last, v_status
    from public.focus_sessions
    where id = p_session_id and user_id = v_uid
    for update;

  if v_status is null then
    raise exception 'session_not_found';
  end if;
  if v_status <> 'active' then
    return; -- session already finalized; ignore stray pings
  end if;

  -- Clamp to avoid runaway values if a heartbeat is missed for a long time
  -- (e.g. laptop sleep) — cap a single gap at 60s of credit.
  v_elapsed := least(60, greatest(0, extract(epoch from (now() - coalesce(v_last, now())))::integer));

  if p_focused then
    update public.focus_sessions
      set actual_focused_s = actual_focused_s + v_elapsed, last_heartbeat_at = now()
      where id = p_session_id;
  else
    update public.focus_sessions
      set distracted_s = distracted_s + v_elapsed, last_heartbeat_at = now()
      where id = p_session_id;
  end if;
end;
$$;

create or replace function public.end_focus_session(
  p_session_id uuid, p_blink_count integer default 0, p_reward_count integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_focused integer;
  v_distracted integer;
  v_status text;
  v_xp integer;
  v_total integer;
begin
  select actual_focused_s, distracted_s, status into v_focused, v_distracted, v_status
    from public.focus_sessions
    where id = p_session_id and user_id = v_uid
    for update;

  if v_status is null then
    raise exception 'session_not_found';
  end if;
  if v_status <> 'active' then
    -- Already ended (double-submit, e.g. tab close race) — return prior result idempotently.
    select xp_awarded into v_xp from public.focus_sessions where id = p_session_id;
    return jsonb_build_object('focusedSeconds', v_focused, 'distractedSeconds', v_distracted, 'xpAwarded', v_xp);
  end if;

  -- 10 XP per 5 real minutes of focus (floor).
  v_xp := floor(v_focused / 300.0) * 10;

  update public.focus_sessions
    set status = 'ended', ended_at = now(), xp_awarded = v_xp,
        blink_count = p_blink_count, reward_count = p_reward_count
    where id = p_session_id;

  if v_xp > 0 then
    perform public.award_xp(v_xp, 'Focus Mirror session', 'focus_session');
  end if;

  select total_xp into v_total from public.profiles where user_id = v_uid;

  return jsonb_build_object(
    'focusedSeconds', v_focused, 'distractedSeconds', v_distracted,
    'xpAwarded', v_xp, 'totalXp', v_total
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- RPC: book_psychologist_slot — locks the slot, computes free/discounted
-- price server-side (never trust a client-sent price), creates the booking.
-- First-ever psychologist session for a user is always free; on top of
-- that, 'mahal' tier gets one additional free session per calendar month.
-- ----------------------------------------------------------------------------

create or replace function public.book_psychologist_slot(p_availability_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_psych_id uuid;
  v_base_price integer;
  v_is_booked boolean;
  v_start timestamptz;
  v_tier text;
  v_free_used boolean;
  v_is_free boolean := false;
  v_discount integer := 0;
  v_price integer;
  v_period text := to_char(now(), 'YYYY-MM');
  v_monthly_free_count integer;
  v_booking_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select psychologist_id, is_booked, start_at into v_psych_id, v_is_booked, v_start
    from public.psychologist_availability
    where id = p_availability_id
    for update;

  if v_psych_id is null then
    raise exception 'slot_not_found';
  end if;
  if v_is_booked or v_start <= now() then
    raise exception 'slot_unavailable';
  end if;

  select price_per_session_idr into v_base_price from public.psychologists where id = v_psych_id;

  select tier, free_session_used into v_tier, v_free_used
    from public.profiles where user_id = v_uid for update;
  if v_tier is null then
    v_tier := 'free';
    insert into public.profiles (user_id) values (v_uid) on conflict (user_id) do nothing;
  end if;

  if not coalesce(v_free_used, false) then
    v_is_free := true;
  elsif v_tier = 'mahal' then
    insert into public.usage_counters (user_id, period_ym, feature, count)
      values (v_uid, v_period, 'psych_free_session_month', 0)
      on conflict (user_id, period_ym, feature) do nothing;
    select count into v_monthly_free_count from public.usage_counters
      where user_id = v_uid and period_ym = v_period and feature = 'psych_free_session_month'
      for update;
    if v_monthly_free_count = 0 then
      v_is_free := true;
      update public.usage_counters set count = count + 1
        where user_id = v_uid and period_ym = v_period and feature = 'psych_free_session_month';
    end if;
  end if;

  if v_is_free then
    v_price := 0;
  else
    v_discount := public._tier_discount_pct(v_tier);
    v_price := round(v_base_price * (100 - v_discount) / 100.0);
  end if;

  update public.psychologist_availability set is_booked = true where id = p_availability_id;

  insert into public.bookings (
    user_id, psychologist_id, availability_id, is_free_session, price_idr, discount_pct,
    status, payment_status
  ) values (
    v_uid, v_psych_id, p_availability_id, v_is_free, v_price, v_discount,
    case when v_is_free then 'confirmed' else 'pending' end,
    case when v_is_free then 'stub_paid' else 'pending' end
  ) returning id into v_booking_id;

  if v_is_free and not coalesce(v_free_used, false) then
    update public.profiles set free_session_used = true, updated_at = now() where user_id = v_uid;
  end if;

  return jsonb_build_object(
    'bookingId', v_booking_id, 'isFreeSession', v_is_free,
    'priceIdr', v_price, 'discountPct', v_discount,
    'status', case when v_is_free then 'confirmed' else 'pending' end
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- RPC: stub_checkout_booking / stub_checkout_tier — the ONLY two functions
-- that simulate a payment succeeding. Swapping in a real gateway (Midtrans)
-- later means changing what calls these, not their callers' contract.
-- ----------------------------------------------------------------------------

create or replace function public.stub_checkout_booking(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
begin
  select user_id into v_owner from public.bookings where id = p_booking_id for update;
  if v_owner is null or v_owner <> v_uid then
    raise exception 'booking_not_found';
  end if;

  update public.bookings
    set payment_status = 'stub_paid', status = 'confirmed', payment_ref = 'stub-' || gen_random_uuid()
    where id = p_booking_id;

  return jsonb_build_object('bookingId', p_booking_id, 'status', 'confirmed', 'paymentStatus', 'stub_paid');
end;
$$;

create or replace function public.stub_checkout_tier(p_new_tier text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_new_tier not in ('free','murah','standar','mahal') then
    raise exception 'invalid_tier';
  end if;

  insert into public.profiles (user_id) values (v_uid) on conflict (user_id) do nothing;

  update public.profiles
    set tier = p_new_tier, tier_started_at = now(), tier_renews_at = now() + interval '1 month', updated_at = now()
    where user_id = v_uid;

  return jsonb_build_object('tier', p_new_tier, 'renewsAt', now() + interval '1 month');
end;
$$;
