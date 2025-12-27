"use client";

import { supabase } from '@/lib/supabase';
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import ApiVideoPlayer from '@/components/ApiVideoPlayer';
import VideoRecorder from '@/components/VideoRecorder';

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
  groom_full_name: string;
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
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "iban" | null>(null);
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
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [showReturningModal, setShowReturningModal] = useState(false);

  const pendingPaymentIdRef = useRef<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Müzik kontrolü - bekleme ekranında çal, yayın başlayınca durdur
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
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event?.id]);

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
    }
  };

  const addEmoji = (emoji: string) => {
    setMessage(message + emoji);
  };

  const handleGoldSelect = async (goldId: string) => {
    setSelectedGold(goldId);
    setCustomAmount("");
    setShowPaymentModal(true);
    
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

  const handlePaymentComplete = async () => {
    const paymentId = pendingPaymentIdRef.current;
    
    if (paymentId) {
      await supabase
        .from('gift_payments')
        .update({ status: 'completed' })
        .eq('id', paymentId);
    }

    setShowPaymentModal(false);
    setShowSuccessModal(true);
    
    setPendingPaymentId(null);
    pendingPaymentIdRef.current = null;

    setTimeout(() => {
      setShowSuccessModal(false);
      setSelectedGold(null);
      setPaymentMethod(null);
      setCustomAmount("");
    }, 3000);
  };

  const handleCloseModal = () => {
    setShowPaymentModal(false);
    setPaymentMethod(null);
    setSelectedGold(null);
    setCustomAmount("");
    setPendingPaymentId(null);
    pendingPaymentIdRef.current = null;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('IBAN kopyalandı!');
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('IBAN kopyalandı!');
    }
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
          <a href="/" className="text-blue-500 hover:underline">Ana Sayfaya Dön</a>
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
      <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center relative">
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <Image src="/logo.png" alt="Nikahım" width={40} height={40} className="rounded-full" />
            <span className="font-bold text-[#1565C0] text-base">Nikahım</span>
          </div>
          
          <div className="text-6xl mb-4 mt-8">😔</div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Yayın Kapasitesi Doldu</h1>
          
          <p className="text-gray-500 mb-6">
            {event.bride_full_name} & {event.groom_full_name} nikah töreni için izleyici kapasitesi dolmuştur.
          </p>
          
          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <p className="text-blue-600 text-sm">
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
      <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center relative">
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <Image src="/logo.png" alt="Nikahım" width={40} height={40} className="rounded-full" />
            <span className="font-bold text-[#1565C0] text-base">Nikahım</span>
          </div>
          
          <img src={event.couple_photo_url || "/logo.png"} alt="Çift Fotoğrafı" className="mx-auto rounded-full mb-4 object-cover w-[140px] h-[140px] border-4 border-blue-100 shadow-lg mt-8" />
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {event.bride_full_name} & {event.groom_full_name}
          </h1>
          
          <p className="text-gray-700 text-xl mb-1">
            🎉 Tekrar Hoş Geldin
          </p>
          <p className="text-gray-800 font-semibold text-lg mb-6">
            {viewerName}
          </p>
          
          <button
            onClick={handleReturningContinue}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            Devam Et
          </button>
        </div>
      </main>
    );
  }

  if (!isNameEntered) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center relative">
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <Image src="/logo.png" alt="Nikahım" width={40} height={40} className="rounded-full" />
            <span className="font-bold text-[#1565C0] text-base">Nikahım</span>
          </div>
          
          <img src={event.couple_photo_url || "/logo.png"} alt="Çift Fotoğrafı" className="mx-auto rounded-full mb-6 object-cover w-[160px] h-[160px] border-4 border-blue-100 shadow-lg mt-8" />
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {event.bride_full_name} & {event.groom_full_name}
          </h1>
          <p className="text-gray-500 mb-6">
            {event.event_type === 'dugun' ? 'Düğün Canlı Yayını' : 'Nikah Töreni Canlı Yayını'}
          </p>

          <div className="mb-6">
            <label className="block text-left text-gray-600 mb-2 font-medium">Adınız Soyadınız</label>
            <input
              type="text"
              value={viewerName}
              onChange={(e) => setViewerName(e.target.value)}
              placeholder="Örn: Fatma Yılmaz"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none text-gray-900 placeholder:text-gray-400"
              onKeyPress={(e) => e.key === "Enter" && handleNameSubmit()}
            />
          </div>

          <button
            onClick={handleNameSubmit}
            disabled={!viewerName.trim()}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            Yayına Katıl
          </button>

          <p className="text-gray-400 text-sm mt-4">📅 {eventDate} - 🕐 {eventTime}</p>
          <p className="text-gray-400 text-xs mt-2">👥 {viewerCount}/{eventPackage?.max_viewers || 50} izleyici</p>
        </div>

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
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 overflow-x-hidden w-full max-w-[100vw]">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/'}>
            <Image src="/logo.png" alt="Nikahım" width={40} height={40} className="rounded-full" />
            <span className="font-bold text-[#1565C0] hidden sm:block">Nikahım</span>
          </div>
          <div className="flex items-center gap-2">
            {streamData?.status === 'active' && (
              <span className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                CANLI
              </span>
            )}
            {streamData?.status === 'starting' && (
              <span className={`flex items-center gap-1 ${streamData?.isTest ? 'bg-orange-500' : 'bg-yellow-500'} text-white px-3 py-1 rounded-full text-sm font-medium`}>
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                {streamData?.isTest ? 'TEST BAŞLIYOR' : 'BAŞLIYOR'}
              </span>
            )}
            {streamData?.status === 'ended' && showEndedScreen && (
              <span className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                İŞLENİYOR
              </span>
            )}
            {streamData?.status === 'ended' && !showEndedScreen && !streamData?.isTest && (
              <span className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                ▶ KAYIT
              </span>
            )}
            
            {hasMusicSelected && isNameEntered && (!streamData?.status || streamData?.status === 'idle' || (streamData?.status === 'ended' && !showEndedScreen && streamData?.isTest)) && (
              isMusicPlaying ? (
                <button
                  onClick={toggleMusicMute}
                  className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  {musicMuted ? (
                    <><span>🎵</span> Müzik Çal</>
                  ) : (
                    <><span>🔇</span> Sessiz</>
                  )}
                </button>
              ) : (
                <button
                  onClick={startMusic}
                  className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <span>🎵</span> Müzik Çal
                </button>
              )
            )}
            
            <span className="text-gray-500 text-sm">👥 {viewerCount}/{eventPackage?.max_viewers || 50}</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 w-full">
          
          <div className="lg:col-span-2 space-y-4 w-full min-w-0">
            
            <div className="bg-black rounded-2xl overflow-hidden aspect-video lg:aspect-video relative">
              {streamData?.status === 'starting' && (
                <div className={`absolute inset-0 flex flex-col items-center justify-center ${streamData?.isTest ? 'bg-gradient-to-br from-gray-900 via-amber-950 to-gray-900' : 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800'}`}>
                  <div className="text-7xl mb-6 animate-pulse">{streamData?.isTest ? '⚙️' : '🎥'}</div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
                    {streamData?.isTest ? 'Test Yayını Birazdan Başlıyor' : 'Canlı Yayın Birazdan Başlıyor'}
                  </h2>
                  <p className="text-white/80 text-lg mb-6">Lütfen bekleyin...</p>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}

              {streamData?.status === 'ended' && showEndedScreen && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 z-10">
                  <div className="text-7xl mb-6">🎬</div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
                    {streamData?.isTest ? 'Test Yayını Sonlandı' : 'Canlı Yayın Sonlandı'}
                  </h2>
                  <p className="text-gray-300 text-lg mb-6">
                    {streamData?.isTest ? 'Test yayını kaydedilmedi.' : 'Video kaydı hazırlanıyor...'}
                  </p>
                  {!streamData?.isTest && (
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  )}
                </div>
              )}

              {streamData?.status === 'active' && streamData?.playbackId && (
                <ApiVideoPlayer
                  liveStreamId={streamData.playbackId || undefined}
                  videoId={streamData.videoId || undefined}
                  isLive={true}
                  isRecording={false}
                  overlayInfo={{
                    viewerCount: viewerCount,
                    isTest: streamData.isTest,
                  }}
                  className="w-full h-full"
                />
              )}

              {streamData?.status === 'ended' && !showEndedScreen && !streamData?.isTest && streamData?.playbackId && (
                <ApiVideoPlayer
                  liveStreamId={streamData.playbackId || undefined}
                  videoId={streamData.videoId || undefined}
                  isLive={false}
                  isRecording={true}
                  overlayInfo={{
                    viewerCount: viewerCount,
                    isTest: streamData.isTest,
                  }}
                  className="w-full h-full"
                />
              )}

              {streamData?.status === 'ended' && !showEndedScreen && streamData?.isTest && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <img src="/wedding-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-center" style={{ minHeight: '100%', minWidth: '100%' }} />
                  <div className="absolute inset-0 bg-black/60"></div>
                  
                  <div className="relative z-10 flex flex-col items-center justify-center h-full">
                    <img src={event.couple_photo_url || "/logo.png"} alt="Çift Fotoğrafı" className="mb-4 lg:mb-8 rounded-full object-cover border-4 border-white/30 shadow-2xl w-[140px] h-[140px] lg:w-[260px] lg:h-[260px] landscape:w-[200px] landscape:h-[200px]" />
                    
                    <div className="flex gap-2 lg:gap-3 landscape:gap-3">
                      <div className="bg-sky-200/30 backdrop-blur rounded-lg px-2 lg:px-4 py-1 lg:py-3 text-center min-w-[40px] lg:min-w-[60px] landscape:px-4 landscape:py-2 landscape:min-w-[60px]">
                        <div className="text-sm lg:text-2xl font-bold text-white landscape:text-xl">{countdown.days}</div>
                        <div className="text-[8px] lg:text-xs text-gray-300 landscape:text-xs">Gün</div>
                      </div>
                      <div className="bg-sky-200/30 backdrop-blur rounded-lg px-2 lg:px-4 py-1 lg:py-3 text-center min-w-[40px] lg:min-w-[60px] landscape:px-4 landscape:py-2 landscape:min-w-[60px]">
                        <div className="text-sm lg:text-2xl font-bold text-white landscape:text-xl">{countdown.hours}</div>
                        <div className="text-[8px] lg:text-xs text-gray-300 landscape:text-xs">Saat</div>
                      </div>
                      <div className="bg-sky-200/30 backdrop-blur rounded-lg px-2 lg:px-4 py-1 lg:py-3 text-center min-w-[40px] lg:min-w-[60px] landscape:px-4 landscape:py-2 landscape:min-w-[60px]">
                        <div className="text-sm lg:text-2xl font-bold text-white landscape:text-xl">{countdown.minutes}</div>
                        <div className="text-[8px] lg:text-xs text-gray-300 landscape:text-xs">Dakika</div>
                      </div>
                      <div className="bg-sky-200/30 backdrop-blur rounded-lg px-2 lg:px-4 py-1 lg:py-3 text-center min-w-[40px] lg:min-w-[60px] landscape:px-4 landscape:py-2 landscape:min-w-[60px]">
                        <div className="text-sm lg:text-2xl font-bold text-white landscape:text-xl">{countdown.seconds}</div>
                        <div className="text-[8px] lg:text-xs text-gray-300 landscape:text-xs">Saniye</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {(!streamData?.status || streamData?.status === 'idle') && !isLive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <img src="/wedding-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-center" style={{ minHeight: '100%', minWidth: '100%' }} />
                  <div className="absolute inset-0 bg-black/60"></div>
                  
                  <div className="relative z-10 flex flex-col items-center justify-center h-full">
                    <img src={event.couple_photo_url || "/logo.png"} alt="Çift Fotoğrafı" className="mb-4 lg:mb-8 rounded-full object-cover border-4 border-white/30 shadow-2xl w-[140px] h-[140px] lg:w-[260px] lg:h-[260px] landscape:w-[200px] landscape:h-[200px]" />
                    
                    <div className="flex gap-2 lg:gap-3 landscape:gap-3">
                      <div className="bg-sky-200/30 backdrop-blur rounded-lg px-2 lg:px-4 py-1 lg:py-3 text-center min-w-[40px] lg:min-w-[60px] landscape:px-4 landscape:py-2 landscape:min-w-[60px]">
                        <div className="text-sm lg:text-2xl font-bold text-white landscape:text-xl">{countdown.days}</div>
                        <div className="text-[8px] lg:text-xs text-gray-300 landscape:text-xs">Gün</div>
                      </div>
                      <div className="bg-sky-200/30 backdrop-blur rounded-lg px-2 lg:px-4 py-1 lg:py-3 text-center min-w-[40px] lg:min-w-[60px] landscape:px-4 landscape:py-2 landscape:min-w-[60px]">
                        <div className="text-sm lg:text-2xl font-bold text-white landscape:text-xl">{countdown.hours}</div>
                        <div className="text-[8px] lg:text-xs text-gray-300 landscape:text-xs">Saat</div>
                      </div>
                      <div className="bg-sky-200/30 backdrop-blur rounded-lg px-2 lg:px-4 py-1 lg:py-3 text-center min-w-[40px] lg:min-w-[60px] landscape:px-4 landscape:py-2 landscape:min-w-[60px]">
                        <div className="text-sm lg:text-2xl font-bold text-white landscape:text-xl">{countdown.minutes}</div>
                        <div className="text-[8px] lg:text-xs text-gray-300 landscape:text-xs">Dakika</div>
                      </div>
                      <div className="bg-sky-200/30 backdrop-blur rounded-lg px-2 lg:px-4 py-1 lg:py-3 text-center min-w-[40px] lg:min-w-[60px] landscape:px-4 landscape:py-2 landscape:min-w-[60px]">
                        <div className="text-sm lg:text-2xl font-bold text-white landscape:text-xl">{countdown.seconds}</div>
                        <div className="text-[8px] lg:text-xs text-gray-300 landscape:text-xs">Saniye</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-4 lg:p-6 w-full">
              <div className="flex items-center gap-4">
                <Image src="/wedding.png" alt="Nikah" width={80} height={80} className="object-contain" />
                <div>
                  <h1 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">{event.bride_full_name} & {event.groom_full_name}</h1>
                  <p className="text-gray-500">📅 {eventDate} - 🕐 {eventTime}</p>
                </div>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4 mt-6 pt-6 border-t">
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-blue-600 font-medium mb-1">Gelin Ailesi</p>
                  <p className="text-gray-900">
                    {event.bride_father_name && event.bride_mother_name 
                      ? `${event.bride_father_name} & ${event.bride_mother_name}`
                      : event.bride_father_name || event.bride_mother_name || '-'}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-blue-600 font-medium mb-1">Damat Ailesi</p>
                  <p className="text-gray-900">
                    {event.groom_father_name && event.groom_mother_name 
                      ? `${event.groom_father_name} & ${event.groom_mother_name}`
                      : event.groom_father_name || event.groom_mother_name || '-'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 lg:p-6 w-full">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">🎥 Video Tebrik</h2>
                  <p className="text-gray-500 text-sm">30 saniyelik video mesaj gönderin</p>
                </div>
                <button onClick={() => setShowVideoRecorder(true)} className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white px-5 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all hover:scale-105 shadow-lg">
                  <span>📹</span>
                  Video Çek
                </button>
              </div>
              <div className="bg-pink-50 rounded-xl p-3 text-sm text-pink-700">
                💡 Kameranızı açarak çifte özel bir video mesaj gönderin. Tüm video tebrikler sadece çift tarafından görüntülenebilir.
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 lg:p-6 w-full">
              <h2 className="text-xl font-bold text-gray-900 mb-4">💰 Altın Tak</h2>
              <p className="text-gray-500 mb-6">Çifte altın takarak hediyenizi gönderin</p>
              
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {goldOptions.map((gold) => (
                  <button key={gold.id} onClick={() => handleGoldSelect(gold.id)} className="group bg-gradient-to-br from-yellow-100 to-yellow-200 hover:from-yellow-200 hover:to-yellow-300 rounded-xl p-3 text-center transition-all hover:scale-105 hover:shadow-lg">
                    <div className="relative w-12 h-12 mx-auto mb-2">
                      <Image src={gold.image} alt={gold.name} fill className="object-contain" />
                    </div>
                    <div className="text-xs font-medium text-gray-700">{gold.name}</div>
                    {gold.price > 0 ? (
                      <div className="text-xs text-gray-500 mt-1">₺{gold.price.toLocaleString()}</div>
                    ) : (
                      <div className="text-xs text-gray-400 mt-1">Serbest</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 w-full min-w-0">
            <div className="bg-white rounded-2xl h-[400px] lg:h-[600px] flex flex-col">
              <div className="p-4 border-b">
                <h2 className="font-bold text-gray-900">💬 Canlı Sohbet</h2>
              </div>

              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-gray-400 text-center text-sm">Henüz mesaj yok. İlk mesajı siz gönderin!</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900 text-sm">{msg.name}</span>
                        <span className="text-gray-400 text-xs">{msg.time}</span>
                      </div>
                      <p className="text-gray-600 text-sm">{msg.text}</p>
                    </div>
                  ))
                )}
              </div>

              {showEmojiPicker && (
                <div className="px-4 py-2 border-t bg-gray-50 max-h-32 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {emojis.map((emoji, index) => (
                      <button key={index} onClick={() => addEmoji(emoji)} className="text-2xl hover:scale-125 transition-transform">
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 border-t">
                <div className="flex gap-1 lg:gap-2 pr-1">
                  <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`px-3 py-2 rounded-xl transition-colors ${showEmojiPicker ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
                    😊
                  </button>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Mesajınızı yazın..."
                    className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    onFocus={(e) => {
                      setTimeout(() => {
                        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 300);
                    }}
                  />
                  <button onClick={sendMessage} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-xl font-medium text-sm lg:text-base flex-shrink-0">
                    Gönder
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showVideoRecorder && event && (
        <VideoRecorder eventId={event.id} senderName={viewerName} onSuccess={() => setShowVideoRecorder(false)} onClose={() => setShowVideoRecorder(false)} />
      )}

      {showPaymentModal && selectedGold && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={handleCloseModal}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">{goldOptions.find(g => g.id === selectedGold)?.name} Gönder</h3>

            {selectedGold === "nakit" && !pendingPaymentId && (
              <div className="mb-4">
                <label className="block text-gray-600 mb-2 font-medium">Göndermek istediğiniz miktar</label>
                <input type="number" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder="Miktarı girin (₺)" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none text-lg" />
                <button onClick={handleCustomAmountSubmit} disabled={!customAmount || parseFloat(customAmount) <= 0} className="w-full mt-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold">Devam Et</button>
              </div>
            )}

            {(selectedGold !== "nakit" || pendingPaymentId) && !paymentMethod && (
              <div className="space-y-3">
                <p className="text-gray-500 mb-2">Ödeme yöntemini seçin:</p>
                <div className="bg-amber-50/70 text-amber-700 text-sm mb-4 flex items-center gap-2 px-3 py-2 rounded-lg">
                  💡 Tüm ödemeler doğrudan çiftin banka hesabına yapılmaktadır.
                </div>
                
                <button onClick={() => setPaymentMethod("qr")} className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-blue-500 rounded-xl transition-colors">
                  <span className="text-3xl">📱</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">QR Kod ile FAST</div>
                    <div className="text-sm text-green-600">%0 Komisyon</div>
                    <div className="text-xs text-gray-400">QR kodu taratarak tek tıkla</div>
                  </div>
                </button>

                <button onClick={() => setPaymentMethod("iban")} className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-blue-500 rounded-xl transition-colors">
                  <span className="text-3xl">🏦</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">IBAN ile Havale/EFT</div>
                    <div className="text-sm text-green-600">%0 Komisyon</div>
                    <div className="text-xs text-gray-400">IBAN bilgisi kopyalayarak para transferi</div>
                  </div>
                </button>

                <button onClick={handleCloseModal} className="w-full py-3 text-gray-500 hover:text-gray-700 font-medium mt-4">İptal</button>
              </div>
            )}

            {paymentMethod === "qr" && (
              <div className="text-center">
                <div className="bg-gray-100 rounded-xl p-6 mb-4">
                  {event.qr_codes?.[selectedGold === "gram_altin" ? "gram" : selectedGold === "ceyrek_altin" ? "ceyrek" : selectedGold === "yarim_altin" ? "yarim" : selectedGold === "tam_altin" ? "tam" : selectedGold === "ata_altin" ? "ata" : "ozel"] ? (
                    <>
                      <img src={event.qr_codes[selectedGold === "gram_altin" ? "gram" : selectedGold === "ceyrek_altin" ? "ceyrek" : selectedGold === "yarim_altin" ? "yarim" : selectedGold === "tam_altin" ? "tam" : selectedGold === "ata_altin" ? "ata" : "ozel"]} alt="QR Kod" className="w-48 h-48 mx-auto rounded-lg object-contain" />
                      <p className="text-gray-400 text-xs mt-2">💡 Kod üzerine basılı tutarak indirebilirsiniz</p>
                    </>
                  ) : (
                    <div className="w-48 h-48 bg-white mx-auto rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                      <span className="text-gray-400 text-center text-sm p-4">QR Kod Bulunamadı! Lütfen IBAN ile Havale/EFT Seçeneğini Seçin</span>
                    </div>
                  )}
                </div>
                
                <p className="text-gray-600 mb-4">Tutar: <strong>₺{getSelectedPrice().toLocaleString()}</strong></p>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                  <span className="text-yellow-600 text-lg">⚠️</span>
                  <p className="text-yellow-700 text-sm text-left">Lütfen sadece para gönderim işleminizi tamamladıktan sonra aşağıda ki -Ödemeyi Tamamladım- tuşuna basın.</p>
                </div>
                
                <button onClick={handlePaymentComplete} className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold mb-3">✓ Ödemeyi Tamamladım</button>
                <button onClick={() => setPaymentMethod(null)} className="w-full py-2 text-gray-500 hover:text-gray-700">← Geri</button>
              </div>
            )}

            {paymentMethod === "iban" && (
              <div>
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <p className="text-sm text-gray-500 mb-1">Hesap Sahibi</p>
                  <p className="font-medium text-gray-900">{event.bank_holder_name || event.groom_full_name}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <p className="text-sm text-gray-500 mb-1">IBAN</p>
                  <p className="font-mono text-gray-900 text-sm">{event.bank_iban || 'TR00 0000 0000 0000 0000 0000 00'}</p>
                  <button onClick={() => copyToClipboard((event.bank_iban || '').replace(/\s/g, ''))} className="text-blue-500 text-sm mt-2 hover:underline">📋 IBAN Kopyala</button>
                </div>
                <p className="text-gray-600 mb-4">Tutar: <strong>₺{getSelectedPrice().toLocaleString()}</strong></p>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                  <span className="text-yellow-600 text-lg">⚠️</span>
                  <p className="text-yellow-700 text-sm text-left">Lütfen sadece para gönderim işleminizi tamamladıktan sonra aşağıda ki -Ödemeyi Tamamladım- tuşuna basın.</p>
                </div>

                <button onClick={handlePaymentComplete} className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold mb-3">✓ Ödemeyi Tamamladım</button>
                <button onClick={() => setPaymentMethod(null)} className="w-full py-2 text-gray-500 hover:text-gray-700">← Geri</button>
              </div>
            )}
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

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
            <div className="text-6xl mb-4">🎊</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Tebrikler!</h3>
            <p className="text-gray-600 mb-2">Hediyeniz çiftimize iletildi.</p>
            <p className="text-gray-500">Katılımınız için teşekkür ederiz! 🎉</p>
          </div>
        </div>
      )}
    </main>
  );
}