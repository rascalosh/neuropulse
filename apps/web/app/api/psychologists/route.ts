import { NextResponse } from 'next/server';
import { requireUser } from '../../../utils/supabase/route-helpers';

export async function GET() {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from('psychologists')
    .select('id, display_name, photo_url, bio, specialties, price_per_session_idr')
    .eq('is_active', true)
    .order('display_name');

  if (error) {
    return NextResponse.json({ error: 'fetch_failed', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ psychologists: data ?? [] });
}
