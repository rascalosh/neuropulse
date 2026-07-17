import { NextResponse } from 'next/server';
import { requireUser } from '../../../../utils/supabase/route-helpers';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data: psychologist, error } = await supabase
    .from('psychologists')
    .select('id, display_name, photo_url, bio, specialties, price_per_session_idr')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'fetch_failed', detail: error.message }, { status: 500 });
  }
  if (!psychologist) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const { data: availability } = await supabase
    .from('psychologist_availability')
    .select('id, start_at, end_at')
    .eq('psychologist_id', id)
    .eq('is_booked', false)
    .gt('start_at', new Date().toISOString())
    .order('start_at')
    .limit(50);

  return NextResponse.json({ psychologist, availability: availability ?? [] });
}
