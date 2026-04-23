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
    "Merhaba! Ben Nikahım destek asistanınız Elif. Sorularınızı ve ihtiyaçlarınızı yazın, yardımcı olayım. Çözemediğim bir durum olursa konuyu hemen Nikahım destek ekibine iletirim ve size bir referans kodu veririm.",
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
  const [needsContact, setNeedsContact] = useState(!userEmail);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

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

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    if (needsContact && (!guestName.trim() || !guestEmail.trim())) {
      alert("Lütfen önce adınızı ve e-posta adresinizi girin.");
      return;
    }
    if (needsContact) setNeedsContact(false);

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
      setTyping(false);
      setSending(false);

      if (!res.ok) {
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
      setMessages((prev) => [...prev, botMsg]);

      if (data.escalated && data.ticketNumber) {
        await sendTicketEmail(data.ticketNumber, [...newConvo, botMsg]);
      }
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
          : "fixed bottom-24 right-6 w-[380px] max-w-[calc(100vw-24px)] h-[560px] max-h-[calc(100vh-120px)] rounded-3xl overflow-hidden flex flex-col bg-white border border-gray-200 shadow-2xl z-[9999]"
      }
      style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100" style={{ background: "linear-gradient(135deg, #FDFCF8, #F8F3EB)" }}>
        <div className="relative">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: "#D4AF7A", fontFamily: "serif", boxShadow: "0 4px 12px rgba(184,150,90,0.3)" }}>
            E
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-gray-900">Elif</div>
          <div className="flex items-center gap-1.5 text-xs text-green-600">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Destek Asistanı · Çevrimiçi
          </div>
        </div>
        {!embedded && (
          <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-full hover:bg-black/5 flex items-center justify-center text-gray-500">
            ✕
          </button>
        )}
      </div>

      {/* Guest info */}
      {needsContact && (
        <div className="p-4 bg-[#FDFBF5] border-b border-gray-100 space-y-2">
          <div className="text-xs font-semibold text-[#8B6F3A] mb-1">Size daha iyi yardımcı olabilmem için bilgilerinizi alayım:</div>
          <input
            type="text"
            placeholder="Ad Soyad"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-[#D4AF7A] focus:outline-none text-sm text-gray-900"
          />
          <input
            type="email"
            placeholder="E-posta adresi"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-[#D4AF7A] focus:outline-none text-sm text-gray-900"
          />
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: "#FDFCF8" }}>
        {messages.map((m, i) => (
          <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: "#D4AF7A" }}>
                E
              </div>
            )}
            <div
              className={`max-w-[78%] px-4 py-2.5 rounded-2xl ${
                m.role === "user"
                  ? "bg-[#D4AF7A] text-white rounded-br-md"
                  : "bg-white text-gray-900 border border-gray-100 rounded-bl-md shadow-sm"
              }`}
            >
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>
              {m.ticketNumber && (
                <div className="mt-3 bg-[#FDFBF5] border border-[#D4AF7A]/40 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#8B6F3A] tracking-wider mb-1">📋 BAŞVURU NUMARASI</div>
                  <div className="text-lg font-extrabold text-[#6B5A3A] mb-1">{m.ticketNumber}</div>
                  <div className="text-[11px] text-[#8B7355] leading-snug">Bu numarayı saklayın. 24 saat içinde size dönüş yapılacak.</div>
                </div>
              )}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: "#D4AF7A" }}>
              E
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md shadow-sm px-4 py-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF7A] animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF7A] animate-pulse" style={{ animationDelay: "0.15s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF7A] animate-pulse" style={{ animationDelay: "0.3s" }} />
              <span className="text-xs text-[#8B7355] italic ml-1">Yazıyor…</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 p-3 border-t border-gray-100 bg-white">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Sorunuzu yazın…"
          rows={1}
          disabled={sending}
          className="flex-1 resize-none px-4 py-2.5 rounded-2xl border border-gray-200 bg-[#F9FAFB] focus:bg-white focus:border-[#D4AF7A] focus:outline-none text-sm text-gray-900 placeholder:text-gray-400 max-h-24"
          style={{ fontFamily: "inherit" }}
        />
        <button
          onClick={sendMessage}
          disabled={sending || !input.trim()}
          className="w-11 h-11 rounded-full flex items-center justify-center text-white disabled:opacity-50 transition-opacity flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #E8D3A3, #D4AF7A, #B8965A)" }}
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
    </div>
  );

  if (embedded) return chatBox;

  return (
    <>
      {open && chatBox}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-white z-[9999] hover:scale-105 transition-transform"
          style={{ background: "linear-gradient(135deg, #E8D3A3, #D4AF7A, #B8965A)", boxShadow: "0 12px 32px rgba(184,150,90,0.45)" }}
          aria-label="Canlı destek"
        >
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 11H6v-2h12v2zm0-4H6V7h12v2z" />
          </svg>
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
        </button>
      )}
    </>
  );
}
