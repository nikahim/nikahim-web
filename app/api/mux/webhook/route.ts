// app/api/mux/webhook/route.ts
// Mux webhook handler - stream event'lerini işler

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Mux webhook imzasını doğrula
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Mux imza formatı: t=timestamp,v1=signature
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
  const v1Signature = parts.find(p => p.startsWith('v1='))?.slice(3);

  if (!timestamp || !v1Signature) return false;

  // İmzayı hesapla
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return v1Signature === expectedSignature;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('mux-signature');

    // Webhook secret varsa imzayı doğrula
    const webhookSecret = process.env.MUX_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(body, signature, webhookSecret);
      if (!isValid) {
        console.error('Invalid Mux webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const event = JSON.parse(body);
    const { type, data } = event;

    console.log(`Mux webhook: ${type}`, data?.id);

    switch (type) {
      // Live stream başladı
      case 'video.live_stream.active': {
        const streamId = data.id;
        
        await supabase
          .from('streams')
          .update({
            status: 'active',
            started_at: new Date().toISOString(),
          })
          .eq('mux_stream_id', streamId);

        // Event'i de canlı olarak işaretle
        const { data: stream } = await supabase
          .from('streams')
          .select('event_id')
          .eq('mux_stream_id', streamId)
          .single();

        if (stream) {
          await supabase
            .from('events')
            .update({ is_live: true })
            .eq('id', stream.event_id);
        }

        console.log(`Stream ${streamId} is now active`);
        break;
      }

      // Live stream idle oldu (durduruldu veya bağlantı kesildi)
      case 'video.live_stream.idle': {
        const streamId = data.id;
        
        // Stream'i bul
        const { data: stream } = await supabase
          .from('streams')
          .select('*')
          .eq('mux_stream_id', streamId)
          .single();

        if (stream) {
          // Süreyi hesapla
          let totalDuration = stream.total_duration_seconds || 0;
          if (stream.started_at) {
            const duration = Math.floor(
              (Date.now() - new Date(stream.started_at).getTime()) / 1000
            );
            totalDuration += duration;
          }

          await supabase
            .from('streams')
            .update({
              status: 'idle',
              total_duration_seconds: totalDuration,
            })
            .eq('mux_stream_id', streamId);

          // Event'i canlı değil olarak işaretle
          await supabase
            .from('events')
            .update({ is_live: false })
            .eq('id', stream.event_id);
        }

        console.log(`Stream ${streamId} is now idle`);
        break;
      }

      // Live stream disabled (tamamen kapatıldı)
      case 'video.live_stream.disabled': {
        const streamId = data.id;
        
        const { data: stream } = await supabase
          .from('streams')
          .select('*')
          .eq('mux_stream_id', streamId)
          .single();

        if (stream) {
          await supabase
            .from('streams')
            .update({
              status: 'ended',
              ended_at: new Date().toISOString(),
            })
            .eq('mux_stream_id', streamId);

          await supabase
            .from('events')
            .update({ is_live: false })
            .eq('id', stream.event_id);
        }

        console.log(`Stream ${streamId} is now disabled/ended`);
        break;
      }

      // Kayıt (asset) hazır
      case 'video.asset.ready': {
        const assetId = data.id;
        const playbackId = data.playback_ids?.[0]?.id;
        const liveStreamId = data.live_stream_id;
        const duration = data.duration;

        if (liveStreamId && playbackId) {
          // Stream'i bul ve asset bilgilerini kaydet
          const { data: stream } = await supabase
            .from('streams')
            .select('*')
            .eq('mux_stream_id', liveStreamId)
            .single();

          if (stream && !stream.is_test) {
            // 7 gün sonra silinecek
            const expiresAt = new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000
            ).toISOString();

            await supabase
              .from('streams')
              .update({
                mux_asset_id: assetId,
                mux_asset_playback_id: playbackId,
                recording_expires_at: expiresAt,
                total_duration_seconds: Math.floor(duration || 0),
              })
              .eq('id', stream.id);

            console.log(`Asset ${assetId} saved for stream ${stream.id}`);
          }
        }
        break;
      }

      // Asset silindi
      case 'video.asset.deleted': {
        const assetId = data.id;
        
        await supabase
          .from('streams')
          .update({
            mux_asset_id: null,
            mux_asset_playback_id: null,
          })
          .eq('mux_asset_id', assetId);

        console.log(`Asset ${assetId} deleted`);
        break;
      }

      default:
        console.log(`Unhandled Mux event: ${type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Mux webhook error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Mux webhook'ları GET yapmaz ama Vercel için gerekebilir
export async function GET() {
  return NextResponse.json({ status: 'Mux webhook endpoint active' });
}
