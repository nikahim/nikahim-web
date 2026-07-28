"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const SOURCES = [
  { key: "all", label: "Tümü", icon: "▦" },
  { key: "mobile", label: "Mobil", icon: "📱" },
  { key: "web", label: "Web", icon: "🌐" },
  { key: "whatsapp", label: "WhatsApp", icon: "🟢" },
  { key: "email", label: "E-posta", icon: "✉️" },
];
const OPEN = ["open", "in_progress"];
const relTime = (iso?: string) => { if (!iso) return ""; const s = (Date.now() - new Date(iso).getTime()) / 1000; if (s < 60) return "az önce"; if (s < 3600) return `${Math.floor(s / 60)} dk önce`; if (s < 86400) return `${Math.floor(s / 3600)} sa önce`; return new Date(iso).toLocaleDateString("tr-TR"); };

export default function CallcenterDestek() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState<"open" | "resolved" | "all">("open");
  const [sel, setSel] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(500);
    setTickets(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const srcOf = (t: any) => (t.source || "mobile");
  const isOpen = (t: any) => OPEN.includes(t.status);
  const bySource = (t: any) => source === "all" || srcOf(t) === source;
  const byStatus = (t: any) => status === "all" || (status === "open" ? isOpen(t) : !isOpen(t));
  const filtered = tickets.filter(t => bySource(t) && byStatus(t));
  const countSrc = (k: string) => tickets.filter(t => (k === "all" || srcOf(t) === k) && isOpen(t)).length;

  const sendReply = async () => {
    if (!reply.trim() || !sel) return;
    setSending(true);
    const text = reply.trim();
    const replies = Array.isArray(sel.admin_replies) ? sel.admin_replies : [];
    const next = [...replies, { text, at: new Date().toISOString() }];
    await supabase.from("support_tickets").update({ admin_replies: next, status: "in_progress" }).eq("id", sel.id);
    if (sel.user_id) {
      await supabase.from("notifications").insert({ user_id: sel.user_id, type: "ticket_update", title: "Destek Ekibinden Yeni Yanıt", body: text, data: { ticket: sel.ticket_number } });
    }
    setReply(""); setSending(false);
    setSel({ ...sel, admin_replies: next, status: "in_progress" });
    load();
  };

  const resolve = async () => {
    if (!sel) return;
    await supabase.from("support_tickets").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", sel.id);
    if (sel.user_id) await supabase.from("notifications").insert({ user_id: sel.user_id, type: "ticket_resolved", title: "Destek Talebiniz Yanıtlandı", body: "Talebiniz çözüldü.", data: { ticket: sel.ticket_number } });
    setSel({ ...sel, status: "resolved" }); load();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F6F7F9]"><div className="w-10 h-10 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F6F7F9] p-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">Destek Talepleri</h1>
        <p className="text-slate-500 text-sm mt-1">Tüm kanallardan gelen destek — kaynağına göre</p>
      </div>

      {/* Kaynak sekmeleri */}
      <div className="flex flex-wrap gap-2 mb-3">
        {SOURCES.map(s => (
          <button key={s.key} onClick={() => setSource(s.key)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${source === s.key ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
            <span>{s.icon}</span>{s.label}
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${source === s.key ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{countSrc(s.key)}</span>
          </button>
        ))}
      </div>
      {/* Durum */}
      <div className="flex gap-2 mb-4">
        {(["open", "resolved", "all"] as const).map(st => (
          <button key={st} onClick={() => setStatus(st)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${status === st ? "bg-blue-600 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>{st === "open" ? "Açık" : st === "resolved" ? "Çözülen" : "Tümü"}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Liste */}
        <div className="bg-white rounded-2xl border border-slate-200/70 divide-y divide-slate-100 overflow-hidden">
          {filtered.length === 0 ? <div className="py-10 text-center text-sm text-slate-400">Bu filtrede talep yok</div> : filtered.map(t => (
            <button key={t.id} onClick={() => setSel(t)} className={`w-full text-left p-4 hover:bg-slate-50 transition-all ${sel?.id === t.id ? "bg-blue-50/60" : ""}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-800 truncate">{t.user_name || t.name || "İsimsiz"}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOpen(t) ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{isOpen(t) ? "Açık" : "Çözüldü"}</span>
              </div>
              <p className="text-xs text-slate-500 truncate">{t.subject || t.konu || "Konu yok"}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{srcLabel(srcOf(t))}</span>
                <span className="text-[10px] text-slate-400">{t.ticket_number} · {relTime(t.created_at)}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Detay / thread */}
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5">
          {!sel ? <div className="py-16 text-center text-sm text-slate-400">Detay için bir talep seç</div> : (
            <div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-slate-800">{sel.user_name || sel.name}</p>
                  <p className="text-xs text-slate-400">{sel.user_email || sel.email} · {sel.user_phone || sel.phone || "—"}</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-500">{srcLabel(srcOf(sel))}</span>
              </div>
              <div className="max-h-[340px] overflow-y-auto space-y-2 mb-3 pr-1">
                {(Array.isArray(sel.conversation) ? sel.conversation : []).map((m: any, i: number) => (
                  <div key={i} className={`p-2.5 rounded-xl text-sm ${m.role === "user" ? "bg-slate-100 text-slate-700" : "bg-blue-50 text-blue-800"}`}>{m.content}</div>
                ))}
                {(Array.isArray(sel.admin_replies) ? sel.admin_replies : []).map((r: any, i: number) => (
                  <div key={"r" + i} className="p-2.5 rounded-xl text-sm bg-emerald-50 text-emerald-800 ml-6"><span className="text-[10px] font-bold block mb-0.5">Destek ekibi</span>{r.text}</div>
                ))}
              </div>
              {isOpen(sel) ? (
                <div className="space-y-2">
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder="Yanıtınız…" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-400 resize-none" />
                  <div className="flex gap-2">
                    <button onClick={sendReply} disabled={sending || !reply.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-50">{sending ? "Gönderiliyor…" : "Yanıtla"}</button>
                    <button onClick={resolve} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200">Çözüldü</button>
                  </div>
                </div>
              ) : <div className="py-2 text-center text-sm text-emerald-600 font-semibold">Bu talep çözülmüş ✓</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function srcLabel(s: string) { return ({ mobile: "📱 Mobil", web: "🌐 Web", whatsapp: "🟢 WhatsApp", email: "✉️ E-posta" } as any)[s] || "📱 Mobil"; }
