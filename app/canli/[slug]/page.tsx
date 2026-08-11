"use client";

import { supabase } from '@/lib/supabase';
import Image from "next/image";
import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ApiVideoPlayer from '@/components/ApiVideoPlayer';
import VideoRecorder from '@/components/VideoRecorder';
import VoiceRecorder from '@/components/VoiceRecorder';
import { fullFaqCategories } from '@/lib/faq-data';

const SUPABASE_URL = 'https://haeifluvvazdealsofle.supabase.co';

// Supabase storage transformation: dosya orijinal kalır, CDN küçültülmüş versiyonu servis eder.
// width = görüntülenecek boyut (retina için biraz büyük tut, ör 2x), quality 80 yeterli.
const optimizeImg = (url: string | null | undefined, width: number, quality = 80): string => {
  if (!url) return '';
  if (!url.includes('/storage/v1/object/public/')) return url;
  // resize=cover'ı kaldırdık — sadece width, orijinal en-boy oranı korunur
  return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + `?width=${width}&quality=${quality}`;
};

// Müzik dosyaları mapping
const MUSIC_FILES: Record<string, string> = {
  canon_in_d: 'canon_in_d.mp3',
  wedding_march: 'wedding_march.mp3',
  air_on_g_string: 'air_on_g_string.mp3',
  clair_de_lune: 'clair_de_lune.mp3',
  joy_of_travel: 'joy_of_travel.mp3',
  vivaldi_spring: 'vivaldi_spring.mp3',
  moonlight_sonata: 'moonlight_sonata.mp3',
  fur_elise: 'fur_elise.mp3',
  swan_lake: 'swan_lake.mp3',
};

interface Event {
  id: string;
  groom_first_name: string;
  groom_last_name: string;
  groom_full_name: string;
  bride_first_name: string;
  bride_last_name: string;
  bride_full_name: string;
  groom_father_name: string;
  groom_mother_name: string;
  bride_father_name: string;
  bride_mother_name: string;
  event_date: string;
  event_time: string;
  couple_photo_url: string;
  bank_iban: string;
  bank_holder_name: string;
  status: string;
  qr_codes?: Record<string, string>;
  event_type: string;
  background_music?: string;
  gold_prices_locked?: {
    gram: number;
    ceyrek: number;
    yarim: number;
    tam: number;
    ata: number;
  } | null;
  package_id?: string;
  hide_gold_names?: boolean;
  payment_methods_enabled?: {
    crypto?: boolean;
    wallet_tl?: string;
    wallet_usdt?: string;
    wallet_xauusdt?: string;
    bank_name?: string | null;
  };
  recording_urls?: string[];
  photographer_access_enabled?: boolean;
}

interface Package {
  id: string;
  name_tr: string;
  max_viewers: number;
}

interface Message {
  id: number;
  name: string;
  text: string;
  time: string;
}

interface GoldOption {
  id: string;
  name: string;
  price: number;
  image: string;
}

// Hafif sıkıştırma (baskı dostu): çözünürlük korunur, sadece 4000px üstü kısılır + JPEG q0.9.
async function compressImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const maxDim = 4000;
    let width = bitmap.width, height = bitmap.height;
    if (Math.max(width, height) > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale); height = Math.round(height * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
    return blob || file;
  } catch {
    return file;
  }
}

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug;

  const [event, setEvent] = useState<Event | null>(null);
  const [eventPackage, setEventPackage] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewerName, setViewerName] = useState("");
  // Realtime subscription closure'ları için stale-free ref (kendi mesajlarımı skip etmek üzere)
  const viewerNameRef = useRef("");
  useEffect(() => { viewerNameRef.current = viewerName; }, [viewerName]);
  const [viewerFirstName, setViewerFirstName] = useState("");
  const [viewerLastName, setViewerLastName] = useState("");
  const [isNameEntered, setIsNameEntered] = useState(false);
  // Demo (örnek) event flag + tanıtım toast'ları
  const [isDemoEvent, setIsDemoEvent] = useState(false);
  const [showDemoToast1, setShowDemoToast1] = useState(false);
  const [showDemoToast2, setShowDemoToast2] = useState(false);
  const [demoBlockMsg, setDemoBlockMsg] = useState<string | null>(null);
  const showDemoBlock = () => {
    setDemoBlockMsg('Bu Örnek sayfa olduğundan işleminizi gerçekleştiremiyorum');
    setTimeout(() => setDemoBlockMsg(null), 3500);
  };
  // Demo block modal'ı — main return + welcome return iki yerde de render edilir
  const renderDemoBlock = () => {
    if (!demoBlockMsg) return null;
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto max-w-sm w-full rounded-2xl px-5 py-4 text-center animate-fade-in"
             style={{
               background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF9F8 100%)',
               boxShadow: '0 24px 60px rgba(60,40,40,0.28), 0 6px 18px rgba(200,104,110,0.18), inset 0 1px 0 rgba(255,255,255,0.95)',
               border: '1px solid rgba(232,180,170,0.5)',
             }}>
          <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,104,110,0.10)' }}>
            <svg className="w-6 h-6" fill="none" stroke="#C8686E" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <p className="text-[13.5px] lg:text-[14px] leading-snug font-semibold" style={{ color: '#4B5563', fontFamily: 'var(--font-geist-sans), Inter, sans-serif' }}>
            {demoBlockMsg}
          </p>
        </div>
      </div>
    );
  };
  // Toast 2 retry: kullanıcı X ile kapatırsa 30sn sonra tekrar, ikincide 60sn, toplam 3 kez
  const demoToast2CountRef = useRef(0);
  const demoToast2TimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Toast sürükleme — uzun basıp başka yere taşınabilir
  const [demoToastOffset, setDemoToastOffset] = useState({ x: 0, y: 0 });
  const demoDragRef = useRef<{ startX: number; startY: number; offX: number; offY: number; dragging: boolean }>({ startX: 0, startY: 0, offX: 0, offY: 0, dragging: false });
  useEffect(() => {
    // Her gizlenince pozisyonu sıfırla; bir sonraki çıkışta gene orijinal yerinden başlar
    if (!showDemoToast1 && !showDemoToast2) setDemoToastOffset({ x: 0, y: 0 });
  }, [showDemoToast1, showDemoToast2]);
  // Toast'a parmak/mouse ile basıp sürükleme — global pointermove/up dinleyicileri
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!demoDragRef.current.dragging) return;
      const dx = e.clientX - demoDragRef.current.startX;
      const dy = e.clientY - demoDragRef.current.startY;
      setDemoToastOffset({ x: demoDragRef.current.offX + dx, y: demoDragRef.current.offY + dy });
    };
    const onUp = () => { demoDragRef.current.dragging = false; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);
  const closeDemoToast2WithRetry = () => {
    setShowDemoToast2(false);
    demoToast2CountRef.current += 1;
    if (demoToast2CountRef.current >= 3) return;  // 3 kez gösterildi, dur
    const delay = demoToast2CountRef.current === 1 ? 30000 : 60000;
    if (demoToast2TimerRef.current) clearTimeout(demoToast2TimerRef.current);
    demoToast2TimerRef.current = setTimeout(() => setShowDemoToast2(true), delay);
  };
  const closeDemoToast2NoRetry = () => {
    setShowDemoToast2(false);
    if (demoToast2TimerRef.current) clearTimeout(demoToast2TimerRef.current);
    demoToast2CountRef.current = 3;  // user took action, retry gerekmez
  };
  const [isReturningViewer, setIsReturningViewer] = useState(false);
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedGold, setSelectedGold] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showEndedScreen, setShowEndedScreen] = useState(false);
  const [endedCountdown, setEndedCountdown] = useState(10);
  const [viewerCount, setViewerCount] = useState(0);
  // Yayın aktif iken Supabase Presence ile gerçekten izleyen kişi sayısı
  const [liveViewerCount, setLiveViewerCount] = useState(0);
  // Gizli sert kapasite — api.video maliyet koruması (paket-bağımsız, hepsi için 200)
  const [viewerLimitReached, setViewerLimitReached] = useState(false);
  const [streamData, setStreamData] = useState<{
    status: string;
    playbackId: string | null;
    videoId?: string | null;
    isTest: boolean;
  } | null>(null);
  const [prevStreamStatus, setPrevStreamStatus] = useState<string | null>(null);
  // Bitmiş yayında izlenen kayıt segmenti (çoklu video → Bölüm 1/2/...)
  const [recordingSeg, setRecordingSeg] = useState(0);
  const [customAmount, setCustomAmount] = useState("");
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [showReturningModal, setShowReturningModal] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [photoLightboxIndex, setPhotoLightboxIndex] = useState<number | null>(null);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [photoUploaderName, setPhotoUploaderName] = useState('');
  const [photoUploadFiles, setPhotoUploadFiles] = useState<File[]>([]);
  const [photoUploadPreviews, setPhotoUploadPreviews] = useState<string[]>([]);
  const [uploadingGuestPhotos, setUploadingGuestPhotos] = useState(false);
  const [photoUploadSuccess, setPhotoUploadSuccess] = useState(false);
  const [guestUploadProgress, setGuestUploadProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  // Misafir kendi yüklediği fotoğraflar + baskı (fotoğrafçı ekosistemi)
  const [guestOwnPhotos, setGuestOwnPhotos] = useState<{ id: string; photo_url: string; photo_no: number | null; status: string }[]>([]);
  const [loadingOwnPhotos, setLoadingOwnPhotos] = useState(false);
  const [photoTab, setPhotoTab] = useState<'uploads' | 'add'>('add');
  const [printSizes, setPrintSizes] = useState<{ id: string; size_label: string; price_tl: number }[]>([]);
  const [printPhoto, setPrintPhoto] = useState<{ id: string; photo_url: string; photo_no: number | null } | null>(null);
  const [printSizeId, setPrintSizeId] = useState<string | null>(null);
  const [printQty, setPrintQty] = useState(1);
  const [printSubmitting, setPrintSubmitting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [printedIds, setPrintedIds] = useState<string[]>([]);
  const [showPhotogGate, setShowPhotogGate] = useState(false);
  // Fotoğraf Paylaş popup'ı açıldığında misafirin kendi yüklemelerini + baskı boylarını getir
  useEffect(() => {
    if (showPhotoUpload) {
      const n = (photoUploaderName || viewerName).trim();
      if (n) loadGuestOwnPhotos(n);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPhotoUpload]);
  const [slideshowPhotos, setSlideshowPhotos] = useState<string[]>([]);
  const [goldHistory, setGoldHistory] = useState<{ name: string; type: string; anonymous?: boolean }[]>([]);
  const [anonymousGold, setAnonymousGold] = useState(false);
  const [goldDisplayIndex, setGoldDisplayIndex] = useState(0);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [videoNotification, setVideoNotification] = useState<{ text: string; type: 'message' | 'join' | 'gold' | 'video' | 'voice' } | null>(null);
  const [videoTebrikCount, setVideoTebrikCount] = useState(0);
  const [sesliTebrikCount, setSesliTebrikCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'chat' | 'gold' | 'video'>('chat');
  const [showAppPopup, setShowAppPopup] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRotationPrompt, setShowRotationPrompt] = useState(false);
  const [showPersistentRotation, setShowPersistentRotation] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'altin' | 'tebrik' | 'album'>('altin');
  const [showConciergeSheet, setShowConciergeSheet] = useState(false);
  const [faqView, setFaqView] = useState(false);
  const [openFaqIdx, setOpenFaqIdx] = useState<string | null>(null);
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  // WhatsApp online göstergesi — İstanbul saatine göre 08:00-20:00 arası "Çevrim içi"
  const [waOnline, setWaOnline] = useState(false);
  useEffect(() => {
    const check = () => {
      const istHour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Europe/Istanbul', hour: 'numeric', hour12: false }), 10);
      setWaOnline(istHour >= 8 && istHour < 20);
    };
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, []);
  // Ana sayfa ConciergeSheet ile birebir aynı arama mantığı
  const filteredFaqCategories = useMemo(() => {
    const HIDDEN_CATEGORIES = ['Nikahım Çarşı'];
    const visible = fullFaqCategories.filter(c => !HIDDEN_CATEGORIES.includes(c.title));
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
    const tokens = query.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return visible;
    return visible
      .map(cat => ({
        ...cat,
        items: cat.items.filter(item => {
          const haystack = normalize(item.q + ' ' + item.a + ' ' + (item.keywords?.join(' ') || ''));
          return tokens.every(t => haystack.includes(t));
        }),
      }))
      .filter(cat => cat.items.length > 0);
  }, [faqSearchQuery]);
  const totalFaqResults = useMemo(
    () => filteredFaqCategories.reduce((sum, cat) => sum + cat.items.length, 0),
    [filteredFaqCategories]
  );
  // Foto like state — counts per photoUrl + my liked set
  const [photoLikes, setPhotoLikes] = useState<Record<string, number>>({});
  const [likedByMe, setLikedByMe] = useState<Set<string>>(new Set());
  // FAQ — ortak kaynak (ana sayfa ConciergeSheet ile aynı içerik). Flat liste olarak gösterilir.
  const conciergeFaqs = fullFaqCategories.flatMap(c => c.items);
  const [fsTebrikMenu, setFsTebrikMenu] = useState(false);
  const [fsTebrikPanel, setFsTebrikPanel] = useState<'video' | 'voice' | 'message' | null>(null);
  const [fsGoldMode, setFsGoldMode] = useState(false);
  const prevMusicVolumeRef = useRef<number | null>(null);
  const [paymentStep, setPaymentStep] = useState<1 | 2 | 3>(1);
  const [confirmTimer, setConfirmTimer] = useState(10);
  const [liveGoldPrices, setLiveGoldPrices] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<'iban' | 'qr' | 'crypto' | null>(null);
  const pendingPaymentIdRef = useRef<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lightboxTouchStartRef = useRef<number>(0);
  // Like aksiyonu sonrasi 3sn boyunca realtime event'i ignore et (kendi optimistic update'imiz cifte saymasin)
  const recentLikeByMeRef = useRef<Set<string>>(new Set());

  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Müzik kontrolü - bekleme ekranında çal, yayın başlayınca durdur
  // Fetch live gold prices from free API
  useEffect(() => {
    const parsePrice = (val: string): number => {
      const num = parseFloat(val.replace(/\./g, '').replace(',', '.'));
      return Math.ceil(num / 10) * 10;
    };
    const fetchPrices = async () => {
      try {
        const res = await fetch('https://finans.truncgil.com/today.json');
        const data = await res.json();
        const prices: Record<string, number> = {};
        if (data['gram-altin']?.Satış) prices.gram = parsePrice(data['gram-altin'].Satış);
        if (data['ceyrek-altin']?.Satış) prices.ceyrek = parsePrice(data['ceyrek-altin'].Satış);
        if (data['yarim-altin']?.Satış) prices.yarim = parsePrice(data['yarim-altin'].Satış);
        if (data['tam-altin']?.Satış) prices.tam = parsePrice(data['tam-altin'].Satış);
        if (data['ata-altin']?.Satış) prices.ata = parsePrice(data['ata-altin'].Satış);
        setLiveGoldPrices(prices);
      } catch (err) { console.log('Gold prices error:', err); }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 300000); // refresh every 5 min
    return () => clearInterval(interval);
  }, []);

  // Albüm fotoları preload — sayfa açılınca hepsini arka planda indir, tıklamada anında açılsın
  useEffect(() => {
    if (slideshowPhotos.length === 0) return;
    const images: HTMLImageElement[] = [];
    slideshowPhotos.forEach((url) => {
      const img = new window.Image();
      img.src = url;
      images.push(img);
    });
    return () => { images.forEach(img => { img.src = ''; }); };
  }, [slideshowPhotos]);

  // Demo event: returning user akışı atlansın → her ziyarette ilk welcome modal'ı göster
  // Diğer düğünler değişmez, cache'den gelen kullanıcı hâlâ "Tekrar Hoş Geldiniz" modalını görür
  useEffect(() => {
    if (!isDemoEvent) return;
    setIsReturningViewer(false);
    setShowReturningModal(false);
    setIsNameEntered(false);
    // Toast 1: welcome modal'da 5sn sonra
    const t1 = setTimeout(() => setShowDemoToast1(true), 5000);
    return () => { clearTimeout(t1); };
  }, [isDemoEvent]);

  // Toast 2: kullanıcı yayına devam ettikten 15sn sonra (sayfa load'undan değil)
  useEffect(() => {
    if (!isDemoEvent || !isNameEntered) return;
    setShowDemoToast1(false);
    // İsim girildiyse onunla, yoksa "Bir davetli" anonim bildirimi göster
    const joinText = viewerName?.trim() ? `${viewerName.trim()} nikaha katıldı!` : 'Bir davetli nikaha katıldı!';
    setVideoNotification({ text: joinText, type: 'join' });
    const tNotif = setTimeout(() => setVideoNotification(null), 10000);
    const t2 = setTimeout(() => setShowDemoToast2(true), 15000);
    return () => { clearTimeout(t2); clearTimeout(tNotif); };
  }, [isDemoEvent, isNameEntered]);

  // Demo tanıtım toast'ı — hem welcome modal'da (Toast 1) hem stream view'da (Toast 2) aynı render
  // Misafirin "Yüklediklerim" sekmesi — kendi fotoğrafları + Baskıya Gönder (fotoğrafçı izni kapısı)
  const renderMyUploads = () => {
    const photogOn = !!event?.photographer_access_enabled;
    if (loadingOwnPhotos) {
      return <div className="py-10 text-center text-sm text-gray-400">Fotoğraflarınız yükleniyor…</div>;
    }
    if (guestOwnPhotos.length === 0) {
      return (
        <div className="py-10 text-center">
          <div className="text-4xl mb-2">📷</div>
          <p className="text-sm text-gray-500">Henüz fotoğraf yüklemediniz.</p>
          <button onClick={() => setPhotoTab('add')} className="mt-3 text-[13px] font-semibold" style={{ color: '#C8686E' }}>Fotoğraf ekle →</button>
        </div>
      );
    }
    const statusMap: Record<string, { t: string; bg: string; c: string }> = {
      approved: { t: 'Albüme eklendi', bg: '#EAF7EF', c: '#318052' },
      pending: { t: 'Onay bekliyor', bg: '#FDF3E1', c: '#B8892E' },
      rejected: { t: 'Eklenmedi', bg: '#F3F0F0', c: '#8A7E7E' },
    };
    return (
      <div className="grid grid-cols-2 gap-3">
        {guestOwnPhotos.map((p) => {
          const st = statusMap[p.status] || statusMap.pending;
          const isPrinted = printedIds.includes(p.id);
          return (
            <div key={p.id} className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(200,104,110,0.14)', background: '#fff' }}>
              <div className="relative aspect-square bg-gray-50">
                <img src={optimizeImg(p.photo_url, 400)} alt="" className="w-full h-full object-cover" />
                <span className="absolute top-2 left-2 px-2 py-[3px] rounded-full text-[10px] font-bold" style={{ background: st.bg, color: st.c }}>{st.t}</span>
                {p.photo_no != null && (
                  <span className="absolute top-2 right-2 px-1.5 py-[2px] rounded-md text-[10px] font-bold text-white" style={{ background: 'rgba(0,0,0,0.45)' }}>#{p.photo_no}</span>
                )}
              </div>
              <button
                onClick={() => (isPrinted ? null : openPrintFor(p))}
                disabled={isPrinted}
                className="w-full py-2.5 flex items-center justify-center gap-1.5 text-[12.5px] font-semibold transition-colors"
                style={{
                  color: isPrinted ? '#318052' : photogOn ? '#C8686E' : '#A79C9C',
                  background: isPrinted ? '#EAF7EF' : photogOn ? 'rgba(200,104,110,0.06)' : '#F3F0F0',
                  cursor: isPrinted ? 'default' : 'pointer',
                }}
              >
                {isPrinted ? (
                  <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Baskı listesinde</>
                ) : (
                  <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659" /></svg>Baskıya Gönder</>
                )}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  // Baskı onay modalı — boy seç + adet + toplam + fotoğrafçıya gönder
  const renderPrintModal = () => {
    if (!printPhoto) return null;
    const size = printSizes.find((s) => s.id === printSizeId);
    const total = size ? size.price_tl * printQty : 0;
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
        <div className="rounded-3xl max-w-sm w-full overflow-hidden relative" style={{ background: 'linear-gradient(165deg, #FFFCF9, #FAF5EE)', boxShadow: '0 25px 80px rgba(0,0,0,0.18)', border: '1px solid rgba(200,104,110,0.12)' }}>
          {printSuccess ? (
            <div className="p-9 text-center">
              <div className="text-5xl mb-3">🖨️</div>
              <h3 className="text-lg font-bold text-gray-900 mb-1.5">Baskı İsteğiniz İletildi</h3>
              <p className="text-[13px] text-gray-500 mb-6 leading-snug">Fotoğrafçı baskınızı hazırlayacak. Ücreti fotoğrafçıya etkinlik yerinde ödeyeceksiniz.</p>
              <button onClick={() => { setPrintPhoto(null); setPrintSuccess(false); }} className="text-white px-8 py-3 rounded-xl font-semibold" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}>Tamam</button>
            </div>
          ) : (
            <div className="p-6">
              <button onClick={() => setPrintPhoto(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.06)', color: '#999' }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="flex items-center gap-3 mb-5">
                <img src={optimizeImg(printPhoto.photo_url, 200)} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                <div>
                  <h3 className="text-[17px] font-bold text-gray-900">Baskıya Gönder</h3>
                  <p className="text-[12.5px] text-gray-400">{printPhoto.photo_no != null ? `#${printPhoto.photo_no} numaralı fotoğraf` : 'Fotoğrafınız'}</p>
                </div>
              </div>

              {printSizes.length === 0 ? (
                <p className="text-[13px] text-gray-500 py-4 text-center">Fotoğrafçı henüz baskı boyutlarını eklemedi.</p>
              ) : (
                <>
                  <label className="block text-[12.5px] font-semibold text-gray-500 mb-2">Baskı Boyutu</label>
                  <div className="flex flex-col gap-2 mb-4">
                    {printSizes.map((s) => {
                      const sel = s.id === printSizeId;
                      return (
                        <button key={s.id} onClick={() => setPrintSizeId(s.id)} className="flex items-center justify-between px-4 py-3 rounded-xl transition-all" style={{ background: sel ? 'rgba(200,104,110,0.08)' : '#fff', border: `1.5px solid ${sel ? '#C8686E' : 'rgba(0,0,0,0.08)'}` }}>
                          <span className="flex items-center gap-2.5">
                            <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ border: `2px solid ${sel ? '#C8686E' : '#CBC3C3'}`, background: sel ? '#C8686E' : 'transparent' }}>
                              {sel && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </span>
                            <span className="text-[14px] font-semibold text-gray-800">{s.size_label}</span>
                          </span>
                          <span className="text-[14px] font-bold" style={{ color: '#C8686E' }}>{s.price_tl}₺</span>
                        </button>
                      );
                    })}
                  </div>

                  <label className="block text-[12.5px] font-semibold text-gray-500 mb-2">Adet</label>
                  <div className="flex items-center gap-4 mb-5">
                    <button onClick={() => setPrintQty((q) => Math.max(1, q - 1))} className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold" style={{ background: 'rgba(200,104,110,0.08)', color: '#C8686E' }}>−</button>
                    <span className="text-[18px] font-bold text-gray-900 w-6 text-center">{printQty}</span>
                    <button onClick={() => setPrintQty((q) => Math.min(50, q + 1))} className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold" style={{ background: 'rgba(200,104,110,0.08)', color: '#C8686E' }}>+</button>
                  </div>

                  <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-4" style={{ background: 'rgba(200,104,110,0.06)' }}>
                    <span className="text-[13px] text-gray-600">{printQty} adet × {size?.price_tl}₺</span>
                    <span className="text-[17px] font-bold" style={{ color: '#B85258' }}>{total}₺</span>
                  </div>
                  <p className="text-[12px] text-gray-400 text-center mb-4 leading-snug">Ücret fotoğrafçıya etkinlik yerinde ödenir. Onaylıyor musunuz?</p>

                  <div className="flex gap-3">
                    <button onClick={() => setPrintPhoto(null)} className="flex-1 py-3 rounded-xl font-semibold text-[14px]" style={{ background: '#F3EEEE', color: '#8A7E7E' }}>Vazgeç</button>
                    <button onClick={submitPrint} disabled={printSubmitting || !printSizeId} className="flex-1 py-3 rounded-xl font-semibold text-[14px] text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}>{printSubmitting ? 'Gönderiliyor…' : 'Onayla'}</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Fotoğrafçı izni kapalı uyarısı (gri buton tıklanınca)
  const renderPhotogGate = () => {
    if (!showPhotogGate) return null;
    const tur = event?.event_type === 'dugun' ? 'düğün' : 'nikah';
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }} onClick={() => setShowPhotogGate(false)}>
        <div className="rounded-3xl p-7 max-w-xs w-full text-center relative" style={{ background: '#FFFCF9', boxShadow: '0 25px 70px rgba(0,0,0,0.18)' }} onClick={(e) => e.stopPropagation()}>
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: '#F3F0F0' }}>
            <svg className="w-7 h-7" fill="none" stroke="#8A7E7E" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
          </div>
          <h3 className="text-[16px] font-bold text-gray-900 mb-1.5">Baskı Hizmeti Kapalı</h3>
          <p className="text-[13px] text-gray-500 mb-6 leading-snug">Bu hizmet bu {tur} için aktif değil. Baskı almak isterseniz çiftle iletişime geçebilirsiniz.</p>
          <button onClick={() => setShowPhotogGate(false)} className="w-full py-3 rounded-xl font-semibold text-[14px] text-white" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}>Anladım</button>
        </div>
      </div>
    );
  };

  // Birleşik Fotoğraf Paylaş popup'ı — "Fotoğraf Ekle" + "Yüklediklerim" sekmeleri (3 giriş ekranında ortak)
  const renderPhotoUploadPopup = () => {
    if (!showPhotoUpload) return null;
    const name = photoUploaderName || viewerName;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
        <div className="rounded-3xl max-w-md w-full overflow-hidden relative" style={{ background: 'linear-gradient(165deg, rgba(255,252,248,0.97), rgba(250,245,238,0.95))', boxShadow: '0 25px 80px rgba(0,0,0,0.15)', border: '1px solid rgba(200,104,110,0.1)' }}>
          {photoUploadSuccess ? (
            <div className="p-9 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Fotoğraflarınız Yüklendi!</h3>
              <p className="text-gray-500 text-sm mb-6">Çift onayladığında canlı yayın albümünde görünecek.</p>
              <div className="flex flex-col gap-2.5">
                <button onClick={() => { setPhotoUploadSuccess(false); setPhotoTab('uploads'); loadGuestOwnPhotos(name); }} className="text-white px-8 py-3 rounded-xl font-semibold" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}>
                  Yüklediklerimi Gör
                </button>
                <button onClick={() => { setShowPhotoUpload(false); setPhotoUploadSuccess(false); setPhotoUploadFiles([]); setPhotoUploadPreviews([]); }} className="px-8 py-2.5 rounded-xl font-semibold text-[14px]" style={{ background: '#F3EEEE', color: '#8A7E7E' }}>
                  Kapat
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="p-6 pb-0">
                <button onClick={() => { setShowPhotoUpload(false); setPhotoUploadFiles([]); setPhotoUploadPreviews([]); }} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 z-10" style={{ background: 'rgba(0,0,0,0.06)', color: '#999' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F8C4C2, #ECA1A5)', boxShadow: '0 5px 12px rgba(200,104,110,0.20)' }}>
                    <Image src="/resim-ekle-icon-3.png" alt="" width={36} height={36} className="object-contain" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Fotoğraf Paylaş</h3>
                    <p className="text-xs text-gray-400">{event?.event_type === 'dugun' ? 'Düğün' : 'Nikah'} gününden karelerinizi paylaşın</p>
                  </div>
                </div>
                {/* Sekmeler */}
                <div className="flex gap-1 p-1 rounded-xl mb-1" style={{ background: 'rgba(200,104,110,0.07)' }}>
                  {([['add', 'Fotoğraf Ekle'], ['uploads', `Yüklediklerim${guestOwnPhotos.length ? ` (${guestOwnPhotos.length})` : ''}`]] as const).map(([k, lbl]) => (
                    <button key={k} onClick={() => { setPhotoTab(k); if (k === 'uploads') loadGuestOwnPhotos(name); }} className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all" style={{ background: photoTab === k ? '#fff' : 'transparent', color: photoTab === k ? '#C8686E' : '#9A8A8A', boxShadow: photoTab === k ? '0 2px 6px rgba(200,104,110,0.12)' : 'none' }}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6 pt-3 max-h-[62vh] overflow-y-auto">
                {photoTab === 'uploads' ? renderMyUploads() : (
                  <>
                    <label className="block text-sm font-medium text-gray-600 mb-2 ml-1">Adınız Soyadınız</label>
                    <input type="text" value={photoUploaderName || viewerName} onChange={(e) => setPhotoUploaderName(e.target.value)} placeholder="" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#C8686E]/40 outline-none text-gray-900 placeholder:text-gray-400 mb-4" />
                    <label className="block text-sm font-medium text-gray-600 mb-2">Fotoğraflar (en fazla 10)</label>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {photoUploadPreviews.map((prev, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                          <img src={prev} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => { setPhotoUploadFiles(f => f.filter((_, idx) => idx !== i)); setPhotoUploadPreviews(p => p.filter((_, idx) => idx !== i)); }} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                      {photoUploadFiles.length < 10 && (
                        <label className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-[#C8686E] hover:bg-rose-50/30 transition-colors" style={{ borderColor: 'rgba(200,104,110,0.55)' }}>
                          <svg className="w-6 h-6" style={{ color: '#C8686E' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          <span className="text-[10px] mt-1" style={{ color: '#C8686E' }}>Ekle</span>
                          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                            const files = Array.from(e.target.files || []).slice(0, 10 - photoUploadFiles.length);
                            setPhotoUploadFiles(prev => [...prev, ...files]);
                            files.forEach(file => { const reader = new FileReader(); reader.onload = (ev) => setPhotoUploadPreviews(prev => [...prev, ev.target?.result as string]); reader.readAsDataURL(file); });
                          }} />
                        </label>
                      )}
                    </div>
                    {uploadingGuestPhotos && guestUploadProgress.total > 1 && (
                      <div className="mb-3 px-3.5 py-3 rounded-xl" style={{ backgroundColor: 'rgba(200,104,110,0.06)', border: '1px solid rgba(200,104,110,0.14)' }}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="#C8686E" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                          <span className="flex-1 text-[12.5px] font-semibold" style={{ color: '#9F4F58', letterSpacing: 0.2 }}>Yükleniyor · {guestUploadProgress.current}/{guestUploadProgress.total}</span>
                          <span className="text-[12.5px] font-bold" style={{ color: '#C8686E' }}>{Math.round((guestUploadProgress.current / guestUploadProgress.total) * 100)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(200,104,110,0.12)' }}>
                          <div className="h-full transition-all duration-200" style={{ width: `${(guestUploadProgress.current / guestUploadProgress.total) * 100}%`, backgroundColor: '#C8686E' }} />
                        </div>
                      </div>
                    )}
                    <button onClick={async () => {
                      if (isDemoEvent) { showDemoBlock(); return; }
                      if (!name.trim() || photoUploadFiles.length === 0 || !event) return;
                      setUploadingGuestPhotos(true);
                      setGuestUploadProgress({ current: 0, total: photoUploadFiles.length });
                      try {
                        const urls: string[] = [];
                        for (let i = 0; i < photoUploadFiles.length; i++) {
                          const file = photoUploadFiles[i];
                          const fileName = `pending/${event.id}/${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}.jpg`;
                          const _blob = await compressImage(file);
                          const { error } = await supabase.storage.from('slideshow-photos').upload(fileName, _blob, { contentType: 'image/jpeg' });
                          if (!error) { const { data: urlData } = supabase.storage.from('slideshow-photos').getPublicUrl(fileName); urls.push(urlData.publicUrl); }
                          setGuestUploadProgress({ current: i + 1, total: photoUploadFiles.length });
                        }
                        if (urls.length > 0) {
                          await supabase.from('photo_requests').insert({ event_id: event.id, sender_name: name, photo_urls: urls, status: 'pending' });
                          for (const url of urls) {
                            let photoNo: number | null = null;
                            try { const { data: no } = await supabase.rpc('next_photo_no', { p_event_id: event.id }); if (typeof no === 'number') photoNo = no; } catch {}
                            await supabase.from('guest_photos').insert({ event_id: event.id, guest_name: name.trim(), photo_url: url, photo_no: photoNo, status: 'pending' });
                          }
                        }
                        setPhotoUploadFiles([]); setPhotoUploadPreviews([]);
                        setPhotoUploadSuccess(true);
                      } catch (e) { console.error('Photo upload error:', e); }
                      setUploadingGuestPhotos(false);
                      setGuestUploadProgress({ current: 0, total: 0 });
                    }} disabled={(!isDemoEvent && !name.trim()) || photoUploadFiles.length === 0 || uploadingGuestPhotos} className="w-full disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold transition-all hover:shadow-lg" style={{ background: (isDemoEvent || name.trim()) && photoUploadFiles.length > 0 ? 'linear-gradient(135deg, #D17075, #C8686E)' : undefined }}>
                      {uploadingGuestPhotos ? (guestUploadProgress.total > 1 ? `Yükleniyor... ${guestUploadProgress.current}/${guestUploadProgress.total}` : 'Yükleniyor...') : 'Gönder'}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
        {renderPrintModal()}
        {renderPhotogGate()}
      </div>
    );
  };

  const renderDemoToast = () => {
    if (!isDemoEvent) return null;
    const show1 = showDemoToast1 && !isNameEntered;
    const show2 = showDemoToast2 && isNameEntered;
    if (!show1 && !show2) return null;
    return (
      <div className="fixed top-4 lg:top-6 left-1/2 z-[120] w-[92%] max-w-[480px] animate-fade-in"
           style={{ transform: `translate(calc(-50% + ${demoToastOffset.x}px), ${demoToastOffset.y}px)`, touchAction: 'none' }}
           onPointerDown={(e) => {
             // Buton/link/svg üzerine basıldıysa drag başlatma (tıklama olarak işlemesin)
             const t = e.target as HTMLElement;
             if (t.closest('button') || t.closest('a')) return;
             demoDragRef.current = { startX: e.clientX, startY: e.clientY, offX: demoToastOffset.x, offY: demoToastOffset.y, dragging: true };
           }}>
        <div className="relative rounded-2xl px-4 py-3 lg:px-5 lg:py-3.5 cursor-grab active:cursor-grabbing"
             style={{
               background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF9F8 100%)',
               boxShadow: '0 18px 42px rgba(80,60,40,0.16), 0 4px 12px rgba(200,104,110,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
               border: '1px solid rgba(232,180,170,0.40)',
             }}>
          <button onClick={() => { if (show1) setShowDemoToast1(false); else closeDemoToast2WithRetry(); }}
                  aria-label="Kapat"
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full transition-colors hover:bg-rose-50">
            <svg className="w-4 h-4" fill="none" stroke="#9F4F58" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18"/></svg>
          </button>

          {show1 ? (
            <div className="flex items-start gap-3 pr-7">
              <Image src="/navbar-icon.png" alt="Nikahım" width={44} height={44} className="flex-shrink-0 w-10 h-10 lg:w-11 lg:h-11 object-contain" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] lg:text-[14px] leading-snug font-semibold" style={{ color: '#4B5563', fontFamily: 'var(--font-geist-sans), Inter, sans-serif' }}>
                  Davetlileriniz ilk olarak bu sayfada karşılanır
                </p>
                <button onClick={() => { setShowDemoToast1(false); setShowPhotoUpload(false); setIsNameEntered(true); }}
                        className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] lg:text-[13px] font-semibold transition-all hover:gap-1.5"
                        style={{ color: '#C8686E', fontFamily: 'var(--font-geist-sans), Inter, sans-serif' }}>
                  Örnek Canlı Yayına Devam et
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="pr-7">
              {/* Üst: logo + metin (yatayda toast boyunca) */}
              <div className="flex items-start gap-3">
                <Image src="/navbar-icon.png" alt="Nikahım" width={44} height={44} className="flex-shrink-0 w-10 h-10 lg:w-11 lg:h-11 object-contain" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] lg:text-[14px] leading-snug font-semibold" style={{ color: '#4B5563', fontFamily: 'var(--font-geist-sans), Inter, sans-serif' }}>
                    Canlı Yayın sayfamızı beğendiniz mi?
                  </p>
                  <p className="text-[11.5px] lg:text-[12.5px] leading-snug mt-0.5" style={{ color: '#6B6B6B', fontFamily: 'var(--font-geist-sans), Inter, sans-serif' }}>
                    Dakikalar içinde kendi düğün sayfanızı oluşturabilirsiniz
                  </p>
                </div>
              </div>
              {/* Alt: sol-buton + sağ-link (swap) */}
              <div className="mt-2 flex items-center justify-between gap-3 pl-[52px] lg:pl-[56px]">
                <button onClick={() => { closeDemoToast2NoRetry(); setShowPhotoUpload(false); setShowAppPopup(true); }}
                        className="whitespace-nowrap px-3.5 py-1.5 rounded-lg text-[12px] lg:text-[12.5px] font-semibold text-white transition-transform hover:scale-[1.03] btn-press"
                        style={{ background: 'linear-gradient(135deg, #E08284, #C8686E)', boxShadow: '0 8px 22px rgba(200,104,110,0.45), 0 2px 8px rgba(160,80,90,0.25)' }}>
                  Hemen Başla
                </button>
                <button onClick={() => { closeDemoToast2NoRetry(); setShowPhotoUpload(false); router.push('/'); }}
                        className="inline-flex items-center gap-1 text-[12px] lg:text-[12.5px] font-semibold transition-all hover:gap-1.5"
                        style={{ color: '#C8686E', fontFamily: 'var(--font-geist-sans), Inter, sans-serif' }}>
                  Ana Sayfaya Dön
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };


  useEffect(() => {
    const musicId = event?.background_music;
    const isWaiting = !streamData?.status || streamData?.status === 'idle' || (streamData?.status === 'ended' && !showEndedScreen && streamData?.isTest);
    const shouldPlayMusic = isNameEntered && isWaiting && musicId && musicId !== 'none';

    if (shouldPlayMusic) {
      const musicFile = MUSIC_FILES[musicId];
      if (musicFile && !audioRef.current) {
        const audio = new Audio(`${SUPABASE_URL}/storage/v1/object/public/music/${musicFile}`);
        audio.loop = true;
        audio.volume = 0.3;
        audioRef.current = audio;
        
        audio.play().then(() => {
          setIsMusicPlaying(true);
        }).catch((err) => {
          console.log('Müzik otomatik başlatılamadı:', err);
          setIsMusicPlaying(false);
        });
      } else if (audioRef.current && audioRef.current.paused && !document.hidden) {
        audioRef.current.play().catch(() => {});
        setIsMusicPlaying(true);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsMusicPlaying(false);
      }
    }
  }, [event?.background_music, streamData?.status, isNameEntered, showEndedScreen, streamData?.isTest]);

  // Component unmount olduğunda müziği temizle
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Sayfa arka plana gidince müziği durdur, geri gelince devam et
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && audioRef.current) {
        audioRef.current.pause();
        setIsMusicPlaying(false);
      }
      // Sayfa tekrar görünür olunca müziği devam ettirme - kullanıcı manuel başlatsın
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Tebrik popup açılınca müziği kıs, kapanınca geri aç
  const isRecordingOpen = fsTebrikPanel === 'video' || fsTebrikPanel === 'voice' || showVideoRecorder || showVoiceRecorder;

  // Altın listesi döngüsü
  const [goldTransition, setGoldTransition] = useState(true);
  useEffect(() => {
    if (goldHistory.length <= 1) return;
    const interval = setInterval(() => {
      setGoldDisplayIndex(prev => {
        const next = prev + 1;
        if (next >= goldHistory.length) {
          // Sona gelince transition kapat, sıfırla
          setGoldTransition(false);
          setTimeout(() => setGoldTransition(true), 50);
          return 0;
        }
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [goldHistory.length]);

  // Sol panel yüksekliğini sağ panelle eşitle
  useEffect(() => {
    const sync = () => {
      if (rightPanelRef.current && leftPanelRef.current) {
        const rightBottom = rightPanelRef.current.getBoundingClientRect().bottom;
        const leftTop = leftPanelRef.current.getBoundingClientRect().top;
        leftPanelRef.current.style.height = `${rightBottom - leftTop}px`;
      }
    };
    sync();
    window.addEventListener('resize', sync);
    const timer = setTimeout(sync, 500);
    return () => { window.removeEventListener('resize', sync); clearTimeout(timer); };
  }, [event]);
  useEffect(() => {
    if (isRecordingOpen) {
      if (audioRef.current) {
        prevMusicVolumeRef.current = audioRef.current.volume;
        audioRef.current.volume = 0;
      }
    } else {
      if (audioRef.current && prevMusicVolumeRef.current !== null) {
        audioRef.current.volume = prevMusicVolumeRef.current;
        prevMusicVolumeRef.current = null;
      }
    }
  }, [isRecordingOpen]);

  // Fullscreen + portrait detection: ekran döndürme kilidi varsa "yan çevirin" prompt'u
  useEffect(() => {
    if (!isFullscreen) {
      setShowRotationPrompt(false);
      setShowPersistentRotation(false);
      return;
    }
    const isPortrait = () => window.innerHeight > window.innerWidth;
    let t1: ReturnType<typeof setTimeout> | null = null;
    let t2: ReturnType<typeof setTimeout> | null = null;

    const startPrompts = () => {
      if (isPortrait()) {
        setShowRotationPrompt(true);
        setShowPersistentRotation(false);
        t1 = setTimeout(() => setShowRotationPrompt(false), 3000);
        t2 = setTimeout(() => {
          if (window.innerHeight > window.innerWidth) setShowPersistentRotation(true);
        }, 5000);
      } else {
        setShowRotationPrompt(false);
        setShowPersistentRotation(false);
      }
    };

    startPrompts();

    const onOrientation = () => {
      if (t1) { clearTimeout(t1); t1 = null; }
      if (t2) { clearTimeout(t2); t2 = null; }
      startPrompts();
    };

    window.addEventListener('resize', onOrientation);
    window.addEventListener('orientationchange', onOrientation);
    return () => {
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
      window.removeEventListener('resize', onOrientation);
      window.removeEventListener('orientationchange', onOrientation);
    };
  }, [isFullscreen]);

  const toggleMusicMute = () => {
    if (audioRef.current) {
      if (musicMuted) {
        audioRef.current.volume = 0.3;
        setMusicMuted(false);
      } else {
        audioRef.current.volume = 0;
        setMusicMuted(true);
      }
    }
  };

  const startMusic = () => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setIsMusicPlaying(true);
      }).catch(() => {});
    } else if (event?.background_music && event.background_music !== 'none') {
      const musicFile = MUSIC_FILES[event.background_music];
      if (musicFile) {
        const audio = new Audio(`${SUPABASE_URL}/storage/v1/object/public/music/${musicFile}`);
        audio.loop = true;
        audio.volume = 0.3;
        audioRef.current = audio;
        audio.play().then(() => {
          setIsMusicPlaying(true);
        }).catch(() => {});
      }
    }
  };

  // Geri dönen kullanıcı devam et
  const handleReturningContinue = () => {
    setShowReturningModal(false);
    setIsNameEntered(true);

    // Müziği başlat — önce mevcut audio varsa temizle ki çift çalmasın
    if (event?.background_music && event.background_music !== 'none') {
      const musicFile = MUSIC_FILES[event.background_music];
      if (musicFile) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        const audio = new Audio(`${SUPABASE_URL}/storage/v1/object/public/music/${musicFile}`);
        audio.loop = true;
        audio.volume = 0.3;
        audioRef.current = audio;
        audio.play().then(() => {
          setIsMusicPlaying(true);
        }).catch(() => {});
      }
    }
  };

  // ---- Fotoğrafçı / baskı ekosistemi (misafir tarafı) ----
  // Misafirin kendi yüklediği fotoğrafları + çiftin belirlediği baskı boylarını yükler.
  const loadGuestOwnPhotos = async (name: string) => {
    if (!event || !name.trim()) return;
    setLoadingOwnPhotos(true);
    try {
      const [{ data: photos }, { data: sizes }, { data: prints }] = await Promise.all([
        supabase.from('guest_photos').select('id, photo_url, photo_no, status').eq('event_id', event.id).eq('guest_name', name.trim()).order('photo_no', { ascending: true }),
        supabase.from('photo_print_sizes').select('id, size_label, price_tl').eq('event_id', event.id).order('price_tl', { ascending: true }),
        supabase.from('print_requests').select('photo_url').eq('event_id', event.id).eq('guest_name', name.trim()),
      ]);
      setGuestOwnPhotos(photos || []);
      setPrintSizes(sizes || []);
      // Zaten baskıya gönderilmiş fotoğrafların url'lerini işaretle (tekrar göndermeyi engellemek için)
      setPrintedIds((photos || []).filter((p) => (prints || []).some((r) => r.photo_url === p.photo_url)).map((p) => p.id));
    } catch (e) { console.error('own photos load error', e); }
    setLoadingOwnPhotos(false);
  };

  // Baskıya Gönder — çift izin verdiyse modal açılır, vermediyse gri uyarı.
  const openPrintFor = (photo: { id: string; photo_url: string; photo_no: number | null }) => {
    if (!event?.photographer_access_enabled) { setShowPhotogGate(true); return; }
    setPrintPhoto(photo);
    setPrintSizeId(printSizes[0]?.id || null);
    setPrintQty(1);
    setPrintSuccess(false);
  };

  const submitPrint = async () => {
    if (!event || !printPhoto || !printSizeId) return;
    const size = printSizes.find((s) => s.id === printSizeId);
    if (!size) return;
    setPrintSubmitting(true);
    try {
      await supabase.from('print_requests').insert({
        event_id: event.id,
        guest_name: (photoUploaderName || viewerName).trim(),
        photo_url: printPhoto.photo_url,
        size_label: size.size_label,
        price_tl: size.price_tl,
        qty: printQty,
        status: 'pending',
      });
      setPrintedIds((ids) => [...ids, printPhoto.id]);
      setPrintSuccess(true);
    } catch (e) { console.error('print request error', e); }
    setPrintSubmitting(false);
  };

  const getGoldPrice = (type: string): number => {
    // 1. Locked prices (çift kilitlediyse)
    if (event?.gold_prices_locked) {
      const prices = event.gold_prices_locked;
      switch (type) {
        case 'gram': return prices.gram || 0;
        case 'ceyrek': return prices.ceyrek || 0;
        case 'yarim': return prices.yarim || 0;
        case 'tam': return prices.tam || 0;
        case 'ata': return prices.ata || 0;
        default: return 0;
      }
    }
    // 2. Live prices (canlı fiyatlar)
    if (liveGoldPrices[type]) return liveGoldPrices[type];
    // 3. Defaults
    const defaults: Record<string, number> = {
      gram: 6240,
      ceyrek: 9980,
      yarim: 19950,
      tam: 39780,
      ata: 41240,
    };
    return defaults[type] || 0;
  };

  const goldOptions: GoldOption[] = [
    { id: "gram_altin", name: "Gram Altın", price: getGoldPrice('gram'), image: "/altintakgram.png" },
    { id: "ceyrek_altin", name: "Çeyrek Altın", price: getGoldPrice('ceyrek'), image: "/altintak.png" },
    { id: "yarim_altin", name: "Yarım Altın", price: getGoldPrice('yarim'), image: "/altintak.png" },
    { id: "tam_altin", name: "Tam Altın", price: getGoldPrice('tam'), image: "/altintak.png" },
    { id: "nakit", name: "Özel Miktar", price: 0, image: "/altintaklira.png" },
  ];

  const emojis = ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "☺️", "😚", "😙", "🥲", "😋", "😛", "😒", "😏", "😑", "🤐", "🤔", "🤭", "🤗", "🤑", "😝", "🥳", "😎", "🤓", "🥺", "😳", "😲", "😯", "😮", "🙈", "🙉", "🙊", "💋", "💯", "💥", "💫", "✌️", "❣️", "💔", "❤️‍🔥", "❤️", "💕", "🎉", "👏", "💐", "💍", "🎊", "🙏", "💒", "✨", "🌹", "💝", "🤵", "👰"];

  useEffect(() => {
    if (!event?.id) return;

    const fetchStream = async () => {
      try {
        const response = await fetch(`/api/stream/status?eventId=${event.id}`);
        const data = await response.json();
        if (data.exists) {
          setStreamData({
            status: data.stream?.status || 'idle',
            playbackId: data.playback?.liveStreamId || null,
            videoId: data.playback?.videoId || null,
            isTest: data.stream?.isTest,
          });
        }
      } catch (error) {
        console.error('Stream fetch error:', error);
      }
    };

    fetchStream();

    const channel = supabase
      .channel(`stream-${event.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'streams',
        filter: `event_id=eq.${event.id}`
      }, (payload) => {
        const newStream = payload.new as any;
        setStreamData({
          status: newStream.status || 'idle',
          playbackId: newStream.live_stream_id || null,
          videoId: newStream.video_id || null,
          isTest: newStream.is_test,
        });
      })
      .subscribe();

    const interval = setInterval(fetchStream, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [event?.id]);

  useEffect(() => {
    if (prevStreamStatus === 'active' && streamData?.status === 'ended') {
      if (streamData?.isTest) {
        setShowEndedScreen(false);
      } else {
        setShowEndedScreen(true);
        setEndedCountdown(120);
      }
    }
    setPrevStreamStatus(streamData?.status || null);
  }, [streamData?.status, prevStreamStatus, streamData?.isTest]);

  useEffect(() => {
    if (!showEndedScreen) return;

    const interval = setInterval(() => {
      setEndedCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowEndedScreen(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showEndedScreen]);

  // Yayın bittiğinde kayıt segmentlerini birkaç kez tazele — api.video videoları
  // birkaç dakika içinde hazır olur; tüm bölümler eksiksiz görünsün
  useEffect(() => {
    if (streamData?.status !== 'ended' || streamData?.isTest) return;
    let n = 0;
    let timer: ReturnType<typeof setTimeout>;
    const refetch = async () => {
      n++;
      const { data } = await supabase
        .from('events')
        .select('recording_urls')
        .eq('event_link', slug)
        .maybeSingle();
      if (data?.recording_urls && Array.isArray(data.recording_urls) && data.recording_urls.length > 0) {
        setEvent((prev) => (prev ? { ...prev, recording_urls: data.recording_urls } : prev));
      }
      if (n < 6) timer = setTimeout(refetch, 10000); // ~1 dk boyunca
    };
    refetch();
    return () => clearTimeout(timer);
  }, [streamData?.status, streamData?.isTest, slug]);

  useEffect(() => {
    const fetchEvent = async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('event_link', slug)
        .maybeSingle();

      if (data) {
        setEvent(data);

        // Demo (örnek) event mi? — mertbasar@hotmail.com hesabından oluşturulduysa true
        // Sadece bu hesabın düğünlerinde isim atlatma + tanıtım toast'ları gösterilir
        fetch(`/api/is-demo?eventId=${data.id}`)
          .then(r => r.json())
          .then(j => setIsDemoEvent(!!j?.isDemo))
          .catch(() => {});

        // Slideshow fotoğraflarını çek — private_photos listesindeki URL'leri yayın akışından çıkar
        const privateSet = new Set<string>(Array.isArray(data.private_photos) ? data.private_photos : []);
        const { data: files } = await supabase.storage
          .from('slideshow-photos')
          .list(data.id, { sortBy: { column: 'created_at', order: 'asc' } });
        if (files && files.length > 0) {
          const urls = files
            .filter((f: any) => !f.name.startsWith('.'))
            .map((f: any) => supabase.storage.from('slideshow-photos').getPublicUrl(`${data.id}/${f.name}`).data.publicUrl)
            .filter((u: string) => !privateSet.has(u));
          setSlideshowPhotos(urls);
        }

        // Mevcut altın gönderimlerini çek (hide_gold_names aktifse listeyi gösterme)
        if (!data.hide_gold_names) {
          const { data: giftData } = await supabase
            .from('gift_payments')
            .select('sender_name, gift_type, anonymous')
            .eq('event_id', data.id)
            .eq('status', 'completed')
            .eq('anonymous', false)
            .order('created_at', { ascending: false })
            .limit(20);
          if (giftData && giftData.length > 0) {
            const GOLD_NAMES: Record<string, string> = { gram_altin: 'Gram Altın', ceyrek_altin: 'Çeyrek Altın', yarim_altin: 'Yarım Altın', tam_altin: 'Tam Altın', ata_altin: 'Ata Altın', nakit: 'Nakit' };
            setGoldHistory(giftData.map((g: any) => {
              const parts = (g.sender_name || '').split(' ');
              const shortName = parts[0] + (parts[1] ? ' ' + parts[1].charAt(0) + '.' : '');
              return { name: shortName, type: GOLD_NAMES[g.gift_type] || g.gift_type };
            }));
          }
        }

        if (data.package_id) {
          const { data: pkgData } = await supabase
            .from('packages')
            .select('id, name_tr, max_viewers')
            .eq('id', data.package_id)
            .single();
          
          if (pkgData) {
            setEventPackage(pkgData);
          }
        }
      }
      setLoading(false);
    };

    if (slug) {
      fetchEvent();
    }
  }, [slug]);

  useEffect(() => {
    if (slug) {
      const savedName = localStorage.getItem(`nikahim_viewer_${slug}`);
      if (savedName) {
        setViewerName(savedName);
        setIsReturningViewer(true);
        setShowReturningModal(true);
      }
    }
  }, [slug]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Pre-stream'de limit uygulanmaz, polling sadece görsel sayacı günceller.
    // Limit kontrolü handleNameSubmit'te streamData?.status === 'active' iken yapılır.
    const fetchViewerCount = async () => {
      if (event?.id) {
        const { count } = await supabase
          .from('viewers')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id);

        setViewerCount(count || 0);
      }
    };

    fetchViewerCount();

    const interval = setInterval(fetchViewerCount, 30000);
    return () => clearInterval(interval);
  }, [event?.id]);

  // ─── PRESENCE: gerçek "izleyen" sayımı (stream aktif veya kayıt oynarken) ───
  useEffect(() => {
    if (!event?.id) return;
    const isWatching = streamData?.status === 'active'
      || (streamData?.status === 'ended' && !showEndedScreen && !streamData?.isTest);
    if (!isWatching) {
      setLiveViewerCount(0);
      return;
    }
    // Key = isim (cross-device aynı kişi = aynı key altında gruplanır, tek sayılır)
    const presenceKey = (viewerName || `anon-${Math.random()}`).trim().toLowerCase();
    const channel = supabase.channel(`live-viewers-${event.id}`, {
      config: { presence: { key: presenceKey } },
    });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Object.keys = unique key count (aynı isim farklı cihazdan = 1 sayılır)
        setLiveViewerCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && isNameEntered && viewerName) {
          // Sadece isim girmiş ve sayfada olan kişi "watcher" olarak track edilir
          await channel.track({
            name: viewerName,
            joined_at: new Date().toISOString(),
          });
        }
      });
    return () => { channel.unsubscribe(); };
  }, [event?.id, streamData?.status, streamData?.isTest, showEndedScreen, isNameEntered, viewerName]);

  useEffect(() => {
    if (!event?.id) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('event_id', event.id)
        .order('created_at', { ascending: true });
      
      if (data) {
        const formattedMessages = data.map((msg, index) => ({
          id: msg.id || index,
          name: msg.sender_name,
          text: msg.message,
          time: new Date(msg.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
        }));
        setMessages(formattedMessages);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat-${event.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `event_id=eq.${event.id}`
      }, (payload) => {
        const newMsg = payload.new as { id: string; sender_name: string; message: string; created_at: string };
        const formattedMsg: Message = {
          id: Date.now(),
          name: newMsg.sender_name,
          text: newMsg.message,
          time: new Date(newMsg.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages(prev => [...prev, formattedMsg]);
        // Cross-device notification — kendi mesajını skip (lokal handler zaten gösterdi)
        if (newMsg.sender_name !== viewerNameRef.current) {
          setVideoNotification({
            text: `${newMsg.sender_name} tebrik mesajı gönderdi!`,
            type: 'message',
          });
          setTimeout(() => setVideoNotification(null), 10000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event?.id]);

  // Gold realtime — gift_payments status pending → completed olunca cross-device notification
  useEffect(() => {
    if (!event?.id) return;
    const GOLD_NAMES: Record<string, string> = {
      gram_altin: 'Gram Altın', ceyrek_altin: 'Çeyrek Altın',
      yarim_altin: 'Yarım Altın', tam_altin: 'Tam Altın',
      ata_altin: 'Ata Altın', nakit: 'Nakit',
    };
    const hideGoldNames = !!event.hide_gold_names;
    const channel = supabase
      .channel(`gold-${event.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'gift_payments',
        filter: `event_id=eq.${event.id}`,
      }, (payload) => {
        const newRow = payload.new as { sender_name: string; gift_type: string; status: string; anonymous: boolean };
        const oldRow = payload.old as { status: string };
        // Sadece status pending → completed olduğunda
        if (newRow.status !== 'completed' || oldRow?.status === 'completed') return;
        // Kendi cihazımdan gelen ise skip (lokal handlePaymentComplete zaten gösterdi)
        if (newRow.sender_name && newRow.sender_name === viewerNameRef.current) return;

        const goldName = GOLD_NAMES[newRow.gift_type] || newRow.gift_type;
        const isAnon = !!newRow.anonymous || hideGoldNames;
        if (isAnon) {
          setVideoNotification({ text: `Bir ziyaretçi ${goldName} taktı!`, type: 'gold' });
        } else {
          setVideoNotification({ text: `${newRow.sender_name} ${goldName} gönderdi!`, type: 'gold' });
          // Sağ üst akışa da ekle
          if (!hideGoldNames) {
            const parts = (newRow.sender_name || '').split(' ');
            const shortName = parts[0] + (parts[1] ? ' ' + parts[1].charAt(0) + '.' : '');
            setGoldHistory(prev => [{ name: shortName, type: goldName }, ...prev].slice(0, 10));
          }
        }
        setTimeout(() => setVideoNotification(null), 10000);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [event?.id, event?.hide_gold_names]);

  useEffect(() => {
    if (!event) return;

    const eventDateTime = new Date(`${event.event_date}T${event.event_time}`);

    const timer = setInterval(() => {
      const now = new Date();
      const difference = eventDateTime.getTime() - now.getTime();

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setCountdown({ days, hours, minutes, seconds });
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [event]);

  // Gallery carousel auto-rotate (Nikah Albümü hero foto, slideshowPhotos.length'e göre)
  useEffect(() => {
    if (slideshowPhotos.length < 2) return;
    const interval = setInterval(() => {
      setGalleryIndex(prev => (prev + 1) % slideshowPhotos.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [slideshowPhotos.length]);

  // Per-device viewer key — localStorage UUID (anonymous, dedup için)
  const getViewerKey = () => {
    if (viewerName && viewerName.trim()) {
      return `name:${viewerName.trim().toLowerCase()}`;
    }
    if (typeof window === 'undefined') return 'ssr';
    const KEY = 'nikahim_viewer_key';
    let v = localStorage.getItem(KEY);
    if (!v) {
      v = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(KEY, v);
    }
    return `anon:${v}`;
  };

  // Foto like'ları yükle + realtime dinle
  useEffect(() => {
    if (!event?.id || slideshowPhotos.length === 0) return;
    const viewerKey = getViewerKey();
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from('photo_likes')
        .select('photo_url, viewer_key')
        .eq('event_id', event.id)
        .in('photo_url', slideshowPhotos);
      if (!mounted || !data) return;
      const counts: Record<string, number> = {};
      const liked = new Set<string>();
      data.forEach((row: { photo_url: string; viewer_key: string }) => {
        counts[row.photo_url] = (counts[row.photo_url] || 0) + 1;
        if (row.viewer_key === viewerKey) liked.add(row.photo_url);
      });
      setPhotoLikes(counts);
      setLikedByMe(liked);
    };
    load();

    // Realtime — sadece BAŞKA kullanıcıların aksiyonlarını dinle (kendi optimistic update'i cifte saymasin)
    const channel = supabase
      .channel(`photo-likes-${event.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'photo_likes', filter: `event_id=eq.${event.id}` }, (payload) => {
        const row = payload.new as { photo_url?: string; viewer_key?: string };
        const url = row?.photo_url;
        if (!url || !mounted) return;
        // Kendi like'imiz mi? viewer_key eşleşiyorsa veya son 3sn içinde biz tıkladıysak ignore
        if (row.viewer_key === viewerKey) return;
        if (recentLikeByMeRef.current.has(url)) return;
        setPhotoLikes(prev => ({ ...prev, [url]: (prev[url] || 0) + 1 }));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'photo_likes', filter: `event_id=eq.${event.id}` }, (payload) => {
        const row = payload.old as { photo_url?: string; viewer_key?: string };
        const url = row?.photo_url;
        if (!url || !mounted) return;
        if (row.viewer_key === viewerKey) return;
        if (recentLikeByMeRef.current.has(url)) return;
        setPhotoLikes(prev => ({ ...prev, [url]: Math.max(0, (prev[url] || 0) - 1) }));
      })
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [event?.id, slideshowPhotos.join(','), viewerName]);

  // Like toggle — optimistic update + Supabase insert/delete
  const togglePhotoLike = async (photoUrl: string) => {
    if (!event?.id) return;
    const viewerKey = getViewerKey();
    const isLiked = likedByMe.has(photoUrl);

    // Bu URL'i kısa süreliğine "kendi aksiyonum" olarak işaretle — realtime double-count engellenir
    recentLikeByMeRef.current.add(photoUrl);
    setTimeout(() => recentLikeByMeRef.current.delete(photoUrl), 3000);

    // Optimistic
    setLikedByMe(prev => {
      const next = new Set(prev);
      if (isLiked) next.delete(photoUrl); else next.add(photoUrl);
      return next;
    });
    setPhotoLikes(prev => ({ ...prev, [photoUrl]: Math.max(0, (prev[photoUrl] || 0) + (isLiked ? -1 : 1)) }));

    if (isLiked) {
      await supabase.from('photo_likes').delete()
        .eq('event_id', event.id).eq('photo_url', photoUrl).eq('viewer_key', viewerKey);
    } else {
      await supabase.from('photo_likes').insert({
        event_id: event.id, photo_url: photoUrl, viewer_key: viewerKey, viewer_name: viewerName?.trim() || null,
      });
    }
  };

  const handleNameSubmit = async () => {
    if (viewerName.trim() && event?.id) {
      // Limit kontrolü SADECE yayın aktifken — gerçek "izleyen" sayısı (presence) üzerinden.
      // Paket limiti + %10 tampon (ör. 100→110, 200→220, 300→330).
      if (streamData?.status === 'active') {
        const baseMax = (eventPackage?.max_viewers ?? 200) + ((event as any)?.extra_viewers ?? 0);
        const maxLive = Math.floor(baseMax * 1.1);
        if (liveViewerCount >= maxLive) {
          // Çift "ek izleyici paketi"ni kabul ettiyse sınır kalkar.
          // RLS güvenli: pending_payments'ı okumadan fonksiyonla kontrol (anon mali veriyi görmesin)
          const { data: extraOk } = await supabase.rpc('event_extra_viewers_ok', { p_event_id: event.id });
          if (!extraOk) {
            setViewerLimitReached(true);
            return;
          }
        }
      }
      
      localStorage.setItem(`nikahim_viewer_${slug}`, viewerName.trim());

      // Soft auto-merge: aynı full_name daha önce bu event'e kaydedildiyse
      // yeni satır ekleme (cross-device aynı kişi varsayımı). Davetli akışında
      // aynı-isimli iki farklı kişi olma riski çok düşük.
      const { count: existingCount } = await supabase
        .from('viewers')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('full_name', viewerName.trim());

      if (!existingCount) {
        await supabase.from('viewers').insert({
          event_id: event.id,
          full_name: viewerName,
          first_name: viewerFirstName.trim() || null,
          last_name: viewerLastName.trim() || null,
        });
        setViewerCount(prev => prev + 1);
      }
      setShowWelcomeModal(true);
      
      if (event?.background_music && event.background_music !== 'none') {
        const musicFile = MUSIC_FILES[event.background_music];
        if (musicFile) {
          // Önce mevcut audio'yu temizle ki çift çalmasın
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          const audio = new Audio(`${SUPABASE_URL}/storage/v1/object/public/music/${musicFile}`);
          audio.loop = true;
          audio.volume = 0.3;
          audioRef.current = audio;
          audio.play().then(() => {
            setIsMusicPlaying(true);
          }).catch(() => {});
        }
      }

      setTimeout(() => {
        setShowWelcomeModal(false);
        setIsNameEntered(true);
        setVideoNotification({ text: `${viewerName.trim()} nikaha katıldı!`, type: 'join' });
        setTimeout(() => setVideoNotification(null), 10000);
      }, 3000);
    }
  };

  const sendMessage = async () => {
    if (isDemoEvent) { showDemoBlock(); return; }
    if (message.trim() && event?.id) {
      await supabase.from('chat_messages').insert({
        event_id: event.id,
        sender_name: viewerName,
        message: message,
      });

      setMessage("");
      setShowEmojiPicker(false);
      setVideoNotification({ text: `${viewerName} tebrik mesajı gönderdi!`, type: 'message' });
      setTimeout(() => setVideoNotification(null), 10000);
    }
  };

  const addEmoji = (emoji: string) => {
    setMessage(message + emoji);
  };

  const handleGoldSelect = async (goldId: string) => {
    setSelectedGold(goldId);
    setCustomAmount("");
    setPaymentStep(1);
    setPaymentMethod(null);
    setShowPaymentModal(true);
    // Mobilde ödeme modalı açılınca dikeye dön
    try { (screen.orientation as any)?.lock?.('portrait').catch(() => {}); } catch {}

    if (goldId !== "nakit" && event?.id) {
      const selectedGoldOption = goldOptions.find(g => g.id === goldId);
      const { data } = await supabase.from('gift_payments').insert({
        event_id: event.id,
        sender_name: viewerName,
        gift_type: goldId,
        amount_tl: selectedGoldOption?.price || 0,
        status: 'pending',
      }).select().single();
      
      if (data) {
        setPendingPaymentId(data.id);
        pendingPaymentIdRef.current = data.id;
      }
    }
  };

  const handleCustomAmountSubmit = async () => {
    if (!customAmount || !event?.id) return;
    
    const { data } = await supabase.from('gift_payments').insert({
      event_id: event.id,
      sender_name: viewerName,
      gift_type: 'nakit',
      amount_tl: parseFloat(customAmount),
      status: 'pending',
    }).select().single();
    
    if (data) {
      setPendingPaymentId(data.id);
      pendingPaymentIdRef.current = data.id;
    }
  };

  // Payment confirmation timer — banka transferi için kullanıcıya zaman verir
  useEffect(() => {
    if (paymentStep === 2) {
      setConfirmTimer(60);
      const interval = setInterval(() => {
        setConfirmTimer((prev) => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [paymentStep]);

  // Green confirm button on step 2 → step 3 (success)
  const handlePaymentComplete = async () => {
    if (isDemoEvent) { showDemoBlock(); setShowPaymentModal(false); return; }
    const paymentId = pendingPaymentIdRef.current;

    const isAnonymous = anonymousGold || event?.hide_gold_names;

    if (paymentId) {
      await supabase
        .from('gift_payments')
        .update({ status: 'completed', anonymous: !!isAnonymous })
        .eq('id', paymentId);
    }

    setPaymentStep(3);

    const goldName = goldOptions.find(g => g.id === selectedGold)?.name || 'Altın';
    if (isAnonymous) {
      setVideoNotification({ text: `Bir ziyaretçi ${goldName} taktı!`, type: 'gold' });
    } else {
      setVideoNotification({ text: `${viewerName} ${goldName} gönderdi!`, type: 'gold' });
      setGoldHistory(prev => [{ name: viewerName.split(' ')[0] + (viewerName.split(' ')[1] ? ' ' + viewerName.split(' ')[1].charAt(0) + '.' : ''), type: goldName }, ...prev].slice(0, 10));
    }
    setTimeout(() => setVideoNotification(null), 10000);

    setPendingPaymentId(null);
    pendingPaymentIdRef.current = null;

    // Auto-close after 4 seconds
    setTimeout(() => {
      setShowPaymentModal(false);
      setSelectedGold(null);
      setPaymentMethod(null);
      setCustomAmount("");
      setPaymentStep(1);
      setFsGoldMode(false);
      setAnonymousGold(false);
      // Fullscreen'deyse yataya dön
      if (isFullscreen) { try { (screen.orientation as any)?.lock?.('landscape').catch(() => {}); } catch {} }
    }, 4000);
  };

  const handleCloseModal = () => {
    setShowPaymentModal(false);
    setPaymentMethod(null);
    setSelectedGold(null);
    setCustomAmount("");
    setPaymentStep(1);
    setPendingPaymentId(null);
    pendingPaymentIdRef.current = null;
    setFsGoldMode(false);
    setAnonymousGold(false);
    // Fullscreen'deyse yataya geri dön
    if (isFullscreen) { try { (screen.orientation as any)?.lock?.('landscape').catch(() => {}); } catch {} }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setShowCopiedToast(true);
    setTimeout(() => setShowCopiedToast(false), 2000);
  };

  const getSelectedPrice = () => {
    if (selectedGold === "nakit") {
      return customAmount ? parseFloat(customAmount) : 0;
    }
    return goldOptions.find(g => g.id === selectedGold)?.price || 0;
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(#FFF9F6, #FDECE6)' }}>
        {/* Uygulamadaki kalp geçiş animasyonu (büyüyüp küçülen) */}
        <img
          src="/logo-heart.png"
          alt="Nikahım"
          style={{ width: 132, height: 'auto', marginBottom: '6vh', animation: 'nkhHeartBeat 3s ease-in-out infinite' }}
        />
        <style>{`@keyframes nkhHeartBeat { 0%,100% { transform: scale(0.94); } 50% { transform: scale(1.12); } }`}</style>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Nikah Bulunamadı</h1>
          <p className="text-gray-600 mb-6">Bu linkle eşleşen bir nikah bulamadık.</p>
          <a href="/" className="text-[#C8686E] hover:underline">Ana Sayfaya Dön</a>
        </div>
      </main>
    );
  }

  const isLive = event.status === 'live';
  const eventDate = new Date(event.event_date).toLocaleDateString('tr-TR');
  const eventTime = event.event_time?.slice(0, 5) || '14:00';
  const hasMusicSelected = event.background_music && event.background_music !== 'none';

  if (viewerLimitReached && !isNameEntered && !isReturningViewer) {
    return (
      <main className="min-h-screen flex items-start sm:items-center justify-center p-4 pt-6 sm:pt-4" style={{ background: 'linear-gradient(180deg, #FAFBFE 0%, #F5F3F0 50%, #FDF5F5 100%)' }}>
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center relative">
          
          <div className="text-6xl mb-4 mt-8">😔</div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Yayın Kapasitesi Doldu</h1>
          
          <p className="text-gray-500 mb-6">
            {event.bride_full_name} & {event.groom_full_name} nikah töreni için izleyici kapasitesi dolmuştur.
          </p>
          
          <div className="bg-rose-50/50 rounded-xl p-4 mb-6">
            <p className="text-[#C8686E] text-sm">
              👥 Şu an çok yoğun izleniyor, kapasite geçici olarak doldu.
            </p>
          </div>

          <p className="text-gray-400 text-sm">Birkaç dakika sonra tekrar deneyebilirsiniz.</p>
        </div>
      </main>
    );
  }

  if (showReturningModal && isReturningViewer) {
    return (
      <main className="min-h-screen flex items-start sm:items-center justify-center p-4 pt-6 sm:pt-4 pb-8" style={{ background: 'linear-gradient(180deg, #FAFBFE 0%, #F5F3F0 50%, #FDF5F5 100%)' }}>
        {renderDemoBlock()}
        <div className="rounded-[28px] pt-9 px-7 pb-9 max-w-md w-full text-center relative overflow-hidden"
             style={{
               background: 'linear-gradient(165deg, #FFFCF9 0%, #FDF5F0 50%, #FFF7F1 100%)',
               boxShadow: '0 30px 80px rgba(60,40,40,0.18), 0 12px 32px rgba(200,104,110,0.14), 0 4px 12px rgba(0,0,0,0.06)',
               border: '1px solid rgba(232,180,170,0.30)',
             }}>
          {/* Köşe soft glow'lar — Apple onboarding hissi */}
          <div className="absolute top-[-60px] right-[-50px] w-[220px] h-[220px] rounded-full pointer-events-none"
               style={{ background: 'radial-gradient(circle, rgba(200,104,110,0.14) 0%, transparent 70%)' }} />
          <div className="absolute bottom-[-80px] left-[-60px] w-[250px] h-[250px] rounded-full pointer-events-none"
               style={{ background: 'radial-gradient(circle, rgba(253,232,224,0.45) 0%, transparent 70%)' }} />

          {/* Logo - sol üst, küçük yumuşak imza */}
          <div className="absolute top-3 left-4 cursor-pointer z-10 group" onClick={() => window.location.href = '/'}>
            <Image src="/navbar-icon.png" alt="Nikahım" width={56} height={56} className="h-[48px] w-auto object-contain opacity-85 transition-opacity group-hover:opacity-100" />
          </div>

          {/* CANLI badge — sadece active iken sağ üstte */}
          {streamData?.status === 'active' && (
            <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white z-10"
                 style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', boxShadow: '0 3px 10px rgba(220,38,38,0.35), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              CANLI
            </div>
          )}

          {/* Hero — Çift fotoğrafı, büyük, soft halo + glass border */}
          <div className="relative flex items-center justify-center mt-2 mb-3">
            {/* Arkada soft rose halo */}
            <div className="absolute w-[180px] h-[180px] rounded-full pointer-events-none"
                 style={{ background: 'radial-gradient(circle, rgba(200,104,110,0.18) 0%, transparent 65%)', filter: 'blur(12px)' }} />
            <div className="relative rounded-full p-[3px]"
                 style={{
                   background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(232,180,170,0.55))',
                   boxShadow: '0 12px 30px rgba(200,104,110,0.20), 0 4px 12px rgba(160,80,90,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
                 }}>
              {event.couple_photo_url ? (
                <img src={event.couple_photo_url} alt="Çift Fotoğrafı"
                     className="rounded-full object-cover w-[135px] h-[135px] block"
                     style={{ border: '2px solid rgba(255,255,255,0.95)' }} />
              ) : (
                <div className="rounded-full flex items-center justify-center w-[135px] h-[135px]" style={{ background: '#FDF5F5', border: '2px solid rgba(255,255,255,0.95)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#C8686E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* İsimler — birbirine yakın (& işaretinin hemen sağı/solunda), & ile aynı renkte */}
          <div className="flex items-center justify-center gap-2 mb-3 relative">
            <h1 className="font-bold text-gray-900 leading-tight" style={{ fontSize: 'clamp(22px, 6vw, 30px)' }}>
              {event.bride_first_name}
            </h1>
            <p className="font-medium text-gray-900" style={{ fontSize: 'clamp(22px, 6vw, 30px)', lineHeight: 1 }}>&</p>
            <h1 className="font-bold text-gray-900 leading-tight" style={{ fontSize: 'clamp(22px, 6vw, 30px)' }}>
              {event.groom_first_name}
            </h1>
          </div>

          {/* Gold dash ayraç */}
          <div className="flex justify-center mb-3.5 relative">
            <div className="h-[1px] rounded-full" style={{ width: '50px', background: 'linear-gradient(90deg, transparent, #D4A852, transparent)' }} />
          </div>

          {/* Aile etiketleri — Gelin/Damat Ailesi başlıkları AYNI hizadan başlar (grid ile sabit kolon) */}
          <div className="flex justify-center mb-4 relative">
            <div className="grid items-baseline gap-x-3 gap-y-1 text-left" style={{ gridTemplateColumns: 'auto auto' }}>
              {(event.bride_father_name || event.bride_mother_name) && (
                <>
                  <span className="font-semibold uppercase whitespace-nowrap" style={{ color: '#C8686E', letterSpacing: '0.5px', fontSize: '11px' }}>Gelin Ailesi</span>
                  <span className="text-[12.5px]" style={{ color: '#5A4A4A' }}>{event.bride_father_name && event.bride_mother_name ? `${event.bride_father_name} & ${event.bride_mother_name}` : event.bride_father_name || event.bride_mother_name}</span>
                </>
              )}
              {(event.groom_father_name || event.groom_mother_name) && (
                <>
                  <span className="font-semibold uppercase whitespace-nowrap" style={{ color: '#C8686E', letterSpacing: '0.5px', fontSize: '11px' }}>Damat Ailesi</span>
                  <span className="text-[12.5px]" style={{ color: '#5A4A4A' }}>{event.groom_father_name && event.groom_mother_name ? `${event.groom_father_name} & ${event.groom_mother_name}` : event.groom_father_name || event.groom_mother_name}</span>
                </>
              )}
            </div>
          </div>

          {/* Date/time — minimal, gold diamond ayraç */}
          <div className="flex items-center justify-center gap-3 mb-5 text-[12.5px] relative" style={{ color: '#9A8989' }}>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" style={{ color: '#C8686E' }} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {eventDate}
            </span>
            <span style={{ color: '#D4A852', fontSize: '6px' }}>◆</span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" style={{ color: '#C8686E' }} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {eventTime}
            </span>
          </div>

          {/* Premium hoşgeldin copy */}
          <div className="mb-5 relative">
            <p className="italic text-[15px]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif', color: '#7A6B6B' }}>
              Tekrar Hoş Geldiniz <span style={{ fontWeight: 700, color: '#1F1F1F' }}>Sn. {viewerName}</span>
            </p>
          </div>

          {/* İki seçenek kartı — dönen misafir (isim zaten var, ikisi de aktif) */}
          {(() => {
            const isDugun = event.event_type === 'dugun';
            const joinTitle = isDugun ? 'Düğüne Katıl' : 'Nikaha Katıl';
            return (
              <div className="flex flex-col gap-3">
                {/* Kart 1 — Katıl · primary rose */}
                <button
                  onClick={handleReturningContinue}
                  className="w-full relative text-left rounded-[22px] p-[1.5px] overflow-hidden transition-all btn-press"
                  style={{ background: 'linear-gradient(135deg, #E9A0A3, #C8686E)' }}
                >
                  <span className="block rounded-[21px] px-4 py-3.5 relative overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #D88488 0%, #C8686E 48%, #B85258 100%)', boxShadow: '0 16px 38px rgba(200,104,110,0.26), inset 0 1px 0 rgba(255,255,255,0.30)' }}>
                    <span className="absolute inset-x-0 top-0 h-1/2 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.20), transparent)' }} />
                    <span className="relative flex items-center gap-3.5">
                      <span className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-2xl" style={{ background: 'rgba(255,255,255,0.20)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.25)' }}>
                        <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="inline-flex items-center gap-1 mb-1 px-2 py-[3px] rounded-full text-[9.5px] font-bold tracking-[0.4px] text-white" style={{ background: 'rgba(255,255,255,0.18)' }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> UZAKTAYSAN
                        </span>
                        <span className="block text-white font-bold text-[17px] leading-tight">{joinTitle}</span>
                        <span className="flex items-center gap-1.5 mt-1 text-white/90 text-[11.5px] font-medium">
                          <span>Canlı İzle</span><span className="opacity-50">·</span><span>Tebrik Et</span><span className="opacity-50">·</span>
                          <span className="inline-flex items-center gap-0.5"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="#F4D58D"><circle cx="12" cy="12" r="9" stroke="#E7C270" strokeWidth="1.5" fill="#F4D58D"/></svg>Altın Tak</span>
                        </span>
                      </span>
                      <svg className="w-5 h-5 text-white/90 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </span>
                  </span>
                </button>

                {/* Kart 2 — Fotoğraf Paylaş · secondary cream-rose */}
                <button
                  onClick={() => { setPhotoUploaderName(viewerName); setShowPhotoUpload(true); }}
                  className="w-full relative text-left rounded-[22px] px-4 py-3.5 overflow-hidden transition-all btn-press"
                  style={{ background: 'linear-gradient(180deg, #FFF5F4 0%, #FFEDEB 100%)', border: '1px solid rgba(200,104,110,0.22)', boxShadow: '0 10px 26px rgba(200,104,110,0.12)' }}
                >
                  <span className="flex items-center gap-3.5">
                    <span className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-2xl" style={{ background: 'linear-gradient(135deg, #F8C4C2, #ECA1A5)', boxShadow: '0 5px 12px rgba(200,104,110,0.18)' }}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="inline-flex items-center gap-1 mb-1 px-2 py-[3px] rounded-full text-[9.5px] font-bold tracking-[0.4px]" style={{ background: 'rgba(200,104,110,0.10)', color: '#C8686E' }}>
                        {isDugun ? 'DÜĞÜNDEYSEN' : 'NİKAHTAYSAN'}
                      </span>
                      <span className="block font-bold text-[17px] leading-tight" style={{ color: '#B85258' }}>Fotoğraf Paylaş</span>
                      <span className="flex items-center gap-1.5 mt-1 text-[11.5px] font-medium" style={{ color: '#9A6B6B' }}>
                        <span>Çek</span><span className="opacity-40">·</span><span>Yükle</span><span className="opacity-40">·</span><span>Çiftle Paylaş</span>
                      </span>
                    </span>
                    <svg className="w-5 h-5 flex-shrink-0" style={{ color: '#C8686E' }} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </span>
                </button>
              </div>
            );
          })()}
        </div>

        {/* Fotoğraf Yükleme Popup - Tekrar gelen */}
        {renderPhotoUploadPopup()}
      </main>
    );
  }

  if (!isNameEntered) {
    return (
      <main className="min-h-screen flex items-start sm:items-center justify-center p-4 pt-6 sm:pt-4 pb-8" style={{ background: 'linear-gradient(180deg, #FAFBFE 0%, #F5F3F0 50%, #FDF5F5 100%)' }}>
        {renderDemoToast()}
        {renderDemoBlock()}
        <div className="rounded-[28px] pt-9 px-7 pb-9 max-w-md w-full text-center relative overflow-hidden"
             style={{
               background: 'linear-gradient(165deg, #FFFCF9 0%, #FDF5F0 50%, #FFF7F1 100%)',
               boxShadow: '0 30px 80px rgba(60,40,40,0.18), 0 12px 32px rgba(200,104,110,0.14), 0 4px 12px rgba(0,0,0,0.06)',
               border: '1px solid rgba(232,180,170,0.30)',
             }}>
          {/* Köşe soft glow'lar */}
          <div className="absolute top-[-60px] right-[-50px] w-[220px] h-[220px] rounded-full pointer-events-none"
               style={{ background: 'radial-gradient(circle, rgba(200,104,110,0.14) 0%, transparent 70%)' }} />
          <div className="absolute bottom-[-80px] left-[-60px] w-[250px] h-[250px] rounded-full pointer-events-none"
               style={{ background: 'radial-gradient(circle, rgba(253,232,224,0.45) 0%, transparent 70%)' }} />

          {/* Logo - sol üst, küçük yumuşak imza */}
          <div className="absolute top-3 left-4 cursor-pointer z-10 group" onClick={() => window.location.href = '/'}>
            <Image src="/navbar-icon.png" alt="Nikahım" width={56} height={56} className="h-[48px] w-auto object-contain opacity-85 transition-opacity group-hover:opacity-100" />
          </div>

          {/* CANLI badge — sadece active iken */}
          {streamData?.status === 'active' && (
            <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white z-10"
                 style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', boxShadow: '0 3px 10px rgba(220,38,38,0.35), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              CANLI
            </div>
          )}

          {/* Hero — Çift fotoğrafı, %10 küçültüldü, alttakiler yukarı */}
          <div className="relative flex items-center justify-center mt-2 mb-3">
            <div className="absolute w-[180px] h-[180px] rounded-full pointer-events-none"
                 style={{ background: 'radial-gradient(circle, rgba(200,104,110,0.18) 0%, transparent 65%)', filter: 'blur(12px)' }} />
            <div className="relative rounded-full p-[3px]"
                 style={{
                   background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(232,180,170,0.55))',
                   boxShadow: '0 12px 30px rgba(200,104,110,0.20), 0 4px 12px rgba(160,80,90,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
                 }}>
              {event.couple_photo_url ? (
                <img src={event.couple_photo_url} alt="Çift Fotoğrafı"
                     className="rounded-full object-cover w-[135px] h-[135px] block"
                     style={{ border: '2px solid rgba(255,255,255,0.95)' }} />
              ) : (
                <div className="rounded-full flex items-center justify-center w-[135px] h-[135px]" style={{ background: '#FDF5F5', border: '2px solid rgba(255,255,255,0.95)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#C8686E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* İsimler — birbirine yakın (& işaretinin hemen sağı/solunda), & ile aynı renkte */}
          <div className="flex items-center justify-center gap-2 mb-3 relative">
            <h1 className="font-bold text-gray-900 leading-tight" style={{ fontSize: 'clamp(22px, 6vw, 30px)' }}>
              {event.bride_first_name}
            </h1>
            <p className="font-medium text-gray-900" style={{ fontSize: 'clamp(22px, 6vw, 30px)', lineHeight: 1 }}>&</p>
            <h1 className="font-bold text-gray-900 leading-tight" style={{ fontSize: 'clamp(22px, 6vw, 30px)' }}>
              {event.groom_first_name}
            </h1>
          </div>

          {/* Gold dash ayraç */}
          <div className="flex justify-center mb-3.5 relative">
            <div className="h-[1px] rounded-full" style={{ width: '50px', background: 'linear-gradient(90deg, transparent, #D4A852, transparent)' }} />
          </div>

          {/* Aile etiketleri — Gelin/Damat Ailesi başlıkları AYNI hizadan başlar (grid ile sabit kolon) */}
          <div className="flex justify-center mb-4 relative">
            <div className="grid items-baseline gap-x-3 gap-y-1 text-left" style={{ gridTemplateColumns: 'auto auto' }}>
              {(event.bride_father_name || event.bride_mother_name) && (
                <>
                  <span className="font-semibold uppercase whitespace-nowrap" style={{ color: '#C8686E', letterSpacing: '0.5px', fontSize: '11px' }}>Gelin Ailesi</span>
                  <span className="text-[12.5px]" style={{ color: '#5A4A4A' }}>{event.bride_father_name && event.bride_mother_name ? `${event.bride_father_name} & ${event.bride_mother_name}` : event.bride_father_name || event.bride_mother_name}</span>
                </>
              )}
              {(event.groom_father_name || event.groom_mother_name) && (
                <>
                  <span className="font-semibold uppercase whitespace-nowrap" style={{ color: '#C8686E', letterSpacing: '0.5px', fontSize: '11px' }}>Damat Ailesi</span>
                  <span className="text-[12.5px]" style={{ color: '#5A4A4A' }}>{event.groom_father_name && event.groom_mother_name ? `${event.groom_father_name} & ${event.groom_mother_name}` : event.groom_father_name || event.groom_mother_name}</span>
                </>
              )}
            </div>
          </div>

          {/* Date/time — minimal, gold diamond ayraç */}
          <div className="flex items-center justify-center gap-3 mb-5 text-[12.5px] relative" style={{ color: '#9A8989' }}>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" style={{ color: '#C8686E' }} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {eventDate}
            </span>
            <span style={{ color: '#D4A852', fontSize: '6px' }}>◆</span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" style={{ color: '#C8686E' }} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {eventTime}
            </span>
          </div>

          <div className="mb-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-left mb-1.5 ml-1 font-medium text-sm" style={{ color: '#4B5563' }}>Adınız</label>
                <input
                  type="text"
                  value={viewerFirstName}
                  onChange={(e) => { setViewerFirstName(e.target.value); setViewerName(`${e.target.value} ${viewerLastName}`.trim()); }}
                  placeholder=""
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#C8686E]/40 outline-none text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-left mb-1.5 ml-1 font-medium text-sm" style={{ color: '#4B5563' }}>Soyadınız</label>
                <input
                  type="text"
                  value={viewerLastName}
                  onChange={(e) => { setViewerLastName(e.target.value); setViewerName(`${viewerFirstName} ${e.target.value}`.trim()); }}
                  placeholder=""
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#C8686E]/40 outline-none text-gray-900 placeholder:text-gray-400"
                  onKeyPress={(e) => e.key === "Enter" && (viewerFirstName.trim() && viewerLastName.trim()) && handleNameSubmit()}
                />
              </div>
            </div>
          </div>

          {/* İki seçenek kartı — ad-soyad girilmeden sönük (opacity .60), girilince aktif */}
          {(() => {
            const ready = isDemoEvent || (viewerFirstName.trim().length >= 2 && viewerLastName.trim().length >= 2);
            const isDugun = event.event_type === 'dugun';
            const joinTitle = isDugun ? 'Düğüne Katıl' : 'Nikaha Katıl';
            return (
              <div className="flex flex-col gap-3">
                {/* Kart 1 — Katıl (aktiviteye göre) · primary rose */}
                <button
                  onClick={() => { if (!ready) return; if (isDemoEvent) { setShowPhotoUpload(false); setIsNameEntered(true); } else { handleNameSubmit(); } }}
                  disabled={!ready}
                  className="w-full relative text-left rounded-[22px] p-[1.5px] overflow-hidden transition-all btn-press disabled:cursor-default"
                  style={{ opacity: ready ? 1 : 0.6, transform: 'scale(1)', background: ready ? 'linear-gradient(135deg, #E9A0A3, #C8686E)' : 'rgba(200,104,110,0.18)' }}
                >
                  <span className="block rounded-[21px] px-4 py-3.5 relative overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #D88488 0%, #C8686E 48%, #B85258 100%)', boxShadow: ready ? '0 16px 38px rgba(200,104,110,0.26), inset 0 1px 0 rgba(255,255,255,0.30)' : 'none' }}>
                    <span className="absolute inset-x-0 top-0 h-1/2 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.20), transparent)' }} />
                    <span className="relative flex items-center gap-3.5">
                      <span className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-2xl" style={{ background: 'rgba(255,255,255,0.20)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.25)' }}>
                        <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="inline-flex items-center gap-1 mb-1 px-2 py-[3px] rounded-full text-[9.5px] font-bold tracking-[0.4px] text-white" style={{ background: 'rgba(255,255,255,0.18)' }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> UZAKTAYSAN
                        </span>
                        <span className="block text-white font-bold text-[17px] leading-tight">{joinTitle}</span>
                        <span className="flex items-center gap-1.5 mt-1 text-white/90 text-[11.5px] font-medium">
                          <span>Canlı İzle</span><span className="opacity-50">·</span><span>Tebrik Et</span><span className="opacity-50">·</span>
                          <span className="inline-flex items-center gap-0.5"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="#F4D58D"><circle cx="12" cy="12" r="9" stroke="#E7C270" strokeWidth="1.5" fill="#F4D58D"/></svg>Altın Tak</span>
                        </span>
                      </span>
                      <svg className="w-5 h-5 text-white/90 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </span>
                  </span>
                </button>

                {/* Kart 2 — Fotoğraf Paylaş · secondary cream-rose */}
                <button
                  onClick={() => { if (!ready) return; setPhotoUploaderName(`${viewerFirstName} ${viewerLastName}`.trim()); setShowPhotoUpload(true); }}
                  disabled={!ready}
                  className="w-full relative text-left rounded-[22px] px-4 py-3.5 overflow-hidden transition-all btn-press disabled:cursor-default"
                  style={{ opacity: ready ? 1 : 0.6, background: 'linear-gradient(180deg, #FFF5F4 0%, #FFEDEB 100%)', border: '1px solid rgba(200,104,110,0.22)', boxShadow: ready ? '0 10px 26px rgba(200,104,110,0.12)' : 'none' }}
                >
                  <span className="flex items-center gap-3.5">
                    <span className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-2xl" style={{ background: 'linear-gradient(135deg, #F8C4C2, #ECA1A5)', boxShadow: '0 5px 12px rgba(200,104,110,0.18)' }}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="inline-flex items-center gap-1 mb-1 px-2 py-[3px] rounded-full text-[9.5px] font-bold tracking-[0.4px]" style={{ background: 'rgba(200,104,110,0.10)', color: '#C8686E' }}>
                        {isDugun ? 'DÜĞÜNDEYSEN' : 'NİKAHTAYSAN'}
                      </span>
                      <span className="block font-bold text-[17px] leading-tight" style={{ color: '#B85258' }}>Fotoğraf Paylaş</span>
                      <span className="flex items-center gap-1.5 mt-1 text-[11.5px] font-medium" style={{ color: '#9A6B6B' }}>
                        <span>Çek</span><span className="opacity-40">·</span><span>Yükle</span><span className="opacity-40">·</span><span>Çiftle Paylaş</span>
                      </span>
                    </span>
                    <svg className="w-5 h-5 flex-shrink-0" style={{ color: '#C8686E' }} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </span>
                </button>

                {!ready && (
                  <p className="text-center text-[11.5px] mt-0.5" style={{ color: '#B5A0A0' }}>Devam etmek için adınızı ve soyadınızı yazın</p>
                )}
              </div>
            );
          })()}
        </div>

        {/* Fotoğraf Yükleme Popup */}
        {renderPhotoUploadPopup()}

        {showWelcomeModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
            <div className="rounded-3xl p-8 max-w-sm w-full text-center relative overflow-hidden" style={{ background: 'linear-gradient(165deg, rgba(255,252,248,0.96), rgba(250,245,238,0.95))', boxShadow: '0 25px 80px rgba(0,0,0,0.15)', border: '1px solid rgba(200,104,110,0.1)' }}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(200,104,110,0.08), rgba(111,175,207,0.06))' }}>
                <span className="text-3xl">💐</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Hoş Geldiniz!</h3>
              <p className="text-sm text-gray-500 mb-1">Katılım bilginiz çiftimize iletildi</p>
              <p className="text-xs text-gray-400">Keyifli izlemeler dileriz</p>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden w-full max-w-[100vw]" style={{ background: '#FAF7F5' }}>
      {renderDemoToast()}

      {renderDemoBlock()}

      {/* App İndir Popup */}
      {showAppPopup && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowAppPopup(false)} style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
          <div className="relative rounded-[28px] px-8 lg:px-10 pt-7 pb-16 lg:pt-9 lg:pb-20 max-w-md w-full overflow-hidden"
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

            {/* 3 feature — ana sayfa ile aynı: Davetiye → Paylaş → Canlı */}
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

            {/* CTA alt yazı — store butonlarına mesafe */}
            <div className="text-center mb-6 lg:mb-7">
              <p className="text-[13.5px]" style={{ color: '#7A6B6B' }}>
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

      {/* NAVBAR — premium luxury: cream gradient + sol marka + sağ glass action area (status / müzik / izleyici) */}
      <header className="sticky top-0 z-50 relative"
              style={{
                background: 'linear-gradient(180deg, rgba(253,247,243,0.94) 0%, rgba(255,251,248,0.90) 100%)',
                backdropFilter: 'blur(28px) saturate(180%)',
                WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                borderBottom: '1px solid rgba(200,104,110,0.08)',
                boxShadow: '0 4px 18px rgba(200,104,110,0.05)',
              }}>
        {/* Alt kenar — pearl/rose glow çizgisi */}
        <div className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
             style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(200,104,110,0.18) 20%, rgba(212,168,82,0.16) 50%, rgba(200,104,110,0.18) 80%, transparent 100%)' }} />
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 flex items-center justify-between h-[60px] lg:h-[68px]">
          {/* SOL — Marka */}
          <div className="flex items-center cursor-pointer group" onClick={() => window.location.href = '/'} style={{ gap: '0px' }}>
            <Image src="/navbar-icon.png" alt="Nikahım" width={60} height={60} className="h-[48px] lg:h-[54px] w-auto object-contain transition-transform group-hover:scale-[1.04]" />
            <Image src="/navbar-text.png" alt="Nikahım" width={230} height={58} className="h-[30px] lg:h-[34px] w-auto object-contain -ml-0.5" />
          </div>

          {/* SAĞ — Glass action area: status pill + müzik + izleyici */}
          <div className="flex items-center gap-2 lg:gap-2.5">
            {/* Stream status pill — rose blur (ana sayfa video badge ile aynı) */}
            {streamData?.status === 'active' && (
              <span className="flex items-center gap-1.5 text-white px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: 'rgba(200,104,110,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.30)', boxShadow: '0 4px 14px rgba(160,80,90,0.30), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />CANLI
              </span>
            )}
            {/* Aktif test yayını — rose CANLI'nin yanında TEST rozeti */}
            {streamData?.status === 'active' && streamData?.isTest && (
              <span className="flex items-center gap-1.5 text-white px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: 'rgba(217,119,6,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.30)', boxShadow: '0 4px 14px rgba(180,120,20,0.30), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
                TEST
              </span>
            )}
            {streamData?.status === 'starting' && (
              <span className="flex items-center gap-1.5 text-white px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: streamData?.isTest ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'linear-gradient(135deg, #EAB308, #CA8A04)', boxShadow: '0 3px 10px rgba(202,138,4,0.30), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                {streamData?.isTest ? 'TEST' : 'BAŞLIYOR'}
              </span>
            )}
            {streamData?.status === 'ended' && showEndedScreen && (
              <span className="flex items-center gap-1.5 text-white px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)', boxShadow: '0 3px 10px rgba(22,163,74,0.28), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />İŞLENİYOR
              </span>
            )}
            {streamData?.status === 'ended' && !showEndedScreen && !streamData?.isTest && (
              <span className="flex items-center gap-1.5 text-white px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: 'linear-gradient(135deg, #6B7280, #4B5563)', boxShadow: '0 3px 10px rgba(75,85,99,0.25), inset 0 1px 0 rgba(255,255,255,0.20)' }}>▶ KAYIT</span>
            )}

            {/* Müzik açma/kapama — glass button */}
            {hasMusicSelected && isNameEntered && (!streamData?.status || streamData?.status === 'idle' || (streamData?.status === 'ended' && !showEndedScreen && streamData?.isTest)) && (
              isMusicPlaying ? (
                <button onClick={toggleMusicMute}
                        className="inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-full text-[11px] lg:text-xs font-semibold transition-all hover:scale-[1.04] active:scale-[0.97]"
                        style={{
                          color: musicMuted ? '#9F4F58' : '#6B5A5A',
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(253,247,243,0.88) 100%)',
                          backdropFilter: 'blur(14px)',
                          border: '1px solid rgba(200,104,110,0.18)',
                          boxShadow: '0 3px 12px rgba(200,104,110,0.10), 0 1px 3px rgba(160,80,90,0.05), inset 0 1px 0 rgba(255,255,255,0.95)',
                        }}>
                  {musicMuted ? (
                    <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zm12-3c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z" /></svg>Müzik Aç</>
                  ) : (
                    <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 9l4 4m0-4l-4 4" /></svg>Sessiz</>
                  )}
                </button>
              ) : (
                <button onClick={startMusic}
                        className="inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-full text-[11px] lg:text-xs font-semibold transition-all hover:scale-[1.04] active:scale-[0.97]"
                        style={{
                          color: '#9F4F58',
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(253,247,243,0.88) 100%)',
                          backdropFilter: 'blur(14px)',
                          border: '1px solid rgba(200,104,110,0.18)',
                          boxShadow: '0 3px 12px rgba(200,104,110,0.10), 0 1px 3px rgba(160,80,90,0.05), inset 0 1px 0 rgba(255,255,255,0.95)',
                        }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zm12-3c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z" /></svg>
                  Müzik Çal
                </button>
              )
            )}

            {/* İzleyici sayısı — glass pill (stream aktif iken yeşil çevrimiçi nokta) */}
            <span className="inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-full text-[11px] lg:text-xs font-semibold"
                  style={{
                    color: '#6B5A5A',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(253,247,243,0.88) 100%)',
                    backdropFilter: 'blur(14px)',
                    border: '1px solid rgba(200,104,110,0.18)',
                    boxShadow: '0 3px 12px rgba(200,104,110,0.10), 0 1px 3px rgba(160,80,90,0.05), inset 0 1px 0 rgba(255,255,255,0.95)',
                  }}>
              <span className="relative inline-flex">
                <svg className="w-3.5 h-3.5" style={{ color: '#C8686E' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {streamData?.status === 'active' && (
                  <span aria-label="Çevrimiçi"
                        className="absolute -top-0.5 -right-0.5 w-[7px] h-[7px] rounded-full ring-[1.5px] ring-white animate-pulse"
                        style={{ background: '#22C55E', boxShadow: '0 0 4px rgba(34,197,94,0.6)' }} />
                )}
              </span>
              <span className="tabular-nums">{streamData?.status === 'active' ? liveViewerCount : viewerCount}</span>
              <span className="hidden sm:inline">{streamData?.status === 'active' ? 'izliyor' : 'davetli'}</span>
            </span>

            {/* Concierge "?" trigger — minimal premium yardım tetikleyici */}
            <button
              onClick={() => setShowConciergeSheet(true)}
              aria-label="Yardım"
              className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-all hover:scale-[1.06] active:scale-[0.94]"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(253,247,243,0.88) 100%)',
                backdropFilter: 'blur(14px)',
                border: '1px solid rgba(200,104,110,0.18)',
                boxShadow: '0 3px 12px rgba(200,104,110,0.10), 0 1px 3px rgba(160,80,90,0.05), inset 0 1px 0 rgba(255,255,255,0.95)',
              }}>
              <svg className="w-[20px] h-[20px]" fill="none" stroke="#9F4F58" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M8.5 9c0-2 1.6-3.5 3.5-3.5s3.5 1.5 3.5 3.5c0 1.6-1.2 2.4-2.3 3-0.7 0.4-1.2 0.9-1.2 1.8v0.7" />
                <circle cx="12" cy="18" r="1.1" fill="#9F4F58" stroke="none" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* 3 PANEL LAYOUT */}
      <div className="max-w-[1600px] mx-auto pt-3 px-3 pb-32 lg:p-5 lg:pb-5">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-5">

          {/* SOL PANEL - Çift Bilgisi (%20) */}
          <div ref={leftPanelRef} className="hidden lg:flex flex-col w-[220px] flex-shrink-0 gap-3">
            {/* Çift Kartı */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', boxShadow: '0 2px 16px rgba(0,0,0,0.03)', border: '1px solid rgba(255,255,255,0.6)' }}>
              <div className="text-center">
                {event.couple_photo_url ? (
                  <img src={event.couple_photo_url} alt="Çift" className="w-16 h-16 mx-auto rounded-full object-cover shadow-sm mb-3" style={{ border: '2px solid rgba(200,104,110,0.15)' }} />
                ) : (
                  <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3" style={{ background: '#FDF5F5', border: '2px solid rgba(200,104,110,0.15)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C8686E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                )}
                <h2 className="text-gray-900 font-bold text-[17px] mb-0.5">{event.bride_first_name} & {event.groom_first_name}</h2>
                <p className="text-gray-500 text-[13px]">{event.event_type === 'dugun' ? 'Düğün Töreni' : 'Nikah Töreni'}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50 space-y-2">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {eventDate}
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {eventTime}
                </div>
              </div>
            </div>

            {/* Aile Bilgisi */}
            <div className="rounded-2xl p-5 space-y-3 flex-1" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', boxShadow: '0 2px 16px rgba(0,0,0,0.03)', border: '1px solid rgba(255,255,255,0.6)' }}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#C8686E' }}>Gelin Ailesi</p>
                <p className="text-gray-600 text-[13px]">{event.bride_father_name && event.bride_mother_name ? `${event.bride_father_name} & ${event.bride_mother_name}` : event.bride_father_name || event.bride_mother_name || '-'}</p>
              </div>
              <div className="flex justify-center"><div className="w-[85%] h-[1.5px]" style={{ background: 'linear-gradient(to right, transparent, rgba(200,104,110,0.2), transparent)' }} /></div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#C8686E' }}>Damat Ailesi</p>
                <p className="text-gray-600 text-[13px]">{event.groom_father_name && event.groom_mother_name ? `${event.groom_father_name} & ${event.groom_mother_name}` : event.groom_father_name || event.groom_mother_name || '-'}</p>
              </div>
            </div>

            {/* "Sende bu mutlu gününü..." CTA — sol panel altına alındı */}
            <div className="rounded-2xl p-5 flex flex-col items-center text-center gap-3" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', border: '1px solid rgba(200,104,110,0.12)' }}>
              <p className="text-sm font-semibold leading-snug">
                <span className="text-gray-800">Sende bu mutlu gününü </span>
                <span style={{ color: '#C8686E' }}>Canlı Yayınlamak</span>
                <span className="text-gray-800"> ister misin?</span>
              </p>
              <button onClick={() => setShowAppPopup(true)} className="w-full px-6 py-2.5 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02] border-2" style={{ borderColor: 'rgba(200,104,110,0.25)', color: '#C8686E', background: 'rgba(255,255,255,0.9)' }}>
                Hemen Başla !
              </button>
            </div>
          </div>

          {/* ORTA + SAĞ PANEL WRAPPER */}
          <div className="flex-1 min-w-0 flex flex-col lg:flex-row lg:items-stretch gap-4 lg:gap-5">
          {/* ORTA ALAN - Video (%55) — mobilde display:contents, masaüstünde normal block */}
          <div className="contents lg:block lg:flex-1 lg:min-w-0">
            {/* Video container — mobilde sticky top:60px, masaüstünde normal */}
            <div className={`max-lg:sticky max-lg:top-[60px] max-lg:z-30 bg-black overflow-hidden relative ${isFullscreen ? 'rounded-none' : 'rounded-2xl aspect-video'}`} style={isFullscreen ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, width: '100vw', height: '100vh' } : { boxShadow: '0 10px 50px rgba(200,104,110,0.1), 0 4px 20px rgba(0,0,0,0.08), 0 0 80px rgba(255,180,180,0.06)' }}>

              {/* Rotation prompt — fullscreen + portrait olduğunda, 3 saniye sonra fade */}
              {isFullscreen && showRotationPrompt && (
                <>
                  <style>{`
                    @keyframes rotPromptFade { 0% { opacity: 0; } 8% { opacity: 1; } 75% { opacity: 1; } 100% { opacity: 0; } }
                    @keyframes rotIconSpin { 0%, 100% { transform: rotate(-15deg); } 50% { transform: rotate(75deg); } }
                  `}</style>
                  <div className="absolute inset-0 z-[10001] flex items-center justify-center pointer-events-none"
                       style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', animation: 'rotPromptFade 3s ease forwards' }}>
                    <div className="text-center text-white px-8">
                      <svg className="w-20 h-20 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ animation: 'rotIconSpin 1.8s ease-in-out infinite' }}>
                        <rect x="5" y="2" width="14" height="20" rx="2.5" />
                        <line x1="5" y1="18" x2="19" y2="18" />
                        <circle cx="12" cy="20" r="0.8" fill="currentColor" />
                      </svg>
                      <p className="text-lg font-semibold tracking-wide">Ekranınızı Yan Çevirin</p>
                    </div>
                  </div>
                </>
              )}

              {/* Persistent rotation hint — 5s sonra portrait kaldıysa üst sağda kalıcı */}
              {isFullscreen && showPersistentRotation && !showRotationPrompt && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[10000] inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-[11px] pointer-events-none"
                     style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="6" y="3" width="12" height="18" rx="2" />
                    <line x1="6" y1="17" x2="18" y2="17" />
                  </svg>
                  <span>Daha iyi görüntü için ekranı çevirin</span>
                </div>
              )}

              {/* Fullscreen toggle button */}
              <button onClick={async () => { const next = !isFullscreen; setIsFullscreen(next); if (next) { try { await document.documentElement.requestFullscreen?.(); (screen.orientation as any)?.lock?.('landscape').catch(() => {}); } catch {} } else { try { document.exitFullscreen?.(); (screen.orientation as any)?.unlock?.(); } catch {} setFsTebrikMenu(false); setFsTebrikPanel(null); setFsGoldMode(false); } }} className="absolute bottom-3 right-5 z-40 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
                {isFullscreen ? (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" /></svg>
                ) : (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                )}
              </button>

              {/* Altın listesi rotation banner KALDIRILDI — kullanıcı isteği üzerine sağ üst boş kaldı,
                  videoNotification (join/gold/message/video/voice) artık aynı pozisyonda görünür */}

              {/* Fullscreen floating action bar */}
              {isFullscreen && !fsGoldMode && (
                <div className="fixed bottom-4 lg:bottom-8 flex items-center gap-1.5 lg:gap-2.5 p-1.5 lg:p-2.5 rounded-[16px] lg:rounded-[20px]" style={{ zIndex: 10001, left: '50%', transform: 'translateX(-50%)', background: 'rgba(20,15,10,0.75)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                  {/* Altın Tak */}
                  <button onClick={() => setFsGoldMode(true)} className="flex items-center gap-2 px-4 py-2 lg:px-4 lg:py-3 rounded-2xl transition-all hover:scale-[1.03] hover:brightness-110" style={{ background: 'linear-gradient(135deg, rgba(60,45,20,0.9), rgba(40,30,15,0.9))', border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
                    <Image src="/altintak.png" alt="" width={40} height={40} className="w-7 h-7 lg:w-10 lg:h-10 object-contain flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-[11px] lg:text-[13px] font-bold whitespace-nowrap" style={{ color: '#E8D5A0' }}>Altın Tak</div>
                      <div className="text-[8px] lg:text-[10px] whitespace-nowrap" style={{ color: 'rgba(232,213,160,0.5)' }}>Çifte altın gönder</div>
                    </div>
                  </button>
                  {/* İzleyici */}
                  <div className="flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </div>
                    <div className="text-left">
                      <div className="text-[11px] lg:text-[13px] font-bold text-white whitespace-nowrap">{viewerCount.toLocaleString()} kişi</div>
                      <div className="text-[9px] lg:text-[10px] text-white/40 whitespace-nowrap">Canlı izliyor</div>
                    </div>
                  </div>
                  {/* Tebrik Mesajı */}
                  <div className="relative">
                    <button onClick={() => setFsTebrikMenu(!fsTebrikMenu)} className="flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-3 rounded-2xl transition-all hover:scale-[1.03] hover:brightness-110" style={{ background: fsTebrikMenu ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
                      <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(200,104,110,0.2), rgba(180,70,80,0.15))', boxShadow: '0 2px 8px rgba(200,104,110,0.15)' }}>
                        <svg className="w-4 h-4" style={{ color: '#E8888E' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                      </div>
                      <div className="text-left">
                        <div className="text-[11px] lg:text-[13px] font-bold text-white whitespace-nowrap">Tebrik Gönder</div>
                      </div>
                    </button>
                    {/* Tebrik alt menü */}
                    {fsTebrikMenu && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 flex flex-col gap-2 p-2.5 rounded-2xl animate-scale-in" style={{ background: 'rgba(20,15,10,0.85)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 12px 40px rgba(0,0,0,0.4)', minWidth: '200px' }}>
                        <button onClick={() => { setFsTebrikMenu(false); setFsTebrikPanel('video'); }} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-[1.02]" style={{ background: 'rgba(180,70,80,0.12)', border: '1px solid rgba(180,70,80,0.15)' }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(180,70,80,0.15)' }}>
                            <svg className="w-4 h-4" style={{ color: '#E8888E' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          </div>
                          <div className="text-left">
                            <div className="text-[12px] font-semibold text-white">Video Tebrik</div>
                            <div className="text-[10px] text-white/35">30sn video mesaj</div>
                          </div>
                        </button>
                        <button onClick={() => { setFsTebrikMenu(false); setFsTebrikPanel('voice'); }} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-[1.02]" style={{ background: 'rgba(111,175,207,0.12)', border: '1px solid rgba(111,175,207,0.15)' }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(111,175,207,0.15)' }}>
                            <svg className="w-4 h-4" style={{ color: '#8EC8E4' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                          </div>
                          <div className="text-left">
                            <div className="text-[12px] font-semibold text-white">Sesli Tebrik</div>
                            <div className="text-[10px] text-white/35">Sesli mesaj gönderin</div>
                          </div>
                        </button>
                        <button onClick={() => { setFsTebrikMenu(false); setFsTebrikPanel('message'); }} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-[1.02]" style={{ background: 'rgba(76,175,80,0.12)', border: '1px solid rgba(76,175,80,0.15)' }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(76,175,80,0.15)' }}>
                            <svg className="w-4 h-4" style={{ color: '#7ED687' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                          </div>
                          <div className="text-left">
                            <div className="text-[12px] font-semibold text-white">Tebrik Mesajı</div>
                            <div className="text-[10px] text-white/35">Yazılı tebrik bırakın</div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Müzik */}
                  {hasMusicSelected && (
                    <button onClick={isMusicPlaying ? toggleMusicMute : startMusic} className="w-[40px] h-[40px] lg:w-[52px] lg:h-[52px] rounded-2xl flex items-center justify-center transition-all hover:scale-[1.08]" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {isMusicPlaying && !musicMuted ? (
                        <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                      ) : (
                        <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                      )}
                    </button>
                  )}
                </div>
              )}
              {/* Fullscreen altın seçim modu */}
              {isFullscreen && fsGoldMode && (
                <div className="fixed bottom-8 flex items-center gap-3 p-2.5 rounded-[20px]" style={{ zIndex: 10001, left: '50%', transform: 'translateX(-50%)', background: 'rgba(20,15,10,0.75)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                  {/* Geri butonu */}
                  <button onClick={() => setFsGoldMode(false)} className="flex items-center gap-2 px-4 py-3 rounded-2xl transition-all hover:scale-[1.03]" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    <span className="text-[12px] font-medium text-white/70">Geri</span>
                  </button>
                  {/* Altın butonları — TÜM kartlar AYNI BOY, nakit=tl-icon mobil ile aynı, görsel boyut normalize */}
                  {goldOptions.map((gold) => {
                    const isNakit = gold.id === 'nakit';
                    const imgSrc = isNakit ? '/tl-icon.png' : gold.image;
                    const imgBoxSize = isNakit ? 32 : 44;
                    return (
                    <button key={gold.id} onClick={() => { handleGoldSelect(gold.id); }} className="group flex flex-col items-center justify-between gap-1 px-3 py-2.5 rounded-2xl transition-all duration-300 hover:scale-[1.06] hover:-translate-y-1 relative" style={{ width: '88px', height: '108px', background: 'linear-gradient(165deg, rgba(255,253,248,0.08), rgba(248,242,232,0.05))', border: '1px solid rgba(212,175,55,0.12)', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 35px rgba(212,175,55,0.25), 0 4px 12px rgba(0,0,0,0.15)'; e.currentTarget.style.border = '1px solid rgba(212,175,55,0.3)'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'; e.currentTarget.style.border = '1px solid rgba(212,175,55,0.12)'; }}>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" style={{ background: 'radial-gradient(circle at 50% 30%, rgba(212,175,55,0.15), transparent 70%)' }} />
                      <div className="relative w-11 h-11 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <div className="relative" style={{ width: `${imgBoxSize}px`, height: `${imgBoxSize}px` }}>
                          <Image src={imgSrc} alt={gold.name} fill className="object-contain drop-shadow-md" />
                        </div>
                      </div>
                      <div className="text-[10px] font-semibold text-white/80 leading-tight text-center min-h-[12px]">{gold.name}</div>
                      {gold.price > 0 ? (
                        <div className="text-[10px] font-bold" style={{ color: '#D4AF37' }}>{'\u20BA'}{gold.price.toLocaleString()}</div>
                      ) : (
                        <div className="text-[10px] text-white/30">Serbest</div>
                      )}
                    </button>
                    );
                  })}
                </div>
              )}
              {/* Fullscreen video tebrik popup - sağ alt */}
              {isFullscreen && fsTebrikPanel === 'video' && event && (
                <div className="absolute bottom-20 right-4 z-50 w-[320px] lg:w-[380px] max-h-[70vh] rounded-2xl overflow-hidden" style={{ background: 'rgba(20,15,10,0.85)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', cursor: 'move' }} onMouseDown={(e) => { const el = e.currentTarget; const startX = e.clientX - el.offsetLeft; const startY = e.clientY - el.offsetTop; const move = (ev: MouseEvent) => { el.style.left = (ev.clientX - startX) + 'px'; el.style.top = (ev.clientY - startY) + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto'; }; const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); }} onTouchStart={(e) => { const el = e.currentTarget; const touch = e.touches[0]; const startX = touch.clientX - el.offsetLeft; const startY = touch.clientY - el.offsetTop; const move = (ev: TouchEvent) => { const t = ev.touches[0]; el.style.left = (t.clientX - startX) + 'px'; el.style.top = (t.clientY - startY) + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto'; }; const up = () => { document.removeEventListener('touchmove', move); document.removeEventListener('touchend', up); }; document.addEventListener('touchmove', move); document.addEventListener('touchend', up); }}>
                  <div className="flex items-center justify-between px-3 pt-3 pb-1 lg:px-4 lg:pt-4 lg:pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(180,70,80,0.15)' }}>
                        <svg className="w-3.5 h-3.5" style={{ color: '#E8888E' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </div>
                      <span className="text-[13px] font-bold text-white">Video Tebrik</span>
                    </div>
                    <button onClick={() => setFsTebrikPanel(null)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <svg className="w-3.5 h-3.5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="px-4 pb-4">
                    <VideoRecorder eventId={event.id} senderName={viewerName} embedded onSuccess={() => { setFsTebrikPanel(null); setVideoTebrikCount(c => c + 1); setVideoNotification({ text: `${viewerName} video tebrik gönderdi!`, type: 'video' }); setTimeout(() => setVideoNotification(null), 10000); }} onClose={() => setFsTebrikPanel(null)} onDemoBlock={isDemoEvent ? () => { setFsTebrikPanel(null); showDemoBlock(); } : undefined} />
                  </div>
                </div>
              )}
              {/* Fullscreen tebrik popup - sağ alt */}
              {isFullscreen && fsTebrikPanel === 'message' && (
                <div className="absolute bottom-20 right-4 z-50 w-[300px] lg:w-[340px] max-h-[70vh] rounded-2xl overflow-hidden" style={{ background: 'rgba(20,15,10,0.85)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', cursor: 'move' }} onMouseDown={(e) => { const el = e.currentTarget; const startX = e.clientX - el.offsetLeft; const startY = e.clientY - el.offsetTop; const move = (ev: MouseEvent) => { el.style.left = (ev.clientX - startX) + 'px'; el.style.top = (ev.clientY - startY) + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto'; }; const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); }} onTouchStart={(e) => { const el = e.currentTarget; const touch = e.touches[0]; const startX = touch.clientX - el.offsetLeft; const startY = touch.clientY - el.offsetTop; const move = (ev: TouchEvent) => { const t = ev.touches[0]; el.style.left = (t.clientX - startX) + 'px'; el.style.top = (t.clientY - startY) + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto'; }; const up = () => { document.removeEventListener('touchmove', move); document.removeEventListener('touchend', up); }; document.addEventListener('touchmove', move); document.addEventListener('touchend', up); }}>
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(76,175,80,0.15)' }}>
                        <svg className="w-3.5 h-3.5" style={{ color: '#7ED687' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      </div>
                      <span className="text-[13px] font-bold text-white">Tebrik Mesajı</span>
                    </div>
                    <button onClick={() => setFsTebrikPanel(null)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <svg className="w-3.5 h-3.5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="px-4 pb-4">
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`${event.bride_first_name} & ${event.groom_first_name} için tebrik mesajınızı yazın...`} rows={3} className="w-full px-3 py-2.5 rounded-xl outline-none text-[13px] text-white placeholder:text-white/25 resize-none" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'inherit' }} />
                    <button onClick={() => { sendMessage(); setFsTebrikPanel(null); }} disabled={!message.trim()} className="w-full mt-2.5 py-2.5 rounded-xl font-semibold text-[12px] text-white transition-all hover:scale-[1.02] disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #6DC275, #5BA865)', boxShadow: '0 4px 16px rgba(76,175,80,0.25)' }}>
                      Gönder
                    </button>
                  </div>
                </div>
              )}
              {/* Fullscreen sesli tebrik popup - sağ alt */}
              {isFullscreen && fsTebrikPanel === 'voice' && event && (
                <div className="absolute bottom-20 right-4 z-50 w-[300px] lg:w-[340px] max-h-[70vh] rounded-2xl overflow-hidden" style={{ background: 'rgba(20,15,10,0.85)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', cursor: 'move' }} onMouseDown={(e) => { const el = e.currentTarget; const startX = e.clientX - el.offsetLeft; const startY = e.clientY - el.offsetTop; const move = (ev: MouseEvent) => { el.style.left = (ev.clientX - startX) + 'px'; el.style.top = (ev.clientY - startY) + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto'; }; const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); }} onTouchStart={(e) => { const el = e.currentTarget; const touch = e.touches[0]; const startX = touch.clientX - el.offsetLeft; const startY = touch.clientY - el.offsetTop; const move = (ev: TouchEvent) => { const t = ev.touches[0]; el.style.left = (t.clientX - startX) + 'px'; el.style.top = (t.clientY - startY) + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto'; }; const up = () => { document.removeEventListener('touchmove', move); document.removeEventListener('touchend', up); }; document.addEventListener('touchmove', move); document.addEventListener('touchend', up); }}>
                  <div className="flex items-center justify-between px-3 pt-3 pb-1 lg:px-4 lg:pt-4 lg:pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(111,175,207,0.15)' }}>
                        <svg className="w-3.5 h-3.5" style={{ color: '#8EC8E4' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                      </div>
                      <span className="text-[13px] font-bold text-white">Sesli Tebrik</span>
                    </div>
                    <button onClick={() => setFsTebrikPanel(null)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <svg className="w-3.5 h-3.5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="px-4 pb-4">
                    <VoiceRecorder eventId={event.id} senderName={viewerName} embedded onSuccess={() => { setFsTebrikPanel(null); setSesliTebrikCount(c => c + 1); setVideoNotification({ text: `${viewerName} sesli tebrik gönderdi!`, type: 'voice' }); setTimeout(() => setVideoNotification(null), 10000); }} onClose={() => setFsTebrikPanel(null)} onDemoBlock={isDemoEvent ? () => { setFsTebrikPanel(null); showDemoBlock(); } : undefined} />
                  </div>
                </div>
              )}
              {/* Starting */}
              {streamData?.status === 'starting' && (
                <div className={`absolute inset-0 flex flex-col items-center justify-center ${streamData?.isTest ? 'bg-gradient-to-br from-gray-900 via-amber-950 to-gray-900' : 'bg-gradient-to-br from-[#C8686E] via-[#B85A60] to-[#A04E54]'}`}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 bg-white/10">
                    <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </div>
                  <h2 className="text-xl lg:text-2xl font-bold text-white mb-2">{streamData?.isTest ? 'Test Yayını Başlıyor' : 'Canlı Yayın Başlıyor'}</h2>
                  <p className="text-white/60 text-sm">Lütfen bekleyin...</p>
                </div>
              )}
              {/* Ended */}
              {streamData?.status === 'ended' && showEndedScreen && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#C8686E] via-[#B85A60] to-[#A04E54] z-10">
                  <h2 className="text-xl font-bold text-white mb-2">{streamData?.isTest ? 'Test Sonlandı' : 'Yayın Sonlandı'}</h2>
                  <p className="text-white/60 text-sm">{streamData?.isTest ? 'Test kaydedilmedi.' : 'Kayıt hazırlanıyor...'}</p>
                </div>
              )}
              {/* Active */}
              {streamData?.status === 'active' && streamData?.playbackId && (
                <ApiVideoPlayer liveStreamId={streamData.playbackId || undefined} videoId={streamData.videoId || undefined} isLive={true} isRecording={false} overlayInfo={{ viewerCount, isTest: streamData.isTest }} className="w-full h-full" />
              )}
              {/* Recording — çoklu segment (Bölüm 1/2/...) desteğiyle */}
              {streamData?.status === 'ended' && !showEndedScreen && !streamData?.isTest && (() => {
                const urls: string[] = Array.isArray(event?.recording_urls) ? event!.recording_urls : [];
                const ids = urls.map((u) => u.match(/\/vod\/([^/]+)/)?.[1] || '').filter(Boolean);
                const fallbackId = streamData?.videoId || undefined;
                const list = ids.length > 0 ? ids : (fallbackId ? [fallbackId] : []);
                if (list.length === 0 && !streamData?.playbackId) return null;
                const idx = Math.min(recordingSeg, Math.max(0, list.length - 1));
                const activeId = list[idx] || fallbackId;
                return (
                  <>
                    <ApiVideoPlayer liveStreamId={streamData.playbackId || undefined} videoId={activeId} isLive={false} isRecording={true} overlayInfo={{ viewerCount, isTest: streamData.isTest }} className="w-full h-full" />
                    {list.length > 1 && (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-2 py-1.5 rounded-full max-w-[80%] overflow-x-auto"
                           style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                        {list.map((_, i) => (
                          <button key={i} onClick={() => setRecordingSeg(i)}
                                  className="px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all"
                                  style={{ background: i === idx ? 'rgba(200,104,110,0.92)' : 'rgba(255,255,255,0.18)', color: '#fff' }}>
                            Bölüm {i + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
              {/* Waiting with countdown — sinematik premium */}
              {((streamData?.status === 'ended' && !showEndedScreen && streamData?.isTest) || ((!streamData?.status || streamData?.status === 'idle') && !isLive)) && (
                <div className={`absolute inset-0 flex flex-col items-center p-4 ${isFullscreen ? 'justify-start pt-8 lg:pt-14' : 'justify-center'}`}>
                  {/* Subtle pulse animation — couple ring */}
                  <style>{`
                    @keyframes ringBreath {
                      0%, 100% { box-shadow: 0 0 45px rgba(200,104,110,0.38), 0 0 22px rgba(232,165,169,0.25), 0 8px 32px rgba(0,0,0,0.50); }
                      50% { box-shadow: 0 0 60px rgba(200,104,110,0.48), 0 0 32px rgba(232,165,169,0.32), 0 8px 32px rgba(0,0,0,0.50); }
                    }
                    .couple-ring-breath { animation: ringBreath 4.5s ease-in-out infinite; }
                  `}</style>

                  {/* Layer 1: blurred background video */}
                  <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'blur(4px) brightness(0.65)', objectPosition: 'center top', animation: 'slowZoom 20s ease-in-out infinite alternate' }}><source src="/wedding-bg-video.mp4" type="video/mp4" /></video>

                  {/* Layer 2: vertical gradient (top→bottom darker corners) */}
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.12) 40%, rgba(0,0,0,0.18) 60%, rgba(0,0,0,0.62) 100%)' }} />

                  {/* Layer 3: vignette — köşeler koyu (sinematik) */}
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 100%)' }} />

                  {/* Layer 4: warm rose radial center (sıcak ışık) */}
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(232,165,169,0.16) 0%, rgba(200,104,110,0.06) 30%, transparent 70%)' }} />

                  <div className={`relative z-10 flex flex-col items-center ${isFullscreen ? 'pt-0' : 'pt-6 lg:pt-10'}`}>
                    {/* Çift fotoğrafı — +%20 büyük, breathing glow ring */}
                    <div className="relative mb-3 lg:mb-5 rounded-full couple-ring-breath" style={{ background: 'linear-gradient(135deg, #E8A5A9 0%, #C8686E 30%, #A85359 60%, #C8686E 80%, #E8A5A9 100%)', padding: '1px' }}>
                      {event.couple_photo_url ? (
                        <img src={event.couple_photo_url} alt="Çift" className="rounded-full object-cover block w-[96px] h-[96px] lg:w-[192px] lg:h-[192px]" />
                      ) : (
                        <div className="rounded-full flex items-center justify-center w-[96px] h-[96px] lg:w-[192px] lg:h-[192px]" style={{ background: '#FDF5F5' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="40%" height="40%" viewBox="0 0 24 24" fill="none" stroke="#C8686E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Çift isimleri — daha zarif: ince + bir tık küçük */}
                    <h3 className="text-white text-2xl lg:text-[34px] font-medium mb-0.5 lg:mb-1" style={{ textShadow: '0 2px 14px rgba(0,0,0,0.78), 0 0 26px rgba(200,104,110,0.22)', letterSpacing: '0.5px', lineHeight: 1.1 }}>
                      {event.bride_first_name} & {event.groom_first_name}
                    </h3>

                    {/* Subtitle — ince italic (Playfair kalsın) */}
                    <p className="italic text-white/70 text-[12px] lg:text-[14px] mb-2 lg:mb-3 tracking-[0.4px]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontWeight: 400, textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
                      En özel anlar, birlikte yaşanır
                    </p>

                    {/* Countdown boxes — site default font + yukarı çekildi */}
                    <div className="flex gap-3 lg:gap-4">
                      {[{ v: countdown.days, l: 'Gün' }, { v: countdown.hours, l: 'Saat' }, { v: countdown.minutes, l: 'Dk' }, { v: countdown.seconds, l: 'Sn' }].map((c, i) => (
                        <div key={i} className="relative backdrop-blur-xl rounded-xl px-3 py-2.5 lg:px-5 lg:py-4 text-center min-w-[54px] lg:min-w-[68px] transition-transform hover:scale-[1.04] overflow-hidden"
                             style={{
                               background: 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 100%)',
                               border: '1px solid rgba(255,255,255,0.18)',
                               boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.20), inset 0 0 20px rgba(200,104,110,0.08), 0 8px 24px rgba(0,0,0,0.30), 0 0 18px rgba(200,104,110,0.10)',
                             }}>
                          {/* Üst ışık layer */}
                          <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ height: '40%', background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 100%)' }} />
                          <div className="relative text-2xl lg:text-4xl font-bold text-white drop-shadow-lg tabular-nums" style={{ letterSpacing: '0.5px' }}>{c.v}</div>
                          <div className="relative text-[9px] lg:text-[10px] text-white/55 uppercase tracking-[1.2px] mt-1">{c.l}</div>
                        </div>
                      ))}
                    </div>

                  </div>
                </div>
              )}
              {/* Video notification popup - Premium
                  Wrapper: scale (outer, animation YOK - .video-notification içerideki div'de)
                  Inner: animation + sizing
                  Mobil non-fullscreen %50 küçük, fullscreen ya da masaüstü full size. */}
              {videoNotification && (
                <div
                  className={`absolute top-3 right-5 z-30 origin-top-right ${
                    isFullscreen ? 'scale-100' : 'scale-50 lg:scale-100'
                  }`}
                >
                <div
                  className="max-w-[380px] min-w-[260px] video-notification"
                >
                  <div className={`rounded-2xl px-4 py-3 flex items-center gap-3 relative ${videoNotification.type === 'gold' ? 'notif-gold' : ''}`} style={{
                    background: videoNotification.type === 'gold'
                      ? 'rgba(40,30,15,0.75)'
                      : videoNotification.type === 'join'
                      ? 'rgba(30,30,35,0.7)'
                      : videoNotification.type === 'voice'
                      ? 'rgba(30,30,35,0.7)'
                      : 'rgba(30,30,35,0.7)',
                    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                    border: videoNotification.type === 'gold'
                      ? '1px solid rgba(255,200,60,0.3)'
                      : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                  }}>
                    {/* Sparkle + shimmer for gold */}
                    {videoNotification.type === 'gold' && (
                      <>
                        <div className="sparkle-layer" />
                        <div className="notif-shimmer" />
                      </>
                    )}
                    {/* Left icon */}
                    <div className="w-10 h-10 flex-shrink-0 relative z-10 rounded-full flex items-center justify-center" style={{
                      border: videoNotification.type === 'gold' ? 'none' : '2px solid rgba(255,255,255,0.15)',
                      background: videoNotification.type === 'gold'
                        ? 'transparent'
                        : videoNotification.type === 'join'
                        ? 'rgba(34,197,94,0.15)'
                        : videoNotification.type === 'video'
                        ? 'rgba(200,104,110,0.15)'
                        : videoNotification.type === 'voice'
                        ? 'rgba(111,175,207,0.15)'
                        : 'rgba(76,175,80,0.15)',
                    }}>
                      {videoNotification.type === 'gold' && <Image src="/altintak.png" alt="" width={40} height={40} className="w-10 h-10 object-contain" />}
                      {videoNotification.type === 'join' && <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                      {videoNotification.type === 'video' && <svg className="w-5 h-5" style={{ color: '#E8888E' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
                      {videoNotification.type === 'voice' && <svg className="w-5 h-5" style={{ color: '#8EC8E4' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
                      {videoNotification.type === 'message' && <svg className="w-5 h-5" style={{ color: '#7ED687' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>}
                    </div>
                    {/* Content */}
                    <div className="flex-1 relative z-10 text-white">
                      <p className="text-[13px] font-semibold leading-snug">{videoNotification.text}</p>
                    </div>
                    {/* Right icon for gold */}
                    {videoNotification.type === 'gold' && (
                      <div className="flex-shrink-0 relative z-10">
                        <Image src="/altintak.png" alt="" width={40} height={40} className="w-10 h-10 object-contain" />
                      </div>
                    )}
                  </div>
                </div>
                </div>
              )}
              {/* Live overlay - üst */}
              {streamData?.status === 'active' && (
                <div className="absolute top-0 left-0 right-0 z-20 p-4" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image src="/navbar-icon.png" alt="" width={28} height={28} className="h-7 w-7 object-contain opacity-80 drop-shadow-lg" />
                      <span className="flex items-center gap-1.5 text-white px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: 'rgba(200,104,110,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.30)', boxShadow: '0 4px 14px rgba(160,80,90,0.30), inset 0 1px 0 rgba(255,255,255,0.25)' }}><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />CANLI</span>
                      <span className="text-white px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.22)' }}><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>{viewerCount}</span>
                    </div>
                  </div>
                </div>
              )}
              {/* Live overlay - alt bilgi (fullscreen'de gizli — kullanıcı isteği) */}
              {streamData?.status === 'active' && !isFullscreen && (
                <div className="absolute bottom-0 left-0 right-0 z-20 p-4" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
                  <div className="flex items-end justify-between">
                    <div className="flex items-center gap-3">
                      {event.couple_photo_url ? (
                        <img src={event.couple_photo_url} alt="Çift" className="w-10 h-10 rounded-full object-cover border border-white/20" />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,104,110,0.3)' }}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" strokeWidth={1.5} /></svg>
                        </div>
                      )}
                      <div>
                        <h3 className="text-white font-bold text-sm">{event.bride_first_name} & {event.groom_first_name}</h3>
                        <p className="text-white/50 text-xs">💍 {event.event_type === 'dugun' ? 'Düğün Töreni' : 'Nikah Töreni'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobilde Çift bilgisi + Aile kartı kaldırıldı (welcome modal'da gösteriliyor) */}

            {/* Altın Tak - Referans görsele birebir yeniden tasarım */}
            <div id="gold-section" className={`-mt-1 lg:mt-3 rounded-[20px] relative overflow-hidden ${activeMobileTab !== 'altin' ? 'max-lg:hidden' : ''}`} style={{ background: 'linear-gradient(180deg, #FBF6EB 0%, #F8F0DD 100%)', boxShadow: '0 8px 32px rgba(180,155,120,0.10), 0 2px 8px rgba(0,0,0,0.03)', border: '1px solid rgba(220,200,170,0.20)' }}>
              <style>{`
                .gold-card { transition: transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 420ms ease; }
                .gold-card:hover {
                  box-shadow:
                    0 18px 40px rgba(200,104,110,0.18),
                    0 6px 18px rgba(184,134,11,0.20),
                    inset 0 1px 0 rgba(255,255,255,1),
                    inset 0 -1px 0 rgba(184,134,11,0.14),
                    inset 0 14px 32px rgba(212,168,82,0.12),
                    0 0 0 1px rgba(200,104,110,0.16) !important;
                }
                .gold-card[data-highlight="true"]:hover {
                  box-shadow:
                    0 22px 50px rgba(184,134,11,0.30),
                    0 8px 24px rgba(200,104,110,0.20),
                    inset 0 1px 0 rgba(255,255,255,1),
                    inset 0 -1px 0 rgba(184,134,11,0.18),
                    inset 0 16px 36px rgba(212,168,82,0.18),
                    0 0 0 1px rgba(200,104,110,0.22) !important;
                }
                .gold-card:active { transform: translateY(0) scale(0.985) !important; }
                /* Specular highlight — üstten ışık vuruyor hissi */
                .gold-card::before {
                  content: '';
                  position: absolute;
                  top: 0; left: 0; right: 0;
                  height: 38%;
                  pointer-events: none;
                  background: linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 60%, transparent 100%);
                  border-radius: 16px 16px 0 0;
                  z-index: 1;
                }
                /* Subtle noise grain — Apple/Stripe-tier texture */
                .gold-card::after {
                  content: '';
                  position: absolute;
                  inset: 0;
                  pointer-events: none;
                  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='gn'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='5'/><feColorMatrix values='0 0 0 0 0.7  0 0 0 0 0.55  0 0 0 0 0.25  0 0 0 0.55 0'/></filter><rect width='140' height='140' filter='url(%23gn)'/></svg>");
                  background-size: 140px 140px;
                  opacity: 0.045;
                  mix-blend-mode: multiply;
                  border-radius: inherit;
                  z-index: 2;
                }
                .gold-card > * { position: relative; z-index: 3; }
                /* Coin soft float — yavaş, neredeyse fark edilmeyen */
                @keyframes coinFloat {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-2.5px); }
                }
                .coin-float { animation: coinFloat 4.2s ease-in-out infinite; will-change: transform; }
                .coin-float-delay-1 { animation-delay: 0.6s; }
                .coin-float-delay-2 { animation-delay: 1.2s; }
                /* Stagger fade-in for cards */
                @keyframes cardEnter {
                  from { opacity: 0; transform: translateY(8px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .card-enter { animation: cardEnter 520ms cubic-bezier(0.22, 1, 0.36, 1) both; }
                .card-enter-1 { animation-delay: 60ms; }
                .card-enter-2 { animation-delay: 120ms; }
                .card-enter-3 { animation-delay: 180ms; }
                .card-enter-4 { animation-delay: 260ms; }
                .card-enter-5 { animation-delay: 320ms; }
                /* Title shimmer — çok subtle */
                @keyframes goldShimmer {
                  0%, 100% { background-position: 0% 50%; }
                  50% { background-position: 100% 50%; }
                }
                /* Masaüstünde altın tak bölümü %20 küçük (kartlar + tüm içerik) */
                @media (min-width: 1024px) {
                  #gold-section { zoom: 0.8; }
                }
              `}</style>
              <div className="px-5 md:px-7 pt-4 pb-4">
                {/* Başlık — premium typography: "Mutlu Çifte" ince italic gri + "Altın Tak" gold gradient */}
                <div className="text-center mb-4 lg:mb-7">
                  <h2 className="flex items-center justify-center gap-3 md:gap-5" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                    <span className="flex-shrink-0 relative" style={{ width: 'clamp(36px, 10vw, 72px)', height: '2px', transform: 'translateY(4px)' }}>
                      <span className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to right, transparent 0%, rgba(184,134,11,0.85) 50%, transparent 100%)' }} />
                      <span className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to right, transparent 30%, rgba(255,240,200,0.65) 50%, transparent 70%)', filter: 'blur(0.5px)' }} />
                    </span>
                    <span className="text-[22px] md:text-[28px] whitespace-nowrap leading-none">
                      <span style={{ fontStyle: 'italic', fontWeight: 300, color: '#7A6E5F', letterSpacing: '1.2px' }}>
                        Mutlu Çifte
                      </span>
                      <span style={{ display: 'inline-block', width: '0.45em' }} />
                      <span style={{
                        fontWeight: 500,
                        letterSpacing: '1.6px',
                        background: 'linear-gradient(180deg, #D4A852 0%, #B8860B 55%, #9A6E08 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        textShadow: '0 1px 0 rgba(255,245,210,0.4)',
                      }}>
                        Altın Tak
                      </span>
                    </span>
                    <span className="flex-shrink-0 relative" style={{ width: 'clamp(36px, 10vw, 72px)', height: '2px', transform: 'translateY(4px)' }}>
                      <span className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to left, transparent 0%, rgba(184,134,11,0.85) 50%, transparent 100%)' }} />
                      <span className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to left, transparent 30%, rgba(255,240,200,0.65) 50%, transparent 70%)', filter: 'blur(0.5px)' }} />
                    </span>
                  </h2>
                </div>

                {/* Mobil: 3+2 layout. Masaüstü (lg): 5 kart yan yana — aşağıda. */}

                {/* Üst sıra: 3 kart (Çeyrek, Yarım+Popüler, Tam) — sadece mobile */}
                {(() => {
                  const topItems = goldOptions.filter(g => ['ceyrek_altin', 'yarim_altin', 'tam_altin'].includes(g.id));
                  return (
                    <div className="lg:hidden grid grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-5">
                      {topItems.map((gold, topIdx) => {
                        const isHighlight = gold.id === 'yarim_altin';
                        return (
                          <div key={gold.id} className={`relative card-enter card-enter-${topIdx + 1}`}>

                            {isHighlight && (
                              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 text-[9.5px] md:text-[11px] font-semibold px-3 py-[3px] rounded-full text-white whitespace-nowrap"
                                   style={{
                                     background: 'linear-gradient(135deg, #C8A050 0%, #B8893C 100%)',
                                     boxShadow: '0 6px 18px rgba(184,134,11,0.22), 0 2px 6px rgba(160,120,40,0.10), inset 0 1px 0 rgba(255,255,255,0.25)',
                                     letterSpacing: '0.5px',
                                     textShadow: '0 1px 1px rgba(120,80,20,0.20)',
                                   }}>
                                Popüler
                              </div>
                            )}
                            <button onClick={() => handleGoldSelect(gold.id)}
                                    className="w-full group rounded-2xl px-2.5 pt-3.5 pb-3 md:px-3.5 md:pt-4 md:pb-3.5 text-center transition-all duration-300 hover:-translate-y-1 active:translate-y-0 relative cursor-pointer overflow-hidden gold-card"
                                    data-highlight={isHighlight}
                                    style={{
                                      background: isHighlight
                                        ? 'linear-gradient(180deg, #FFFEFA 0%, #FFFAEF 100%)'
                                        : 'linear-gradient(180deg, #FFFFFF 0%, #FFFCF5 100%)',
                                      boxShadow: isHighlight
                                        ? '0 14px 38px rgba(212,168,82,0.26), 0 4px 14px rgba(184,134,11,0.14), inset 0 0 0 1px rgba(212,168,82,0.32), inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(184,134,11,0.12), inset 0 14px 32px rgba(212,168,82,0.14), inset 0 -10px 28px rgba(212,168,82,0.10)'
                                        : '0 6px 18px rgba(180,140,80,0.14), 0 2px 6px rgba(0,0,0,0.04), inset 0 0 0 1px rgba(212,168,82,0.15), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(180,140,80,0.08), inset 0 10px 20px rgba(212,168,82,0.05)',
                                      border: isHighlight ? '1.5px solid rgba(200,160,80,0.55)' : '1px solid rgba(220,200,170,0.30)',
                                    }}>
                              {/* Soft top warm glow — Popüler kartta daha belirgin */}
                              <div aria-hidden="true" className="absolute top-0 left-0 right-0 pointer-events-none"
                                   style={{
                                     height: '55%',
                                     background: isHighlight
                                       ? 'radial-gradient(ellipse at 50% 0%, rgba(212,168,82,0.24) 0%, transparent 70%)'
                                       : 'radial-gradient(ellipse at 50% 0%, rgba(212,168,82,0.10) 0%, transparent 70%)',
                                   }} />
                              {/* Bottom subtle gold reflection — sadece Popüler kart (vitrin ışığı hissi) */}
                              {isHighlight && (
                                <div aria-hidden="true" className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
                                     style={{
                                       width: '80%',
                                       height: '40%',
                                       background: 'radial-gradient(ellipse at 50% 100%, rgba(212,168,82,0.16) 0%, transparent 60%)',
                                       filter: 'blur(1px)',
                                     }} />
                              )}
                              {/* İsim — semibold + letter-spacing (premium boutique label hissi) */}
                              <div className="text-[13px] md:text-[16px] font-semibold mb-2 md:mb-2.5 whitespace-nowrap" style={{ color: '#2B2B2B', fontFamily: 'var(--font-geist-sans), Inter, sans-serif', letterSpacing: '0.4px' }}>{gold.name}</div>
                              {/* Görsel — coin float + warm rim shadow */}
                              <div className={`relative w-16 h-16 md:w-[88px] md:h-[88px] mx-auto mb-2 md:mb-2.5 group-hover:scale-110 transition-transform duration-500 coin-float coin-float-delay-${topIdx}`}>
                                {/* Warm rim glow under coin */}
                                <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
                                     style={{
                                       background: 'radial-gradient(ellipse at 50% 65%, rgba(212,168,82,0.32) 0%, rgba(212,168,82,0.10) 35%, transparent 60%)',
                                       filter: 'blur(6px)',
                                       transform: 'translateY(8%) scale(0.85)',
                                     }} />
                                <Image src={gold.image} alt={gold.name} fill className="object-contain relative" style={{ filter: 'drop-shadow(0 4px 8px rgba(184,134,11,0.28)) drop-shadow(0 1px 2px rgba(100,70,20,0.18))' }} />
                              </div>
                              {/* Fiyat — gold gradient text */}
                              <div className="text-[14px] md:text-[17px] font-medium" style={{
                                letterSpacing: '0.3px',
                                fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
                                background: 'linear-gradient(180deg, #C89540 0%, #B8860B 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                              }}>
                                ₺{gold.price.toLocaleString()}
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Alt sıra: 2 yatay kart — sadece mobile */}
                <div className="lg:hidden grid grid-cols-2 gap-3 md:gap-4">
                  {goldOptions.filter(g => ['gram_altin', 'nakit'].includes(g.id)).map((gold, botIdx) => (
                    <button key={gold.id} onClick={() => handleGoldSelect(gold.id)}
                            className={`group relative rounded-2xl py-1.5 md:py-2 pl-2.5 pr-3 transition-all duration-300 hover:-translate-y-1 active:translate-y-0 flex items-center gap-2 md:gap-2.5 cursor-pointer overflow-hidden gold-card card-enter card-enter-${botIdx + 4}`}
                            style={{
                              background: 'linear-gradient(180deg, #FFFFFF 0%, #FFFCF5 100%)',
                              boxShadow: '0 6px 18px rgba(180,140,80,0.14), 0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(180,140,80,0.08), inset 0 10px 20px rgba(212,168,82,0.05)',
                              border: '1px solid rgba(220,200,170,0.30)',
                            }}>
                      {/* İkon — flex-item, SOL SABİT. Gram -%10 / TL +%10 (görsel denge) */}
                      {gold.id === 'gram_altin' ? (
                        <div className="relative w-8 h-8 md:w-9 md:h-9 flex-shrink-0 group-hover:scale-110 transition-transform duration-500">
                          <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
                               style={{ background: 'radial-gradient(ellipse at 50% 65%, rgba(212,168,82,0.28) 0%, transparent 60%)', filter: 'blur(4px)', transform: 'translateY(6%) scale(0.9)' }} />
                          <Image src="/altintakgram.png" alt="Gram Altın" fill className="object-contain relative" style={{ filter: 'drop-shadow(0 3px 6px rgba(184,134,11,0.24)) drop-shadow(0 1px 2px rgba(100,70,20,0.14))' }} />
                        </div>
                      ) : (
                        <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0 group-hover:scale-110 transition-transform duration-500">
                          <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
                               style={{ background: 'radial-gradient(ellipse at 50% 65%, rgba(212,168,82,0.26) 0%, transparent 60%)', filter: 'blur(5px)', transform: 'translateY(6%) scale(0.9)' }} />
                          <Image src="/tl-icon.png" alt="Özel Miktar" fill className="object-contain relative" style={{ filter: 'drop-shadow(0 3px 6px rgba(184,134,11,0.22)) drop-shadow(0 1px 2px rgba(100,70,20,0.12))' }} />
                        </div>
                      )}
                      {/* Text bloğu — sağ flex-1 dikey ortalı, sola hizalı (icon ile yan yana) */}
                      <div className="flex-1 flex flex-col items-start min-w-0">
                        <div className="text-[13px] md:text-[15px] font-medium whitespace-nowrap leading-tight" style={{ color: '#8A8A8A', fontFamily: 'var(--font-geist-sans), Inter, sans-serif', letterSpacing: '0.3px' }}>
                          {gold.id === 'nakit' ? 'Özel Miktar' : gold.name}
                        </div>
                        <div className="text-[11px] md:text-[13px] font-medium whitespace-nowrap leading-tight mt-0.5" style={{
                          letterSpacing: '0.25px',
                          fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
                          background: 'linear-gradient(180deg, #C89540 0%, #B8860B 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}>
                          {gold.id === 'nakit' ? 'Siz Belirleyin' : `₺${gold.price.toLocaleString()}`}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Masaüstü 5-kart yan yana — gram, çeyrek, yarım(popüler), tam, nakit */}
                <div className="hidden lg:grid grid-cols-5 gap-3 mb-3">
                  {['gram_altin', 'ceyrek_altin', 'yarim_altin', 'tam_altin', 'nakit'].map((id, idx) => {
                    const gold = goldOptions.find(g => g.id === id);
                    if (!gold) return null;
                    const isHighlight = id === 'yarim_altin';
                    const isNakit = id === 'nakit';
                    return (
                      <div key={id} className={`relative card-enter card-enter-${idx + 1}`}>
                        {isHighlight && (
                          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 text-[11px] font-semibold px-3 py-[3px] rounded-full text-white whitespace-nowrap"
                               style={{ background: 'linear-gradient(135deg, #C8A050 0%, #B8893C 100%)', boxShadow: '0 6px 18px rgba(184,134,11,0.22), 0 2px 6px rgba(160,120,40,0.10), inset 0 1px 0 rgba(255,255,255,0.25)', letterSpacing: '0.5px', textShadow: '0 1px 1px rgba(120,80,20,0.20)' }}>
                            Popüler
                          </div>
                        )}
                        <button onClick={() => handleGoldSelect(id)}
                                className="w-full group rounded-2xl px-2.5 pt-3.5 pb-3 text-center transition-all duration-300 hover:-translate-y-1 active:translate-y-0 relative cursor-pointer overflow-hidden gold-card"
                                data-highlight={isHighlight}
                                style={{
                                  background: isHighlight
                                    ? 'linear-gradient(180deg, #FFFEFA 0%, #FFFAEF 100%)'
                                    : 'linear-gradient(180deg, #FFFFFF 0%, #FFFCF5 100%)',
                                  boxShadow: isHighlight
                                    ? '0 14px 38px rgba(212,168,82,0.26), 0 4px 14px rgba(184,134,11,0.14), inset 0 0 0 1px rgba(212,168,82,0.32), inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(184,134,11,0.12), inset 0 14px 32px rgba(212,168,82,0.14), inset 0 -10px 28px rgba(212,168,82,0.10)'
                                    : '0 6px 18px rgba(180,140,80,0.14), 0 2px 6px rgba(0,0,0,0.04), inset 0 0 0 1px rgba(212,168,82,0.15), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(180,140,80,0.08), inset 0 10px 20px rgba(212,168,82,0.05)',
                                  border: isHighlight ? '1.5px solid rgba(200,160,80,0.55)' : '1px solid rgba(220,200,170,0.30)',
                                }}>
                          <div aria-hidden="true" className="absolute top-0 left-0 right-0 pointer-events-none"
                               style={{ height: '55%', background: isHighlight ? 'radial-gradient(ellipse at 50% 0%, rgba(212,168,82,0.24) 0%, transparent 70%)' : 'radial-gradient(ellipse at 50% 0%, rgba(212,168,82,0.10) 0%, transparent 70%)' }} />
                          <div className="text-[14px] font-semibold mb-2 whitespace-nowrap" style={{ color: '#2B2B2B', fontFamily: 'var(--font-geist-sans), Inter, sans-serif', letterSpacing: '0.4px' }}>
                            {isNakit ? 'Özel Miktar' : gold.name}
                          </div>
                          <div className="relative w-[68px] h-[68px] mx-auto mb-2 group-hover:scale-110 transition-transform duration-500 coin-float">
                            <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 65%, rgba(212,168,82,0.32) 0%, transparent 60%)', filter: 'blur(6px)', transform: 'translateY(8%) scale(0.85)' }} />
                            <Image src={isNakit ? '/tl-icon.png' : gold.image} alt={gold.name} fill className="object-contain relative" style={{ filter: 'drop-shadow(0 4px 8px rgba(184,134,11,0.28)) drop-shadow(0 1px 2px rgba(100,70,20,0.18))' }} />
                          </div>
                          <div className="text-[14px] font-medium" style={{
                            letterSpacing: '0.3px',
                            fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
                            background: 'linear-gradient(180deg, #C89540 0%, #B8860B 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}>
                            {isNakit ? 'Siz Belirleyin' : `₺${gold.price.toLocaleString()}`}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Trust line — minimal Apple-style: tek satır, mono ikonlar, ince yazı, supporting info (öne çıkmaz) */}
                <div className="mt-3 flex items-center justify-center gap-3 md:gap-5 px-1 flex-wrap">
                  {[
                    {
                      title: 'Güvenli Ödeme',
                      icon: (
                        <svg viewBox="0 0 24 24" className="w-[13px] h-[13px] md:w-[14px] md:h-[14px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2L4 5v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V5l-8-3z" />
                          <path d="M8.5 12.2l2.5 2.5L15.5 10" />
                        </svg>
                      ),
                    },
                    {
                      title: 'Anında',
                      icon: (
                        <svg viewBox="0 0 24 24" className="w-[13px] h-[13px] md:w-[14px] md:h-[14px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M13 2L4.5 13.5h6L9 22l8.5-11.5h-6L13 2z" />
                        </svg>
                      ),
                    },
                    {
                      title: 'Banka Transferi',
                      icon: (
                        <svg viewBox="0 0 24 24" className="w-[13px] h-[13px] md:w-[14px] md:h-[14px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 10L12 4l9 6" />
                          <path d="M5 10v8M19 10v8" />
                          <path d="M3 19h18" />
                        </svg>
                      ),
                    },
                  ].map((b, i, arr) => (
                    <Fragment key={i}>
                      <div className="inline-flex items-center gap-1.5 opacity-75" style={{ color: '#9C7E45' }}>
                        {b.icon}
                        <span className="text-[10.5px] md:text-[11.5px] font-medium whitespace-nowrap" style={{ fontFamily: 'var(--font-geist-sans), Inter, sans-serif', letterSpacing: '0.4px', color: '#7A6638' }}>
                          {b.title}
                        </span>
                      </div>
                      {i < arr.length - 1 && (
                        <span className="inline-block w-[2.5px] h-[2.5px] rounded-full" style={{ background: 'rgba(184,134,11,0.32)' }} />
                      )}
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* SAĞ PANEL - Tebrik Kartları + Galeri — mobilde display:contents, masaüstünde 320px column */}
          <div ref={rightPanelRef} className="contents lg:flex lg:w-[320px] lg:flex-shrink-0 lg:flex-col lg:gap-3 lg:min-h-0">
            {/* Mobil-only başlık — Mutlu Çifte Altın Tak / Fotoğraf Albümü ile aynı dilde (tab geçişlerinde dikey hiza smooth) */}
            <div className={`lg:hidden mb-1 ${activeMobileTab !== 'tebrik' ? 'hidden' : ''}`}>
              <div className="text-center pt-2">
                <h2 className="flex items-center justify-center gap-3" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                  <span className="flex-shrink-0 relative" style={{ width: 'clamp(36px, 10vw, 72px)', height: '2px', transform: 'translateY(4px)' }}>
                    <span className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to right, transparent 0%, rgba(200,104,110,0.85) 50%, transparent 100%)' }} />
                    <span className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to right, transparent 30%, rgba(255,220,222,0.7) 50%, transparent 70%)', filter: 'blur(0.5px)' }} />
                  </span>
                  <span className="text-[22px] whitespace-nowrap leading-none">
                    <span style={{ fontStyle: 'italic', fontWeight: 300, color: '#7A6E5F', letterSpacing: '1.2px' }}>
                      Tebrik
                    </span>
                    <span style={{ display: 'inline-block', width: '0.45em' }} />
                    <span style={{
                      fontWeight: 500,
                      letterSpacing: '1.6px',
                      background: 'linear-gradient(180deg, #D87880 0%, #C8686E 55%, #A84A52 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      textShadow: '0 1px 0 rgba(255,230,232,0.4)',
                    }}>
                      Mesajı
                    </span>
                  </span>
                  <span className="flex-shrink-0 relative" style={{ width: 'clamp(36px, 10vw, 72px)', height: '2px', transform: 'translateY(4px)' }}>
                    <span className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to left, transparent 0%, rgba(200,104,110,0.85) 50%, transparent 100%)' }} />
                    <span className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to left, transparent 30%, rgba(255,220,222,0.7) 50%, transparent 70%)', filter: 'blur(0.5px)' }} />
                  </span>
                </h2>
              </div>
            </div>

            {/* Video Tebrik - warm cream — masaüstünde sabit yükseklik (3 kart eşit) */}
            <div onClick={() => setShowVideoRecorder(true)} className={`card-enter card-enter-1 rounded-2xl p-4 lg:p-5 flex items-center gap-3 transition-all duration-200 hover:-translate-y-1 cursor-pointer lg:h-[78px] ${activeMobileTab !== 'tebrik' ? 'max-lg:hidden' : ''}`} style={{ background: 'linear-gradient(135deg, #FBF3EE, #F4E5DC)', boxShadow: '0 4px 16px rgba(150,110,90,0.08)', border: '1px solid rgba(180,70,80,0.1)' }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 25px rgba(180,70,80,0.14)'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(150,110,90,0.08)'; }}>
              <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(180,70,80,0.06)' }}>
                <svg className="w-5 h-5" style={{ color: '#B44650' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-sm whitespace-nowrap">Video Tebrik</h3>
                <p className="text-gray-400 text-[10px]">30 sn video mesaj</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 min-w-[28px] text-center" style={{ color: '#B44650', background: 'rgba(180,70,80,0.06)', border: '1px solid rgba(180,70,80,0.1)' }}>{videoTebrikCount}</span>
              <button onClick={() => setShowVideoRecorder(true)} className="text-white px-4 py-2.5 rounded-xl font-semibold text-xs flex-shrink-0 transition-all hover:scale-105 flex items-center gap-1.5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #E8A8AE, #D4757E, #C25A65)', boxShadow: '0 6px 16px rgba(196,90,101,0.28), inset 0 1px 0 rgba(255,255,255,0.4)' }}><span className="absolute inset-0 opacity-50" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 50%)' }} /><span className="relative">Gönder</span><svg className="w-3 h-3 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg></button>
            </div>

            {/* Sesli Tebrik - soft blue — sabit yükseklik */}
            <div onClick={() => setShowVoiceRecorder(true)} className={`card-enter card-enter-2 rounded-2xl p-4 lg:p-5 flex items-center gap-3 transition-all duration-200 hover:-translate-y-1 cursor-pointer lg:h-[78px] ${activeMobileTab !== 'tebrik' ? 'max-lg:hidden' : ''}`} style={{ background: 'linear-gradient(135deg, #F4F9FC, #E5EFF6)', boxShadow: '0 4px 16px rgba(111,175,207,0.10)', border: '1px solid rgba(111,175,207,0.14)' }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 25px rgba(111,175,207,0.16)'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(111,175,207,0.10)'; }}>
              <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(111,175,207,0.06)' }}>
                <svg className="w-5 h-5" style={{ color: '#6FAFCF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-sm whitespace-nowrap">Sesli Tebrik</h3>
                <p className="text-gray-400 text-[10px]">Sesli mesaj gönderin</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 min-w-[28px] text-center" style={{ color: '#6FAFCF', background: 'rgba(111,175,207,0.06)', border: '1px solid rgba(111,175,207,0.1)' }}>{sesliTebrikCount}</span>
              <button onClick={() => setShowVoiceRecorder(true)} className="text-white px-4 py-2.5 rounded-xl font-semibold text-xs flex-shrink-0 transition-all hover:scale-105 flex items-center gap-1.5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #B5DAEA, #85C4DE, #6FAFCF)', boxShadow: '0 6px 16px rgba(111,175,207,0.28), inset 0 1px 0 rgba(255,255,255,0.4)' }}><span className="absolute inset-0 opacity-50" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 50%)' }} /><span className="relative">Gönder</span><svg className="w-3 h-3 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg></button>
            </div>

            {/* Mesaj Tebrik - soft green — sabit yükseklik (sayı 2 hane olunca taşmasın) */}
            <div id="tebrik-section" onClick={() => setShowMessageModal(true)} className={`card-enter card-enter-3 rounded-2xl p-4 lg:p-5 flex items-center gap-3 transition-all duration-200 hover:-translate-y-1 cursor-pointer lg:h-[78px] ${activeMobileTab !== 'tebrik' ? 'max-lg:hidden' : ''}`} style={{ background: 'linear-gradient(135deg, #F4FAF5, #E5F0E5)', boxShadow: '0 4px 16px rgba(91,168,101,0.10)', border: '1px solid rgba(76,175,80,0.14)' }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 25px rgba(76,175,80,0.16)'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(91,168,101,0.10)'; }}>
              <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(76,175,80,0.06)' }}>
                <svg className="w-5 h-5" style={{ color: '#5BA865' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-sm whitespace-nowrap">Mesaj Tebrik</h3>
                <p className="text-gray-400 text-[10px]">Yazılı tebrik bırakın</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 min-w-[28px] text-center" style={{ color: '#5BA865', background: 'rgba(76,175,80,0.06)', border: '1px solid rgba(76,175,80,0.1)' }}>{messages.length}</span>
              <button onClick={() => setShowMessageModal(true)} className="text-white px-4 py-2.5 rounded-xl font-semibold text-xs flex-shrink-0 transition-all hover:scale-105 flex items-center gap-1.5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #A8D6B0, #6DC275, #5BA865)', boxShadow: '0 6px 16px rgba(91,168,101,0.28), inset 0 1px 0 rgba(255,255,255,0.4)' }}><span className="absolute inset-0 opacity-50" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 50%)' }} /><span className="relative">Gönder</span><svg className="w-3 h-3 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg></button>
            </div>

            {/* Nikah Albümü — yeni album kart v4 background (sadece pembe abstract bg, badgesiz) */}
            <div className={`rounded-2xl px-5 pt-4 pb-2 flex flex-col relative overflow-hidden lg:flex-1 lg:justify-between ${activeMobileTab !== 'album' ? 'max-lg:hidden' : ''}`} style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.32), rgba(255,255,255,0.32)), url(/bg-album-canli.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', boxShadow: '0 16px 44px rgba(200,140,140,0.12), 0 4px 14px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)' }}>

              {/* Header — Fotoğraf gri italic + Albümü ROSE gradient + dashlar ROSE (altın tak ile aynı dikey hiza) */}
              <div className="text-center relative z-10 mb-2 lg:mt-2">
                <h3 className="flex items-center justify-center gap-3 md:gap-5" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                  <span className="flex-shrink-0 relative" style={{ width: 'clamp(36px, 10vw, 72px)', height: '2px', transform: 'translateY(4px)' }}>
                    <span className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to right, transparent 0%, rgba(200,104,110,0.85) 50%, transparent 100%)' }} />
                    <span className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to right, transparent 30%, rgba(255,220,222,0.7) 50%, transparent 70%)', filter: 'blur(0.5px)' }} />
                  </span>
                  <span className="text-[22px] md:text-[28px] whitespace-nowrap leading-none">
                    <span style={{ fontStyle: 'italic', fontWeight: 300, color: '#7A6E5F', letterSpacing: '1.2px' }}>
                      Fotoğraf
                    </span>
                    <span style={{ display: 'inline-block', width: '0.45em' }} />
                    <span style={{
                      fontWeight: 500,
                      letterSpacing: '1.6px',
                      background: 'linear-gradient(180deg, #D87880 0%, #C8686E 55%, #A84A52 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      textShadow: '0 1px 0 rgba(255,230,232,0.4)',
                    }}>
                      Albümü
                    </span>
                  </span>
                  <span className="flex-shrink-0 relative" style={{ width: 'clamp(36px, 10vw, 72px)', height: '2px', transform: 'translateY(4px)' }}>
                    <span className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to left, transparent 0%, rgba(200,104,110,0.85) 50%, transparent 100%)' }} />
                    <span className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to left, transparent 30%, rgba(255,220,222,0.7) 50%, transparent 70%)', filter: 'blur(0.5px)' }} />
                  </span>
                </h3>
              </div>

              {/* Statik 3-foto layout — altın tak ile dengeli boy, başlığa yakın */}
              <div className="relative w-full -mt-1 mb-0 flex items-center justify-center" style={{ height: 158 }}>
                {slideshowPhotos.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {/* Boş durum — 3 ghost kart */}
                    <div className="relative w-full h-full flex items-center justify-center">
                      <div className="absolute" style={{ transform: 'translateX(-100px) rotate(-7deg)', opacity: 0.4 }}>
                        <div className="bg-white/70 p-1.5 rounded-lg border border-rose-200/50" style={{ width: 100, height: 116, boxShadow: '0 4px 10px rgba(80,60,40,0.08)' }}>
                          <div className="w-full h-full rounded-md" style={{ background: 'linear-gradient(135deg, #FBE5E7, #F5D5D8)' }} />
                        </div>
                      </div>
                      <div className="absolute" style={{ transform: 'translateX(100px) rotate(7deg)', opacity: 0.4 }}>
                        <div className="bg-white/70 p-1.5 rounded-lg border border-rose-200/50" style={{ width: 100, height: 116, boxShadow: '0 4px 10px rgba(80,60,40,0.08)' }}>
                          <div className="w-full h-full rounded-md" style={{ background: 'linear-gradient(135deg, #FBE5E7, #F5D5D8)' }} />
                        </div>
                      </div>
                      <div className="absolute z-10 bg-white/85 p-1.5 rounded-lg border border-rose-200/60 flex flex-col items-center justify-center" style={{ width: 120, height: 140, boxShadow: '0 10px 24px rgba(80,60,40,0.16)' }}>
                        <svg className="w-8 h-8 mb-1" style={{ color: '#D17075', opacity: 0.5 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <p className="text-[9px] text-center px-1.5 leading-tight" style={{ color: '#9F4F58', fontFamily: 'var(--font-geist-sans), Inter, sans-serif' }}>Çift yakında<br/>fotoğraf paylaşacak</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Sol foto — sola eğri, arka katman, daha ince beyaz çerçeve (p-1→p-0.5) */}
                    {slideshowPhotos[1] && (
                      <div onClick={() => setPhotoLightboxIndex(1)}
                           className="absolute cursor-pointer transition-transform hover:scale-[1.03]"
                           style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%) translateX(-85px) rotate(-7deg)', zIndex: 1 }}>
                        <div className="bg-white p-0.5 rounded-lg" style={{ boxShadow: '0 6px 16px rgba(80,60,40,0.20), 0 2px 6px rgba(0,0,0,0.06)' }}>
                          <img src={slideshowPhotos[1]} alt="" className="block object-cover rounded-md w-[82px] h-[94px] lg:w-[107px] lg:h-[124px]" />
                        </div>
                      </div>
                    )}

                    {/* Sağ foto — sağa eğri (play overlay kaldırıldı, video yok), daha ince çerçeve */}
                    {slideshowPhotos[2] && (
                      <div onClick={() => setPhotoLightboxIndex(2)}
                           className="absolute cursor-pointer transition-transform hover:scale-[1.03]"
                           style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%) translateX(85px) rotate(7deg)', zIndex: 1 }}>
                        <div className="bg-white p-0.5 rounded-lg" style={{ boxShadow: '0 6px 16px rgba(80,60,40,0.20), 0 2px 6px rgba(0,0,0,0.06)' }}>
                          <img src={slideshowPhotos[2]} alt="" className="block object-cover rounded-md w-[82px] h-[94px] lg:w-[107px] lg:h-[124px]" />
                        </div>
                      </div>
                    )}

                    {/* Orta foto — büyük, ön katman, 128+ badge, daha ince beyaz çerçeve (p-1.5→p-1) */}
                    {slideshowPhotos[0] && (
                      <div onClick={() => setPhotoLightboxIndex(0)}
                           className="absolute cursor-pointer transition-transform hover:scale-[1.03]"
                           style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%) translateY(-6px)', zIndex: 3 }}>
                        <div className="bg-white p-1 rounded-xl relative" style={{ boxShadow: '0 16px 36px rgba(80,60,40,0.32), 0 4px 12px rgba(0,0,0,0.10)' }}>
                          <img src={slideshowPhotos[0]} alt="" className="block object-cover rounded-lg w-[99px] h-[116px] lg:w-[130px] lg:h-[150px]" />
                          {/* Fotoğraf sayısı badge */}
                          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                               style={{ background: 'linear-gradient(135deg, #C26068, #9F4F58)', boxShadow: '0 3px 8px rgba(160,80,90,0.40), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
                            <svg className="w-3 h-3" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" fill="white" stroke="none" />
                              <path d="M21 15l-5-5L5 21" />
                            </svg>
                            <span className="text-[11px] font-bold text-white leading-none" style={{ fontFamily: 'var(--font-geist-sans), Inter, sans-serif' }}>{slideshowPhotos.length}+</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Filmstrip — 3 fotoğrafa daha yakın (-mt-2 → -mt-3), alt margin azaltıldı */}
              {slideshowPhotos.length > 0 && (
                <div className="overflow-hidden -mt-3 mb-2 relative z-10" style={{ maskImage: 'linear-gradient(to right, transparent 0, black 5%, black 95%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0, black 5%, black 95%, transparent 100%)' }}>
                  <style>{`
                    @keyframes albumFilmstripRTL {
                      0% { transform: translateX(0); }
                      100% { transform: translateX(-50%); }
                    }
                  `}</style>
                  <div style={{ display: 'flex', gap: '8px', width: 'fit-content', animation: 'albumFilmstripRTL 100s linear infinite' }}>
                    {[...slideshowPhotos, ...slideshowPhotos].map((url, i) => (
                      <div key={i}
                           onClick={() => setPhotoLightboxIndex(i % slideshowPhotos.length)}
                           className="w-[68px] h-[68px] lg:w-[77px] lg:h-[77px] flex-shrink-0 rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-105"
                           style={{ boxShadow: '0 2px 6px rgba(80,60,40,0.12)', border: '1px solid rgba(255,255,255,0.6)' }}>
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Albümü Görüntüle — ortalanmış */}
              <button onClick={() => setShowPhotoGallery(true)} disabled={slideshowPhotos.length === 0} className="self-center whitespace-nowrap inline-flex items-center justify-center gap-2 lg:gap-1.5 px-4 lg:px-3 py-2 lg:py-1.5 rounded-full font-semibold text-[12px] lg:text-[11px] transition-all hover:scale-[1.02] btn-press relative z-10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100" style={{ width: 'auto', color: '#9F4F58', background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(253,243,243,0.96) 100%)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 6px 20px rgba(200,104,110,0.16), 0 2px 6px rgba(160,80,90,0.08), inset 0 1px 0 rgba(255,255,255,0.95)', border: '1px solid rgba(232,165,169,0.45)' }}>
                <svg className="w-3.5 h-3.5 lg:w-3 lg:h-3 flex-shrink-0" fill="none" stroke="#C8686E" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span style={{ fontFamily: 'var(--font-geist-sans), Inter, sans-serif', letterSpacing: '0.2px' }}>Albümü Görüntüle</span>
                <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="#C8686E" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

          </div>
          </div>{/* end ORTA + SAĞ PANEL WRAPPER */}
        </div>
      </div>

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
            .concierge-item {
              transition: transform 220ms ease, background 280ms ease;
            }
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
            {/* Üst sol — küçük X kapatma */}
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

            {/* Mini header — wordmark logo + Destek (ana sayfa ile birebir) */}
            <div className="px-7 pt-6 pb-6" style={{ borderBottom: '1px solid rgba(232,180,170,0.18)' }}>
              <Image src="/navbar-text.png" alt="Nikahım" width={320} height={96} className="h-[40px] w-auto object-contain -ml-0.5 -mb-1" />
              <h2 className="font-bold text-[24px] leading-[1.15]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif', color: '#1F1F1F' }}>
                Destek
              </h2>
              <p className="mt-2 text-[13px]" style={{ color: '#6B5A5A' }}>
                Aklınızdaki tüm sorular için buradayız
              </p>
            </div>

            {!faqView && (
            <>

            {/* 3 öğe */}
            <div className="px-5 pb-8 space-y-2.5">
              {/* Canlı Destek */}
              <button
                onClick={() => {
                  setShowConciergeSheet(false);
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('nikahim:open-chat'));
                  }, 200);
                }}
                className="concierge-item w-full flex items-center gap-3.5 p-4 rounded-2xl text-left"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,251,247,0.85) 0%, rgba(253,243,243,0.80) 100%)',
                  border: '1px solid rgba(232,180,170,0.25)',
                  boxShadow: '0 2px 10px rgba(200,104,110,0.06), inset 0 1px 0 rgba(255,255,255,0.85)',
                }}>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                     style={{
                       background: 'linear-gradient(135deg, rgba(232,165,169,0.35), rgba(200,104,110,0.20))',
                       boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
                     }}>
                  <svg className="w-5 h-5" fill="none" stroke="#9F4F58" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M21 11.5a8.5 8.5 0 01-12.5 7.5L3 21l1.9-5.7A8.5 8.5 0 1121 11.5z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[14.5px]" style={{ color: '#1F1F1F' }}>Canlı Destek</p>
                  <p className="text-[12px] mt-0.5" style={{ color: '#8A7878' }}>Anlık sohbet ile yardım al</p>
                  <p className="text-[11px] mt-1 inline-flex items-center gap-1" style={{ color: '#3FB95A' }}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Çevrim içi
                  </p>
                </div>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#B5A8A8" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* WhatsApp — ana sayfa ConciergeSheet ile aynı */}
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

              {/* E-mail */}
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
                     style={{
                       background: 'linear-gradient(135deg, rgba(245,225,200,0.40), rgba(212,168,82,0.20))',
                       boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
                     }}>
                  <svg className="w-5 h-5" fill="none" stroke="#A0782E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <rect x="3" y="5" width="18" height="14" rx="2.5" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[14.5px]" style={{ color: '#1F1F1F' }}>E-posta</p>
                  <p className="text-[12px] mt-0.5" style={{ color: '#8A7878' }}>Sorularınızı e-posta yoluyla iletebilirsiniz.</p>
                  <p className="text-[11px] mt-1 font-medium" style={{ color: '#A0782E' }}>destek@nikahim.com</p>
                </div>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#B5A8A8" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>

              {/* SSS — inline FAQ view (sayfadan ayrılmaz) */}
              <button
                onClick={() => setFaqView(true)}
                className="concierge-item w-full flex items-center gap-3.5 p-4 rounded-2xl text-left"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,251,247,0.85) 0%, rgba(253,243,243,0.80) 100%)',
                  border: '1px solid rgba(232,180,170,0.25)',
                  boxShadow: '0 2px 10px rgba(200,104,110,0.06), inset 0 1px 0 rgba(255,255,255,0.85)',
                }}>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                     style={{
                       background: 'linear-gradient(135deg, rgba(220,210,235,0.45), rgba(160,140,200,0.18))',
                       boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
                     }}>
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

            {/* FAQ inline view — ana sayfa ConciergeSheet ile birebir aynı: kategorize + search */}
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
                <h3 className="font-bold text-[20px] mb-2" style={{ fontFamily: 'var(--font-playfair), Georgia, serif', color: '#1F1F1F' }}>
                  Sık Sorulan Sorular
                </h3>
                <p className="text-[12.5px] mb-4 leading-relaxed" style={{ color: '#6B5A5A' }}>
                  Aradığınız cevabı saniyeler içinde bulun.
                </p>

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

                {faqSearchQuery && (
                  <p className="text-[11.5px] mb-3" style={{ color: '#8A7878' }}>
                    {totalFaqResults > 0 ? `${totalFaqResults} sonuç bulundu` : 'Sonuç bulunamadı'}
                  </p>
                )}

                {faqSearchQuery && totalFaqResults === 0 && (
                  <div className="rounded-2xl p-5 text-center"
                       style={{ background: 'linear-gradient(135deg, #FBEEEC 0%, #FDF5F2 100%)', border: '1px solid rgba(200,104,110,0.18)' }}>
                    <p className="text-[13px] font-semibold mb-1" style={{ color: '#1F1F1F' }}>Aradığınızı bulamadınız mı?</p>
                    <p className="text-[12px] mb-3" style={{ color: '#6B5A5A' }}>Ekibimiz size yardımcı olmaktan mutluluk duyar.</p>
                    <button onClick={() => { setShowConciergeSheet(false); setTimeout(() => { window.dispatchEvent(new CustomEvent('nikahim:open-chat')); }, 200); }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-[12.5px] font-semibold transition-all hover:scale-[1.03]"
                            style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)', boxShadow: '0 4px 14px rgba(200,104,110,0.25)' }}>
                      Canlı Destek Aç
                    </button>
                  </div>
                )}

                {filteredFaqCategories.map((category, ci) => (
                  <div key={category.title} className={ci === 0 ? '' : 'mt-5'}>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#C8686E' }} />
                      <h4 className="text-[12px] font-bold uppercase tracking-[0.8px]" style={{ color: '#9F4F58' }}>{category.title}</h4>
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
                               }}>
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

            {/* Alt watermark — ana sayfa ConciergeSheet ile birebir aynı */}
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

      {/* MOBİL FLOATING LUXURY DOCK — pill capsule + sliding rose glow + elevated middle (Altın Tak) + noise grain */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pointer-events-none"
           style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <style>{`
          @keyframes dockGoldBreath {
            0%, 100% { opacity: 0.55; transform: translateX(-50%) scale(1); }
            50% { opacity: 0.85; transform: translateX(-50%) scale(1.08); }
          }
          @keyframes dockSliderShimmer {
            0%, 100% { opacity: 0.85; }
            50% { opacity: 1; }
          }
          .dock-gold-halo { animation: dockGoldBreath 3.4s ease-in-out infinite; }
          .dock-tab { transition: color 380ms ease, transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1); }
          .dock-tab:active { transform: scale(0.94); }
          .dock-tab[data-mid="true"] { transform: translateY(-5px) scale(1.05); }
          .dock-tab[data-mid="true"]:active { transform: translateY(-5px) scale(1.00); }
          .dock-tab-icon { transition: transform 460ms cubic-bezier(0.34, 1.56, 0.64, 1), color 380ms ease; }
          .dock-tab[data-active="true"] .dock-tab-icon { transform: scale(1.12); }
          .dock-slider {
            transition: left 520ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 380ms ease;
            animation: dockSliderShimmer 2.6s ease-in-out infinite;
          }
          /* Top viewer pill entrance */
          @keyframes pillFadeIn {
            from { opacity: 0; transform: translateY(-6px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .pill-enter { animation: pillFadeIn 540ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        `}</style>

        <div className="relative max-w-[400px] mx-auto pointer-events-auto" style={{ overflow: 'visible' }}>
          {/* Permanent gold halo under middle (Altın Tak) — luxury "primary action" signal */}
          <div className="dock-gold-halo absolute left-1/2 -bottom-2 w-[120px] h-8 pointer-events-none rounded-full"
               style={{
                 background: 'radial-gradient(ellipse at center, rgba(212,168,82,0.32) 0%, rgba(212,168,82,0.10) 40%, transparent 75%)',
                 filter: 'blur(12px)',
               }} />

          <nav className="relative pointer-events-auto"
               style={{
                 background: 'linear-gradient(180deg, rgba(255,251,247,0.78) 0%, rgba(253,245,240,0.85) 100%)',
                 backdropFilter: 'blur(36px) saturate(180%)',
                 WebkitBackdropFilter: 'blur(36px) saturate(180%)',
                 borderRadius: '34px',
                 padding: '7px',
                 height: '74px',
                 boxShadow: `
                   0 22px 50px rgba(160,80,90,0.16),
                   0 8px 18px rgba(160,80,90,0.10),
                   0 2px 6px rgba(0,0,0,0.04),
                   inset 0 1px 0 rgba(255,255,255,0.95),
                   inset 0 0 0 1px rgba(232,180,170,0.20)
                 `,
                 border: '1px solid rgba(232,180,170,0.30)',
                 overflow: 'visible',
               }}>
            {/* Clipped layer — noise + sliding glow indicator (rounded mask) */}
            <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: '34px', overflow: 'hidden' }}>
              {/* Subtle noise/grain — Apple/Stripe-tier premium texture */}
              <div className="absolute inset-0 pointer-events-none"
                   style={{
                     backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='3'/><feColorMatrix values='0 0 0 0 0.8  0 0 0 0 0.7  0 0 0 0 0.7  0 0 0 0.6 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>\")",
                     backgroundSize: '160px 160px',
                     opacity: 0.035,
                     mixBlendMode: 'multiply',
                   }} />

              {/* Sliding rose glow indicator — soft halo, tab değişiminde kayar */}
              {(() => {
                const order: Array<'tebrik' | 'altin' | 'album'> = ['tebrik', 'altin', 'album'];
                const idx = order.indexOf(activeMobileTab);
                return (
                  <div className="dock-slider absolute top-1 bottom-1 pointer-events-none rounded-[26px]"
                       style={{
                         left: `calc(${idx * 33.333}% + 6px)`,
                         width: 'calc(33.333% - 12px)',
                         background: 'radial-gradient(ellipse at center, rgba(200,104,110,0.22) 0%, rgba(200,104,110,0.12) 45%, transparent 80%)',
                         filter: 'blur(10px)',
                       }} />
                );
              })()}
            </div>

            {/* Top gold accent line */}
            <div className="absolute -top-px left-16 right-16 h-px pointer-events-none"
                 style={{ background: 'linear-gradient(90deg, transparent, rgba(212,168,82,0.55) 50%, transparent)' }} />

            {/* Tabs container */}
            <div className="relative h-full flex items-stretch gap-0">
              {[
                { id: 'tebrik' as const, label: 'Tebrik', isMid: false, icon: (
                  <svg className="dock-tab-icon w-[24px] h-[24px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M21 11.5a8.5 8.5 0 01-12.5 7.5L3 21l1.9-5.7A8.5 8.5 0 1121 11.5z" />
                    <path d="M12 14.5s-2.8-1.6-2.8-3.5c0-0.95 0.85-1.7 1.8-1.7 0.55 0 1 0.3 1 0.3s0.45-0.3 1-0.3c0.95 0 1.8 0.75 1.8 1.7 0 1.9-2.8 3.5-2.8 3.5z" fill="currentColor" stroke="none" />
                  </svg>
                ) },
                { id: 'altin' as const, label: 'Altın Tak', isMid: true, icon: (
                  <svg className="dock-tab-icon w-[27px] h-[27px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    {/* Kurdele */}
                    <path d="M8 7.5L6 4h2.5L10 2 11.5 3.5 12.5 2 14 3.5 15.5 2 18 4l-2 3.5" />
                    {/* Madeni */}
                    <circle cx="12" cy="14.5" r="5.5" />
                    {/* Yıldız vurgu (luxury accent, içte) */}
                    <path d="M12 12.2l0.55 1.1 1.2 0.17-0.87 0.84 0.2 1.19L12 14.93l-1.07 0.57 0.2-1.19-0.87-0.84 1.2-0.17z" fill="currentColor" stroke="none" />
                  </svg>
                ) },
                { id: 'album' as const, label: 'Albüm', isMid: false, icon: (
                  <svg className="dock-tab-icon w-[24px] h-[24px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <rect x="3" y="5" width="18" height="15" rx="2.5" />
                    <circle cx="8.5" cy="10.5" r="1.5" />
                    <path d="M3 17l5-5 3.5 3.5L15 12l6 6" />
                  </svg>
                ) },
              ].map((tab) => {
                const isActive = activeMobileTab === tab.id;
                return (
                  <button key={tab.id}
                          data-active={isActive}
                          data-mid={tab.isMid}
                          onClick={() => { setActiveMobileTab(tab.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          aria-label={tab.label}
                          className="dock-tab relative flex-1 flex flex-col items-center justify-center gap-0.5 rounded-[26px]"
                          style={{
                            color: isActive ? '#9F4F58' : (tab.isMid ? '#8F5A3D' : '#9A8989'),
                            opacity: isActive ? 1 : 0.88,
                          }}>
                    <span className="relative z-10">{tab.icon}</span>
                    <span className="relative z-10 text-[10.5px] font-semibold uppercase whitespace-nowrap"
                          style={{ letterSpacing: '0.7px' }}>
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </div>

      {/* Photo Gallery Popup */}
      {showPhotoGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowPhotoGallery(false)} style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="rounded-3xl max-w-xl w-full max-h-[88vh] overflow-hidden relative flex flex-col" onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(180deg, #FFFCF7 0%, #FFF7EE 100%)', boxShadow: '0 25px 80px rgba(0,0,0,0.2)', border: '1px solid rgba(232,180,170,0.40)' }}>
            <button onClick={() => setShowPhotoGallery(false)} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-rose-50 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="p-5 pb-3 flex-shrink-0">
              <div className="flex items-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-[13px]" style={{ color: '#9F4F58', background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(253,243,243,0.96) 100%)', boxShadow: '0 4px 14px rgba(200,104,110,0.14), 0 1px 4px rgba(160,80,90,0.06), inset 0 1px 0 rgba(255,255,255,0.95)', border: '1px solid rgba(232,165,169,0.45)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="#C8686E" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span style={{ fontFamily: 'var(--font-geist-sans), Inter, sans-serif', letterSpacing: '0.2px' }}>Fotoğraf Albümü</span>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 overflow-y-auto flex-1">
              {slideshowPhotos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2.5">
                  {slideshowPhotos.map((url, i) => {
                    const liked = likedByMe.has(url);
                    const count = photoLikes[url] || 0;
                    return (
                      <div key={i} onClick={() => setPhotoLightboxIndex(i)} className="aspect-square rounded-xl overflow-hidden transition-all hover:scale-105 cursor-pointer relative bg-white p-[3px]" style={{ border: '1.5px solid rgba(200,104,110,0.35)', boxShadow: '0 3px 10px rgba(200,104,110,0.10)' }}>
                        <img src={url} alt="" className="w-full h-full object-cover rounded-md" />
                        {count > 0 && (
                          <div className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}>
                            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill={liked ? '#E26B72' : 'white'} stroke={liked ? '#E26B72' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                            </svg>
                            <span className="text-white text-[10px] font-semibold tabular-nums">{count}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 mx-auto opacity-15 mb-2" style={{ color: '#C8686E' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-sm text-gray-400">Henüz fotoğraf eklenmedi</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {photoLightboxIndex !== null && slideshowPhotos[photoLightboxIndex] && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setPhotoLightboxIndex(null)}
          onTouchStart={(e) => { lightboxTouchStartRef.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            const diff = e.changedTouches[0].clientX - lightboxTouchStartRef.current;
            if (Math.abs(diff) > 50) {
              if (diff > 0 && photoLightboxIndex > 0) setPhotoLightboxIndex(photoLightboxIndex - 1);
              else if (diff < 0 && photoLightboxIndex < slideshowPhotos.length - 1) setPhotoLightboxIndex(photoLightboxIndex + 1);
            }
          }}
        >
          <button onClick={(e) => { e.stopPropagation(); setPhotoLightboxIndex(null); }} className="absolute top-6 right-6 w-11 h-11 rounded-full flex items-center justify-center text-white" style={{ background: 'rgba(0,0,0,0.5)' }} aria-label="Kapat">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img src={slideshowPhotos[photoLightboxIndex]} alt="" className="max-w-[92%] max-h-[85%] object-contain" onClick={(e) => e.stopPropagation()} />
          {photoLightboxIndex > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setPhotoLightboxIndex(photoLightboxIndex - 1); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center text-white" style={{ background: 'rgba(0,0,0,0.5)' }} aria-label="Önceki">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          {photoLightboxIndex < slideshowPhotos.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setPhotoLightboxIndex(photoLightboxIndex + 1); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center text-white" style={{ background: 'rgba(0,0,0,0.5)' }} aria-label="Sonraki">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-white text-sm font-semibold" style={{ background: 'rgba(0,0,0,0.5)' }}>
            {photoLightboxIndex + 1} / {slideshowPhotos.length}
          </div>
          {/* Like butonu — sol alt, alt sayaç ile dengeli */}
          {(() => {
            const url = slideshowPhotos[photoLightboxIndex];
            const liked = likedByMe.has(url);
            const count = photoLikes[url] || 0;
            return (
              <button onClick={(e) => { e.stopPropagation(); togglePhotoLike(url); }}
                      aria-label={liked ? 'Beğenildi' : 'Beğen'}
                      className="absolute bottom-8 left-6 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all hover:scale-105 active:scale-95"
                      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
                <svg className="w-5 h-5 transition-all duration-300" viewBox="0 0 24 24"
                     fill={liked ? '#E26B72' : 'none'}
                     stroke={liked ? '#E26B72' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                     style={{ filter: liked ? 'drop-shadow(0 0 6px rgba(226,107,114,0.45))' : 'none', transform: liked ? 'scale(1.08)' : 'scale(1)' }}>
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
                <span className="text-white text-sm font-semibold tabular-nums">{count}</span>
              </button>
            );
          })()}
        </div>
      )}

      {showVideoRecorder && event && (
        <VideoRecorder eventId={event.id} senderName={viewerName} onSuccess={() => { setShowVideoRecorder(false); setVideoTebrikCount(c => c + 1); setVideoNotification({ text: `${viewerName} video tebrik gönderdi!`, type: 'video' }); setTimeout(() => setVideoNotification(null), 10000); }} onClose={() => setShowVideoRecorder(false)} onDemoBlock={isDemoEvent ? () => { setShowVideoRecorder(false); showDemoBlock(); } : undefined} />
      )}

      {showVoiceRecorder && event && (
        <VoiceRecorder eventId={event.id} senderName={viewerName} onSuccess={() => { setShowVoiceRecorder(false); setSesliTebrikCount(c => c + 1); setVideoNotification({ text: `${viewerName} sesli tebrik gönderdi!`, type: 'voice' }); setTimeout(() => setVideoNotification(null), 10000); }} onClose={() => setShowVoiceRecorder(false)} onDemoBlock={isDemoEvent ? () => { setShowVoiceRecorder(false); showDemoBlock(); } : undefined} />
      )}

      {/* Ödeme modalı açıkken telefon yan dönerse — dik tutmaya yönlendir */}
      {showPaymentModal && selectedGold && (
        <style>{`
          @media (orientation: landscape) and (max-height: 600px) {
            .nikahim-payment-landscape-lock { display: flex !important; }
            .nikahim-payment-modal-content { display: none !important; }
          }
        `}</style>
      )}
      {showPaymentModal && selectedGold && (
        <div className="nikahim-payment-landscape-lock fixed inset-0 items-center justify-center p-6 text-center" style={{ display: 'none', zIndex: 10001, background: 'rgba(30,25,15,0.85)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}>
          <div className="rounded-3xl px-6 py-8 max-w-sm" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF9F8 100%)', boxShadow: '0 24px 60px rgba(60,40,40,0.30)', border: '1px solid rgba(232,180,170,0.50)' }}>
            <svg className="w-14 h-14 mx-auto mb-3" fill="none" stroke="#C8686E" strokeWidth="1.6" viewBox="0 0 24 24">
              <rect x="7" y="2" width="10" height="20" rx="2" />
              <path d="M11 18h2" strokeLinecap="round" />
            </svg>
            <p className="text-[15px] font-semibold mb-1" style={{ color: '#1F1F1F' }}>Telefonunuzu dik tutun</p>
            <p className="text-[12.5px]" style={{ color: '#6B5A5A' }}>Ödeme ekranı dikey konumda en iyi şekilde görüntülenir.</p>
          </div>
        </div>
      )}

      {showPaymentModal && selectedGold && (
        <div className="nikahim-payment-modal-content fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10000, background: 'rgba(30,25,15,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <div className="rounded-[24px] max-w-[420px] w-full overflow-hidden relative" onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(165deg, rgba(255,252,245,0.95), rgba(248,243,232,0.92))', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', boxShadow: '0 30px 90px rgba(0,0,0,0.25), 0 0 0 1px rgba(212,175,55,0.08) inset, 0 1px 0 rgba(255,255,255,0.5) inset' }}>
            {/* Decorative shimmer */}
            <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(212,175,55,0.06) 0%, transparent 100%)' }} />
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-[0.06] pointer-events-none" style={{ background: '#D4AF37' }} />

            {/* Close button */}
            <button onClick={handleCloseModal} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgba(0,0,0,0.06)', color: '#999' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {/* Geri Dön button — sadece Step 2'de, sol üst X ile aynı seviyede */}
            {paymentStep === 2 && (
              <button onClick={() => { setPaymentStep(1); setPaymentMethod(null); }} className="absolute top-4 left-4 z-10 h-8 inline-flex items-center gap-1 px-2.5 rounded-full transition-all hover:scale-105 text-[12px] font-medium" style={{ background: 'rgba(0,0,0,0.06)', color: '#999' }}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                Geri Dön
              </button>
            )}

            {/* Step indicator */}
            {paymentStep < 3 && (
              <div className="px-6 pt-16 pb-1">
                <div className="flex items-center gap-0">
                  {[{n:1, label:'Ödeme Yöntemi'}, {n:2, label:'Transfer'}, {n:3, label:'Onay'}].map((step, i) => (
                    <div key={step.n} className="flex items-center" style={{ flex: i < 2 ? 1 : 'none' }}>
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300" style={{
                          background: step.n < paymentStep ? 'linear-gradient(135deg, #C9A13B, #A8892E)' : step.n === paymentStep ? 'linear-gradient(135deg, #D4AF37, #B8960B)' : 'rgba(215,210,200,0.35)',
                          color: step.n <= paymentStep ? '#fff' : '#bbb',
                          boxShadow: step.n === paymentStep ? '0 2px 10px rgba(201,161,59,0.35)' : 'none',
                        }}>{step.n < paymentStep ? '✓' : step.n}</div>
                        <span className="text-[8px] font-medium mt-1.5 whitespace-nowrap" style={{ color: paymentStep >= step.n ? '#A08530' : '#ccc' }}>{step.label}</span>
                      </div>
                      {i < 2 && <div className="flex-1 h-[2px] mx-2 rounded-full transition-all duration-500 mb-5" style={{ background: step.n < paymentStep ? 'linear-gradient(90deg, #C9A13B, #D4AF37)' : 'rgba(215,210,200,0.25)' }} />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 1: Gold info + Payment method selection */}
            {paymentStep === 1 && (
              <div className="p-6 pt-4">
                <h2 className="text-xl font-bold text-gray-900 mb-5">Altın Gönder</h2>

                {/* Gold card - highlight */}
                <div className="flex items-center gap-4 rounded-2xl p-4 mb-6" style={{ background: 'linear-gradient(135deg, #FFFDF5, #FFF8E7, #FDF3D7)', border: '1px solid rgba(212,175,55,0.18)', boxShadow: '0 4px 20px rgba(212,175,55,0.1), 0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.9)', boxShadow: '0 4px 12px rgba(212,175,55,0.12)' }}>
                    {goldOptions.find(g => g.id === selectedGold)?.image && (
                      <div className="relative w-9 h-9"><Image src={goldOptions.find(g => g.id === selectedGold)!.image} alt="" fill className="object-contain" /></div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{event.bride_first_name} & {event.groom_first_name} için</p>
                    <p className="text-xs mt-0.5 font-medium" style={{ color: '#A08530' }}>{goldOptions.find(g => g.id === selectedGold)?.name}</p>
                  </div>
                  {getSelectedPrice() > 0 && <p className="text-xl font-semibold ml-auto tracking-tight" style={{ color: '#8B6914' }}>₺{getSelectedPrice().toLocaleString()}</p>}
                </div>

                {/* Custom amount for nakit */}
                {selectedGold === "nakit" && !pendingPaymentId && (
                  <div className="mb-6">
                    <label className="block text-gray-500 mb-2 font-medium text-xs">Göndermek istediğiniz miktar</label>
                    <input type="number" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder="Miktar Girin" className="w-full px-4 py-3.5 rounded-2xl outline-none text-2xl font-bold text-gray-900 text-center placeholder:text-gray-300 placeholder:font-medium placeholder:text-base" style={{ border: '1.5px solid rgba(212,175,55,0.15)', background: 'rgba(255,255,255,0.6)' }} />
                    {(!customAmount || parseFloat(customAmount) <= 0) && (
                      <p className="mt-2 text-[11px] text-center" style={{ color: '#B85258' }}>
                        Devam etmek için bir miktar girin
                      </p>
                    )}
                  </div>
                )}

                {(() => {
                  const nakitAmountMissing = selectedGold === 'nakit' && (!customAmount || parseFloat(customAmount) <= 0);
                  return (
                <>
                {/* Payment method selection */}
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ödeme Yöntemini Seçin</h3>
                <div className="space-y-2.5 mb-5">
                  {/* Banka / IBAN */}
                  <button disabled={nakitAmountMissing} onClick={() => { if (nakitAmountMissing) return; setPaymentMethod('iban'); if (selectedGold === 'nakit' && customAmount) handleCustomAmountSubmit(); setPaymentStep(2); }} className={`group w-full flex items-center gap-3.5 rounded-2xl p-4 text-left transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 cursor-pointer ${nakitAmountMissing ? 'opacity-40 cursor-not-allowed hover:scale-100 hover:translate-y-0' : ''}`} style={{ background: '#FFFFFF', border: '1.5px solid rgba(212,175,55,0.15)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} onMouseEnter={(e) => { if (nakitAmountMissing) return; e.currentTarget.style.boxShadow = '0 8px 24px rgba(212,175,55,0.12), 0 4px 12px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)'; }} onMouseLeave={(e) => { if (nakitAmountMissing) return; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.15)'; }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(201,161,59,0.06))' }}>
                      <svg className="w-5 h-5" style={{ color: '#B8960B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900">Banka / IBAN</p>
                        <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, #D4AF37, #C9A13B)', color: '#fff', boxShadow: '0 2px 6px rgba(212,175,55,0.3)' }}>Önerilen</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">Havale / EFT ile gönder</p>
                    </div>
                    <svg className="w-5 h-5 transition-all duration-300 group-hover:translate-x-1" style={{ color: '#D4AF37' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  </button>

                  {/* QR Kod */}
                  <button disabled={nakitAmountMissing} onClick={() => { if (nakitAmountMissing) return; setPaymentMethod('qr'); if (selectedGold === 'nakit' && customAmount) handleCustomAmountSubmit(); setPaymentStep(2); }} className={`group w-full flex items-center gap-3.5 rounded-2xl p-4 text-left transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 cursor-pointer ${nakitAmountMissing ? 'opacity-40 cursor-not-allowed hover:scale-100 hover:translate-y-0' : ''}`} style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,180,140,0.12)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} onMouseEnter={(e) => { if (nakitAmountMissing) return; e.currentTarget.style.boxShadow = '0 8px 24px rgba(212,175,55,0.1), 0 4px 12px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.25)'; }} onMouseLeave={(e) => { if (nakitAmountMissing) return; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = 'rgba(200,180,140,0.12)'; }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(201,161,59,0.04))' }}>
                      <svg className="w-5 h-5" style={{ color: '#B8960B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">QR Kod</p>
                      <p className="text-xs text-gray-400 mt-0.5">Mobil bankacılık ile hızlı ödeme</p>
                    </div>
                    <svg className="w-5 h-5 transition-all duration-300 group-hover:translate-x-1" style={{ color: '#D4AF37' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  </button>

                  {/* Kripto */}
                  {event.payment_methods_enabled?.crypto && (
                    <button disabled={nakitAmountMissing} onClick={() => { if (nakitAmountMissing) return; setPaymentMethod('crypto'); if (selectedGold === 'nakit' && customAmount) handleCustomAmountSubmit(); setPaymentStep(2); }} className={`group w-full flex items-center gap-3.5 rounded-2xl p-4 text-left transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 cursor-pointer ${nakitAmountMissing ? 'opacity-40 cursor-not-allowed hover:scale-100 hover:translate-y-0' : ''}`} style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,180,140,0.12)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} onMouseEnter={(e) => { if (nakitAmountMissing) return; e.currentTarget.style.boxShadow = '0 8px 24px rgba(212,175,55,0.1), 0 4px 12px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.25)'; }} onMouseLeave={(e) => { if (nakitAmountMissing) return; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = 'rgba(200,180,140,0.12)'; }}>
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(201,161,59,0.04))' }}>
                        <svg className="w-5 h-5" style={{ color: '#B8960B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">Kripto Para</p>
                        <p className="text-xs text-gray-400 mt-0.5">USDT, TRYB ile gönder</p>
                      </div>
                      <svg className="w-5 h-5 transition-all duration-300 group-hover:translate-x-1" style={{ color: '#D4AF37' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-300">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Ödeme doğrudan çiftin hesabına aktarılır
                </div>
                </>
                  );
                })()}
              </div>
            )}

            {/* STEP 2: Transfer details */}
            {paymentStep === 2 && (
              <div className="p-6 pt-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{paymentMethod === 'iban' ? 'Banka Transferi' : paymentMethod === 'qr' ? 'QR ile Ödeme' : 'Kripto Transfer'}</h2>

                {/* IBAN Content */}
                {paymentMethod === 'iban' && (
                  <div className="space-y-3">
                    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(212,175,55,0.08)' }}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Hesap Sahibi</p>
                          <p className="font-semibold text-gray-800 text-sm mt-0.5">{event.bank_holder_name || event.groom_full_name}</p>
                        </div>
                      </div>
                      {event.payment_methods_enabled?.bank_name && (
                        <div className="border-t pt-2 mt-2" style={{ borderColor: 'rgba(212,175,55,0.08)' }}>
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Banka</p>
                          <p className="font-semibold text-gray-800 text-sm mt-0.5">{event.payment_methods_enabled.bank_name}</p>
                        </div>
                      )}
                      <div className="border-t pt-2 mt-2" style={{ borderColor: 'rgba(212,175,55,0.08)' }}>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">IBAN</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="font-mono text-gray-800 text-sm flex-1">{event.bank_iban || 'TR00 0000 0000 0000 0000 0000 00'}</p>
                          <button onClick={() => copyToClipboard((event.bank_iban || '').replace(/\s/g, ''))} className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:scale-105" style={{ color: '#A08530', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.12)' }}>
                            Kopyala &rsaquo;
                          </button>
                        </div>
                      </div>
                      <div className="border-t pt-2 mt-2" style={{ borderColor: 'rgba(212,175,55,0.08)' }}>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Alıcı</p>
                        <p className="text-sm text-gray-700 mt-0.5">{event.bride_first_name} & {event.groom_first_name}</p>
                      </div>
                      {getSelectedPrice() > 0 && (
                        <div className="border-t pt-2 mt-2" style={{ borderColor: 'rgba(212,175,55,0.08)' }}>
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Göndereceğiniz Miktar</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="font-bold text-gray-900 text-lg flex-1">₺{getSelectedPrice().toLocaleString()}</p>
                            <button onClick={() => copyToClipboard(String(getSelectedPrice()))} className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:scale-105" style={{ color: '#A08530', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.12)' }}>
                              Kopyala &rsaquo;
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* QR Content */}
                {paymentMethod === 'qr' && (
                  <div className="space-y-3">
                    {(() => {
                      const qrKey = selectedGold === "gram_altin" ? "gram" : selectedGold === "ceyrek_altin" ? "ceyrek" : selectedGold === "yarim_altin" ? "yarim" : selectedGold === "tam_altin" ? "tam" : selectedGold === "ata_altin" ? "ata" : "ozel";
                      const qrUrl = event.qr_codes?.[qrKey];
                      return qrUrl ? (
                        <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(212,175,55,0.08)' }}>
                          <img src={qrUrl} alt="QR Kod" className="w-48 h-48 mx-auto rounded-xl object-contain" />
                          <p className="text-xs text-gray-400 mt-3">Bu kodu mobil bankacılıkla okutun</p>
                          {getSelectedPrice() > 0 && (
                            <div className="flex items-center justify-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(212,175,55,0.08)' }}>
                              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Miktar:</p>
                              <p className="font-bold text-gray-900">₺{getSelectedPrice().toLocaleString()}</p>
                              <button onClick={() => copyToClipboard(String(getSelectedPrice()))} className="text-[10px] font-semibold px-2 py-1 rounded-md transition-all hover:scale-105" style={{ color: '#A08530', background: 'rgba(212,175,55,0.08)' }}>Kopyala</button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(212,175,55,0.08)' }}>
                          <p className="text-sm text-gray-400">Bu hediye için QR kod tanımlanmamış</p>
                          <button onClick={() => setPaymentMethod('iban')} className="text-xs font-medium mt-2" style={{ color: '#A08530' }}>IBAN ile gönderin →</button>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Crypto Content */}
                {paymentMethod === 'crypto' && (
                  <div className="space-y-3">
                    {event.payment_methods_enabled?.wallet_tl && (
                      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(212,175,55,0.08)' }}>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-1">TRYB (TRC-20)</p>
                        <p className="font-mono text-gray-700 text-xs break-all">{event.payment_methods_enabled.wallet_tl}</p>
                        <button onClick={() => copyToClipboard(event.payment_methods_enabled?.wallet_tl || '')} className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: '#A08530', background: 'rgba(212,175,55,0.08)' }}>Kopyala &rsaquo;</button>
                      </div>
                    )}
                    {event.payment_methods_enabled?.wallet_usdt && (
                      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(212,175,55,0.08)' }}>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-1">USDT (TRC-20)</p>
                        <p className="font-mono text-gray-700 text-xs break-all">{event.payment_methods_enabled.wallet_usdt}</p>
                        <button onClick={() => copyToClipboard(event.payment_methods_enabled?.wallet_usdt || '')} className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: '#A08530', background: 'rgba(212,175,55,0.08)' }}>Kopyala &rsaquo;</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Waiting indicator section */}
                <div className="rounded-2xl p-4 mt-4 mb-3" style={{ background: 'linear-gradient(135deg, #FFF9E6, #FFF3CC)', border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 4px 16px rgba(212,175,55,0.1), 0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div className="flex flex-col items-center text-center mb-2">
                    <div className="flex-shrink-0 mb-1.5" style={{ animation: 'spin 3s linear infinite' }}>
                      <span className="text-3xl">⏳</span>
                    </div>
                    <p className="text-[15px] font-bold text-gray-900">Ödemeniz bekleniyor</p>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed text-center">Şimdi kendi banka uygulamanız üzerinden çiftin hesabına para gönderimini yapın ve ardından bu sayfaya dönerek gönderiminizi onaylayın. Dijital Altınınızı takmış olun!</p>
                </div>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

                {/* Anonim altın seçeneği */}
                <label className="flex items-center gap-2.5 mb-3 cursor-pointer select-none">
                  <input type="checkbox" checked={anonymousGold} onChange={(e) => setAnonymousGold(e.target.checked)} className="sr-only peer" />
                  <div className="w-5 h-5 rounded-md border-2 border-gray-300 peer-checked:bg-[#C8686E] peer-checked:border-[#C8686E] flex items-center justify-center transition-all">
                    {anonymousGold && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className="text-[12px] text-gray-500">İsmim Canlı Yayında gösterilmesin</span>
                </label>

                {/* Green confirm CTA - disabled for 10 seconds */}
                <button onClick={handlePaymentComplete} disabled={confirmTimer > 0} className="w-full text-white py-3.5 rounded-2xl font-semibold text-[15px] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100" style={{ background: confirmTimer > 0 ? '#9ca3af' : 'linear-gradient(135deg, #4ade80, #22c55e)', boxShadow: confirmTimer > 0 ? 'none' : '0 4px 16px rgba(34,197,94,0.25)' }}>
                  {confirmTimer > 0 ? `Ödemeyi Onaylıyorum (${confirmTimer}s)` : '✓ Ödemeyi Onaylıyorum'}
                </button>
              </div>
            )}

            {/* STEP 3: Success */}
            {paymentStep === 3 && (
              <div className="relative overflow-hidden">
                {/* Gold shimmer background */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(248,240,220,0.5) 0%, rgba(255,252,245,0.9) 50%, rgba(248,243,232,0.95) 100%)' }} />
                {/* Confetti */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {[...Array(24)].map((_, i) => (
                    <div key={i} className="absolute" style={{
                      left: `${3 + (i * 4.2) % 94}%`,
                      top: `-5%`,
                      width: `${4 + (i % 3) * 2}px`,
                      height: `${8 + (i % 4) * 3}px`,
                      borderRadius: i % 3 === 0 ? '50%' : '1px',
                      background: ['#D4AF37', '#E8C97A', '#C8686E', '#B8960B', '#f0d68a', '#c9a13b'][i % 6],
                      opacity: 0.8,
                      animation: `goldFall ${2 + (i % 5) * 0.5}s ease-in ${(i % 10) * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
                <style>{`
                  @keyframes goldFall {
                    0% { transform: translateY(-20px) rotate(0deg) scale(1); opacity: 0.9; }
                    50% { opacity: 1; }
                    100% { transform: translateY(500px) rotate(${360 + Math.random() * 360}deg) scale(0.5); opacity: 0; }
                  }
                `}</style>

                <div className="relative z-10 p-8 pt-10 text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Altın gönderildi</h2>
                  <p className="text-sm text-gray-500 mb-1">{event.bride_first_name} & {event.groom_first_name}&apos;a hediyen ulaştı 💛</p>

                  <div className="inline-block rounded-2xl px-6 py-3 mt-4 mb-5" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(212,175,55,0.1)' }}>
                    <p className="text-sm font-bold text-gray-700">{goldOptions.find(g => g.id === selectedGold)?.name} — <span style={{ color: '#8B6914' }}>₺{getSelectedPrice().toLocaleString()}</span></p>
                  </div>

                  <div className="mb-5">
                    <p className="text-xs text-gray-400 mb-2">Mesaj bırakmak ister misin?</p>
                    <button onClick={() => { handleCloseModal(); /* focus tebrik input */ }} className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-full transition-all hover:scale-105" style={{ color: '#A08530', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.12)' }}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      Tebrik Mesajı Yaz
                    </button>
                  </div>

                  <button onClick={handleCloseModal} className="w-full text-white py-3.5 rounded-2xl font-semibold text-[15px] transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #C9A13B, #A8892E)', boxShadow: '0 4px 20px rgba(201,161,59,0.3)' }}>
                    Canlı Yayına Dön
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mesaj Tebrik Modal — mobilde alta dock olur, klavye açılınca üstüne çıkar */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" onClick={() => setShowMessageModal(false)} style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
          <div className="rounded-3xl max-w-md w-full overflow-hidden relative max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(165deg, rgba(245,252,247,0.96), rgba(238,248,240,0.94))', backdropFilter: 'blur(40px)', boxShadow: '0 25px 80px rgba(0,0,0,0.15)', border: '1px solid rgba(76,175,80,0.1)' }}>
            <button onClick={() => setShowMessageModal(false)} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all" style={{ background: 'rgba(0,0,0,0.05)' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="p-7">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(76,175,80,0.08)' }}>
                  <svg className="w-5.5 h-5.5" style={{ color: '#5BA865' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Mesaj Tebrik</h2>
                  <p className="text-xs text-gray-400">{event.bride_first_name} & {event.groom_first_name} için tebrik mesajınızı bırakın</p>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(76,175,80,0.1)' }}>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} onFocus={(e) => { setTimeout(() => { e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 350); }} placeholder={`${event.bride_first_name} & ${event.groom_first_name} için tebrik mesajınızı yazın...`} rows={4} className="w-full px-4 py-3 bg-transparent outline-none text-gray-800 placeholder:text-gray-300 text-sm resize-none" style={{ fontFamily: 'inherit' }} />
              </div>

              <button onClick={() => { sendMessage(); setShowMessageModal(false); }} disabled={!message.trim()} className="w-full mt-4 text-white py-3.5 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02] disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #6DC275, #5BA865)', boxShadow: '0 4px 16px rgba(76,175,80,0.2)' }}>
                Tebrik Gönder
              </button>
            </div>
          </div>
        </div>
      )}

      {showWelcomeModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 overflow-hidden">
          {/* Konfeti animasyonu — site renklerinde, abartısız */}
          <style>{`
            @keyframes confetti-fall {
              0% { transform: translateY(-20vh) rotate(0deg); opacity: 1; }
              100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
            }
            .confetti-piece {
              position: absolute;
              top: 0;
              width: 8px;
              height: 12px;
              opacity: 0;
              animation: confetti-fall 3.2s cubic-bezier(0.2, 0.7, 0.5, 1) forwards;
              pointer-events: none;
              border-radius: 2px;
            }
            @keyframes modal-pop {
              0% { transform: scale(0.85); opacity: 0; }
              60% { transform: scale(1.04); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
            .welcome-modal-pop { animation: modal-pop 520ms cubic-bezier(0.34, 1.56, 0.64, 1); }
          `}</style>
          {/* 40 parça konfeti — site renklerinde (pembe, gold, krem, beyaz) */}
          {Array.from({ length: 40 }).map((_, i) => {
            const colors = ['#C8686E', '#D88488', '#E8A8AE', '#D4A852', '#F5D7CE', '#FFFFFF', '#FCE2DA'];
            const left = (i * 2.5) % 100;
            const delay = (i * 0.07) % 1.8;
            const dur = 2.4 + (i % 4) * 0.3;
            const color = colors[i % colors.length];
            return (
              <span
                key={i}
                className="confetti-piece"
                style={{
                  left: `${left}%`,
                  background: color,
                  animationDelay: `${delay}s`,
                  animationDuration: `${dur}s`,
                  transform: `rotate(${(i * 17) % 360}deg)`,
                }}
              />
            );
          })}
          <div className="welcome-modal-pop bg-white rounded-2xl p-8 max-w-sm w-full text-center relative z-10" style={{ boxShadow: '0 30px 80px rgba(60,40,40,0.20), 0 12px 32px rgba(200,104,110,0.16)' }}>
            <div className="text-6xl mb-4">🎊</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Hoş Geldiniz!</h3>
            <p className="text-gray-600 mb-2">Katılım bilginiz çiftimize iletildi.</p>
            <p className="text-gray-500">Katıldığınız için teşekkür ederiz! 🎉</p>
          </div>
        </div>
      )}

      {/* Fotoğraf Yükleme Popup - Ana ekran */}
      {renderPhotoUploadPopup()}

      {showCopiedToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg" style={{ zIndex: 10002 }}>
          ✓ Kopyalandı!
        </div>
      )}
    </main>
  );
}