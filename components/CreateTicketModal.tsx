"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

interface U { id: string; full_name?: string; email?: string; phone?: string; role?: string; }

const SRC = [
  { key: "phone", label: "📞 Telefon" },
  { key: "email", label: "✉️ E-posta" },
  { key: "whatsapp", label: "🟢 WhatsApp" },
  { key: "web", label: "🌐 Web" },
  { key: "mobile", label: "📱 Mobil" },
];

export default function CreateTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: (num: string) => void }) {
  const [users, setUsers] = useState<U[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("phone");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { (async () => {
    const { data } = await supabase.from("users").select("id, full_name, email, phone, role").order("created_at", { ascending: false }).limit(3000);
    setUsers((data || []).filter((u: U) => u.role !== "agent" && u.role !== "owner" && !(u.email || "").endsWith("@ekip.nikahim.com")));
  })(); }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return users.filter(u => `${u.full_name || ""} ${u.email || ""} ${u.phone || ""}`.toLowerCase().includes(s)).slice(0, 20);
  }, [users, q]);

  const pick = (u: U) => { setUserId(u.id); setName(u.full_name || ""); setEmail(u.email || ""); setPhone(u.phone || ""); setQ(u.full_name || u.email || ""); setOpen(false); };

  const create = async () => {
    setErr("");
    if (!name.trim()) { setErr("Ad Soyad zorunlu."); return; }
    if (!email.trim() && !phone.trim()) { setErr("E-posta veya telefon (en az biri) zorunlu."); return; }
    setBusy(true);
    const ticket_number = ("NKH-" + Math.random().toString(36).slice(2, 8)).toUpperCase();
    const { error } = await supabase.from("support_tickets").insert({
      ticket_number, user_id: userId, user_name: name.trim(),
      user_email: email.trim() || null, user_phone: phone.trim() || null,
      subject: subject.trim() || "Manuel destek talebi", source,
      conversation: message.trim() ? [{ role: "user", content: message.trim() }] : [],
      status: "open",
    });
    setBusy(false);
    if (error) { setErr("Oluşturulamadı: " + error.message); return; }
    onCreated(ticket_number);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-800 mb-4">Yeni Destek Talebi</h3>
        <div className="space-y-3">
          {/* Müşteri ara */}
          <div ref={boxRef} className="relative">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Müşteri ara (opsiyonel)</label>
            <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); setUserId(null); }} onFocus={() => setOpen(true)} placeholder="İsim / mail / telefon…" className="inp" />
            {open && q.trim() && (
              <div className="absolute z-10 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-xl max-h-56 overflow-y-auto">
                {matches.length === 0 ? <div className="px-4 py-2.5 text-sm text-slate-400">Bulunamadı — aşağıdan elle gir</div> : matches.map(u => (
                  <button key={u.id} onClick={() => pick(u)} className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                    <p className="text-sm font-semibold text-slate-800">{u.full_name || "İsimsiz"}</p>
                    <p className="text-xs text-slate-400">{u.email || "—"} · {u.phone || "—"}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <F label="Ad Soyad *"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ör: Ayşe Yılmaz" className="inp" /></F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Telefon"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xx…" className="inp" /></F>
            <F label="E-posta"><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mail@…" className="inp" /></F>
          </div>
          <F label="Kaynak">
            <select value={source} onChange={(e) => setSource(e.target.value)} className="inp">{SRC.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
          </F>
          <F label="Konu"><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ör: Yayın bağlantı sorunu" className="inp" /></F>
          <F label="Şikayet / Mesaj"><textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Müşterinin bildirdiği sorun…" className="inp resize-none" /></F>
          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">Vazgeç</button>
          <button onClick={create} disabled={busy} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-50">{busy ? "Oluşturuluyor…" : "Talep Oluştur"}</button>
        </div>
      </div>
      <style jsx>{`.inp{width:100%;padding:10px 14px;border:1px solid #E2E8F0;border-radius:12px;font-size:14px;outline:none}.inp:focus{border-color:#94A3B8}`}</style>
    </div>
  );
}

function F({ label, children }: any) {
  return <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>{children}</div>;
}
