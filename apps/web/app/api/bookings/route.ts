import { NextResponse } from 'next/server';
import { requireUser } from '../../../utils/supabase/route-helpers';

export async function POST(req: Request) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => null);
  const availabilityId = typeof body?.availabilityId === 'string' ? body.availabilityId : null;
  if (!availabilityId) return NextResponse.json({ error: 'missing_availability_id' }, { status: 400 });

  const { data, error } = await supabase.rpc('book_psychologist_slot', { p_availability_id: availabilityId });
  if (error) {
    const status = error.message.includes('slot_unavailable') || error.message.includes('slot_not_found') ? 409 : 500;
    return NextResponse.json({ error: 'booking_failed', detail: error.message }, { status });
  }

  return NextResponse.json(data);
}

export async function GET() {
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, status, is_free_session, price_idr, discount_pct, payment_status, created_at,
      psychologist:psychologists ( id, display_name, photo_url ),
      slot:psychologist_availability ( start_at, end_at )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'fetch_failed', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ bookings: data ?? [] });
}
