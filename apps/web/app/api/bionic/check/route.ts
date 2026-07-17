import { NextResponse } from 'next/server';
import { requireUser } from '../../../../utils/supabase/route-helpers';

export async function POST() {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase.rpc('increment_usage_and_check_limit', {
    p_feature: 'bionic_reading',
  });
  if (error) {
    return NextResponse.json({ error: 'usage_check_failed', detail: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
