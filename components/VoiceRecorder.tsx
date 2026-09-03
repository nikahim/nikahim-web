"use client";

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface VoiceRecorderProps {
  eventId: string;
  senderName: string;
  onSuccess: () => void;
  onClose: () => void;
  embedded?: boolean;
  // Demo örnek sayfasında gerçek upload yerine block mesajı göster
  onDemoBlock?: () => void;
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading' | 'success' | 'error';

export default function VoiceRecorder({ eventId, senderName, onSuccess, onClose, embedded, onDemoBlock }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [maxDuration] = useState(60);
  const [errorMessage, setErrorMessage] = useState('');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      chunksRef.current = [];
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = URL.createObjectURL(blob);
        setState('recorded');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(500);
      setState('recording');
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= maxDuration - 1) {
            stopRecording();
            return maxDuration;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setErrorMessage('Mikrofon erişimi reddedildi. Lütfen izin verin.');
      setState('error');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const retake = () => {
    setRecordedBlob(null);
    setDuration(0);
    setIsPlaying(false);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setState('idle');
  };

  const togglePlayback = () => {
    if (!audioUrlRef.current) return;
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const audio = new Audio(audioUrlRef.current);
      audio.onended = () => setIsPlaying(false);
      audio.play();
      audioRef.current = audio;
      setIsPlaying(true);
    }
  };

  const uploadVoice = async () => {
    if (!recordedBlob) return;
    if (onDemoBlock) { onDemoBlock(); return; }
    setState('uploading');

    try {
      // Defansif: eventId/senderName eksikse net hata
      if (!eventId) throw new Error('eventId yok — sayfa düzgün yüklenmemiş olabilir');
      const safeName = (senderName || 'Misafir').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${eventId}/${Date.now()}_${safeName}.webm`;
      console.log('[VoiceRecorder] uploading', { fileName, blobSize: recordedBlob.size, type: recordedBlob.type });

      const { error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(fileName, recordedBlob, { contentType: recordedBlob.type || 'audio/webm' });

      if (uploadError) {
        console.error('[VoiceRecorder] storage upload error:', uploadError);
        throw new Error(`Storage: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('voice_messages').insert({
        event_id: eventId,
        sender_name: senderName || 'Misafir',
        audio_url: urlData.publicUrl,
        duration_seconds: duration,
        status: 'ready',
      });

      if (dbError) {
        console.error('[VoiceRecorder] DB insert error:', dbError);
        throw new Error(`DB: ${dbError.message}`);
      }

      setState('success');
      setTimeout(() => {
        cleanup();
        onSuccess();
      }, 2000);
    } catch (err: any) {
      console.error('[VoiceRecorder] upload exception:', err);
      const detail = err?.message || String(err);
      setErrorMessage(`Hata: ${detail}`);
      setState('error');
    }
  };

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioRef.current) audioRef.current.pause();
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const content = (
    <div className={embedded ? '' : 'p-5'}>
      {/* Idle - başlat */}
      {state === 'idle' && (
        <div className="text-center py-4">
          <button onClick={startRecording} className="w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all hover:scale-110 active:scale-95" style={{ background: '#C96F78', boxShadow: '0 6px 24px rgba(201,111,120,0.35)' }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </button>
          <p className={`mt-3 ${embedded ? 'text-white/40 text-[11px]' : 'text-gray-400 text-xs'}`}>Kayda başlamak için mikrofona dokunun</p>
        </div>
      )}

      {/* Recording */}
      {state === 'recording' && (
        <div className="text-center py-4">
          <div className="relative w-20 h-20 mx-auto mb-3">
            <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: '#ef4444' }} />
            <button onClick={stopRecording} className="relative w-20 h-20 rounded-full flex items-center justify-center transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 6px 24px rgba(239,68,68,0.35)' }}>
              <div className="w-6 h-6 bg-white rounded-sm" />
            </button>
          </div>
          <div className={`text-lg font-bold ${embedded ? 'text-white' : 'text-gray-900'}`}>{formatTime(duration)}</div>
          <p className={`text-xs mt-1 ${embedded ? 'text-white/40' : 'text-gray-400'}`}>Kayıt devam ediyor... (maks {maxDuration}sn)</p>
          {/* Waveform animation */}
          <div className="flex items-center justify-center gap-1 mt-3 h-8">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="w-1 rounded-full" style={{
                background: embedded ? 'rgba(201,111,120,0.6)' : '#C96F78',
                height: `${Math.random() * 24 + 8}px`,
                animation: `waveBar 0.5s ease-in-out ${i * 0.05}s infinite alternate`,
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Recorded - preview */}
      {state === 'recorded' && (
        <div className="py-3">
          <div className={`flex items-center gap-3 rounded-xl p-3 ${embedded ? '' : ''}`} style={{ background: embedded ? 'rgba(255,255,255,0.06)' : 'rgba(201,111,120,0.06)', border: `1px solid ${embedded ? 'rgba(255,255,255,0.08)' : 'rgba(201,111,120,0.12)'}` }}>
            <button onClick={togglePlayback} className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center transition-all hover:scale-110" style={{ background: '#C96F78' }}>
              {isPlaying ? (
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
              ) : (
                <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-1 h-6">
                {[...Array(30)].map((_, i) => (
                  <div key={i} className="w-[3px] rounded-full" style={{
                    background: embedded ? 'rgba(201,111,120,0.5)' : '#C96F78',
                    height: `${Math.random() * 16 + 4}px`,
                  }} />
                ))}
              </div>
            </div>
            <span className={`text-xs font-mono ${embedded ? 'text-white/50' : 'text-gray-400'}`}>{formatTime(duration)}</span>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={retake} className={`flex-1 py-2.5 rounded-xl font-semibold text-[12px] transition-all hover:scale-[1.02] ${embedded ? 'text-white/70' : 'text-gray-600'}`} style={{ background: embedded ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}>
              Tekrar Kaydet
            </button>
            <button onClick={uploadVoice} className="flex-1 py-2.5 rounded-xl font-semibold text-[12px] text-white transition-all hover:scale-[1.02]" style={{ background: '#C96F78', boxShadow: '0 4px 16px rgba(201,111,120,0.25)' }}>
              Gönder
            </button>
          </div>
        </div>
      )}

      {/* Uploading */}
      {state === 'uploading' && (
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'rgba(201,111,120,0.1)' }}>
            <svg className="w-6 h-6 animate-spin" style={{ color: '#C96F78' }} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          </div>
          <p className={`text-sm font-medium ${embedded ? 'text-white' : 'text-gray-700'}`}>Gönderiliyor...</p>
        </div>
      )}

      {/* Success */}
      {state === 'success' && (
        <div className="text-center py-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
            <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <p className={`text-sm font-bold ${embedded ? 'text-white' : 'text-gray-900'}`}>Sesli tebriğiniz gönderildi!</p>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="text-center py-4">
          <p className={`text-sm mb-3 ${embedded ? 'text-red-300' : 'text-red-500'}`}>{errorMessage}</p>
          <button onClick={() => { setState('idle'); setErrorMessage(''); }} className="px-4 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: '#C96F78' }}>
            Tekrar Dene
          </button>
        </div>
      )}
    </div>
  );

  if (embedded) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
      <div className="rounded-3xl max-w-sm w-full overflow-hidden relative" style={{ background: 'rgba(255,253,251,0.97)', boxShadow: '0 24px 70px rgba(63,44,39,0.16)', border: '1px solid rgba(60,45,41,0.07)' }}>
        <button onClick={() => { cleanup(); onClose(); }} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgba(0,0,0,0.06)', color: '#999' }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="p-6 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,111,120,0.10)' }}>
              <svg className="w-[22px] h-[22px]" style={{ color: '#C96F78' }} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Sesli Tebrik</h3>
              <p className="text-xs text-gray-400">60 saniyelik sesli mesajınızı kaydedin</p>
            </div>
          </div>
        </div>
        {content}
      </div>
    </div>
  );
}
