// app/api/stream/status/route.ts
// Stream durumunu sorgula

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getLiveStreamStatus, getPlaybackUrl, getThumbnailUrl } from '@/lib/mux';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const streamId = searchParams.get('streamId');

    if (!eventId && !streamId) {
      return NextResponse.json(
        { error: 'eventId veya streamId gerekli' },
        { status: 400 }
      );
    }

    // Stream'i bul
    let query = supabase.from('streams').select('*');
    
    if (streamId) {
      query = query.eq('id', streamId);
    } else {
      query = query.eq('event_id', eventId);
    }

    const { data: stream, error } = await query.single();

    if (error || !stream) {
      return NextResponse.json({
        exists: false,
        status: 'no_stream',
        message: 'Bu event için stream bulunamadı',
      });
    }

    // Mux'tan güncel durumu al
    let muxStatus = null;
    if (stream.mux_stream_id) {
      muxStatus = await getLiveStreamStatus(stream.mux_stream_id);
    }

    // Durumu güncelle (Mux ile senkronize)
    if (muxStatus && muxStatus.status !== stream.status) {
      const newStatus = muxStatus.status === 'active' ? 'active' : 
                        muxStatus.status === 'idle' ? 'idle' : stream.status;
      
      await supabase
        .from('streams')
        .update({ 
          status: newStatus,
          ...(newStatus === 'active' && !stream.started_at ? { started_at: new Date().toISOString() } : {}),
        })
        .eq('id', stream.id);
      
      stream.status = newStatus;
    }

    // Response
    const response: any = {
      exists: true,
      stream: {
        id: stream.id,
        eventId: stream.event_id,
        status: stream.status,
        isTest: stream.is_test,
        startedAt: stream.started_at,
        endedAt: stream.ended_at,
        totalDurationSeconds: stream.total_duration_seconds,
      },
    };

    // Playback bilgileri (izleyiciler için)
    if (stream.mux_playback_id) {
      response.playback = {
        playbackId: stream.mux_playback_id,
        hlsUrl: getPlaybackUrl(stream.mux_playback_id),
        thumbnailUrl: getThumbnailUrl(stream.mux_playback_id),
      };
    }

    // Kayıt bilgileri (yayın bittiyse)
    if (stream.mux_asset_playback_id && stream.status === 'ended') {
      response.recording = {
        playbackId: stream.mux_asset_playback_id,
        hlsUrl: getPlaybackUrl(stream.mux_asset_playback_id),
        thumbnailUrl: getThumbnailUrl(stream.mux_asset_playback_id),
        expiresAt: stream.recording_expires_at,
      };
    }

    // Mux durumu (debug için)
    if (muxStatus) {
      response.muxStatus = muxStatus;
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Stream status error:', error);
    return NextResponse.json(
      { error: error.message || 'Durum alınamadı' },
      { status: 500 }
    );
  }
}
