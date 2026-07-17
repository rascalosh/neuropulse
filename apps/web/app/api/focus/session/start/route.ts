import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../utils/supabase/route-helpers';

export async function POST(req: Request) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => null);
  const plannedDurationS = typeof body?.plannedDurationS === 'number' ? body.plannedDurationS : 25 * 60;

  const { data, error } = await supabase.rpc('start_focus_session', { p_planned_duration_s: plannedDurationS });
  if (error) {
    return NextResponse.json({ error: 'start_session_failed', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessionId: data });
}
