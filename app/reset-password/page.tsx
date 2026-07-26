"use client";

import { supabase } from '@/lib/supabase';
import Image from "next/image";
import { useState, useEffect } from "react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // şifre sıfırlama oturumu aktif
      }
    });
  }, []);

  const handleResetPassword = async () => {
    setMessage('');
    if (!password || !confirmPassword) { setMessage('Lütfen tüm alanları doldurun.'); return; }
    if (password !== confirmPassword) { setMessage('Şifreler eşleşmiyor.'); return; }
    if (password.length < 6) { setMessage('Şifre en az 6 karakter olmalı.'); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) { setMessage('Bir hata oluştu. Bağlantının süresi dolmuş olabilir, lütfen tekrar deneyin.'); return; }
    setIsSuccess(true);
  };

  const openApp = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = "nikahim://login";
      setTimeout(() => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        window.location.href = isIOS
          ? "https://apps.apple.com/app/nikahim"
          : "https://play.google.com/store/apps/details?id=com.nikahim";
      }, 2500);
    } else {
      alert("Telefonunuzdan Nikahım uygulamasını açıp yeni şifrenizle giriş yapabilirsiniz.");
    }
  };

  const inputCls = "w-full px-4 py-3.5 rounded-2xl text-[15px] text-[#463739] outline-none transition-all";
  const inputStyle = { backgroundColor: '#FFF4F1', border: '1.5px solid #F2DBDD' } as const;

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(180deg,#F5ECEA 0%,#F1E9E7 100%)', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div className="w-full max-w-md rounded-[26px] px-7 py-9" style={{ backgroundColor: '#FFFAF8', boxShadow: '0 20px 60px rgba(140,70,80,0.14)' }}>

        <div className="text-center">
          <Image src="/logo-nikahim.png" alt="Nikahım" width={128} height={137} className="mx-auto mb-4" style={{ width: 112, height: 'auto' }} priority />
        </div>

        {!isSuccess ? (
          <>
            <h1 className="text-[22px] font-bold text-center mb-1" style={{ color: '#4A3236' }}>Yeni Şifre Belirle</h1>
            <p className="text-center text-[13.5px] mb-6" style={{ color: '#8C7476' }}>Nikahım hesabınız için yeni bir şifre oluşturun.</p>

            {message && (
              <div className="rounded-2xl p-3.5 mb-5 text-center text-[13px]" style={{ backgroundColor: '#FDECEC', border: '1px solid #F5D2D2', color: '#B04A57' }}>
                {message}
              </div>
            )}

            <div className="space-y-3.5">
              <input type={show ? 'text' : 'password'} placeholder="Yeni Şifre" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} style={inputStyle} />
              <input type={show ? 'text' : 'password'} placeholder="Yeni Şifre (Tekrar)" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} style={inputStyle} />

              <label className="flex items-center gap-2 cursor-pointer select-none pl-1">
                <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="w-4 h-4 rounded accent-[#C8686E]" />
                <span className="text-[13px]" style={{ color: '#8C7476' }}>Şifreleri göster</span>
              </label>

              <button onClick={handleResetPassword} disabled={loading}
                className="w-full py-4 rounded-full font-bold text-white text-[15.5px] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#D17075,#BE5460)', boxShadow: '0 8px 22px rgba(190,84,96,0.32)' }}>
                {loading ? 'Güncelleniyor…' : 'Şifremi Güncelle'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: 'rgba(47,163,95,0.10)' }}>
              <svg className="w-9 h-9" fill="none" stroke="#2FA35F" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-[20px] font-bold mb-2" style={{ color: '#4A3236' }}>Şifreniz Güncellendi</h2>
            <p className="text-[13.5px] mb-6" style={{ color: '#8C7476' }}>Yeni şifreniz başarıyla kaydedildi. Artık uygulamaya giriş yapabilirsiniz.</p>

            <button onClick={openApp}
              className="w-full py-4 rounded-full font-bold text-white text-[15.5px] mb-6 transition-all hover:scale-[1.01]"
              style={{ background: 'linear-gradient(135deg,#D17075,#BE5460)', boxShadow: '0 8px 22px rgba(190,84,96,0.32)' }}>
              Uygulamaya Geri Dön
            </button>

            <div className="pt-5" style={{ borderTop: '1px solid #F0E0E1' }}>
              <p className="text-[12px] mb-3" style={{ color: '#A9989A' }}>Uygulama yüklü değil mi?</p>
              <div className="flex gap-3 justify-center">
                <a href="https://apps.apple.com/app/nikahim" target="_blank" rel="noopener noreferrer"><Image src="/appstore.png" alt="App Store" width={120} height={40} className="h-10 w-auto hover:opacity-80" /></a>
                <a href="https://play.google.com/store/apps/details?id=com.nikahim" target="_blank" rel="noopener noreferrer"><Image src="/playstore.png" alt="Google Play" width={120} height={40} className="h-10 w-auto hover:opacity-80" /></a>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-[11px] mt-7" style={{ color: '#C4B4B5' }}>© 2026 Nikahım. Tüm hakları saklıdır.</p>
      </div>
    </main>
  );
}
