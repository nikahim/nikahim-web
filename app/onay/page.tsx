"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function OnayPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [userType, setUserType] = useState<"individual" | "business">("individual");

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token_hash = urlParams.get("token_hash");
        const type = urlParams.get("type");

        if (token_hash && type) {
          const { data: verifyData, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as "signup" | "email",
          });

          if (error) {
            setErrorMsg(error.message);
            setStatus("error");
            return;
          }

          // user_type kontrol
          if (verifyData?.user) {
            const { data: userData } = await supabase.from('users').select('user_type').eq('id', verifyData.user.id).single();
            if (userData?.user_type === 'business') setUserType('business');
          }

          setStatus("success");
          return;
        }

        const hash = window.location.hash;
        if (hash && hash.includes("access_token")) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const access_token = hashParams.get("access_token");
          const refresh_token = hashParams.get("refresh_token");

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (error) {
              setErrorMsg(error.message);
              setStatus("error");
              return;
            }

            // user_type kontrol
            const { data: sessionData } = await supabase.auth.getUser();
            if (sessionData?.user) {
              const { data: userData } = await supabase.from('users').select('user_type').eq('id', sessionData.user.id).single();
              if (userData?.user_type === 'business') setUserType('business');
            }

            setStatus("success");
            return;
          }
        }

        const { data } = await supabase.auth.getSession();
        if (data.session) {
          const { data: userData } = await supabase.from('users').select('user_type').eq('id', data.session.user.id).single();
          if (userData?.user_type === 'business') setUserType('business');
          setStatus("success");
          return;
        }

        setErrorMsg("Geçersiz veya süresi dolmuş onay linki.");
        setStatus("error");
      } catch {
        setErrorMsg("Beklenmeyen bir hata oluştu.");
        setStatus("error");
      }
    };

    handleAuth();
  }, []);

  const openApp = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const deepLink = userType === 'business' ? 'nikahim://shop-login' : 'nikahim://login';

    if (isMobile) {
      window.location.href = deepLink;
      setTimeout(() => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          window.location.href = "https://apps.apple.com/app/nikahim";
        } else {
          window.location.href = "https://play.google.com/store/apps/details?id=com.nikahim";
        }
      }, 2500);
    } else {
      alert("Telefonunuzdan Nikahim uygulamasını açıp giriş yapabilirsiniz.");
    }
  };

  const isBusiness = userType === 'business';
  const accentColor = isBusiness ? '#B8965A' : '#C8686E';
  const bgGradient = isBusiness
    ? 'linear-gradient(180deg, #FDFCF8 0%, #F8F3EB 50%, #F3EDE2 100%)'
    : 'linear-gradient(180deg, #FDFCFA 0%, #F8F5F0 50%, #F5F2ED 100%)';

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4" style={{ background: bgGradient }}>
        <div className="text-center">
          <div className="w-14 h-14 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: accentColor, borderTopColor: 'transparent' }} />
          <p className="text-gray-500 text-lg font-medium">Hesabınız doğrulanıyor...</p>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4" style={{ background: bgGradient }}>
        <div className="rounded-3xl p-8 max-w-md w-full text-center" style={{ backgroundColor: '#FFFAF8', boxShadow: '0 20px 60px rgba(140,70,80,0.12)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: 'rgba(239,68,68,0.08)' }}>
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-3">Onay Başarısız</h1>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">{errorMsg || "Onay linki geçersiz veya süresi dolmuş."}</p>
          <a href="/" className="inline-block text-white py-3.5 px-8 rounded-full font-semibold text-sm transition-all hover:scale-[1.02]" style={{ background: accentColor }}>Ana Sayfaya Dön</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ background: bgGradient }}>
      <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.08)' }}>

        {isBusiness ? (
          <Image src="/nikahim-carsi-icon.png" alt="Nikahım Çarşı" width={80} height={80} className="mx-auto mb-4 object-contain" style={{ width: 80, height: 80 }} />
        ) : (
          <Image src="/logo-nikahim.png" alt="Nikahım" width={112} height={120} className="mx-auto mb-4" style={{ width: 108, height: 'auto' }} />
        )}

        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: 'rgba(34,197,94,0.08)' }}>
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {isBusiness ? 'Hesabınız Aktif!' : 'Hesabınız Aktif!'}
        </h1>

        <p className="text-gray-500 text-sm mb-2 leading-relaxed">
          E-posta adresiniz başarıyla doğrulandı.
        </p>

        {isBusiness && (
          <p className="text-sm mb-6 leading-relaxed" style={{ color: '#B8965A' }}>
            Mağazanız admin onayı bekleniyor. Onaylandığında bildirim alacaksınız.
          </p>
        )}

        {!isBusiness && (
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Artık uygulamaya giriş yapabilirsiniz.
          </p>
        )}

        <button
          onClick={openApp}
          className="w-full text-white py-4 rounded-full font-semibold text-[15px] mb-5 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: isBusiness ? 'linear-gradient(135deg, #E8D3A3, #D4AF7A, #B8965A)' : 'linear-gradient(135deg, #D97070, #C8686E, #C06068)', boxShadow: `0 8px 24px ${isBusiness ? 'rgba(184,150,90,0.3)' : 'rgba(200,104,110,0.3)'}` }}
        >
          Uygulamaya Geri Dön
        </button>

        <div className="border-t pt-5" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <p className="text-gray-400 text-xs mb-3">Uygulama yüklü değil mi?</p>
          <div className="flex gap-3 justify-center">
            <a href="https://apps.apple.com/app/nikahim" target="_blank" rel="noopener noreferrer">
              <Image src="/appstore.png" alt="App Store" width={120} height={40} className="h-10 w-auto hover:opacity-80 transition-opacity" />
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.nikahim" target="_blank" rel="noopener noreferrer">
              <Image src="/playstore.png" alt="Google Play" width={120} height={40} className="h-10 w-auto hover:opacity-80 transition-opacity" />
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
