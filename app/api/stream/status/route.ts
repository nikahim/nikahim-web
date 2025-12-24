import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const API_VIDEO_KEY = 'NMThAQAWpVj5ltp4SYbGyFgJKVIrNQdVJ13WsID2JVh';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
  }

  try {
    // Supabase'den stream bilgisini al
    const { data: stream } = await supabase
      .from('streams')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (!stream) {
      return NextResponse.json({ exists: false });
    }

    // api.video'dan canlı yayın durumunu kontrol et
    let apiVideoStatus = null;
    if (stream.mux_playback_id) {
      try {
        const response = await fetch(
          `https://ws.api.video/live-streams/${stream.mux_playback_id}`,
          {
            headers: {
              'Authorization': `Bearer ${API_VIDEO_KEY}`,
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          apiVideoStatus = {
            status: data.broadcasting ? 'active' : 'idle',
            broadcasting: data.broadcasting,
          };
        }
      } catch (error) {
        console.error('api.video status error:', error);
      }
    }

    return NextResponse.json({
      exists: true,
      stream: {
        id: stream.id,
        status: stream.status,
        isTest: stream.is_test,
      },
      playback: {
        playbackId: stream.mux_playback_id,
      },
      apiVideoStatus,
    });
  } catch (error) {
    console.error('Stream status error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}