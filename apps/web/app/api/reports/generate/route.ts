import { NextResponse } from 'next/server';
import { requireUser } from '../../../../utils/supabase/route-helpers';
import { generateNakesReport } from '../../../../lib/gemini';
import { XP_REWARDS } from '../../../../lib/gamification';

export async function POST(req: Request) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data: usage, error: usageError } = await supabase.rpc('increment_usage_and_check_limit', {
    p_feature: 'clinical_report',
  });
  if (usageError) {
    return NextResponse.json({ error: 'usage_check_failed', detail: usageError.message }, { status: 500 });
  }
  if (!usage.allowed) {
    return NextResponse.json(
      { error: 'quota_exceeded', feature: 'clinical_report', tier: usage.tier, limit: usage.limit },
      { status: 402 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  try {
    const report = await generateNakesReport(body);

    const { data: xpTotal, error: xpError } = await supabase.rpc('award_xp', {
      p_amount: XP_REWARDS.REPORT_GENERATED,
      p_reason: 'Report generated 📊',
      p_source: 'clinical_report',
    });
    if (xpError) console.error('[api/reports/generate] award_xp failed:', xpError.message);

    return NextResponse.json({ report, xpAwarded: XP_REWARDS.REPORT_GENERATED, totalXp: xpTotal ?? null, remaining: usage.remaining });
  } catch (e) {
    return NextResponse.json({ error: 'report_failed', detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
