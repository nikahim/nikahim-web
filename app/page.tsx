"use client";

import { supabase } from '@/lib/supabase';
import { fullFaqCategories } from '@/lib/faq-data';
import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showAppPopup, setShowAppPopup] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactSubject, setContactSubject] = useState("Genel Soru");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSending, setContactSending] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(1);
  const [showConciergeSheet, setShowConciergeSheet] = useState(false);
  const [faqView, setFaqView] = useState(false);
  const [openFaqIdx, setOpenFaqIdx] = useState<string | null>(null);
  const [faqSearchQuery, setFaqSearchQuery] = useState('');

  // WhatsApp online durumu — Türkiye saatine göre 08:00–20:00 arası çevrim içi
  const [waOnline, setWaOnline] = useState(false);
  useEffect(() => {
    const check = () => {
      const istHour = parseInt(
        new Date().toLocaleString('en-US', { timeZone: 'Europe/Istanbul', hour: 'numeric', hour12: false }),
        10
      );
      setWaOnline(istHour >= 8 && istHour < 20);
    };
    check();
    const t = setInterval(check, 60_000); // her dakika güncelle
    return () => clearInterval(t);
  }, []);

  // ConciergeSheet FAQ — Nikahım Çarşı için backend data var ama frontend'de görünmez.
  // Search: Türkçe karakter normalize + token AND (her kelime ayrı aranır, hepsi geçmeli).
  const filteredFaqCategories = useMemo(() => {
    const HIDDEN_CATEGORIES = ['Nikahım Çarşı'];
    const visible = fullFaqCategories.filter(c => !HIDDEN_CATEGORIES.includes(c.title));

    // Türkçe karakterleri Latin'e indirger (ı→i, İ→i, ş→s, ğ→g, ü→u, ö→o, ç→c)
    const normalize = (s: string) =>
      s.toLowerCase()
        .replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/i̇/g, 'i')
        .replace(/ş/g, 's').replace(/Ş/g, 's')
        .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
        .replace(/ü/g, 'u').replace(/Ü/g, 'u')
        .replace(/ö/g, 'o').replace(/Ö/g, 'o')
        .replace(/ç/g, 'c').replace(/Ç/g, 'c')
        .replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u');

    const query = normalize(faqSearchQuery.trim());
    if (!query) return visible;

    // Sorgu kelimelerini ayır (boşluk ile)
    const tokens = query.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return visible;

    return visible
      .map(cat => ({
        ...cat,
        items: cat.items.filter(item => {
          // Haystack = soru + cevap + (varsa) keywords — hepsi normalize
          const haystack = normalize(
            item.q + ' ' + item.a + ' ' + (item.keywords?.join(' ') || '')
          );
          // Her token haystack'te bulunmalı (AND)
          return tokens.every(t => haystack.includes(t));
        }),
      }))
      .filter(cat => cat.items.length > 0);
  }, [faqSearchQuery]);

  const totalFaqResults = useMemo(
    () => filteredFaqCategories.reduce((sum, cat) => sum + cat.items.length, 0),
    [filteredFaqCategories]
  );
  interface Event {
    id: string;
    event_link: string;
    groom_full_name: string;
    bride_full_name: string;
    event_date: string;
    couple_photo_url?: string;
  }

  const [searchResults, setSearchResults] = useState<Event[]>([]);
  const [demoUserId, setDemoUserId] = useState<string | null>(null);
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

  // E-posta/harici linkten ?indir=1 ile uygulama indirme modal'ını aç
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.get('indir') === '1' || p.get('app') === '1') setShowAppPopup(true);
    } catch { /* yoksay */ }
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('event_date', { ascending: true });
    if (data) setAllEvents(data);
    // Demo user_id'yi de çek — search sonuçlarında "Örnek Yayın" etiketi için
    try {
      const res = await fetch('/api/demo-event');
      const j = await res.json().catch(() => ({}));
      if (j?.user_id) setDemoUserId(j.user_id);
    } catch {}
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
      // 1) Panele destek talebi olarak düşür (birincil)
      const ticket_number = ('NKH-' + Math.random().toString(36).slice(2, 8)).toUpperCase();
      const { error: tErr } = await supabase.from('support_tickets').insert({
        ticket_number,
        user_name: contactName,
        user_email: contactEmail,
        subject: contactSubject || 'Bize Ulaşın',
        source: 'web',
        status: 'open',
        conversation: [{ role: 'user', content: contactMessage }],
      });
      if (tErr) throw tErr;

      // 2) E-posta kopyası (best-effort — hata olsa da talep açıldı)
      try {
        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: 'service_ibwy6qp', template_id: 'template_yqt3v0n', user_id: 'gEM0kiWpFVk06tmCZ',
            template_params: { from_name: contactName, from_email: contactEmail, email: contactEmail, name: contactName, subject: contactSubject, message: contactMessage },
          }),
        });
      } catch {}

      setContactSuccess(true); setContactName(''); setContactEmail(''); setContactSubject('Genel Soru'); setContactMessage('');
      setTimeout(() => setContactSuccess(false), 3000);
    } catch { alert('Mesaj gönderilemedi. Lütfen tekrar deneyin.'); } finally { setContactSending(false); }
  };

  const scrollToSection = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); setMobileMenuOpen(false); };

  return (
    <main className="min-h-screen overflow-x-hidden" style={{ background: '#FAF7F5' }}>

      {/* CONCIERGE SHEET — sağdan kayar premium yardım paneli */}
      {showConciergeSheet && (
        <div className="fixed inset-0 z-[9998] flex justify-end"
             onClick={() => { setShowConciergeSheet(false); setFaqView(false); setOpenFaqIdx(null); }}
             style={{
               background: 'rgba(20,15,12,0.32)',
               backdropFilter: 'blur(8px)',
               WebkitBackdropFilter: 'blur(8px)',
               animation: 'conciergeFade 320ms ease',
             }}>
          <style>{`
            @keyframes conciergeFade { from { opacity: 0; } to { opacity: 1; } }
            @keyframes conciergeSlide {
              from { transform: translateX(100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
            .concierge-sheet { animation: conciergeSlide 460ms cubic-bezier(0.34, 1.56, 0.64, 1); }
            .concierge-item { transition: transform 220ms ease, background 280ms ease; }
            .concierge-item:active { transform: scale(0.98); }
            .concierge-item:hover {
              background: linear-gradient(180deg, rgba(255,251,247,0.98) 0%, rgba(253,243,243,0.95) 100%) !important;
            }
          `}</style>
          <div
            className="concierge-sheet relative h-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '82%',
              maxWidth: '380px',
              background: 'linear-gradient(180deg, rgba(255,252,249,0.97) 0%, rgba(253,245,240,0.97) 100%)',
              backdropFilter: 'blur(32px) saturate(180%)',
              WebkitBackdropFilter: 'blur(32px) saturate(180%)',
              boxShadow: '-24px 0 60px rgba(60,40,40,0.20), -8px 0 18px rgba(160,80,90,0.10), inset 1px 0 0 rgba(255,255,255,0.95)',
              borderLeft: '1px solid rgba(232,180,170,0.30)',
            }}>
            <button
              onClick={() => { setShowConciergeSheet(false); setFaqView(false); setOpenFaqIdx(null); }}
              aria-label="Kapat"
              className="absolute top-5 right-5 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-[1.08] active:scale-[0.94]"
              style={{
                background: 'rgba(255,255,255,0.70)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(200,104,110,0.14)',
                boxShadow: '0 2px 8px rgba(160,80,90,0.06)',
              }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="#9F4F58" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="px-7 pt-6 pb-6" style={{ borderBottom: '1px solid rgba(232,180,170,0.18)' }}>
              <Image src="/navbar-text.png" alt="Nikahım" width={320} height={96} className="h-[40px] w-auto object-contain -ml-0.5 -mb-1" />
              <h2 className="font-bold text-[24px] leading-[1.15]" style={{ fontFamily: 'var(--font-playfair)', color: '#1F1F1F' }}>
                Destek
              </h2>
              <p className="mt-2 text-[13px]" style={{ color: '#6B5A5A' }}>
                Aklınızdaki tüm sorular için buradayız
              </p>
            </div>

            {!faqView && (
            <>

            <div className="px-5 pb-8 space-y-2.5">
              <button
                onClick={() => {
                  setShowConciergeSheet(false);
                  setTimeout(() => { window.dispatchEvent(new CustomEvent('nikahim:open-chat')); }, 200);
                }}
                className="concierge-item w-full flex items-center gap-3.5 p-4 rounded-2xl text-left"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,251,247,0.85) 0%, rgba(253,243,243,0.80) 100%)',
                  border: '1px solid rgba(232,180,170,0.25)',
                  boxShadow: '0 2px 10px rgba(200,104,110,0.06), inset 0 1px 0 rgba(255,255,255,0.85)',
                }}>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                     style={{ background: 'linear-gradient(135deg, rgba(232,165,169,0.35), rgba(200,104,110,0.20))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="#9F4F58" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M21 11.5a8.5 8.5 0 01-12.5 7.5L3 21l1.9-5.7A8.5 8.5 0 1121 11.5z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[14.5px]" style={{ color: '#1F1F1F' }}>Canlı Destek</p>
                    <span className="flex items-center">
                      {['/asistan-elif.png', '/asistan-tugce.png', '/asistan-yusuf.png'].map((im, i) => (
                        <span key={im} className="w-6 h-6 rounded-full overflow-hidden bg-white" style={{ border: '1.5px solid #fff', marginLeft: i === 0 ? 0 : -8, boxShadow: '0 1px 4px rgba(200,104,110,0.2)', zIndex: 3 - i }}>
                          <img src={im} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        </span>
                      ))}
                    </span>
                  </div>
                  <p className="text-[12px] mt-0.5" style={{ color: '#8A7878' }}>Destek Asistanlarımız ile anlık sohbet</p>
                  <p className="text-[11px] mt-1 inline-flex items-center gap-1" style={{ color: '#3FB95A' }}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Çevrim içi
                  </p>
                </div>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#B5A8A8" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <a
                href="https://wa.me/905366919361?text=Merhaba%20%21%20Nikah%C4%B1m%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowConciergeSheet(false)}
                className="concierge-item w-full flex items-center gap-3.5 p-4 rounded-2xl text-left"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,251,247,0.85) 0%, rgba(253,243,243,0.80) 100%)',
                  border: '1px solid rgba(232,180,170,0.25)',
                  boxShadow: '0 2px 10px rgba(200,104,110,0.06), inset 0 1px 0 rgba(255,255,255,0.85)',
                }}>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                     style={{ background: 'linear-gradient(135deg, rgba(170,225,180,0.45), rgba(60,180,80,0.18))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)' }}>
                  <svg className="w-5 h-5" fill="#1E8E3E" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[14.5px]" style={{ color: '#1F1F1F' }}>WhatsApp</p>
                  <p className="text-[12px] mt-0.5" style={{ color: '#8A7878' }}>Mesaj bırakın, ekibimiz sizinle iletişime geçsin.</p>
                  <p className="text-[11px] mt-1 inline-flex items-center gap-1" style={{ color: waOnline ? '#1E8E3E' : '#9CA3AF' }}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${waOnline ? 'animate-pulse' : ''}`} style={{ background: waOnline ? '#3FB95A' : '#B5B5B5' }} />
                    {waOnline ? 'Çevrim içi' : 'Çevrim dışı'}
                  </p>
                </div>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#B5A8A8" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>

              <a
                href="mailto:destek@nikahim.com?subject=Yardım%20Talebi"
                onClick={() => setShowConciergeSheet(false)}
                className="concierge-item w-full flex items-center gap-3.5 p-4 rounded-2xl text-left"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,251,247,0.85) 0%, rgba(253,243,243,0.80) 100%)',
                  border: '1px solid rgba(232,180,170,0.25)',
                  boxShadow: '0 2px 10px rgba(200,104,110,0.06), inset 0 1px 0 rgba(255,255,255,0.85)',
                }}>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                     style={{ background: 'linear-gradient(135deg, rgba(245,225,200,0.40), rgba(212,168,82,0.20))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="#A0782E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <rect x="3" y="5" width="18" height="14" rx="2.5" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[14.5px]" style={{ color: '#1F1F1F' }}>E-posta</p>
                  <p className="text-[12px] mt-0.5" style={{ color: '#8A7878' }}>Sorularınızı e-posta yoluyla iletebilirsiniz.</p>
                  <p className="text-[11px] mt-1 font-medium" style={{ color: '#A0782E' }}>
                    destek@nikahim.com
                  </p>
                </div>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#B5A8A8" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>

              <button
                onClick={() => setFaqView(true)}
                className="concierge-item w-full flex items-center gap-3.5 p-4 rounded-2xl text-left"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,251,247,0.85) 0%, rgba(253,243,243,0.80) 100%)',
                  border: '1px solid rgba(232,180,170,0.25)',
                  boxShadow: '0 2px 10px rgba(200,104,110,0.06), inset 0 1px 0 rgba(255,255,255,0.85)',
                }}>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                     style={{ background: 'linear-gradient(135deg, rgba(220,210,235,0.45), rgba(160,140,200,0.18))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="#6B5BA5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9.5" strokeWidth="1.5" />
                    <path d="M9.5 9c0-1.5 1.2-2.5 2.5-2.5s2.5 1 2.5 2.5c0 1.2-1 1.8-1.8 2.2-0.5 0.3-0.7 0.7-0.7 1.3" />
                    <circle cx="12" cy="16.5" r="0.6" fill="#6B5BA5" stroke="none" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[14.5px]" style={{ color: '#1F1F1F' }}>Sık Sorulan Sorular</p>
                  <p className="text-[12px] mt-0.5" style={{ color: '#8A7878' }}>En çok sorulan sorulara göz atın</p>
                </div>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#B5A8A8" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            </>
            )}

            {/* FAQ inline view — kategorize accordion + search */}
            {faqView && (
              <div className="px-5 pt-5 pb-10">
                <button onClick={() => { setFaqView(false); setOpenFaqIdx(null); setFaqSearchQuery(''); }}
                        className="inline-flex items-center gap-1.5 mb-4 text-[12.5px] font-medium px-3 py-1.5 rounded-full transition-all hover:scale-[1.03]"
                        style={{ color: '#9F4F58', background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(232,180,170,0.30)' }}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Destek menüsü
                </button>
                <h3 className="font-bold text-[20px] mb-2" style={{ fontFamily: 'var(--font-playfair)', color: '#1F1F1F' }}>
                  Sık Sorulan Sorular
                </h3>
                <p className="text-[12.5px] mb-4 leading-relaxed" style={{ color: '#6B5A5A' }}>
                  Aradığınız cevabı saniyeler içinde bulun.
                </p>

                {/* Search input */}
                <div className="relative mb-4">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" stroke="#B5A8A8" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="7" />
                    <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
                  </svg>
                  <input
                    type="text"
                    value={faqSearchQuery}
                    onChange={(e) => { setFaqSearchQuery(e.target.value); setOpenFaqIdx(null); }}
                    placeholder="Anahtar kelime yazın..."
                    className="w-full pl-9 pr-9 py-2.5 rounded-full text-[13px] outline-none transition-all focus:scale-[1.01]"
                    style={{
                      background: 'rgba(255,255,255,0.85)',
                      border: '1px solid rgba(232,180,170,0.35)',
                      boxShadow: '0 2px 8px rgba(200,104,110,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
                      color: '#2B2B2B',
                    }}
                  />
                  {faqSearchQuery && (
                    <button onClick={() => setFaqSearchQuery('')}
                            aria-label="Aramayı temizle"
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                            style={{ background: 'rgba(200,104,110,0.12)', color: '#9F4F58' }}>
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Sonuç sayısı — sadece arama varken göster */}
                {faqSearchQuery && (
                  <p className="text-[11.5px] mb-3" style={{ color: '#8A7878' }}>
                    {totalFaqResults > 0
                      ? `${totalFaqResults} sonuç bulundu`
                      : 'Sonuç bulunamadı'}
                  </p>
                )}

                {/* Boş sonuç + canlı destek CTA */}
                {faqSearchQuery && totalFaqResults === 0 && (
                  <div className="rounded-2xl p-5 text-center"
                       style={{ background: 'linear-gradient(135deg, #FBEEEC 0%, #FDF5F2 100%)', border: '1px solid rgba(200,104,110,0.18)' }}>
                    <p className="text-[13px] font-semibold mb-1" style={{ color: '#1F1F1F' }}>
                      Aradığınızı bulamadınız mı?
                    </p>
                    <p className="text-[12px] mb-3" style={{ color: '#6B5A5A' }}>
                      Ekibimiz size yardımcı olmaktan mutluluk duyar.
                    </p>
                    <button onClick={() => {
                              setShowConciergeSheet(false);
                              setTimeout(() => { window.dispatchEvent(new CustomEvent('nikahim:open-chat')); }, 200);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-[12.5px] font-semibold transition-all hover:scale-[1.03]"
                            style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)', boxShadow: '0 4px 14px rgba(200,104,110,0.25)' }}>
                      Canlı Destek Aç
                    </button>
                  </div>
                )}

                {/* Kategorize FAQ listesi */}
                {filteredFaqCategories.map((category, ci) => (
                  <div key={category.title} className={ci === 0 ? '' : 'mt-5'}>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#C8686E' }} />
                      <h4 className="text-[12px] font-bold uppercase tracking-[0.8px]" style={{ color: '#9F4F58' }}>
                        {category.title}
                      </h4>
                    </div>
                    <div className="space-y-2.5">
                      {category.items.map((item, ii) => {
                        const key = `${ci}-${ii}`;
                        const open = openFaqIdx === key;
                        return (
                          <div key={key} className="rounded-2xl overflow-hidden transition-all duration-300"
                               style={{
                                 background: open ? 'rgba(255,251,247,0.97)' : 'rgba(255,251,247,0.55)',
                                 border: open ? '1px solid rgba(200,104,110,0.40)' : '1px solid rgba(232,180,170,0.30)',
                                 boxShadow: open ? '0 8px 28px rgba(200,104,110,0.12), 0 2px 6px rgba(0,0,0,0.04)' : 'none',
                               }}
                               onMouseEnter={(e) => { if (!open) e.currentTarget.style.borderColor = 'rgba(200,104,110,0.30)'; }}
                               onMouseLeave={(e) => { if (!open) e.currentTarget.style.borderColor = 'rgba(232,180,170,0.30)'; }}>
                            <button onClick={() => setOpenFaqIdx(open ? null : key)}
                                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left">
                              <span className="text-[13px] leading-snug" style={{ fontWeight: 600, color: '#2E3445' }}>{item.q}</span>
                              <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                                    style={{ background: 'rgba(200,104,110,0.10)', color: '#C8686E' }}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </span>
                            </button>
                            {open && (
                              <div className="px-4 pb-4 pt-0 text-[12.5px] leading-relaxed" style={{ color: '#6B5A5A' }}>
                                {item.a}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!faqView && (
            <div className="absolute bottom-5 left-0 right-0 text-center pointer-events-none">
              <p className="text-[11px] tracking-[0.3px] inline-flex items-center gap-1.5" style={{ color: '#9F4F58' }}>
                Nikahım ekibi her zaman yanınızda
                <svg className="w-3 h-3" fill="#9F4F58" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </p>
            </div>
            )}
          </div>
        </div>
      )}

      {showAppPopup && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowAppPopup(false)} style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
          <div className="relative rounded-[28px] px-8 lg:px-10 pt-7 pb-16 lg:pt-9 lg:pb-20 max-w-md w-full animate-scale-in overflow-hidden"
               onClick={(e) => e.stopPropagation()}
               style={{
                 background: 'linear-gradient(165deg, #FFFCF9 0%, #FDF5F0 45%, #FFF7F1 100%)',
                 boxShadow: '0 40px 100px rgba(60,40,40,0.22), 0 16px 40px rgba(200,104,110,0.16), 0 4px 14px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.95)',
                 border: '1px solid rgba(232,180,170,0.30)',
               }}>
            {/* Köşe soft rose glow'ları — Apple onboarding hissi */}
            <div className="absolute top-[-80px] right-[-60px] w-[260px] h-[260px] rounded-full pointer-events-none"
                 style={{ background: 'radial-gradient(circle, rgba(200,104,110,0.18) 0%, transparent 70%)' }} />
            <div className="absolute bottom-[-100px] left-[-80px] w-[300px] h-[300px] rounded-full pointer-events-none"
                 style={{ background: 'radial-gradient(circle, rgba(253,232,224,0.55) 0%, transparent 70%)' }} />
            <div className="absolute top-[40%] left-[-50px] w-[180px] h-[180px] rounded-full pointer-events-none"
                 style={{ background: 'radial-gradient(circle, rgba(212,168,82,0.08) 0%, transparent 70%)' }} />

            {/* Minimal X — sağ üst */}
            <button onClick={() => setShowAppPopup(false)}
                    aria-label="Kapat"
                    className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-[1.08] active:scale-[0.94] z-10"
                    style={{
                      background: 'rgba(255,255,255,0.70)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(200,104,110,0.12)',
                      boxShadow: '0 2px 8px rgba(160,80,90,0.06)',
                    }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="#9F4F58" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {/* Üst — logo + slogan, etrafında soft glow */}
            <div className="relative flex flex-col items-center mb-5">
              {/* Logo arkası soft rose halo */}
              <div className="absolute top-0 w-[180px] h-[140px] rounded-full pointer-events-none"
                   style={{ background: 'radial-gradient(ellipse at center, rgba(200,104,110,0.10) 0%, transparent 70%)', filter: 'blur(8px)' }} />
              <div className="relative flex flex-col items-center">
                <Image src="/navbar-icon.png" alt="Nikahım" width={120} height={120} className="w-[104px] h-[104px] object-contain" />
                <Image src="/navbar-text.png" alt="Nikahım" width={500} height={140} className="h-[34px] w-auto object-contain -mt-1" />
              </div>
              {/* Premium slogan — ince serif italic */}
              <p className="mt-1 text-center italic tracking-[0.3px]"
                 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontWeight: 400, fontSize: '15.5px', color: '#9F4F58' }}>
                En özel anlar, birlikte yaşanır.
              </p>
              {/* Gold dash ayraç */}
              <div className="mt-3 h-[1px] rounded-full" style={{ width: '60px', background: 'linear-gradient(90deg, transparent, #D4A852, transparent)' }} />
            </div>

            {/* 3 feature — akış sırası: Davetiye Oluştur → Hemen Paylaş → Canlı Yayınla */}
            <div className="grid grid-cols-3 gap-4 mb-7 lg:mb-8">
              {[
                { title: 'Davetiye Oluştur', icon: (
                  <svg className="w-7 h-7" style={{ color: '#C8686E' }} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
                    <path d="M3.5 8L12 13l8.5-5" />
                    <path d="M12 13.5v3" />
                    <path d="M10.5 16.5c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5c0-1-1.5-2-1.5-2s-1.5 1-1.5 2z" fill="currentColor" stroke="none" opacity="0.65" />
                  </svg>
                ) },
                { title: 'Sevdiklerinle Paylaş', icon: <svg className="w-7 h-7" style={{ color: '#C8686E' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
                { title: 'Canlı Yayınla', icon: <svg className="w-9 h-9" style={{ color: '#C8686E' }} fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M10 8.5v7l6-3.5z" fill="#fff" /></svg> },
              ].map((f, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mb-2.5" style={{ background: 'linear-gradient(135deg, rgba(200,104,110,0.10), rgba(200,104,110,0.04))', border: '1px solid rgba(200,104,110,0.10)' }}>
                    {f.icon}
                  </div>
                  <h4 className="text-[12px] font-normal text-gray-900 leading-tight">{f.title}</h4>
                </div>
              ))}
            </div>

            {/* CTA alt yazı — başlık silindi (store butonlarına biraz mesafe) */}
            <div className="text-center mb-6 lg:mb-7">
              <p className="text-[13.5px]" style={{ color: '#6E5A5A' }}>
                Uygulamayı <span style={{ fontWeight: 700, color: '#1F1F1F' }}>ücretsiz indirin</span>, hemen başlayın !
              </p>
            </div>

            {/* App Store + Google Play yan yana */}
            <div className="flex gap-2.5 justify-center">
              <a href="#" className="block transition-transform hover:scale-[1.03]"><Image src="/appstore.png" alt="App Store" width={200} height={60} className="h-12 w-auto" /></a>
              <a href="#" className="block transition-transform hover:scale-[1.03]"><Image src="/playstore.png" alt="Google Play" width={200} height={60} className="h-12 w-auto" /></a>
            </div>
          </div>
        </div>
      )}

      {/* CANLI YAYIN ARA MODAL — uygulama indir modal'ının kardeşi: aynı tasarım, arama içeriği */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-start lg:items-center justify-center p-4 pt-3 lg:pt-4 animate-fade-in overflow-y-auto"
             onClick={() => { setShowSearchModal(false); setSearchQuery(""); setShowSearchResults(false); }}
             style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
          <div className="search-modal-shell relative rounded-[28px] px-6 lg:px-10 pt-5 pb-7 lg:pt-9 lg:pb-11 max-w-md w-full animate-scale-in overflow-hidden"
               onClick={(e) => e.stopPropagation()}
               style={{
                 background: 'linear-gradient(165deg, #FFFCF9 0%, #FDF5F0 45%, #FFF7F1 100%)',
                 boxShadow: '0 40px 100px rgba(60,40,40,0.22), 0 16px 40px rgba(200,104,110,0.16), 0 4px 14px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.95)',
                 border: '1px solid rgba(232,180,170,0.30)',
               }}>
            {/* Köşe soft rose glow'ları */}
            <div className="absolute top-[-80px] right-[-60px] w-[260px] h-[260px] rounded-full pointer-events-none"
                 style={{ background: 'radial-gradient(circle, rgba(200,104,110,0.18) 0%, transparent 70%)' }} />
            <div className="absolute bottom-[-100px] left-[-80px] w-[300px] h-[300px] rounded-full pointer-events-none"
                 style={{ background: 'radial-gradient(circle, rgba(253,232,224,0.55) 0%, transparent 70%)' }} />
            <div className="absolute top-[40%] left-[-50px] w-[180px] h-[180px] rounded-full pointer-events-none"
                 style={{ background: 'radial-gradient(circle, rgba(212,168,82,0.08) 0%, transparent 70%)' }} />

            {/* Minimal X */}
            <button onClick={() => { setShowSearchModal(false); setSearchQuery(""); setShowSearchResults(false); }}
                    aria-label="Kapat"
                    className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-[1.08] active:scale-[0.94] z-20"
                    style={{
                      background: 'rgba(255,255,255,0.70)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(200,104,110,0.12)',
                      boxShadow: '0 2px 8px rgba(160,80,90,0.06)',
                    }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="#9F4F58" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {/* Logo + slogan — mobilde kompakt (landscape için) */}
            <div className="search-modal-header relative flex flex-col items-center mb-4 lg:mb-5">
              <div className="absolute top-0 w-[180px] h-[140px] rounded-full pointer-events-none"
                   style={{ background: 'radial-gradient(ellipse at center, rgba(200,104,110,0.10) 0%, transparent 70%)', filter: 'blur(8px)' }} />
              <div className="relative flex flex-col items-center">
                <Image src="/navbar-icon.png" alt="Nikahım" width={120} height={120} className="search-modal-logo w-[78px] h-[78px] lg:w-[104px] lg:h-[104px] object-contain" />
                <Image src="/navbar-text.png" alt="Nikahım" width={500} height={140} className="search-modal-wordmark h-[26px] lg:h-[34px] w-auto object-contain -mt-1" />
              </div>
              <p className="search-modal-slogan mt-1 text-center italic tracking-[0.3px]"
                 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontWeight: 400, fontSize: '14px', color: '#9F4F58' }}>
                En özel anlar, birlikte yaşanır.
              </p>
              <div className="mt-2.5 h-[1px] rounded-full" style={{ width: '60px', background: 'linear-gradient(90deg, transparent, #D4A852, transparent)' }} />
            </div>

            {/* Arama başlığı */}
            <div className="relative text-center mb-4">
              <p className="text-[14px]" style={{ color: '#6E5A5A' }}>
                Gelin veya Damat adıyla arama yapın
              </p>
            </div>

            {/* Search box + sonuçlar */}
            <div className="relative">
              <div className="relative flex items-center">
                <svg className="absolute left-5 w-5 h-5 text-gray-300 z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  autoFocus
                  placeholder="Örn: Ahmet, Ayşe, Yılmaz..."
                  className="w-full pl-12 pr-12 py-3.5 text-[15px] rounded-2xl outline-none text-gray-900 placeholder:text-gray-300 transition-all border-2 border-transparent focus:border-[#C8686E]/30 focus:shadow-[0_8px_30px_rgba(200,104,110,0.10)]"
                  style={{ background: '#F8F9FC' }}
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); setShowSearchResults(false); }}
                          className="absolute right-4 w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 text-gray-400 hover:bg-gray-300 hover:text-gray-600 transition-colors text-sm z-10">
                    ✕
                  </button>
                )}
              </div>
              {showSearchResults && (
                <div className="mt-3 bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                  {searchResults.length > 0 ? (
                    <div className="search-results-list divide-y divide-gray-50 overflow-y-auto" style={{ maxHeight: 'min(18rem, 35vh)' }}>
                      {searchResults.map((event) => (
                        <button key={event.id}
                                onClick={() => { setShowSearchModal(false); goToWedding(event.event_link); }}
                                className="group w-full p-4 flex items-center gap-3 hover:bg-gradient-to-r hover:from-rose-50/50 hover:to-transparent transition-all text-left">
                          {event.couple_photo_url ? (
                            <Image src={event.couple_photo_url} alt="Çift" width={44} height={44} className="w-11 h-11 rounded-2xl object-cover shadow-sm" />
                          ) : (
                            <Image src="/icon.png" alt="Nikahım" width={44} height={44} className="w-11 h-11 rounded-2xl object-cover shadow-sm" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-[14px] truncate">{event.bride_full_name} & {event.groom_full_name}</div>
                            <div className="text-[12px] text-gray-400 mt-0.5">
                              {new Date(event.event_date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
                              {demoUserId && (event as any).user_id === demoUserId && (
                                <span className="ml-1 font-semibold" style={{ color: '#C8686E' }}>(Örnek Yayın)</span>
                              )}
                            </div>
                          </div>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1 flex-shrink-0" style={{ background: 'rgba(200,104,110,0.1)' }}>
                            <svg className="w-3.5 h-3.5" style={{ color: '#C8686E' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-300">
                      <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      <p className="font-medium text-gray-400 text-[14px]">Sonuç bulunamadı</p>
                      <p className="text-[12px] mt-1">Farklı bir isim deneyin</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NAVBAR — premium luxury: cream gradient + sol marka (logo +15%) + glass hamburger + ince rose glow */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
              style={{
                background: scrolled
                  ? 'linear-gradient(180deg, rgba(253,247,243,0.96) 0%, rgba(255,251,248,0.94) 100%)'
                  : 'linear-gradient(180deg, rgba(253,247,243,0.82) 0%, rgba(255,251,248,0.74) 100%)',
                backdropFilter: 'blur(28px) saturate(180%)',
                WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                borderBottom: scrolled ? '1px solid rgba(200,104,110,0.10)' : '1px solid rgba(200,104,110,0.04)',
                boxShadow: scrolled
                  ? '0 6px 24px rgba(200,104,110,0.07), 0 1px 0 rgba(255,250,247,0.6) inset'
                  : '0 2px 12px rgba(200,104,110,0.03)',
              }}>
        {/* Alt kenar — pearl/rose glow çizgisi */}
        <div className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
             style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(200,104,110,0.18) 20%, rgba(212,168,82,0.16) 50%, rgba(200,104,110,0.18) 80%, transparent 100%)' }} />
        <div className="max-w-7xl mx-auto px-5 lg:px-10">
          <div className="flex items-center justify-between h-[72px] lg:h-[80px] relative">
            {/* SOL — Marka (logo + wordmark, +%15) */}
            <div className="flex items-center cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <Image src="/navbar-icon.png" alt="Nikahım" width={66} height={66} className="h-[58px] lg:h-[60px] w-auto object-contain transition-transform duration-300 group-hover:scale-[1.04]" />
              <Image src="/navbar-text.png" alt="Nikahım" width={368} height={106} className="h-[36px] lg:h-[40px] w-auto object-contain -ml-1 transition-opacity duration-300 group-hover:opacity-90" />
            </div>

            {/* ORTA — Desktop nav (minimal text linkler, absolute center) */}
            <nav className="hidden lg:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
              {[
                { label: 'Ana Sayfa', id: 'hero' },
                { label: 'Özellikler', id: 'ozellikler' },
                { label: 'Neden Nikahım?', id: 'neden-nikahim' },
                { label: 'Paketler', id: 'paketler' },
                { label: 'Yardım Merkezi', action: 'concierge' as const },
                { label: 'İletişim', id: 'iletisim' },
              ].map((item) => (
                <button key={item.label}
                        onClick={() => {
                          if (item.action === 'concierge') { setShowConciergeSheet(true); setMobileMenuOpen(false); }
                          else if (item.id) { scrollToSection(item.id); }
                        }}
                        className="text-gray-600 hover:text-gray-900 font-medium text-[14px] tracking-[0.2px] transition-colors relative group">
                  {item.label}
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-[1.5px] rounded-full group-hover:w-full transition-all duration-300" style={{ background: 'linear-gradient(90deg, transparent, #C8686E, transparent)' }} />
                </button>
              ))}
            </nav>

            {/* SAĞ — Concierge "?" trigger + Desktop CTA + Mobile glass hamburger */}
            <div className="flex items-center gap-3">
              {/* Concierge "?" trigger — minimal premium yardım tetikleyici (mobil + desktop) */}
              <button onClick={() => setShowConciergeSheet(true)}
                      aria-label="Yardım"
                      className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-all hover:scale-[1.06] active:scale-[0.94]"
                      style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(253,247,243,0.88) 100%)',
                        backdropFilter: 'blur(14px)',
                        border: '1px solid rgba(200,104,110,0.18)',
                        boxShadow: '0 3px 12px rgba(200,104,110,0.10), 0 1px 3px rgba(160,80,90,0.05), inset 0 1px 0 rgba(255,255,255,0.95)',
                      }}>
                <svg className="w-[22px] h-[22px]" fill="none" stroke="#9F4F58" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M8.5 9c0-2 1.6-3.5 3.5-3.5s3.5 1.5 3.5 3.5c0 1.6-1.2 2.4-2.3 3-0.7 0.4-1.2 0.9-1.2 1.8v0.7" />
                  <circle cx="12" cy="18" r="1.1" fill="#9F4F58" stroke="none" />
                </svg>
              </button>

              {/* Desktop CTA — premium glass solid rose */}
              <button onClick={() => setShowAppPopup(true)}
                      className="hidden lg:inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-full font-semibold text-[13.5px] tracking-[0.2px] transition-all hover:scale-[1.03] btn-press"
                      style={{
                        background: 'linear-gradient(135deg, #D88488 0%, #C8686E 50%, #B85258 100%)',
                        boxShadow: '0 4px 14px rgba(200,104,110,0.25), 0 1px 4px rgba(160,80,90,0.15), inset 0 1px 0 rgba(255,255,255,0.30)',
                      }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Uygulamayı İndir
              </button>

              {/* Mobile glass hamburger — encapsulated, soft shadow */}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                      className="lg:hidden w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-[1.04] active:scale-[0.96]"
                      aria-label="Menü"
                      style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(253,247,243,0.88) 100%)',
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                        border: '1px solid rgba(200,104,110,0.18)',
                        boxShadow: '0 4px 14px rgba(200,104,110,0.10), 0 1px 3px rgba(160,80,90,0.06), inset 0 1px 0 rgba(255,255,255,0.95)',
                      }}>
                <svg className="w-[18px] h-[18px]" fill="none" stroke="#9F4F58" strokeWidth="2" viewBox="0 0 24 24">
                  {mobileMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu dropdown */}
          {mobileMenuOpen && (
            <div className="lg:hidden py-5 animate-fade-in overflow-y-auto" style={{ borderTop: '1px solid rgba(200,104,110,0.08)', maxHeight: 'calc(100vh - 72px)' }}>
              <div className="flex flex-col gap-1">
                {[
                  { label: 'Ana Sayfa', id: 'hero' },
                  { label: 'Özellikler', id: 'ozellikler' },
                  { label: 'Neden Nikahım?', id: 'neden-nikahim' },
                  { label: 'Paketler', id: 'paketler' },
                  { label: 'Yardım Merkezi', action: 'concierge' as const },
                  { label: 'İletişim', id: 'iletisim' },
                ].map((item) => (
                  <button key={item.label}
                          onClick={() => {
                            if (item.action === 'concierge') { setShowConciergeSheet(true); setMobileMenuOpen(false); }
                            else if (item.id) { scrollToSection(item.id); }
                          }}
                          className="text-gray-700 py-3 text-left font-medium hover:text-gray-900 transition-colors px-3 rounded-xl hover:bg-rose-50/40">
                    {item.label}
                  </button>
                ))}
                <button onClick={() => setShowAppPopup(true)} className="text-white py-3.5 rounded-2xl font-semibold mt-3 btn-press" style={{ background: 'linear-gradient(135deg, #D88488, #C8686E, #B85258)', boxShadow: '0 4px 14px rgba(200,104,110,0.22)' }}>Uygulamayı İndir</button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* HERO */}
      <section id="hero" className="relative flex items-start overflow-hidden lg:min-h-screen">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #FBF8F5 0%, #F5F0EC 35%, #FDF5F3 65%, #FAF7F5 100%)' }} />
        <div className="absolute top-[-300px] right-[-200px] w-[900px] h-[900px] rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, #C8686E 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-200px] left-[-150px] w-[700px] h-[700px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #6FAFCF 0%, transparent 70%)' }} />

        <style>{`
          .hero-vid-mask {
            -webkit-mask-image: linear-gradient(to right, transparent 0%, transparent 6%, rgba(0,0,0,0.10) 18%, rgba(0,0,0,0.30) 30%, rgba(0,0,0,0.56) 42%, rgba(0,0,0,0.80) 55%, #000 68%);
            mask-image: linear-gradient(to right, transparent 0%, transparent 6%, rgba(0,0,0,0.10) 18%, rgba(0,0,0,0.30) 30%, rgba(0,0,0,0.56) 42%, rgba(0,0,0,0.80) 55%, #000 68%);
          }
          .hero-vid-mask-4 {
            -webkit-mask-image:
              linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 1.2%, rgba(0,0,0,0.85) 3%, #000 5%, #000 95%, rgba(0,0,0,0.85) 97%, rgba(0,0,0,0.5) 98.8%, transparent 100%),
              linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.06) 3%, rgba(0,0,0,0.16) 6%, rgba(0,0,0,0.34) 10%, rgba(0,0,0,0.56) 14%, rgba(0,0,0,0.78) 18%, #000 23%, #000 84%, rgba(0,0,0,0.7) 90%, rgba(0,0,0,0.38) 95%, rgba(0,0,0,0.12) 98%, transparent 100%);
            -webkit-mask-composite: source-in;
            mask-image:
              linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 1.2%, rgba(0,0,0,0.85) 3%, #000 5%, #000 95%, rgba(0,0,0,0.85) 97%, rgba(0,0,0,0.5) 98.8%, transparent 100%),
              linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.06) 3%, rgba(0,0,0,0.16) 6%, rgba(0,0,0,0.34) 10%, rgba(0,0,0,0.56) 14%, rgba(0,0,0,0.78) 18%, #000 23%, #000 84%, rgba(0,0,0,0.7) 90%, rgba(0,0,0,0.38) 95%, rgba(0,0,0,0.12) 98%, transparent 100%);
            mask-composite: intersect;
          }
        `}</style>
        {/* Masaüstü hero görsel — mask ile arka plana erir (mobilde gizli; mobil video akış içinde) */}
        <div className="absolute inset-y-0 right-0 w-full lg:w-[66%] overflow-hidden pointer-events-none select-none hidden lg:block">
          <video autoPlay muted loop playsInline preload="auto" className="hero-vid-mask absolute inset-0 h-full w-full object-cover object-[56%_center] brightness-[0.95] contrast-[1.04] saturate-[0.92]">
            <source src="/welcome-video-2.mp4" type="video/mp4" />
          </video>
          {/* header üst fade */}
          <div className="absolute inset-x-0 top-0 h-24 z-10" style={{ background: 'linear-gradient(180deg, #FBF8F5 0%, rgba(251,248,245,0.5) 50%, transparent 100%)' }} />
          {/* alt fadeaway (arka plan tonuyla) */}
          <div className="absolute inset-x-0 bottom-0 z-10" style={{ height: '32%', background: 'linear-gradient(0deg, #FAF7F5 0%, rgba(250,247,245,0.55) 32%, rgba(250,247,245,0.15) 62%, transparent 100%)' }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pt-20 pb-12 lg:pt-28 lg:pb-0 w-full">
          <div className="lg:max-w-[46%]">
            <div className="animate-fade-in-up">
              {/* Slogan — glass (Apple-style), pembe değil; mobilde yukarıda ve sarabilir */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-[12px] lg:text-[12.5px] font-semibold tracking-[0.01em] mb-4 lg:mb-6 mt-0 leading-snug whitespace-normal lg:whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.55)', color: '#B45E69', border: '1px solid rgba(217,77,104,0.15)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 6px 20px rgba(80,45,55,0.05)' }}>
                <span className="w-[7px] h-[7px] rounded-full animate-pulse flex-shrink-0" style={{ background: '#D85F70' }} />
                Türkiye&apos;nin Dijital Düğün ve Nikah Platformu
              </div>
              {/* Item 25: 'Nikahınızı' kaldırıldı, 'Bu Mutlu Günü' geldi */}
              <h1 className="leading-[1.05] mb-5 lg:mb-12" style={{ fontFamily: 'var(--font-playfair)', letterSpacing: '-1.2px' }}>
                <span className="font-black text-gray-900 text-[2.4rem] lg:text-[3.4rem]">Büyük Gününüz</span>
                <br />
                <span className="gradient-text-hero animate-glow font-bold text-[2.7rem] lg:text-[4rem]">Artık Dijital</span>
              </h1>
              {/* Item 26: yeni açıklama — mobilde tam genişlik */}
              <p className="relative z-10 text-[15px] lg:text-[1.15rem] font-medium mb-5 lg:mb-10 leading-relaxed lg:max-w-[520px]" style={{ color: '#574438' }}>Canlı Yayından akıllı Masa Planlayıcısına, Fotoğraf Albümünden tebrik mesajlarına... Büyük gününüz için<br className="hidden lg:block" /> her şey <span className="font-bold" style={{ color: '#3A302D' }}>Nikahım</span>&apos;da.</p>
              {/* Mobil hero video — uygulama welcome ekranıyla BİREBİR: 2 katman mask + object 64%/66% */}
              <div className="lg:hidden relative -mx-6 mt-1.5 mb-[18px] overflow-hidden" style={{ height: 'clamp(305px, 39vh, 405px)' }}>
                <video autoPlay muted loop playsInline preload="auto" className="hero-vid-mask-4 absolute inset-0 h-full w-full object-cover object-[64%_66%] brightness-[0.96] contrast-[1.03] saturate-[0.94]">
                  <source src="/welcome-video-2.mp4" type="video/mp4" />
                </video>
              </div>
              <div className="flex flex-row gap-3 lg:gap-4 mb-7 lg:mb-6 lg:mt-24">
                {/* Ücretsiz Hesap Oluştur — masaüstünde Yayına Katıl ile aynı boy (tek satır + küçük italik) */}
                <button onClick={() => setShowAppPopup(true)} className="flex-[1.3] basis-0 lg:basis-auto lg:flex-initial text-white px-4 py-3 lg:px-10 lg:py-4 rounded-2xl font-semibold text-[14px] lg:text-[17px] transition-all hover:scale-[1.03] btn-press whitespace-nowrap leading-tight inline-flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E, #BE6065)', boxShadow: '0 8px 30px rgba(200,104,110,0.3), 0 4px 12px rgba(0,0,0,0.1)' }}>
                  {/* Mobilde 2 satır (italic Ücretsiz / Hesap Oluştur), masaüstünde tek satır */}
                  <span className="lg:hidden flex flex-col leading-tight">
                    <span className="italic font-light text-[12px] opacity-90">Ücretsiz</span>
                    <span>Hesap Oluştur</span>
                  </span>
                  <span className="hidden lg:inline">
                    <span className="italic font-light opacity-90 mr-1.5">Ücretsiz</span>
                    Hesap Oluştur
                  </span>
                </button>
                <button onClick={() => setShowSearchModal(true)} className="flex-[0.9] basis-0 lg:basis-auto lg:flex-initial px-4 py-4 lg:px-10 lg:py-4 rounded-2xl font-semibold text-[15px] lg:text-[17px] transition-all hover:scale-[1.03] btn-press border-2 whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.9)', borderColor: 'rgba(200,104,110,0.2)', color: '#C8686E', boxShadow: '0 6px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)' }}>Davetli Girişi</button>
              </div>
              {/* Canlı yayın demo kartı — tüm kart tıklanabilir; örnek yayına yönlendirir */}
              <button
                type="button"
                disabled={loadingDemo}
                onClick={async () => {
                  if (loadingDemo) return;
                  setLoadingDemo(true);
                  try {
                    const res = await fetch('/api/demo-event');
                    if (!res.ok) {
                      const body = await res.json().catch(() => ({}));
                      const msg = body?.error === 'no_event'
                        ? 'Henüz örnek nikah oluşturulmadı.'
                        : 'Örnek yayına gidilemedi.';
                      alert(msg);
                      setLoadingDemo(false);
                      return;
                    }
                    const { event_link } = await res.json();
                    router.push(`/canli/${event_link}`);
                  } catch (e) {
                    console.error(e);
                    alert('Örnek yayına gidilemedi.');
                    setLoadingDemo(false);
                  }
                }}
                className={`group block w-full text-left rounded-[22px] p-4 mb-6 lg:mb-3 max-w-[560px] lg:max-w-[470px] transition-all ${loadingDemo ? 'cursor-wait opacity-80' : 'hover:-translate-y-0.5'}`}
                style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid #F0D5D8', boxShadow: '0 10px 30px rgba(99,60,60,0.055), 0 2px 8px rgba(99,60,60,0.025)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
              >
                {/* Üst: thumbnail + başlık/açıklama + ok */}
                <div className="flex items-center gap-3.5">
                  <img src="/demo-canli.png" alt="Canlı yayın önizleme" className="w-[118px] h-[70px] flex-shrink-0 object-cover rounded-[13px]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14.5px] lg:text-[15px] font-bold leading-tight" style={{ color: '#202333' }}>Düğün &amp; Nikah sayfasını deneyimleyin</p>
                    <p className="text-[12px] font-medium leading-snug mt-1" style={{ color: '#8C7771' }}>Davetlilerinizin ne göreceğini keşfedin.</p>
                  </div>
                  <span className="w-[34px] h-[34px] flex-shrink-0 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-0.5" style={{ background: '#FFF6F6', border: '1px solid #F1D5D9', color: '#D75F6C' }}>
                    {loadingDemo ? (
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" strokeDasharray="38" strokeDashoffset="20" strokeLinecap="round" opacity="0.85" /></svg>
                    ) : (
                      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.1} d="M5 12h13M12 5l7 7-7 7" /></svg>
                    )}
                  </span>
                </div>
                {/* Alt: 4 özellik — yatay (ikon solda) + aralarında dikey çizgi */}
                <div className="grid grid-cols-4 mt-3.5 pt-3" style={{ borderTop: '1px solid #F3E5E2' }}>
                  <div className="flex items-center justify-center gap-1.5" style={{ color: '#6A5852', borderRight: '1px solid #F3E5E2' }}>
                    <svg className="w-[18px] h-[18px] lg:w-[20px] lg:h-[20px] flex-shrink-0" fill="none" stroke="#DC6874" strokeWidth={1.7} viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="14" rx="2.5" /><path d="M8 21h8" strokeLinecap="round" /><path d="M10.5 8.3l4 2.7-4 2.7z" fill="#DC6874" stroke="none" /></svg>
                    <span className="text-[10px] lg:text-[11px] font-semibold leading-tight whitespace-nowrap">Canlı Yayın</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5" style={{ color: '#6A5852', borderRight: '1px solid #F3E5E2' }}>
                    <svg className="w-[18px] h-[18px] lg:w-[20px] lg:h-[20px] flex-shrink-0" fill="none" stroke="#DC6874" strokeWidth={1.7} viewBox="0 0 24 24"><circle cx="12" cy="15" r="6" /><path d="M8.5 9.5L6.5 3h4l1.5 2.5L13.5 3h4l-2 6.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <span className="text-[10px] lg:text-[11px] font-semibold leading-tight whitespace-nowrap">Altın Tak</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5" style={{ color: '#6A5852', borderRight: '1px solid #F3E5E2' }}>
                    <svg className="w-[18px] h-[18px] lg:w-[20px] lg:h-[20px] flex-shrink-0" fill="none" stroke="#DC6874" strokeWidth={1.7} viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 0 1-11.5 7.9L3 21l1.6-6.5A8.5 8.5 0 1 1 21 11.5z" strokeLinejoin="round" /><path d="M12 14.3s-2.4-1.4-2.4-3c0-.85.68-1.4 1.4-1.4.55 0 1 .35 1 .35s.45-.35 1-.35c.72 0 1.4.55 1.4 1.4 0 1.6-2.4 3-2.4 3z" fill="#DC6874" stroke="none" /></svg>
                    <span className="text-[10px] lg:text-[11px] font-semibold leading-tight whitespace-nowrap">Tebrik Et</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5" style={{ color: '#6A5852' }}>
                    <svg className="w-[18px] h-[18px] lg:w-[20px] lg:h-[20px] flex-shrink-0" fill="none" stroke="#DC6874" strokeWidth={1.7} viewBox="0 0 24 24"><path d="M21 14V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9" strokeLinecap="round" /><circle cx="8.5" cy="9" r="1.4" /><path d="M3 16l4-3.5 4 3" strokeLinecap="round" strokeLinejoin="round" /><path d="M18 15.5v5M15.5 18h5" strokeLinecap="round" /></svg>
                    <span className="text-[10px] lg:text-[11px] font-semibold leading-tight whitespace-nowrap">Fotoğraf</span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Premium section divider — hairline + diamond ornament */}
      <div aria-hidden="true" className="flex items-center justify-center gap-2.5 py-3 md:py-4">
        <span className="h-px w-14 md:w-20" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,104,110,0.30), transparent)' }} />
        <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(200,104,110,0.45)' }} />
        <span className="h-px w-14 md:w-20" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,104,110,0.30), transparent)' }} />
      </div>

      {/* ÖZELLİK KARTLARI - Altın Toplama + Nikah Albümü */}
      <section id="ozellikler" className="py-16" style={{ scrollMarginTop: '80px' }}>
        <div className="max-w-7xl mx-auto px-6 space-y-16 md:space-y-20">
          {/* Canlı Yayın - mobile (1:1 kare) + desktop (image aspect 1964/541 ≈ 3.63:1, ~339px) */}
          <div className="feature-card-hover relative rounded-3xl overflow-hidden mx-auto w-full aspect-square lg:aspect-[1964/541] max-w-[720px] lg:max-w-none" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(255,255,255,0.15), 0 16px 48px rgba(200,140,140,0.18), 0 4px 14px rgba(0,0,0,0.04)', border: '1px solid rgba(232,180,170,0.25)' }}>
            <div className="card-light-sweep" aria-hidden="true" />
            <img src="/bg-canli-yayin-s2.png" alt="" className="lg:hidden absolute inset-0 w-full h-full object-cover pointer-events-none select-none" />
            <img src="/bg-canli-yayin-masaustu.png" alt="Canlı Yayın ile mutluluğunuzu paylaşın" className="hidden lg:block absolute inset-0 w-full h-full object-cover pointer-events-none select-none" />
            {/* Cream overlay — sol içerik tarafı krem (Canlı Yayın için daha ince — rose tonu öne çıksın) */}
            <div className="hidden lg:block absolute left-0 top-0 h-full w-[72%] pointer-events-none" style={{ background: 'linear-gradient(to right, rgba(255, 248, 240, 0.50) 0%, rgba(255, 248, 240, 0.50) 65%, rgba(255, 248, 240, 0) 100%)' }} />

            {/* Mobil heading + dash + açıklama + badges */}
            <div className="lg:hidden absolute" style={{ top: '12%', left: '5.5%', width: '54%' }}>
              <h3 className="leading-[1.05]" style={{ fontFamily: 'var(--font-playfair)', color: '#C8686E', fontWeight: 600, fontSize: 'clamp(26px, 6.4vw, 52px)' }}>Canlı Yayın</h3>
              <h3 className="leading-[1.1] mt-1" style={{ fontFamily: 'var(--font-playfair)', color: '#1F1F1F', fontWeight: 600, fontSize: 'clamp(20px, 4.8vw, 38px)' }}>ile mutluluğunuzu paylaşın!</h3>
              <div className="mt-3" style={{ width: 'clamp(38px, 9vw, 64px)', height: '2px', background: '#C8686E', borderRadius: '2px' }} />
              <p className="mt-3 leading-relaxed text-[13px]" style={{ color: '#6E5A5A' }}>
                Düğününüzü canlı yayınlayın,<br />
                uzaktaki sevdikleriniz<br />
                bu anı kaçırmasın.
              </p>
              <div className="flex flex-col items-start gap-2.5 mt-5">
                {[
                  { label: 'Yüksek Çözünürlük', icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2" /><path strokeLinecap="round" d="M8 21h8M12 17v4" /></svg> },
                  { label: 'Tek Tıkla Yayın', icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg> },
                  { label: 'Uygulamasız İzleme', icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2" /><line x1="3" y1="3" x2="21" y2="21" strokeLinecap="round" /></svg> },
                ].map((b, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap" style={{ background: 'rgba(255, 250, 247, 0.94)', color: '#C8686E', border: '1px solid rgba(200,104,110,0.22)', boxShadow: '0 3px 10px rgba(200,104,110,0.12), 0 1px 3px rgba(0,0,0,0.04)' }}>{b.icon}{b.label}</span>
                ))}
              </div>
            </div>

            {/* Masaüstü — image full bg, içerik 100px sağ + 100px aşağı, badges altta büyütülmüş */}
            <div className="hidden lg:flex absolute left-0 top-0 h-full w-[52%] flex-col justify-between pl-[156px] pr-4 pb-6 pt-[100px]">
              <div>
                <h3 className="leading-[1.05]" style={{ fontFamily: 'var(--font-playfair)', color: '#C8686E', fontWeight: 600, fontSize: 'clamp(32px, 3vw, 44px)' }}>Canlı Yayın</h3>
                <h3 className="leading-[1.1] mt-1" style={{ fontFamily: 'var(--font-playfair)', color: '#1F1F1F', fontWeight: 600, fontSize: 'clamp(18px, 1.7vw, 26px)' }}>ile mutluluğunuzu paylaşın!</h3>
                <div className="mt-3 mb-3" style={{ width: '60px', height: '2px', background: '#C8686E', borderRadius: '2px' }} />
                <p className="leading-snug text-[13px] lg:text-[14px]" style={{ color: '#6E5A5A' }}>
                  Düğününüzü canlı yayınlayın, uzaktaki<br />
                  sevdikleriniz bu anı kaçırmasın.
                </p>
              </div>
              <div className="flex gap-1.5 flex-wrap -ml-[80px]">
                {[
                  { label: 'Yüksek Çözünürlük', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2" /><path strokeLinecap="round" d="M8 21h8M12 17v4" /></svg> },
                  { label: 'Tek Tıkla Yayın', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg> },
                  { label: 'Uygulamasız İzleme', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2" /><line x1="3" y1="3" x2="21" y2="21" strokeLinecap="round" /></svg> },
                ].map((b, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap" style={{ background: 'rgba(255, 250, 247, 0.94)', color: '#C8686E', border: '1px solid rgba(200,104,110,0.22)', boxShadow: '0 3px 10px rgba(200,104,110,0.12), 0 1px 3px rgba(0,0,0,0.04)' }}>{b.icon}{b.label}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Altınlarınızı Online Toplayın - kart (masaüstü aspect 3.63:1 = canlı yayın ile aynı) */}
          <div className="feature-card-hover relative rounded-3xl overflow-hidden lg:aspect-[1964/541]" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(255,255,255,0.15), 0 16px 48px rgba(200,140,140,0.18), 0 4px 14px rgba(0,0,0,0.04)', border: '1px solid rgba(232,180,170,0.25)' }}>
            <div className="card-light-sweep" aria-hidden="true" />
            <img src="/altin-toplama-mobil.png" alt="" className="absolute inset-0 w-full h-full object-cover lg:hidden pointer-events-none select-none" />
            <img src="/altin-toplama-masaustu.png" alt="" className="hidden lg:block absolute inset-0 w-full h-full object-cover pointer-events-none select-none" />
            {/* Mobil — Canlı Yayın tonuna yaklaştırmak için hafif rose katman */}
            <div className="lg:hidden absolute inset-0 pointer-events-none" style={{ background: 'rgba(232, 165, 169, 0.15)' }} />
            {/* Mobil — heading sağda (canlı yayın/tebrik tarzı), badges altta ortalı */}
            <div className="lg:hidden relative min-h-[340px]">
              {/* Heading + dash + açıklama — sağa yapışık (altın görseli sol yarıda) */}
              <div className="absolute" style={{ top: '18%', right: '5%', width: '50%' }}>
                <h3 className="leading-[1.05] text-right" style={{ fontFamily: 'var(--font-playfair)', color: '#C8686E', fontWeight: 600, fontSize: 'clamp(26px, 6.4vw, 52px)' }}>Altınlarınızı</h3>
                <h3 className="leading-[1.1] mt-1 text-right" style={{ fontFamily: 'var(--font-playfair)', color: '#1F1F1F', fontWeight: 600, fontSize: 'clamp(20px, 4.8vw, 38px)' }}>Online Toplayın</h3>
                <div className="mt-3 ml-auto" style={{ width: 'clamp(38px, 9vw, 64px)', height: '2px', background: '#C8686E', borderRadius: '2px' }} />
                <p className="mt-3 leading-relaxed text-[13px] landscape:text-[15px] text-right" style={{ color: '#6E5A5A' }}>
                  Davetlilerinizin<br />
                  taktığı altın miktarı<br />
                  kadar TL direk<br />
                  onlardan sizin<br />
                  hesabınıza gelsin!
                </p>
                {/* Landscape — badgeler açıklamanın altında sağda alt alta */}
                <div className="hidden landscape:flex flex-col items-end gap-2.5 mt-5">
                  {[
                    { label: 'Güvenilir', icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2L4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" /></svg> },
                    { label: 'Komisyon Yok', icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><line x1="19" y1="5" x2="5" y2="19" strokeLinecap="round" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg> },
                    { label: 'Anında Ödeme', icon: <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
                  ].map((b, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap" style={{ background: 'rgba(255, 250, 247, 0.94)', color: '#C8686E', border: '1px solid rgba(200,104,110,0.22)', boxShadow: '0 3px 10px rgba(200,104,110,0.12), 0 1px 3px rgba(0,0,0,0.04)' }}>{b.icon}{b.label}</span>
                  ))}
                </div>
              </div>
              {/* Badges — alt tam ortalı (sadece portrait) */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 flex-wrap px-3 landscape:hidden">
                {[
                  { label: 'Güvenilir', icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2L4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" /></svg> },
                  { label: 'Komisyon Yok', icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><line x1="19" y1="5" x2="5" y2="19" strokeLinecap="round" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg> },
                  { label: 'Anında Ödeme', icon: <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
                ].map((b, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap" style={{ background: 'rgba(255, 250, 247, 0.94)', color: '#C8686E', border: '1px solid rgba(200,104,110,0.22)', boxShadow: '0 3px 10px rgba(200,104,110,0.12), 0 1px 3px rgba(0,0,0,0.04)' }}>{b.icon}{b.label}</span>
                ))}
              </div>
            </div>
            {/* Masaüstü — image full bg, içerik 100px aşağı, badges 100px sağ */}
            <div className="hidden lg:flex absolute right-0 top-0 h-full w-[52%] flex-col justify-between pr-14 pl-4 pb-6 pt-[100px]">
              <div>
                <h3 className="leading-[1.05]" style={{ fontFamily: 'var(--font-playfair)', color: '#C8686E', fontWeight: 600, fontSize: 'clamp(28px, 2.6vw, 40px)' }}>Altınlarınızı</h3>
                <h3 className="leading-[1.05] whitespace-nowrap" style={{ fontFamily: 'var(--font-playfair)', color: '#1F1F1F', fontWeight: 600, fontSize: 'clamp(28px, 2.6vw, 40px)' }}>Online Toplayın</h3>
                <div className="mt-3 mb-3" style={{ width: '60px', height: '2px', background: '#C8686E', borderRadius: '2px' }} />
                <p className="text-[13px] lg:text-[14px] leading-snug" style={{ color: '#6E5A5A' }}>Davetlileriniz size doğrudan para gönderir, siz uygulamadan kolayca takip edersiniz.</p>
              </div>
              <div className="flex gap-1.5 flex-nowrap">
                {[
                  { label: 'Güvenilir', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2L4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" /></svg> },
                  { label: 'Komisyon Yok', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><line x1="19" y1="5" x2="5" y2="19" strokeLinecap="round" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg> },
                  { label: 'Anında Ödeme', icon: <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
                ].map((b, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap" style={{ background: 'rgba(255, 250, 247, 0.94)', color: '#C8686E', border: '1px solid rgba(200,104,110,0.22)', boxShadow: '0 3px 10px rgba(200,104,110,0.12), 0 1px 3px rgba(0,0,0,0.04)' }}>{b.icon}{b.label}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Tebrik Mesajları - mobile (1:1) + desktop (aspect 3.63:1 = canlı yayın ile aynı) */}
          <div className="feature-card-hover relative rounded-3xl overflow-hidden mx-auto w-full aspect-square portrait:aspect-square landscape:aspect-[1964/541] lg:aspect-[1964/541] max-w-[720px] landscape:max-w-none lg:max-w-none" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(255,255,255,0.15), 0 16px 48px rgba(200,140,140,0.18), 0 4px 14px rgba(0,0,0,0.04)', border: '1px solid rgba(232,180,170,0.25)' }}>
            <div className="card-light-sweep" aria-hidden="true" />
            <img src="/bg-tebrik.png" alt="" className="lg:hidden landscape:hidden absolute inset-0 w-full h-full object-cover pointer-events-none select-none" />
            <img src="/bg-tebrik-masaustu.png" alt="Tebrik mesajlarınızı kabul edin" className="hidden lg:block landscape:block absolute inset-0 w-full h-full object-cover pointer-events-none select-none landscape:[object-position:75%_65%] lg:object-center" />
            {/* Cream overlay — sol içerik tarafı krem, sağda image'a fade */}
            <div className="hidden lg:block absolute left-0 top-0 h-full w-[72%] pointer-events-none" style={{ background: 'linear-gradient(to right, rgba(255, 248, 240, 0.70) 0%, rgba(255, 248, 240, 0.70) 65%, rgba(255, 248, 240, 0) 100%)' }} />

            {/* Cream overlay landscape (telefon yatay) için de aktif */}
            <div className="hidden landscape:block absolute left-0 top-0 h-full w-[72%] pointer-events-none" style={{ background: 'linear-gradient(to right, rgba(255, 248, 240, 0.70) 0%, rgba(255, 248, 240, 0.70) 65%, rgba(255, 248, 240, 0) 100%)' }} />

            {/* Mobil heading + açıklama + badges (alt alta) — sadece portrait */}
            <div className="lg:hidden landscape:hidden absolute" style={{ top: '20%', left: '6%', width: '52%' }}>
              <h3 className="leading-[1.05]" style={{ fontFamily: 'var(--font-playfair)', color: '#1F1F1F', fontWeight: 600, fontSize: 'clamp(22px, 5.4vw, 44px)' }}>Tebrik</h3>
              <h3 className="leading-[1.05]" style={{ fontFamily: 'var(--font-playfair)', color: '#C8686E', fontWeight: 600, fontSize: 'clamp(22px, 5.4vw, 44px)' }}>mesajlarınızı</h3>
              <h3 className="leading-[1.05]" style={{ fontFamily: 'var(--font-playfair)', color: '#1F1F1F', fontWeight: 600, fontSize: 'clamp(22px, 5.4vw, 44px)' }}>kabul edin !</h3>
              <div className="mt-3 mb-4" style={{ width: 'clamp(38px, 9vw, 64px)', height: '2px', background: '#C8686E', borderRadius: '2px' }} />
              <p className="leading-relaxed text-[13px]" style={{ color: '#6E5A5A' }}>
                Misafirleriniz video, sesli<br />
                veya yazılı tebriklerini<br />
                size kolayca iletsin.
              </p>
              {/* Badges — açıklama altında alt alta (vertical stack) */}
              <div className="flex flex-col gap-1.5 mt-7 items-start">
                {[
                  { label: 'Kolay Gönderim', icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg> },
                  { label: 'Uygulamadan Takip', icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 14l2-2 2 2 3-3" /></svg> },
                ].map((b, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap" style={{ background: 'rgba(255, 250, 247, 0.94)', color: '#C8686E', border: '1px solid rgba(200,104,110,0.22)', boxShadow: '0 3px 10px rgba(200,104,110,0.12), 0 1px 3px rgba(0,0,0,0.04)' }}>{b.icon}{b.label}</span>
                ))}
              </div>
            </div>

            {/* Masaüstü — Altın Tak ile aynı yapı: justify-between, content yukarda, badges altta */}
            <div className="hidden lg:flex landscape:flex absolute left-0 top-0 h-full w-[52%] flex-col justify-between pl-[60px] lg:pl-[196px] pr-4 pb-[50px] lg:pb-6 pt-[100px] lg:pt-[100px]">
              <div>
                <h3 className="leading-[1.05] whitespace-nowrap" style={{ fontFamily: 'var(--font-playfair)', fontWeight: 600, fontSize: 'clamp(34px, 2.7vw, 36px)' }}>
                  <span style={{ color: '#1F1F1F' }}>Tebrik </span>
                  <span style={{ color: '#C8686E' }}>Mesajlarınızı</span>
                </h3>
                <h3 className="leading-[1.05]" style={{ fontFamily: 'var(--font-playfair)', color: '#1F1F1F', fontWeight: 600, fontSize: 'clamp(34px, 2.7vw, 36px)' }}>kabul edin!</h3>
                <div className="mt-3 mb-3" style={{ width: '60px', height: '2px', background: '#C8686E', borderRadius: '2px' }} />
                <p className="leading-snug text-[15px] lg:text-[14px]" style={{ color: '#6E5A5A' }}>
                  Misafirleriniz video, sesli veya yazılı tebriklerini size kolayca iletsin.
                </p>
              </div>
              {/* Badges — Altın Tak ile aynı hizada (kartın alt kısmında) */}
              <div className="flex gap-1.5 flex-nowrap">
                {[
                  { label: 'Kolay Gönderim', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg> },
                  { label: 'Uygulamadan Takip', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 14l2-2 2 2 3-3" /></svg> },
                ].map((b, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap" style={{ background: 'rgba(255, 250, 247, 0.94)', color: '#C8686E', border: '1px solid rgba(200,104,110,0.22)', boxShadow: '0 3px 10px rgba(200,104,110,0.12), 0 1px 3px rgba(0,0,0,0.04)' }}>{b.icon}{b.label}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Fotoğraf Albümü — MOBİL kart (content-sized, 1:1 yaklaşık) */}
          <div className="feature-card-hover lg:hidden relative rounded-3xl overflow-hidden mx-auto w-full" style={{ maxWidth: '720px', backgroundImage: 'url(/bg-album-canli.png)', backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(255,255,255,0.15), 0 16px 48px rgba(200,140,140,0.18), 0 4px 14px rgba(0,0,0,0.04)', border: '1px solid rgba(232,180,170,0.25)' }}>
            <div className="card-light-sweep" aria-hidden="true" />
            <div className="px-5 md:px-7 pt-10 pb-6">
              {/* Header — "Fotoğraf" / dash "Albümü Oluşturun" dash (dashes rose) */}
              <div className="text-center mb-3"
                   style={{ fontFamily: 'var(--font-playfair)', fontWeight: 500, letterSpacing: '0.3px', lineHeight: 1.15 }}>
                <div style={{ color: '#C8686E', fontSize: 'clamp(26px, 4.6vw, 36px)' }}>Fotoğraf</div>
                <div className="flex items-center justify-center gap-3 md:gap-4 mt-0.5"
                     style={{ fontSize: 'clamp(26px, 4.6vw, 36px)' }}>
                  <span className="flex-shrink-0 h-[1.5px] rounded-full"
                        style={{ width: 'clamp(28px, 7vw, 50px)', background: 'linear-gradient(to right, transparent, #C8686E, transparent)' }} />
                  <span style={{ color: '#2B2B2B' }}>Albümü Oluşturun</span>
                  <span className="flex-shrink-0 h-[1.5px] rounded-full"
                        style={{ width: 'clamp(28px, 7vw, 50px)', background: 'linear-gradient(to left, transparent, #C8686E, transparent)' }} />
                </div>
              </div>

              {/* 3 statik foto — foto 2 sol, foto 8 sağ, foto 4 önde */}
              <div className="relative w-full flex items-center justify-center" style={{ height: 'clamp(205px, 33.7vw, 300px)' }}>
                {/* Sol foto - foto 2 */}
                <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%) translateX(clamp(-84px, -15vw, -120px)) rotate(-7deg)', zIndex: 1 }}>
                  <div className="bg-white p-0.5 rounded-lg" style={{ boxShadow: '0 6px 16px rgba(80,60,40,0.20), 0 2px 6px rgba(0,0,0,0.06)' }}>
                    <img src="/foto2.png" alt="" className="block object-cover rounded-md" style={{ width: 'clamp(94px, 16vw, 135px)', height: 'clamp(112px, 18.7vw, 164px)' }} />
                  </div>
                </div>

                {/* Sağ foto - foto 8 */}
                <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%) translateX(clamp(84px, 15vw, 120px)) rotate(7deg)', zIndex: 1 }}>
                  <div className="bg-white p-0.5 rounded-lg" style={{ boxShadow: '0 6px 16px rgba(80,60,40,0.20), 0 2px 6px rgba(0,0,0,0.06)' }}>
                    <img src="/foto8.png" alt="" className="block object-cover rounded-md" style={{ width: 'clamp(94px, 16vw, 135px)', height: 'clamp(112px, 18.7vw, 164px)' }} />
                  </div>
                </div>

                {/* Orta foto - foto 4 (önde) + 128+ badge */}
                <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%) translateY(-4px)', zIndex: 3 }}>
                  <div className="bg-white p-1 rounded-xl relative" style={{ boxShadow: '0 16px 36px rgba(80,60,40,0.32), 0 4px 12px rgba(0,0,0,0.10)' }}>
                    <img src="/foto4.png" alt="" className="block object-cover rounded-lg" style={{ width: 'clamp(117px, 19.6vw, 164px)', height: 'clamp(140px, 23.4vw, 197px)' }} />
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                         style={{ background: 'linear-gradient(135deg, #C26068, #9F4F58)', boxShadow: '0 3px 8px rgba(160,80,90,0.40), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" fill="white" stroke="none" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                      <span className="text-[12.5px] font-bold text-white leading-none" style={{ fontFamily: 'var(--font-geist-sans), Inter, sans-serif' }}>128+</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gri açıklama — biraz daha yukarıda (mt-3 → mt-1) */}
              <p className="text-[13px] md:text-[15px] leading-relaxed text-center max-w-[560px] mx-auto mt-1" style={{ color: '#6E5A5A' }}>
                Siz ya da Misafirleriniz gün boyunca çekilen tüm fotoğrafları yükleyin, tüm anılar tek albümde toplansın.
              </p>

              {/* Filmstrip — sağdan sola otomatik kayan */}
              <div className="overflow-hidden mt-4 mb-4 relative" style={{ maskImage: 'linear-gradient(to right, transparent 0, black 5%, black 95%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0, black 5%, black 95%, transparent 100%)' }}>
                <style>{`
                  @keyframes albumFilmstripRTL2 {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                  }
                `}</style>
                <div style={{ display: 'flex', gap: '10px', width: 'fit-content', animation: 'albumFilmstripRTL2 28s linear infinite' }}>
                  {[...Array(2)].map((_, dup) => (
                    [
                      '/foto2.png', '/foto3.png', '/foto4.png', '/foto5.png', '/foto6.jpg',
                    ].map((url, i) => (
                      <div key={`${dup}-${i}`}
                           className="flex-shrink-0 rounded-lg overflow-hidden"
                           style={{ width: 'clamp(58px, 9vw, 78px)', height: 'clamp(58px, 9vw, 78px)', boxShadow: '0 2px 6px rgba(80,60,40,0.12)', border: '1px solid rgba(255,255,255,0.6)' }}>
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))
                  ))}
                </div>
              </div>

              {/* 3 rose badge — Altın/Canlı Yayın ile simetri */}
              <div className="flex gap-2 flex-wrap justify-center">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] md:text-[12px] font-semibold whitespace-nowrap" style={{ background: 'rgba(255, 250, 247, 0.94)', color: '#C8686E', border: '1px solid rgba(200,104,110,0.22)', boxShadow: '0 3px 10px rgba(200,104,110,0.12), 0 1px 3px rgba(0,0,0,0.04)' }}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-3.13a4 4 0 100-8 4 4 0 000 8zm6 0a3 3 0 100-6 3 3 0 000 6zm-12 0a3 3 0 100-6 3 3 0 000 6z" /></svg>
                  Birlikte Yükleyin
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] md:text-[12px] font-semibold whitespace-nowrap" style={{ background: 'rgba(255, 250, 247, 0.94)', color: '#C8686E', border: '1px solid rgba(200,104,110,0.22)', boxShadow: '0 3px 10px rgba(200,104,110,0.12), 0 1px 3px rgba(0,0,0,0.04)' }}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Tek Albüm
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] md:text-[12px] font-semibold whitespace-nowrap" style={{ background: 'rgba(255, 250, 247, 0.94)', color: '#C8686E', border: '1px solid rgba(200,104,110,0.22)', boxShadow: '0 3px 10px rgba(200,104,110,0.12), 0 1px 3px rgba(0,0,0,0.04)' }}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
                  Kolayca İndirin
                </span>
              </div>
            </div>
          </div>

          {/* Fotoğraf Albümü — MASAÜSTÜ kart (fotolar SOL, içerik SAĞ — Altın Toplama hizası) */}
          <div className="feature-card-hover hidden lg:block relative rounded-3xl overflow-hidden mx-auto w-full lg:aspect-[1964/541]" style={{ backgroundImage: 'url(/bg-album-masaustu.png)', backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(255,255,255,0.15), 0 16px 48px rgba(200,140,140,0.18), 0 4px 14px rgba(0,0,0,0.04)', border: '1px solid rgba(232,180,170,0.25)' }}>
            <div className="card-light-sweep" aria-hidden="true" />
            {/* Cream overlay — sağ içerik tarafı %50 krem, solda foto tarafına fade */}
            <div className="absolute right-0 top-0 h-full w-[72%] pointer-events-none" style={{ background: 'linear-gradient(to left, rgba(255, 248, 240, 0.50) 0%, rgba(255, 248, 240, 0.50) 65%, rgba(255, 248, 240, 0) 100%)' }} />

            {/* SOL — 3 foto + altta kayan filmstrip */}
            <div className="absolute left-0 top-0 h-full w-[48%]">
              {/* 3 foto */}
              <div className="absolute" style={{ left: '50%', top: '44%', transform: 'translate(-50%, -50%) translateX(-100px) rotate(-7deg)', zIndex: 1 }}>
                <div className="bg-white p-1 rounded-lg" style={{ boxShadow: '0 6px 16px rgba(80,60,40,0.20), 0 2px 6px rgba(0,0,0,0.06)' }}>
                  <img src="/foto2.png" alt="" className="block object-cover rounded-md" style={{ width: '101px', height: '144px' }} />
                </div>
              </div>
              <div className="absolute" style={{ left: '50%', top: '44%', transform: 'translate(-50%, -50%) translateX(100px) rotate(7deg)', zIndex: 1 }}>
                <div className="bg-white p-1 rounded-lg" style={{ boxShadow: '0 6px 16px rgba(80,60,40,0.20), 0 2px 6px rgba(0,0,0,0.06)' }}>
                  <img src="/foto8.png" alt="" className="block object-cover rounded-md" style={{ width: '101px', height: '144px' }} />
                </div>
              </div>
              <div className="absolute" style={{ left: '50%', top: '44%', transform: 'translate(-50%, -50%)', zIndex: 3 }}>
                <div className="bg-white p-1 rounded-xl relative" style={{ boxShadow: '0 16px 36px rgba(80,60,40,0.32), 0 4px 12px rgba(0,0,0,0.10)' }}>
                  <img src="/foto4.png" alt="" className="block object-cover rounded-lg" style={{ width: '137px', height: '187px' }} />
                  <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'linear-gradient(135deg, #C26068, #9F4F58)', boxShadow: '0 3px 8px rgba(160,80,90,0.40), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
                    <svg className="w-3 h-3" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" fill="white" stroke="none" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    <span className="text-[11.5px] font-bold text-white leading-none" style={{ fontFamily: 'var(--font-geist-sans), Inter, sans-serif' }}>128+</span>
                  </div>
                </div>
              </div>

              {/* Filmstrip — sol kolonda ortalı, 15px yukarı (18→33) */}
              <div className="absolute left-1/2 -translate-x-1/2 overflow-hidden" style={{ bottom: '33px', width: '320px', maskImage: 'linear-gradient(to right, transparent 0, black 8%, black 92%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0, black 8%, black 92%, transparent 100%)' }}>
                <style>{`
                  @keyframes albumFilmstripDesktop {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                  }
                `}</style>
                <div style={{ display: 'flex', gap: '6px', width: 'fit-content', animation: 'albumFilmstripDesktop 28s linear infinite' }}>
                  {[...Array(2)].map((_, dup) => (
                    ['/foto2.png', '/foto3.png', '/foto4.png', '/foto5.png', '/foto6.jpg'].map((url, i) => (
                      <div key={`${dup}-${i}`}
                           className="flex-shrink-0 rounded overflow-hidden"
                           style={{ width: '36px', height: '36px', boxShadow: '0 2px 6px rgba(80,60,40,0.12)', border: '1px solid rgba(255,255,255,0.6)' }}>
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))
                  ))}
                </div>
              </div>
            </div>

            {/* SAĞ — Heading + açıklama + badges (20px sola: right-[20px], başlık tek satır çift dash) */}
            <div className="absolute right-[20px] top-0 h-full w-[52%] flex flex-col justify-between pr-14 pl-4 pb-6 pt-[100px]">
              <div>
                <h3 className="leading-[1.05]" style={{ fontFamily: 'var(--font-playfair)', color: '#C8686E', fontWeight: 600, fontSize: 'clamp(26px, 2.7vw, 36px)' }}>Fotoğraf</h3>
                <h3 className="leading-[1.05]" style={{ fontFamily: 'var(--font-playfair)', color: '#1F1F1F', fontWeight: 600, fontSize: 'clamp(26px, 2.7vw, 36px)' }}>Albümü Oluşturun</h3>
                <div className="mt-3 mb-3" style={{ width: '60px', height: '2px', background: '#C8686E', borderRadius: '2px' }} />
                <p className="leading-snug mt-3 text-[13px] lg:text-[14px] max-w-[380px]" style={{ color: '#6E5A5A' }}>
                  Siz ya da Misafirleriniz gün boyunca çekilen tüm fotoğrafları yükleyin, tüm anılar tek albümde toplansın.
                </p>
              </div>
              {/* Badges — altta, 3 badge (Canlı Yayın ile simetri) */}
              <div className="flex gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap" style={{ background: 'rgba(255, 250, 247, 0.94)', color: '#C8686E', border: '1px solid rgba(200,104,110,0.22)', boxShadow: '0 3px 10px rgba(200,104,110,0.12), 0 1px 3px rgba(0,0,0,0.04)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-3.13a4 4 0 100-8 4 4 0 000 8zm6 0a3 3 0 100-6 3 3 0 000 6zm-12 0a3 3 0 100-6 3 3 0 000 6z" /></svg>
                  Birlikte Yükleyin
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap" style={{ background: 'rgba(255, 250, 247, 0.94)', color: '#C8686E', border: '1px solid rgba(200,104,110,0.22)', boxShadow: '0 3px 10px rgba(200,104,110,0.12), 0 1px 3px rgba(0,0,0,0.04)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Tek Albüm
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap" style={{ background: 'rgba(255, 250, 247, 0.94)', color: '#C8686E', border: '1px solid rgba(200,104,110,0.22)', boxShadow: '0 3px 10px rgba(200,104,110,0.12), 0 1px 3px rgba(0,0,0,0.04)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
                  Kolayca İndirin
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium section divider */}
      <div aria-hidden="true" className="flex items-center justify-center gap-2.5 py-3 md:py-4">
        <span className="h-px w-14 md:w-20" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,104,110,0.30), transparent)' }} />
        <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(200,104,110,0.45)' }} />
        <span className="h-px w-14 md:w-20" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,104,110,0.30), transparent)' }} />
      </div>

      {/* NASIL ÇALIŞIR — Tone A (rose-cream) */}
      <section id="nasil-calisir" className="py-16 md:py-14" style={{ background: 'linear-gradient(180deg, #FDF7F3 0%, #FAF4F0 100%)', scrollMarginTop: '80px' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10 md:mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-5" style={{ fontFamily: 'var(--font-playfair)' }}>3 Adımda <span className="gradient-text">Başlayın</span></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10 mb-20">
            {[
              { step: '01', title: 'Uygulamayı İndirin', desc: 'App Store veya Google Play\'den Nikahım uygulamasını ücretsiz indirin.', cta: 'Uygulamayı İndir', action: () => setShowAppPopup(true), icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
              { step: '02', title: 'Düğününüzü veya Nikahınızı Oluşturun', desc: 'Bilgilerinizi girin, davetiyenizi ve paket ayarlarınızı seçin.', cta: 'Paketleri Gör', action: () => scrollToSection('paketler'), icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg> },
              { step: '03', title: 'Yayına Geçin', desc: 'Tek tuşla canlı yayını başlatın, sevdikleriniz uzaktan izlesin.', cta: 'Özellikleri Keşfet', action: () => scrollToSection('neden-nikahim'), icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> },
            ].map((item) => {
              return (
                <div
                  key={item.step}
                  onClick={item.action}
                  className="premium-card group relative bg-white rounded-3xl p-10 transition-all duration-500 hover:-translate-y-2 cursor-pointer flex flex-col h-full"
                  style={{ boxShadow: '0 12px 40px rgba(60,40,40,0.10), 0 4px 14px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.04)', border: '1px solid rgba(200,104,110,0.10)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 24px 60px rgba(200,104,110,0.20), 0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = 'rgba(200,104,110,0.28)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 12px 40px rgba(60,40,40,0.10), 0 4px 14px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = 'rgba(200,104,110,0.10)'; }}
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ background: 'linear-gradient(135deg, rgba(200,104,110,0.1), rgba(200,104,110,0.05))', color: '#C8686E' }}>
                      <div aria-hidden="true" className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'radial-gradient(circle at 50% 30%, rgba(200,104,110,0.18) 0%, transparent 70%)' }} />
                      <div className="relative">{item.icon}</div>
                    </div>
                    <span
                      className="text-7xl font-black select-none leading-none tracking-tight"
                      style={{
                        background: 'linear-gradient(180deg, rgba(200,104,110,0.32) 0%, rgba(200,104,110,0.08) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        WebkitTextStroke: '1px rgba(200,104,110,0.18)',
                        fontFamily: 'var(--font-playfair)',
                      }}
                    >
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-400 leading-relaxed mb-5 flex-1">{item.desc}</p>
                  <div className="pt-4 border-t flex justify-end mt-auto" style={{ borderColor: 'rgba(200,104,110,0.10)' }}>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold transition-all duration-300 group-hover:gap-2.5" style={{ color: '#C8686E' }}>
                      {item.cta}
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* NEDEN NİKAHIM */}
      {/* Premium section divider */}
      <div aria-hidden="true" className="flex items-center justify-center gap-2.5 py-3 md:py-4">
        <span className="h-px w-14 md:w-20" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,104,110,0.30), transparent)' }} />
        <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(200,104,110,0.45)' }} />
        <span className="h-px w-14 md:w-20" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,104,110,0.30), transparent)' }} />
      </div>

      {/* NEDEN NİKAHIM — Tone B (body cream) */}
      <section id="neden-nikahim" className="py-16 md:py-14 relative overflow-hidden" style={{ background: '#FAF7F5', scrollMarginTop: '80px' }}>
        {/* Subtle rose radial accent — dikkat dağıtmadan derinlik */}
        <div aria-hidden="true" className="absolute top-[-150px] right-[-100px] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(200,104,110,0.06) 0%, transparent 70%)' }} />
        <div aria-hidden="true" className="absolute bottom-[-200px] left-[-150px] w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(212,168,82,0.04) 0%, transparent 70%)' }} />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-10 md:mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-5" style={{ fontFamily: 'var(--font-playfair)' }}>Neden <span className="gradient-text">Nikahım?</span></h2>
            <p className="text-lg text-gray-400 max-w-xl mx-auto">Özel gününüzü daha özel kılan profesyonel özellikler</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7">
            {[
              { title: 'Size Özel Yayın Sayfası', desc: 'Sadece size ait bir yayın sayfası! Dilerseniz Canlı Yayını herkese kapalı yapın, sadece davetiyeli kişiler katılsın.', badges: ['%100 Gizlilik', 'Özel Erişim'], icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> },
              { title: 'Tek Tıkla Katılım & İzleme', desc: 'Davetlileriniz için uygulama gerekmez, üyelik gerekmez! Link üzerinden tek tıkla izlemeye başlarlar. Kaçırırlarsa sorun yok! Yayın kaydı 30 gün boyunca aynı linkte video olarak izlenebilir!', badges: ['Üyelik Yok', '30 Gün Kayıt'], dualIcon: true, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>, icon2: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> },
              { title: 'Online Altın Takma', desc: 'Havale/EFT veya Crypto ile altın takma! Ödemeler direkt sizin banka hesabınıza, aracı ve komisyon yok.', badges: ['Komisyonsuz', 'Aracı yok', 'Hızlı'], icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg> },
              { title: 'Video ve Sesli Tebrik', desc: 'Davetlileriniz 30 saniyelik video veya 60 saniyelik sesli tebrik mesajı göndersin.', badges: ['30 sn Video', '60 sn Ses'], dualIcon: true, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>, icon2: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg> },
              { title: 'Fotoğraf Albümü', desc: 'Siz yada Misafirleriniz (sizin onayınızın ardından) gün boyunca çekilen tüm fotoğrafları yüklesin, tüm anılar tek albümde toplansın.', badges: ['Birlikte Yükle', 'Tek Albüm', 'Kolay İndir'], icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
              { title: 'Özel Davetiye', desc: 'WhatsApp, Instagram ve diğer platformlardan kolayca paylaşabileceğiniz size özel davetiye.', badges: ['Kolay Paylaşım', 'Tek link'], icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
            ].map((feature, i) => (
              <div key={i}
                   className="premium-card group p-7 rounded-3xl bg-white transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
                   style={{ border: '1px solid rgba(200,104,110,0.10)', boxShadow: '0 2px 12px rgba(60,40,40,0.04), 0 1px 3px rgba(0,0,0,0.02)' }}
                   onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 18px 40px rgba(200,104,110,0.12), 0 6px 16px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = 'rgba(200,104,110,0.22)'; }}
                   onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(60,40,40,0.04), 0 1px 3px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = 'rgba(200,104,110,0.10)'; }}>
                <div className="flex gap-2 mb-5">
                  <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ background: 'rgba(200,104,110,0.08)', color: '#C8686E' }}>
                    <div aria-hidden="true" className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'radial-gradient(circle at 50% 30%, rgba(200,104,110,0.18) 0%, transparent 70%)' }} />
                    <div className="relative">{feature.icon}</div>
                  </div>
                  {(feature as any).icon2 && (
                    <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ background: 'rgba(200,104,110,0.08)', color: '#C8686E' }}>
                      <div aria-hidden="true" className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'radial-gradient(circle at 50% 30%, rgba(200,104,110,0.18) 0%, transparent 70%)' }} />
                      <div className="relative">{(feature as any).icon2}</div>
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2.5">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed text-[14.5px] mb-4 flex-1">{feature.desc}</p>
                {/* Mini check badges — kartların alt kısmında hizalı (en uzun açıklamaya göre) */}
                <div className="flex gap-1.5 flex-wrap pt-3 border-t mt-auto" style={{ borderColor: 'rgba(200,104,110,0.10)' }}>
                  {feature.badges.map((b, bi) => (
                    <span key={bi} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap" style={{ background: 'rgba(200,104,110,0.07)', color: '#9F4F58', border: '1px solid rgba(200,104,110,0.14)' }}>
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PAKETLER */}
      {/* Premium section divider */}
      <div aria-hidden="true" className="flex items-center justify-center gap-2.5 py-3 md:py-4">
        <span className="h-px w-14 md:w-20" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,104,110,0.30), transparent)' }} />
        <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(200,104,110,0.45)' }} />
        <span className="h-px w-14 md:w-20" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,104,110,0.30), transparent)' }} />
      </div>

      {/* PAKETLER — Tone A */}
      <section id="paketler" className="py-16 md:py-14" style={{ background: 'linear-gradient(180deg, #FDF7F3 0%, #FAF4F0 100%)', scrollMarginTop: '80px' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-5" style={{ fontFamily: 'var(--font-playfair)' }}>Size Uygun <span className="gradient-text">Paketi Seçin</span></h2>
          </div>

          {/* Güven kartı — yazı kartı ortalar (fit-content) */}
          <div className="mb-14 flex justify-center px-4">
            <div className="inline-flex items-center gap-3 rounded-xl px-4 py-2.5" style={{ background: 'rgba(255,250,250,0.85)', border: '1px solid rgba(200,104,110,0.18)', boxShadow: '0 2px 10px rgba(200,104,110,0.05)' }}>
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,104,110,0.10)', border: '1px solid rgba(200,104,110,0.18)' }}>
                <svg className="w-4 h-4" style={{ color: '#C8686E' }} fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M12 2L4 5v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V5l-8-3z" />
                </svg>
              </div>
              <p className="text-[13px] leading-snug text-left md:whitespace-nowrap" style={{ color: '#3F3F3F' }}>
                Paket satın alımlarınızı, kart bilgilerinizi paylaşmadan uygulama içi satın alma ile{' '}
                <span style={{ color: '#C8686E', fontWeight: 600 }}>güvenle tamamlayın.</span>
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-14 md:gap-8 max-w-5xl mx-auto items-start">
            {[
              { id: 0, name: 'Nikah', sub: 'Temel ihtiyaçlar için ideal', price: '₺1.490', oldPrice: null, discountLabel: null, badge: null, features: ['30 Dakika Canlı Yayın', '100 İzleyici', '1080p Full HD*', 'Fotoğraf Albümü', 'Özel Davetiye Tasarımı', 'Tebrik Mesajları', 'Yayın Kaydı ve İndirme'], disabled: [] },
              { id: 1, name: 'Düğün', sub: 'En çok tercih edilen', price: '₺2.990', oldPrice: null, discountLabel: null, badge: 'En Popüler', features: ['90 Dakika Canlı Yayın', '200 İzleyici', '1080p Full HD*', 'Fotoğraf Albümü', 'Özel Davetiye Tasarımı', 'Tebrik Mesajları', 'Yayın Kaydı ve İndirme'], disabled: [] },
              { id: 2, name: 'Şölen', sub: 'Maksimum deneyim', price: '₺9.990', oldPrice: null, discountLabel: null, badge: null, features: ['180 Dakika Canlı Yayın', '300 İzleyici', '1080p Full HD*', 'Fotoğraf Albümü', 'Özel Davetiye Tasarımı', 'Tebrik Mesajları', 'Yayın Kaydı ve İndirme'], disabled: [] },
            ].map((pkg) => {
              const isSelected = selectedPackage === pkg.id;
              return (
                <div key={pkg.id} onClick={() => setSelectedPackage(pkg.id)} className={`feature-card-hover relative rounded-3xl p-9 transition-all duration-500 cursor-pointer ${isSelected ? 'scale-[1.04]' : 'hover:-translate-y-2'}`} style={isSelected ? { background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(253,245,243,0.96) 100%)', backdropFilter: 'blur(24px)', boxShadow: '0 30px 80px rgba(200,104,110,0.22), 0 12px 32px rgba(200,104,110,0.10), 0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.95)', border: '1.5px solid rgba(200,104,110,0.45)' } : { background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(252,250,248,0.94) 100%)', backdropFilter: 'blur(20px)', boxShadow: '0 16px 50px rgba(60,40,40,0.10), 0 4px 14px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)', border: '1px solid rgba(200,104,110,0.10)' }}>
                  <div className="card-light-sweep" aria-hidden="true" />
                  {/* Premium subtle gold shimmer accent */}
                  {isSelected && <div className="absolute top-0 left-0 right-0 h-24 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(200,104,110,0.10), transparent 70%)' }} />}
                  {pkg.badge && <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-white px-7 py-2 rounded-full text-[13px] font-semibold tracking-wide whitespace-nowrap" style={{ background: 'linear-gradient(135deg, #E08284, #D17075, #C06068)', boxShadow: '0 8px 24px rgba(200,104,110,0.4), 0 2px 8px rgba(160,80,90,0.15), inset 0 1px 0 rgba(255,255,255,0.3)', fontFamily: 'var(--font-geist-sans)', letterSpacing: '0.5px' }}>{pkg.badge}</div>}
                  {/* İndirim rozeti — sadece discountLabel varsa */}
                  {pkg.discountLabel && (
                  <div className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap" style={{ color: '#9F4F58', background: 'linear-gradient(180deg, rgba(255,243,243,0.95) 0%, rgba(253,232,232,0.90) 100%)', border: '1px solid rgba(200,104,110,0.30)', boxShadow: '0 2px 8px rgba(200,104,110,0.10), inset 0 1px 0 rgba(255,255,255,0.95)' }}>
                    <svg className="w-3 h-3" fill="#C8686E" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" /></svg>
                    {pkg.discountLabel}
                  </div>
                  )}
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{pkg.name}</h3>
                    <p className="text-sm text-gray-400">{pkg.sub}</p>
                    <div className="mt-5 flex items-baseline gap-3">
                      <span className="text-5xl font-bold" style={{ color: isSelected ? '#C8686E' : '#111827' }}>{pkg.price}</span>
                      {pkg.oldPrice && <span className="text-xl font-medium text-gray-400 line-through">{pkg.oldPrice}</span>}
                    </div>
                  </div>
                  <ul className="space-y-4 mb-9">
                    {pkg.features.map((f, i) => (<li key={i} className={`flex items-center gap-3 text-sm ${i < 3 ? 'font-bold text-gray-900' : 'text-gray-600'}`}><div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `rgba(200,104,110,${isSelected ? '0.15' : '0.1'})` }}><svg className="w-3 h-3" style={{ color: '#C8686E' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>{f}</li>))}
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
          <p className="text-center text-gray-600 text-sm mt-10">* Canlı yayın çözünürlük kalitesi sizin internet hızınıza bağlıdır.</p>

          {/* Mikro güven satırı — 4 ikon + tek satır metin */}
          <div className="mt-14 max-w-5xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              {[
                { label: 'Kart bilgileriniz istenmez', icon: (
                  <svg className="w-4 h-4 md:w-[18px] md:h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>
                ) },
                { label: 'Ödemeler doğrudan size', icon: (
                  <svg className="w-4 h-4 md:w-[18px] md:h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 12a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V12zm-12 0h.008v.008H6V12z" /></svg>
                ) },
                { label: 'Uygulamasız izleme', icon: (
                  // Telefon + çapraz çizgi (no-app)
                  <svg className="w-4 h-4 md:w-[18px] md:h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
                    <rect x="7" y="2.5" width="10" height="19" rx="2" />
                    <line x1="12" y1="18.5" x2="12" y2="18.5" strokeLinecap="round" strokeWidth="2.4" />
                    <line x1="4" y1="20" x2="20" y2="4" strokeLinecap="round" strokeWidth="2" />
                  </svg>
                ) },
                { label: 'Yayın tekrarı izleme', icon: (
                  // Refresh / replay icon
                  <svg className="w-4 h-4 md:w-[18px] md:h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                ) },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5" style={{ color: '#9F4F58' }}>
                  <div className="flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,104,110,0.08)', border: '1px solid rgba(200,104,110,0.14)' }}>
                    {item.icon}
                  </div>
                  <span className="text-[12px] md:text-[13px] font-medium leading-snug" style={{ color: '#3F3F3F' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Premium section divider — paketler → SSS arası */}
      <div aria-hidden="true" className="flex items-center justify-center gap-2.5 py-3 md:py-4">
        <span className="h-px w-14 md:w-20" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,104,110,0.30), transparent)' }} />
        <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(200,104,110,0.45)' }} />
        <span className="h-px w-14 md:w-20" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,104,110,0.30), transparent)' }} />
      </div>

      {/* SSS — Tone A */}
      <section id="sss" className="py-16 md:py-14" style={{ background: 'linear-gradient(180deg, #FDF7F3 0%, #FAF4F0 100%)', scrollMarginTop: '80px' }}>
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-10 md:mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-5" style={{ fontFamily: 'var(--font-playfair)' }}>Sık Sorulan <span className="gradient-text">Sorular</span></h2>
          </div>
          <div className="space-y-3">
            {[
              { q: "Nikahım platformu nasıl çalışır?", a: (
                <>
                  <p>Nikahım platformunda çiftler, uygulamamızı App Store veya Google Play üzerinden indirerek kendilerine özel bir canlı yayın sayfası oluşturabilirler. Ardından düğün veya nikah törenlerini canlı yayınlayabilecekleri bu sayfayı, onlarca farklı tasarım seçeneği arasından hazırladıkları online davetiye ile aileleri, arkadaşları ve sevdikleriyle paylaşabilirler.</p>
                  <p>Nikahım&apos;ın Canlı Yayın, Altın Takma ve Tebrik Mesajları özellikleri sayesinde davetliler, yayını izlerken aynı zamanda çifte altın takabilir, video, sesli veya yazılı tebrik mesajları gönderebilirler. Altın takma işlemlerinde ödemeler doğrudan çiftin kendi hesabına Havale/EFT veya kripto para yöntemleriyle gerçekleştirilir.</p>
                </>
              ), icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              ) },
              { q: "Online nikah sayfasında hangi özellikler bulunur?", a: (
                <>
                  <p>Nikahım üzerinden oluşturulan kişiye özel canlı yayın sayfasında çiftler;</p>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>Düğün veya nikah törenlerini canlı yayınlayabilir,</li>
                    <li>Bu özel güne ait fotoğraflarını davetlileriyle paylaşabilir,</li>
                    <li>Altın Takma özelliği ile davetlilerden ödeme kabul edebilir,</li>
                    <li>Video, sesli veya yazılı tebrik mesajları alabilirler.</li>
                  </ul>
                  <p>Tüm bu özellikler tek bir sayfa üzerinden kolayca yönetilebilir.</p>
                </>
              ), icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" /></svg>
              ) },
              { q: "Nikahım platformu güvenilir mi?", a: (
                <>
                  <p>Nikahım.com, kurulduğu günden bu yana çiftlerin mutluluğunu ve kullanıcı gizliliğini ön planda tutan bir aile girişimidir.</p>
                  <p>Platform üzerinde paylaşılan video, fotoğraf, yazılı ve sesli içerikler yalnızca çift ve davetlileri arasında kalır. Nikahım, kullanıcı bilgilerini hiçbir şekilde üçüncü şahıslarla veya kuruluşlarla paylaşmaz.</p>
                  <p>Davetliler tarafından yapılan tüm ödemeler doğrudan çiftin kendi banka hesabına veya kripto para cüzdanına gönderilir. Nikahım bu ödeme sürecinde aracılık yapmaz ve herhangi bir kullanıcı fonunu elinde tutmaz.</p>
                </>
              ), icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M12 2L4 5v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V5l-8-3z" /></svg>
              ) },
              { q: "Altın takma sistemi nasıl çalışır?", a: (
                <>
                  <p>Nikahım, altın takma bölümünde güncel altın fiyatlarını düzenli olarak güncelleyerek canlı yayın sayfasında görüntüler.</p>
                  <p>Çifte altın takmak isteyen davetli, takmak istediği altın türünü seçer ve buna karşılık gelen güncel TL tutarını görüntüler. Ödeme, davetlinin kendi bankacılık uygulaması veya kripto para cüzdanı üzerinden doğrudan çiftin hesabına gönderilir.</p>
                  <p>Transfer işlemini tamamlayan davetli, canlı yayın sayfasına geri dönerek gönderimini onaylar. Onaylanan işlemler sistemde kayıt altına alınır ve çiftler uygulama üzerinden hangi davetlinin hangi tür altın taktığını görüntüleyebilirler.</p>
                </>
              ), icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
              ) },
              { q: "Fotoğraf albümüne kimler ve nasıl fotoğraf yükleyebilir?", a: (
                <>
                  <p>Fotoğraf albümüne hem çiftler uygulama üzerinden hem de davetliler canlı yayın sayfası aracılığıyla fotoğraf yükleyebilirler.</p>
                  <p>Tek seferde en fazla 20 fotoğraf yüklenebilir ve bir etkinlik için toplamda 500 fotoğrafa kadar yükleme yapılabilir.</p>
                  <p>Yüklenen tüm fotoğraflar canlı yayın sayfasında otomatik olarak görüntülenir ve etkinlik tarihinden itibaren 30 gün boyunca erişilebilir. Çiftler bu süre içerisinde tüm fotoğrafları uygulama üzerinden kolayca indirebilirler.</p>
                  <p>30 günlük sürenin sonunda fotoğraflar sistem tarafından otomatik olarak silinir.</p>
                </>
              ), icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) },
              { q: "Davetlilerimin gönderdiği tebrik mesajlarını kimler görebilir?", a: (
                <>
                  <p>Gönderilen video, sesli ve yazılı tebrik mesajları yalnızca çift tarafından görüntülenebilir. Mesajlar diğer davetlilerle paylaşılmaz.</p>
                </>
              ), icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              ) },
              { q: "Canlı yayınlar kayıt altına alınıyor mu?", a: (
                <>
                  <p>Evet. Nikahım üzerinden gerçekleştirilen tüm canlı yayınlar otomatik olarak kayıt altına alınır.</p>
                  <p>Canlı yayın sona erdikten birkaç dakika sonra yayın kaydı aynı sayfada video olarak izlenmeye devam edilebilir. Kayıtlar 30 gün boyunca erişilebilir durumda kalır ve çiftler bu süre içerisinde videolarını uygulama üzerinden indirebilirler.</p>
                  <p>30 günlük sürenin sonunda tüm video kayıtları sistemden otomatik olarak silinir.</p>
                </>
              ), icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              ) },
              { q: "Canlı yayını aynı anda kaç kişi izleyebilir?", a: (
                <>
                  <p>Canlı yayını aynı anda izleyebilecek davetli sayısı, satın alınan pakete göre belirlenir.</p>
                  <p>Nikahım&apos;ın en kapsamlı paketi olan Şölen Paket kapsamında, canlı yayın veya yayın kaydı toplam 300 davetliye kadar izletilebilir.</p>
                  <p>Daha fazla katılımcı bekleyen çiftler, paket satın alma aşamasında ek davetli hakkı satın alarak izleyici kapasitelerini artırabilirler.</p>
                </>
              ), icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-3.13a4 4 0 100-8 4 4 0 000 8zm6 0a3 3 0 100-6 3 3 0 000 6zm-12 0a3 3 0 100-6 3 3 0 000 6z" /></svg>
              ) },
            ].map((faq, index) => (
              <div key={index}
                   className="bg-white rounded-2xl overflow-hidden transition-all duration-300"
                   style={{ border: '1px solid rgba(200,104,110,0.12)', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}
                   onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(200,104,110,0.28)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(200,104,110,0.08), 0 2px 6px rgba(0,0,0,0.04)'; }}
                   onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(200,104,110,0.12)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)'; }}>
                <button onClick={() => setOpenFaq(openFaq === index ? null : index)} className="w-full p-5 md:p-6 flex items-center gap-4 text-left">
                  {/* Sol icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,104,110,0.10)', color: '#C8686E' }}>
                    {faq.icon}
                  </div>
                  {/* Soru */}
                  <span className="flex-1" style={{ fontWeight: 600, color: '#2E3445' }}>{faq.q}</span>
                  {/* Chevron */}
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''}`} style={{ background: 'rgba(200,104,110,0.10)', color: '#C8686E' }}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </button>
                {openFaq === index && <div className="px-5 md:px-6 pb-6 pl-[68px] md:pl-[76px] text-gray-500 leading-relaxed space-y-3">{faq.a}</div>}
              </div>
            ))}

            {/* Hâlâ sorunuz mu var? — CTA card → ConciergeSheet açar */}
            <div className="rounded-2xl p-5 md:p-6 mt-6 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #FBEEEC 0%, #FDF5F2 100%)', border: '1px solid rgba(200,104,110,0.18)', boxShadow: '0 4px 16px rgba(200,104,110,0.08)' }}>
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(200,104,110,0.14)', color: '#C8686E' }}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 text-[15px] md:text-[16px]">Sorunuzun cevabını bulamadınız mı?</h4>
                <p className="text-gray-500 text-[12.5px] md:text-[13px] mt-0.5">Ekibimiz size yardımcı olmaktan mutluluk duyar.</p>
              </div>
              <button onClick={() => setShowConciergeSheet(true)} className="flex-shrink-0 inline-flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 rounded-full text-white text-[13px] md:text-[14px] font-semibold transition-all hover:scale-[1.03]" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)', boxShadow: '0 6px 20px rgba(200,104,110,0.25)' }}>
                <span className="hidden md:inline">Bizimle İletişime Geçin</span>
                <span className="md:hidden">İletişim</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* İLETİŞİM */}
      {/* Premium section divider */}
      <div aria-hidden="true" className="flex items-center justify-center gap-2.5 py-3 md:py-4">
        <span className="h-px w-14 md:w-20" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,104,110,0.30), transparent)' }} />
        <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(200,104,110,0.45)' }} />
        <span className="h-px w-14 md:w-20" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,104,110,0.30), transparent)' }} />
      </div>

      {/* BİZE ULAŞIN — Tone B */}
      <section id="iletisim" className="py-16 md:py-14" style={{ background: '#FAF7F5', scrollMarginTop: '80px' }}>
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-5" style={{ fontFamily: 'var(--font-playfair)' }}>Bize <span className="gradient-text">Ulaşın</span></h2>
            <p className="text-lg text-gray-400">Size yardımcı olmaktan mutluluk duyarız</p>
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
              <button onClick={() => window.dispatchEvent(new Event('nikahim:open-chat'))} className="flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-70" style={{ color: '#C8686E' }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,104,110,0.10)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M3 14v-2a9 9 0 0118 0v2" /><path d="M21 14v3a2 2 0 01-2 2h-2v-7h2a2 2 0 012 2z" /><path d="M3 14v3a2 2 0 002 2h2v-7H5a2 2 0 00-2 2z" /><path d="M17 19v1a3 3 0 01-3 3h-2" /></svg>
                </span>
                Canlı Destek
              </button>
              <a href="https://wa.me/905366919361?text=Merhaba%20%21%20Nikah%C4%B1m%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-70" style={{ color: '#1E8E3E' }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(60,180,80,0.12)' }}>
                  <svg className="w-3.5 h-3.5" fill="#1E8E3E" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" /></svg>
                </span>
                WhatsApp
              </a>
              <a href="mailto:destek@nikahim.com" className="flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-70" style={{ color: '#A0782E' }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(212,168,82,0.14)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </span>
                destek@nikahim.com
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #C8686E, #A85359)' }}>
        <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at 30% 50%, #fff, transparent 50%), radial-gradient(circle at 70% 50%, #fff, transparent 50%)' }} />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          {/* Item 35 */}
          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-5">Bu mutlu günü Canlı Yayınlamaya hazır mısınız?</h2>
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
          {/* Bizi Takip Edin — başlık + açıklama + 4 kart */}
          <div className="mb-14">
            <div className="text-center mb-8">
              <h3 className="font-bold text-3xl md:text-4xl mb-3" style={{ fontFamily: 'var(--font-playfair)', color: '#fff' }}>
                Nikahım&apos;ı <span className="gradient-text">Takip Edin</span>
              </h3>
              <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
                Düğün gününüze değer katacak içerikler, yeni özellikler ve duyurular için bizi takip edin
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-3xl mx-auto">
              {[
                { name: 'Instagram', href: 'https://www.instagram.com/nikahimcom',
                  bg: 'linear-gradient(135deg, #feda75 0%, #fa7e1e 25%, #d62976 50%, #962fbf 75%, #4f5bd5 100%)',
                  icon: <svg viewBox="0 0 24 24" fill="#fff" className="w-7 h-7" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg> },
                { name: 'TikTok', href: 'https://www.tiktok.com/@nikahimcom',
                  bg: '#000',
                  icon: <svg viewBox="0 0 24 24" fill="#fff" className="w-7 h-7" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" /></svg> },
                { name: 'YouTube', href: 'https://www.youtube.com/channel/UCkRXEMbHnOli74_E3ZcIh2A',
                  bg: '#FF0000',
                  icon: <svg viewBox="0 0 24 24" fill="#fff" className="w-7 h-7" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg> },
                { name: 'Pinterest', href: 'https://tr.pinterest.com/nikahimcom/',
                  bg: '#E60023',
                  icon: <svg viewBox="0 0 24 24" fill="#fff" className="w-7 h-7" aria-hidden="true"><path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" /></svg> },
              ].map((s) => (
                <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer"
                   className="group flex flex-col items-center gap-3 p-5 rounded-2xl transition-all hover:-translate-y-1"
                   style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                       style={{ background: s.bg, boxShadow: '0 6px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.18)' }}>
                    {s.icon}
                  </div>
                  <p className="text-white font-semibold text-sm">{s.name}</p>
                  <span className="text-[12.5px] font-medium transition-colors text-gray-500 group-hover:text-rose-400">
                    @nikahimcom
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Keşfet */}
          <div className="text-center mb-12">
            <h4 className="font-bold mb-5 text-sm tracking-wider uppercase text-gray-300">Keşfet</h4>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm">
              {[
                { label: 'Özellikler', id: 'ozellikler' },
                { label: 'Neden Nikahım', id: 'neden-nikahim' },
                { label: 'Paketler', id: 'paketler' },
                { label: 'Yardım Merkezi', action: 'concierge' as const },
                { label: 'İletişim', id: 'iletisim' },
              ].map((item) => (
                <button key={item.label}
                        onClick={() => {
                          if (item.action === 'concierge') setShowConciergeSheet(true);
                          else if (item.id) scrollToSection(item.id);
                        }}
                        className="text-gray-400 hover:text-white transition-colors">
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">© 2025 Nikahim.com — Tüm hakları saklıdır.</div>
        </div>
      </footer>

    </main>
  );
}
