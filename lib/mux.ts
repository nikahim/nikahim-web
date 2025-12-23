// lib/mux.ts
// Mux API Client

import Mux from '@mux/mux-node';

// Mux client singleton
let muxClient: Mux | null = null;

export function getMuxClient(): Mux {
  if (!muxClient) {
    const tokenId = process.env.MUX_TOKEN_ID;
    const tokenSecret = process.env.MUX_TOKEN_SECRET;

    if (!tokenId || !tokenSecret) {
      throw new Error('MUX_TOKEN_ID ve MUX_TOKEN_SECRET environment variable\'ları gerekli!');
    }

    muxClient = new Mux({
      tokenId,
      tokenSecret,
    });
  }
  return muxClient;
}

// Stream oluşturma seçenekleri
export interface CreateStreamOptions {
  isTest?: boolean;  // Test yayını mı?
  eventId: string;   // Event ID
}

// Yeni live stream oluştur
export async function createLiveStream(options: CreateStreamOptions) {
  const mux = getMuxClient();
  
  const streamConfig: any = {
    playback_policy: ['public'],
    new_asset_settings: options.isTest 
      ? undefined  // Test için kayıt yok
      : {
          playback_policy: ['public'],
          // 7 gün sonra sil (604800 saniye = 7 gün)
          // Mux'ta bu "master_access" ile yapılıyor, asset'i manuel sileceğiz
        },
    // Düşük gecikme modu
    latency_mode: 'low',
    // Yeniden bağlanma izni (30 saniye)
    reconnect_window: 30,
  };

  // Test değilse kayıt et
  if (!options.isTest) {
    streamConfig.new_asset_settings = {
      playback_policy: ['public'],
    };
  }

  const liveStream = await mux.video.liveStreams.create(streamConfig);

  return {
    streamId: liveStream.id,
    playbackId: liveStream.playback_ids?.[0]?.id || null,
    streamKey: liveStream.stream_key,
    status: liveStream.status,
    rtmpUrl: 'rtmps://global-live.mux.com:443/app',
  };
}

// Stream durumunu al
export async function getLiveStreamStatus(streamId: string) {
  const mux = getMuxClient();
  
  try {
    const liveStream = await mux.video.liveStreams.retrieve(streamId);
    
    return {
      status: liveStream.status, // 'idle', 'active', 'disabled'
      playbackId: liveStream.playback_ids?.[0]?.id,
      activeAssetId: liveStream.active_asset_id,
      recentAssetIds: liveStream.recent_asset_ids,
    };
  } catch (error) {
    console.error('Mux stream status error:', error);
    return null;
  }
}

// Stream'i sil (test yayını bitince)
export async function deleteLiveStream(streamId: string) {
  const mux = getMuxClient();
  
  try {
    await mux.video.liveStreams.delete(streamId);
    return true;
  } catch (error) {
    console.error('Mux delete stream error:', error);
    return false;
  }
}

// Asset'i sil (7 gün sonra)
export async function deleteAsset(assetId: string) {
  const mux = getMuxClient();
  
  try {
    await mux.video.assets.delete(assetId);
    return true;
  } catch (error) {
    console.error('Mux delete asset error:', error);
    return false;
  }
}

// Asset bilgisi al
export async function getAsset(assetId: string) {
  const mux = getMuxClient();
  
  try {
    const asset = await mux.video.assets.retrieve(assetId);
    return {
      id: asset.id,
      status: asset.status,
      duration: asset.duration,
      playbackId: asset.playback_ids?.[0]?.id,
    };
  } catch (error) {
    console.error('Mux get asset error:', error);
    return null;
  }
}

// Playback URL oluştur
export function getPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

// Thumbnail URL oluştur
export function getThumbnailUrl(playbackId: string, options?: {
  width?: number;
  height?: number;
  time?: number;
}): string {
  const params = new URLSearchParams();
  if (options?.width) params.set('width', options.width.toString());
  if (options?.height) params.set('height', options.height.toString());
  if (options?.time) params.set('time', options.time.toString());
  
  const queryString = params.toString();
  return `https://image.mux.com/${playbackId}/thumbnail.jpg${queryString ? '?' + queryString : ''}`;
}
