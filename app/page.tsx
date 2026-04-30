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
  const [scrolled, setScrolled] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(1);

  interface Event {
    id: string;
    event_link: string;
    groom_full_name: string;
    bride_full_name: string;
    event_date: string;
    couple_photo_url?: string;
  }

  const [searchResults, setSearchResults] = useState<Event[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [allEvents, setAllEvents] = useState<Event[]>([]);

  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    if (hash.includes('access_token') || hash.includes('refresh_token') || search.includes('token_hash') || search.includes('code=')) {
      window.location.href = '/onay' + search + hash;
    }
  }, []);

  useEffect(() => { fetchEvents(); }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('event_date', { ascending: true });
    if (data) setAllEvents(data);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length >= 1) {
      const searchTerms = query.toLowerCase().split(" ").filter(t => t.length > 0);
      const results = allEvents.filter(event => {
        const combined = `${(event.groom_full_name || '').toLowerCase()} ${(event.bride_full_name || '').toLowerCase()}`;
        return searchTerms.every(term => combined.includes(term));
      });
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const goToWedding = (eventLink: string) => router.push(`/canli/${eventLink}`);

  const sendContactForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMessage) { alert('Lütfen tüm alanları doldurun.'); return; }
    setContactSending(true);
    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: 'service_ibwy6qp', template_id: 'template_yqt3v0n', user_id: 'gEM0kiWpFVk06tmCZ',
          template_params: { from_name: contactName, from_email: contactEmail, email: contactEmail, name: contactName, subject: contactSubject, message: contactMessage },
        }),
      });
      if (response.ok || (await response.text()) === 'OK') {
        setContactSuccess(true); setContactName(''); setContactEmail(''); setContactSubject('Genel Soru'); setContactMessage('');
        setTimeout(() => setContactSuccess(false), 3000);
      } else { throw new Error('Gönderilemedi'); }
    } catch { alert('Mesaj gönderilemedi. Lütfen tekrar deneyin.'); } finally { setContactSending(false); }
  };

  const scrollToSection = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); setMobileMenuOpen(false); };

  return (
    <main className="min-h-screen overflow-x-hidden" style={{ background: '#FAF7F5' }}>

      {showAppPopup && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowAppPopup(false)}>
          <div className="bg-white rounded-3xl p-10 max-w-sm w-full shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl overflow-hidden shadow-lg"><Image src="/icon.png" alt="Nikahım" width={80} height={80} className="w-full h-full object-cover" /></div>
            <p className="text-gray-500 text-center text-sm mb-8">Uygulamayı indirin ve nikahınızı planlayın</p>
            <div className="space-y-3">
              <a href="#" className="block"><Image src="/appstore.png" alt="App Store" width={200} height={60} className="h-14 w-auto mx-auto hover:opacity-80 transition-opacity" /></a>
              <a href="#" className="block"><Image src="/playstore.png" alt="Google Play" width={200} height={60} className="h-14 w-auto mx-auto hover:opacity-80 transition-opacity" /></a>
            </div>
            <button onClick={() => setShowAppPopup(false)} className="w-full mt-8 py-3 text-gray-400 hover:text-gray-600 font-medium text-sm transition-colors">Kapat</button>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'shadow-sm' : ''}`} style={{ background: scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.6)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-[80px]">
            <div className="flex items-center gap-0 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <Image src="/navbar-icon.png" alt="Nikahım" width={52} height={52} className="h-[52px] w-auto object-contain" />
              <Image src="/navbar-text.png" alt="Nikahım" width={280} height={80} className="h-[79px] w-auto object-contain -ml-2" />
            </div>
            <nav className="hidden lg:flex items-center gap-8">
              {[{ label: 'Ana Sayfa', id: 'hero' }, { label: 'Nikah Ara', id: 'nikah-ara' }, { label: 'Nasıl Çalışır', id: 'nasil-calisir' }, { label: 'Paketler', id: 'paketler' }, { label: 'SSS', id: 'sss' }].map((item) => (
                <button key={item.id} onClick={() => scrollToSection(item.id)} className="text-gray-500 hover:text-gray-900 font-medium text-[15px] transition-colors relative group">
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 rounded-full group-hover:w-full transition-all duration-300" style={{ background: '#C8686E' }} />
                </button>
              ))}
            </nav>
            <div className="hidden lg:flex items-center gap-3">
              <button onClick={() => setShowAppPopup(true)} className="text-white px-6 py-2.5 rounded-full font-semibold text-sm transition-all hover:shadow-lg hover:scale-105 btn-press" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)', boxShadow: '0 4px 16px rgba(200,104,110,0.25)' }}>Uygulamayı İndir</button>
            </div>
            <button className="lg:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
          {mobileMenuOpen && (
            <div className="lg:hidden py-6 border-t border-gray-100 animate-fade-in">
              <div className="flex flex-col gap-1">
                {[{ label: 'Ana Sayfa', id: 'hero' }, { label: 'Nikah Ara', id: 'nikah-ara' }, { label: 'Nasıl Çalışır', id: 'nasil-calisir' }, { label: 'Paketler', id: 'paketler' }, { label: 'SSS', id: 'sss' }].map((item) => (
                  <button key={item.id} onClick={() => scrollToSection(item.id)} className="text-gray-600 py-3 text-left font-medium hover:text-gray-900 transition-colors px-2 rounded-xl hover:bg-gray-50">{item.label}</button>
                ))}
                <button onClick={() => setShowAppPopup(true)} className="text-white py-3.5 rounded-2xl font-semibold mt-4 btn-press" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}>Uygulamayı İndir</button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* HERO */}
      <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #FBF8F5 0%, #F5F0EC 35%, #FDF5F3 65%, #FAF7F5 100%)' }} />
        <div className="absolute top-[-300px] right-[-200px] w-[900px] h-[900px] rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, #C8686E 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-200px] left-[-150px] w-[700px] h-[700px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #6FAFCF 0%, transparent 70%)' }} />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-0 w-full">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-[12px] lg:text-sm font-medium mb-6 mt-4 lg:mt-6 whitespace-nowrap" style={{ background: 'rgba(200,104,110,0.06)', color: '#C8686E', border: '1px solid rgba(200,104,110,0.12)' }}>
                <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: '#C8686E' }} />
                Türkiye&apos;nin İlk Nikah Canlı Yayın Platformu
              </div>
              <h1 className="text-[3.2rem] lg:text-[4.5rem] leading-[1.06] mb-8" style={{ fontFamily: 'var(--font-playfair)', letterSpacing: '-1px' }}>
                <span className="font-black text-gray-900">Nikahınızı</span><br /><span className="gradient-text-hero animate-glow font-bold">Canlı Yayınlayın</span>
              </h1>
              <p className="text-lg lg:text-[1.35rem] text-gray-400 mb-12 leading-relaxed max-w-[520px]">Sevdikleriniz nerede olursa olsun, en mutlu anınızı birlikte yaşayın. Canlı Yayın, Nikah Albümü, Online Altın Takma, Videolu Tebrik mesajları ve daha fazlası tek platformda!</p>
              <div className="flex flex-row gap-3 lg:gap-4 mb-16">
                <button onClick={() => setShowAppPopup(true)} className="flex-1 lg:flex-initial text-white px-4 py-4 lg:px-10 rounded-2xl font-semibold text-[15px] lg:text-[17px] transition-all hover:scale-[1.03] btn-press whitespace-nowrap" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E, #BE6065)', boxShadow: '0 8px 30px rgba(200,104,110,0.3), 0 4px 12px rgba(0,0,0,0.1)' }}>Nikah Oluştur</button>
                <button onClick={() => scrollToSection("nikah-ara")} className="flex-1 lg:flex-initial px-4 py-4 lg:px-10 rounded-2xl font-semibold text-[15px] lg:text-[17px] transition-all hover:scale-[1.03] btn-press border-2 whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.9)', borderColor: 'rgba(200,104,110,0.2)', color: '#C8686E', boxShadow: '0 6px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)' }}><span className="lg:hidden">Canlı İzle</span><span className="hidden lg:inline">Canlı Nikah İzle</span></button>
              </div>
              <div className="flex gap-5">
                {[
                  { num: '500', suffix: '+', label: 'Mutlu Çift', icon: '/couple-icon.png', iconSize: 'w-[70px] h-[70px]' },
                  { num: '10K', suffix: '+', label: 'İzleyici', icon: '/izleyici-icon-2.png', iconSize: 'w-[78px] h-[78px] -my-3 relative top-[3px]' }
                ].map((s, i) => (
                  <div key={i} className="group flex items-center gap-1 px-4 py-3 rounded-[16px] transition-all duration-300 hover:-translate-y-1 cursor-default" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(200,180,160,0.12)', boxShadow: '0 2px 16px rgba(0,0,0,0.03)' }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 40px rgba(200,104,110,0.1), 0 4px 12px rgba(0,0,0,0.04)'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.03)'; }}>
                    <div className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                      <Image src={s.icon} alt={s.label} width={72} height={72} className={`${s.iconSize} object-contain`} />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-[28px] md:text-[36px] font-bold text-gray-900 tracking-tight leading-none">{s.num}</span>
                        <span className="text-[22px] md:text-[28px] font-bold leading-none" style={{ color: '#C8686E' }}>{s.suffix}</span>
                      </div>
                      <div className="text-gray-600 text-[14px] mt-1.5 font-medium ml-1 whitespace-nowrap">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative w-full max-w-[420px]">
                <div className="absolute -inset-8 rounded-[2rem] blur-3xl opacity-[0.12]" style={{ background: 'linear-gradient(135deg, #C8686E, #6FAFCF)' }} />
                <div className="relative rounded-3xl overflow-hidden" style={{ boxShadow: '0 40px 100px rgba(200,100,100,0.25), 0 20px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.03)', aspectRatio: '4/5' }}>
                  <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '70% center' }}>
                    <source src="/hero-video.mp4" type="video/mp4" />
                  </video>
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, transparent 40%, rgba(0,0,0,0.15) 100%)' }} />
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 4px 20px rgba(239,68,68,0.35)' }}>
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />CANLI
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ÖZELLİK KARTLARI - Altın Toplama + Nikah Albümü */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-6 space-y-8">
          {/* Altınlarınızı Online Toplayın - kart */}
          <div className="relative rounded-3xl overflow-hidden" style={{ boxShadow: '0 16px 48px rgba(200,140,140,0.18), 0 4px 14px rgba(0,0,0,0.04)', border: '1px solid rgba(232,180,170,0.25)' }}>
            <img src="/altin-toplama-mobil.png" alt="" className="absolute inset-0 w-full h-full object-cover md:hidden pointer-events-none select-none" />
            <img src="/altin-toplama-masaustu.png" alt="" className="absolute inset-0 w-full h-full object-cover hidden md:block pointer-events-none select-none" />
            <div className="relative grid grid-cols-1 md:grid-cols-[32%_1fr] min-h-[320px] md:min-h-[300px]">
              <div className="hidden md:block" />
              <div className="p-5 md:py-10 md:pr-10 md:pl-8 flex flex-col justify-between min-h-[320px] md:min-h-[280px]">
                <div className="pl-[44%] md:pl-0 text-right md:text-left">
                  <h3 className="text-[26px] md:text-[40px] mb-0.5 md:mb-1 leading-[1.1]" style={{ fontFamily: 'var(--font-playfair)', color: '#2B2B2B', fontWeight: 600 }}>Altınlarınızı</h3>
                  <h3 className="text-[26px] md:text-[40px] italic mb-4 md:mb-4 leading-[1.1]" style={{ fontFamily: 'var(--font-playfair)', color: '#C8686E', fontWeight: 600 }}>Online Toplayın</h3>
                  <p className="text-[13px] md:text-[15px] leading-relaxed pl-[10%] md:pl-0" style={{ color: '#6E5A5A' }}>Davetlileriniz Havale/EFT veya Crypto ile doğrudan sizin hesabınıza ödeme yapsın.</p>
                </div>
                <div className="flex gap-2 flex-nowrap justify-end md:justify-start mt-5 md:mt-0">
                  {[
                    { label: 'Güvenilir', icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                    { label: 'Komisyon Yok', icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                    { label: 'Anında Ödeme', icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
                  ].map((b, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] md:text-[12px] font-semibold whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.85)', color: '#C8686E', border: '1px solid rgba(200,104,110,0.18)', boxShadow: '0 2px 6px rgba(200,104,110,0.06)' }}>{b.icon}{b.label}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Nikah Albümü - kart (dikey, 1 sütun) */}
          <div className="relative rounded-3xl overflow-hidden" style={{ boxShadow: '0 16px 48px rgba(200,140,140,0.16), 0 4px 14px rgba(0,0,0,0.04)', border: '1px solid rgba(232,180,170,0.25)' }}>
            <img src="/nikah-albumu-mobil.png" alt="" className="absolute inset-0 w-full h-full object-cover md:hidden pointer-events-none select-none" />
            <img src="/nikah-albumu-masaustu.png" alt="" className="absolute inset-0 w-full h-full object-cover hidden md:block pointer-events-none select-none" />
            <div className="relative px-6 pt-12 pb-8 md:px-10 md:pt-14 md:pb-10 flex flex-col items-center text-center">
              <h3 className="mb-5 self-center" style={{ color: '#5c4632', fontFamily: 'var(--font-script), cursive', fontWeight: 600, fontSize: '30px', letterSpacing: '1px', lineHeight: 1.1, textShadow: '0 2px 6px rgba(60,40,20,0.15), 0 1px 2px rgba(0,0,0,0.08)', paddingLeft: '10%' }}><span className="md:hidden">Nikah Albümü</span><span className="hidden md:inline" style={{ fontSize: '34px' }}>Nikah Albümü</span></h3>
              <div className="relative w-full flex items-center justify-center mb-6" style={{ perspective: '1000px', height: 175 }}>
                <div className="absolute" style={{ transform: 'translateX(-78px) translateY(8px) translateZ(-30px) rotateY(38deg)', zIndex: 1 }}>
                  <div className="bg-white p-1.5 rounded-lg" style={{ boxShadow: '0 6px 16px rgba(80,60,40,0.18)' }}>
                    <img src="/wedding1.jpg" alt="" className="block object-cover rounded-md" style={{ width: 96, height: 112 }} />
                  </div>
                </div>
                <div className="absolute" style={{ transform: 'translateX(78px) translateY(8px) translateZ(-30px) rotateY(-38deg)', zIndex: 1 }}>
                  <div className="bg-white p-1.5 rounded-lg" style={{ boxShadow: '0 6px 16px rgba(80,60,40,0.18)' }}>
                    <img src="/wedding3.jpg" alt="" className="block object-cover rounded-md" style={{ width: 96, height: 112 }} />
                  </div>
                </div>
                <div className="relative" style={{ transform: 'translateZ(60px)', zIndex: 3 }}>
                  <div className="bg-white p-1.5 rounded-lg" style={{ boxShadow: '0 16px 36px rgba(80,60,40,0.32), 0 4px 12px rgba(0,0,0,0.10)' }}>
                    <img src="/wedding2.jpg" alt="" className="block object-cover rounded-md" style={{ width: 120, height: 140 }} />
                  </div>
                </div>
              </div>
              <p className="text-[14px] md:text-[15px] leading-relaxed mb-4 max-w-2xl" style={{ color: '#6E5A5A' }}>Online Nikah albümünüzü oluşturun, siz veya nikahtaki sevdikleriniz fotoğraflarını yüklesin. Tüm nikah fotoğraflarınızı tek bir yerde toplayın.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { label: 'Birlikte Yükleyin', icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
                  { label: 'Tek Yerde Toplayın', icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
                ].map((b, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold" style={{ background: 'rgba(255,255,255,0.85)', color: '#9F4F58', border: '1px solid rgba(232,165,169,0.40)', boxShadow: '0 2px 6px rgba(200,104,110,0.06)' }}>{b.icon}{b.label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NİKAH ARA */}
      <section id="nikah-ara" className="py-28">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-5" style={{ fontFamily: 'var(--font-playfair)' }}>Katılmak için <span className="gradient-text">Nikah Arayın</span></h2>
            <p className="text-lg text-gray-400 max-w-xl mx-auto">Gelin veya Damat adı ile arayarak katılmak istediğiniz nikahı bulabilirsiniz</p>
          </div>
          <div className="relative max-w-2xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-3xl opacity-0 group-focus-within:opacity-100 transition-opacity blur-lg" style={{ background: 'linear-gradient(135deg, rgba(200,104,110,0.2), rgba(111,175,207,0.2))' }} />
              <div className="relative flex items-center">
                <svg className="absolute left-6 w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)} onFocus={(e) => { setTimeout(() => { e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300); }} placeholder="Örn: Ahmet, Ayşe, Yılmaz..." className="w-full pl-14 pr-14 py-5 text-lg rounded-2xl outline-none text-gray-900 placeholder:text-gray-300 transition-all shadow-lg border-2 border-transparent focus:border-[#C8686E]/30 focus:shadow-[0_8px_40px_rgba(200,104,110,0.12)]" style={{ background: '#F8F9FC' }} />
                {searchQuery && <button onClick={() => { setSearchQuery(""); setShowSearchResults(false); }} className="absolute right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-400 hover:bg-gray-300 hover:text-gray-600 transition-colors text-sm">✕</button>}
              </div>
            </div>
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl z-10 overflow-hidden max-h-80 overflow-y-auto border border-gray-100">
                {searchResults.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {searchResults.map((event) => (
                      <button key={event.id} onClick={() => goToWedding(event.event_link)} className="group w-full p-5 flex items-center gap-4 hover:bg-gradient-to-r hover:from-rose-50/50 hover:to-transparent transition-all text-left">
                        {event.couple_photo_url ? (
                          <Image src={event.couple_photo_url} alt="Çift" width={48} height={48} className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
                        ) : (
                          <Image src="/icon.png" alt="Nikahım" width={48} height={48} className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
                        )}
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{event.bride_full_name} & {event.groom_full_name}</div>
                          <div className="text-sm text-gray-400 mt-0.5">{new Date(event.event_date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        </div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1" style={{ background: 'rgba(200,104,110,0.1)' }}><svg className="w-4 h-4" style={{ color: '#C8686E' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center text-gray-300"><svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg><p className="font-medium text-gray-400">Sonuç bulunamadı</p><p className="text-sm mt-1">Farklı bir isim deneyin</p></div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* NASIL ÇALIŞIR */}
      <section id="nasil-calisir" className="py-28" style={{ background: 'linear-gradient(180deg, #F8F9FC 0%, #FFFFFF 100%)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-5" style={{ fontFamily: 'var(--font-playfair)' }}>3 Adımda <span className="gradient-text">Başlayın</span></h2>
            <p className="text-lg text-gray-400 max-w-xl mx-auto">Nikahınızı canlı yayınlamak hiç bu kadar kolay olmamıştı</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10 mb-20">
            {[
              { step: '01', title: 'Uygulamayı İndirin', desc: 'App Store veya Google Play\'den Nikahım uygulamasını ücretsiz indirin.', icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
              { step: '02', title: 'Nikahınızı Oluşturun', desc: 'Bilgilerinizi girin, davetiyenizi ve paket ayarlarınızı seçin.', icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg> },
              { step: '03', title: 'Yayına Geçin', desc: 'Tek tuşla canlı yayını başlatın, sevdikleriniz uzaktan izlesin.', icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> },
            ].map((item, i) => (
              <div key={item.step} className="premium-card group relative bg-white rounded-3xl p-10 border border-gray-100/80 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(200,104,110,0.1), rgba(200,104,110,0.05))', color: '#C8686E' }}>{item.icon}</div>
                  <span className="text-6xl font-bold text-gray-100 select-none">{item.step}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEDEN NİKAHIM */}
      <section id="neden-nikahim" className="py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-5" style={{ fontFamily: 'var(--font-playfair)' }}>Neden <span className="gradient-text">Nikahım?</span></h2>
            <p className="text-lg text-gray-400 max-w-xl mx-auto">Özel gününüzü daha özel kılan profesyonel özellikler</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: 'Size Özel Yayın Sayfası', desc: 'Sadece size ait bir yayın sayfası! Hem de dilerseniz nikahınızı herkese kapalı olarak ayarlayın ve sadece davetiyeli kişiler nikahınıza katılsın.', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> },
              { title: 'Tek Tıkla Katılım', desc: 'Davetlileriniz için üyelik gerekmez, uygulama indirmek gerekmez! Davetlileriniz link üzerinden tek tıkla nikahınıza katılsın.', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg> },
              { title: 'Online Altın Takma', desc: 'Havale/EFT veya Crypto ile altın takma. Tüm ödemeler direk sizin hesabınıza.', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg> },
              { title: 'Video ve Sesli Tebrik', desc: 'Davetlileriniz 30 saniyelik video veya 60 saniyelik sesli tebrik mesajı göndersin.', dualIcon: true, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>, icon2: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg> },
              { title: 'Özel Davetiye', desc: 'WhatsApp, Instagram ve diğer platformlardan kolayca paylaşabileceğiniz size özel davetiye.', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
              { title: 'Nikah Albümü', desc: 'Nikah Albümünüze hem siz hem de nikahta yanınızda olan sevdikleriniz fotoğraf yükleyebilir. Nikah boyunca çekilen tüm fotoğrafları tek bir yerde toplayabilirsiniz!', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
            ].map((feature, i) => (
              <div key={i} className="premium-card group p-8 rounded-3xl border border-gray-100 bg-white">
                <div className="flex gap-2 mb-6">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(200,104,110,0.08)', color: '#C8686E' }}>{feature.icon}</div>
                  {(feature as any).icon2 && <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(200,104,110,0.08)', color: '#C8686E' }}>{(feature as any).icon2}</div>}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed text-[15px]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PAKETLER */}
      <section id="paketler" className="py-28" style={{ background: 'linear-gradient(180deg, #F8F9FC 0%, #FFFFFF 100%)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-5" style={{ fontFamily: 'var(--font-playfair)' }}>Size Uygun <span className="gradient-text">Paketi Seçin</span></h2>
            <p className="text-lg text-gray-400">Tek seferlik ödeme, gizli masraf yok</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
            {[
              { id: 0, name: 'Standart', sub: 'Temel ihtiyaçlar için ideal', price: '₺499', oldPrice: '₺599', discountLabel: '%20 İndirim', badge: null, features: ['15 Dakika Canlı Yayın', '25 İzleyici', '720p HD*', 'Özel Davetiye Tasarımı', 'Video Tebrik', 'Sesli Tebrik', 'Mesajlı Tebrik'], disabled: ['Yayın Kaydı ve İndirme'] },
              { id: 1, name: 'Premium', sub: 'En çok tercih edilen', price: '₺599', oldPrice: '₺799', discountLabel: '%25 İndirim', badge: 'En Popüler', features: ['30 Dakika Canlı Yayın', '50 İzleyici', '1080p Full HD*', 'Özel Davetiye Tasarımı', 'Video Tebrik', 'Sesli Tebrik', 'Mesajlı Tebrik', 'Yayın Kaydı ve İndirme'], disabled: [] },
              { id: 2, name: 'VIP', sub: 'Maksimum deneyim', price: '₺999', oldPrice: '₺1.299', discountLabel: '%30 İndirim', badge: null, features: ['60 Dakika Canlı Yayın', '200 İzleyici', '1080p Full HD*', 'Özel Davetiye Tasarımı', 'Video Tebrik', 'Sesli Tebrik', 'Mesajlı Tebrik', 'Yayın Kaydı ve İndirme'], disabled: [] },
            ].map((pkg) => {
              const isSelected = selectedPackage === pkg.id;
              return (
                <div key={pkg.id} onClick={() => setSelectedPackage(pkg.id)} className={`relative rounded-3xl p-9 transition-all duration-500 cursor-pointer ${isSelected ? 'scale-[1.04] border-2' : 'border border-gray-100/80 hover:-translate-y-2'}`} style={isSelected ? { borderColor: '#C8686E', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', boxShadow: '0 20px 60px rgba(200,104,110,0.15), 0 8px 24px rgba(0,0,0,0.08)' } : { background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03)' }}>
                  {pkg.badge && <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-white px-6 py-1.5 rounded-full text-sm font-bold shadow-lg" style={{ background: 'linear-gradient(135deg, #D97070, #C8686E)', boxShadow: '0 4px 16px rgba(200,104,110,0.3)' }}>{pkg.badge}</div>}
                  <div className="absolute top-5 right-5 px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', boxShadow: '0 4px 12px rgba(239,68,68,0.25)' }}>{pkg.discountLabel}</div>
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{pkg.name}</h3>
                    <p className="text-sm text-gray-400">{pkg.sub}</p>
                    <div className="mt-5 flex items-baseline gap-3">
                      <span className="text-5xl font-bold" style={{ color: isSelected ? '#C8686E' : '#111827' }}>{pkg.price}</span>
                      <span className="text-xl font-medium text-gray-400 line-through">{pkg.oldPrice}</span>
                    </div>
                  </div>
                  <ul className="space-y-4 mb-9">
                    {pkg.features.map((f, i) => (<li key={i} className="flex items-center gap-3 text-sm text-gray-600"><div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `rgba(200,104,110,${isSelected ? '0.15' : '0.1'})` }}><svg className="w-3 h-3" style={{ color: '#C8686E' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>{f}</li>))}
                    {pkg.disabled.map((f, i) => (<li key={`d-${i}`} className="flex items-center gap-3 text-sm text-gray-300"><div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100"><svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></div>{f}</li>))}
                  </ul>
                  {isSelected ? (
                    <button onClick={() => setShowAppPopup(true)} className="w-full py-4 rounded-2xl font-semibold text-white transition-all hover:shadow-xl" style={{ background: 'linear-gradient(135deg, #D97070, #C8686E, #C06068)', boxShadow: '0 4px 20px rgba(200,104,110,0.3)' }}>Hemen Başla</button>
                  ) : (
                    <button onClick={() => setShowAppPopup(true)} className="w-full py-4 rounded-2xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all">Hemen Başla</button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-center text-gray-300 text-sm mt-10">* Canlı yayın çözünürlük kalitesi internet bağlantınıza bağlıdır.</p>
        </div>
      </section>

      {/* SSS */}
      <section id="sss" className="py-28">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Sıkça Sorulan <span className="gradient-text">Sorular</span></h2>
          </div>
          <div className="space-y-3">
            {[
              { q: "Nikahım platformu nasıl işler?", a: "Nikahım platformunda çiftler, Nikahım uygulamasını indirdikten sonra nikahlarını veya düğünlerini canlı yayınlayabilecekleri kendilerine özel bir internet sayfası oluştururlar. Nikahım'ın onlarca tasarımı arasından seçtikleri online davetiyelerini arkadaşlarına, akrabalarına ve sevdiklerine göndererek nikahlarına katılamayan kişilerin online olarak nikahlarına katılmalarını sağlarlar. Nikahım platformunun altın takma ve tebrik mesajı özellikleri sayesinde nikahlarını canlı izleyen kişiler, çifte takmak istedikleri altın miktarı kadar TL'yi çiftin hesabına direkt olarak Havale/EFT veya Crypto ile gönderebilir; isterlerse video, sesli veya yazılı tebrik mesajı gönderebilirler." },
              { q: "Online nikah sayfasında hangi özellikler var?", a: "Çiftlerin uygulamamız üzerinden oluşturduğu kendilerine özel canlı yayın sayfasında nikahlarını canlı yayınlayabilir, nikah gününden fotoğraflarını bu sayfada davetlileri ile paylaşabilir, altın takma özelliği ile davetlilerden ödeme kabul edebilir, tebrik bölümünde 3 yol ile (video, sesli ve yazılı) tebrik mesajlarını kabul edebilirler." },
              { q: "Nikahım platformu güvenilir mi?", a: "Nikahım.com kurulduğu günden beri çiftlerin mutluluğunu birinci önceliği olarak benimseyen bir aile kuruluşudur. Yapılan tüm maddi, görsel ve yazılı paylaşımlar sadece davetliler ve çift arasındadır. Nikahım kesinlikle bu bilgileri 3. şahıs veya kuruluşlarla paylaşmamaktadır. Nikahım platformunda davetliler tarafından yapılan tüm ödemeler direkt olarak çiftin kendi TL hesaplarına yapılmaktadır. Bu noktada Nikahım bir aracılık yapmamaktadır." },
              { q: "Altın takma sistemi nasıl çalışır?", a: "Altın takma bölümünde Nikahım platformu güncel altın fiyatlarını günlük olarak çeker ve çiftin canlı yayın sayfasında bu değerleri gösterir. Davetli kişi çifte altın takmak istediğinde altın türünü seçer ve buna denk gelen TL miktarı davetliye gösterilir. Davetli kişi Havale/EFT veya Crypto yöntemlerinden biri ile çiftin direkt hesabına kendi bankacılık uygulaması üzerinden para transferi yapar. Ardından canlı yayın sayfasına tekrar gelerek bu gönderimi onaylar. Bu onaylanan gönderimler çiftin uygulama sayfasında takılan altın olarak kayıt altına alınır." },
              { q: "Yayın kayıt ediliyor mu?", a: "Nikahım sayfasında yayınlanan tüm canlı yayınlar kayıt altına alınır ve canlı yayın sonlandırıldıktan birkaç dakika sonra video olarak aynı sayfada gösterilmeye devam edilir. Bu videolar 7 gün süre ile sayfada saklanır ve çift bu videoyu uygulamamız üzerinden 7 gün içerisinde indirebilir. 7 gün sonunda tüm video kayıtları otomatik olarak silinir." },
              { q: "Kaç kişi aynı anda izleyebilir?", a: "Nikahınızı kaç kişinin aynı anda canlı izleyebileceği sizin satın alacağınız pakete bağlıdır. Nikahım'ın en yüksek paketi olan VIP'de 200 davetli aynı anda nikahı izleyebilir. Bunun üzerindeki rakamlar için Nikahım destek ekibi ile iletişime geçmeniz gerekir." },
            ].map((faq, index) => (
              <div key={index} className="border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 transition-colors">
                <button onClick={() => setOpenFaq(openFaq === index ? null : index)} className="w-full p-6 flex items-center justify-between text-left">
                  <span className="font-semibold text-gray-900 pr-4">{faq.q}</span>
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-300 ${openFaq === index ? 'rotate-180' : ''}`} style={{ background: 'rgba(200,104,110,0.1)', color: '#C8686E' }}>▼</span>
                </button>
                {openFaq === index && <div className="px-6 pb-6 text-gray-500 leading-relaxed">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* İLETİŞİM */}
      <section id="iletisim" className="py-28" style={{ background: 'linear-gradient(180deg, #F8F9FC 0%, #FFFFFF 100%)' }}>
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>Bize <span className="gradient-text">Ulaşın</span></h2>
            <p className="text-lg text-gray-400">Sorularınız mı var? Size yardımcı olmaktan mutluluk duyarız</p>
          </div>
          <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100">
            {contactSuccess && <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-5 py-4 rounded-2xl text-center font-medium">Mesajınız başarıyla gönderildi!</div>}
            <form className="space-y-5" onSubmit={sendContactForm}>
              <div className="grid md:grid-cols-2 gap-5">
                <input type="text" placeholder="Adınız Soyadınız" value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:border-[#C8686E]/40 outline-none text-gray-900 placeholder:text-gray-300 bg-gray-50/50 focus:bg-white transition-all" required />
                <input type="email" placeholder="E-posta adresiniz" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:border-[#C8686E]/40 outline-none text-gray-900 placeholder:text-gray-300 bg-gray-50/50 focus:bg-white transition-all" required />
              </div>
              <textarea rows={4} placeholder="Mesajınız" value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:border-[#C8686E]/40 outline-none resize-none text-gray-900 placeholder:text-gray-300 bg-gray-50/50 focus:bg-white transition-all" required />
              <button type="submit" disabled={contactSending} className="w-full py-4 rounded-2xl font-semibold text-white transition-all hover:shadow-xl disabled:opacity-50" style={{ background: contactSending ? '#ccc' : 'linear-gradient(135deg, #D97070, #C8686E, #C06068)', boxShadow: contactSending ? 'none' : '0 4px 20px rgba(200,104,110,0.3)' }}>{contactSending ? 'Gönderiliyor...' : 'Gönder'}</button>
            </form>
            <div className="mt-8 pt-8 border-t border-gray-100 flex flex-wrap justify-center gap-8">
              <a href="mailto:destek@nikahim.com" className="flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-70" style={{ color: '#C8686E' }}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>destek@nikahim.com</a>
              <button onClick={() => window.dispatchEvent(new Event('nikahim:open-chat'))} className="flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-70" style={{ color: '#C8686E' }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,104,110,0.10)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-3 0h6M9 11V5a3 3 0 116 0v6a3 3 0 11-6 0z" /></svg>
                </span>
                Canlı Destek
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #C8686E, #A85359)' }}>
        <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at 30% 50%, #fff, transparent 50%), radial-gradient(circle at 70% 50%, #fff, transparent 50%)' }} />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-5">Nikahınızı canlı yayınlamaya hazır mısınız?</h2>
          <p className="text-white/60 mb-12 text-lg max-w-lg mx-auto">Hemen uygulamayı indirin ve özel gününüzü planlayın</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Image src="/appstore.png" alt="App Store" width={160} height={50} className="h-14 w-auto cursor-pointer hover:opacity-80 transition-opacity hover:scale-105" onClick={() => setShowAppPopup(true)} />
            <Image src="/playstore.png" alt="Google Play" width={160} height={50} className="h-14 w-auto cursor-pointer hover:opacity-80 transition-opacity hover:scale-105" onClick={() => setShowAppPopup(true)} />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div><div className="flex items-center gap-0 mb-4"><Image src="/navbar-icon.png" alt="Nikahım" width={52} height={52} className="h-[52px] w-auto object-contain" /><Image src="/navbar-text.png" alt="Nikahım" width={200} height={50} className="h-[78px] w-auto object-contain -ml-3" /></div><p className="text-gray-400 text-sm leading-relaxed">Sevdikleriniz uzakta olsa bile özel gününüzde yanınızda olsun.</p></div>
            <div><h4 className="font-bold mb-5 text-sm tracking-wider uppercase text-gray-300">Keşfet</h4><div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">{['Nikah Ara', 'Nasıl Çalışır', 'Neden Nikahım', 'Paketler', 'SSS'].map((label, i) => { const ids = ['nikah-ara', 'nasil-calisir', 'neden-nikahim', 'paketler', 'sss']; return <button key={i} onClick={() => scrollToSection(ids[i])} className="text-gray-400 hover:text-white transition-colors">{label}</button>; })}</div></div>
            <div><h4 className="font-bold mb-5 text-sm tracking-wider uppercase text-gray-300">Bizi Takip Edin</h4><a href="https://instagram.com/nikahim.co" target="_blank" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors"><Image src="/instagram.png" alt="Instagram" width={24} height={24} className="w-6 h-6 rounded" />@nikahim.co</a></div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">© 2025 Nikahim.com — Tüm hakları saklıdır.</div>
        </div>
      </footer>

    </main>
  );
}
