import { NextResponse } from 'next/server';
import { requireUser } from '../../../utils/supabase/route-helpers';
import { decomposeTasks } from '../../../lib/gemini';

export async function POST(req: Request) {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data: usage, error: usageError } = await supabase.rpc('increment_usage_and_check_limit', {
    p_feature: 'task_decompose',
  });
  if (usageError) {
    return NextResponse.json({ error: 'usage_check_failed', detail: usageError.message }, { status: 500 });
  }
  if (!usage.allowed) {
    return NextResponse.json(
      { error: 'quota_exceeded', feature: 'task_decompose', tier: usage.tier, limit: usage.limit },
      { status: 402 }
    );
  }

  const body = await req.json().catch(() => null);
  const taskTitle = typeof body?.taskTitle === 'string' ? body.taskTitle : '';
  const interests = Array.isArray(body?.interests) ? body.interests : [];
  const energyLevel = typeof body?.energyLevel === 'number' ? body.energyLevel : 3;
  const lang = body?.lang === 'en' ? 'en' : 'id';

  if (!taskTitle.trim()) {
    return NextResponse.json({ error: 'missing_task_title' }, { status: 400 });
  }

  try {
    const result = await decomposeTasks(taskTitle, interests, energyLevel, lang);
    return NextResponse.json({ ...result, remaining: usage.remaining });
  } catch (e) {
    return NextResponse.json({ error: 'decompose_failed', detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
