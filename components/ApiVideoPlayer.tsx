"use client";

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
  // Canlı yayın veya kayıt için farklı URL
  const embedUrl = isRecording && videoId 
    ? `https://embed.api.video/vod/${videoId}`
    : `https://embed.api.video/live/${liveStreamId}`;
  
  return (
    <div className={`relative w-full h-full ${className}`}>
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
      <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
        {isLive && (
          <span className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            CANLI
          </span>
        )}
        {isRecording && !isLive && (
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