import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
  }

  try {
    const { data: stream } = await supabase
      .from('streams')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (!stream) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      stream: {
        id: stream.id,
        status: stream.status,
        isTest: stream.is_test,
      },
      playback: {
        liveStreamId: stream.live_stream_id,
        videoId: stream.video_id,
      },
    });
  } catch (error) {
    console.error('Stream status error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}