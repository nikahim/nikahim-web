"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

interface UserRow { id: string; full_name?: string | null; email?: string | null; phone?: string | null; }

const TYPES = [
  { key: "admin_message", label: "📢 Duyuru" },
  { key: "reminder", label: "📅 Hatırlatma" },
  { key: "campaign", label: "🎁 Kampanya" },
] as const;

export default function AdminDuyurularPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [target, setTarget] = useState<"all" | "user">("all");
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [type, setType] = useState<string>("admin_message");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [inApp, setInApp] = useState(true);
  const [email, setEmail] = useState(false);
  const [ctaLabel, setCtaLabel] = useState("Uygulamayı Aç");
  const [ctaUrl, setCtaUrl] = useState("https://nikahim.com/?indir=1");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const showToast = (msg: string, t: "success" | "error" = "success") => { setToast({ msg, type: t }); setTimeout(() => setToast(null), 5000); };

  useEffect(() => {
    supabase.from("users").select("id, full_name, email, phone").order("created_at", { ascending: false }).limit(2000)
      .then(({ data }) => setUsers(data || []));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users.slice(0, 60);
    return users.filter((u) => `${u.full_name || ""} ${u.email || ""} ${u.phone || ""}`.toLowerCase().includes(q)).slice(0, 60);
  }, [users, search]);

  const send = async () => {
    if (!title.trim() || !message.trim()) { showToast("Başlık ve mesaj boş olamaz", "error"); return; }
    if (target === "user" && !userId) { showToast("Bir kullanıcı seçin", "error"); return; }
    if (!inApp && !email) { showToast("En az bir kanal seçin (bildirim / e-posta)", "error"); return; }
    if (target === "all" && !confirm("Bu duyuru TÜM kullanıcılara gönderilecek. Emin misiniz?")) return;

    setSending(true);
    const { data, error } = await supabase.functions.invoke("broadcast", {
      body: {
        title: title.trim(), message: message.trim(), type, action_route: null,
        inApp, email, target, user_id: target === "user" ? userId : null,
        cta_label: ctaLabel.trim() || "Uygulamayı Aç", cta_url: ctaUrl.trim() || "https://nikahim.com/?indir=1",
      },
    });
    setSending(false);

    if (error || data?.error) { showToast("Gönderilemedi: " + (error?.message || data?.error), "error"); return; }
    showToast(`✓ Gönderildi — ${data.notified} bildirim, ${data.emailed} e-posta (${data.total} kişi)`);
    setTitle(""); setMessage("");
  };

  const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-400";

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Duyurular</h1>
        <p className="text-gray-500 text-sm mt-1">Kullanıcılara toplu bildirim ve e-posta gönder</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
        {/* Hedef */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Hedef</label>
          <div className="flex gap-3">
            {([["all", "📣 Tüm Kullanıcılar"], ["user", "👤 Belirli Kullanıcı"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTarget(k as any)}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${target === k ? "text-white shadow-md" : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"}`}
                style={target === k ? { background: "linear-gradient(135deg,#D17075,#C8686E)" } : {}}>{l}</button>
            ))}
          </div>
        </div>

        {target === "user" && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Kullanıcı</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="İsim / e-posta / telefon ara…" className={inputCls + " mb-2"} />
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className={inputCls}>
              <option value="">Kullanıcı seçin…</option>
              {filtered.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name || "İsimsiz"} {u.email ? `— ${u.email}` : ""}</option>
              ))}
            </select>
          </div>
        )}

        {/* Tür */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Tür</label>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button key={t.key} onClick={() => setType(t.key)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${type === t.key ? "text-white shadow-md" : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"}`}
                style={type === t.key ? { background: "linear-gradient(135deg,#D17075,#C8686E)" } : {}}>{t.label}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Başlık</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: Nikahınıza 7 gün kaldı" maxLength={90} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Mesaj</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Duyuru metni…" rows={4} maxLength={800} className={inputCls + " resize-none"} />
        </div>

        {/* Kanallar */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Kanallar</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={inApp} onChange={(e) => setInApp(e.target.checked)} className="w-4 h-4 rounded accent-rose-500" />
              <span className="text-sm text-gray-700">🔔 Uygulama bildirimi</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="w-4 h-4 rounded accent-rose-500" />
              <span className="text-sm text-gray-700">✉️ E-posta</span>
            </label>
          </div>
        </div>

        {/* CTA (e-posta) */}
        {email && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Buton Yazısı</label>
              <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Buton Linki</label>
              <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} className={inputCls} />
            </div>
          </div>
        )}

        <button onClick={send} disabled={sending}
          className="w-full py-3.5 rounded-full font-semibold text-white text-sm transition-all hover:scale-[1.01] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#D17075,#C8686E)", boxShadow: "0 6px 20px rgba(200,104,110,0.3)" }}>
          {sending ? "Gönderiliyor…" : target === "all" ? "📣 Tüm Kullanıcılara Gönder" : "📨 Gönder"}
        </button>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Not: E-posta toplu gönderiminde Resend günlük/aylık limitleri geçerlidir. Bildirim (uygulama içi) sınırsızdır.
      </p>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[70]">
          <div className={`px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-semibold ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>{toast.msg}</div>
        </div>
      )}
    </div>
  );
}
