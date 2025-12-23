// components/MuxPlayer.tsx
// Mux HLS Video Player

'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface MuxPlayerProps {
  playbackId: string;
  isLive?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  showControls?: boolean;
  onError?: (error: string) => void;
  onPlaying?: () => void;
  onEnded?: () => void;
  className?: string;
  // Overlay bilgileri
  overlayInfo?: {
    remainingMinutes?: number;
    isTest?: boolean;
    viewerCount?: number;
  };
}

export default function MuxPlayer({
  playbackId,
  isLive = false,
  autoplay = true,
  muted = false,
  showControls = true,
  onError,
  onPlaying,
  onEnded,
  className = '',
  overlayInfo,
}: MuxPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hlsUrl = `https://stream.mux.com/${playbackId}.m3u8`;
  const posterUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackId) return;

    // HLS.js destekleniyorsa
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: isLive, // Canlı için düşük gecikme
        liveDurationInfinity: isLive,
        // Canlı yayın için ayarlar
        ...(isLive && {
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
          liveBackBufferLength: 0,
        }),
      });

      hlsRef.current = hls;

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (autoplay) {
          video.play().catch(() => {
            // Autoplay engellendi, muted dene
            video.muted = true;
            video.play().catch(() => {});
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError('Ağ hatası. Yeniden bağlanılıyor...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError('Medya hatası. Kurtarılıyor...');
              hls.recoverMediaError();
              break;
            default:
              setError('Video yüklenemedi');
              onError?.('Video yüklenemedi');
              break;
          }
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } 
    // Safari için native HLS
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      setIsLoading(false);
    } 
    else {
      setError('Tarayıcınız video oynatmayı desteklemiyor');
    }
  }, [playbackId, isLive, autoplay]);

  const handlePlay = () => {
    setIsPlaying(true);
    setError(null);
    onPlaying?.();
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    onEnded?.();
  };

  const handleError = () => {
    setError('Video oynatılamadı');
    setIsLoading(false);
  };

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
          <div className="text-center text-white p-4">
            <p className="text-red-400 mb-2">⚠️ {error}</p>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                if (hlsRef.current) {
                  hlsRef.current.startLoad();
                }
              }}
              className="px-4 py-2 bg-white/20 rounded hover:bg-white/30"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      )}

      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={posterUrl}
        controls={showControls}
        muted={muted}
        playsInline
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
        onLoadedData={() => setIsLoading(false)}
      />

      {/* Overlays */}
      <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-start pointer-events-none">
        {/* Canlı Badge */}
        {isLive && isPlaying && (
          <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            CANLI
          </div>
        )}

        {/* Test Badge */}
        {overlayInfo?.isTest && (
          <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-semibold">
            🧪 TEST YAYINI
          </div>
        )}

        {/* İzleyici Sayısı */}
        {overlayInfo?.viewerCount !== undefined && (
          <div className="bg-black/60 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
            👁️ {overlayInfo.viewerCount}
          </div>
        )}
      </div>

      {/* Kalan Süre */}
      {overlayInfo?.remainingMinutes !== undefined && (
        <div className="absolute bottom-16 right-3 bg-black/60 text-white px-3 py-1 rounded text-sm">
          ⏱️ Kalan: {overlayInfo.remainingMinutes} dk
        </div>
      )}
    </div>
  );
}

// Basit poster gösterimi (yayın yokken)
export function StreamPoster({
  playbackId,
  message = 'Yayın başlamadı',
  className = '',
}: {
  playbackId?: string;
  message?: string;
  className?: string;
}) {
  const posterUrl = playbackId
    ? `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640`
    : '/placeholder-stream.jpg';

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      <img
        src={posterUrl}
        alt="Stream poster"
        className="w-full h-full object-cover opacity-50"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-white/30 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <p className="text-lg font-medium">{message}</p>
      </div>
    </div>
  );
}
