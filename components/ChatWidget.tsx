"use client";

import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  ticketNumber?: string;
}

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Merhaba! Ben Nikahım destek asistanınız Elif. Size nasıl yardımcı olabilirim?",
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://haeifluvvazdealsofle.supabase.co";
const SUPABASE_ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhZWlmbHV2dmF6ZGVhbHNvZmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNDM2OTcsImV4cCI6MjA4MTcxOTY5N30.p-Lren_jLUuA1BIP1TgRmv5gK4cJuIf-hkZIqo5I1pA";

const EMAILJS = {
  service_id: "service_ibwy6qp",
  template_id: "template_yqt3v0n",
  user_id: "gEM0kiWpFVk06tmCZ",
};

interface Props {
  userEmail?: string;
  userName?: string;
  /** Sayfa içine gömülü mü (false = sağ altta floating buton) */
  embedded?: boolean;
  initialOpen?: boolean;
}

export default function ChatWidget({ userEmail = "", userName = "", embedded = false, initialOpen = false }: Props) {
  const [open, setOpen] = useState(initialOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [guestName, setGuestName] = useState(userName);
  const [guestEmail, setGuestEmail] = useState(userEmail);
  const [hasStarted, setHasStarted] = useState(!!userEmail);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  // Sayfa içinden 'Canlı Destek' butonu chat'i açabilsin
  useEffect(() => {
    const opener = () => setOpen(true);
    window.addEventListener('nikahim:open-chat', opener);
    return () => window.removeEventListener('nikahim:open-chat', opener);
  }, []);

  // İlk girişte 5 sn göster, sonra otomatik collapse
  useEffect(() => {
    const t = setTimeout(() => setIsCollapsed(true), 5000);
    return () => clearTimeout(t);
  }, []);

  // Tam ekran modunda floating butonu gizle (canlı yayın videosu vs.)
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => {
      const fs = !!(
        document.fullscreenElement ||
        // @ts-expect-error vendor prefixes
        document.webkitFullscreenElement ||
        // @ts-expect-error vendor prefixes
        document.msFullscreenElement
      );
      setIsFullscreen(fs);
      if (fs) setOpen(false); // tam ekrana geçilirse açıksa kapat
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    document.addEventListener('msfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
      document.removeEventListener('msfullscreenchange', onChange);
    };
  }, []);

  const sendTicketEmail = async (ticketNumber: string, conversation: ChatMessage[]) => {
    const convoText = conversation
      .map((m) => (m.role === "user" ? "👤 Kullanıcı" : "💬 Elif") + ":\n" + m.content)
      .join("\n\n");
    const subject = `[${ticketNumber}] Yeni Destek Başvurusu (Web)`;
    const message =
      `BAŞVURU NUMARASI: ${ticketNumber}\n\n` +
      `KULLANICI:\nAd: ${guestName || "—"}\nEmail: ${guestEmail || "—"}\nKaynak: Web sitesi\n\n` +
      `═══════════════════════════════\nKONUŞMA:\n═══════════════════════════════\n\n${convoText}`;

    try {
      await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: EMAILJS.service_id,
          template_id: EMAILJS.template_id,
          user_id: EMAILJS.user_id,
          template_params: {
            from_name: guestName || "Nikahım Web Ziyaretçi",
            from_email: guestEmail || "noreply@nikahim.com",
            email: guestEmail || "noreply@nikahim.com",
            name: guestName || "Nikahım Web Ziyaretçi",
            subject,
            message,
          },
        }),
      });
    } catch (e) {
      console.warn("EmailJS hatası:", e);
    }
  };

  const startChat = () => {
    if (!guestName.trim() || !guestEmail.trim()) {
      alert("Lütfen adınızı ve e-posta adresinizi girin.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
      alert("Lütfen geçerli bir e-posta adresi girin.");
      return;
    }
    setHasStarted(true);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const newConvo = [...messages, userMsg];
    setMessages(newConvo);
    setInput("");
    setSending(true);
    setTyping(true);

    try {
      const apiMessages = newConvo
        .filter((m) => m !== WELCOME_MESSAGE || newConvo.length > 1)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`${SUPABASE_URL}/functions/v1/chat-bot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          userId: undefined, // Web ziyaretçi için yok, Elif escalate yaparsa mail gider
          userName: guestName,
          userEmail: guestEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTyping(false);
        setSending(false);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Üzgünüm, şu an bağlantıda bir sorun var. Lütfen birkaç saniye sonra tekrar deneyin." },
        ]);
        return;
      }

      const botMsg: ChatMessage = {
        role: "assistant",
        content: data.reply || "Bir hata oluştu, lütfen tekrar deneyin.",
        ticketNumber: data.ticketNumber || undefined,
      };

      // Gerçekçi yazma süresi: kısa 3s, orta 5s, uzun 7s
      const len = botMsg.content.length;
      const typingDelay = len < 100 ? 3000 : len < 200 ? 5000 : 7000;

      setTimeout(async () => {
        setTyping(false);
        setSending(false);
        setMessages((prev) => [...prev, botMsg]);

        if (data.escalated && data.ticketNumber) {
          await sendTicketEmail(data.ticketNumber, [...newConvo, botMsg]);
        }
      }, typingDelay);
    } catch {
      setTyping(false);
      setSending(false);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Bağlantı sorunu yaşıyoruz. Lütfen tekrar deneyin." },
      ]);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const chatBox = (
    <div
      className={
        embedded
          ? "w-full h-[560px] rounded-3xl overflow-hidden flex flex-col bg-white border border-gray-200 shadow-xl"
          : "fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-6 sm:w-[380px] sm:h-[560px] sm:max-h-[calc(100vh-120px)] sm:rounded-3xl overflow-hidden flex flex-col bg-white sm:border sm:border-gray-200 shadow-2xl z-[9999]"
      }
      style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-white" style={{ borderBottom: "1px solid rgba(200,104,110,0.12)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        {hasStarted && (
          <div className="relative">
            <div className="w-11 h-11 rounded-full overflow-hidden" style={{ border: "2px solid rgba(200,104,110,0.3)", boxShadow: "0 3px 8px rgba(200,104,110,0.15)" }}>
              <img src="/elif-avatar.png" alt="Elif" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white" />
          </div>
        )}
        <div className="flex-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="font-semibold text-sm text-gray-900">Nikahım Destek Asistanı · Çevrimiçi</span>
        </div>
        {!embedded && (
          <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-full hover:bg-black/5 flex items-center justify-center" style={{ color: "#8B7355" }}>
            ✕
          </button>
        )}
      </div>

      {/* Pre-chat start screen */}
      {!hasStarted ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6" style={{ background: "linear-gradient(180deg, #FDFCFA, #F8F5F0, #F5F2ED)" }}>
          <div className="w-24 h-24 rounded-full overflow-hidden mb-2" style={{ border: "3px solid rgba(200,104,110,0.35)", boxShadow: "0 8px 24px rgba(200,104,110,0.2)" }}>
            <img src="/elif-avatar.png" alt="Elif" className="w-full h-full object-cover" />
          </div>
          <div className="text-base font-bold mb-4" style={{ color: "#C8686E", fontFamily: "var(--font-playfair)" }}>Elif</div>
          <div className="text-center mb-5">
            <div className="text-lg font-bold text-gray-900 mb-1">Hoş geldiniz!</div>
            <div className="text-sm text-gray-600 leading-relaxed">
              Size daha iyi yardımcı olabilmemiz için<br />
              lütfen bilgilerinizi girin.
            </div>
          </div>
          <div className="w-full space-y-3">
            <input
              type="text"
              placeholder="Ad Soyad"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
              style={{ border: "1.5px solid rgba(200,104,110,0.2)" }}
            />
            <input
              type="email"
              placeholder="E-posta adresi"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
              style={{ border: "1.5px solid rgba(200,104,110,0.2)" }}
            />
            <button
              onClick={startChat}
              className="w-full py-3 rounded-xl font-bold text-white hover:shadow-xl transition-all"
              style={{ background: "linear-gradient(135deg, #E08284, #D17075, #C86068)", boxShadow: "0 6px 18px rgba(200,104,110,0.35)" }}
            >
              Sohbeti Başlat
            </button>
          </div>
          <div className="text-[10px] text-gray-400 mt-4 text-center">Bilgileriniz sadece destek talebinizin<br />yanıtlanması için kullanılır.</div>
        </div>
      ) : (
      <>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: "linear-gradient(180deg, #FDFCFA, #F8F5F0, #F5F2ED)" }}>
        {messages.map((m, i) => (
          <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden" style={{ border: "1.5px solid rgba(200,104,110,0.3)" }}>
                <img src="/elif-avatar.png" alt="Elif" className="w-full h-full object-cover" />
              </div>
            )}
            <div
              className={`max-w-[78%] px-4 py-2.5 rounded-2xl ${
                m.role === "user"
                  ? "text-white rounded-br-md"
                  : "bg-white text-gray-900 rounded-bl-md"
              }`}
              style={
                m.role === "user"
                  ? { background: "linear-gradient(135deg, #E08284, #D17075, #C86068)", boxShadow: "0 4px 12px rgba(200,104,110,0.3)" }
                  : { border: "1px solid rgba(200,104,110,0.12)", boxShadow: "0 2px 8px rgba(200,104,110,0.08)" }
              }
            >
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>
              {m.ticketNumber && (
                <div className="mt-3 rounded-xl p-3" style={{ background: "#FFF5F6", border: "1.5px solid rgba(200,104,110,0.3)" }}>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider mb-1" style={{ color: "#C8686E" }}>📋 BAŞVURU NUMARASI</div>
                  <div className="text-lg font-extrabold mb-1" style={{ color: "#B85A60" }}>{m.ticketNumber}</div>
                  <div className="text-[11px] leading-snug" style={{ color: "#8B5A5E" }}>Bu numarayı saklayın. 24 saat içinde size dönüş yapılacak.</div>
                </div>
              )}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden" style={{ border: "1.5px solid rgba(200,104,110,0.3)" }}>
              <img src="/elif-avatar.png" alt="Elif" className="w-full h-full object-cover" />
            </div>
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5" style={{ border: "1px solid rgba(200,104,110,0.12)", boxShadow: "0 2px 6px rgba(200,104,110,0.08)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#C8686E] animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#C8686E] animate-pulse" style={{ animationDelay: "0.15s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#C8686E] animate-pulse" style={{ animationDelay: "0.3s" }} />
              <span className="text-xs text-[#8B7355] italic ml-1">Elif yazıyor…</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-3 bg-white" style={{ borderTop: "1px solid rgba(200,104,110,0.12)" }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Sorunuzu yazın…"
          rows={1}
          disabled={sending}
          className="flex-1 resize-none px-4 py-2.5 rounded-2xl bg-[#FFF8F9] focus:bg-white focus:outline-none text-sm text-gray-900 placeholder:text-gray-400 max-h-24"
          style={{ fontFamily: "inherit", border: "1.5px solid rgba(200,104,110,0.15)" }}
        />
        <button
          onClick={sendMessage}
          disabled={sending || !input.trim()}
          className="w-11 h-11 rounded-full flex items-center justify-center text-white disabled:opacity-50 transition-opacity flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #E08284, #D17075, #C86068)", boxShadow: "0 4px 12px rgba(200,104,110,0.35)" }}
        >
          {sending ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="4" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
      </>
      )}
    </div>
  );

  if (embedded) return chatBox;
  if (isFullscreen) return null;

  return (
    <>
      {open && chatBox}
      {!open && (
        <div
          className="fixed right-0 flex items-stretch z-[9999]"
          style={{ bottom: 36, background: "#fff", boxShadow: "0 14px 36px rgba(60,40,40,0.14), 0 4px 14px rgba(200,104,110,0.10)", borderTopLeftRadius: 999, borderBottomLeftRadius: 999, border: '1px solid rgba(255,200,200,0.30)' }}
          aria-label="Canlı destek"
        >
          {/* Arrow tab — solda, her zaman görünür */}
          <button
            onClick={() => setIsCollapsed(c => !c)}
            className="flex items-center justify-center"
            style={{ width: 22, paddingLeft: 8, paddingRight: 2, color: '#C8686E' }}
            aria-label={isCollapsed ? "Canlı Destek aç" : "Kapat"}
          >
            <svg className={`w-[16px] h-[16px] transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Full button — slide collapse (sağa kapanır) */}
          <div
            className="overflow-hidden transition-all duration-500 ease-out"
            style={{ maxWidth: isCollapsed ? 0 : 200, opacity: isCollapsed ? 0 : 1 }}
          >
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 whitespace-nowrap"
            >
              <span className="relative">
                <span className="block w-[44px] h-[44px] rounded-full overflow-hidden bg-white" style={{ boxShadow: '0 2px 8px rgba(200,104,110,0.18)' }}>
                  <img src="/elif-avatar.png" alt="Elif" className="w-full h-full object-cover" />
                </span>
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[15px] font-bold" style={{ color: '#2B2B2B' }}>Canlı Destek</span>
                <svg className="w-4 h-4" fill="none" stroke="#9A8585" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
