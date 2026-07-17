import { NextResponse } from 'next/server';
import { requireUser } from '../../../../utils/supabase/route-helpers';
import { TIER_LIMITS, TIER_MAX_FOCUS_MINUTES, TIER_FOCUS_DURATION_OPTIONS, type Tier, type GatedFeature } from '../../../../lib/tiers';

const FEATURES: GatedFeature[] = ['task_decompose', 'bionic_reading', 'clinical_report'];

export async function GET() {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tier, total_xp, free_session_used, tier_renews_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: 'profile_fetch_failed', detail: profileError.message }, { status: 500 });
  }

  const tier = (profile?.tier ?? 'free') as Tier;
  const periodYm = new Date().toISOString().slice(0, 7);

  const { data: counters } = await supabase
    .from('usage_counters')
    .select('feature, count')
    .eq('user_id', user.id)
    .eq('period_ym', periodYm);

  const usage = FEATURES.reduce((acc, feature) => {
    const used = counters?.find((c) => c.feature === feature)?.count ?? 0;
    const limit = TIER_LIMITS[tier][feature];
    acc[feature] = { used, limit, remaining: limit < 0 ? -1 : Math.max(0, limit - used) };
    return acc;
  }, {} as Record<GatedFeature, { used: number; limit: number; remaining: number }>);

  return NextResponse.json({
    tier,
    totalXp: profile?.total_xp ?? 0,
    freeSessionUsed: profile?.free_session_used ?? false,
    tierRenewsAt: profile?.tier_renews_at ?? null,
    usage,
    focusMirror: {
      maxMinutes: TIER_MAX_FOCUS_MINUTES[tier],
      durationOptions: TIER_FOCUS_DURATION_OPTIONS[tier],
    },
  });
}
