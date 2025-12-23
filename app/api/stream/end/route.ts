// app/api/stream/end/route.ts
// Stream'i sonlandır

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deleteLiveStream } from '@/lib/mux';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { streamId, eventId } = body;

    if (!streamId && !eventId) {
      return NextResponse.json(
        { error: 'streamId veya eventId gerekli' },
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
      return NextResponse.json(
        { error: 'Stream bulunamadı' },
        { status: 404 }
      );
    }

    // Toplam süreyi hesapla
    let totalDuration = stream.total_duration_seconds || 0;
    if (stream.started_at && stream.status === 'active') {
      const sessionDuration = Math.floor(
        (Date.now() - new Date(stream.started_at).getTime()) / 1000
      );
      totalDuration += sessionDuration;
    }

    // Test yayınıysa Mux'tan tamamen sil
    if (stream.is_test && stream.mux_stream_id) {
      await deleteLiveStream(stream.mux_stream_id);
      
      // Veritabanından da sil
      await supabase
        .from('streams')
        .delete()
        .eq('id', stream.id);

      return NextResponse.json({
        success: true,
        message: 'Test yayını silindi',
        isTest: true,
      });
    }

    // Normal yayını sonlandır (kayıt kalacak)
    await supabase
      .from('streams')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        total_duration_seconds: totalDuration,
      })
      .eq('id', stream.id);

    // Event'i güncelle
    await supabase
      .from('events')
      .update({ is_live: false })
      .eq('id', stream.event_id);

    return NextResponse.json({
      success: true,
      message: 'Yayın sonlandırıldı',
      totalDurationSeconds: totalDuration,
      totalDurationFormatted: formatDuration(totalDuration),
      recordingExpiresAt: stream.recording_expires_at,
    });

  } catch (error: any) {
    console.error('End stream error:', error);
    return NextResponse.json(
      { error: error.message || 'Yayın sonlandırılamadı' },
      { status: 500 }
    );
  }
}

// Süreyi formatla
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}s ${minutes}dk ${secs}sn`;
  } else if (minutes > 0) {
    return `${minutes}dk ${secs}sn`;
  }
  return `${secs}sn`;
}
