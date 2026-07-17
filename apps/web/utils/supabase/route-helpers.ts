import { NextResponse } from 'next/server';
import { createClient } from './server';

// Shared by every apps/web/app/api/**/route.ts handler — middleware.ts
// deliberately skips /api (see utils/supabase/middleware.ts), so each
// route authenticates itself.
export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { supabase, user: null, unauthorized: NextResponse.json({ error: 'not_authenticated' }, { status: 401 }) } as const;
  }
  return { supabase, user: data.user, unauthorized: null } as const;
}
