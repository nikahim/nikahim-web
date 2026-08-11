"use client";

import { supabase } from '@/lib/supabase';
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";

// Görsel optimizasyon (CDN resize) — orijinal dosya baskı için indirilecek, önizleme küçültülür
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
  id: string;
  guest_name: string;
  photo_url: string;
  size_label: string;
  price_tl: number;
  qty: number;
  status: string;
  created_at: string;
  printed_at: string | null;
}

interface SizeRow { id: string; size_label: string; price_tl: number; }

const QUICK_SIZES = ['10x15', '13x18', 'A5', 'A4', '15x21', '20x30'];

export default function FotografciPortal() {
  const [step, setStep] = useState<'search' | 'code' | 'dashboard'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EventRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<EventRow | null>(null);

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [checking, setChecking] = useState(false);

  const [tab, setTab] = useState<'pending' | 'done' | 'sizes'>('pending');
  const [prints, setPrints] = useState<PrintRow[]>([]);
  const [sizes, setSizes] = useState<SizeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [newSizeLabel, setNewSizeLabel] = useState('');
  const [newSizePrice, setNewSizePrice] = useState('');
  const [addingSize, setAddingSize] = useState(false);

  // --- Arama ---
  const runSearch = async () => {
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true);
    try {
      const { data } = await supabase
        .from('events')
        .select('id, bride_first_name, bride_last_name, groom_first_name, groom_last_name, event_type, event_date, couple_photo_url')
        .eq('photographer_access_enabled', true)
        .or(`bride_first_name.ilike.%${q}%,groom_first_name.ilike.%${q}%,bride_last_name.ilike.%${q}%,groom_last_name.ilike.%${q}%`)
        .limit(20);
      setResults(data || []);
    } catch (e) { console.error(e); }
    setSearching(false);
  };

  // --- Kod doğrulama ---
  const verifyCode = async () => {
    if (!selected || code.length !== 6) return;
    setChecking(true); setCodeError('');
    try {
      const { data } = await supabase.from('events').select('photographer_access_code, photographer_access_enabled').eq('id', selected.id).single();
      if (!data?.photographer_access_enabled) { setCodeError('Bu etkinlik için baskı hizmeti kapatılmış.'); setChecking(false); return; }
      if ((data?.photographer_access_code || '') === code) {
        setStep('dashboard');
        loadDashboard(selected.id);
      } else {
        setCodeError('Kod hatalı. Lütfen çiftin verdiği 6 haneli kodu girin.');
      }
    } catch (e) { console.error(e); setCodeError('Bir hata oluştu, tekrar deneyin.'); }
    setChecking(false);
  };

  const loadDashboard = useCallback(async (eventId: string) => {
    setLoading(true);
    try {
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from('print_requests').select('*').eq('event_id', eventId).order('created_at', { ascending: false }),
        supabase.from('photo_print_sizes').select('*').eq('event_id', eventId).order('price_tl', { ascending: true }),
      ]);
      setPrints(p || []);
      setSizes(s || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  // Realtime — yeni baskı istekleri düşünce listeyi tazele
  useEffect(() => {
    if (step !== 'dashboard' || !selected) return;
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
    if (!label || isNaN(price) || price <= 0) return;
    setAddingSize(true);
    try {
      await supabase.from('photo_print_sizes').insert({ event_id: selected.id, size_label: label, price_tl: price });
      setNewSizeLabel(''); setNewSizePrice('');
      loadDashboard(selected.id);
    } catch (e) { console.error(e); }
    setAddingSize(false);
  };

  const deleteSize = async (id: string) => {
    if (!selected) return;
    await supabase.from('photo_print_sizes').delete().eq('id', id);
    loadDashboard(selected.id);
  };

  const markPrinted = async (id: string) => {
    await supabase.from('print_requests').update({ status: 'printed', printed_at: new Date().toISOString() }).eq('id', id);
    if (selected) loadDashboard(selected.id);
  };

  const revertPrinted = async (id: string) => {
    await supabase.from('print_requests').update({ status: 'pending', printed_at: null }).eq('id', id);
    if (selected) loadDashboard(selected.id);
  };

  const downloadPhoto = async (url: string, label: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${label}.jpg`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch { window.open(url, '_blank'); }
  };

  const printPhoto = (url: string) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Baskı</title><style>@page{margin:0}body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh}img{max-width:100%;max-height:100vh}</style></head><body><img src="${url}" onload="setTimeout(function(){window.print()},300)"/></body></html>`);
    w.document.close();
  };

  const pending = prints.filter((p) => p.status === 'pending');
  const done = prints.filter((p) => p.status === 'printed');
  // Bekleyenleri misafire göre grupla
  const groupedPending = pending.reduce<Record<string, PrintRow[]>>((acc, p) => {
    (acc[p.guest_name] = acc[p.guest_name] || []).push(p); return acc;
  }, {});

  const coupleTitle = (e: EventRow) => `${e.bride_first_name} & ${e.groom_first_name}`;

  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(180deg, #FAFBFE 0%, #F5F3F0 50%, #FDF5F5 100%)' }}>
      {/* Üst bar */}
      <header className="sticky top-0 z-30 backdrop-blur-md" style={{ background: 'rgba(255,252,250,0.85)', borderBottom: '1px solid rgba(200,104,110,0.12)' }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/navbar-icon.png" alt="Nikahım" width={40} height={40} className="h-9 w-auto object-contain" />
            <div>
              <p className="text-[15px] font-bold" style={{ color: '#B85258' }}>Fotoğrafçı Portalı</p>
              <p className="text-[11px] text-gray-400 -mt-0.5">Baskı istekleri & boyutlar</p>
            </div>
          </div>
          {step === 'dashboard' && selected && (
            <button onClick={() => { setStep('search'); setSelected(null); setCode(''); setResults([]); setQuery(''); }} className="text-[13px] font-semibold px-3 py-1.5 rounded-lg" style={{ color: '#C8686E', background: 'rgba(200,104,110,0.08)' }}>
              Çıkış
            </button>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* 1) ARAMA */}
        {step === 'search' && (
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-6 mt-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-1.5">Düğün / Nikah Ara</h1>
              <p className="text-sm text-gray-500">Çiftin adını veya soyadını yazın, ardından 6 haneli baskı kodunu girin.</p>
            </div>
            <div className="flex gap-2 mb-5">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                placeholder="Örn. Ayşe, Mehmet, Yılmaz…"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-[#C8686E]/50 text-gray-900"
              />
              <button onClick={runSearch} disabled={query.trim().length < 2 || searching} className="px-5 py-3 rounded-xl font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}>
                {searching ? '…' : 'Ara'}
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {results.map((e) => (
                <button key={e.id} onClick={() => { setSelected(e); setStep('code'); setCode(''); setCodeError(''); }} className="flex items-center gap-3 p-3 rounded-2xl text-left transition-all hover:scale-[1.01]" style={{ background: '#fff', border: '1px solid rgba(200,104,110,0.14)', boxShadow: '0 6px 18px rgba(200,104,110,0.06)' }}>
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    {e.couple_photo_url
                      ? <img src={optimizeImg(e.couple_photo_url, 120)} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">💍</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900">{coupleTitle(e)}</p>
                    <p className="text-[12.5px] text-gray-400">{e.event_type === 'dugun' ? 'Düğün' : 'Nikah'} · {e.event_date}</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              ))}
              {!searching && query.trim().length >= 2 && results.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-6">Sonuç bulunamadı. Çift baskı iznini açmamış olabilir.</p>
              )}
            </div>
          </div>
        )}

        {/* 2) KOD */}
        {step === 'code' && selected && (
          <div className="max-w-sm mx-auto mt-6">
            <button onClick={() => setStep('search')} className="text-[13px] text-gray-400 mb-4 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Geri
            </button>
            <div className="rounded-3xl p-7 text-center" style={{ background: '#fff', boxShadow: '0 20px 60px rgba(200,104,110,0.10)', border: '1px solid rgba(200,104,110,0.12)' }}>
              <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-3 bg-gray-100">
                {selected.couple_photo_url
                  ? <img src={optimizeImg(selected.couple_photo_url, 140)} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-2xl">💍</div>}
              </div>
              <h2 className="text-lg font-bold text-gray-900">{coupleTitle(selected)}</h2>
              <p className="text-[13px] text-gray-400 mb-5">6 haneli baskı kodunu girin</p>
              <input
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setCodeError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
                inputMode="numeric"
                placeholder="••••••"
                className="w-full text-center tracking-[0.5em] text-2xl font-bold px-4 py-3 rounded-xl border-2 outline-none mb-2"
                style={{ borderColor: codeError ? '#E5484D' : 'rgba(200,104,110,0.3)', color: '#342D30' }}
              />
              {codeError && <p className="text-[12.5px] mb-2" style={{ color: '#E5484D' }}>{codeError}</p>}
              <button onClick={verifyCode} disabled={code.length !== 6 || checking} className="w-full mt-2 py-3 rounded-xl font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}>
                {checking ? 'Kontrol ediliyor…' : 'Giriş Yap'}
              </button>
            </div>
          </div>
        )}

        {/* 3) DASHBOARD */}
        {step === 'dashboard' && selected && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                {selected.couple_photo_url
                  ? <img src={optimizeImg(selected.couple_photo_url, 120)} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-xl">💍</div>}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{coupleTitle(selected)}</h1>
                <p className="text-[12.5px] text-gray-400">{selected.event_type === 'dugun' ? 'Düğün' : 'Nikah'} · {selected.event_date}</p>
              </div>
            </div>

            {/* Sekmeler */}
            <div className="flex gap-1 p-1 rounded-xl mb-5 max-w-md" style={{ background: 'rgba(200,104,110,0.07)' }}>
              {([['pending', `Bekleyenler`, pending.length], ['done', 'Tamamlananlar', done.length], ['sizes', 'Baskı Boyutları', sizes.length]] as const).map(([k, lbl, n]) => (
                <button key={k} onClick={() => setTab(k)} className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5" style={{ background: tab === k ? '#fff' : 'transparent', color: tab === k ? '#C8686E' : '#9A8A8A', boxShadow: tab === k ? '0 2px 6px rgba(200,104,110,0.12)' : 'none' }}>
                  {lbl}
                  {n > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white" style={{ background: k === 'pending' ? '#E5484D' : '#C8686E' }}>{n}</span>
                  )}
                </button>
              ))}
            </div>

            {loading && <p className="text-center text-sm text-gray-400 py-8">Yükleniyor…</p>}

            {/* Bekleyenler — misafire göre gruplu */}
            {!loading && tab === 'pending' && (
              Object.keys(groupedPending).length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-12">Bekleyen baskı isteği yok.</p>
              ) : (
                <div className="flex flex-col gap-5">
                  {Object.entries(groupedPending).map(([guest, rows]) => (
                    <div key={guest}>
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[12px] font-bold" style={{ background: 'linear-gradient(135deg, #E9A0A3, #C8686E)' }}>{guest.charAt(0).toUpperCase()}</span>
                        <h3 className="font-bold text-gray-800">{guest}</h3>
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
                              <div className="flex gap-1.5">
                                <button onClick={() => downloadPhoto(r.photo_url, `${guest}_${r.size_label}`)} title="İndir" className="flex-1 py-1.5 rounded-lg flex items-center justify-center" style={{ background: 'rgba(200,104,110,0.08)', color: '#C8686E' }}>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                                </button>
                                <button onClick={() => printPhoto(r.photo_url)} title="Yazdır" className="flex-1 py-1.5 rounded-lg flex items-center justify-center" style={{ background: 'rgba(200,104,110,0.08)', color: '#C8686E' }}>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096M17.66 18L17.28 21.523M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456M17.66 18h1.09A2.25 2.25 0 0021 15.75V9.456m-18 0a2.25 2.25 0 011.837-2.175M3 9.456V6.375c0-.621.504-1.125 1.125-1.125h15.75c.621 0 1.125.504 1.125 1.125v3.081" /></svg>
                                </button>
                              </div>
                              <button onClick={() => markPrinted(r.id)} className="w-full mt-1.5 py-2 rounded-lg text-[12px] font-semibold text-white flex items-center justify-center gap-1" style={{ background: 'linear-gradient(135deg, #4FA372, #318052)' }}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                Baskı Tamamladı
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
                      <button onClick={() => setLightbox(r.photo_url)} className="relative aspect-square w-full bg-gray-50 block">
                        <img src={optimizeImg(r.photo_url, 400)} alt="" className="w-full h-full object-cover opacity-90" />
                        <span className="absolute top-1.5 right-1.5 px-2 py-[3px] rounded-full text-[10px] font-bold text-white flex items-center gap-1" style={{ background: '#318052' }}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          Basıldı
                        </span>
                        <span className="absolute bottom-1.5 left-1.5 px-2 py-[3px] rounded-md text-[11px] font-bold text-white" style={{ background: 'rgba(0,0,0,0.55)' }}>{r.size_label} · {r.qty} adet</span>
                      </button>
                      <div className="p-2 flex items-center justify-between">
                        <span className="text-[12px] text-gray-500 truncate">{r.guest_name}</span>
                        <button onClick={() => revertPrinted(r.id)} title="Geri al" className="text-[11px] text-gray-400 hover:text-gray-600">geri al</button>
                      </div>
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
                  <p className="text-[12.5px] text-gray-400 mb-3">Davetliler yalnızca buraya eklediğiniz boyutlardan seçebilir.</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {QUICK_SIZES.map((s) => (
                      <button key={s} onClick={() => setNewSizeLabel(s)} className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold" style={{ background: newSizeLabel === s ? 'rgba(200,104,110,0.12)' : '#F3EEEE', color: newSizeLabel === s ? '#C8686E' : '#7A6E6E' }}>{s}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={newSizeLabel} onChange={(e) => setNewSizeLabel(e.target.value)} placeholder="Boyut (ör. 10x15)" className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-gray-200 outline-none focus:border-[#C8686E]/50 text-gray-900 text-[14px]" />
                    <div className="relative w-28">
                      <input value={newSizePrice} onChange={(e) => setNewSizePrice(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="Fiyat" className="w-full px-3 py-2.5 pr-7 rounded-lg border border-gray-200 outline-none focus:border-[#C8686E]/50 text-gray-900 text-[14px]" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[14px]">₺</span>
                    </div>
                    <button onClick={addSize} disabled={addingSize || !newSizeLabel.trim() || !newSizePrice} className="px-4 rounded-lg font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}>Ekle</button>
                  </div>
                </div>

                {sizes.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-6">Henüz boyut eklemediniz.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {sizes.map((s) => (
                      <div key={s.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white" style={{ border: '1px solid rgba(200,104,110,0.12)' }}>
                        <span className="font-semibold text-gray-800">{s.size_label}</span>
                        <div className="flex items-center gap-4">
                          <span className="font-bold" style={{ color: '#B85258' }}>{s.price_tl}₺</span>
                          <button onClick={() => deleteSize(s.id)} className="text-gray-300 hover:text-red-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

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
