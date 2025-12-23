// app/api/stream/create/route.ts
// Yeni canlı yayın stream'i oluştur

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createLiveStream } from '@/lib/mux';

// Supabase admin client (server-side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, isTest = false } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId gerekli' },
        { status: 400 }
      );
    }

    // Event'i kontrol et
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, user_id, groom_full_name, bride_full_name')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event bulunamadı' },
        { status: 404 }
      );
    }

    // Mevcut stream var mı kontrol et
    const { data: existingStream } = await supabase
      .from('streams')
      .select('*')
      .eq('event_id', eventId)
      .single();

    // Eğer mevcut stream varsa ve aktifse, hata dön
    if (existingStream && existingStream.status === 'active') {
      return NextResponse.json(
        { error: 'Bu event için zaten aktif bir yayın var' },
        { status: 400 }
      );
    }

    // Mux'ta yeni stream oluştur
    const muxStream = await createLiveStream({
      eventId,
      isTest,
    });

    // Kayıt bitiş tarihi (7 gün sonra) - sadece normal yayınlar için
    const recordingExpiresAt = isTest 
      ? null 
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Veritabanına kaydet
    const streamData = {
      event_id: eventId,
      mux_stream_id: muxStream.streamId,
      mux_playback_id: muxStream.playbackId,
      stream_key: muxStream.streamKey,
      status: 'idle',
      is_test: isTest,
      recording_expires_at: recordingExpiresAt,
    };

    let savedStream;

    if (existingStream) {
      // Mevcut stream'i güncelle
      const { data, error } = await supabase
        .from('streams')
        .update(streamData)
        .eq('id', existingStream.id)
        .select()
        .single();

      if (error) throw error;
      savedStream = data;
    } else {
      // Yeni stream oluştur
      const { data, error } = await supabase
        .from('streams')
        .insert(streamData)
        .select()
        .single();

      if (error) throw error;
      savedStream = data;
    }

    return NextResponse.json({
      success: true,
      stream: {
        id: savedStream.id,
        playbackId: muxStream.playbackId,
        streamKey: muxStream.streamKey,
        rtmpUrl: muxStream.rtmpUrl,
        isTest,
        status: 'idle',
      },
      // İzleme URL'i
      watchUrl: `https://nikahim.com/canli/${event.id}`,
    });

  } catch (error: any) {
    console.error('Stream create error:', error);
    return NextResponse.json(
      { error: error.message || 'Stream oluşturulamadı' },
      { status: 500 }
    );
  }
}
