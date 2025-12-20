"use client";

import { supabase } from '@/lib/supabase';
import Image from "next/image";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Event {
  id: string;
  groom_full_name: string;
  bride_full_name: string;
  groom_parent_names: string;
  bride_parent_names: string;
  event_date: string;
  event_time: string;
  couple_photo_url: string;
  bank_iban: string;
  bank_holder_name: string;
  status: string;
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
  const [loading, setLoading] = useState(true);
  const [viewerName, setViewerName] = useState("");
  const [isNameEntered, setIsNameEntered] = useState(false);
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, name: "Fatma Yılmaz", text: "Tebrikler! Çok güzel olmuş 💕", time: "14:32" },
    { id: 2, name: "Mehmet Kaya", text: "Allah mesut etsin 🎉", time: "14:33" },
    { id: 3, name: "Ayşe Demir", text: "Ömür boyu mutluluklar!", time: "14:35" },
  ]);
  const [selectedGold, setSelectedGold] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "iban" | null>(null);
  const [viewerCount, setViewerCount] = useState(0);

  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const goldOptions: GoldOption[] = [
    { id: "gram", name: "Gram Altın", price: 3562, image: "/altintakgram.png" },
    { id: "ceyrek", name: "Çeyrek Altın", price: 5765, image: "/altintak.png" },
    { id: "yarim", name: "Yarım Altın", price: 11388, image: "/altintak.png" },
    { id: "tam", name: "Tam Altın", price: 22578, image: "/altintak.png" },
    { id: "ata", name: "Ata Altın", price: 24850, image: "/altintak.png" },
    { id: "ozel", name: "Özel Miktar", price: 0, image: "/altintaklira.png" },
  ];

  const emojis = ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "☺️", "😚", "😙", "🥲", "😋", "😛", "😒", "😏", "😑", "🤐", "🤔", "🤭", "🤗", "🤑", "😝", "🥳", "😎", "🤓", "🥺", "😳", "😲", "😯", "😮", "🙈", "🙉", "🙊", "💋", "💯", "💥", "💫", "✌️", "❣️", "💔", "❤️‍🔥", "❤️", "💕", "🎉", "👏", "💐", "💍", "🎊", "🙏", "💒", "✨", "🌹", "💝", "🤵", "👰"];

  // Etkinlik verilerini çek
  useEffect(() => {
    const fetchEvent = async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('event_link', slug)
        .single();
      
      if (data) {
        setEvent(data);
      }
      setLoading(false);
    };

    if (slug) {
      fetchEvent();
    }
  }, [slug]);

  // İzleyici sayısını çek
  useEffect(() => {
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
  }, [event?.id]);

  // Geri sayım
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
      // İzleyiciyi veritabanına kaydet
      await supabase.from('viewers').insert({
        event_id: event.id,
        name: viewerName,
      });
      
      setIsNameEntered(true);
      setViewerCount(prev => prev + 1);
    }
  };

  const sendMessage = async () => {
    if (message.trim() && event?.id) {
      const newMessage: Message = {
        id: messages.length + 1,
        name: viewerName,
        text: message,
        time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
      };
      
      // Mesajı veritabanına kaydet
      await supabase.from('chat_messages').insert({
        event_id: event.id,
        message: message,
        has_emoji: message.includes('😀') || message.includes('❤') || message.includes('🎉'),
      });

      setMessages([...messages, newMessage]);
      setMessage("");
      setShowEmojiPicker(false);
    }
  };

  const addEmoji = (emoji: string) => {
    setMessage(message + emoji);
  };

  const handleGoldSelect = (goldId: string) => {
    setSelectedGold(goldId);
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = async () => {
    if (event?.id && selectedGold) {
      const selectedGoldOption = goldOptions.find(g => g.id === selectedGold);
      
      // Ödemeyi veritabanına kaydet
      await supabase.from('gift_payments').insert({
        event_id: event.id,
        sender_name: viewerName,
        gift_type: selectedGold,
        amount_tl: selectedGoldOption?.price || 0,
        status: 'pending',
      });
    }

    setShowPaymentModal(false);
    setShowSuccessModal(true);

    setTimeout(() => {
      setShowSuccessModal(false);
      setSelectedGold(null);
      setPaymentMethod(null);
    }, 3000);
  };

  const downloadQRCode = () => {
    const link = document.createElement("a");
    link.href = "/qr-sample.png";
    link.download = `qr-${selectedGold}-${event?.groom_full_name}.png`;
    link.click();
  };

  // Yükleniyor
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

  // Etkinlik bulunamadı
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

  // İsim giriş ekranı
  if (!isNameEntered) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Image src="/logo.png" alt="Nikahim.com" width={80} height={80} className="mx-auto rounded-full mb-6" />
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {event.groom_full_name} & {event.bride_full_name}
          </h1>
          <p className="text-gray-500 mb-8">Nikah Töreni Canlı Yayını</p>

          <div className="mb-6">
            <label className="block text-left text-gray-600 mb-2 font-medium">Adınız Soyadınız</label>
            <input
              type="text"
              value={viewerName}
              onChange={(e) => setViewerName(e.target.value)}
              placeholder="Örn: Fatma Yılmaz"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
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

          <p className="text-gray-400 text-sm mt-4">
            📅 {eventDate} - 🕐 {eventTime}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/'}>
            <Image src="/logo.png" alt="Nikahim.com" width={40} height={40} className="rounded-full" />
            <span className="font-bold text-blue-600 hidden sm:block">Nikahim.com</span>
          </div>
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                CANLI
              </span>
            )}
            <span className="text-gray-500 text-sm">👥 {viewerCount} izleyici</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-4">
            
            <div className="bg-black rounded-2xl overflow-hidden aspect-video relative">
              {isLive ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-6xl mb-4">📹</div>
                    <p className="text-xl">Canlı Yayın</p>
                    <p className="text-gray-400 text-sm mt-2">Yayın aktif</p>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-800 to-gray-900">
                  {event.couple_photo_url ? (
                    <Image 
                      src={event.couple_photo_url} 
                      alt="Çift" 
                      width={150} 
                      height={150} 
                      className="mb-6 rounded-full"
                    />
                  ) : (
                    <Image 
                      src="/wedding.png" 
                      alt="Çift" 
                      width={150} 
                      height={150} 
                      className="mb-6"
                    />
                  )}
                  
                  <h2 className="text-white text-xl font-bold mb-2">
                    {event.groom_full_name} & {event.bride_full_name}
                  </h2>
                  
                  <p className="text-gray-400 mb-6">Yayın başlamasına kalan süre</p>
                  
                  <div className="flex gap-4">
                    <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[70px]">
                      <div className="text-3xl font-bold text-white">{countdown.days}</div>
                      <div className="text-xs text-gray-400">Gün</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[70px]">
                      <div className="text-3xl font-bold text-white">{countdown.hours}</div>
                      <div className="text-xs text-gray-400">Saat</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[70px]">
                      <div className="text-3xl font-bold text-white">{countdown.minutes}</div>
                      <div className="text-xs text-gray-400">Dakika</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[70px]">
                      <div className="text-3xl font-bold text-white">{countdown.seconds}</div>
                      <div className="text-xs text-gray-400">Saniye</div>
                    </div>
                  </div>
                  
                  <p className="text-gray-500 text-sm mt-6">📅 {eventDate} - 🕐 {eventTime}</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6">
              <div className="flex items-center gap-4">
                {event.couple_photo_url ? (
                  <Image 
                    src={event.couple_photo_url} 
                    alt="Çift" 
                    width={80} 
                    height={80} 
                    className="object-cover rounded-full"
                  />
                ) : (
                  <Image 
                    src="/wedding.png" 
                    alt="Çift" 
                    width={80} 
                    height={80} 
                    className="object-cover"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {event.groom_full_name} & {event.bride_full_name}
                  </h1>
                  <p className="text-gray-500">📅 {eventDate} - 🕐 {eventTime}</p>
                </div>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4 mt-6 pt-6 border-t">
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-blue-600 font-medium mb-1">Gelin Ailesi</p>
                  <p className="text-gray-900">{event.bride_parent_names || '-'}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-blue-600 font-medium mb-1">Damat Ailesi</p>
                  <p className="text-gray-900">{event.groom_parent_names || '-'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">💰 Altın Tak</h2>
              <p className="text-gray-500 mb-6">Çifte altın takarak hediyenizi gönderin</p>
              
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {goldOptions.map((gold) => (
                  <button
                    key={gold.id}
                    onClick={() => handleGoldSelect(gold.id)}
                    className="group bg-gradient-to-br from-yellow-100 to-yellow-200 hover:from-yellow-200 hover:to-yellow-300 rounded-xl p-3 text-center transition-all hover:scale-105 hover:shadow-lg"
                  >
                    <div className="relative w-12 h-12 mx-auto mb-2">
                      <Image 
                        src={gold.image} 
                        alt={gold.name} 
                        fill 
                        className="object-contain group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <div className="text-xs font-medium text-gray-700">{gold.name}</div>
                    {gold.price > 0 && (
                      <div className="text-xs text-gray-500 mt-1">₺{gold.price.toLocaleString()}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl h-[600px] flex flex-col">
              <div className="p-4 border-b">
                <h2 className="font-bold text-gray-900">💬 Canlı Sohbet</h2>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 text-sm">{msg.name}</span>
                      <span className="text-gray-400 text-xs">{msg.time}</span>
                    </div>
                    <p className="text-gray-600 text-sm">{msg.text}</p>
                  </div>
                ))}
              </div>

              {showEmojiPicker && (
                <div className="px-4 py-2 border-t bg-gray-50 max-h-32 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {emojis.map((emoji, index) => (
                      <button
                        key={index}
                        onClick={() => addEmoji(emoji)}
                        className="text-2xl hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`px-3 py-2 rounded-xl transition-colors ${showEmojiPicker ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    😊
                  </button>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Mesajınızı yazın..."
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  />
                  <button
                    onClick={sendMessage}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-medium"
                  >
                    Gönder
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ödeme Modal */}
      {showPaymentModal && selectedGold && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowPaymentModal(false); setPaymentMethod(null); }}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {goldOptions.find(g => g.id === selectedGold)?.name} Gönder
            </h3>

            {!paymentMethod ? (
              <div className="space-y-3">
                <p className="text-gray-500 mb-4">Ödeme yöntemini seçin:</p>
                
                <button
                  onClick={() => setPaymentMethod("qr")}
                  className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-blue-500 rounded-xl transition-colors"
                >
                  <span className="text-3xl">📱</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">QR Kod ile FAST</div>
                    <div className="text-sm text-green-600">%0 Komisyon</div>
                  </div>
                </button>

                <button
                  onClick={() => setPaymentMethod("iban")}
                  className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-blue-500 rounded-xl transition-colors"
                >
                  <span className="text-3xl">🏦</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">IBAN ile Havale/EFT</div>
                    <div className="text-sm text-green-600">%0 Komisyon</div>
                  </div>
                </button>

                <button
                  onClick={() => { setShowPaymentModal(false); setPaymentMethod(null); }}
                  className="w-full py-3 text-gray-500 hover:text-gray-700 font-medium mt-4"
                >
                  İptal
                </button>
              </div>
            ) : paymentMethod === "qr" ? (
              <div className="text-center">
                <div className="bg-gray-100 rounded-xl p-6 mb-4">
                  <div className="w-48 h-48 bg-white mx-auto rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                    <span className="text-gray-400">QR Kod</span>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  Tutar: <strong>₺{goldOptions.find(g => g.id === selectedGold)?.price.toLocaleString()}</strong>
                </p>
                
                <button
                  onClick={downloadQRCode}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold mb-3 flex items-center justify-center gap-2"
                >
                  <span>📥</span> QR Kodu Kaydet
                </button>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                  <span className="text-yellow-600 text-lg">⚠️</span>
                  <p className="text-yellow-700 text-sm text-left">
                    Lütfen para gönderim işleminizi tamamladıktan sonra aşağıda bulunan ödemeyi tamamladım tuşuna basın.
                  </p>
                </div>
                
                <button
                  onClick={handlePaymentComplete}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold mb-3"
                >
                  Ödemeyi Tamamladım
                </button>
                <button
                  onClick={() => setPaymentMethod(null)}
                  className="w-full py-2 text-gray-500 hover:text-gray-700"
                >
                  ← Geri
                </button>
              </div>
            ) : (
              <div>
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <p className="text-sm text-gray-500 mb-1">Hesap Sahibi</p>
                  <p className="font-medium text-gray-900">{event.bank_holder_name || event.groom_full_name}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <p className="text-sm text-gray-500 mb-1">IBAN</p>
                  <p className="font-mono text-gray-900 text-sm">{event.bank_iban || 'TR00 0000 0000 0000 0000 0000 00'}</p>
                  <button 
                    onClick={() => navigator.clipboard.writeText((event.bank_iban || '').replace(/\s/g, ''))}
                    className="text-blue-500 text-sm mt-2 hover:underline"
                  >
                    📋 IBAN&apos;ı Kopyala
                  </button>
                </div>
                <p className="text-gray-600 mb-4">
                  Tutar: <strong>₺{goldOptions.find(g => g.id === selectedGold)?.price.toLocaleString()}</strong>
                </p>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                  <span className="text-yellow-600 text-lg">⚠️</span>
                  <p className="text-yellow-700 text-sm text-left">
                    Lütfen para gönderim işleminizi tamamladıktan sonra aşağıda bulunan ödemeyi tamamladım tuşuna basın.
                  </p>
                </div>

                <button
                  onClick={handlePaymentComplete}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold mb-3"
                >
                  Ödemeyi Tamamladım
                </button>
                <button
                  onClick={() => setPaymentMethod(null)}
                  className="w-full py-2 text-gray-500 hover:text-gray-700"
                >
                  ← Geri
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Başarı Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
            <div className="text-6xl mb-4">🎊</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Tebrikler!</h3>
            <p className="text-gray-600 mb-2">
              Çiftimize taktığınız altın miktarı iletildi.
            </p>
            <p className="text-gray-500">
              Katılımınız için teşekkür ederiz! 🎉
            </p>
          </div>
        </div>
      )}
    </main>
  );
}