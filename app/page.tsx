"use client";

import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showAppPopup, setShowAppPopup] = useState(false);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  return (
    <main className="min-h-screen bg-white">
      
      {/* APP STORE POPUP */}
      {showAppPopup && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowAppPopup(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-6">Uygulamayı İndir</h3>
            <div className="space-y-4">
              <a href="#" className="block">
                <Image src="/appstore.png" alt="App Store" width={200} height={60} className="h-14 w-auto mx-auto hover:opacity-80 transition-opacity" />
              </a>
              <a href="#" className="block">
                <Image src="/playstore.png" alt="Google Play" width={200} height={60} className="h-14 w-auto mx-auto hover:opacity-80 transition-opacity" />
              </a>
            </div>
            <button 
              onClick={() => setShowAppPopup(false)}
              className="w-full mt-6 py-3 text-gray-500 hover:text-gray-700 font-medium"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 bg-white z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection("hero")}>
              <Image src="/logo.png" alt="Nikahim.com" width={45} height={45} className="rounded-full" />
              <span className="text-xl font-bold" style={{ color: "#1565C0" }}>Nikahim.com</span>
            </div>

            <nav className="hidden lg:flex items-center gap-8">
              <button onClick={() => scrollToSection("hero")} className="text-gray-600 hover:text-blue-500 font-medium">Ana Sayfa</button>
              <button onClick={() => scrollToSection("nasil-calisir")} className="text-gray-600 hover:text-blue-500 font-medium">Nasıl Çalışır</button>
              <button onClick={() => scrollToSection("paketler")} className="text-gray-600 hover:text-blue-500 font-medium">Paketler</button>
              <button onClick={() => scrollToSection("sss")} className="text-gray-600 hover:text-blue-500 font-medium">SSS</button>
              <button onClick={() => scrollToSection("hakkimizda")} className="text-gray-600 hover:text-blue-500 font-medium">Hakkımızda</button>
            </nav>

            <button 
              onClick={() => setShowAppPopup(true)}
              className="hidden lg:block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-full font-semibold"
            >
              Uygulamayı İndir
            </button>

            <button className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden py-4 border-t">
              <div className="flex flex-col gap-3">
                <button onClick={() => scrollToSection("hero")} className="text-gray-600 py-2 text-left">Ana Sayfa</button>
                <button onClick={() => scrollToSection("nasil-calisir")} className="text-gray-600 py-2 text-left">Nasıl Çalışır</button>
                <button onClick={() => scrollToSection("paketler")} className="text-gray-600 py-2 text-left">Paketler</button>
                <button onClick={() => scrollToSection("sss")} className="text-gray-600 py-2 text-left">SSS</button>
                <button onClick={() => scrollToSection("hakkimizda")} className="text-gray-600 py-2 text-left">Hakkımızda</button>
                <button onClick={() => setShowAppPopup(true)} className="bg-blue-500 text-white py-3 rounded-full font-semibold mt-2">Uygulamayı İndir</button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* HERO */}
      <section id="hero" className="pt-28 pb-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            <div className="text-center lg:text-left">
              <span className="inline-block bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-medium mb-6">
                🎊 Türkiye&#39;nin İlk Online Nikah Yayın Platformu
              </span>
              
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Nikahınızı <span className="text-blue-500">Canlı</span> Yayınlayın
              </h1>
              
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Sevdikleriniz uzakta olsa bile özel gününüzde yanınızda olsun. 
                Uygulamamızı indirin, nikahınızı planlayın, tek tuşla yayına geçin!
              </p>

              <div className="flex flex-wrap gap-4 justify-center lg:justify-start mb-10">
                <Image src="/appstore.png" alt="App Store" width={150} height={50} className="h-12 w-auto cursor-pointer hover:opacity-80" />
                <Image src="/playstore.png" alt="Google Play" width={150} height={50} className="h-12 w-auto cursor-pointer hover:opacity-80" />
              </div>

              <div className="flex flex-wrap gap-8 justify-center lg:justify-start">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-800">500+</div>
                  <div className="text-gray-500 text-sm">Mutlu Çift</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-800">10.000+</div>
                  <div className="text-gray-500 text-sm">İzleyici</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-800">4.9 ⭐</div>
                  <div className="text-gray-500 text-sm">Puan</div>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="relative">
                <Image src="/couple.png" alt="Mutlu Çift" width={450} height={350} className="rounded-2xl shadow-xl" />
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  CANLI
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NASIL ÇALIŞIR */}
      <section id="nasil-calisir" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Nasıl Çalışır?</h2>
            <p className="text-lg text-gray-600">Sadece 5 adımda nikahınızı canlı yayınlayın</p>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-8">
            {[
              { num: "1", icon: "📱", title: "Uygulamayı İndirin", desc: "App Store veya Play Store'dan ücretsiz indirin", color: "bg-blue-100" },
              { num: "2", icon: "📝", title: "Nikahınızı Planlayın", desc: "Tarih, mekan ve davetiye şablonu seçin", color: "bg-green-100" },
              { num: "3", icon: "📤", title: "Linki Paylaşın", desc: "Davetlilere gönderin, uygulama gerekmez", color: "bg-yellow-100" },
              { num: "4", icon: "🎥", title: "Canlı Yayınlayın", desc: "Tek tuşla yayına geçin!", color: "bg-pink-100" },
              { num: "5", icon: "💰", title: "Altınları Toplayın", desc: "Yakınlarınızdan online altınları toplayın", color: "bg-purple-100" },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="relative inline-block mb-6">
                  <div className={`w-20 h-20 ${step.color} rounded-full flex items-center justify-center mx-auto`}>
                    <span className="text-3xl">{step.icon}</span>
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                    {step.num}
                  </div>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ÖZELLİKLER */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Neden Nikahim.com?</h2>
            <p className="text-lg text-gray-600">Size özel tasarlanmış özellikler</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "📺", title: "HD Canlı Yayın", desc: "1080p kalitesinde yayın yapın", bg: "bg-blue-50" },
              { icon: "💰", title: "Dijital Altın Takma", desc: "QR kod ile kolay hediye gönderimi", bg: "bg-yellow-50" },
              { icon: "💬", title: "Canlı Sohbet", desc: "Davetliler mesaj gönderebilsin", bg: "bg-green-50" },
              { icon: "📜", title: "Dijital Davetiye", desc: "100+ şık şablon arasından seçin", bg: "bg-purple-50" },
              { icon: "🎬", title: "Video Kaydı", desc: "Kaçıranlar sonradan izleyebilsin", bg: "bg-pink-50" },
              { icon: "📱", title: "Kolay Kullanım", desc: "Tek tuşla yayın başlatın", bg: "bg-orange-50" },
            ].map((f, i) => (
              <div key={i} className={`${f.bg} rounded-2xl p-6`}>
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PAKETLER */}
      <section id="paketler" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Paketler</h2>
            <p className="text-lg text-gray-600">Size uygun paketi seçin</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Gümüş", price: "499", duration: "15", storage: "3", download: false, popular: false },
              { name: "Altın", price: "699", duration: "30", storage: "7", download: true, popular: true },
              { name: "Platinum", price: "999", duration: "60", storage: "7", download: true, popular: false },
            ].map((pkg, i) => (
              <div key={i} className={`rounded-2xl p-8 text-center relative ${pkg.popular ? "bg-blue-500 text-white shadow-xl" : "bg-gray-50 text-gray-900"}`}>
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 text-sm font-bold px-5 py-2 rounded-full flex items-center gap-2 whitespace-nowrap">
                    <span className="text-white text-lg">★</span>
                    <span>TAVSİYE EDİLEN</span>
                  </div>
                )}

                <h3 className="text-3xl font-bold mb-4 mt-2">{pkg.name}</h3>
                <div className="mb-8">
                  <span className="text-5xl font-bold">{pkg.price}</span>
                  <span className="text-xl"> ₺</span>
                </div>

                <div className="space-y-4 mb-8 text-left">
                  <div className="flex items-center gap-3">
                    <span className={pkg.popular ? "text-white" : "text-green-500"}>✓</span>
                    <span>Dijital Davetiye</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={pkg.popular ? "text-white" : "text-green-500"}>✓</span>
                    <span>{pkg.duration} dakika canlı yayın</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={pkg.popular ? "text-white" : "text-green-500"}>✓</span>
                    <span>{pkg.storage} gün video kaydı</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={pkg.download ? (pkg.popular ? "text-white" : "text-green-500") : "text-gray-400"}>
                      {pkg.download ? "✓" : "✗"}
                    </span>
                    <span className={pkg.download ? "" : "text-gray-400"}>Video indirme</span>
                  </div>
                </div>

                <button className={`w-full py-4 rounded-full font-semibold text-lg ${pkg.popular ? "bg-white text-blue-500 hover:bg-gray-100" : "bg-blue-500 text-white hover:bg-blue-600"}`}>
                  Hemen Başla
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* YORUMLAR */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Mutlu Çiftlerimiz</h2>
            <p className="text-lg text-gray-600">Nikahim.com ile özel günlerini yaşayan çiftlerden</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Ayşe & Mehmet", city: "İstanbul", text: "Almanya'daki akrabalarımız nikahımızı canlı izledi, çok duygulandık!" },
              { name: "Zeynep & Ali", city: "Ankara", text: "QR kod ile altın takma özelliği harika! Herkes kolayca hediye gönderdi." },
              { name: "Elif & Can", city: "İzmir", text: "Çok kolay kullanım, teknik bilgiye gerek yok. Tek tuşla yayın başladı!" },
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="text-yellow-400 mb-4">★★★★★</div>
                <p className="text-gray-600 mb-6">&quot;{t.text}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-gray-500 text-xs">{t.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SSS */}
      <section id="sss" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Sıkça Sorulan Sorular</h2>
          </div>

          <div className="space-y-4">
            {[
              { q: "Nasıl canlı yayın başlatırım?", a: "Uygulamayı indirin, nikahınızı planlayın ve Canlı Yayın butonuna basın. Tek tuşla yayınınız başlar!" },
              { q: "Davetliler nasıl izleyecek?", a: "Uygulamamızı indirip nikahınızı oluşturduktan sonra size verilen linki davetlileriniz ile paylaşın. Bu linke tıklayarak hiçbir uygulama indirmeden tek tıkla canlı yayınına katılabilecekler." },
              { q: "QR kod nasıl oluştururum?", a: "Bankanızın QR kod işlemleri bölümünden para iste seçeneği ile kolayca talep ettiğiniz miktardaki QR kodlarınızı oluşturabilirsiniz." },
              { q: "Videoyu indirebilecek miyim?", a: "Satın aldığınız pakete göre videoyu indirebilirsiniz." },
              { q: "Altınları yakınlarımdan nasıl toplayacağım?", a: "Nikahınızı izleyen yakınlarınız size 3 yöntem ile takmak istedikleri altın fiyatı kadar TL'yi hesabınıza gönderir:\n\n1. QR kod ile FAST üzerinden banka transferi (sıfır komisyon)\n2. Havale/EFT ile banka transferi (sıfır komisyon)\n3. Kredi kartı ile ödeme (Kredi kartı işlemlerinden %13 platform komisyonu alınır)" },
              { q: "Davetiyeyi ne zaman görüntüleyebileceğim?", a: "Davetiyenizi seçtikten ve nikah etkinliğinizi uygulama üzerinden oluşturduktan sonra 3 iş günü içerisinde telefonunuza ve email adresinize gönderilir." },
              { q: "Video kaydı ne kadar süre saklanır?", a: "Seçtiğiniz pakete göre 3-7 gün saklanır." },
            ].map((faq, i) => (
              <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  className="w-full p-5 text-left flex items-center justify-between bg-white hover:bg-gray-50"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium text-gray-900">{faq.q}</span>
                  <span className={`text-blue-500 text-2xl transition-transform ${openFaq === i ? "rotate-45" : ""}`}>+</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-gray-600 text-sm whitespace-pre-line">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HAKKIMIZDA */}
      <section id="hakkimizda" className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Image src="/logo.png" alt="Nikahim.com" width={80} height={80} className="mx-auto mb-6 rounded-full" />
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">Hakkımızda</h2>
          <p className="text-gray-600 mb-4 leading-relaxed">
            Nikahim.com, düğün ve nikahlara katılamayan sevdiklerinizin özel gününüzü canlı olarak izlemesini sağlayan bir platformdur.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Türk kültüründeki &quot;altın takma&quot; geleneğini dijital dünyaya taşıyarak, uzaktaki misafirlerinizin de size hediye gönderebilmesini kolaylaştırıyoruz.
          </p>
          <div className="mt-8 text-gray-500">📍 İstanbul, Türkiye</div>
        </div>
      </section>

      {/* İLETİŞİM */}
      <section id="iletisim" className="py-20 bg-white">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Bize Ulaşın</h2>
            <p className="text-lg text-gray-600">Sorularınız mı var? Size yardımcı olmaktan mutluluk duyarız!</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8">
            <form className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <input type="text" placeholder="Adınız Soyadınız" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none" />
                <input type="email" placeholder="E-posta adresiniz" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none" />
              </div>
              <select className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none bg-white">
                <option>Genel Soru</option>
                <option>Teknik Destek</option>
                <option>Ödeme Sorunu</option>
              </select>
              <textarea rows={4} placeholder="Mesajınız" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none resize-none"></textarea>
              <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold">
                Gönder
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200 flex flex-wrap justify-center gap-6">
              <a href="mailto:destek@nikahim.com" className="flex items-center gap-2 text-gray-600 hover:text-blue-500">
                📧 destek@nikahim.com
              </a>
              <a href="https://wa.me/905551234567" target="_blank" className="flex items-center gap-2 text-gray-600 hover:text-green-500">
                <Image src="/whatsapp.png" alt="WhatsApp" width={24} height={24} className="w-6 h-6" />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-blue-500">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
            Nikahınızı canlı yayınlamaya hazır mısınız?
          </h2>
          <p className="text-white/80 mb-8">
            Hemen uygulamayı indirin ve özel gününüzü planlayın!
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Image src="/appstore.png" alt="App Store" width={140} height={45} className="h-11 w-auto cursor-pointer hover:opacity-80" />
            <Image src="/playstore.png" alt="Google Play" width={140} height={45} className="h-11 w-auto cursor-pointer hover:opacity-80" />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image src="/logo.png" alt="Nikahim.com" width={32} height={32} className="rounded-full" />
                <span className="font-bold">Nikahim.com</span>
              </div>
              <p className="text-gray-400 text-sm">Sevdikleriniz uzakta olsa bile özel gününüzde yanınızda olsun.</p>
            </div>

            <div>
              <h4 className="font-bold mb-4">İndir</h4>
              <div className="space-y-2">
                <Image src="/appstore.png" alt="App Store" width={120} height={40} className="h-9 w-auto cursor-pointer" />
                <Image src="/playstore.png" alt="Google Play" width={120} height={40} className="h-9 w-auto cursor-pointer" />
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-4">Keşfet</h4>
              <div className="space-y-2 text-sm">
                <button onClick={() => scrollToSection("nasil-calisir")} className="block text-gray-400 hover:text-white">Nasıl Çalışır</button>
                <button onClick={() => scrollToSection("paketler")} className="block text-gray-400 hover:text-white">Paketler</button>
                <button onClick={() => scrollToSection("sss")} className="block text-gray-400 hover:text-white">SSS</button>
                <button onClick={() => scrollToSection("hakkimizda")} className="block text-gray-400 hover:text-white">Hakkımızda</button>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-4">Bizi Takip Edin</h4>
              <a href="https://instagram.com/nikahim.co" target="_blank" className="flex items-center gap-2 text-gray-400 hover:text-white">
                <Image src="/instagram.png" alt="Instagram" width={24} height={24} className="w-6 h-6 rounded" />
                @nikahim.co
              </a>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
            © 2024 Nikahim.com • Tüm hakları saklıdır.
          </div>
        </div>
      </footer>

    </main>
  );
}