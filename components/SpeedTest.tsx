// components/SpeedTest.tsx
// İnternet hız testi - Yayın öncesi kontrol

'use client';

import { useState, useCallback } from 'react';

interface SpeedTestResult {
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  recommendation: string;
}

interface SpeedTestProps {
  onComplete?: (result: SpeedTestResult) => void;
  className?: string;
}

export default function SpeedTest({ onComplete, className = '' }: SpeedTestProps) {
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SpeedTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Upload hız testi (daha önemli - yayın için)
  const testUploadSpeed = async (): Promise<number> => {
    const testData = new Blob([new ArrayBuffer(1024 * 1024)]); // 1MB
    const startTime = performance.now();
    
    try {
      // Cloudflare speed test endpoint
      await fetch('https://speed.cloudflare.com/__up', {
        method: 'POST',
        body: testData,
      });
      
      const endTime = performance.now();
      const durationSec = (endTime - startTime) / 1000;
      const mbps = (1 * 8) / durationSec; // 1MB * 8 bits / süre
      
      return Math.round(mbps * 10) / 10;
    } catch {
      // Fallback: kendi sunucumuza test
      return 0;
    }
  };

  // Download hız testi
  const testDownloadSpeed = async (): Promise<number> => {
    const startTime = performance.now();
    
    try {
      // Cloudflare speed test endpoint
      const response = await fetch('https://speed.cloudflare.com/__down?bytes=1000000'); // 1MB
      await response.blob();
      
      const endTime = performance.now();
      const durationSec = (endTime - startTime) / 1000;
      const mbps = (1 * 8) / durationSec;
      
      return Math.round(mbps * 10) / 10;
    } catch {
      return 0;
    }
  };

  // Latency testi
  const testLatency = async (): Promise<number> => {
    const times: number[] = [];
    
    for (let i = 0; i < 3; i++) {
      const start = performance.now();
      try {
        await fetch('https://speed.cloudflare.com/__down?bytes=1', { 
          cache: 'no-store' 
        });
        times.push(performance.now() - start);
      } catch {
        // ignore
      }
    }
    
    if (times.length === 0) return 0;
    return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  };

  // Kalite değerlendirmesi
  const evaluateQuality = (upload: number): SpeedTestResult['quality'] => {
    // Yayın için önerilen minimum: 4-5 Mbps
    if (upload >= 10) return 'excellent';
    if (upload >= 5) return 'good';
    if (upload >= 2) return 'fair';
    return 'poor';
  };

  // Öneri oluştur
  const getRecommendation = (quality: SpeedTestResult['quality'], upload: number): string => {
    switch (quality) {
      case 'excellent':
        return 'Harika! HD kalitede yayın yapabilirsiniz.';
      case 'good':
        return 'İyi. 720p kalitede sorunsuz yayın yapabilirsiniz.';
      case 'fair':
        return 'Orta. 480p kalitede yayın önerilir. WiFi yerine kablolu bağlantı deneyin.';
      case 'poor':
        return `Düşük (${upload} Mbps). Yayın kalitesi sorunlu olabilir. Daha iyi internet bağlantısı gerekli.`;
    }
  };

  // Testi başlat
  const runSpeedTest = useCallback(async () => {
    setTesting(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      // Latency testi
      setProgress(20);
      const latency = await testLatency();
      
      // Download testi
      setProgress(50);
      const download = await testDownloadSpeed();
      
      // Upload testi (en önemli)
      setProgress(80);
      const upload = await testUploadSpeed();
      
      setProgress(100);

      const quality = evaluateQuality(upload);
      const recommendation = getRecommendation(quality, upload);

      const testResult: SpeedTestResult = {
        downloadMbps: download,
        uploadMbps: upload,
        latencyMs: latency,
        quality,
        recommendation,
      };

      setResult(testResult);
      onComplete?.(testResult);

    } catch {
      setError('Hız testi yapılamadı. İnternet bağlantınızı kontrol edin.');
    } finally {
      setTesting(false);
    }
  }, [onComplete]);

  const qualityColors = {
    excellent: 'text-green-500',
    good: 'text-blue-500',
    fair: 'text-yellow-500',
    poor: 'text-red-500',
  };

  const qualityBgs = {
    excellent: 'bg-green-500',
    good: 'bg-blue-500',
    fair: 'bg-yellow-500',
    poor: 'bg-red-500',
  };

  return (
    <div className={`bg-gray-900 rounded-xl p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
        İnternet Hız Testi
      </h3>

      {!result && !testing && (
        <div className="text-center py-6">
          <p className="text-gray-400 mb-4">
            Yayın öncesi internet hızınızı kontrol edin
          </p>
          <button
            onClick={runSpeedTest}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-lg font-medium hover:opacity-90 transition inline-flex items-center gap-2"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91 0z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
            Hız Testini Başlat
          </button>
        </div>
      )}

      {testing && (
        <div className="py-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div 
              className="bg-gradient-to-r from-pink-500 to-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-gray-400">
            {progress < 30 && 'Latency ölçülüyor...'}
            {progress >= 30 && progress < 60 && 'Download hızı test ediliyor...'}
            {progress >= 60 && 'Upload hızı test ediliyor...'}
          </p>
        </div>
      )}

      {error && (
        <div className="text-center py-6">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={runSpeedTest}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Tekrar Dene
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Sonuç Kartları */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs mb-1">Download</p>
              <p className="text-xl font-bold text-white">{result.downloadMbps}</p>
              <p className="text-gray-500 text-xs">Mbps</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs mb-1">Upload</p>
              <p className="text-xl font-bold text-green-400">{result.uploadMbps}</p>
              <p className="text-gray-500 text-xs">Mbps</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs mb-1">Ping</p>
              <p className="text-xl font-bold text-white">{result.latencyMs}</p>
              <p className="text-gray-500 text-xs">ms</p>
            </div>
          </div>

          {/* Kalite Göstergesi */}
          <div className={`p-4 rounded-lg ${qualityBgs[result.quality]} bg-opacity-20`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${qualityBgs[result.quality]}`} />
              <span className={`font-semibold ${qualityColors[result.quality]}`}>
                {result.quality === 'excellent' && 'Mükemmel'}
                {result.quality === 'good' && 'İyi'}
                {result.quality === 'fair' && 'Orta'}
                {result.quality === 'poor' && 'Zayıf'}
              </span>
            </div>
            <p className="text-gray-300 text-sm">{result.recommendation}</p>
          </div>

          {/* Yeniden Test */}
          <button
            onClick={runSpeedTest}
            className="w-full py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 text-sm inline-flex items-center justify-center gap-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Tekrar Test Et
          </button>
        </div>
      )}

      {/* Bilgi */}
      <p className="text-gray-500 text-xs mt-4 text-center inline-flex items-center justify-center gap-1.5 w-full">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>
        Yayın için minimum 5 Mbps upload hızı önerilir
      </p>
    </div>
  );
}
