import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Bu event mertbasar@hotmail.com (örnek/demo) hesabından mı oluşturuldu?
// Demo flag canli sayfada özel toast + isim atlatma akışını tetikler.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEMO_EMAIL = 'mertbasar@hotmail.com';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    if (!eventId) return NextResponse.json({ isDemo: false });

    const { data: ev } = await supabase
      .from('events')
      .select('user_id')
      .eq('id', eventId)
      .maybeSingle();
    if (!ev?.user_id) return NextResponse.json({ isDemo: false });

    const { data: u } = await supabase
      .from('users')
      .select('email')
      .eq('id', ev.user_id)
      .maybeSingle();

    return NextResponse.json({ isDemo: u?.email === DEMO_EMAIL });
  } catch {
    return NextResponse.json({ isDemo: false });
  }
}
