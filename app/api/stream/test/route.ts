// app/api/stream/test/route.ts
// Test yayını - 1 dakika, kayıt yok, bitince silinir

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createLiveStream, deleteLiveStream } from '@/lib/mux';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Test süresi (saniye)
const TEST_DURATION_SECONDS = 60; // 1 dakika

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId gerekli' },
        { status: 400 }
      );
    }

    // Event kontrolü
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, user_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event bulunamadı' },
        { status: 404 }
      );
    }

    // Aktif test yayını var mı?
    const { data: existingTest } = await supabase
      .from('streams')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_test', true)
      .eq('status', 'active')
      .single();

    if (existingTest) {
      return NextResponse.json(
        { error: 'Zaten aktif bir test yayını var' },
        { status: 400 }
      );
    }

    // Mux'ta test stream oluştur (kayıt yok)
    const muxStream = await createLiveStream({
      eventId,
      isTest: true,
    });

    // Veritabanına kaydet
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .insert({
        event_id: eventId,
        mux_stream_id: muxStream.streamId,
        mux_playback_id: muxStream.playbackId,
        stream_key: muxStream.streamKey,
        status: 'idle',
        is_test: true,
        recording_expires_at: null, // Test için kayıt yok
      })
      .select()
      .single();

    if (streamError) throw streamError;

    // 1 dakika sonra otomatik sil (background job)
    // Not: Bu Vercel'de edge function veya cron ile yapılmalı
    // Şimdilik client-side timer ile yapacağız

    return NextResponse.json({
      success: true,
      stream: {
        id: stream.id,
        playbackId: muxStream.playbackId,
        streamKey: muxStream.streamKey,
        rtmpUrl: muxStream.rtmpUrl,
        isTest: true,
        testDurationSeconds: TEST_DURATION_SECONDS,
        status: 'idle',
      },
      message: `Test yayını oluşturuldu. ${TEST_DURATION_SECONDS} saniye süreniz var.`,
    });

  } catch (error: any) {
    console.error('Test stream error:', error);
    return NextResponse.json(
      { error: error.message || 'Test yayını oluşturulamadı' },
      { status: 500 }
    );
  }
}

// Test yayınını sil
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const streamId = searchParams.get('streamId');

    if (!streamId) {
      return NextResponse.json(
        { error: 'streamId gerekli' },
        { status: 400 }
      );
    }

    // Stream'i bul
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .select('*')
      .eq('id', streamId)
      .eq('is_test', true)
      .single();

    if (streamError || !stream) {
      return NextResponse.json(
        { error: 'Test stream bulunamadı' },
        { status: 404 }
      );
    }

    // Mux'tan sil
    if (stream.mux_stream_id) {
      await deleteLiveStream(stream.mux_stream_id);
    }

    // Veritabanından sil
    await supabase
      .from('streams')
      .delete()
      .eq('id', streamId);

    return NextResponse.json({
      success: true,
      message: 'Test yayını silindi',
    });

  } catch (error: any) {
    console.error('Delete test stream error:', error);
    return NextResponse.json(
      { error: error.message || 'Test yayını silinemedi' },
      { status: 500 }
    );
  }
}
