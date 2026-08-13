"use client";

import { supabase } from '@/lib/supabase';
import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";

const optimizeImg = (url: string, width: number, quality = 80): string => {
  if (!url || !url.includes('/storage/v1/object/public/')) return url;
  return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + `?width=${width}&quality=${quality}`;
};

interface EventRow {
  id: string;
  bride_first_name: string;
  bride_last_name: string;
  groom_first_name: string;
  groom_last_name: string;
  event_type: string;
  event_date: string;
  couple_photo_url: string | null;
}
interface PrintRow {
  id: string; guest_name: string; photo_url: string; size_label: string;
  price_tl: number; qty: number; status: string; created_at: string; printed_at: string | null;
}
interface SizeRow { id: string; size_label: string; price_tl: number; }

const QUICK_SIZES = ['10x15', '13x18', 'A5', 'A4', '15x21', '20x30'];
const MAX_ATTEMPTS = 5;
const BLOCK_MINUTES = 10;

// ---- Cihaz bazlı deneme sınırı (localStorage) ----
const rlKey = (id: string) => `nkh_photog_rl_${id}`;
function getRL(id: string): { count: number; until: number } {
  if (typeof window === 'undefined') return { count: 0, until: 0 };
  try { return JSON.parse(localStorage.getItem(rlKey(id)) || '{"count":0,"until":0}'); } catch { return { count: 0, until: 0 }; }
}
function setRL(id: string, v: { count: number; until: number }) {
  try { localStorage.setItem(rlKey(id), JSON.stringify(v)); } catch {}
}

// ---- 6 haneli OTP kutuları (Google Authenticator tarzı) ----
function OtpInput({ value, onChange, disabled, error }: { value: string; onChange: (v: string) => void; disabled?: boolean; error?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="relative flex justify-center gap-2.5 select-none" onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 cursor-text"
      />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const filled = i < value.length;
        const active = i === value.length && !disabled;
        return (
          <div
            key={i}
            className="w-10 h-14 rounded-xl flex items-center justify-center text-[24px] font-bold transition-all"
            style={{
              background: disabled ? '#F4F1F1' : '#FFFDFD',
              border: `2px solid ${error ? '#E5484D' : active ? '#E95A68' : filled ? 'rgba(200,104,110,0.4)' : 'rgba(0,0,0,0.10)'}`,
              color: '#342D30',
              boxShadow: active ? '0 0 0 4px rgba(233,90,104,0.10)' : 'none',
            }}
          >
            {filled ? value[i] : (active ? <span className="w-[2px] h-6 bg-[#E95A68] animate-pulse rounded-full" /> : '')}
          </div>
        );
      })}
    </div>
  );
}

export default function FotografciPanel() {
  const [step, setStep] = useState<'login' | 'panel'>('login');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EventRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<EventRow | null>(null);

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [checking, setChecking] = useState(false);
  const [blockLeft, setBlockLeft] = useState(0); // saniye

  const [tab, setTab] = useState<'pending' | 'done' | 'sizes'>('pending');
  const [prints, setPrints] = useState<PrintRow[]>([]);
  const [sizes, setSizes] = useState<SizeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [newSizeLabel, setNewSizeLabel] = useState('');
  const [newSizePrice, setNewSizePrice] = useState('');
  const [addingSize, setAddingSize] = useState(false);
  const priceRef = useRef<HTMLInputElement>(null);

  // Kurulum modalı (giriş sonrası, boy/fiyat yoksa)
  const [showSetup, setShowSetup] = useState(false);
  const [setupStep, setSetupStep] = useState(0);

  // --- Canlı arama (2+ harf, buton yok) ---
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    let alive = true;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('events')
          .select('id, bride_first_name, bride_last_name, groom_first_name, groom_last_name, event_type, event_date, couple_photo_url')
          .eq('photographer_access_enabled', true)
          .or(`bride_first_name.ilike.%${q}%,groom_first_name.ilike.%${q}%,bride_last_name.ilike.%${q}%,groom_last_name.ilike.%${q}%`)
          .order('event_date', { ascending: true })
          .limit(30);
        if (alive) setResults(data || []);
      } catch (e) { console.error(e); }
      if (alive) setSearching(false);
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [query]);

  // Blok sayacı
  useEffect(() => {
    if (blockLeft <= 0) return;
    const t = setInterval(() => setBlockLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [blockLeft]);

  const selectEvent = (e: EventRow) => {
    setSelected(e); setCode(''); setCodeError('');
    const rl = getRL(e.id);
    const now = Date.now();
    if (rl.until > now) setBlockLeft(Math.ceil((rl.until - now) / 1000));
    else setBlockLeft(0);
  };

  const verifyCode = async () => {
    if (!selected || code.length !== 6 || checking || blockLeft > 0) return;
    setChecking(true); setCodeError('');
    try {
      const { data } = await supabase.from('events').select('photographer_access_code, photographer_access_enabled').eq('id', selected.id).single();
      if (!data?.photographer_access_enabled) { setCodeError('Bu etkinlik için baskı hizmeti kapatılmış.'); setChecking(false); return; }
      if ((data?.photographer_access_code || '') === code) {
        setRL(selected.id, { count: 0, until: 0 });
        setStep('panel');
        await loadDashboard(selected.id, true);
      } else {
        const rl = getRL(selected.id);
        const count = (rl.count || 0) + 1;
        if (count >= MAX_ATTEMPTS) {
          const until = Date.now() + BLOCK_MINUTES * 60 * 1000;
          setRL(selected.id, { count: 0, until });
          setBlockLeft(BLOCK_MINUTES * 60);
          setCodeError(`Çok fazla yanlış deneme. ${BLOCK_MINUTES} dakika sonra tekrar deneyin.`);
        } else {
          setRL(selected.id, { count, until: 0 });
          setCodeError(`Bu ${selected.event_type === 'dugun' ? 'düğün' : 'nikah'} için kod hatalı. ${MAX_ATTEMPTS - count} hakkınız kaldı.`);
        }
        setCode('');
      }
    } catch (e) { console.error(e); setCodeError('Bir hata oluştu, tekrar deneyin.'); }
    setChecking(false);
  };

  const loadDashboard = useCallback(async (eventId: string, firstLoad = false) => {
    setLoading(true);
    try {
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from('print_requests').select('*').eq('event_id', eventId).order('created_at', { ascending: false }),
        supabase.from('photo_print_sizes').select('*').eq('event_id', eventId).order('price_tl', { ascending: true }),
      ]);
      setPrints(p || []);
      setSizes(s || []);
      if (firstLoad && (s || []).length === 0) { setShowSetup(true); setSetupStep(0); setTab('sizes'); }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (step !== 'panel' || !selected) return;
    const ch = supabase
      .channel(`prints-${selected.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'print_requests', filter: `event_id=eq.${selected.id}` }, () => loadDashboard(selected.id))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [step, selected, loadDashboard]);

  const addSize = async () => {
    if (!selected) return;
    const label = newSizeLabel.trim();
    const price = parseFloat(newSizePrice);
    if (!label || isNaN(price) || price < 0) return;
    setAddingSize(true);
    try {
      await supabase.from('photo_print_sizes').insert({ event_id: selected.id, size_label: label, price_tl: price });
      setNewSizeLabel(''); setNewSizePrice('');
      await loadDashboard(selected.id);
    } catch (e) { console.error(e); }
    setAddingSize(false);
  };
  const deleteSize = async (id: string) => { if (!selected) return; await supabase.from('photo_print_sizes').delete().eq('id', id); loadDashboard(selected.id); };
  const markPrinted = async (id: string) => { await supabase.from('print_requests').update({ status: 'printed', printed_at: new Date().toISOString() }).eq('id', id); if (selected) loadDashboard(selected.id); };
  const revertPrinted = async (id: string) => { await supabase.from('print_requests').update({ status: 'pending', printed_at: null }).eq('id', id); if (selected) loadDashboard(selected.id); };

  const downloadPhoto = async (url: string, label: string) => {
    try {
      const res = await fetch(url); const blob = await res.blob();
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${label}.jpg`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch { window.open(url, '_blank'); }
  };
  const printPhoto = (url: string) => {
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`<html><head><title>Baskı</title><style>@page{margin:0}body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh}img{max-width:100%;max-height:100vh}</style></head><body><img src="${url}" onload="setTimeout(function(){window.print()},300)"/></body></html>`);
    w.document.close();
  };

  const pending = prints.filter((p) => p.status === 'pending');
  const done = prints.filter((p) => p.status === 'printed');
  const groupedPending = pending.reduce<Record<string, PrintRow[]>>((acc, p) => { (acc[p.guest_name] = acc[p.guest_name] || []).push(p); return acc; }, {});
  const coupleTitle = (e: EventRow) => `${e.bride_first_name} & ${e.groom_first_name}`;
  const fmtBlock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Küçük çift avatarı — transform kaynaklı siyah kareyi önlemek için ham url + onError fallback
  const Avatar = ({ url, size }: { url: string | null; size: number }) => (
    url
      ? <img src={url} alt="" width={size} height={size} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      : <div className="w-full h-full flex items-center justify-center text-2xl">💍</div>
  );

  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(180deg, #FDF3F1 0%, #FBEEEC 45%, #FCF6F3 100%)' }}>
      {/* ================= GİRİŞ ================= */}
      {step === 'login' && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-[28px] overflow-hidden relative" style={{ background: '#FFFDFC', boxShadow: '0 30px 80px rgba(180,90,100,0.18), 0 8px 24px rgba(200,104,110,0.10)', border: '1px solid rgba(200,104,110,0.14)' }}>
            {/* İllüstrasyon */}
            <div className="relative w-full" style={{ aspectRatio: '3 / 1.7', background: 'linear-gradient(180deg,#2a1f1e,#3a2b28)' }}>
              <img src="/fotografci-login.png" alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 55%, rgba(255,253,252,0.95))' }} />
            </div>

            <div className="px-7 pb-8 -mt-6 relative">
              {/* Logo + isim */}
              <div className="flex flex-col items-center">
                <Image src="/navbar-icon.png" alt="Nikahım" width={54} height={54} className="h-12 w-auto object-contain drop-shadow" />
                <p className="text-[19px] font-bold mt-1" style={{ color: '#B85258', fontFamily: 'var(--font-playfair), Georgia, serif' }}>Nikahım</p>
                <h1 className="text-[15px] font-semibold mt-2 mb-1" style={{ color: '#4A3A3A' }}>Fotoğrafçı Girişi</h1>
              </div>

              {/* Etkinlik seç */}
              <label className="block text-[13px] font-semibold mt-4 mb-2" style={{ color: '#6B5A5A' }}>Lütfen etkinlik seçin</label>
              {selected ? (
                <button onClick={() => { setSelected(null); setResults([]); setQuery(''); setCode(''); setCodeError(''); }} className="w-full flex items-center gap-3 p-2.5 rounded-2xl text-left" style={{ background: 'rgba(200,104,110,0.06)', border: '1.5px solid rgba(200,104,110,0.35)' }}>
                  <span className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0"><Avatar url={selected.couple_photo_url} size={44} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-gray-900 text-[14px]">{coupleTitle(selected)}</span>
                    <span className="block text-[11.5px] text-gray-400">{selected.event_type === 'dugun' ? 'Düğün' : 'Nikah'} · {selected.event_date}</span>
                  </span>
                  <span className="text-[12px] font-semibold" style={{ color: '#C8686E' }}>Değiştir</span>
                </button>
              ) : (
                <>
                  <div className="relative">
                    <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Çiftin adı veya soyadı (en az 2 harf)…" className="w-full pl-10 pr-4 py-3 rounded-xl border outline-none text-gray-900 text-[14px]" style={{ borderColor: 'rgba(0,0,0,0.12)' }} />
                  </div>
                  {query.trim().length >= 2 && (
                    <div className="mt-2 flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                      {searching && <p className="text-center text-[12.5px] text-gray-400 py-3">Aranıyor…</p>}
                      {!searching && results.length === 0 && <p className="text-center text-[12.5px] text-gray-400 py-3">Sonuç yok. Çift baskı iznini açmamış olabilir.</p>}
                      {results.map((e) => (
                        <button key={e.id} onClick={() => selectEvent(e)} className="flex items-center gap-3 p-2 rounded-xl text-left transition-colors hover:bg-rose-50/60" style={{ border: '1px solid rgba(200,104,110,0.12)' }}>
                          <span className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0"><Avatar url={e.couple_photo_url} size={40} /></span>
                          <span className="flex-1 min-w-0">
                            <span className="block font-semibold text-gray-900 text-[13.5px] truncate">{coupleTitle(e)}</span>
                            <span className="block text-[11px] text-gray-400">{e.event_type === 'dugun' ? 'Düğün' : 'Nikah'} · {e.event_date}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Kod gir (etkinlik seçilmeden gri) */}
              <div className="mt-5" style={{ opacity: selected ? 1 : 0.45, pointerEvents: selected ? 'auto' : 'none' }}>
                <label className="block text-[13px] font-semibold mb-2.5 text-center" style={{ color: '#6B5A5A' }}>Lütfen bu etkinlik için kodu girin</label>
                <OtpInput value={code} onChange={(v) => { setCode(v); setCodeError(''); }} disabled={!selected || blockLeft > 0} error={!!codeError} />
                {codeError && <p className="text-[12.5px] text-center mt-2.5" style={{ color: '#E5484D' }}>{codeError}</p>}
                {blockLeft > 0 && <p className="text-[12.5px] text-center mt-1 text-gray-400">Kalan süre: {fmtBlock(blockLeft)}</p>}
                <button onClick={verifyCode} disabled={!selected || code.length !== 6 || checking || blockLeft > 0} className="w-full mt-4 py-3 rounded-xl font-semibold text-white disabled:opacity-40 transition-opacity" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}>
                  {checking ? 'Kontrol ediliyor…' : 'Giriş Yap'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= PANEL ================= */}
      {step === 'panel' && selected && (
        <>
          <header className="sticky top-0 z-30 backdrop-blur-md" style={{ background: 'rgba(255,252,250,0.9)', borderBottom: '1px solid rgba(200,104,110,0.12)' }}>
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Image src="/navbar-icon.png" alt="Nikahım" width={38} height={38} className="h-9 w-auto object-contain" />
                <div>
                  <p className="text-[15px] font-bold" style={{ color: '#B85258' }}>Fotoğrafçı Paneli</p>
                  <p className="text-[11px] text-gray-400 -mt-0.5">{coupleTitle(selected)}</p>
                </div>
              </div>
              <button onClick={() => { setStep('login'); setSelected(null); setCode(''); setResults([]); setQuery(''); setPrints([]); setSizes([]); }} className="text-[13px] font-semibold px-3 py-1.5 rounded-lg" style={{ color: '#C8686E', background: 'rgba(200,104,110,0.08)' }}>Çıkış</button>
            </div>
          </header>

          <div className="max-w-5xl mx-auto px-4 py-6">
            {/* Sekmeler */}
            <div className="flex gap-1 p-1 rounded-xl mb-5 max-w-md" style={{ background: 'rgba(200,104,110,0.07)' }}>
              {([['pending', 'Bekleyenler', pending.length], ['done', 'Tamamlananlar', done.length], ['sizes', 'Baskı Boyutları', sizes.length]] as const).map(([k, lbl, n]) => (
                <button key={k} onClick={() => setTab(k)} className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5" style={{ background: tab === k ? '#fff' : 'transparent', color: tab === k ? '#C8686E' : '#9A8A8A', boxShadow: tab === k ? '0 2px 6px rgba(200,104,110,0.12)' : 'none' }}>
                  {lbl}
                  {n > 0 && <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white" style={{ background: k === 'pending' ? '#E5484D' : '#C8686E' }}>{n}</span>}
                </button>
              ))}
            </div>

            {loading && <p className="text-center text-sm text-gray-400 py-8">Yükleniyor…</p>}

            {/* Bekleyenler */}
            {!loading && tab === 'pending' && (
              Object.keys(groupedPending).length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-12">Bekleyen baskı isteği yok.</p>
              ) : (
                <div className="flex flex-col gap-5">
                  {Object.entries(groupedPending).map(([guest, rows]) => (
                    <div key={guest}>
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[12px] font-bold" style={{ background: 'linear-gradient(135deg, #E9A0A3, #C8686E)' }}>{guest.charAt(0).toUpperCase()}</span>
                        <h3 className="font-bold text-gray-800">Davetli: {guest}</h3>
                        <span className="text-[12px] text-gray-400">{rows.length} baskı</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {rows.map((r) => (
                          <div key={r.id} className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid rgba(200,104,110,0.14)' }}>
                            <button onClick={() => setLightbox(r.photo_url)} className="relative aspect-square w-full bg-gray-50 block">
                              <img src={optimizeImg(r.photo_url, 400)} alt="" className="w-full h-full object-cover" />
                              <span className="absolute bottom-1.5 left-1.5 px-2 py-[3px] rounded-md text-[11px] font-bold text-white" style={{ background: 'rgba(0,0,0,0.55)' }}>{r.size_label} · {r.qty} adet</span>
                            </button>
                            <div className="p-2">
                              <p className="text-[12px] text-gray-500 mb-2 text-center">{r.qty} × {r.price_tl}₺ = <span className="font-bold" style={{ color: '#B85258' }}>{r.qty * r.price_tl}₺</span></p>
                              <div className="flex gap-1.5 mb-1.5">
                                <button onClick={() => downloadPhoto(r.photo_url, `${guest}_${r.size_label}`)} title="İndir" className="flex-1 py-1.5 rounded-lg flex items-center justify-center" style={{ background: 'rgba(200,104,110,0.08)', color: '#C8686E' }}>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                                </button>
                                <button onClick={() => printPhoto(r.photo_url)} title="Yazdır" className="flex-1 py-1.5 rounded-lg flex items-center justify-center" style={{ background: 'rgba(200,104,110,0.08)', color: '#C8686E' }}>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096M17.66 18L17.28 21.523M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456M17.66 18h1.09A2.25 2.25 0 0021 15.75V9.456m-18 0a2.25 2.25 0 011.837-2.175M3 9.456V6.375c0-.621.504-1.125 1.125-1.125h15.75c.621 0 1.125.504 1.125 1.125v3.081" /></svg>
                                </button>
                              </div>
                              {/* içi boş yeşil — Baskıyı Tamamladım */}
                              <button onClick={() => markPrinted(r.id)} className="w-full py-2 rounded-lg text-[12px] font-semibold flex items-center justify-center" style={{ border: '1.5px solid #318052', color: '#318052', background: 'transparent' }}>
                                Baskıyı Tamamladım
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Tamamlananlar */}
            {!loading && tab === 'done' && (
              done.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-12">Henüz tamamlanan baskı yok.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {done.map((r) => (
                    <div key={r.id} className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid rgba(49,128,82,0.20)' }}>
                      <div className="relative aspect-square w-full bg-gray-50">
                        <button onClick={() => setLightbox(r.photo_url)} className="absolute inset-0 w-full h-full block">
                          <img src={optimizeImg(r.photo_url, 400)} alt="" className="w-full h-full object-cover opacity-95" />
                        </button>
                        {/* geri al — sol üst beyaz buton */}
                        <button onClick={() => revertPrinted(r.id)} title="Geri al" className="absolute top-1.5 left-1.5 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
                          <svg className="w-4 h-4" fill="none" stroke="#8A7E7E" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                        </button>
                        {/* içi dolu yeşil + tik — Baskı Tamamlandı */}
                        <span className="absolute top-1.5 right-1.5 px-2 py-[3px] rounded-full text-[10px] font-bold text-white flex items-center gap-1" style={{ background: '#318052' }}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          Baskı Tamamlandı
                        </span>
                        <span className="absolute bottom-1.5 left-1.5 px-2 py-[3px] rounded-md text-[11px] font-bold text-white" style={{ background: 'rgba(0,0,0,0.55)' }}>{r.size_label} · {r.qty} adet</span>
                      </div>
                      <div className="p-2"><span className="text-[12px] text-gray-500 truncate">Davetli: {r.guest_name}</span></div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Baskı Boyutları */}
            {!loading && tab === 'sizes' && (
              <div className="max-w-lg">
                <div className="rounded-2xl p-4 mb-5 bg-white" style={{ border: '1px solid rgba(200,104,110,0.14)' }}>
                  <h3 className="font-bold text-gray-800 mb-1">Fotoğraf Boyu Ekle</h3>
                  <p className="text-[12.5px] text-gray-400 mb-3">Davetliler yalnızca buraya eklediğiniz boyutlardan seçebilir. Fiyatı görmeleri sipariş vermelerini kolaylaştırır.</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {QUICK_SIZES.map((sz) => (
                      <button key={sz} onClick={() => { setNewSizeLabel(sz); setTimeout(() => priceRef.current?.focus(), 50); }} className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold" style={{ background: newSizeLabel === sz ? 'rgba(200,104,110,0.12)' : '#F3EEEE', color: newSizeLabel === sz ? '#C8686E' : '#7A6E6E' }}>{sz}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={newSizeLabel} onChange={(e) => setNewSizeLabel(e.target.value)} placeholder="Boyut (ör. 10x15)" className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-gray-200 outline-none focus:border-[#C8686E]/50 text-gray-900 text-[14px]" />
                    <div className="relative w-28">
                      <input ref={priceRef} value={newSizePrice} onChange={(e) => setNewSizePrice(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="Fiyat" className="w-full px-3 py-2.5 pr-7 rounded-lg border border-gray-200 outline-none focus:border-[#C8686E]/50 text-gray-900 text-[14px]" onKeyDown={(e) => e.key === 'Enter' && addSize()} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[14px]">₺</span>
                    </div>
                    <button onClick={addSize} disabled={addingSize || !newSizeLabel.trim() || newSizePrice === ''} className="px-4 rounded-lg font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}>Ekle</button>
                  </div>
                </div>
                {sizes.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-6">Henüz boyut eklemediniz.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {sizes.map((sz) => (
                      <div key={sz.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white" style={{ border: '1px solid rgba(200,104,110,0.12)' }}>
                        <span className="font-semibold text-gray-800">{sz.size_label}</span>
                        <div className="flex items-center gap-4">
                          <span className="font-bold" style={{ color: '#B85258' }}>{sz.price_tl > 0 ? `${sz.price_tl}₺` : 'Fiyat yok'}</span>
                          <button onClick={() => deleteSize(sz.id)} className="text-gray-300 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Giriş sonrası kurulum modalı — kayan 2 adım */}
          {showSetup && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
              <div className="w-full max-w-md rounded-[26px] overflow-hidden relative" style={{ background: '#FFFDFC', boxShadow: '0 30px 80px rgba(0,0,0,0.2)' }}>
                <div className="flex transition-transform duration-400" style={{ transform: `translateX(-${setupStep * 100}%)` }}>
                  {/* Adım 0 — tanıtım */}
                  <div className="w-full flex-shrink-0">
                    <div className="relative w-full" style={{ aspectRatio: '3 / 2.4' }}>
                      <img src="/fotografci-panel.png" alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 60%, rgba(255,253,252,0.96))' }} />
                    </div>
                    <div className="px-7 pb-7 -mt-4 relative text-center">
                      <h3 className="text-[18px] font-bold mb-2" style={{ color: '#B85258', fontFamily: 'var(--font-playfair), Georgia, serif' }}>Hoş Geldiniz</h3>
                      <p className="text-[13.5px] leading-relaxed text-gray-600 mb-6">Davetlilerin size baskı talebi gönderebilmesi için önce lütfen yapabildiğiniz fotoğraf baskı boylarını ve fiyatlarını oluşturun.</p>
                      <button onClick={() => setSetupStep(1)} className="w-full py-3 rounded-xl font-semibold text-white" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}>Devam Et</button>
                    </div>
                  </div>
                  {/* Adım 1 — boy/fiyat */}
                  <div className="w-full flex-shrink-0 p-7">
                    <button onClick={() => setSetupStep(0)} className="text-[13px] text-gray-400 mb-3 flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>Geri</button>
                    <h3 className="text-[17px] font-bold text-gray-900 mb-1">Baskı Boyutları</h3>
                    <p className="text-[12.5px] text-gray-400 mb-3">En az bir boyut ekleyin. Boy seçince fiyat alanına geçin.</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {QUICK_SIZES.map((sz) => (
                        <button key={sz} onClick={() => { setNewSizeLabel(sz); setTimeout(() => priceRef.current?.focus(), 50); }} className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold" style={{ background: newSizeLabel === sz ? 'rgba(200,104,110,0.12)' : '#F3EEEE', color: newSizeLabel === sz ? '#C8686E' : '#7A6E6E' }}>{sz}</button>
                      ))}
                    </div>
                    <div className="flex gap-2 mb-4">
                      <input value={newSizeLabel} onChange={(e) => setNewSizeLabel(e.target.value)} placeholder="Boyut" className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-gray-200 outline-none focus:border-[#C8686E]/50 text-gray-900 text-[14px]" />
                      <div className="relative w-24">
                        <input ref={priceRef} value={newSizePrice} onChange={(e) => setNewSizePrice(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="Fiyat" className="w-full px-3 py-2.5 pr-6 rounded-lg border border-gray-200 outline-none focus:border-[#C8686E]/50 text-gray-900 text-[14px]" onKeyDown={(e) => e.key === 'Enter' && addSize()} />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">₺</span>
                      </div>
                      <button onClick={addSize} disabled={addingSize || !newSizeLabel.trim() || newSizePrice === ''} className="px-3 rounded-lg font-semibold text-white text-[13px] disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}>Ekle</button>
                    </div>
                    {sizes.length > 0 && (
                      <div className="flex flex-col gap-1.5 mb-4 max-h-40 overflow-y-auto">
                        {sizes.map((sz) => (
                          <div key={sz.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(200,104,110,0.05)' }}>
                            <span className="text-[13px] font-semibold text-gray-700">{sz.size_label}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[13px] font-bold" style={{ color: '#B85258' }}>{sz.price_tl > 0 ? `${sz.price_tl}₺` : 'Fiyat yok'}</span>
                              <button onClick={() => deleteSize(sz.id)} className="text-gray-300 hover:text-red-500 text-[12px]">sil</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[11.5px] text-gray-400 mb-3 flex items-start gap-1.5"><span style={{ color: '#C8686E' }}>ⓘ</span> Fiyat girmezseniz davetli “Fotoğrafçınız ile fiyat bilgisini görüşün” uyarısı görür.</p>
                    <button onClick={() => setShowSetup(false)} disabled={sizes.length === 0} className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}>Panele Geç</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setLightbox(null)}>
          <img src={optimizeImg(lightbox, 1400, 90)} alt="" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
    </main>
  );
}
