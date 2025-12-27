"use client";

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const API_VIDEO_KEY = 'qQ8VlRltY7bJQX3PEIM5VgbFRNgoAsE8nKwb97LNldv';

interface VideoRecorderProps {
  eventId: string;
  senderName: string;
  onSuccess: () => void;
  onClose: () => void;
}

type RecordingState = 'idle' | 'preview' | 'recording' | 'recorded' | 'uploading' | 'success' | 'error';

export default function VideoRecorder({ eventId, senderName, onSuccess, onClose }: VideoRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle');
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

  // Kamera başlat
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
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
      
      // Preview için URL oluştur
      if (previewRef.current) {
        previewRef.current.src = URL.createObjectURL(blob);
      }
      
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

    setState('uploading');
    setUploadProgress(0);

    try {
      // 1. api.video'da video oluştur
      const createResponse = await fetch('https://ws.api.video/videos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_VIDEO_KEY}`,
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
          'Authorization': `Bearer ${API_VIDEO_KEY}`,
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

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">🎥 Video Tebrik Gönder</h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          
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
                style={{ transform: 'scaleX(-1)' }}
              />
              
              {/* Kayıt göstergesi */}
              {state === 'recording' && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full">
                  <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
                  <span className="font-bold">{countdown}</span>
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

          {/* Gönderen bilgisi */}
          {state !== 'success' && state !== 'error' && state !== 'uploading' && (
            <div className="mt-4 bg-blue-50 rounded-xl p-3 flex items-center gap-3">
              <span className="text-2xl">👤</span>
              <div>
                <p className="text-sm text-blue-600">Gönderen</p>
                <p className="font-medium text-gray-900">{senderName}</p>
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="p-4 border-t bg-gray-50">
          {state === 'preview' && (
            <button
              onClick={startRecording}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <span className="w-3 h-3 bg-white rounded-full"></span>
              Kayda Başla (30 saniye)
            </button>
          )}

          {state === 'recording' && (
            <button
              onClick={stopRecording}
              className="w-full bg-gray-800 hover:bg-gray-900 text-white py-3 rounded-xl font-semibold"
            >
              ⏹️ Kaydı Bitir
            </button>
          )}

          {state === 'recorded' && (
            <div className="flex gap-3">
              <button
                onClick={retake}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-xl font-semibold"
              >
                🔄 Tekrar Çek
              </button>
              <button
                onClick={uploadVideo}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold"
              >
                💝 Çifte Gönder
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}