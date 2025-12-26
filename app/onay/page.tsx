"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function OnayPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // 1. URL parametrelerini kontrol et (Yeni PKCE yöntemi)
        const urlParams = new URLSearchParams(window.location.search);
        const token_hash = urlParams.get("token_hash");
        const type = urlParams.get("type");

        if (token_hash && type) {
          console.log("Token hash bulundu, onaylanıyor...");
          
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as "signup" | "email",
          });

          if (error) {
            console.error("Verify OTP hatası:", error);
            setErrorMsg(error.message);
            setStatus("error");
            return;
          }

          console.log("Email başarıyla onaylandı!");
          setStatus("success");
          return;
        }

        // 2. Hash fragment kontrol et (Eski implicit yöntem)
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
              console.error("Set session hatası:", error);
              setErrorMsg(error.message);
              setStatus("error");
              return;
            }

            setStatus("success");
            return;
          }
        }

        // 3. Zaten session varsa
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setStatus("success");
          return;
        }

        // 4. Hiçbiri yoksa hata
        setErrorMsg("Geçersiz veya süresi dolmuş onay linki.");
        setStatus("error");

      } catch (err) {
        console.error("Onay hatası:", err);
        setErrorMsg("Beklenmeyen bir hata oluştu.");
        setStatus("error");
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

  // Loading
  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Hesabınız doğrulanıyor...</p>
        </div>
      </main>
    );
  }

  // Error
  if (status === "error") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">❌</span>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Onay Başarısız</h1>
          
          <p className="text-gray-600 mb-4">
            {errorMsg || "Onay linki geçersiz veya süresi dolmuş."}
          </p>
          
          <p className="text-gray-500 text-sm mb-6">
            Lütfen uygulamadan tekrar kayıt olun veya yeni bir onay maili isteyin.
          </p>

          <a
            href="/"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold transition-colors"
          >
            Ana Sayfaya Dön
          </a>
        </div>
      </main>
    );
  }

  // Success
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
            <a 
              href="https://apps.apple.com/app/nikahim" 
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image 
                src="/appstore.png" 
                alt="App Store" 
                width={130} 
                height={44} 
                className="h-11 w-auto hover:opacity-80 transition-opacity" 
              />
            </a>
            <a 
              href="https://play.google.com/store/apps/details?id=com.nikahim" 
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image 
                src="/playstore.png" 
                alt="Google Play" 
                width={130} 
                height={44} 
                className="h-11 w-auto hover:opacity-80 transition-opacity" 
              />
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}