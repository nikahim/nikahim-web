"use client";

import { supabase } from '@/lib/supabase';
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showAppPopup, setShowAppPopup] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactSubject, setContactSubject] = useState("Genel Soru");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSending, setContactSending] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);


  interface Event {
    id: string;
    event_link: string;
    groom_full_name: string;
    bride_full_name: string;
    event_date: string;
  }

  const [searchResults, setSearchResults] = useState<Event[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [allEvents, setAllEvents] = useState<Event[]>([]);


  // AUTH REDIRECT - Token varsa /onay'a yönlendir
  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    
    // Eğer URL'de auth token varsa /onay'a yönlendir
    if (hash.includes('access_token') || 
        hash.includes('refresh_token') ||
        search.includes('token_hash') ||
        search.includes('code=')) {
      
      // Tüm parametreleri /onay'a taşı
      window.location.href = '/onay' + search + hash;
    }
  }, []);



  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true });
    
    if (data) {
      setAllEvents(data);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      const searchTerms = query.toLowerCase().split(" ").filter(t => t.length > 0);
      
      const results = allEvents.filter(event => {
        const groomFull = (event.groom_full_name || '').toLowerCase();
        const brideFull = (event.bride_full_name || '').toLowerCase();
        const combined = `${groomFull} ${brideFull}`;
        
        return searchTerms.every(term => combined.includes(term));
      });
      
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const goToWedding = (eventLink: string) => {
    router.push(`/canli/${eventLink}`);
  };

  const sendContactForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactName || !contactEmail || !contactMessage) {
      alert('Lütfen tüm alanları doldurun.');
      return;
    }

    setContactSending(true);

    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: 'service_ibwy6qp',
          template_id: 'template_yqt3v0n',
          user_id: 'gEM0kiWpFVk06tmCZ',
          template_params: {
            from_name: contactName,
            from_email: contactEmail,
            email: contactEmail,
            name: contactName,
            subject: contactSubject,
            message: contactMessage,
          },
        }),
      });

      const responseText = await response.text();
      
      if (response.ok || responseText === 'OK') {
        setContactSuccess(true);
        setContactName('');
        setContactEmail('');
        setContactSubject('Genel Soru');
        setContactMessage('');
        setTimeout(() => setContactSuccess(false), 3000);
      } else {
        throw new Error('Gönderilemedi');
      }
    } catch (error) {
      console.error('Email hatası:', error);
      alert('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setContactSending(false);
    }
  };

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

            <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <Image src="/logo.png" alt="Nikahım" width={45} height={45} className="rounded-full" />
              <span className="text-xl font-bold" style={{ color: "#1565C0" }}>Nikahım</span>
            </div>

            <nav className="hidden lg:flex items-center gap-8">
              <button onClick={() => scrollToSection("hero")} className="text-gray-600 hover:text-blue-500 font-medium">Ana Sayfa</button>
              <button onClick={() => scrollToSection("nikah-ara")} className="text-gray-600 hover:text-blue-500 font-medium">Nikah Ara</button>
              <button onClick={() => scrollToSection("nasil-calisir")} className="text-gray-600 hover:text-blue-500 font-medium">Nasıl Çalışır</button>
              <button onClick={() => scrollToSection("paketler")} className="text-gray-600 hover:text-blue-500 font-medium">Paketler</button>
              <button onClick={() => scrollToSection("sss")} className="text-gray-600 hover:text-blue-500 font-medium">SSS</button>
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
                <button onClick={() => scrollToSection("nikah-ara")} className="text-gray-600 py-2 text-left">Nikah Ara</button>
                <button onClick={() => scrollToSection("nasil-calisir")} className="text-gray-600 py-2 text-left">Nasıl Çalışır</button>
                <button onClick={() => scrollToSection("paketler")} className="text-gray-600 py-2 text-left">Paketler</button>
                <button onClick={() => scrollToSection("sss")} className="text-gray-600 py-2 text-left">SSS</button>
                <button onClick={() => setShowAppPopup(true)} className="bg-blue-500 text-white py-3 rounded-full font-semibold mt-2">Uygulamayı İndir</button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* HERO */}
      <section id="hero" className="pt-28 pb-8 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            <div className="text-center lg:text-left">
              <span className="inline-block bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-medium mb-6">
                🎊 Türkiye&apos;nin İlk Online Nikah Yayın Platformu
              </span>

              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Nikahınızı <span className="text-blue-500">Canlı</span> Yayınlayın
              </h1>

              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Sevdikleriniz uzakta olsa bile özel gününüzde yanınızda olsun.
                Uygulamamızı indirin, nikahınızı planlayın, tek tuşla yayına geçin!
              </p>

              <div className="flex flex-wrap gap-4 justify-center lg:justify-start mb-10">
                <Image src="/appstore.png" alt="App Store" width={150} height={50} className="h-12 w-auto cursor-pointer hover:opacity-80" onClick={() => setShowAppPopup(true)} />
                <Image src="/playstore.png" alt="Google Play" width={150} height={50} className="h-12 w-auto cursor-pointer hover:opacity-80" onClick={() => setShowAppPopup(true)} />
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
                <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-red-500 text-white px-3 py-1.5 rounded-full text-sm font-medium shadow-lg">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  CANLI
                </div>
                <Image 
                  src="/couple.png" 
                  alt="Mutlu Çift" 
                  width={500} 
                  height={500} 
                  className="max-w-full h-auto rounded-3xl shadow-xl" 
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NİKAH ARA */}
      <section id="nikah-ara" className="py-12 bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-col items-center mb-5">
            <div className="flex items-center gap-3 mb-2">
              <Image src="/search1.png" alt="Ara" width={40} height={40} className="w-10 h-10" />
              <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                Nikah Ara
              </h2>
            </div>
            <p className="text-base text-gray-600">Gelin veya damat adı/soyadı ile arayın</p>
          </div>

          <div className="relative max-w-3xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Örn: Ahmet, Ayşe, Yılmaz, Ahmet Ayşe..."
                className="w-full px-6 py-4 pr-24 text-lg border-2 border-gray-300 rounded-2xl focus:border-blue-500 outline-none bg-white shadow-sm text-gray-900 placeholder:text-gray-500"
              />
              {searchQuery && (
                <button 
                  onClick={() => { setSearchQuery(""); setShowSearchResults(false); }}
                  className="absolute right-[100px] top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
              <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold transition-all">
                Ara
              </button>
            </div>

            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-10 overflow-hidden max-h-80 overflow-y-auto">
                {searchResults.length > 0 ? (
                  <div className="divide-y">
                    {searchResults.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => goToWedding(event.event_link)}
                        className="w-full p-4 flex items-center gap-4 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                          💍
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {event.bride_full_name} & {event.groom_full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            📅 {new Date(event.event_date).toLocaleDateString('tr-TR')}
                          </div>
                        </div>
                        <span className="text-blue-500 text-xl">→</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <Image src="/search1.png" alt="Ara" width={48} height={48} className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Sonuç bulunamadı</p>
                    <p className="text-sm mt-1">Farklı bir isim deneyin</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="text-center text-gray-400 text-sm mt-4">
            * Sadece &quot;Herkese Açık&quot; olarak ayarlanan nikahlar arama sonuçlarında görünür
          </p>
        </div>
      </section>

      {/* NASIL ÇALIŞIR */}
      <section id="nasil-calisir" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Nasıl Çalışır?</h2>
            <p className="text-lg text-gray-600">3 kolay adımda nikahınızı canlı yayınlayın ve misafirlerinizden altın toplayın</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
                📱
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">1. Uygulamayı İndirin</h3>
              <p className="text-gray-600">App Store veya Google Play&apos;den Nikahım uygulamasını indirin</p>
            </div>

            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
                💍
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">2. Nikahınızı Oluşturun</h3>
              <p className="text-gray-600">Nikah bilgilerinizi girin, davetiye şablonu seçin ve ödeme almak için IBAN bilgilerinizi ekleyin</p>
            </div>

            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
                🎥
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">3. Yayına Geçin</h3>
              <p className="text-gray-600">Tek tuşla canlı yayını başlatın, sevdikleriniz uzaktan izlesin</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 bg-gradient-to-br from-yellow-200 to-yellow-300 rounded-full flex items-center justify-center shadow-lg">
                <Image src="/altintak.png" alt="Altın" width={80} height={80} className="object-contain" />
              </div>
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">🎉 Altınlarınızı Toplayın!</h3>
              <p className="text-lg text-gray-700">
                Nikahınıza online katılan davetlileriniz size altın taksın. 
                QR kod veya IBAN ile kolayca hesabınıza ödeme yapsınlar, siz takılan altınları uygulama üzerinden takip edin.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* NEDEN NİKAHIM */}
      <section id="neden-nikahim" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Neden <span className="text-blue-500">Nikahım</span> ile Canlı Yayın?
            </h2>
            <p className="text-lg text-gray-600">Özel gününüzü daha özel kılan özellikler</p>
          </div>

          <div className="space-y-6">
            {/* Özellik 1 */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start gap-6 hover:shadow-lg transition-shadow">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-blue-400/80 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                  🔐
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-blue-400/80 text-white text-sm font-bold px-3 py-1 rounded-full">1</span>
                  <h3 className="text-xl font-bold text-gray-900">Size Özel Canlı Yayın Sayfası</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Sadece sizin ve davetlilerinizin olduğu bir Canlı Yayın sayfası oluşturulur. 
                  Dilerseniz nikahınızı <strong>&quot;Herkese Kapalı&quot;</strong> olarak seçerek sadece link paylaştığınız 
                  davetlilerinizin katılmasını sağlayabilirsiniz.
                </p>
              </div>
            </div>

            {/* Özellik 2 */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start gap-6 hover:shadow-lg transition-shadow">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-purple-400/80 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                  👆
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-purple-400/80 text-white text-sm font-bold px-3 py-1 rounded-full">2</span>
                  <h3 className="text-xl font-bold text-gray-900">Tek Tıkla Katılım - Üyelik Yok, Form Yok!</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Nikahınızı oluşturduktan sonra sizin için hazırlanan canlı yayın sayfanızın linkini 
                  dijital davetiyeniz ile birlikte davetlilerinize gönderin. 
                  <strong> Tek tıkla</strong> direkt canlı yayın sayfanızdan nikahınıza katılsınlar!
                </p>
              </div>
            </div>

            {/* Özellik 3 */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start gap-6 hover:shadow-lg transition-shadow">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-yellow-400/80 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                  💰
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-yellow-400/80 text-white text-sm font-bold px-3 py-1 rounded-full">3</span>
                  <h3 className="text-xl font-bold text-gray-900">Kolayca Altın Takma</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Canlı yayın sayfanızdaki <strong>&quot;Altın Tak&quot;</strong> seçeneği ile QR kod veya Havale/EFT ile 
                  davetlileriniz direkt olarak sizin hesabınıza para gönderimi yapabilirler. 
                  Böylece uzakta olup nikahınıza gelemeyen sevdikleriniz de altın miktarı kadar Türk Lirasını 
                  size ulaştırmış olurlar.
                </p>
              </div>
            </div>

            {/* Özellik 4 - Video Tebrik */}
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start gap-6 hover:shadow-lg transition-shadow">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-rose-400/80 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                  🎥
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-rose-400/80 text-white text-sm font-bold px-3 py-1 rounded-full">4</span>
                  <h3 className="text-xl font-bold text-gray-900">Video Tebrik Mesajları</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  <strong>Tüm paketlerimizde</strong> ücretsiz olarak bulunan Video Tebrik özelliği ile töreninizi 
                  canlı izleyen davetliler size video tebrik mesajlarını gönderir. Siz de daha sonra bu videoları 
                  uygulamamız üzerinden izleyebilirsiniz.
                </p>
              </div>
            </div>

            {/* Özellik 5 */}
            <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start gap-6 hover:shadow-lg transition-shadow">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-green-400/80 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                  💌
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-green-400/80 text-white text-sm font-bold px-3 py-1 rounded-full">5</span>
                  <h3 className="text-xl font-bold text-gray-900">Size Özel Dijital Davetiye</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  <strong>Tüm paketlerimizde</strong> bulunan size özel dijital davetiye ile nikahınıza gelemeyenleri 
                  canlı yayınıza davet edin! WhatsApp, Instagram ve diğer platformlardan kolayca paylaşın.
                </p>
              </div>
            </div>

            {/* Özellik 6 */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start gap-6 hover:shadow-lg transition-shadow">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-indigo-400/80 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                  📊
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-indigo-400/80 text-white text-sm font-bold px-3 py-1 rounded-full">6</span>
                  <h3 className="text-xl font-bold text-gray-900">Detaylı Takip ve İstatistik</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Nikahınız tamamlandıktan sonra uygulamamız üzerinden canlı yayınınıza <strong>kimlerin katıldığını</strong>, 
                  <strong> ne mesaj bıraktığını</strong>, hatta <strong>hangi altından size taktıklarını</strong> kolayca takip edin!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PAKETLER */}
      <section id="paketler" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Paketler</h2>
            <p className="text-lg text-gray-600">Size uygun paketi seçin</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* TEMEL PAKET */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 text-center hover:border-blue-300 transition-colors">
              <div className="text-4xl mb-4">🎬</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Temel</h3>
              <div className="text-3xl font-bold text-blue-500 mb-1">₺299</div>
              <p className="text-sm text-gray-500 mb-6">Tek seferlik ödeme</p>
              <ul className="text-gray-600 space-y-3 mb-6 text-left">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 15 Dakika Canlı Yayın
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 20 İzleyici Kapasitesi
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 720p HD Kalite*
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Dijital Davetiye
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Altın Takma Özelliği
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Canlı Sohbet
                </li>
                <li className="flex items-center gap-2 text-gray-400">
                  <span className="text-red-400">✗</span> Yayın Kaydı
                </li>
                <li className="flex items-center gap-2 text-gray-400">
                  <span className="text-red-400">✗</span> Kaydı İndirme
                </li>
              </ul>
              <button onClick={() => setShowAppPopup(true)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition-colors">
                Seç
              </button>
            </div>

            {/* PREMIUM PAKET */}
            <div className="bg-white border-2 border-blue-500 rounded-2xl p-8 text-center relative shadow-xl scale-105">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg">
                ⭐ En Popüler
              </div>
              <div className="text-4xl mb-4">⭐</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Premium</h3>
              <div className="text-3xl font-bold text-blue-500 mb-1">₺499</div>
              <p className="text-sm text-gray-500 mb-6">Tek seferlik ödeme</p>
              <ul className="text-gray-600 space-y-3 mb-6 text-left">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 30 Dakika Canlı Yayın
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 50 İzleyici Kapasitesi
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 1080p Full HD Kalite*
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Dijital Davetiye
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Altın Takma Özelliği
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Canlı Sohbet
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Yayın Kaydı
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Kaydı İndirme
                </li>
              </ul>
              <button onClick={() => setShowAppPopup(true)} className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition-colors">
                Seç
              </button>
            </div>

            {/* VIP PAKET */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 text-center hover:border-yellow-400 transition-colors">
              <div className="text-4xl mb-4">👑</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">VIP</h3>
              <div className="text-3xl font-bold text-blue-500 mb-1">₺1.199</div>
              <p className="text-sm text-gray-500 mb-6">Tek seferlik ödeme</p>
              <ul className="text-gray-600 space-y-3 mb-6 text-left">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 60 Dakika Canlı Yayın
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 100 İzleyici Kapasitesi
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 1080p Full HD Kalite*
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Dijital Davetiye
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Altın Takma Özelliği
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Canlı Sohbet
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Yayın Kaydı
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Kaydı İndirme
                </li>
              </ul>
              <button onClick={() => setShowAppPopup(true)} className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 py-3 rounded-xl font-semibold transition-colors">
                Seç
              </button>
            </div>
          </div>

          <p className="text-center text-gray-400 text-sm mt-8">
            * Canlı yayın çözünürlük kalitesi internet bağlantınıza bağlıdır, değişiklik gösterebilir.
          </p>
        </div>
      </section>

      {/* SSS */}
      <section id="sss" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Sıkça Sorulan Sorular</h2>
          </div>

          <div className="space-y-4">
            {[
              { q: "Canlı yayın nasıl başlatılır?", a: "Uygulamayı indirin, nikahınızı oluşturun ve 'Canlı Yayın Başlat' butonuna basın. İnternet bağlantınızın stabil olduğundan emin olun." },
              { q: "Altın takma nasıl çalışır?", a: "Davetlileriniz sizin paylaştığınız linke girer, altın seçer ve QR kod veya IBAN ile ödeme yapar. Siz 'Takılan Altınlar' sayfasından takip edersiniz." },
              { q: "Yayın kaydediliyor mu?", a: "Premium ve VIP paketlerde yayın otomatik olarak kaydedilir. Daha sonra dilediğiniz zaman izleyebilir ve indirebilirsiniz." },
              { q: "Kaç kişi aynı anda izleyebilir?", a: "İzleyici limiti seçtiğiniz pakete göre değişir. Temel pakette 20, Premium'da 50, VIP'de 100 kişi aynı anda izleyebilir." },
              { q: "Para doğrudan bize mi geliyor?", a: "Evet! Tüm ödemeler doğrudan sizin belirlediğiniz banka hesabına yapılır. Nikahım herhangi bir komisyon almaz." },
            ].map((faq, index) => (
              <div key={index} className="bg-gray-50 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full p-5 flex items-center justify-between text-left"
                >
                  <span className="font-semibold text-gray-900">{faq.q}</span>
                  <span className={`text-blue-500 transition-transform ${openFaq === index ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {openFaq === index && (
                  <div className="px-5 pb-5 text-gray-600">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* İLETİŞİM */}
      <section id="iletisim" className="py-20 bg-gray-50">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Bize Ulaşın</h2>
            <p className="text-lg text-gray-600">Sorularınız mı var? Size yardımcı olmaktan mutluluk duyarız!</p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm">
            {contactSuccess && (
              <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-xl text-center">
                ✅ Mesajınız başarıyla gönderildi! En kısa sürede size dönüş yapacağız.
              </div>
            )}

            <form className="space-y-5" onSubmit={sendContactForm}>
              <div className="grid md:grid-cols-2 gap-5">
                <input 
                  type="text" 
                  placeholder="Adınız Soyadınız" 
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none text-gray-900 placeholder:text-gray-500" 
                  required
                />
                <input 
                  type="email" 
                  placeholder="E-posta adresiniz" 
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none text-gray-900 placeholder:text-gray-500" 
                  required
                />
              </div>
              <select 
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none bg-white text-gray-900"
              >
                <option>Genel Soru</option>
                <option>Teknik Destek</option>
                <option>Ödeme Sorunu</option>
              </select>
              <textarea 
                rows={4} 
                placeholder="Mesajınız" 
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none resize-none text-gray-900 placeholder:text-gray-500"
                required
              ></textarea>
              <button 
                type="submit" 
                disabled={contactSending}
                className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                  contactSending 
                    ? 'bg-blue-300 cursor-not-allowed' 
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white`}
              >
                {contactSending ? 'Gönderiliyor...' : 'Gönder'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200 flex flex-wrap justify-center gap-6">
              <a href="mailto:destek@nikahim.com" className="flex items-center gap-2 text-gray-600 hover:text-blue-500">
                📧 destek@nikahim.com
              </a>
              <a href="https://wa.me/905366919361?text=Merhaba%20nikahim.com%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum." target="_blank" className="flex items-center gap-2 text-gray-600 hover:text-green-500">
                <Image src="/whatsapp.png" alt="WhatsApp" width={24} height={24} className="w-6 h-6" />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-500 to-blue-600">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
            Nikahınızı canlı yayınlamaya hazır mısınız?
          </h2>
          <p className="text-white/80 mb-8">
            Hemen uygulamayı indirin ve özel gününüzü planlayın!
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Image src="/appstore.png" alt="App Store" width={140} height={45} className="h-11 w-auto cursor-pointer hover:opacity-80" onClick={() => setShowAppPopup(true)} />
            <Image src="/playstore.png" alt="Google Play" width={140} height={45} className="h-11 w-auto cursor-pointer hover:opacity-80" onClick={() => setShowAppPopup(true)} />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image src="/logo.png" alt="Nikahım" width={32} height={32} className="rounded-full" />
                <span className="font-bold">Nikahım</span>
              </div>
              <p className="text-gray-400 text-sm">Sevdikleriniz uzakta olsa bile özel gününüzde yanınızda olsun.</p>
            </div>

            <div>
              <h4 className="font-bold mb-4">İndir</h4>
              <div className="space-y-2">
                <Image src="/appstore.png" alt="App Store" width={120} height={40} className="h-9 w-auto cursor-pointer" onClick={() => setShowAppPopup(true)} />
                <Image src="/playstore.png" alt="Google Play" width={120} height={40} className="h-9 w-auto cursor-pointer" onClick={() => setShowAppPopup(true)} />
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-4">Keşfet</h4>
              <div className="space-y-2 text-sm">
                <button onClick={() => scrollToSection("nikah-ara")} className="block text-gray-400 hover:text-white">Nikah Ara</button>
                <button onClick={() => scrollToSection("nasil-calisir")} className="block text-gray-400 hover:text-white">Nasıl Çalışır</button>
                <button onClick={() => scrollToSection("neden-nikahim")} className="block text-gray-400 hover:text-white">Neden Nikahım</button>
                <button onClick={() => scrollToSection("paketler")} className="block text-gray-400 hover:text-white">Paketler</button>
                <button onClick={() => scrollToSection("sss")} className="block text-gray-400 hover:text-white">SSS</button>
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