"use client";

import { supabase } from '@/lib/supabase';
import Image from "next/image";
import { useState, useEffect, useRef, Fragment } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import ApiVideoPlayer from '@/components/ApiVideoPlayer';
import VideoRecorder from '@/components/VideoRecorder';
import VoiceRecorder from '@/components/VoiceRecorder';

const SUPABASE_URL = 'https://haeifluvvazdealsofle.supabase.co';

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
  };
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

export default function WatchPage() {
  const params = useParams();
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
  const [viewerLimitReached, setViewerLimitReached] = useState(false);
  const [streamData, setStreamData] = useState<{
    status: string;
    playbackId: string | null;
    videoId?: string | null;
    isTest: boolean;
  } | null>(null);
  const [prevStreamStatus, setPrevStreamStatus] = useState<string | null>(null);
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
  const [activeMobileTab, setActiveMobileTab] = useState<'altin' | 'tebrik' | 'album'>('altin');
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
    
    // Müziği başlat
    if (event?.background_music && event.background_music !== 'none') {
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
    { id: "ata_altin", name: "Ata Altın", price: getGoldPrice('ata'), image: "/altintak.png" },
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

  useEffect(() => {
    const fetchEvent = async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('event_link', slug)
        .maybeSingle();
      
      if (data) {
        setEvent(data);

        // Slideshow fotoğraflarını çek
        const { data: files } = await supabase.storage
          .from('slideshow-photos')
          .list(data.id, { sortBy: { column: 'created_at', order: 'asc' } });
        if (files && files.length > 0) {
          const urls = files
            .filter((f: any) => !f.name.startsWith('.'))
            .map((f: any) => supabase.storage.from('slideshow-photos').getPublicUrl(`${data.id}/${f.name}`).data.publicUrl);
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
    const fetchViewerCount = async () => {
      if (event?.id) {
        const { count } = await supabase
          .from('viewers')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id);
        
        const currentCount = count || 0;
        setViewerCount(currentCount);
        
        const maxViewers = eventPackage?.max_viewers || 50;
        if (currentCount >= maxViewers) {
          setViewerLimitReached(true);
        }
      }
    };

    fetchViewerCount();
    
    const interval = setInterval(fetchViewerCount, 30000);
    return () => clearInterval(interval);
  }, [event?.id, eventPackage?.max_viewers]);

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
          const txt = (newMsg.message || '').trim();
          setVideoNotification({
            text: `${newMsg.sender_name}: ${txt.substring(0, 40)}${txt.length > 40 ? '...' : ''}`,
            type: 'message',
          });
          setTimeout(() => setVideoNotification(null), 8000);
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
        setTimeout(() => setVideoNotification(null), 8000);
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

  const handleNameSubmit = async () => {
    if (viewerName.trim() && event?.id) {
      const maxViewers = eventPackage?.max_viewers || 50;
      
      const { count } = await supabase
        .from('viewers')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id);
      
      const currentCount = count || 0;
      
      if (currentCount >= maxViewers) {
        setViewerLimitReached(true);
        return;
      }
      
      localStorage.setItem(`nikahim_viewer_${slug}`, viewerName.trim());
      
      await supabase.from('viewers').insert({
        event_id: event.id,
        full_name: viewerName,
        first_name: viewerFirstName.trim() || null,
        last_name: viewerLastName.trim() || null,
      });
      
      setViewerCount(prev => prev + 1);
      setShowWelcomeModal(true);
      
      if (event?.background_music && event.background_music !== 'none') {
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
      
      setTimeout(() => {
        setShowWelcomeModal(false);
        setIsNameEntered(true);
        setVideoNotification({ text: `${viewerName.trim()} nikaha katıldı!`, type: 'join' });
        setTimeout(() => setVideoNotification(null), 8000);
      }, 3000);
    }
  };

  const sendMessage = async () => {
    if (message.trim() && event?.id) {
      await supabase.from('chat_messages').insert({
        event_id: event.id,
        sender_name: viewerName,
        message: message,
      });

      setMessage("");
      setShowEmojiPicker(false);
      setVideoNotification({ text: `${viewerName}: ${message.trim().substring(0, 40)}${message.trim().length > 40 ? '...' : ''}`, type: 'message' });
      setTimeout(() => setVideoNotification(null), 8000);
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

  // 10 second timer for payment confirmation
  useEffect(() => {
    if (paymentStep === 2) {
      setConfirmTimer(20);
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
    setTimeout(() => setVideoNotification(null), 8000);

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
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
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
              👥 Maksimum {eventPackage?.max_viewers || 50} izleyici kapasitesine ulaşıldı.
            </p>
          </div>
          
          <p className="text-gray-400 text-sm">Daha sonra tekrar deneyebilirsiniz.</p>
        </div>
      </main>
    );
  }

  if (showReturningModal && isReturningViewer) {
    return (
      <main className="min-h-screen flex items-start sm:items-center justify-center p-4 pt-12 sm:pt-4 pb-8" style={{ background: 'linear-gradient(180deg, #FAFBFE 0%, #F5F3F0 50%, #FDF5F5 100%)' }}>
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
            <Image src="/navbar-icon.png" alt="Nikahım" width={44} height={44} className="h-[40px] w-auto object-contain opacity-85 transition-opacity group-hover:opacity-100" />
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
          <div className="relative flex items-center justify-center mt-4 mb-5">
            {/* Arkada soft rose halo */}
            <div className="absolute w-[200px] h-[200px] rounded-full pointer-events-none"
                 style={{ background: 'radial-gradient(circle, rgba(200,104,110,0.18) 0%, transparent 65%)', filter: 'blur(12px)' }} />
            <div className="relative rounded-full p-[3px]"
                 style={{
                   background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(232,180,170,0.55))',
                   boxShadow: '0 12px 30px rgba(200,104,110,0.20), 0 4px 12px rgba(160,80,90,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
                 }}>
              <img src={event.couple_photo_url || "/couple-icon.png"} alt="Çift Fotoğrafı"
                   className="rounded-full object-cover w-[150px] h-[150px] block"
                   style={{ border: '2px solid rgba(255,255,255,0.95)' }} />
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
            <p className="font-semibold text-[16px]" style={{ color: '#1F1F1F' }}>
              Sn. {viewerName},
            </p>
            <p className="italic mt-0.5 text-[14.5px]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif', color: '#7A6B6B' }}>
              sizi yeniden aramızda görmek çok güzel
            </p>
          </div>

          {/* Premium glass-shine CTA */}
          <button
            onClick={handleReturningContinue}
            className="w-full relative text-white px-8 py-4 rounded-2xl font-semibold text-[15.5px] transition-all hover:scale-[1.02] btn-press flex items-center justify-center gap-2.5 overflow-hidden tracking-[0.2px]"
            style={{
              background: 'linear-gradient(135deg, #D88488 0%, #C8686E 45%, #B85258 100%)',
              boxShadow: '0 20px 50px rgba(217,92,114,0.28), 0 6px 16px rgba(160,80,90,0.18), inset 0 1px 0 rgba(255,255,255,0.35)',
            }}
          >
            {/* Hafif shine layer */}
            <span className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 50%)' }} />
            <span className="relative inline-flex items-center justify-center w-7 h-7 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)' }}>
              <svg className="w-3.5 h-3.5" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </span>
            <span className="relative">Canlı Yayına Katıl</span>
          </button>

          {/* Divider — soft gold gradient */}
          <div className="flex items-center gap-3 my-5 relative">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,104,110,0.20), transparent)' }} />
            <span className="text-xs font-semibold tracking-wider" style={{ color: '#B5A8A8' }}>veya</span>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,104,110,0.20), transparent)' }} />
          </div>

          {/* Anı Paylaş kartı — referans tasarım (gölge + dashed buton + lock disclaimer) */}
          <div className="rounded-2xl p-4 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #FFF5F4 0%, #FFEEEC 100%)', border: '1px solid rgba(220,150,160,0.20)', boxShadow: '0 10px 28px rgba(200,104,110,0.12), 0 3px 10px rgba(200,104,110,0.08)' }}>
            <div className="flex items-start gap-3">
              <div className="relative flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F8C4C2, #ECA1A5)', boxShadow: '0 6px 14px rgba(200,104,110,0.20)' }}>
                <Image src="/resim-ekle-icon-3.png" alt="" width={42} height={42} className="object-contain" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-1.5 mb-1">
                  <h4 className="font-bold text-[15px]" style={{ color: '#C8686E' }}>Bu Günden Bir Kare Paylaş</h4>
                  <svg className="w-4 h-4" fill="none" stroke="#C8686E" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" /></svg>
                </div>
                <p className="text-[12.5px] leading-snug" style={{ color: '#6B5A5A' }}>{event.event_type === 'dugun' ? 'Düğündeysen' : 'Nikahtaysan'} çektiğin fotoğrafları çiftin özel albümüne ekleyebilirsin.</p>
              </div>
            </div>
            <button onClick={() => setShowPhotoUpload(true)} className="w-full mt-3.5 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-[14px] transition-all hover:scale-[1.01]" style={{ background: 'rgba(255,250,250,0.7)', color: '#C8686E', border: '1.5px dashed rgba(200,104,110,0.45)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
              Fotoğraf Yükle
            </button>
          </div>
        </div>

        {/* Fotoğraf Yükleme Popup - Tekrar gelen */}
        {showPhotoUpload && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
            <div className="rounded-3xl max-w-md w-full overflow-hidden relative" style={{ background: 'linear-gradient(165deg, rgba(255,252,248,0.97), rgba(250,245,238,0.95))', boxShadow: '0 25px 80px rgba(0,0,0,0.15)', border: '1px solid rgba(200,104,110,0.1)' }}>
              {photoUploadSuccess ? (
                <div className="p-10 text-center">
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Fotoğraflarınız Yüklendi!</h3>
                  <p className="text-gray-500 text-sm mb-6">Çift onayladığında canlı yayın sayfasında görünecek.</p>
                  <button onClick={() => { setShowPhotoUpload(false); setPhotoUploadSuccess(false); setPhotoUploadFiles([]); setPhotoUploadPreviews([]); setPhotoUploaderName(''); }} className="text-white px-8 py-3 rounded-xl font-semibold transition-all hover:shadow-lg" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}>
                    Tamam
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-6 pb-0">
                    <button onClick={() => { setShowPhotoUpload(false); setPhotoUploadFiles([]); setPhotoUploadPreviews([]); }} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgba(0,0,0,0.06)', color: '#999' }}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F8C4C2, #ECA1A5)', boxShadow: '0 5px 12px rgba(200,104,110,0.20)' }}>
                        <Image src="/resim-ekle-icon-3.png" alt="" width={36} height={36} className="object-contain" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Fotoğraf Yükle</h3>
                        <p className="text-xs text-gray-400">Nikah gününden fotoğraflarınızı paylaşın</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 pt-2">
                    <label className="block text-sm font-medium text-gray-600 mb-2">Adınız</label>
                    <input type="text" value={photoUploaderName || viewerName} onChange={(e) => setPhotoUploaderName(e.target.value)} placeholder="Adınızı yazın" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#C8686E]/40 outline-none text-gray-900 placeholder:text-gray-400 mb-4" />
                    <label className="block text-sm font-medium text-gray-600 mb-2">Fotoğraflar (en fazla 9)</label>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {photoUploadPreviews.map((prev, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                          <img src={prev} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => { setPhotoUploadFiles(f => f.filter((_, idx) => idx !== i)); setPhotoUploadPreviews(p => p.filter((_, idx) => idx !== i)); }} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                      {photoUploadFiles.length < 9 && (
                        <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-[#C8686E]/30 transition-colors">
                          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          <span className="text-[10px] text-gray-300 mt-1">Ekle</span>
                          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                            const files = Array.from(e.target.files || []).slice(0, 9 - photoUploadFiles.length);
                            setPhotoUploadFiles(prev => [...prev, ...files]);
                            files.forEach(file => { const reader = new FileReader(); reader.onload = (ev) => setPhotoUploadPreviews(prev => [...prev, ev.target?.result as string]); reader.readAsDataURL(file); });
                          }} />
                        </label>
                      )}
                    </div>
                    <button onClick={async () => {
                      const name = photoUploaderName || viewerName;
                      if (!name.trim() || photoUploadFiles.length === 0 || !event) return;
                      setUploadingGuestPhotos(true);
                      try {
                        const urls: string[] = [];
                        for (const file of photoUploadFiles) {
                          const fileName = `pending/${event.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
                          const { error } = await supabase.storage.from('slideshow-photos').upload(fileName, file, { contentType: 'image/jpeg' });
                          if (!error) { const { data: urlData } = supabase.storage.from('slideshow-photos').getPublicUrl(fileName); urls.push(urlData.publicUrl); }
                        }
                        if (urls.length > 0) { await supabase.from('photo_requests').insert({ event_id: event.id, sender_name: name, photo_urls: urls, status: 'pending' }); }
                        setPhotoUploadSuccess(true);
                      } catch (e) { console.error('Photo upload error:', e); }
                      setUploadingGuestPhotos(false);
                    }} disabled={!(photoUploaderName || viewerName).trim() || photoUploadFiles.length === 0 || uploadingGuestPhotos} className="w-full disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold transition-all hover:shadow-lg" style={{ background: (photoUploaderName || viewerName).trim() && photoUploadFiles.length > 0 ? 'linear-gradient(135deg, #D17075, #C8686E)' : undefined }}>
                      {uploadingGuestPhotos ? 'Yükleniyor...' : 'Gönder'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    );
  }

  if (!isNameEntered) {
    return (
      <main className="min-h-screen flex items-start sm:items-center justify-center p-4 pt-12 sm:pt-4 pb-8" style={{ background: 'linear-gradient(180deg, #FAFBFE 0%, #F5F3F0 50%, #FDF5F5 100%)' }}>
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
            <Image src="/navbar-icon.png" alt="Nikahım" width={44} height={44} className="h-[40px] w-auto object-contain opacity-85 transition-opacity group-hover:opacity-100" />
          </div>

          {/* CANLI badge — sadece active iken */}
          {streamData?.status === 'active' && (
            <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white z-10"
                 style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', boxShadow: '0 3px 10px rgba(220,38,38,0.35), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              CANLI
            </div>
          )}

          {/* Hero — Çift fotoğrafı, büyük, halo + glass border */}
          <div className="relative flex items-center justify-center mt-4 mb-5">
            <div className="absolute w-[200px] h-[200px] rounded-full pointer-events-none"
                 style={{ background: 'radial-gradient(circle, rgba(200,104,110,0.18) 0%, transparent 65%)', filter: 'blur(12px)' }} />
            <div className="relative rounded-full p-[3px]"
                 style={{
                   background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(232,180,170,0.55))',
                   boxShadow: '0 12px 30px rgba(200,104,110,0.20), 0 4px 12px rgba(160,80,90,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
                 }}>
              <img src={event.couple_photo_url || "/couple-icon.png"} alt="Çift Fotoğrafı"
                   className="rounded-full object-cover w-[150px] h-[150px] block"
                   style={{ border: '2px solid rgba(255,255,255,0.95)' }} />
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

          {/* Premium karşılama copy */}
          <div className="mb-5 relative">
            <p className="italic text-[14px]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif', color: '#7A6B6B' }}>
              Bu özel anı birlikte yaşamak için aramızdasınız.
            </p>
          </div>

          <div className="mb-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-left text-gray-600 mb-1.5 font-medium text-sm">Adınız</label>
                <input
                  type="text"
                  value={viewerFirstName}
                  onChange={(e) => { setViewerFirstName(e.target.value); setViewerName(`${e.target.value} ${viewerLastName}`.trim()); }}
                  placeholder=""
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#C8686E]/40 outline-none text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-left text-gray-600 mb-1.5 font-medium text-sm">Soyadınız</label>
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

          <button
            onClick={handleNameSubmit}
            disabled={!viewerFirstName.trim() || !viewerLastName.trim()}
            className="w-full relative disabled:bg-gray-300 text-white px-8 py-4 rounded-2xl font-semibold text-[15.5px] transition-all hover:scale-[1.02] btn-press flex items-center justify-center gap-2.5 overflow-hidden tracking-[0.2px] disabled:hover:scale-100"
            style={{
              background: (viewerFirstName.trim() && viewerLastName.trim()) ? 'linear-gradient(135deg, #D88488 0%, #C8686E 45%, #B85258 100%)' : undefined,
              boxShadow: (viewerFirstName.trim() && viewerLastName.trim()) ? '0 20px 50px rgba(217,92,114,0.28), 0 6px 16px rgba(160,80,90,0.18), inset 0 1px 0 rgba(255,255,255,0.35)' : undefined,
            }}
          >
            {(viewerFirstName.trim() && viewerLastName.trim()) && (
              <span className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 50%)' }} />
            )}
            <span className="relative inline-flex items-center justify-center w-7 h-7 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)' }}>
              <svg className="w-3.5 h-3.5" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </span>
            <span className="relative">Yayına Devam Et</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs font-semibold text-gray-400 tracking-wider">veya</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Anı Paylaş kartı — referans tasarım (gölge + dashed buton + lock disclaimer) */}
          <div className="rounded-2xl p-4 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #FFF5F4 0%, #FFEEEC 100%)', border: '1px solid rgba(220,150,160,0.20)', boxShadow: '0 10px 28px rgba(200,104,110,0.12), 0 3px 10px rgba(200,104,110,0.08)' }}>
            <div className="flex items-start gap-3">
              <div className="relative flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F8C4C2, #ECA1A5)', boxShadow: '0 6px 14px rgba(200,104,110,0.20)' }}>
                <Image src="/resim-ekle-icon-3.png" alt="" width={42} height={42} className="object-contain" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-1.5 mb-1">
                  <h4 className="font-bold text-[15px]" style={{ color: '#C8686E' }}>Bu Günden Bir Kare Paylaş</h4>
                  <svg className="w-4 h-4" fill="none" stroke="#C8686E" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" /></svg>
                </div>
                <p className="text-[12.5px] leading-snug" style={{ color: '#6B5A5A' }}>{event.event_type === 'dugun' ? 'Düğündeysen' : 'Nikahtaysan'} çektiğin fotoğrafları çiftin özel albümüne ekleyebilirsin.</p>
              </div>
            </div>
            <button onClick={() => setShowPhotoUpload(true)} className="w-full mt-3.5 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-[14px] transition-all hover:scale-[1.01]" style={{ background: 'rgba(255,250,250,0.7)', color: '#C8686E', border: '1.5px dashed rgba(200,104,110,0.45)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
              Fotoğraf Yükle
            </button>
          </div>
        </div>

        {/* Fotoğraf Yükleme Popup */}
        {showPhotoUpload && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
            <div className="rounded-3xl max-w-md w-full overflow-hidden relative" style={{ background: 'linear-gradient(165deg, rgba(255,252,248,0.97), rgba(250,245,238,0.95))', boxShadow: '0 25px 80px rgba(0,0,0,0.15)', border: '1px solid rgba(200,104,110,0.1)' }}>
              {/* Başarılı ekranı */}
              {photoUploadSuccess ? (
                <div className="p-10 text-center">
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Fotoğraflarınız Yüklendi!</h3>
                  <p className="text-gray-500 text-sm mb-6">Çift onayladığında canlı yayın sayfasında görünecek.</p>
                  <button onClick={() => { setShowPhotoUpload(false); setPhotoUploadSuccess(false); setPhotoUploadFiles([]); setPhotoUploadPreviews([]); setPhotoUploaderName(''); }} className="text-white px-8 py-3 rounded-xl font-semibold transition-all hover:shadow-lg" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}>
                    Tamam
                  </button>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="p-6 pb-0">
                    <button onClick={() => { setShowPhotoUpload(false); setPhotoUploadFiles([]); setPhotoUploadPreviews([]); }} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgba(0,0,0,0.06)', color: '#999' }}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F8C4C2, #ECA1A5)', boxShadow: '0 5px 12px rgba(200,104,110,0.20)' }}>
                        <Image src="/resim-ekle-icon-3.png" alt="" width={36} height={36} className="object-contain" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Fotoğraf Yükle</h3>
                        <p className="text-xs text-gray-400">Nikah gününden fotoğraflarınızı paylaşın</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 pt-2">
                    {/* İsim */}
                    <label className="block text-sm font-medium text-gray-600 mb-2">Adınız</label>
                    <input type="text" value={photoUploaderName} onChange={(e) => setPhotoUploaderName(e.target.value)} placeholder="Adınızı yazın" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#C8686E]/40 outline-none text-gray-900 placeholder:text-gray-400 mb-4" />

                    {/* Fotoğraf Seç */}
                    <label className="block text-sm font-medium text-gray-600 mb-2">Fotoğraflar (en fazla 9)</label>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {photoUploadPreviews.map((prev, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                          <img src={prev} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => {
                            setPhotoUploadFiles(f => f.filter((_, idx) => idx !== i));
                            setPhotoUploadPreviews(p => p.filter((_, idx) => idx !== i));
                          }} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                      {photoUploadFiles.length < 9 && (
                        <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-[#C8686E]/30 transition-colors">
                          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          <span className="text-[10px] text-gray-300 mt-1">Ekle</span>
                          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                            const files = Array.from(e.target.files || []).slice(0, 9 - photoUploadFiles.length);
                            setPhotoUploadFiles(prev => [...prev, ...files]);
                            files.forEach(file => {
                              const reader = new FileReader();
                              reader.onload = (ev) => setPhotoUploadPreviews(prev => [...prev, ev.target?.result as string]);
                              reader.readAsDataURL(file);
                            });
                          }} />
                        </label>
                      )}
                    </div>

                    {/* Gönder */}
                    <button
                      onClick={async () => {
                        if (!photoUploaderName.trim() || photoUploadFiles.length === 0 || !event) return;
                        setUploadingGuestPhotos(true);
                        try {
                          const urls: string[] = [];
                          for (const file of photoUploadFiles) {
                            const fileName = `pending/${event.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
                            const { error } = await supabase.storage.from('slideshow-photos').upload(fileName, file, { contentType: 'image/jpeg' });
                            if (!error) {
                              const { data: urlData } = supabase.storage.from('slideshow-photos').getPublicUrl(fileName);
                              urls.push(urlData.publicUrl);
                            }
                          }
                          if (urls.length > 0) {
                            await supabase.from('photo_requests').insert({
                              event_id: event.id,
                              sender_name: photoUploaderName,
                              photo_urls: urls,
                              status: 'pending',
                            });
                          }
                          setPhotoUploadSuccess(true);
                        } catch (e) {
                          console.error('Photo upload error:', e);
                        }
                        setUploadingGuestPhotos(false);
                      }}
                      disabled={!photoUploaderName.trim() || photoUploadFiles.length === 0 || uploadingGuestPhotos}
                      className="w-full disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold transition-all hover:shadow-lg"
                      style={{ background: photoUploaderName.trim() && photoUploadFiles.length > 0 ? 'linear-gradient(135deg, #D17075, #C8686E)' : undefined }}
                    >
                      {uploadingGuestPhotos ? 'Yükleniyor...' : 'Gönder'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

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
      {/* App İndir Popup */}
      {showAppPopup && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowAppPopup(false)} style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
          <div className="relative rounded-[28px] px-8 lg:px-10 pt-6 pb-14 lg:pt-7 lg:pb-16 max-w-md w-full overflow-hidden"
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
            <div className="relative flex flex-col items-center mb-3">
              {/* Logo arkası soft rose halo */}
              <div className="absolute top-0 w-[180px] h-[140px] rounded-full pointer-events-none"
                   style={{ background: 'radial-gradient(ellipse at center, rgba(200,104,110,0.10) 0%, transparent 70%)', filter: 'blur(8px)' }} />
              <div className="relative flex flex-col items-center">
                <Image src="/navbar-icon.png" alt="Nikahım" width={96} height={96} className="w-[88px] h-[88px] object-contain" />
                <Image src="/navbar-text.png" alt="Nikahım" width={500} height={140} className="h-[100px] w-auto object-contain -mt-4" />
              </div>
              {/* Premium slogan — ince serif italic */}
              <p className="mt-1 text-center italic tracking-[0.3px]"
                 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontWeight: 400, fontSize: '15.5px', color: '#9F4F58' }}>
                En mutlu anlar, birlikte güzel.
              </p>
              {/* Gold dash ayraç */}
              <div className="mt-3 h-[1px] rounded-full" style={{ width: '60px', background: 'linear-gradient(90deg, transparent, #D4A852, transparent)' }} />
            </div>

            {/* 3 feature — eşit ağırlık, biraz daha nefes */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                { title: 'Canlı Yayınla', icon: <svg className="w-9 h-9" style={{ color: '#C8686E' }} fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M10 8.5v7l6-3.5z" fill="#fff" /></svg> },
                { title: 'Albüm Oluştur', icon: <svg className="w-7 h-7" style={{ color: '#C8686E' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
                { title: 'Hemen Paylaş', icon: <svg className="w-7 h-7" style={{ color: '#C8686E' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
              ].map((f, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mb-2.5" style={{ background: 'linear-gradient(135deg, rgba(200,104,110,0.10), rgba(200,104,110,0.04))', border: '1px solid rgba(200,104,110,0.10)' }}>
                    {f.icon}
                  </div>
                  <h4 className="text-[12px] font-bold text-gray-900 leading-tight">{f.title}</h4>
                </div>
              ))}
            </div>

            {/* CTA alt yazı — store butonlarına mesafe */}
            <div className="text-center mb-6 lg:mb-7">
              <p className="text-[13.5px]" style={{ color: '#7A6B6B' }}>
                Uygulamayı ücretsiz indirin, hemen başlayın !
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
            <Image src="/navbar-text.png" alt="Nikahım" width={230} height={58} className="h-[74px] lg:h-[90px] w-auto object-contain -ml-5 mt-1" />
          </div>

          {/* SAĞ — Glass action area: status pill + müzik + izleyici */}
          <div className="flex items-center gap-2 lg:gap-2.5">
            {/* Stream status pill */}
            {streamData?.status === 'active' && (
              <span className="flex items-center gap-1.5 text-white px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', boxShadow: '0 3px 10px rgba(220,38,38,0.30), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />CANLI
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

            {/* İzleyici sayısı — glass pill */}
            <span className="inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-full text-[11px] lg:text-xs font-semibold"
                  style={{
                    color: '#6B5A5A',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(253,247,243,0.88) 100%)',
                    backdropFilter: 'blur(14px)',
                    border: '1px solid rgba(200,104,110,0.18)',
                    boxShadow: '0 3px 12px rgba(200,104,110,0.10), 0 1px 3px rgba(160,80,90,0.05), inset 0 1px 0 rgba(255,255,255,0.95)',
                  }}>
              <svg className="w-3.5 h-3.5" style={{ color: '#C8686E' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="tabular-nums">{viewerCount}</span>
              <span className="hidden sm:inline">izleyen</span>
            </span>
          </div>
        </div>
      </header>

      {/* 3 PANEL LAYOUT */}
      <div className="max-w-[1600px] mx-auto pt-3 px-3 pb-24 lg:p-5">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-5">

          {/* SOL PANEL - Çift Bilgisi (%20) */}
          <div ref={leftPanelRef} className="hidden lg:flex flex-col w-[220px] flex-shrink-0 gap-3">
            {/* Çift Kartı */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', boxShadow: '0 2px 16px rgba(0,0,0,0.03)', border: '1px solid rgba(255,255,255,0.6)' }}>
              <div className="text-center">
                {event.couple_photo_url ? (
                  <img src={event.couple_photo_url} alt="Çift" className="w-16 h-16 mx-auto rounded-full object-cover shadow-sm mb-3" style={{ border: '2px solid rgba(200,104,110,0.15)' }} />
                ) : (
                  <img src="/couple-icon.png" alt="Çift" className="w-20 h-20 mx-auto rounded-full object-cover mb-3" />
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
            <div className="rounded-2xl p-5 pb-[60px] space-y-3 flex-1" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', boxShadow: '0 2px 16px rgba(0,0,0,0.03)', border: '1px solid rgba(255,255,255,0.6)' }}>
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
          </div>

          {/* ORTA + SAĞ PANEL WRAPPER */}
          <div className="flex-1 min-w-0 flex flex-col lg:flex-row lg:items-stretch gap-4 lg:gap-5">
          {/* ORTA ALAN - Video (%55) — mobilde display:contents, masaüstünde normal block */}
          <div className="contents lg:block lg:flex-1 lg:min-w-0">
            {/* Video container — mobilde sticky top:60px, masaüstünde normal */}
            <div className={`max-lg:sticky max-lg:top-[60px] max-lg:z-30 bg-black overflow-hidden relative ${isFullscreen ? 'rounded-none' : 'rounded-2xl aspect-video'}`} style={isFullscreen ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, width: '100vw', height: '100vh' } : { boxShadow: '0 10px 50px rgba(200,104,110,0.1), 0 4px 20px rgba(0,0,0,0.08), 0 0 80px rgba(255,180,180,0.06)' }}>
              {/* Fullscreen toggle button */}
              <button onClick={async () => { const next = !isFullscreen; setIsFullscreen(next); if (next) { try { await document.documentElement.requestFullscreen?.(); (screen.orientation as any)?.lock?.('landscape').catch(() => {}); } catch {} } else { try { document.exitFullscreen?.(); (screen.orientation as any)?.unlock?.(); } catch {} setFsTebrikMenu(false); setFsTebrikPanel(null); setFsGoldMode(false); } }} className="absolute bottom-3 right-5 z-40 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
                {isFullscreen ? (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" /></svg>
                ) : (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                )}
              </button>

              {/* Altın listesi - sağ üst — yarıya: normal 1x (her ekran), fullscreen mobil 1x / masaüstü 2x */}
              {goldHistory.length > 0 && !event?.hide_gold_names && (
                <div
                  className={`absolute top-3 right-2 lg:right-3 z-30 overflow-hidden origin-top-right transition-transform ${
                    isFullscreen ? 'scale-[1] lg:scale-[2]' : 'scale-[1] lg:scale-[1]'
                  }`}
                  style={{ height: 30 }}
                >
                  <div style={{ transform: `translateY(-${goldDisplayIndex * 30}px)`, transition: goldTransition ? 'transform 0.7s ease-in-out' : 'none' }}>
                    {goldHistory.map((g, i) => (
                      <div key={i} className="flex items-center gap-1.5 h-[30px] px-2.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(6px)' }}>
                        {/* Masaüstünde altın PNG yazıyla hizalı değil — hafif aşağı (translate-y) */}
                        <Image src="/altintak.png" alt="" width={18} height={18} className="w-[18px] h-[18px] object-contain flex-shrink-0 lg:translate-y-[2px]" />
                        <span className="text-white/90 text-[11px] font-semibold truncate">{g.type}</span>
                        <span className="text-white/50 text-[11px] truncate">{g.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                  {/* 6 altın butonu */}
                  {goldOptions.map((gold) => (
                    <button key={gold.id} onClick={() => { handleGoldSelect(gold.id); }} className="group flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl transition-all duration-300 hover:scale-[1.1] hover:-translate-y-1 relative" style={{ background: gold.id === 'nakit' ? 'linear-gradient(165deg, rgba(252,247,236,0.12), rgba(244,236,216,0.10))' : 'linear-gradient(165deg, rgba(255,253,248,0.08), rgba(248,242,232,0.05))', border: '1px solid rgba(212,175,55,0.12)', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 35px rgba(212,175,55,0.25), 0 4px 12px rgba(0,0,0,0.15)'; e.currentTarget.style.border = '1px solid rgba(212,175,55,0.3)'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'; e.currentTarget.style.border = '1px solid rgba(212,175,55,0.12)'; }}>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" style={{ background: 'radial-gradient(circle at 50% 30%, rgba(212,175,55,0.15), transparent 70%)' }} />
                      <div className="relative w-11 h-11 group-hover:scale-110 transition-transform duration-300">
                        <Image src={gold.image} alt={gold.name} fill className="object-contain drop-shadow-md" />
                      </div>
                      <div className="text-[10px] font-semibold text-white/80 leading-tight text-center">{gold.name}</div>
                      {gold.price > 0 ? (
                        <div className="text-[10px] font-bold" style={{ color: '#D4AF37' }}>{'\u20BA'}{gold.price.toLocaleString()}</div>
                      ) : (
                        <div className="text-[10px] text-white/30">Serbest</div>
                      )}
                    </button>
                  ))}
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
                    <VideoRecorder eventId={event.id} senderName={viewerName} embedded onSuccess={() => { setFsTebrikPanel(null); setVideoTebrikCount(c => c + 1); setVideoNotification({ text: `${viewerName} video tebrik gönderdi!`, type: 'video' }); setTimeout(() => setVideoNotification(null), 8000); }} onClose={() => setFsTebrikPanel(null)} />
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
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`${event.bride_first_name} & ${event.groom_first_name} için tebrik mesajınızı yazın...`} rows={3} className="w-full px-3 py-2.5 rounded-xl outline-none text-[13px] text-white placeholder:text-white/25 resize-none" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'Georgia, serif' }} />
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
                    <VoiceRecorder eventId={event.id} senderName={viewerName} embedded onSuccess={() => { setFsTebrikPanel(null); setSesliTebrikCount(c => c + 1); setVideoNotification({ text: `${viewerName} sesli tebrik gönderdi!`, type: 'voice' }); setTimeout(() => setVideoNotification(null), 8000); }} onClose={() => setFsTebrikPanel(null)} />
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
              {/* Recording */}
              {streamData?.status === 'ended' && !showEndedScreen && !streamData?.isTest && streamData?.playbackId && (
                <ApiVideoPlayer liveStreamId={streamData.playbackId || undefined} videoId={streamData.videoId || undefined} isLive={false} isRecording={true} overlayInfo={{ viewerCount, isTest: streamData.isTest }} className="w-full h-full" />
              )}
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
                    <div className="relative mb-3 lg:mb-5 rounded-full couple-ring-breath" style={{ background: 'linear-gradient(135deg, #E8A5A9 0%, #C8686E 30%, #A85359 60%, #C8686E 80%, #E8A5A9 100%)', padding: '2px' }}>
                      <img src={event.couple_photo_url || "/navbar-icon.png"} alt="Çift" className="rounded-full object-cover block w-[96px] h-[96px] lg:w-[192px] lg:h-[192px]" />
                    </div>

                    {/* Çift isimleri — daha zarif: ince + bir tık küçük */}
                    <h3 className="text-white text-2xl lg:text-[34px] font-medium mb-0.5 lg:mb-1" style={{ textShadow: '0 2px 14px rgba(0,0,0,0.78), 0 0 26px rgba(200,104,110,0.22)', letterSpacing: '0.5px', lineHeight: 1.1 }}>
                      {event.bride_first_name} & {event.groom_first_name}
                    </h3>

                    {/* Subtitle — ince italic (Playfair kalsın) */}
                    <p className="italic text-white/70 text-[12px] lg:text-[14px] mb-2 lg:mb-3 tracking-[0.4px]" style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontWeight: 400, textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
                      En mutlu anlar, birlikte güzel
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
                  className={`absolute top-3 left-5 z-30 origin-top-left ${
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
                      <span className="flex items-center gap-1.5 bg-red-500/90 backdrop-blur text-white px-3 py-1 rounded-lg text-xs font-bold shadow-lg"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />CANLI</span>
                      <span className="backdrop-blur-md bg-black/30 text-white/80 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>{viewerCount}</span>
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
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
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
            <div id="gold-section" className={`-mt-1 lg:mt-4 rounded-[20px] relative overflow-hidden ${activeMobileTab !== 'altin' ? 'max-lg:hidden' : ''}`} style={{ background: 'linear-gradient(180deg, #FBF6EB 0%, #F8F0DD 100%)', boxShadow: '0 8px 32px rgba(180,155,120,0.10), 0 2px 8px rgba(0,0,0,0.03)', border: '1px solid rgba(220,200,170,0.20)' }}>
              <style>{`
                .gold-card:hover {
                  box-shadow:
                    0 14px 34px rgba(200,104,110,0.16),
                    0 5px 16px rgba(184,134,11,0.18),
                    inset 0 1px 0 rgba(255,255,255,1),
                    inset 0 -1px 0 rgba(184,134,11,0.12),
                    inset 0 12px 28px rgba(212,168,82,0.10),
                    0 0 0 1px rgba(200,104,110,0.14) !important;
                }
                .gold-card[data-highlight="true"]:hover {
                  box-shadow:
                    0 18px 42px rgba(184,134,11,0.26),
                    0 6px 20px rgba(200,104,110,0.18),
                    inset 0 1px 0 rgba(255,255,255,1),
                    inset 0 -1px 0 rgba(184,134,11,0.15),
                    inset 0 14px 32px rgba(212,168,82,0.14),
                    0 0 0 1px rgba(200,104,110,0.18) !important;
                }
                .gold-card:active {
                  transform: translateY(0) !important;
                }
              `}</style>
              <div className="px-5 md:px-7 pt-3 pb-6">
                {/* Başlık — ultra ince çift katmanlı gold gradient + hafif shine */}
                <div className="text-center mb-3">
                  <h2 className="flex items-center justify-center gap-3 md:gap-5" style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontWeight: 500, letterSpacing: '0.5px' }}>
                    <span className="flex-shrink-0 relative" style={{ width: 'clamp(32px, 9vw, 64px)', height: '2px', transform: 'translateY(4px)' }}>
                      <span className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to right, transparent 0%, rgba(184,134,11,0.85) 50%, transparent 100%)' }} />
                      <span className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to right, transparent 30%, rgba(255,240,200,0.65) 50%, transparent 70%)', filter: 'blur(0.5px)' }} />
                    </span>
                    <span className="text-[24px] md:text-[30px] whitespace-nowrap" style={{ color: '#2B2B2B' }}>
                      Mutlu Çifte{' '}
                      <span style={{ color: '#B8860B', fontWeight: 600 }}>Altın Tak</span>
                    </span>
                    <span className="flex-shrink-0 relative" style={{ width: 'clamp(32px, 9vw, 64px)', height: '2px', transform: 'translateY(4px)' }}>
                      <span className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to left, transparent 0%, rgba(184,134,11,0.85) 50%, transparent 100%)' }} />
                      <span className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to left, transparent 30%, rgba(255,240,200,0.65) 50%, transparent 70%)', filter: 'blur(0.5px)' }} />
                    </span>
                  </h2>
                </div>

                {/* 3 Trust Badge — TEK KART, sadece başlık (alt-açıklama kaldırıldı), Banka Transferi 2 satır */}
                <div className="rounded-2xl flex items-center mb-5"
                     style={{
                       background: 'linear-gradient(135deg, #FFFFFF 0%, #FFFBF0 100%)',
                       boxShadow: '0 4px 14px rgba(180,140,80,0.12), 0 1px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
                       border: '1px solid rgba(220,200,170,0.35)',
                     }}>
                  {[
                    {
                      title: 'Güvenli',
                      icon: (
                        <svg viewBox="0 0 24 24" className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="#C8A050" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2L4 5v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V5l-8-3z" fill="#C8A050" fillOpacity="0.15" />
                          <path d="M12 2L4 5v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V5l-8-3z" />
                          <path d="M8.5 12l2.5 2.5L15.5 10" strokeWidth="2" />
                        </svg>
                      ),
                    },
                    {
                      title: 'Anında',
                      icon: (
                        <svg viewBox="0 0 24 24" className="w-5 h-5 md:w-6 md:h-6" fill="#C8A050" stroke="#C8A050" strokeWidth="0.5">
                          <path d="M13 2L4.5 13.5h6L9 22l8.5-11.5h-6L13 2z" />
                        </svg>
                      ),
                    },
                    {
                      title: 'FAST',
                      icon: (
                        <svg viewBox="0 0 24 24" className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="#C8A050" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <g transform="translate(0,-1.5)">
                            <path d="M3 10L12 4l9 6" />
                            <path d="M5 10v9M19 10v9" />
                            <path d="M3 21h18" />
                          </g>
                        </svg>
                      ),
                    },
                  ].map((b, i, arr) => (
                    <Fragment key={i}>
                      <div className="flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2">
                        <div className="w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0"
                             style={{ background: 'rgba(200,160,80,0.12)' }}>
                          {b.icon}
                        </div>
                        <span className="text-[12px] md:text-[14px] font-normal leading-[1.1] text-center" style={{ color: '#3B2F1E' }}>
                          {b.title.split('\n').map((line, idx) => (
                            <span key={idx} className="block">{line}</span>
                          ))}
                        </span>
                      </div>
                      {/* Soft blur fade gold ayraç — sadece son badge'den sonra YOK */}
                      {i < arr.length - 1 && (
                        <div className="self-stretch py-3 flex-shrink-0">
                          <div className="w-px h-full" style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(200,160,80,0.20) 20%, rgba(200,160,80,0.30) 50%, rgba(200,160,80,0.20) 80%, transparent 100%)', filter: 'blur(0.4px)' }} />
                        </div>
                      )}
                    </Fragment>
                  ))}
                </div>

                {/* Üst sıra: 3 kart (Çeyrek, Yarım+Popüler, Ata) — premium emboss, butonsuz */}
                {(() => {
                  const topItems = goldOptions.filter(g => ['ceyrek_altin', 'yarim_altin', 'ata_altin'].includes(g.id));
                  return (
                    <div className="grid grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
                      {topItems.map((gold) => {
                        const isHighlight = gold.id === 'yarim_altin';
                        return (
                          <div key={gold.id} className="relative">
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
                                        ? '0 10px 28px rgba(184,134,11,0.20), 0 3px 10px rgba(184,134,11,0.10), inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(184,134,11,0.10), inset 0 12px 28px rgba(212,168,82,0.10), inset 0 -8px 24px rgba(212,168,82,0.08)'
                                        : '0 6px 18px rgba(180,140,80,0.14), 0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(180,140,80,0.08), inset 0 10px 20px rgba(212,168,82,0.05)',
                                      border: isHighlight ? '1.5px solid rgba(200,160,80,0.55)' : '1px solid rgba(220,200,170,0.30)',
                                    }}>
                              {/* Soft top warm glow — özellikle Popüler kartta belirgin */}
                              <div aria-hidden="true" className="absolute top-0 left-0 right-0 pointer-events-none"
                                   style={{
                                     height: '50%',
                                     background: isHighlight
                                       ? 'radial-gradient(ellipse at 50% 0%, rgba(212,168,82,0.18) 0%, transparent 70%)'
                                       : 'radial-gradient(ellipse at 50% 0%, rgba(212,168,82,0.10) 0%, transparent 70%)',
                                   }} />
                              {/* İsim — daraltıldı */}
                              <div className="text-[13px] md:text-[16px] font-bold mb-2 md:mb-2.5 whitespace-nowrap" style={{ color: '#2B2B2B', fontFamily: 'var(--font-geist-sans), Inter, sans-serif' }}>{gold.name}</div>
                              {/* Görsel — daraltıldı */}
                              <div className="relative w-16 h-16 md:w-[88px] md:h-[88px] mx-auto mb-2 md:mb-2.5 group-hover:scale-105 transition-transform duration-300">
                                <Image src={gold.image} alt={gold.name} fill className="object-contain drop-shadow-lg" />
                              </div>
                              {/* Fiyat — daraltıldı */}
                              <div className="text-[14px] md:text-[17px] font-bold" style={{ color: '#B8860B', letterSpacing: '0.2px', fontFamily: 'var(--font-geist-sans), Inter, sans-serif' }}>
                                ₺{gold.price.toLocaleString()}
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Alt sıra: 2 yatay kart — dikey küçültüldü, gri açıklama kaldırıldı, sadece başlık */}
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {goldOptions.filter(g => ['gram_altin', 'nakit'].includes(g.id)).map((gold) => (
                    <button key={gold.id} onClick={() => handleGoldSelect(gold.id)}
                            className={`group relative rounded-2xl pr-2.5 py-1 md:py-1.5 transition-all duration-300 hover:-translate-y-1 active:translate-y-0 flex flex-col items-center justify-center cursor-pointer overflow-hidden gold-card ${gold.id === 'gram_altin' ? 'pl-9 md:pl-10' : 'pl-[44px] md:pl-[50px]'}`}
                            style={{
                              background: 'linear-gradient(180deg, #FFFFFF 0%, #FFFCF5 100%)',
                              boxShadow: '0 6px 18px rgba(180,140,80,0.14), 0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(180,140,80,0.08), inset 0 10px 20px rgba(212,168,82,0.05)',
                              border: '1px solid rgba(220,200,170,0.30)',
                            }}>
                      {/* İkon — Gram hafif sağda, Özel sola yapışık */}
                      <div className={`absolute top-1/2 -translate-y-1/2 flex-shrink-0 ${gold.id === 'gram_altin' ? 'left-3 md:left-3.5' : 'left-1.5 md:left-2'}`}>
                        {gold.id === 'gram_altin' ? (
                          <div className="relative w-7 h-7 md:w-8 md:h-8 group-hover:scale-105 transition-transform">
                            <Image src="/altintakgram.png" alt="Gram Altın" fill className="object-contain drop-shadow-md" />
                          </div>
                        ) : (
                          <div className="relative w-10 h-10 md:w-12 md:h-12 group-hover:scale-105 transition-transform">
                            <Image src="/tl-icon.png" alt="Özel Miktar" fill className="object-contain drop-shadow-md" />
                          </div>
                        )}
                      </div>
                      {/* Başlık — gri ama bold */}
                      <div className="text-[14px] md:text-[16px] font-bold whitespace-nowrap leading-tight" style={{ color: '#6B6B6B', fontFamily: 'var(--font-geist-sans), Inter, sans-serif' }}>
                        {gold.id === 'nakit' ? 'Özel Miktar' : gold.name}
                      </div>
                      {/* Fiyat / Belirleyin */}
                      <div className="text-[12px] md:text-[14px] font-medium whitespace-nowrap leading-tight" style={{ color: '#B8860B', letterSpacing: '0.2px', fontFamily: 'var(--font-geist-sans), Inter, sans-serif' }}>
                        {gold.id === 'nakit' ? 'Siz Belirleyin' : `₺${gold.price.toLocaleString()}`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* SAĞ PANEL - Tebrik Kartları + Galeri — mobilde display:contents, masaüstünde 320px column */}
          <div ref={rightPanelRef} className="contents lg:flex lg:w-[320px] lg:flex-shrink-0 lg:flex-col lg:gap-3 lg:min-h-0">
            {/* Video Tebrik - warm cream — masaüstünde sabit yükseklik (3 kart eşit) */}
            <div onClick={() => setShowVideoRecorder(true)} className={`rounded-2xl p-5 flex items-center gap-3 transition-all duration-200 hover:-translate-y-1 cursor-pointer lg:h-[78px] ${activeMobileTab !== 'tebrik' ? 'max-lg:hidden' : ''}`} style={{ background: 'linear-gradient(135deg, #FBF3EE, #F4E5DC)', boxShadow: '0 4px 16px rgba(150,110,90,0.08)', border: '1px solid rgba(180,70,80,0.1)' }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 25px rgba(180,70,80,0.14)'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(150,110,90,0.08)'; }}>
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
            <div onClick={() => setShowVoiceRecorder(true)} className={`rounded-2xl p-5 flex items-center gap-3 transition-all duration-200 hover:-translate-y-1 cursor-pointer lg:h-[78px] ${activeMobileTab !== 'tebrik' ? 'max-lg:hidden' : ''}`} style={{ background: 'linear-gradient(135deg, #F4F9FC, #E5EFF6)', boxShadow: '0 4px 16px rgba(111,175,207,0.10)', border: '1px solid rgba(111,175,207,0.14)' }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 25px rgba(111,175,207,0.16)'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(111,175,207,0.10)'; }}>
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
            <div id="tebrik-section" onClick={() => setShowMessageModal(true)} className={`rounded-2xl p-5 flex items-center gap-3 transition-all duration-200 hover:-translate-y-1 cursor-pointer lg:h-[78px] ${activeMobileTab !== 'tebrik' ? 'max-lg:hidden' : ''}`} style={{ background: 'linear-gradient(135deg, #F4FAF5, #E5F0E5)', boxShadow: '0 4px 16px rgba(91,168,101,0.10)', border: '1px solid rgba(76,175,80,0.14)' }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 25px rgba(76,175,80,0.16)'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(91,168,101,0.10)'; }}>
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
            <div className={`rounded-2xl px-5 pt-4 pb-4 flex flex-col relative overflow-hidden lg:flex-1 lg:justify-between ${activeMobileTab !== 'album' ? 'max-lg:hidden' : ''}`} style={{ backgroundImage: 'url(/bg-album-canli.png)', backgroundSize: '108% 102%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', boxShadow: '0 16px 44px rgba(200,140,140,0.12), 0 4px 14px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)' }}>

              {/* Header — Fotoğraf Albümü (rose + siyah + gold dash, kalp kaldırıldı) */}
              <div className="text-center relative z-10 mt-1 lg:mt-3 mb-1">
                <h3 className="flex items-center justify-center gap-2 md:gap-3"
                    style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontWeight: 500, fontSize: 'clamp(26px, 5.8vw, 32px)', letterSpacing: '0.3px', lineHeight: 1.1, textShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                  {/* Sol gold dash */}
                  <span className="flex-shrink-0 h-[1.5px] rounded-full"
                        style={{ width: 'clamp(20px, 6vw, 36px)', background: 'linear-gradient(to right, transparent, #D4A852, transparent)' }} />
                  <span>
                    <span style={{ color: '#B85258' }}>Fotoğraf </span>
                    <span style={{ color: '#2B2B2B' }}>Albümü</span>
                  </span>
                  {/* Sağ gold dash */}
                  <span className="flex-shrink-0 h-[1.5px] rounded-full"
                        style={{ width: 'clamp(20px, 6vw, 36px)', background: 'linear-gradient(to left, transparent, #D4A852, transparent)' }} />
                </h3>
              </div>

              {/* Statik 3-foto layout — %15 küçültüldü (210→180), başlığa yakın */}
              <div className="relative w-full -mt-1 mb-1 flex items-center justify-center" style={{ height: 180 }}>
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
                          <img src={slideshowPhotos[1]} alt="" className="block object-cover rounded-md w-[91px] h-[105px] lg:w-[119px] lg:h-[138px]" />
                        </div>
                      </div>
                    )}

                    {/* Sağ foto — sağa eğri (play overlay kaldırıldı, video yok), daha ince çerçeve */}
                    {slideshowPhotos[2] && (
                      <div onClick={() => setPhotoLightboxIndex(2)}
                           className="absolute cursor-pointer transition-transform hover:scale-[1.03]"
                           style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%) translateX(85px) rotate(7deg)', zIndex: 1 }}>
                        <div className="bg-white p-0.5 rounded-lg" style={{ boxShadow: '0 6px 16px rgba(80,60,40,0.20), 0 2px 6px rgba(0,0,0,0.06)' }}>
                          <img src={slideshowPhotos[2]} alt="" className="block object-cover rounded-md w-[91px] h-[105px] lg:w-[119px] lg:h-[138px]" />
                        </div>
                      </div>
                    )}

                    {/* Orta foto — büyük, ön katman, 128+ badge, daha ince beyaz çerçeve (p-1.5→p-1) */}
                    {slideshowPhotos[0] && (
                      <div onClick={() => setPhotoLightboxIndex(0)}
                           className="absolute cursor-pointer transition-transform hover:scale-[1.03]"
                           style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%) translateY(-6px)', zIndex: 3 }}>
                        <div className="bg-white p-1 rounded-xl relative" style={{ boxShadow: '0 16px 36px rgba(80,60,40,0.32), 0 4px 12px rgba(0,0,0,0.10)' }}>
                          <img src={slideshowPhotos[0]} alt="" className="block object-cover rounded-lg w-[110px] h-[129px] lg:w-[144px] lg:h-[167px]" />
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

              {/* Filmstrip — 3 fotoğrafa yakın (mt-0→-mt-2), kareler +%10 (62→68, 70→77) */}
              {slideshowPhotos.length > 0 && (
                <div className="overflow-hidden -mt-2 mb-3 relative z-10" style={{ maskImage: 'linear-gradient(to right, transparent 0, black 5%, black 95%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0, black 5%, black 95%, transparent 100%)' }}>
                  <style>{`
                    @keyframes albumFilmstripRTL {
                      0% { transform: translateX(0); }
                      100% { transform: translateX(-50%); }
                    }
                  `}</style>
                  <div style={{ display: 'flex', gap: '8px', width: 'fit-content', animation: 'albumFilmstripRTL 28s linear infinite' }}>
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

            {/* "Sende bu mutlu gününü..." CTA — sadece masaüstü (mobilde tab bar var) */}
            <div className="hidden lg:flex rounded-2xl p-5 flex-col items-center text-center gap-3" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', border: '1px solid rgba(200,104,110,0.12)' }}>
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
          </div>{/* end ORTA + SAĞ PANEL WRAPPER */}
        </div>
      </div>

      {/* MOBİL BOTTOM TAB NAV — Altın Tak / Tebrik Et / Albüm (icon yanda, premium) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pt-2"
           style={{
             background: 'linear-gradient(180deg, rgba(255,251,248,0.92) 0%, rgba(253,247,243,0.97) 100%)',
             backdropFilter: 'blur(20px)',
             WebkitBackdropFilter: 'blur(20px)',
             borderTop: '1px solid rgba(200,104,110,0.10)',
             boxShadow: '0 -6px 24px rgba(200,104,110,0.06), 0 -1px 0 rgba(255,250,247,0.5)',
           }}>
        <div className="flex items-center justify-around gap-1.5">
          {[
            { id: 'altin' as const, label: 'Altın Tak', icon: (
              <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                {/* Kurdele (ribbon) */}
                <path d="M8 8L6 4.5h2.5L10 2.5 11.5 4l1-1.5L14 4.5l1.5-2H18L16 8" />
                {/* Madeni */}
                <circle cx="12" cy="14.5" r="5.5" />
                {/* Merkez nokta */}
                <circle cx="12" cy="14.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            ) },
            { id: 'tebrik' as const, label: 'Tebrik Et', icon: (
              <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                {/* Konuşma balonu */}
                <path d="M21 11.5a8.5 8.5 0 01-12.5 7.5L3 21l1.9-5.7A8.5 8.5 0 1121 11.5z" />
                {/* İçinde kalp (dolu) */}
                <path d="M12 14.5s-3-1.7-3-3.7c0-1 0.9-1.8 1.9-1.8 0.6 0 1.1 0.3 1.1 0.3s0.5-0.3 1.1-0.3c1 0 1.9 0.8 1.9 1.8 0 2-3 3.7-3 3.7z" fill="currentColor" stroke="none" />
              </svg>
            ) },
            { id: 'album' as const, label: 'Albüm', icon: (
              <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                {/* Arka foto */}
                <rect x="7" y="3.5" width="13.5" height="13.5" rx="2" />
                {/* Ön foto */}
                <rect x="3.5" y="7" width="13.5" height="13.5" rx="2" fill="currentColor" fillOpacity="0.08" />
                {/* Güneş + dağ */}
                <circle cx="7.5" cy="11.5" r="1.3" />
                <path d="M3.5 18l3.5-3.5 2.5 2.5 3-3 4.5 4.5" />
              </svg>
            ) },
          ].map((tab) => {
            const isActive = activeMobileTab === tab.id;
            return (
              <button key={tab.id}
                      onClick={() => { setActiveMobileTab(tab.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl transition-all active:scale-[0.96]"
                      style={{
                        color: isActive ? '#9F4F58' : '#9A8989',
                        background: isActive ? 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(253,243,243,0.94) 100%)' : 'transparent',
                        boxShadow: isActive ? '0 4px 14px rgba(200,104,110,0.14), 0 1px 3px rgba(160,80,90,0.06), inset 0 1px 0 rgba(255,255,255,0.95)' : 'none',
                        border: isActive ? '1px solid rgba(232,165,169,0.45)' : '1px solid transparent',
                      }}>
                {tab.icon}
                <span className="text-[11.5px] font-semibold tracking-[0.2px] whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Photo Gallery Popup */}
      {showPhotoGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowPhotoGallery(false)} style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="rounded-3xl max-w-2xl w-full overflow-hidden relative" onClick={(e) => e.stopPropagation()} style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(40px)', boxShadow: '0 25px 80px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.4)' }}>
            <button onClick={() => setShowPhotoGallery(false)} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-[13px]" style={{ color: '#9F4F58', background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(253,243,243,0.96) 100%)', boxShadow: '0 4px 14px rgba(200,104,110,0.14), 0 1px 4px rgba(160,80,90,0.06), inset 0 1px 0 rgba(255,255,255,0.95)', border: '1px solid rgba(232,165,169,0.45)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="#C8686E" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span style={{ fontFamily: 'var(--font-geist-sans), Inter, sans-serif', letterSpacing: '0.2px' }}>Fotoğraf Albümü</span>
                </div>
              </div>
              {slideshowPhotos.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {slideshowPhotos.map((url, i) => (
                    <div key={i} onClick={() => setPhotoLightboxIndex(i)} className="aspect-square rounded-xl overflow-hidden transition-all hover:scale-105 cursor-pointer" style={{ border: '1px solid rgba(200,104,110,0.1)' }}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
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
        </div>
      )}

      {showVideoRecorder && event && (
        <VideoRecorder eventId={event.id} senderName={viewerName} onSuccess={() => { setShowVideoRecorder(false); setVideoTebrikCount(c => c + 1); setVideoNotification({ text: `${viewerName} video tebrik gönderdi!`, type: 'video' }); setTimeout(() => setVideoNotification(null), 8000); }} onClose={() => setShowVideoRecorder(false)} />
      )}

      {showVoiceRecorder && event && (
        <VoiceRecorder eventId={event.id} senderName={viewerName} onSuccess={() => { setShowVoiceRecorder(false); setSesliTebrikCount(c => c + 1); setVideoNotification({ text: `${viewerName} sesli tebrik gönderdi!`, type: 'voice' }); setTimeout(() => setVideoNotification(null), 8000); }} onClose={() => setShowVoiceRecorder(false)} />
      )}

      {showPaymentModal && selectedGold && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10000, background: 'rgba(30,25,15,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <div className="rounded-[24px] max-w-[420px] w-full overflow-hidden relative" onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(165deg, rgba(255,252,245,0.95), rgba(248,243,232,0.92))', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', boxShadow: '0 30px 90px rgba(0,0,0,0.25), 0 0 0 1px rgba(212,175,55,0.08) inset, 0 1px 0 rgba(255,255,255,0.5) inset' }}>
            {/* Decorative shimmer */}
            <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(212,175,55,0.06) 0%, transparent 100%)' }} />
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-[0.06] pointer-events-none" style={{ background: '#D4AF37' }} />

            {/* Close button */}
            <button onClick={handleCloseModal} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgba(0,0,0,0.06)', color: '#999' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

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
                  </div>
                )}

                {/* Payment method selection */}
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ödeme Yöntemini Seçin</h3>
                <div className="space-y-2.5 mb-5">
                  {/* Banka / IBAN */}
                  <button onClick={() => { setPaymentMethod('iban'); if (selectedGold === 'nakit' && customAmount) handleCustomAmountSubmit(); setPaymentStep(2); }} className="group w-full flex items-center gap-3.5 rounded-2xl p-4 text-left transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 cursor-pointer" style={{ background: '#FFFFFF', border: '1.5px solid rgba(212,175,55,0.15)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(212,175,55,0.12), 0 4px 12px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.15)'; }}>
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
                  <button onClick={() => { setPaymentMethod('qr'); if (selectedGold === 'nakit' && customAmount) handleCustomAmountSubmit(); setPaymentStep(2); }} className="group w-full flex items-center gap-3.5 rounded-2xl p-4 text-left transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 cursor-pointer" style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,180,140,0.12)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(212,175,55,0.1), 0 4px 12px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.25)'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = 'rgba(200,180,140,0.12)'; }}>
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
                    <button onClick={() => { setPaymentMethod('crypto'); if (selectedGold === 'nakit' && customAmount) handleCustomAmountSubmit(); setPaymentStep(2); }} className="group w-full flex items-center gap-3.5 rounded-2xl p-4 text-left transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 cursor-pointer" style={{ background: '#FFFFFF', border: '1.5px solid rgba(200,180,140,0.12)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(212,175,55,0.1), 0 4px 12px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.25)'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = 'rgba(200,180,140,0.12)'; }}>
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
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Banka</p>
                          <p className="font-semibold text-gray-800 text-sm mt-0.5">{event.bank_holder_name || event.groom_full_name}</p>
                        </div>
                      </div>
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
                  <p className="text-xs text-gray-600 leading-relaxed text-center">Şimdi banka uygulamanızdan çiftin hesabına para gönderimini yapın ve ardından bu sayfaya dönerek onaylayın</p>
                </div>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

                {/* SSL badge */}
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-300 mb-3">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  256-bit SSL ile korunur
                </div>

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
                <button onClick={() => { setPaymentStep(1); setPaymentMethod(null); }} className="w-full py-2.5 text-gray-400 hover:text-gray-600 text-xs font-medium mt-1">← Ödeme Yöntemine Dön</button>
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
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} onFocus={(e) => { setTimeout(() => { e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 350); }} placeholder={`${event.bride_first_name} & ${event.groom_first_name} için tebrik mesajınızı yazın...`} rows={4} className="w-full px-4 py-3 bg-transparent outline-none text-gray-800 placeholder:text-gray-300 text-sm resize-none" style={{ fontFamily: 'Georgia, serif' }} />
                <div className="flex items-center gap-1 px-3 py-2" style={{ borderTop: '1px solid rgba(76,175,80,0.06)' }}>
                  <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`transition-colors text-lg ${showEmojiPicker ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}>😊</button>
                </div>
              </div>

              {showEmojiPicker && (
                <div className="mt-2 p-2 rounded-xl max-h-24 overflow-y-auto" style={{ background: 'rgba(76,175,80,0.04)', border: '1px solid rgba(76,175,80,0.1)' }}>
                  <div className="flex flex-wrap gap-1">{emojis.map((emoji, index) => (<button key={index} onClick={() => addEmoji(emoji)} className="text-lg hover:scale-125 transition-transform p-0.5">{emoji}</button>))}</div>
                </div>
              )}

              <button onClick={() => { sendMessage(); setShowMessageModal(false); setShowEmojiPicker(false); }} disabled={!message.trim()} className="w-full mt-4 text-white py-3.5 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02] disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #6DC275, #5BA865)', boxShadow: '0 4px 16px rgba(76,175,80,0.2)' }}>
                Tebrik Gönder
              </button>
            </div>
          </div>
        </div>
      )}

      {showWelcomeModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
            <div className="text-6xl mb-4">🎊</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Hoş Geldiniz!</h3>
            <p className="text-gray-600 mb-2">Katılım bilginiz çiftimize iletildi.</p>
            <p className="text-gray-500">Katıldığınız için teşekkür ederiz! 🎉</p>
          </div>
        </div>
      )}

      {/* Fotoğraf Yükleme Popup - Ana ekran */}
      {showPhotoUpload && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
          <div className="rounded-3xl max-w-md w-full overflow-hidden relative" style={{ background: 'linear-gradient(165deg, rgba(255,252,248,0.97), rgba(250,245,238,0.95))', boxShadow: '0 25px 80px rgba(0,0,0,0.15)', border: '1px solid rgba(200,104,110,0.1)' }}>
            {photoUploadSuccess ? (
              <div className="p-10 text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Fotoğraflarınız Yüklendi!</h3>
                <p className="text-gray-500 text-sm mb-6">Çift onayladığında canlı yayın sayfasında görünecek.</p>
                <button onClick={() => { setShowPhotoUpload(false); setPhotoUploadSuccess(false); setPhotoUploadFiles([]); setPhotoUploadPreviews([]); setPhotoUploaderName(''); }} className="text-white px-8 py-3 rounded-xl font-semibold transition-all hover:shadow-lg" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}>Tamam</button>
              </div>
            ) : (
              <>
                <div className="p-6 pb-0">
                  <button onClick={() => { setShowPhotoUpload(false); setPhotoUploadFiles([]); setPhotoUploadPreviews([]); }} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgba(0,0,0,0.06)', color: '#999' }}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F8C4C2, #ECA1A5)', boxShadow: '0 5px 12px rgba(200,104,110,0.20)' }}>
                      <Image src="/resim-ekle-icon-3.png" alt="" width={36} height={36} className="object-contain" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Fotoğraf Yükle</h3>
                      <p className="text-xs text-gray-400">Nikah gününden fotoğraflarınızı paylaşın</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 pt-2">
                  <label className="block text-sm font-medium text-gray-600 mb-2">Adınız</label>
                  <input type="text" value={photoUploaderName || viewerName} onChange={(e) => setPhotoUploaderName(e.target.value)} placeholder="Adınızı yazın" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#C8686E]/40 outline-none text-gray-900 placeholder:text-gray-400 mb-4" />
                  <label className="block text-sm font-medium text-gray-600 mb-2">Fotoğraflar (en fazla 9)</label>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {photoUploadPreviews.map((prev, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                        <img src={prev} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => { setPhotoUploadFiles(f => f.filter((_, idx) => idx !== i)); setPhotoUploadPreviews(p => p.filter((_, idx) => idx !== i)); }} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                    {photoUploadFiles.length < 9 && (
                      <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-[#C8686E]/30 transition-colors">
                        <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        <span className="text-[10px] text-gray-300 mt-1">Ekle</span>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                          const files = Array.from(e.target.files || []).slice(0, 9 - photoUploadFiles.length);
                          setPhotoUploadFiles(prev => [...prev, ...files]);
                          files.forEach(file => { const reader = new FileReader(); reader.onload = (ev) => setPhotoUploadPreviews(prev => [...prev, ev.target?.result as string]); reader.readAsDataURL(file); });
                        }} />
                      </label>
                    )}
                  </div>
                  <button onClick={async () => {
                    const name = photoUploaderName || viewerName;
                    if (!name.trim() || photoUploadFiles.length === 0 || !event) return;
                    setUploadingGuestPhotos(true);
                    try {
                      const urls: string[] = [];
                      for (const file of photoUploadFiles) {
                        const fileName = `pending/${event.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
                        const { error } = await supabase.storage.from('slideshow-photos').upload(fileName, file, { contentType: 'image/jpeg' });
                        if (!error) { const { data: urlData } = supabase.storage.from('slideshow-photos').getPublicUrl(fileName); urls.push(urlData.publicUrl); }
                      }
                      if (urls.length > 0) { await supabase.from('photo_requests').insert({ event_id: event.id, sender_name: name, photo_urls: urls, status: 'pending' }); }
                      setPhotoUploadSuccess(true);
                    } catch (e) { console.error('Photo upload error:', e); }
                    setUploadingGuestPhotos(false);
                  }} disabled={!(photoUploaderName || viewerName).trim() || photoUploadFiles.length === 0 || uploadingGuestPhotos} className="w-full disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold transition-all hover:shadow-lg" style={{ background: (photoUploaderName || viewerName).trim() && photoUploadFiles.length > 0 ? 'linear-gradient(135deg, #D17075, #C8686E)' : undefined }}>
                    {uploadingGuestPhotos ? 'Yükleniyor...' : 'Gönder'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showCopiedToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg" style={{ zIndex: 10002 }}>
          ✓ Kopyalandı!
        </div>
      )}
    </main>
  );
}