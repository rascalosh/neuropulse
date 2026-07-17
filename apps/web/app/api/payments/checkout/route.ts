import { NextResponse } from 'next/server';
import { requireUser } from '../../../../utils/supabase/route-helpers';

// The ONLY place a payment "succeeds" right now — instant mock. Swapping in
// a real gateway (Midtrans, for the ID market) later means changing what's
// inside this handler, not any of its callers (tasks/report/focus-mirror/
// pricing pages all just POST here and read back the JSON result).
export async function POST(req: Request) {
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => null);

  if (typeof body?.bookingId === 'string') {
    const { data, error } = await supabase.rpc('stub_checkout_booking', { p_booking_id: body.bookingId });
    if (error) return NextResponse.json({ error: 'checkout_failed', detail: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (typeof body?.tier === 'string') {
    const { data, error } = await supabase.rpc('stub_checkout_tier', { p_new_tier: body.tier });
    if (error) return NextResponse.json({ error: 'checkout_failed', detail: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: 'missing_booking_id_or_tier' }, { status: 400 });
}
