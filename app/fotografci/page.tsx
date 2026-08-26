"use client";

import { supabase } from '@/lib/supabase';
import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import { fullFaqCategories } from '@/lib/faq-data';

const optimizeImg = (url: string, width: number, quality = 80): string => {
  if (!url || !url.includes('/storage/v1/object/public/')) return url;
  return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + `?width=${width}&quality=${quality}`;
};

// Büyük fotoğraf — skeleton/"yükleniyor" + transform hatası olursa ham URL'e düşer
function PhotoView({ url, onClick }: { url: string; onClick?: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [fb, setFb] = useState(false);
  useEffect(() => { setLoaded(false); setFb(false); }, [url]);
  return (
    <div className="relative w-full flex items-center justify-center" style={{ minHeight: 320 }}>
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5" style={{ background: '#F4F1EF' }}>
          <span className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(200,104,110,0.22)', borderTopColor: '#C8686E' }} />
          <span className="text-[12px]" style={{ color: '#A79F9B' }}>Fotoğraf yükleniyor…</span>
        </div>
      )}
      <img
        src={fb ? url : optimizeImg(url, 1200)}
        alt=""
        onClick={onClick}
        onLoad={() => setLoaded(true)}
        onError={() => { if (!fb) setFb(true); else setLoaded(true); }}
        className="w-full object-contain cursor-zoom-in transition-opacity duration-200"
        style={{ maxHeight: 460, opacity: loaded ? 1 : 0 }}
      />
    </div>
  );
}

interface EventRow {
  id: string;
  user_id: string | null;
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
  price_tl: number; qty: number; status: string; created_at: string; printed_at: string | null; paid?: boolean; device_id?: string | null;
  source?: string | null; order_id?: string | null;
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
function OtpInput({ value, onChange, disabled, error, autoFocusReady }: { value: string; onChange: (v: string) => void; disabled?: boolean; error?: boolean; autoFocusReady?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  // Etkinlik seçilir seçilmez ilk kutu aktif olsun (kullanıcı tekrar dokunmasın)
  useEffect(() => { if (autoFocusReady && !disabled) { const t = setTimeout(() => ref.current?.focus(), 120); return () => clearTimeout(t); } }, [autoFocusReady, disabled]);
  return (
    <div className="relative flex justify-center gap-2 select-none" onClick={() => ref.current?.focus()}>
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
            className="w-9 h-12 rounded-xl flex items-center justify-center text-[20px] font-bold transition-all"
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

  const [tab, setTab] = useState<'pending' | 'done' | 'sizes' | 'couple'>('pending');
  const [selectedGuest, setSelectedGuest] = useState<string>('all'); // sol menü davetli filtresi
  const [guestSearch, setGuestSearch] = useState('');
  const [hideTotal, setHideTotal] = useState(false); // banka tarzı göz ikonu — tutarı gizle
  const [doneFilter, setDoneFilter] = useState<'all' | 'unpaid' | 'paid'>('all'); // tamamlananlar tahsilat filtresi
  // ── Yeni operasyonel dashboard state'leri ──
  const [statusTab, setStatusTab] = useState<'all' | 'pending' | 'printing' | 'printed' | 'delivered'>('pending');
  const [selKey, setSelKey] = useState<string | null>(null); // seçili sipariş anahtarı
  const [thumbIdx, setThumbIdx] = useState(0);                // çift siparişinde seçili foto
  const [showSizesModal, setShowSizesModal] = useState(false); // ⚙ baskı boyutları ayarları
  const [confirmReprint, setConfirmReprint] = useState<string | null>(null); // yeniden yazdır onayı (photo url)
  // Yeni sipariş bildirimi — toast + ses (kapatılabilir)
  const [toast, setToast] = useState<{ name: string; info: string; couple: boolean; title?: string; ok?: boolean } | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [flashKey, setFlashKey] = useState<string | null>(null); // yeni gelen siparişi kısa vurgula
  const [queueSort, setQueueSort] = useState<'time' | 'qty' | 'price'>('time'); // sol kuyruk sıralama
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false); // orta panel foto 3-nokta menü
  const [moreOpen, setMoreOpen] = useState(false); // sağ panel "diğer işlemler" katlanır
  const soundOnRef = useRef(true);
  const knownIdsRef = useRef<Set<string> | null>(null); // yeni sipariş tespiti (poll + realtime ortak)
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
  // Destek paneli (ana sayfadaki "?" ile aynı — sağdan açılır)
  const [showSupport, setShowSupport] = useState(false);
  const [supportFaqView, setSupportFaqView] = useState(false);
  const [faqQuery, setFaqQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const [showAllList, setShowAllList] = useState(false);
  const [allCache, setAllCache] = useState<EventRow[] | null>(null); // tüm izinli etkinlikler (önden yüklenir)
  const [cacheLoading, setCacheLoading] = useState(false);

  // İzin AÇILMIŞ çiftlerin TÜM etkinlikleri (nikah+düğün). q boşsa hepsi.
  const fetchEvents = async (q: string): Promise<EventRow[]> => {
    const cols = 'id, user_id, bride_first_name, bride_last_name, groom_first_name, groom_last_name, event_type, event_date, couple_photo_url';
    let base = supabase.from('events').select(cols).order('event_date', { ascending: true }).limit(200);
    if (q) base = base.or(`bride_first_name.ilike.%${q}%,groom_first_name.ilike.%${q}%,bride_last_name.ilike.%${q}%,groom_last_name.ilike.%${q}%`);
    const { data: matched } = await base;
    if (!matched || matched.length === 0) return [];
    const owners = Array.from(new Set(matched.map((m: EventRow) => m.user_id).filter(Boolean))) as string[];
    let enabledOwners = new Set<string>();
    if (owners.length) {
      const { data: en } = await supabase.from('events').select('user_id').in('user_id', owners).eq('photographer_access_enabled', true);
      enabledOwners = new Set((en || []).map((r: { user_id: string }) => r.user_id));
    }
    return matched.filter((m: EventRow) => m.user_id && enabledOwners.has(m.user_id));
  };

  // Sayfa açılır açılmaz tüm izinli etkinlikleri önden yükle → arama/menü anında açılır
  useEffect(() => {
    if (step !== 'login' || allCache) return;
    setCacheLoading(true);
    fetchEvents('').then((list) => { setAllCache(list); }).catch(() => {}).finally(() => setCacheLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Arama — önbellek varsa anlık istemci-taraflı filtre, yoksa sunucu
  useEffect(() => {
    const q = query.trim();
    if (q.length < 1 && !showAllList) { setResults([]); return; }
    if (allCache) {
      const ql = q.toLowerCase();
      setResults(q ? allCache.filter((e) => [e.bride_first_name, e.groom_first_name, e.bride_last_name, e.groom_last_name].some((n) => (n || '').toLowerCase().includes(ql))) : allCache);
      setSearching(false);
      return;
    }
    let alive = true;
    setSearching(true);
    const t = setTimeout(async () => {
      try { const list = await fetchEvents(q); if (alive) setResults(list); } catch (e) { console.error(e); }
      if (alive) setSearching(false);
    }, 250);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, showAllList, allCache]);

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
        // Oturumu sakla — sayfa yenilenince tekrar kod sorulmasın
        try { sessionStorage.setItem('nkh_photog_panel', JSON.stringify(selected)); } catch {}
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

  // silent = arka plan yenilemesi (spinner gösterme, filtre/sekme/yeri bozma)
  const loadDashboard = useCallback(async (eventId: string, firstLoad = false, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from('print_requests').select('*').eq('event_id', eventId).order('created_at', { ascending: false }),
        supabase.from('photo_print_sizes').select('*').eq('event_id', eventId).order('price_tl', { ascending: true }),
      ]);
      const rowsP: PrintRow[] = p || [];
      // Yeni sipariş tespiti — realtime'a bağlı DEĞİL; poll her 10sn'de de yakalar
      const prevKnown = knownIdsRef.current;
      knownIdsRef.current = new Set(rowsP.map((r) => r.id));
      if (prevKnown && !firstLoad) {
        const fresh = rowsP.filter((r) => !prevKnown.has(r.id));
        if (fresh.length > 0) {
          const newest = [...fresh].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];
          const couple = newest.source === 'couple';
          setToast({ name: couple ? 'Düğün Çifti' : (newest.guest_name || 'Davetli'), info: `${newest.size_label ? newest.size_label + ' · ' : ''}${newest.qty || 1} adet`, couple });
          setFlashKey(couple ? `couple:${newest.order_id || newest.id}` : `g:${newest.device_id || 'name:' + newest.guest_name}`);
          if (soundOnRef.current) playDing();
        }
      }
      setPrints(rowsP);
      setSizes(s || []);
      if (firstLoad && (s || []).length === 0) { setShowSetup(true); setSetupStep(0); setTab('sizes'); }
    } catch (e) { console.error(e); }
    if (!silent) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step !== 'panel' || !selected) return;
    // Realtime (anlık) + 10 sn yedek poll — ikisi de SESSİZ (filtre/sekme/yeri bozmaz)
    const ch = supabase
      .channel(`prints-${selected.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'print_requests', filter: `event_id=eq.${selected.id}` }, () => loadDashboard(selected.id, false, true))
      .subscribe();
    const poll = setInterval(() => loadDashboard(selected.id, false, true), 8000);
    return () => { supabase.removeChannel(ch); clearInterval(poll); };
  }, [step, selected, loadDashboard]);

  // Oturum davranışı: SADECE yenileme (reload) / geri-ileri'de otomatik geri yükle.
  // Linke YENİDEN girişte (fresh navigate) oturumu temizle → normal giriş + kod ekranı (başka düğüne girebilsin).
  useEffect(() => {
    try {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const navType = navEntry?.type; // 'reload' | 'navigate' | 'back_forward'
      const raw = sessionStorage.getItem('nkh_photog_panel');
      if (raw && (navType === 'reload' || navType === 'back_forward')) {
        const ev = JSON.parse(raw) as EventRow;
        if (ev?.id) { setSelected(ev); setStep('panel'); loadDashboard(ev.id, false, true); return; }
      }
      if (navType === 'navigate') sessionStorage.removeItem('nkh_photog_panel'); // yeni giriş → login göster
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const deleteSize = async (id: string) => {
    if (!selected) return;
    const willBeEmpty = sizes.length <= 1; // son boyu siliyorsa
    await supabase.from('photo_print_sizes').delete().eq('id', id);
    await loadDashboard(selected.id);
    if (willBeEmpty) { setShowSetup(true); setSetupStep(1); } // boysuz olmaz — zorla ekletir
  };
  const markPrinted = async (id: string) => { await supabase.from('print_requests').update({ status: 'printed', printed_at: new Date().toISOString() }).eq('id', id); if (selected) loadDashboard(selected.id); };
  const revertPrinted = async (id: string) => { await supabase.from('print_requests').update({ status: 'pending', printed_at: null }).eq('id', id); if (selected) loadDashboard(selected.id); };

  // ── 4'lü durum akışı: pending -> printing -> printed(Tamamladı) -> delivered(Teslim=tahsil) ──
  const advanceOrder = async (rows: PrintRow[], to: 'pending' | 'printing' | 'printed' | 'delivered') => {
    if (!selected || rows.length === 0) return;
    const patch: Record<string, unknown> = { status: to };
    if (to === 'printed') patch.printed_at = new Date().toISOString();
    if (to === 'delivered') { patch.delivered_at = new Date().toISOString(); patch.paid = true; } // teslim = tahsil edildi
    if (to === 'pending') { patch.printed_at = null; patch.delivered_at = null; patch.paid = false; }
    if (to === 'printing') { patch.delivered_at = null; patch.paid = false; }
    await supabase.from('print_requests').update(patch).in('id', rows.map((r) => r.id));
    loadDashboard(selected.id, false, true);
    if (to === 'delivered') {
      const q = rows.reduce((a, r) => a + r.qty, 0);
      const p = rows.reduce((a, r) => a + (r.price_tl || 0) * r.qty, 0);
      const couple = rows[0]?.source === 'couple';
      const nm = couple ? (selected ? coupleTitle(selected) : 'Düğün Çifti') : (labelOf[keyOf(rows[0])] || rows[0]?.guest_name || 'Davetli');
      setToast({ ok: true, title: 'Sipariş teslim edildi ✓', name: nm, info: `${q} baskı${p > 0 ? ` · ${p}₺ alındı` : ''}`, couple });
      setSelKey(null); // otomatik sıradaki siparişe geç
    }
  };
  // Ödeme — bir davetlinin (belirli satırların) tamamlanmış baskılarını "ödendi" işaretle/geri al
  const setRowsPaid = async (rows: PrintRow[], paid: boolean) => {
    if (!selected || rows.length === 0) return;
    await supabase.from('print_requests').update({ paid }).in('id', rows.map((r) => r.id));
    loadDashboard(selected.id, false, true);
  };

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
  // Çoklu baskı — hepsini TEK yazdırma penceresinde, her fotoğraf ayrı sayfa (tek dialog)
  const printPhotos = (urls: string[]) => {
    if (urls.length === 0) return;
    if (urls.length === 1) return printPhoto(urls[0]);
    const w = window.open('', '_blank'); if (!w) return;
    const imgs = urls.map((u) => `<img src="${u}" />`).join('');
    w.document.write(`<html><head><title>Baskı</title><style>@page{margin:0}body{margin:0}img{display:block;width:100%;height:100vh;object-fit:contain;page-break-after:always}</style></head><body>${imgs}<scr` + `ipt>var n=${urls.length},c=0;function d(){c++;if(c>=n){setTimeout(function(){window.print()},300)}}var I=document.images;for(var i=0;i<I.length;i++){I[i].onload=d;I[i].onerror=d;}</scr` + `ipt></body></html>`);
    w.document.close();
  };

  // Kalıcı AudioContext — realtime callback'te yeni context "suspended" başlar (ses çıkmaz).
  // Bir kez kullanıcı etkileşiminde oluşturulup resume edilir, sonra yeniden kullanılır.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const unlockAudio = () => {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AC();
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    } catch { /* yok say */ }
  };
  // İlk kullanıcı etkileşiminde ses kilidini aç (tarayıcı autoplay politikası)
  useEffect(() => {
    const h = () => unlockAudio();
    window.addEventListener('pointerdown', h);
    window.addEventListener('keydown', h);
    return () => { window.removeEventListener('pointerdown', h); window.removeEventListener('keydown', h); };
  }, []);

  // Yeni sipariş "ding" sesi — Web Audio ile iki notalı, dosya gerektirmez
  const playDing = () => {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AC();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const note = (freq: number, start: number, dur: number) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
        g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
        o.start(ctx.currentTime + start); o.stop(ctx.currentTime + start + dur + 0.02);
      };
      note(880, 0, 0.18); note(1174, 0.14, 0.28); // ding-dong
    } catch { /* ses engellenmiş olabilir */ }
  };

  // soundOn'u yükle + ref'i senkron tut
  useEffect(() => { try { const v = localStorage.getItem('nkh_photog_sound'); if (v === '0') { setSoundOn(false); soundOnRef.current = false; } } catch {} }, []);
  const toggleSound = () => setSoundOn((v) => { const nv = !v; soundOnRef.current = nv; try { localStorage.setItem('nkh_photog_sound', nv ? '1' : '0'); } catch {} return nv; });

  // Toast otomatik kapanır
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { if (!flashKey) return; const t = setTimeout(() => setFlashKey(null), 2600); return () => clearTimeout(t); }, [flashKey]);

  // Çift baskı siparişleri (source='couple') davetli baskılarından AYRI tutulur
  const isCouple = (p: PrintRow) => p.source === 'couple';

  // Davetli anahtarı = device_id (yoksa isim). Aynı isimde birden fazla cihaz → "(2)" eki ile ayrılır.
  const keyOf = (p: PrintRow) => p.device_id || `name:${p.guest_name}`;
  const keyMeta: Record<string, { name: string; first: string }> = {};
  for (const p of prints) {
    if (isCouple(p)) continue;
    const k = keyOf(p);
    if (!keyMeta[k]) keyMeta[k] = { name: p.guest_name, first: p.created_at };
    else if (p.created_at < keyMeta[k].first) keyMeta[k].first = p.created_at;
  }
  const labelOf: Record<string, string> = {};
  {
    const byName: Record<string, [string, { name: string; first: string }][]> = {};
    for (const [k, v] of Object.entries(keyMeta)) (byName[v.name] = byName[v.name] || []).push([k, v]);
    for (const [nm, arr] of Object.entries(byName)) {
      arr.sort((a, b) => a[1].first.localeCompare(b[1].first));
      arr.forEach(([k], i) => { labelOf[k] = arr.length > 1 ? `${nm} (${i + 1})` : nm; });
    }
  }

  const guestMatch = (p: PrintRow) => selectedGuest === 'all' || keyOf(p) === selectedGuest;
  const pending = prints.filter((p) => p.status === 'pending' && !isCouple(p) && guestMatch(p));
  const done = prints.filter((p) => p.status === 'printed' && !isCouple(p) && guestMatch(p));

  // ── Düğün Çifti Talepleri — order_id'ye göre gruplu (source='couple') ──
  const couplePrints = prints.filter(isCouple);
  const couplePendingCount = couplePrints.filter((p) => p.status === 'pending').length;
  const coupleOrders = (() => {
    const m: Record<string, PrintRow[]> = {};
    for (const p of couplePrints) { const k = p.order_id || p.id; (m[k] = m[k] || []).push(p); }
    return Object.entries(m).sort((a, b) => (b[1][0]?.created_at || '').localeCompare(a[1][0]?.created_at || ''));
  })();
  const groupedPending = pending.reduce<Record<string, PrintRow[]>>((acc, p) => { (acc[keyOf(p)] = acc[keyOf(p)] || []).push(p); return acc; }, {});
  const doneFiltered = done.filter((p) => doneFilter === 'all' || (doneFilter === 'paid' ? p.paid : !p.paid));
  const groupedDone = doneFiltered.reduce<Record<string, PrintRow[]>>((acc, p) => { (acc[keyOf(p)] = acc[keyOf(p)] || []).push(p); return acc; }, {});

  // Sol menü — davetliler (anahtar bazlı). Sıra: bekleyeni olanlar önce (ilk gelen üstte / FCFS), sonra tamamlananlar.
  const guestList = (() => {
    const m: Record<string, { pending: number; done: number; firstPending: string }> = {};
    for (const p of prints) {
      if (isCouple(p)) continue;
      const k = keyOf(p);
      m[k] = m[k] || { pending: 0, done: 0, firstPending: '' };
      if (p.status === 'pending') {
        m[k].pending += p.qty;
        if (!m[k].firstPending || p.created_at < m[k].firstPending) m[k].firstPending = p.created_at;
      } else if (p.status === 'printed') m[k].done += p.qty;
    }
    return Object.entries(m)
      .filter(([k]) => (labelOf[k] || '').toLowerCase().includes(guestSearch.trim().toLowerCase()))
      .sort((a, b) => {
        const ap = a[1].pending > 0, bp = b[1].pending > 0;
        if (ap && bp) return a[1].firstPending.localeCompare(b[1].firstPending);
        if (ap !== bp) return ap ? -1 : 1;
        return (labelOf[a[0]] || '').localeCompare(labelOf[b[0]] || '');
      });
  })();
  const coupleTitle = (e: EventRow) => `${e.bride_first_name} & ${e.groom_first_name}`;
  // Teslim = tahsil edildi. Tamamladı(printed) = teslime hazır, para bekliyor.
  const totalCollected = prints.filter((p) => p.status === 'delivered').reduce((a, p) => a + p.price_tl * p.qty, 0);
  const totalToCollect = prints.filter((p) => p.status === 'printed').reduce((a, p) => a + p.price_tl * p.qty, 0);
  const mask = (v: number) => (hideTotal ? '••••' : `${v}₺`);

  // ── Birleşik sipariş listesi: çift = order_id grubu (⭐), davetli = her satır bir sipariş ──
  const orderStatusOf = (rows: PrintRow[]): string =>
    // Basılmamış foto varsa sipariş "Beklemede" kalır (iş bitmedi); hepsi basılınca "Hazır"; hepsi teslimse "Teslim"
    rows.some((r) => r.status === 'pending') ? 'pending'
      : rows.some((r) => r.status === 'printing') ? 'printing'
        : rows.every((r) => r.status === 'delivered') ? 'delivered' : 'printed';
  type Order = { key: string; kind: 'couple' | 'guest'; rows: PrintRow[]; name: string; createdAt: string; status: string; couple: boolean };
  const allOrders: Order[] = (() => {
    const list: Order[] = [];
    const cm: Record<string, PrintRow[]> = {};
    for (const p of couplePrints) { const k = p.order_id || p.id; (cm[k] = cm[k] || []).push(p); }
    for (const [oid, rows] of Object.entries(cm)) list.push({ key: `couple:${oid}`, kind: 'couple', rows, name: selected ? coupleTitle(selected) : 'Düğün Çifti', createdAt: rows[0]?.created_at || '', status: orderStatusOf(rows), couple: true });
    // Davetli siparişleri: aynı davetli (device_id/isim) tek grup — tüm fotoğrafları + toplam tutar birlikte
    const gm: Record<string, PrintRow[]> = {};
    for (const p of prints) { if (isCouple(p)) continue; const k = keyOf(p); (gm[k] = gm[k] || []).push(p); }
    for (const [gk, rows] of Object.entries(gm)) {
      const first = rows.reduce((mn, r) => (r.created_at < mn ? r.created_at : mn), rows[0].created_at);
      list.push({ key: `g:${gk}`, kind: 'guest', rows, name: labelOf[gk] || rows[0]?.guest_name || '—', createdAt: first, status: orderStatusOf(rows), couple: false });
    }
    return list;
  })();
  const statusCounts: Record<string, number> = { all: allOrders.length, pending: 0, printing: 0, printed: 0, delivered: 0 };
  for (const o of allOrders) statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  const oQty = (o: Order) => o.rows.reduce((a, r) => a + r.qty, 0);
  const oPrice = (o: Order) => o.rows.reduce((a, r) => a + (r.price_tl || 0) * r.qty, 0);
  // Tutarlı sipariş kodu — davetli(device_id)/çift(order_id) bazlı; panel + davetli tarafında AYNI üretilir
  const orderCodeFrom = (base: string) => { let h = 0; for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0; return 'NK-' + h.toString(36).toUpperCase().padStart(5, '0').slice(0, 5); };
  const orderCode = (o: Order) => orderCodeFrom(o.couple ? (o.rows[0].order_id || o.rows[0].id) : (o.rows[0].device_id || `name:${o.rows[0].guest_name}`));
  const queue = allOrders
    .filter((o) => statusTab === 'all' || o.status === statusTab)
    .filter((o) => { const q = guestSearch.trim().toLowerCase(); return !q || o.name.toLowerCase().includes(q) || orderCode(o).toLowerCase().includes(q); })
    .sort((a, b) => {
      if (queueSort === 'qty') return oQty(b) - oQty(a) || a.createdAt.localeCompare(b.createdAt);
      if (queueSort === 'price') return oPrice(b) - oPrice(a) || a.createdAt.localeCompare(b.createdAt);
      return a.createdAt.localeCompare(b.createdAt); // İlk gelen (FCFS)
    });
  const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') || '—';
  const selOrder = queue.find((o) => o.key === selKey) || allOrders.find((o) => o.key === selKey) || queue[0] || null;
  const STATUS_TABS: { k: 'all' | 'pending' | 'printing' | 'printed' | 'delivered'; label: string }[] = [
    { k: 'all', label: 'Tümü' }, { k: 'pending', label: 'Beklemede' }, { k: 'printing', label: 'Baskıda' }, { k: 'printed', label: 'Hazır' }, { k: 'delivered', label: 'Teslim Edildi' },
  ];
  const STATUS_META: Record<string, { label: string; color: string; soft: string }> = {
    pending: { label: 'Beklemede', color: '#C95E64', soft: '#FCF0EF' },
    printing: { label: 'Baskıda', color: '#D58B34', soft: '#FFF6E8' },
    printed: { label: 'Hazır', color: '#3B82C4', soft: '#EAF2FB' },
    delivered: { label: 'Teslim Edildi', color: '#2E9E68', soft: '#EAF7F0' },
  };
  const minsAgo = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));

  const fmtBlock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Küçük çift avatarı — transform kaynaklı siyah kareyi önlemek için ham url + onError fallback
  const Avatar = ({ url, size }: { url: string | null; size: number }) => (
    url
      ? <img src={url} alt="" width={size} height={size} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      : <div className="w-full h-full flex items-center justify-center text-2xl">💍</div>
  );

  return (
    <main className="min-h-screen" style={{ background: 'radial-gradient(circle at 50% 30%, #FFFAF8 0%, #FBF4F2 55%, #F8EEEC 100%)' }}>
      <style>{`@keyframes slideInLeft{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}@keyframes flashRing{0%,100%{box-shadow:0 0 0 0 rgba(210,104,109,0)}30%{box-shadow:0 0 0 2px rgba(210,104,109,0.9)}}@keyframes pendPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(214,94,100,0.45)}50%{transform:scale(1.12);box-shadow:0 0 0 4px rgba(214,94,100,0)}}`}</style>
      {/* ================= GİRİŞ ================= */}
      {step === 'login' && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-[28px] relative px-7 pt-7 pb-6" style={{ background: '#FFFDFC', boxShadow: '0 24px 70px rgba(168,112,105,0.10), 0 4px 18px rgba(168,112,105,0.05)', border: '1px solid rgba(205,161,157,0.18)' }}>

            {/* 1) Logo (kalp) + Nikahım imza yazısı — en üstte, marka önce */}
            <div className="flex flex-col items-center">
              <img src="/navbar-icon.png" alt="" className="h-12 w-auto object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              <img src="/navbar-text.png" alt="Nikahım" className="h-7 w-auto object-contain mt-1" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            </div>

            {/* 2) Başlık — güçlü */}
            <h1 className="text-center mt-4" style={{ fontSize: 24, lineHeight: 1.15, fontWeight: 650, letterSpacing: '-0.01em', color: '#332824' }}>Fotoğrafçı Girişi</h1>

            {/* 3) Kamera görseli — küçük, ikincil */}
            <img src="/fotografci-login.png" alt="" className="block mx-auto object-contain" style={{ width: '58%', maxWidth: 220, height: 'auto', marginTop: 6, marginBottom: 16 }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />

            {/* 4) Etkinlik seçin — sol hizalı (form akışı) */}
            <label className="block mb-2.5" style={{ fontSize: 15, fontWeight: 600, color: '#332824' }}>Etkinlik seçin</label>
            {selected ? (
              <button onClick={() => { setSelected(null); setResults([]); setQuery(''); setCode(''); setCodeError(''); }} className="w-full flex items-center gap-3 text-left" style={{ minHeight: 76, padding: '13px 16px 13px 18px', borderRadius: 20, background: '#FFFDFC', border: '1px solid #E7D8D5' }}>
                <span className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0"><Avatar url={selected.couple_photo_url} size={48} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-[16px]" style={{ color: '#332824' }}>{coupleTitle(selected)}</span>
                  <span className="block text-[13px] mt-0.5" style={{ color: '#908783' }}>{selected.event_date} · {selected.event_type === 'dugun' ? 'Düğün' : 'Nikah'}</span>
                </span>
                <span className="text-[13px] font-semibold" style={{ color: '#C9827D' }}>Değiştir</span>
              </button>
            ) : (
              <>
                <div className="flex items-stretch gap-2">
                  <div className="relative flex-1">
                    <svg className="w-[18px] h-[18px] absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#979FA9' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>
                    <input value={query} onChange={(e) => { setQuery(e.target.value); setShowAllList(false); }} placeholder="Gelin veya damat adıyla arayın" className="w-full outline-none" style={{ height: 50, paddingLeft: 42, paddingRight: 14, borderRadius: 14, border: '1.5px solid #DDD7D4', background: '#FFFEFD', fontSize: 15, color: '#3A302C' }} onFocus={(e) => { e.currentTarget.style.borderColor = '#C98782'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(201,135,130,0.10)'; }} onBlur={(e) => { e.currentTarget.style.borderColor = '#DDD7D4'; e.currentTarget.style.boxShadow = 'none'; }} />
                  </div>
                  {/* Ayrı rose açılır kutu — tüm etkinlikleri listele */}
                  <button onClick={() => setShowAllList((v) => !v)} title="Tümünü göster" className="flex items-center justify-center flex-shrink-0 transition-colors" style={{ width: 48, borderRadius: 13, background: '#FAF0EF', color: '#C77470' }}>
                    <svg className="w-[18px] h-[18px] transition-transform" style={{ transform: showAllList ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
                {(query.trim().length >= 1 || showAllList) && (
                  <div className="mt-2.5 flex flex-col gap-1.5 max-h-64 overflow-y-auto rounded-2xl" style={{ boxShadow: results.length ? '0 8px 24px rgba(200,104,110,0.10)' : 'none' }}>
                    {(searching || cacheLoading) && <div className="flex items-center justify-center gap-2 py-3"><span className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(200,104,110,0.25)', borderTopColor: '#C8686E' }} /><span className="text-[13px] text-gray-400">Aranıyor…</span></div>}
                    {!searching && !cacheLoading && results.length === 0 && <p className="text-center text-[13px] text-gray-400 py-3">Sonuç yok. Çift baskı iznini açmamış olabilir.</p>}
                    {results.map((e) => (
                      <button key={e.id} onClick={() => selectEvent(e)} className="flex items-center gap-3 p-2.5 rounded-2xl text-left transition-colors hover:bg-rose-50/60" style={{ border: '1px solid rgba(200,104,110,0.12)', background: '#fff' }}>
                        <span className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0"><Avatar url={e.couple_photo_url} size={40} /></span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold text-[14px] truncate" style={{ color: '#332824' }}>{coupleTitle(e)}</span>
                          <span className="block text-[11.5px]" style={{ color: '#908783' }}>{e.event_type === 'dugun' ? 'Düğün' : 'Nikah'} · {e.event_date}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Kod gir (etkinlik seçilmeden gri) */}
            <div className="mt-6" style={{ opacity: selected ? 1 : 0.5, pointerEvents: selected ? 'auto' : 'none' }}>
              <label className="block mb-3.5 text-center" style={{ fontSize: 14, fontWeight: 400, color: '#8E8784' }}>6 haneli etkinlik kodunu girin</label>
              <OtpInput value={code} onChange={(v) => { setCode(v); setCodeError(''); }} disabled={!selected || blockLeft > 0} error={!!codeError} autoFocusReady={!!selected && blockLeft === 0} />
              {codeError && <p className="text-[13px] text-center mt-3" style={{ color: '#B85E5A' }}>{codeError}</p>}
              {blockLeft > 0 && <p className="text-[13px] text-center mt-1.5 text-gray-400">Kalan süre: {fmtBlock(blockLeft)}</p>}
              <button onClick={verifyCode} disabled={!selected || code.length !== 6 || checking || blockLeft > 0} className="w-full font-semibold text-white relative overflow-hidden transition-all hover:scale-[1.005] disabled:hover:scale-100" style={{ height: 54, marginTop: 18, borderRadius: 16, fontSize: 16, background: (selected && code.length === 6 && !checking && blockLeft === 0) ? '#C9827D' : '#F2DEDC', color: (selected && code.length === 6 && !checking && blockLeft === 0) ? '#fff' : 'rgba(255,255,255,0.82)', boxShadow: (selected && code.length === 6 && !checking && blockLeft === 0) ? '0 10px 24px rgba(183,111,105,0.18)' : 'none' }}>
                <span className="relative">{checking ? 'Giriş yapılıyor…' : 'Giriş Yap'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PANEL ================= */}
      {step === 'panel' && selected && (
        <>
          <header className="sticky top-0 z-30 backdrop-blur-md" style={{ background: 'rgba(255,252,250,0.9)', borderBottom: '1px solid rgba(200,104,110,0.12)' }}>
            <div className="max-w-[1560px] mx-auto px-6 py-3 flex items-center justify-between gap-6">
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <Image src="/navbar-icon.png" alt="Nikahım" width={38} height={38} className="h-9 w-auto object-contain" />
                <div>
                  <p className="text-[15px] font-bold" style={{ color: '#B85258' }}>Fotoğrafçı Paneli</p>
                  <p className="text-[11px] text-gray-400 -mt-0.5">{coupleTitle(selected)} · {selected.event_date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:flex items-center gap-2.5">
                  <button onClick={() => setHideTotal((v) => !v)} title={hideTotal ? 'Göster' : 'Gizle'} className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(200,104,110,0.06)', color: '#C8686E' }}>
                    {hideTotal ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88" /></svg>
                    )}
                  </button>
                  {/* Alınan Ödemeler / Ödenecek — hizalı, koyu rose ayraç */}
                  <div className="flex items-stretch gap-2.5 leading-tight">
                    <div className="text-center">
                      <p className="text-[10px] font-semibold" style={{ color: '#B85258' }}>Alınan Ödemeler</p>
                      <p className="text-[14px] font-bold" style={{ color: '#318052' }}>{mask(totalCollected)}</p>
                    </div>
                    <span className="text-[16px] font-bold flex items-center" style={{ color: '#C8686E' }}>/</span>
                    <div className="text-center">
                      <p className="text-[10px] font-semibold" style={{ color: '#B85258' }}>Ödenecek</p>
                      <p className="text-[14px] font-bold" style={{ color: '#C8686E' }}>{mask(totalToCollect)}</p>
                    </div>
                  </div>
                </div>
                <button onClick={toggleSound} title={soundOn ? 'Bildirim sesi açık' : 'Bildirim sesi kapalı'} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors" style={{ background: soundOn ? '#FCF0EF' : '#F1ECEA', color: soundOn ? '#C95E64' : '#9A928E' }}>
                  {soundOn ? (
                    <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22a2.5 2.5 0 002.45-2h-4.9A2.5 2.5 0 0012 22zm7-5v-1l-1.6-1.6V10a5.4 5.4 0 00-4.15-5.25V4a1.25 1.25 0 10-2.5 0v.75A5.4 5.4 0 006.6 10v4.4L5 16v1z" /></svg>
                  ) : (
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18.4 14.4 17 13V10a5 5 0 0 0-3.8-4.85M6.6 6.6A5 5 0 0 0 6 10v3l-1.5 1.5V15h11M10 20a2 2 0 0 0 4 0M3 3l18 18" /></svg>
                  )}
                </button>
                <button onClick={() => { try { sessionStorage.removeItem('nkh_photog_panel'); } catch {}; setStep('login'); setSelected(null); setCode(''); setResults([]); setQuery(''); setPrints([]); setSizes([]); setSelectedGuest('all'); }} className="text-[13px] font-semibold px-3 py-1.5 rounded-lg" style={{ color: '#C8686E', background: 'rgba(200,104,110,0.08)' }}>Çıkış</button>
              </div>
            </div>
          </header>

          {/* ── Durum filtre barı ── */}
          <div className="max-w-[1560px] mx-auto px-6 pt-4">
            <div className="grid grid-cols-5 gap-1 p-1.5 rounded-2xl" style={{ background: '#FFFFFF', border: '1px solid #ECE5E2', boxShadow: '0 5px 20px rgba(60,40,35,0.04)' }}>
              {STATUS_TABS.map(({ k, label }) => {
                const active = statusTab === k;
                return (
                  <button key={k} onClick={() => { setStatusTab(k); setSelKey(null); }} className="h-11 rounded-xl flex items-center justify-center gap-2 text-[14px] font-medium transition-colors" style={{ background: active ? '#FCF0EF' : 'transparent', color: active ? '#C95E64' : '#675F5B', fontWeight: active ? 600 : 500 }}>
                    {label}
                    {(() => {
                      const n = statusCounts[k] || 0;
                      const isPend = k === 'pending' && n > 0; // beklemede sayısı her zaman kırmızı + nabız
                      return <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full text-[12px] font-bold" style={{ background: isPend ? '#D65E64' : active ? '#D65E64' : '#F1ECEA', color: isPend || active ? '#fff' : '#8A827E', animation: isPend ? 'pendPulse 1.6s ease-in-out infinite' : 'none' }}>{n}</span>;
                    })()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 3 kolon: kuyruk | seçili sipariş | baskı paneli ── */}
          <div className="max-w-[1560px] mx-auto px-6 py-4 grid gap-4" style={{ gridTemplateColumns: '300px minmax(480px,1fr) 320px' }}>

            {/* SOL — sipariş kuyruğu */}
            <aside className="flex flex-col rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #ECE5E2', boxShadow: '0 8px 26px rgba(62,43,37,0.04)', maxHeight: 'calc(100vh - 190px)' }}>
              <div className="p-3.5 flex-shrink-0" style={{ borderBottom: '1px solid #F1ECEA' }}>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>
                    <input value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} placeholder="İsim veya kod (NK-…) ile ara" className="w-full pl-9 pr-3 py-2.5 rounded-xl outline-none text-[13px] text-gray-900" style={{ border: '1px solid #E8E2DF', background: '#FFF' }} />
                  </div>
                  {/* Sırala butonu + menü (aktifse rose nokta işareti) */}
                  <div className="relative flex-shrink-0">
                    <button onClick={() => setSortMenuOpen((v) => !v)} title="Sırala" className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors" style={{ background: queueSort !== 'time' || sortMenuOpen ? '#FCF0EF' : '#F7F4F3', color: queueSort !== 'time' ? '#C95E64' : '#8A827E' }}>
                      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M7 4v16m0 0l-3.5-3.5M7 20l3.5-3.5M17 20V4m0 0l-3.5 3.5M17 4l3.5 3.5" /></svg>
                      {queueSort !== 'time' && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full" style={{ background: '#D2686D', boxShadow: '0 0 0 1.5px #fff' }} />}
                    </button>
                    {sortMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-[60]" onClick={() => setSortMenuOpen(false)} />
                        <div className="absolute right-0 mt-1.5 z-[61] w-40 rounded-xl overflow-hidden py-1" style={{ background: '#fff', border: '1px solid #ECE5E2', boxShadow: '0 12px 30px rgba(60,40,35,0.14)' }}>
                          <p className="px-3 py-1.5 text-[10.5px] font-semibold tracking-wide" style={{ color: '#A79F9B' }}>SIRALA</p>
                          {([['time', 'İlk Gelen'], ['qty', 'Adet'], ['price', 'Ücret']] as const).map(([k, lbl]) => (
                            <button key={k} onClick={() => { setQueueSort(k); setSortMenuOpen(false); }} className="w-full flex items-center justify-between px-3 py-2 text-left text-[13px] transition-colors hover:bg-rose-50/50" style={{ color: queueSort === k ? '#C95E64' : '#5C5652', fontWeight: queueSort === k ? 600 : 400 }}>
                              {lbl}
                              {queueSort === k && <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {queue.length === 0 ? (
                  <p className="text-center text-[13px] text-gray-400 py-10">Bu durumda sipariş yok.</p>
                ) : queue.map((o) => {
                  const active = selOrder?.key === o.key;
                  const r0 = o.rows[0];
                  const totQ = o.rows.reduce((a, r) => a + r.qty, 0);
                  const wait = minsAgo(o.createdAt);
                  const waitColor = o.status === 'pending' ? (wait >= 20 ? '#C95A60' : wait >= 10 ? '#D68B32' : '#9A928E') : '#9A928E';
                  const meta = STATUS_META[o.status];
                  const flash = flashKey === o.key;
                  return (
                    <button key={o.key} onClick={() => { setSelKey(o.key); setThumbIdx(0); }} className="w-full text-left flex items-center gap-3 px-3 py-3 transition-colors" style={{ background: active ? '#FCF0EF' : o.couple ? '#FFFAEE' : 'transparent', borderBottom: '1px solid #F1ECEA', boxShadow: active ? 'inset 3px 0 #D2686D' : 'none', animation: flash ? 'flashRing 1.3s ease 2' : 'none' }}>
                      <span className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[14px] font-bold tracking-tight" style={{ background: o.couple ? '#FBEFCB' : '#F3DFDC', color: o.couple ? '#C08A1E' : '#B96165' }}>
                        {o.couple ? '⭐' : initials(o.name)}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-[13.5px] font-semibold truncate" style={{ color: active ? '#C95E64' : '#302A28' }}>{o.couple ? `${o.name}` : o.name}</span>
                          <span className="text-[11.5px] flex-shrink-0" style={{ color: waitColor }}>{new Date(o.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                        <span className="flex items-center justify-between gap-2 mt-1">
                          <span className="text-[11.5px] truncate" style={{ color: '#89817D' }}>{o.couple ? 'Düğün Çifti · ' : ''}{oPrice(o) > 0 ? `${oPrice(o)}₺` : (o.rows.length + ' kare')}</span>
                          <span className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="inline-flex items-center justify-center min-w-[26px] h-[20px] px-1.5 rounded-md text-[11.5px] font-bold" style={{ background: '#FCF0EF', color: '#C95E64' }}>×{totQ}</span>
                            <span title={meta.label} className="inline-flex items-center gap-1 px-1.5 h-[18px] rounded-full text-[10px] font-semibold" style={{ background: meta.soft, color: meta.color }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />{meta.label}</span>
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="px-3 py-2 text-center text-[11.5px] flex-shrink-0" style={{ color: '#A79F9B', borderTop: '1px solid #F1ECEA' }}>{queue.length} sipariş</div>
            </aside>

            {/* ORTA — seçili sipariş */}
            <section className="rounded-2xl overflow-hidden flex flex-col" style={{ background: '#fff', border: '1px solid #ECE5E2', boxShadow: '0 8px 26px rgba(62,43,37,0.04)', maxHeight: 'calc(100vh - 190px)' }}>
              {loading ? (
                <p className="text-center text-sm text-gray-400 py-16">Yükleniyor…</p>
              ) : !selOrder ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
                  <span className="text-4xl mb-3">🖼️</span>
                  <p className="text-[14px] font-semibold" style={{ color: '#6B625E' }}>Soldan bir sipariş seçin</p>
                  <p className="text-[12.5px] mt-1" style={{ color: '#A79F9B' }}>Kim bekliyor → ne basacağım → nasıl basacağım</p>
                </div>
              ) : (() => {
                const ci = Math.min(thumbIdx, selOrder.rows.length - 1);
                const cur = selOrder.rows[ci];
                const st = selOrder.status;
                const stepIdx = st === 'pending' ? 0 : st === 'printing' ? 1 : st === 'printed' ? 2 : 3;
                return (
                  <>
                    <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #F0EAE7' }}>
                      <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-bold tracking-tight" style={{ background: selOrder.couple ? '#FBEFCB' : '#F3DFDC', color: selOrder.couple ? '#C08A1E' : '#B96165' }}>{selOrder.couple ? '⭐' : initials(selOrder.name)}</span>
                      <div className="min-w-0">
                        <h2 className="text-[17px] font-bold leading-tight truncate" style={{ color: '#2E2927' }}>{selOrder.couple ? `${selOrder.name} · Düğün Çifti` : selOrder.name}</h2>
                        <p className="text-[12px]" style={{ color: '#908985' }}>Sipariş {orderCode(selOrder)} · {new Date(selOrder.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <span className="ml-auto px-2.5 py-1 rounded-full text-[11.5px] font-semibold flex-shrink-0" style={{ background: STATUS_META[st].soft, color: STATUS_META[st].color }}>{STATUS_META[st].label}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 py-4">
                      {/* Çoklu foto: ÜSTTE thumbnail şeridi (durum rozeti + tooltip) */}
                      {selOrder.rows.length > 1 && (
                        <div className="flex gap-2.5 mb-3 overflow-x-auto pb-1">
                          {selOrder.rows.map((r, i) => {
                            const rm = STATUS_META[r.status]; const rdone = r.status === 'printed' || r.status === 'delivered';
                            return (
                              <button key={r.id} onClick={() => setThumbIdx(i)} title={rm?.label} className="relative flex-shrink-0 rounded-lg overflow-hidden" style={{ width: 96, height: 72, border: i === ci ? '2px solid #D2686D' : '2px solid #ECE5E2' }}>
                                <img src={optimizeImg(r.photo_url, 220)} alt="" className="w-full h-full object-cover" onError={(e) => { const t = e.currentTarget as HTMLImageElement; if (!t.dataset.fb) { t.dataset.fb = '1'; t.src = r.photo_url; } }} />
                                <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: rm?.color || '#C4BDB9', boxShadow: '0 0 0 1.5px #fff' }}>
                                  {rdone && <svg className="w-2.5 h-2.5" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Büyük seçili fotoğraf — sağ üstte 3-nokta menü (İndir / Tam ekran / Yeniden yazdır) */}
                      <div className="relative w-full rounded-xl overflow-hidden flex items-center justify-center" style={{ background: '#F6F4F3', minHeight: 320 }}>
                        <PhotoView key={cur.id} url={cur.photo_url} onClick={() => setLightbox(cur.photo_url)} />
                        <div className="absolute top-2 right-2 z-10">
                          <button onClick={(e) => { e.stopPropagation(); setPhotoMenuOpen((v) => !v); }} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(20,12,14,0.5)', color: '#fff' }}>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" /></svg>
                          </button>
                          {photoMenuOpen && (
                            <>
                              <div className="fixed inset-0 z-[60]" onClick={() => setPhotoMenuOpen(false)} />
                              <div className="absolute right-0 mt-1.5 z-[61] w-44 rounded-xl overflow-hidden py-1" style={{ background: '#fff', border: '1px solid #ECE5E2', boxShadow: '0 12px 30px rgba(60,40,35,0.18)' }}>
                                <button onClick={() => { downloadPhoto(cur.photo_url, `${selOrder.name}_${cur.size_label || 'foto'}`); setPhotoMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] hover:bg-rose-50/50" style={{ color: '#5C5652' }}><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>İndir</button>
                                <button onClick={() => { setLightbox(cur.photo_url); setPhotoMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] hover:bg-rose-50/50" style={{ color: '#5C5652' }}><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 20.25v-4.5m0 4.5h-4.5m4.5 0L15 15" /></svg>Tam ekran</button>
                                <button onClick={() => { setConfirmReprint(cur.photo_url); setPhotoMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] hover:bg-rose-50/50" style={{ color: '#5C5652' }}><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992V4.356M2.985 19.644v-4.992h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.183m0-4.991v4.99" /></svg>Yeniden yazdır</button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Sipariş özeti tek satır */}
                      <div className="grid grid-cols-3 mt-4 rounded-xl overflow-hidden" style={{ border: '1px solid #EEE7E4' }}>
                        <div className="px-3 py-2.5" style={{ borderRight: '1px solid #EEE7E4' }}>
                          <p className="text-[11px]" style={{ color: '#A79F9B' }}>Boyut · Adet</p>
                          <p className="text-[13.5px] font-semibold" style={{ color: '#302A28' }}>{cur.size_label || 'Boy?'} · {cur.qty}</p>
                        </div>
                        <div className="px-3 py-2.5" style={{ borderRight: '1px solid #EEE7E4' }}>
                          <p className="text-[11px]" style={{ color: '#A79F9B' }}>Tutar</p>
                          <p className="text-[13.5px] font-semibold" style={{ color: cur.price_tl > 0 ? '#B85258' : '#A79F9B' }}>{cur.price_tl > 0 ? `${cur.qty} × ${cur.price_tl}₺ = ${cur.qty * cur.price_tl}₺` : 'Fiyat bekliyor'}</p>
                        </div>
                        <div className="px-3 py-2.5">
                          <p className="text-[11px]" style={{ color: '#A79F9B' }}>Saat</p>
                          <p className="text-[13.5px] font-semibold" style={{ color: '#302A28' }}>{new Date(cur.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>

                      {/* Durum stepper — ikonlu + bağlantı çizgili */}
                      <div className="flex items-start mt-6 px-1">
                        {([
                          { lbl: 'Beklemede', d: 'M12 6v6l4 2M22 12a10 10 0 11-20 0 10 10 0 0120 0z' },
                          { lbl: 'Baskıda', d: 'M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2M6 14h12v7H6z' },
                          { lbl: 'Hazır', d: 'M5 13l4 4L19 7' },
                          { lbl: 'Teslim', d: 'M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zm0 0h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z' },
                        ] as const).map((s, i) => {
                          const done = i < stepIdx; const active = i === stepIdx;
                          const col = done ? '#329464' : active ? '#D2686D' : '#C4BDB9';
                          const bg = done ? '#EDF8F2' : active ? '#FCF0EF' : '#F4F1EF';
                          return (
                            <div key={s.lbl} className="flex items-start" style={{ flex: i < 3 ? 1 : '0 0 auto' }}>
                              <div className="flex flex-col items-center gap-1.5" style={{ width: 62 }}>
                                <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: bg, color: col, border: `1.5px solid ${done || active ? col : '#E4DDDA'}` }}>
                                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={done ? 2.4 : 1.9} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={done ? 'M5 13l4 4L19 7' : s.d} /></svg>
                                </span>
                                <span className="text-[10.5px] text-center leading-tight" style={{ color: col, fontWeight: active ? 600 : 400 }}>{s.lbl}</span>
                              </div>
                              {i < 3 && <span className="h-[2px] mt-[17px]" style={{ flex: 1, background: i < stepIdx ? '#329464' : '#E7E0DD' }} />}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </>
                );
              })()}
            </section>

            {/* SAĞ — sipariş bilgisi + bağlamsal aksiyon */}
            <aside className="flex flex-col gap-4" style={{ maxHeight: 'calc(100vh - 190px)' }}>
              {selOrder && (() => {
                const rows = selOrder.rows;
                const st = selOrder.status;
                const totQ = rows.reduce((a, r) => a + r.qty, 0);
                const priced = rows.every((r) => !!r.size_label && r.price_tl > 0);
                const totP = rows.reduce((a, r) => a + (r.price_tl || 0) * r.qty, 0);
                const ci = Math.min(thumbIdx, rows.length - 1);
                const cur = rows[ci];
                const printedCount = rows.filter((r) => r.status === 'printed' || r.status === 'delivered').length;
                const allPrinted = rows.every((r) => r.status === 'printed' || r.status === 'delivered');
                const allDelivered = rows.every((r) => r.status === 'delivered');
                const curStatus = cur.status;
                const undoIcon = <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>;
                return (
                  <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #ECE5E2', boxShadow: '0 8px 26px rgba(62,43,37,0.04)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[14px] font-bold" style={{ color: '#2E2927' }}>Sipariş Bilgisi</h3>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ background: '#F4F1EF', color: '#8A827E' }}>{orderCode(selOrder)}</span>
                    </div>
                    <div className="flex flex-col gap-2.5 text-[13px]">
                      <div className="flex items-center justify-between"><span style={{ color: '#89817D' }}>{selOrder.couple ? 'Düğün Çifti' : 'Davetli'}</span><span className="font-semibold" style={{ color: '#302A28' }}>{selOrder.name}</span></div>
                      <div className="flex items-center justify-between"><span style={{ color: '#89817D' }}>Fotoğraf</span><span className="font-semibold" style={{ color: '#302A28' }}>{rows.length} kare</span></div>
                      <div className="flex items-center justify-between"><span style={{ color: '#89817D' }}>Toplam baskı</span><span className="font-semibold" style={{ color: '#302A28' }}>{totQ} adet</span></div>
                      <div className="flex items-center justify-between"><span style={{ color: '#89817D' }}>Toplam</span><span className="font-extrabold text-[15px]" style={{ color: priced ? '#B85258' : '#A79F9B' }}>{priced ? `${totP}₺` : 'Fiyat bekliyor'}</span></div>
                    </div>

                    {/* Ödeme — teslimden AYRI gösterilir */}
                    <div className="mt-3 flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: allDelivered ? '#EDF8F2' : '#FCF0EF' }}>
                      <span className="text-[12.5px] font-semibold" style={{ color: allDelivered ? '#2E7D52' : '#9A6C6E' }}>Ödeme</span>
                      <span className="text-[13px] font-bold" style={{ color: allDelivered ? '#329464' : '#B85258' }}>{!priced ? 'Fiyat bekliyor' : allDelivered ? `✓ ${totP}₺ alındı` : `Teslimde ${totP}₺`}</span>
                    </div>

                    {/* Baskı ilerlemesi (kısmi: örn. 2/6 basıldı) */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[12px] mb-1.5"><span style={{ color: '#89817D' }}>Baskı ilerlemesi</span><span className="font-semibold" style={{ color: '#302A28' }}>{printedCount}/{rows.length} basıldı</span></div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#F0EAE7' }}><div className="h-full rounded-full" style={{ width: `${Math.round((printedCount / rows.length) * 100)}%`, background: '#329464' }} /></div>
                    </div>

                    {!priced && selOrder.couple && <p className="text-[11.5px] mt-3 px-3 py-2 rounded-lg" style={{ background: '#FFF6E8', color: '#8A6A2E' }}>Boy/fiyat girilmemiş. Çiftle iletişime geçip fiyatı belirleyebilirsiniz.</p>}

                    <div className="my-3.5 h-px" style={{ background: '#F0EAE7' }} />

                    {/* Seçili fotoğrafın aksiyonu — foto-bazlı ilerleme */}
                    <div>
                      <p className="text-[11px] font-semibold mb-2 tracking-wide" style={{ color: '#A79F9B' }}>SEÇİLİ FOTOĞRAF{rows.length > 1 ? ` · ${ci + 1}/${rows.length}` : ''}</p>
                      {curStatus === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => { printPhoto(cur.photo_url); advanceOrder([cur], 'printing'); if (ci < rows.length - 1) setThumbIdx(ci + 1); }} className="flex-1 h-11 rounded-xl text-white text-[14px] font-semibold flex items-center justify-center gap-2" style={{ background: '#D45F65', boxShadow: '0 8px 18px rgba(194,85,91,0.16)' }}>🖨 Yazdır</button>
                          <button onClick={() => downloadPhoto(cur.photo_url, `${selOrder.name}_${cur.size_label || 'foto'}`)} title="İndir — kendi baskı programında aç" className="h-11 px-4 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-1.5" style={{ background: '#F7F2F1', color: '#6B5A5A' }}><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>İndir</button>
                        </div>
                      )}
                      {curStatus === 'printing' && (
                        <button onClick={() => advanceOrder([cur], 'printed')} className="w-full h-11 rounded-xl text-white text-[14px] font-semibold flex items-center justify-center gap-2" style={{ background: '#329464', boxShadow: '0 8px 18px rgba(50,148,100,0.16)' }}>✓ Baskı Tamamlandı</button>
                      )}
                      {(curStatus === 'printed' || curStatus === 'delivered') && (<>
                        <div className="w-full h-11 rounded-xl flex items-center justify-center gap-1.5 text-[13.5px] font-semibold" style={{ background: '#EDF8F2', color: '#329464' }}><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Bu fotoğraf basıldı</div>
                        {curStatus === 'printed' && (
                          <div className="mt-1.5">
                            <button onClick={() => setMoreOpen((v) => !v)} className="w-full flex items-center justify-center gap-1 py-1.5 text-[12px] font-semibold" style={{ color: '#9A928E' }}>Diğer işlemler<svg className="w-3.5 h-3.5 transition-transform" style={{ transform: moreOpen ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg></button>
                            {moreOpen && (
                              <div className="flex gap-2 mt-1">
                                <button onClick={() => setConfirmReprint(cur.photo_url)} className="flex-1 h-9 rounded-xl text-[12.5px] font-semibold flex items-center justify-center gap-1.5" style={{ background: '#F7F2F1', color: '#6B5A5A' }}>↻ Yeniden yazdır</button>
                                <button onClick={() => advanceOrder([cur], 'printing')} className="flex-1 h-9 rounded-xl text-[12.5px] font-semibold flex items-center justify-center gap-1" style={{ background: '#F7F2F1', color: '#8A7E7E' }}>{undoIcon}Basılmadı</button>
                              </div>
                            )}
                          </div>
                        )}
                      </>)}
                    </div>

                    {/* Çoklu baskı — birden fazla fotoğraf varsa toplu işlem */}
                    {rows.length > 1 && (rows.some((r) => r.status === 'pending') || rows.some((r) => r.status === 'printing')) && (
                      <div className="flex gap-2 mt-2">
                        {rows.some((r) => r.status === 'pending') && (
                          <button onClick={() => { const pend = rows.filter((r) => r.status === 'pending'); printPhotos(pend.map((r) => r.photo_url)); advanceOrder(pend, 'printing'); }} className="flex-1 h-9 rounded-xl text-[12.5px] font-semibold flex items-center justify-center gap-1.5" style={{ background: '#FBE3E4', color: '#C25760' }}>🖨 Tümünü Yazdır ({rows.filter((r) => r.status === 'pending').length})</button>
                        )}
                        {rows.some((r) => r.status === 'printing') && (
                          <button onClick={() => advanceOrder(rows.filter((r) => r.status === 'printing'), 'printed')} className="flex-1 h-9 rounded-xl text-[12.5px] font-semibold flex items-center justify-center gap-1.5" style={{ background: '#E4F3EA', color: '#2E7D52' }}>✓ Tümü Basıldı</button>
                        )}
                      </div>
                    )}

                    {/* Sipariş durumu — TÜM fotoğraflar basılınca teslim (ödeme yukarıda ayrı) */}
                    {allPrinted && !allDelivered && (
                      <button onClick={() => advanceOrder(rows, 'delivered')} className="w-full h-12 mt-3 rounded-xl text-[14.5px] font-bold flex items-center justify-center gap-2 transition-colors hover:bg-rose-50" style={{ background: '#FFF6F5', border: '1.5px solid #E3A9A6', color: '#C25760' }}>🎁 Teslim Edildi</button>
                    )}
                    {allDelivered && (
                      <div className="mt-3 py-3 rounded-xl text-center" style={{ background: '#F2F8F4', border: '1px solid #D8EBDF' }}>
                        <p className="text-[14px] font-bold" style={{ color: '#329464' }}>✓ Teslim edildi</p>
                        <button onClick={() => setMoreOpen((v) => !v)} className="inline-flex items-center gap-1 text-[11.5px] font-semibold mt-1.5" style={{ color: '#9AA79E' }}>⋯ Diğer işlemler</button>
                        {moreOpen && (
                          <button onClick={() => advanceOrder(rows, 'printed')} className="mx-auto mt-2 inline-flex items-center gap-1 px-3 h-8 rounded-lg text-[12px] font-semibold" style={{ background: '#fff', border: '1px solid #D8EBDF', color: '#8A827E' }}>{undoIcon}Teslimi geri al</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              <button onClick={() => setShowSizesModal(true)} className="rounded-2xl p-4 text-left flex items-center gap-3" style={{ background: '#fff', border: '1px solid #ECE5E2', boxShadow: '0 8px 26px rgba(62,43,37,0.04)' }}>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FCF0EF', color: '#C95E64' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </span>
                <div>
                  <p className="text-[13.5px] font-semibold" style={{ color: '#2E2927' }}>Baskı Boyutları</p>
                  <p className="text-[11.5px]" style={{ color: '#89817D' }}>{sizes.length} boy tanımlı · düzenle</p>
                </div>
              </button>
            </aside>
          </div>

          {/* Baskı boyutları ayar modalı (⚙) */}
          {showSizesModal && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }} onClick={() => sizes.length > 0 && setShowSizesModal(false)}>
              <div className="w-full max-w-lg rounded-[24px] p-5" style={{ background: '#FFFDFC', boxShadow: '0 30px 80px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-gray-800 text-[16px]">Fotoğraf Baskı Boyutları</h3>
                  {sizes.length > 0 && <button onClick={() => setShowSizesModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F4EDEE', color: '#9A7B7D' }}>✕</button>}
                </div>
                <p className="text-[12.5px] text-gray-400 mb-3">Davetliler yalnızca buraya eklediğiniz boyutlardan seçebilir.</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {QUICK_SIZES.map((sz) => (
                    <button key={sz} onClick={() => { setNewSizeLabel(sz); setTimeout(() => priceRef.current?.focus(), 50); }} className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold" style={{ background: newSizeLabel === sz ? 'rgba(200,104,110,0.12)' : '#F3EEEE', color: newSizeLabel === sz ? '#C8686E' : '#7A6E6E' }}>{sz}</button>
                  ))}
                </div>
                <div className="flex gap-2 mb-4">
                  <input value={newSizeLabel} onChange={(e) => setNewSizeLabel(e.target.value)} placeholder="Boyut (ör. 10x15)" className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-gray-200 outline-none focus:border-[#C8686E]/50 text-gray-900 text-[14px]" />
                  <div className="relative w-28">
                    <input ref={priceRef} value={newSizePrice} onChange={(e) => setNewSizePrice(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="Fiyat" className="w-full px-3 py-2.5 pr-7 rounded-lg border border-gray-200 outline-none focus:border-[#C8686E]/50 text-gray-900 text-[14px]" onKeyDown={(e) => e.key === 'Enter' && addSize()} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[14px]">₺</span>
                  </div>
                  <button onClick={addSize} disabled={addingSize || !newSizeLabel.trim() || newSizePrice === ''} className="px-4 min-w-[64px] flex items-center justify-center rounded-lg font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}>{addingSize ? '…' : 'Ekle'}</button>
                </div>
                {sizes.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-4">Henüz boyut eklemediniz. En az bir tane ekleyin.</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                    {sizes.map((sz) => (
                      <div key={sz.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white" style={{ border: '1px solid rgba(200,104,110,0.12)' }}>
                        <span className="font-semibold text-gray-800">{sz.size_label}</span>
                        <div className="flex items-center gap-4">
                          <span className="font-bold" style={{ color: '#B85258' }}>{sz.price_tl > 0 ? `${sz.price_tl}₺` : 'Fiyat yok'}</span>
                          <button onClick={() => deleteSize(sz.id)} className="text-gray-300 hover:text-red-500 text-[13px]">sil</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Yeniden yazdır onayı */}
          {confirmReprint && (
            <div className="fixed inset-0 z-[85] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setConfirmReprint(null)}>
              <div className="w-full max-w-sm rounded-2xl p-5 text-center" style={{ background: '#fff' }} onClick={(e) => e.stopPropagation()}>
                <p className="text-[15px] font-bold text-gray-800 mb-1">Yeniden yazdırılsın mı?</p>
                <p className="text-[13px] text-gray-500 mb-4">Bu fotoğraf daha önce baskıya gönderildi. Tekrar yazdırmak istiyor musunuz?</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmReprint(null)} className="flex-1 py-2.5 rounded-xl text-[13.5px] font-semibold" style={{ background: '#F4EDEE', color: '#7A6E6E' }}>İptal</button>
                  <button onClick={() => { printPhoto(confirmReprint); setConfirmReprint(null); }} className="flex-1 py-2.5 rounded-xl text-[13.5px] font-semibold text-white" style={{ background: '#D45F65' }}>Yeniden Yazdır</button>
                </div>
              </div>
            </div>
          )}

          {/* Yeni sipariş bildirimi — sol alt toast */}
          {toast && (
            <div className="fixed z-[75] bottom-6 left-6 flex items-center gap-3 pl-3.5 pr-4 py-3 rounded-2xl" style={{ background: '#fff', border: `1px solid ${toast.ok ? '#CDE9D8' : '#ECE5E2'}`, boxShadow: '0 14px 40px rgba(60,40,35,0.14)', animation: 'slideInLeft 0.25s ease' }}>
              <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[15px]" style={{ background: toast.ok ? '#EDF8F2' : toast.couple ? '#FBEFCB' : '#FCF0EF', color: toast.ok ? '#329464' : toast.couple ? '#C08A1E' : '#C95E64' }}>{toast.ok ? '✓' : toast.couple ? '⭐' : '🔔'}</span>
              <div>
                <p className="text-[13px] font-bold" style={{ color: '#2E2927' }}>{toast.title || 'Yeni baskı isteği'}</p>
                <p className="text-[12px]" style={{ color: '#89817D' }}>{toast.name} · {toast.info}</p>
              </div>
              <button onClick={() => setToast(null)} className="ml-1 text-[16px] leading-none" style={{ color: '#C7C0BD' }}>×</button>
            </div>
          )}

          {/* eski gövde — render edilmiyor */}
          {false && (
          <div>
            <aside className="hidden md:flex flex-col w-60 flex-shrink-0">
              <div className="relative mb-3">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>
                <input value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} placeholder="Davetli ara…" className="w-full pl-9 pr-3 py-2 rounded-lg border outline-none text-[13px] text-gray-900" style={{ borderColor: 'rgba(0,0,0,0.10)' }} />
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: '70vh' }}>
                <button onClick={() => setSelectedGuest('all')} className="flex items-center justify-between px-3 py-2 rounded-lg text-left text-[13px] font-semibold transition-colors" style={{ background: selectedGuest === 'all' ? 'rgba(200,104,110,0.10)' : 'transparent', color: selectedGuest === 'all' ? '#C8686E' : '#6B5A5A' }}>
                  Tümü <span className="text-[11px] text-gray-400">{prints.length}</span>
                </button>
                {guestList.map(([gkey, c]) => (
                  <button key={gkey} onClick={() => { setSelectedGuest(gkey); setTab(c.pending > 0 ? 'pending' : 'done'); }} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left transition-colors" style={{ background: selectedGuest === gkey ? 'rgba(200,104,110,0.10)' : 'transparent' }}>
                    <span className="text-[13px] font-semibold truncate" style={{ color: selectedGuest === gkey ? '#C8686E' : '#4A3A3A' }}>{labelOf[gkey] || '—'}</span>
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      {c.pending > 0 && <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold" style={{ color: '#E5484D' }}><svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2M22 12a10 10 0 11-20 0 10 10 0 0120 0z" /></svg>{c.pending}</span>}
                      {c.done > 0 && <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold" style={{ color: '#318052' }}><svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{c.done}</span>}
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            <div className="flex-1 min-w-0">
            {/* Mobil davetli filtre — yatay çipler */}
            <div className="md:hidden mb-4">
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button onClick={() => setSelectedGuest('all')} className="flex-shrink-0 px-3 py-1.5 rounded-full text-[12.5px] font-semibold" style={{ background: selectedGuest === 'all' ? '#C8686E' : 'rgba(200,104,110,0.08)', color: selectedGuest === 'all' ? '#fff' : '#8A6E70' }}>Tümü</button>
                {guestList.map(([gkey, c]) => (
                  <button key={gkey} onClick={() => { setSelectedGuest(gkey); setTab(c.pending > 0 ? 'pending' : 'done'); }} className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-semibold" style={{ background: selectedGuest === gkey ? '#C8686E' : 'rgba(200,104,110,0.08)', color: selectedGuest === gkey ? '#fff' : '#8A6E70' }}>
                    {labelOf[gkey] || '—'}
                    {c.pending > 0 && <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9.5px] font-bold" style={{ background: selectedGuest === gkey ? 'rgba(255,255,255,0.25)' : '#E5484D', color: '#fff' }}>{c.pending}</span>}
                  </button>
                ))}
              </div>
            </div>
            {/* Sekmeler */}
            <div className="flex flex-wrap gap-1 p-1 rounded-xl mb-5 max-w-2xl" style={{ background: 'rgba(200,104,110,0.07)' }}>
              {([['pending', 'Bekleyenler', pending.length], ['done', 'Tamamlananlar', done.length], ['couple', 'Düğün Çifti', couplePendingCount], ['sizes', 'Baskı Boyutları', sizes.length]] as const).map(([k, lbl, n]) => (
                <button key={k} onClick={() => setTab(k)} className="flex-1 min-w-[130px] py-2 rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5" style={{ background: tab === k ? '#fff' : 'transparent', color: tab === k ? (k === 'couple' ? '#B8860B' : '#C8686E') : '#9A8A8A', boxShadow: tab === k ? '0 2px 6px rgba(200,104,110,0.12)' : 'none' }}>
                  {k === 'couple' && <span aria-hidden style={{ fontSize: 13 }}>⭐</span>}
                  {lbl}
                  {n > 0 && (k === 'sizes'
                    ? <span className="inline-flex items-center justify-center min-w-[22px] h-[20px] px-1.5 rounded-[6px] text-[12px] font-bold" style={{ background: 'rgba(200,104,110,0.14)', color: '#B85258' }}>{n}</span>
                    : <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white" style={{ background: k === 'pending' ? '#E5484D' : k === 'couple' ? '#D4A017' : '#C8686E' }}>{n}</span>)}
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
                  {Object.entries(groupedPending).map(([guest, rows]) => {
                    const gname = labelOf[guest] || rows[0]?.guest_name || '—';
                    return (
                    <div key={guest}>
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #E9A0A3, #C8686E)' }}>{gname.charAt(0).toUpperCase()}</span>
                        <div>
                          <h3 className="font-bold text-gray-800 leading-tight">Davetli: {gname}</h3>
                          <span className="text-[12px]" style={{ color: '#E5484D' }}>{rows.reduce((a, r) => a + r.qty, 0)} baskı bekliyor</span>
                        </div>
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
                                <button onClick={() => downloadPhoto(r.photo_url, `${gname}_${r.size_label}`)} title="İndir" className="flex-1 py-1.5 rounded-lg flex items-center justify-center" style={{ background: 'rgba(200,104,110,0.08)', color: '#C8686E' }}>
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
                    );
                  })}
                </div>
              )
            )}

            {/* ⭐ Düğün Çifti Talepleri — order_id'ye gruplu, öne çıkan */}
            {!loading && tab === 'couple' && (
              coupleOrders.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-12">Düğün çiftinden henüz baskı siparişi yok.</p>
              ) : (
                <div className="flex flex-col gap-5">
                  {coupleOrders.map(([orderId, rows]) => {
                    const totalQty = rows.reduce((a, r) => a + r.qty, 0);
                    const priced = rows.every((r) => !!r.size_label);
                    const totalPrice = rows.reduce((a, r) => a + (r.price_tl || 0) * r.qty, 0);
                    const allPrinted = rows.every((r) => r.status === 'printed');
                    const allPaid = rows.every((r) => r.paid);
                    const dt = new Date(rows[0]?.created_at || Date.now());
                    return (
                    <div key={orderId} className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #FFFBF0, #FFF6F6)', border: '1.5px solid rgba(212,160,23,0.35)', boxShadow: '0 4px 16px rgba(184,134,11,0.08)' }}>
                      <div className="flex items-center gap-2.5 mb-3">
                        <span className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[15px] flex-shrink-0" style={{ background: 'linear-gradient(135deg, #E6B84C, #C89020)' }}>⭐</span>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800 leading-tight">Düğün Çifti Siparişi</h3>
                          <span className="text-[12px] text-gray-500">{dt.toLocaleDateString('tr-TR')} · {totalQty} baskı{priced ? ` · ${totalPrice}₺` : ' · fiyat bekliyor'}</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: allPrinted ? 'rgba(49,128,82,0.10)' : 'rgba(212,160,23,0.14)', color: allPrinted ? '#318052' : '#B8860B' }}>{allPrinted ? 'Hazır' : 'Bekliyor'}</span>
                      </div>
                      {!priced && (
                        <p className="text-[12px] mb-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(212,160,23,0.10)', color: '#8A6A2E' }}>Bu siparişte boy/fiyat girilmemiş. Çiftle iletişime geçip fiyatı belirleyebilirsiniz.</p>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {rows.map((r) => (
                          <div key={r.id} className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid rgba(200,104,110,0.14)' }}>
                            <button onClick={() => setLightbox(r.photo_url)} className="relative aspect-square w-full bg-gray-50 block">
                              <img src={optimizeImg(r.photo_url, 400)} alt="" className="w-full h-full object-cover" />
                              <span className="absolute bottom-1.5 left-1.5 px-2 py-[3px] rounded-md text-[11px] font-bold text-white" style={{ background: 'rgba(0,0,0,0.55)' }}>{r.size_label || 'Boy?'} · {r.qty} adet</span>
                            </button>
                            <div className="p-2">
                              <div className="flex gap-1.5 mb-1.5">
                                <button onClick={() => downloadPhoto(r.photo_url, `DugunCifti_${r.size_label || 'foto'}`)} title="İndir" className="flex-1 py-1.5 rounded-lg flex items-center justify-center" style={{ background: 'rgba(200,104,110,0.08)', color: '#C8686E' }}>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                                </button>
                                <button onClick={() => printPhoto(r.photo_url)} title="Yazdır" className="flex-1 py-1.5 rounded-lg flex items-center justify-center" style={{ background: 'rgba(200,104,110,0.08)', color: '#C8686E' }}>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096M17.66 18L17.28 21.523M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456M17.66 18h1.09A2.25 2.25 0 0021 15.75V9.456m-18 0a2.25 2.25 0 011.837-2.175M3 9.456V6.375c0-.621.504-1.125 1.125-1.125h15.75c.621 0 1.125.504 1.125 1.125v3.081" /></svg>
                                </button>
                              </div>
                              {r.status === 'printed'
                                ? <button onClick={() => revertPrinted(r.id)} className="w-full py-2 rounded-lg text-[12px] font-semibold" style={{ background: 'rgba(49,128,82,0.10)', color: '#318052' }}>Hazır ✓</button>
                                : <button onClick={() => markPrinted(r.id)} className="w-full py-2 rounded-lg text-[12px] font-semibold" style={{ border: '1.5px solid #318052', color: '#318052', background: 'transparent' }}>Baskıyı Tamamladım</button>}
                            </div>
                          </div>
                        ))}
                      </div>
                      {allPrinted && priced && (
                        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(200,104,110,0.12)' }}>
                          {allPaid
                            ? <><span className="text-[13px] font-bold" style={{ color: '#318052' }}>Ödendi · {totalPrice}₺</span><button onClick={() => setRowsPaid(rows, false)} className="text-[11.5px] font-semibold" style={{ color: '#7A6E6E' }}>Geri Al</button></>
                            : <><span className="text-[13px] font-semibold text-gray-600">Tahsil edilecek: <span className="font-bold" style={{ color: '#B85258' }}>{totalPrice}₺</span></span><button onClick={() => setRowsPaid(rows, true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-bold" style={{ background: 'rgba(49,128,82,0.10)', color: '#318052', border: '1px solid rgba(49,128,82,0.30)' }}>Ödeme Aldım</button></>}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Tamamlananlar — davetliye gruplu + toplam adet/ücret + tahsilat */}
            {!loading && tab === 'done' && (<>
              {done.length > 0 && (
                <div className="flex gap-1.5 mb-4">
                  {([['all', 'Hepsi'], ['unpaid', 'Ödeme Bekleyenler'], ['paid', 'Ödeme Alınanlar']] as const).map(([k, lbl]) => (
                    <button key={k} onClick={() => setDoneFilter(k)} className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold transition-colors" style={{ background: doneFilter === k ? '#C8686E' : 'rgba(200,104,110,0.08)', color: doneFilter === k ? '#fff' : '#8A6E70' }}>{lbl}</button>
                  ))}
                </div>
              )}
              {Object.keys(groupedDone).length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-12">{done.length === 0 ? 'Henüz tamamlanan baskı yok.' : 'Bu filtrede kayıt yok.'}</p>
              ) : (
                <div className="flex flex-col gap-5">
                  {Object.entries(groupedDone).map(([guest, rows]) => {
                    const gname = labelOf[guest] || rows[0]?.guest_name || '—';
                    const totQty = rows.reduce((a, r) => a + r.qty, 0);
                    const totPrice = rows.reduce((a, r) => a + r.qty * r.price_tl, 0);
                    const allPaid = rows.every((r) => r.paid);
                    return (
                      <div key={guest} className="rounded-2xl p-3.5" style={{ background: '#fff', border: `1px solid ${allPaid ? 'rgba(49,128,82,0.28)' : 'rgba(200,104,110,0.14)'}` }}>
                        <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                          <div>
                            <h3 className="font-bold text-gray-800 leading-tight">Davetli: {gname}</h3>
                            <span className="text-[12px] text-gray-500">{totQty} baskı{totPrice > 0 ? ` · ${totPrice}₺` : ''}</span>
                          </div>
                          <div className="text-center">
                            {allPaid ? (
                              <div className="flex flex-col items-center gap-1">
                                {totPrice > 0 && <span className="text-[16px] font-extrabold" style={{ color: '#318052' }}>{totPrice}₺</span>}
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-bold text-white" style={{ background: '#318052' }}>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                  Ödendi
                                </span>
                                <button onClick={() => setRowsPaid(rows, false)} className="inline-flex items-center gap-1 text-[11.5px] font-semibold" style={{ color: '#7A6E6E' }}>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                                  Geri Al
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                {totPrice > 0 && <span className="text-[16px] font-extrabold" style={{ color: '#C8686E' }}>{totPrice}₺</span>}
                                <button onClick={() => setRowsPaid(rows, true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-bold" style={{ background: 'rgba(49,128,82,0.10)', color: '#318052', border: '1px solid rgba(49,128,82,0.30)' }}>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                  Ödeme Aldım
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                          {rows.map((r) => (
                            <div key={r.id} className="relative rounded-xl overflow-hidden bg-gray-50" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
                              <button onClick={() => setLightbox(r.photo_url)} className="relative aspect-square w-full block">
                                <img src={optimizeImg(r.photo_url, 300)} alt="" className="w-full h-full object-cover opacity-95" />
                                <span className="absolute bottom-1 left-1 px-1.5 py-[2px] rounded text-[9.5px] font-bold text-white" style={{ background: 'rgba(0,0,0,0.55)' }}>{r.size_label}·{r.qty}</span>
                              </button>
                              <button onClick={() => revertPrinted(r.id)} title="Geri al" className="absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.92)' }}>
                                <svg className="w-3 h-3" fill="none" stroke="#8A7E7E" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
            )}

            {/* Baskı Boyutları */}
            {!loading && tab === 'sizes' && (
              <div className="max-w-lg">
                <div className="rounded-2xl p-4 mb-5 bg-white" style={{ border: '1px solid rgba(200,104,110,0.14)' }}>
                  <h3 className="font-bold text-gray-800 mb-1">Fotoğraf Baskı Boyu Ekle</h3>
                  <p className="text-[12.5px] text-gray-400 mb-3">Davetliler yalnızca buraya eklediğiniz baskı boyutlarından seçebilir. Fiyatı görmeleri sipariş vermelerini kolaylaştırır.</p>
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
                    <button onClick={addSize} disabled={addingSize || !newSizeLabel.trim() || newSizePrice === ''} className="px-4 min-w-[64px] flex items-center justify-center rounded-lg font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}>{addingSize ? <span className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" /> : 'Ekle'}</button>
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
          </div>
          )}

          {/* Giriş sonrası kurulum modalı — kayan 2 adım */}
          {showSetup && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
              <div className="w-full max-w-md rounded-[26px] overflow-hidden relative" style={{ background: '#FFFDFC', boxShadow: '0 30px 80px rgba(0,0,0,0.2)' }}>
                <div className="flex transition-transform duration-400" style={{ transform: `translateX(-${setupStep * 100}%)` }}>
                  {/* Adım 0 — tanıtım (görselin tamamı görünsün, taşma yok) */}
                  <div className="w-full flex-shrink-0">
                    <div className="relative w-full flex items-center justify-center pt-4" style={{ background: '#FFFDFC' }}>
                      <img src="/fotografci-panel.png" alt="" className="w-[78%] max-h-[230px] object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
                    </div>
                    <div className="px-7 pb-7 -mt-1 relative text-center">
                      <h3 className="text-[19px] font-bold mb-2" style={{ color: '#B85258', fontFamily: 'var(--font-playfair), Georgia, serif' }}>Hoş Geldiniz</h3>
                      <p className="text-[13.5px] leading-relaxed text-gray-600 mb-4">Davetlilerin size baskı talebi gönderebilmesi için önce lütfen yapabildiğiniz baskı boylarını ve fiyatlarını oluşturun.</p>
                      {/* 2 sayfa göstergesi */}
                      <div className="flex items-center justify-center gap-2 mb-5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#C8686E' }} />
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(200,104,110,0.25)' }} />
                      </div>
                      <button onClick={() => setSetupStep(1)} className="w-full py-3 rounded-xl font-semibold text-white" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}>Devam Et</button>
                    </div>
                  </div>
                  {/* Adım 1 — boy/fiyat */}
                  <div className="w-full flex-shrink-0 p-7">
                    <button onClick={() => setSetupStep(0)} className="text-[13px] text-gray-400 mb-3 flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>Geri</button>
                    <h3 className="text-[17px] font-bold text-gray-900 mb-3">En az bir baskı boyutu ekleyin</h3>
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
                      <button onClick={addSize} disabled={addingSize || !newSizeLabel.trim() || newSizePrice === ''} className="px-3 min-w-[54px] flex items-center justify-center rounded-lg font-semibold text-white text-[13px] disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}>{addingSize ? <span className="w-3.5 h-3.5 rounded-full border-2 border-white/50 border-t-white animate-spin" /> : 'Ekle'}</button>
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
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(200,104,110,0.25)' }} />
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#C8686E' }} />
                    </div>
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

      {/* Sabit rose headset — Nikahım Destek panelini açar (ana sayfadaki "?" ile aynı konsept) */}
      <button onClick={() => setShowSupport(true)} aria-label="Destek" className="fixed z-[70] bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105" style={{ background: 'linear-gradient(135deg, #D88488, #C8686E)', boxShadow: '0 14px 34px rgba(200,104,110,0.35), inset 0 1px 0 rgba(255,255,255,0.3)' }}>
        <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14v-2a8 8 0 0116 0v2" /><path d="M4 14h3v6H4v-6zM17 14h3v6h-3v-6z" /><path d="M17 20v.5a2.5 2.5 0 01-2.5 2.5H12" /></svg>
      </button>

      {/* Nikahım Destek paneli — sağdan kayar */}
      {showSupport && (
        <div className="fixed inset-0 z-[80]" onClick={() => setShowSupport(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />
          <div className="absolute top-0 right-0 h-full w-full sm:max-w-[400px] flex flex-col" style={{ background: '#FFFCFA', boxShadow: '-20px 0 60px rgba(0,0,0,0.18)' }} onClick={(e) => e.stopPropagation()}>
            {/* Header — ana sayfa ile birebir */}
            <div className="px-7 pt-6 pb-6 flex-shrink-0 relative" style={{ borderBottom: '1px solid rgba(232,180,170,0.18)' }}>
              <button onClick={() => setShowSupport(false)} className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="#9F4F58" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <Image src="/navbar-text.png" alt="Nikahım" width={320} height={96} className="h-[38px] w-auto object-contain -ml-0.5 -mb-1" />
              <h2 className="font-bold text-[24px] leading-[1.15]" style={{ fontFamily: 'var(--font-playfair)', color: '#1F1F1F' }}>Destek</h2>
              <p className="mt-2 text-[13px]" style={{ color: '#6B5A5A' }}>Aklınızdaki tüm sorular için buradayız</p>
            </div>

            {!supportFaqView ? (
              <div className="flex-1 overflow-y-auto px-5 pt-5 pb-4 space-y-2.5">
                {/* Canlı Destek */}
                <button onClick={() => { setShowSupport(false); setTimeout(() => window.dispatchEvent(new CustomEvent('nikahim:open-chat')), 200); }} className="w-full flex items-center gap-3.5 p-4 rounded-2xl text-left" style={{ background: 'linear-gradient(180deg, rgba(255,251,247,0.85), rgba(253,243,243,0.80))', border: '1px solid rgba(232,180,170,0.25)', boxShadow: '0 2px 10px rgba(200,104,110,0.06)' }}>
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(232,165,169,0.35), rgba(200,104,110,0.20))' }}>
                    <svg className="w-5 h-5" fill="none" stroke="#9F4F58" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 01-12.5 7.5L3 21l1.9-5.7A8.5 8.5 0 1121 11.5z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[14.5px]" style={{ color: '#1F1F1F' }}>Canlı Destek</p>
                      {/* 3 destek asistanı — başlığın sağında üst üste */}
                      <span className="flex items-center">
                        {['/asistan-elif.png', '/asistan-tugce.png', '/asistan-yusuf.png'].map((im, i) => (
                          <span key={im} className="w-6 h-6 rounded-full overflow-hidden bg-white" style={{ border: '1.5px solid #fff', marginLeft: i === 0 ? 0 : -8, boxShadow: '0 1px 4px rgba(200,104,110,0.2)', zIndex: 3 - i }}>
                            <img src={im} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                          </span>
                        ))}
                      </span>
                    </div>
                    <p className="text-[12px] mt-0.5" style={{ color: '#8A7878' }}>Destek Asistanlarımız ile anlık sohbet</p>
                    <p className="text-[11px] mt-1 inline-flex items-center gap-1" style={{ color: '#3FB95A' }}><span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Çevrim içi</p>
                  </div>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#B5A8A8" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
                {/* WhatsApp */}
                <a href="https://wa.me/905366919361?text=Merhaba%20%21%20Nikah%C4%B1m%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-3.5 p-4 rounded-2xl text-left" style={{ background: 'linear-gradient(180deg, rgba(255,251,247,0.85), rgba(253,243,243,0.80))', border: '1px solid rgba(232,180,170,0.25)', boxShadow: '0 2px 10px rgba(200,104,110,0.06)' }}>
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(170,225,180,0.45), rgba(60,180,80,0.18))' }}>
                    <svg className="w-5 h-5" fill="#1E8E3E" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14.5px]" style={{ color: '#1F1F1F' }}>WhatsApp</p>
                    <p className="text-[12px] mt-0.5" style={{ color: '#8A7878' }}>Mesaj bırakın, ekibimiz sizinle iletişime geçsin.</p>
                    <p className="text-[11px] mt-1 inline-flex items-center gap-1" style={{ color: '#1E8E3E' }}><span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Çevrim içi</p>
                  </div>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#B5A8A8" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </a>
                {/* E-posta */}
                <a href="mailto:destek@nikahim.com?subject=Fotoğrafçı%20Destek" className="w-full flex items-center gap-3.5 p-4 rounded-2xl text-left" style={{ background: 'linear-gradient(180deg, rgba(255,251,247,0.85), rgba(253,243,243,0.80))', border: '1px solid rgba(232,180,170,0.25)', boxShadow: '0 2px 10px rgba(200,104,110,0.06)' }}>
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(245,225,200,0.40), rgba(212,168,82,0.20))' }}>
                    <svg className="w-5 h-5" fill="none" stroke="#A0782E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 7l9 6 9-6" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14.5px]" style={{ color: '#1F1F1F' }}>E-posta</p>
                    <p className="text-[12px] mt-0.5" style={{ color: '#8A7878' }}>Sorularınızı e-posta yoluyla iletebilirsiniz.</p>
                    <p className="text-[11px] mt-1 font-medium" style={{ color: '#A0782E' }}>destek@nikahim.com</p>
                  </div>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#B5A8A8" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </a>
                {/* SSS */}
                <button onClick={() => setSupportFaqView(true)} className="w-full flex items-center gap-3.5 p-4 rounded-2xl text-left" style={{ background: 'linear-gradient(180deg, rgba(255,251,247,0.85), rgba(253,243,243,0.80))', border: '1px solid rgba(232,180,170,0.25)', boxShadow: '0 2px 10px rgba(200,104,110,0.06)' }}>
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(220,210,235,0.45), rgba(160,140,200,0.18))' }}>
                    <svg className="w-5 h-5" fill="none" stroke="#6B5BA5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" strokeWidth="1.5" /><path d="M9.5 9c0-1.5 1.2-2.5 2.5-2.5s2.5 1 2.5 2.5c0 1.2-1 1.8-1.8 2.2-0.5 0.3-0.7 0.7-0.7 1.3" /><circle cx="12" cy="16.5" r="0.6" fill="#6B5BA5" stroke="none" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14.5px]" style={{ color: '#1F1F1F' }}>Sık Sorulan Sorular</p>
                    <p className="text-[12px] mt-0.5" style={{ color: '#8A7878' }}>En çok sorulan sorulara göz atın</p>
                  </div>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#B5A8A8" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 pt-5 pb-6">
                <button onClick={() => { setSupportFaqView(false); setOpenFaq(null); setFaqQuery(''); }} className="inline-flex items-center gap-1.5 mb-4 text-[12.5px] font-medium px-3 py-1.5 rounded-full" style={{ color: '#9F4F58', background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(232,180,170,0.30)' }}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  Destek menüsü
                </button>
                <h3 className="font-bold text-[20px] mb-3" style={{ fontFamily: 'var(--font-playfair)', color: '#1F1F1F' }}>Sık Sorulan Sorular</h3>
                <div className="relative mb-4">
                  <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>
                  <input value={faqQuery} onChange={(e) => setFaqQuery(e.target.value)} placeholder="Sorunuzu arayın…" className="w-full pl-10 pr-4 py-2.5 rounded-xl border outline-none text-[13.5px] text-gray-900" style={{ borderColor: 'rgba(0,0,0,0.10)' }} />
                </div>
                {(() => {
                  const ql = faqQuery.trim().toLowerCase();
                  const items = fullFaqCategories.flatMap((c) => c.items.map((it) => ({ ...it, cat: c.title })));
                  const filtered = ql ? items.filter((it) => (it.q + ' ' + it.a + ' ' + (it.keywords || []).join(' ')).toLowerCase().includes(ql)) : items;
                  if (filtered.length === 0) return <p className="text-center text-[13px] text-gray-400 py-8">Sonuç bulunamadı. Canlı Destek’ten yazabilirsiniz.</p>;
                  return (
                    <div className="flex flex-col gap-2">
                      {filtered.slice(0, 40).map((it, i) => {
                        const id = `${it.cat}-${i}`;
                        const isOpen = openFaq === id;
                        return (
                          <div key={id} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(200,104,110,0.12)' }}>
                            <button onClick={() => setOpenFaq(isOpen ? null : id)} className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left">
                              <span className="text-[13.5px] font-semibold text-gray-800">{it.q}</span>
                              <svg className="w-4 h-4 flex-shrink-0 transition-transform" style={{ color: '#C8686E', transform: isOpen ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            {isOpen && <div className="px-4 pb-3.5 text-[12.5px] leading-relaxed text-gray-600">{it.a}</div>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
            <p className="flex-shrink-0 text-center py-4 text-[12.5px] font-medium" style={{ color: '#B85258', borderTop: '1px solid rgba(232,180,170,0.18)' }}>Nikahım ekibi her zaman yanınızda ❤️</p>
          </div>
        </div>
      )}
    </main>
  );
}
