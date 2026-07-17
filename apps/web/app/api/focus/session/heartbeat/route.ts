import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../utils/supabase/route-helpers';

export async function POST(req: Request) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => null);
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null;
  const focused = Boolean(body?.focused);
  if (!sessionId) return NextResponse.json({ error: 'missing_session_id' }, { status: 400 });

  const { error } = await supabase.rpc('heartbeat_focus_session', {
    p_session_id: sessionId,
    p_focused: focused,
  });
  if (error) {
    return NextResponse.json({ error: 'heartbeat_failed', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
