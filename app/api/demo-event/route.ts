import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// "Örnek Canlı Yayın sayfası incele" butonu için — mertbasar@hotmail.com
// hesabının en son oluşturduğu nikahın event_link'ini döner.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEMO_EMAIL = 'mertbasar@hotmail.com';

export async function GET() {
  try {
    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('email', DEMO_EMAIL)
      .maybeSingle();

    if (!userRow) {
      return NextResponse.json({ error: 'demo_user_not_found' }, { status: 404 });
    }

    const { data: ev } = await supabase
      .from('events')
      .select('event_link')
      .eq('user_id', userRow.id)
      .not('event_link', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!ev?.event_link) {
      return NextResponse.json({ error: 'no_event' }, { status: 404 });
    }

    return NextResponse.json({ event_link: ev.event_link });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', detail: e?.message }, { status: 500 });
  }
}
