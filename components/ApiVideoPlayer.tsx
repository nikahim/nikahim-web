"use client";

import { useState, useEffect } from 'react';

interface ApiVideoPlayerProps {
  liveStreamId?: string;
  videoId?: string;
  isLive?: boolean;
  isRecording?: boolean;
  className?: string;
  overlayInfo?: {
    viewerCount?: number;
    isTest?: boolean;
  };
}

export default function ApiVideoPlayer({ 
  liveStreamId,
  videoId,
  isLive = false,
  isRecording = false,
  className = "",
  overlayInfo 
}: ApiVideoPlayerProps) {
  const [videoReady, setVideoReady] = useState(false);

  // Video hazır mı kontrol et
  useEffect(() => {
    if (!isRecording || !videoId) {
      setVideoReady(false);
      return;
    }

    const checkVideoStatus = async () => {
      try {
        const response = await fetch(`/api/video/status?videoId=${videoId}`);
        const data = await response.json();
        
        if (data.ready) {
          setVideoReady(true);
        }
      } catch (error) {
        console.error('Video status check error:', error);
      }
    };

    // Hemen kontrol et
    checkVideoStatus();

    // Her 2 saniyede bir kontrol et
    const interval = setInterval(checkVideoStatus, 2000);

    console.log('Video Debug:', { videoId, isRecording, videoReady, showLoading: isRecording && (!videoId || !videoReady) });
    
    return () => clearInterval(interval);
  }, [isRecording, videoId]);

  // Canlı yayın veya kayıt için URL
  const embedUrl = isRecording && videoId 
    ? `https://embed.api.video/vod/${videoId}`
    : `https://embed.api.video/live/${liveStreamId}`;
  
  // Video ID yoksa veya video hazır değilse "hazırlanıyor" göster
  const showLoading = isRecording && (!videoId || !videoReady);
  
  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Video işleniyorsa Türkçe mesaj göster */}
      {showLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <p className="text-white text-lg font-medium">Video Hazırlanıyor</p>
          <p className="text-gray-400 text-sm mt-2">Birkaç dakika içinde izlenebilir olacak...</p>
        </div>
      )}

      {!showLoading && (
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          allowFullScreen
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          className="absolute inset-0 w-full h-full"
        />
      )}
      
      {/* Overlay — sadece kayıt göstergesi.
          Canlı / Test / izleyici rozetleri sayfa navbar'ında (rose) gösteriliyor;
          burada tekrar etmemesi için kaldırıldı (üst üste binme sorunu). */}
      {isRecording && !showLoading && (
        <div className="absolute top-10 left-4 z-20">
          <span className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            ▶ KAYIT
          </span>
        </div>
      )}
    </div>
  );
}