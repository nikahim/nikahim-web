"use client";

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const API_VIDEO_KEY = 'qQ8VlRltY7bJQX3PEIM5VgbFRNgoAsE8nKwb97LNldv';

interface VideoRecorderProps {
  eventId: string;
  senderName: string;
  onSuccess: () => void;
  onClose: () => void;
  embedded?: boolean;
  // Demo örnek sayfasında gerçek upload yerine block mesajı göster
  onDemoBlock?: () => void;
}

type RecordingState = 'idle' | 'preview' | 'recording' | 'recorded' | 'uploading' | 'success' | 'error';

export default function VideoRecorder({ eventId, senderName, onSuccess, onClose, embedded, onDemoBlock }: VideoRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user'); // ön/arka kamera
  const [countdown, setCountdown] = useState(30);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const mimeTypeRef = useRef<string>('video/webm');

  // Kamera başlat (ön/arka)
  const startCamera = async (facing: 'user' | 'environment' = facingMode) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: 1280, height: 720 },
        audio: true
      });

      streamRef.current = stream;
      setState('preview');

      // State değiştikten sonra video element'e ata
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
      }, 100);

    } catch (err) {
      console.error('Kamera hatası:', err);
      setErrorMessage('Kamera erişimi reddedildi. Lütfen izin verin.');
      setState('error');
    }
  };

  // Ön/arka kamera değiştir (yalnızca kayıt öncesi önizlemede)
  const flipCamera = async () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: next, width: 1280, height: 720 },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(console.error); }
    } catch (err) {
      console.error('Kamera çevirme hatası:', err);
    }
  };

  // Kayıt başlat
  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    
    // Desteklenen mimeType bul
    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4';
        }
      }
    }
    
    mimeTypeRef.current = mimeType;
    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
      setRecordedBlob(blob);
      setState('recorded');
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000); // Her 1 saniyede chunk al
    setState('recording');
    setCountdown(30);

    // Geri sayım
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Kayıt durdur
  const stopRecording = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Tekrar kaydet
  const retake = () => {
    setRecordedBlob(null);
    setCountdown(30);
    setState('preview');
  };

  // Upload et
  const uploadVideo = async () => {
    if (!recordedBlob) return;
    if (onDemoBlock) { onDemoBlock(); return; }

    setState('uploading');
    setUploadProgress(0);

    try {
      // 0. API key'i access token'a çevir
      const authResponse = await fetch('https://ws.api.video/auth/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: API_VIDEO_KEY }),
      });

      if (!authResponse.ok) {
        throw new Error('API kimlik doğrulama başarısız');
      }

      const authData = await authResponse.json();
      const accessToken = authData.access_token;

      // 1. api.video'da video oluştur
      const createResponse = await fetch('https://ws.api.video/videos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Tebrik - ${senderName}`,
          tags: ['tebrik', eventId],
          metadata: [
            { key: 'type', value: 'tebrik' },
            { key: 'event_id', value: eventId },
            { key: 'sender_name', value: senderName },
          ],
        }),
      });

      if (!createResponse.ok) {
        throw new Error('Video oluşturulamadı');
      }

      const videoData = await createResponse.json();
      const videoId = videoData.videoId;

      setUploadProgress(20);

      // 2. Video dosyasını upload et
      const fileExt = mimeTypeRef.current.includes('mp4') ? 'mp4' : 'webm';
      const formData = new FormData();
      formData.append('file', recordedBlob, `tebrik.${fileExt}`);

      const uploadResponse = await fetch(`https://ws.api.video/videos/${videoId}/source`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Video yüklenemedi');
      }

      const uploadResult = await uploadResponse.json();

      setUploadProgress(80);

      // 3. Supabase'e kaydet
      const { error: dbError } = await supabase.from('video_messages').insert({
        event_id: eventId,
        sender_name: senderName,
        video_id: videoId,
        thumbnail_url: uploadResult.assets?.thumbnail || null,
        player_url: uploadResult.assets?.player || null,
        duration_seconds: 30 - countdown,
        status: 'ready',
      });

      if (dbError) {
        console.error('DB hatası:', dbError);
      }

      setUploadProgress(100);
      setState('success');

      // 3 saniye sonra kapat
      setTimeout(() => {
        cleanup();
        onSuccess();
      }, 3000);

    } catch (err) {
      console.error('Upload hatası:', err);
      setErrorMessage('Video yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
      setState('error');
    }
  };

  // Temizlik
  const cleanup = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (previewRef.current?.src) {
      URL.revokeObjectURL(previewRef.current.src);
    }
  };

  // Modal kapanırken temizle
  const handleClose = () => {
    cleanup();
    onClose();
  };

  // Component unmount olduğunda temizle
  useEffect(() => {
    return () => cleanup();
  }, []);

  // Kayıt bittikten sonra önizleme videoyu yükle
  useEffect(() => {
    if (state === 'recorded' && recordedBlob && previewRef.current) {
      previewRef.current.src = URL.createObjectURL(recordedBlob);
    }
  }, [state, recordedBlob]);

  // Stream hazır olduğunda video element'e ata
  useEffect(() => {
    if (state === 'preview' && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [state]);

  // İlk açıldığında kamerayı başlat
  useEffect(() => {
    startCamera();
  }, []);

  const content = (
        <div className={embedded ? '' : 'p-4'}>
          
          {/* Kamera başlatılıyor */}
          {state === 'idle' && (
            <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center">
              <div className="text-center text-white">
                <div className="text-4xl mb-4 animate-pulse">📹</div>
                <p>Kamera başlatılıyor...</p>
              </div>
            </div>
          )}

          {/* Kamera önizleme */}
          {(state === 'preview' || state === 'recording') && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                onLoadedMetadata={(e) => {
                  const video = e.target as HTMLVideoElement;
                  video.play().catch(console.error);
                }}
                className="w-full aspect-video bg-gray-900 rounded-xl object-cover"
                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
              />

              {/* Kamera çevir — sadece kayıt öncesi önizlemede (sağ üst) */}
              {state === 'preview' && (
                <button
                  onClick={flipCamera}
                  title="Kamerayı çevir"
                  className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90"
                  style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 4v5h-.582m0 0a8.001 8.001 0 00-15.356 2m15.356-2H15M4 20v-5h.581m0 0a8.003 8.003 0 0015.357-2M4.581 15H9" /></svg>
                </button>
              )}

              {/* Kayıt göstergesi — ana sayfa video badge ile aynı (rose blur) */}
              {state === 'recording' && (
                <div
                  className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{
                    background: 'rgba(200,104,110,0.55)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.30)',
                    boxShadow: '0 4px 14px rgba(160,80,90,0.30), inset 0 1px 0 rgba(255,255,255,0.25)',
                  }}
                >
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  <span className="text-[11px] font-bold text-white tracking-[0.4px]">{countdown}s</span>
                </div>
              )}

              {/* Geri sayım overlay */}
              {state === 'recording' && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <div className="bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                    Kayıt devam ediyor... {countdown} saniye kaldı
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Kayıt önizleme */}
          {state === 'recorded' && (
            <div className="relative">
              <video
                ref={previewRef}
                controls
                playsInline
                className="w-full aspect-video bg-gray-900 rounded-xl"
              />
            </div>
          )}

          {/* Yükleniyor */}
          {state === 'uploading' && (
            <div className="aspect-video bg-gray-100 rounded-xl flex flex-col items-center justify-center">
              <div className="text-4xl mb-4">☁️</div>
              <p className="text-gray-600 mb-4">Video gönderiliyor...</p>
              <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-gray-400 text-sm mt-2">%{uploadProgress}</p>
            </div>
          )}

          {/* Başarılı */}
          {state === 'success' && (
            <div className="aspect-video bg-green-50 rounded-xl flex flex-col items-center justify-center">
              <div className="text-6xl mb-4">🎉</div>
              <h4 className="text-xl font-bold text-green-600 mb-2">Tebriğiniz Gönderildi!</h4>
              <p className="text-gray-500">Çift video mesajınızı görecek.</p>
            </div>
          )}

          {/* Hata */}
          {state === 'error' && (
            <div className="aspect-video bg-red-50 rounded-xl flex flex-col items-center justify-center p-4">
              <div className="text-4xl mb-4">😔</div>
              <p className="text-red-600 text-center mb-4">{errorMessage}</p>
              <button
                onClick={() => { setState('idle'); startCamera(); }}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-xl"
              >
                Tekrar Dene
              </button>
            </div>
          )}

          {/* Buttons */}
          <div className={embedded ? 'mt-3' : 'mt-4 p-4 border-t bg-gray-50 -mx-4 -mb-4'}>
          {state === 'preview' && (
            <button
              onClick={startRecording}
              className={`w-full text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 ${embedded ? 'text-[12px]' : ''}`}
              style={{ background: 'linear-gradient(135deg, #D4757E, #C45560)' }}
            >
              <span className="w-2.5 h-2.5 bg-white rounded-full"></span>
              Kayda Başla (30 sn)
            </button>
          )}

          {state === 'recording' && (
            <button
              onClick={stopRecording}
              className={`w-full bg-gray-800 hover:bg-gray-900 text-white py-2.5 rounded-xl font-semibold ${embedded ? 'text-[12px]' : ''}`}
            >
              Kaydı Bitir
            </button>
          )}

          {state === 'recorded' && (
            <div className="flex gap-2">
              <button
                onClick={retake}
                className={`flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold ${embedded ? 'text-[12px]' : ''}`}
              >
                Tekrar Çek
              </button>
              <button
                onClick={uploadVideo}
                className={`flex-1 text-white py-2.5 rounded-xl font-semibold ${embedded ? 'text-[12px]' : ''}`}
                style={{ background: '#C96F78' }}
              >
                Gönder
              </button>
            </div>
          )}
          </div>
        </div>
  );

  if (embedded) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
      <div className="rounded-3xl max-w-lg w-full overflow-hidden relative" style={{ background: 'rgba(255,253,251,0.97)', boxShadow: '0 24px 70px rgba(63,44,39,0.16)', border: '1px solid rgba(60,45,41,0.07)' }}>

        {/* Close button */}
        <button onClick={handleClose} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgba(0,0,0,0.06)', color: '#999' }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* Header */}
        <div className="p-6 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,111,120,0.10)' }}>
              <svg className="w-[22px] h-[22px]" style={{ color: '#C96F78' }} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Video Tebrik</h3>
              <p className="text-xs text-gray-400">30 saniyelik video mesajınızı kaydedin</p>
            </div>
          </div>
        </div>

        {content}
      </div>
    </div>
  );
}