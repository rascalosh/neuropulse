import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../utils/supabase/route-helpers';

export async function POST(req: Request) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => null);
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null;
  const blinkCount = typeof body?.blinkCount === 'number' ? body.blinkCount : 0;
  const rewardCount = typeof body?.rewardCount === 'number' ? body.rewardCount : 0;
  if (!sessionId) return NextResponse.json({ error: 'missing_session_id' }, { status: 400 });

  const { data, error } = await supabase.rpc('end_focus_session', {
    p_session_id: sessionId,
    p_blink_count: blinkCount,
    p_reward_count: rewardCount,
  });
  if (error) {
    return NextResponse.json({ error: 'end_session_failed', detail: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
