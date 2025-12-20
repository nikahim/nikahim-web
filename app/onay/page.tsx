"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function OnayPage() {
  const [status, setStatus] = useState<"loading" | "success">("loading");

  useEffect(() => {
    const handleAuth = async () => {
      const hash = window.location.hash;
      
      if (hash && hash.includes("access_token")) {
        setStatus("success");
      } else {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setStatus("success");
        } else {
          setTimeout(() => {
            setStatus("success");
          }, 2000);
        }
      }
    };

    handleAuth();
  }, []);

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
      alert("Telefonunuzdan Nikahim uygulamasını açıp giriş yapabilirsiniz.");
    }
  };

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">⏳</div>
          <p className="text-gray-600 text-lg">Hesabınız doğrulanıyor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <Image 
          src="/logo.png" 
          alt="Nikahim.com" 
          width={80} 
          height={80} 
          className="mx-auto rounded-full mb-6" 
        />
        
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl">✅</span>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Hesabınız Aktif!</h1>
        
        <p className="text-gray-600 mb-8">
          E-posta adresiniz başarıyla doğrulandı.<br />
          Artık uygulamaya giriş yapabilirsiniz.
        </p>

        <button
          onClick={openApp}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-semibold text-lg mb-6 flex items-center justify-center gap-2 transition-colors"
        >
          📱 Uygulamaya Geri Dön
        </button>

        <div className="border-t pt-6">
          <p className="text-gray-500 text-sm mb-4">Uygulama yüklü değil mi?</p>
          <div className="flex gap-4 justify-center">
            <a href="https://apps.apple.com/app/nikahim" target="_blank">
              <Image src="/appstore.png" alt="App Store" width={130} height={44} className="h-11 w-auto hover:opacity-80 transition-opacity" />
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.nikahim" target="_blank">
              <Image src="/playstore.png" alt="Google Play" width={130} height={44} className="h-11 w-auto hover:opacity-80 transition-opacity" />
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}