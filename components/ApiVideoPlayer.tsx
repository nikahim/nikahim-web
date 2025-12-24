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
  const [checking, setChecking] = useState(false);

  // Kayıt modunda video hazır mı kontrol et
  useEffect(() => {
    if (isRecording && videoId && !videoReady) {
      const checkVideo = async () => {
        setChecking(true);
        try {
          const response = await fetch(`https://embed.api.video/vod/${videoId}`);
          if (response.ok) {
            setVideoReady(true);
          }
        } catch {
          // Video henüz hazır değil
        }
        setChecking(false);
      };

      checkVideo();
      const interval = setInterval(checkVideo, 5000);
      return () => clearInterval(interval);
    }
  }, [isRecording, videoId, videoReady]);

  // Canlı yayın veya kayıt için URL
  const embedUrl = isRecording && videoId 
    ? `https://embed.api.video/vod/${videoId}`
    : `https://embed.api.video/live/${liveStreamId}`;
  
  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Video işleniyorsa Türkçe mesaj göster */}
      {isRecording && !videoReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <p className="text-white text-lg font-medium">Video Hazırlanıyor</p>
          <p className="text-gray-400 text-sm mt-2">Birkaç dakika içinde izlenebilir olacak...</p>
        </div>
      )}

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
      
      {/* Overlay bilgileri */}
      <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
        {isLive && (
          <span className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            CANLI
          </span>
        )}
        {isRecording && videoReady && (
          <span className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            ▶ KAYIT
          </span>
        )}
        {overlayInfo?.isTest && isLive && (
          <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            TEST
          </span>
        )}
        {overlayInfo?.viewerCount !== undefined && isLive && (
          <span className="bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            👥 {overlayInfo.viewerCount}
          </span>
        )}
      </div>
    </div>
  );
}