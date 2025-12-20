"use client";

import { supabase } from '@/lib/supabase';
import Image from "next/image";
import { useState, useEffect } from "react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Şifre sıfırlama modu aktif');
      }
    });
  }, []);

  const handleResetPassword = async () => {
    setMessage('');

    if (!password || !confirmPassword) {
      setMessage('Lütfen tüm alanları doldurun.');
      setIsSuccess(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Şifreler eşleşmiyor.');
      setIsSuccess(false);
      return;
    }

    if (password.length < 6) {
      setMessage('Şifre en az 6 karakter olmalı.');
      setIsSuccess(false);
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    setLoading(false);

    if (error) {
      setMessage('Bir hata oluştu. Lütfen tekrar deneyin.');
      setIsSuccess(false);
      return;
    }

    setIsSuccess(true);
  };

  const openApp = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      window.location.href = "nikahim://login";
      setTimeout(() => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          window.location.href = "https://apps.apple.com/app/nikahim";
        } else {
          window.location.href = "https://play.google.com/store/apps/details?id=com.nikahim";
        }
      }, 2500);
    } else {
      alert("Telefonunuzdan Nikahim uygulamasını açıp yeni şifrenizle giriş yapabilirsiniz.");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Nikahim.com" width={80} height={80} className="mx-auto rounded-full mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Yeni Şifre Belirle</h1>
          <p className="text-gray-600">Nikahim.com hesabınız için yeni bir şifre oluşturun.</p>
        </div>

        {message && !isSuccess && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-center text-red-700">⚠️ {message}</p>
          </div>
        )}

        {!isSuccess ? (
          <div className="space-y-4">
            <input
              type="password"
              placeholder="Yeni Şifre"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
            />

            <input
              type="password"
              placeholder="Yeni Şifre Tekrar"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
            />

            <button
              onClick={handleResetPassword}
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              {loading ? 'Güncelleniyor...' : 'Şifremi Güncelle'}
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">✅</span>
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-2">Şifreniz Güncellendi!</h2>
            <p className="text-gray-600 mb-6">Yeni şifreniz başarıyla kaydedildi.</p>

            <button
              onClick={openApp}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-semibold text-lg mb-6 transition-colors"
            >
              📱 Uygulamaya Geri Dön
            </button>

            <div className="border-t pt-6">
              <p className="text-gray-500 text-sm mb-4">Uygulama yüklü değil mi?</p>
              <div className="flex gap-4 justify-center">
                <a href="https://apps.apple.com/app/nikahim" target="_blank">
                  <Image src="/appstore.png" alt="App Store" width={120} height={40} className="h-10 w-auto hover:opacity-80" />
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.nikahim" target="_blank">
                  <Image src="/playstore.png" alt="Google Play" width={120} height={40} className="h-10 w-auto hover:opacity-80" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}