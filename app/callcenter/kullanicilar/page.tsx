"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface U { id: string; full_name?: string; email?: string; phone?: string; role?: string; created_at?: string; }

export default function CallcenterUsers() {
  const [users, setUsers] = useState<U[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<U | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { (async () => {
    // Sadece gerçek müşteriler — destek uzmanları (agent/owner) hariç
    const { data } = await supabase.from("users").select("id, full_name, email, phone, role, created_at").order("created_at", { ascending: false }).limit(3000);
    setUsers((data || []).filter((u: U) => u.role !== "agent" && u.role !== "owner" && !(u.email || "").endsWith("@ekip.nikahim.com")));
    setLoading(false);
  })(); }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick); return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return users.filter(u => `${u.full_name || ""} ${u.email || ""} ${u.phone || ""}`.toLowerCase().includes(s)).slice(0, 30);
  }, [users, q]);

  const pick = async (u: U) => {
    setSel(u); setQ(u.full_name || u.email || ""); setOpen(false);
    const { data } = await supabase.from("events").select("*").eq("user_id", u.id).order("created_at", { ascending: false });
    setEvents(data || []);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F6F7F9]"><div className="w-10 h-10 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F6F7F9] p-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">Kullanıcı Ara</h1>
        <p className="text-slate-500 text-sm mt-1">Çiftin adı, e-posta veya telefonuyla ara — yazdıkça açılır</p>
      </div>

      {/* Autocomplete */}
      <div ref={boxRef} className="relative max-w-md mb-6">
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); setSel(null); }} onFocus={() => setOpen(true)}
          placeholder="İsim yaz… (ör: Ayşe)" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-400" />
        {open && q.trim() && (
          <div className="absolute z-10 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-xl max-h-72 overflow-y-auto">
            {matches.length === 0 ? <div className="px-4 py-3 text-sm text-slate-400">Sonuç yok</div> : matches.map(u => (
              <button key={u.id} onClick={() => pick(u)} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                <p className="text-sm font-semibold text-slate-800">{u.full_name || "İsimsiz"}</p>
                <p className="text-xs text-slate-400">{u.email || "—"} · {u.phone || "—"}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Seçilen kullanıcı detayı */}
      {sel && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/70 p-5 max-w-2xl">
            <h2 className="font-bold text-slate-800 mb-3">Hesap Bilgileri</h2>
            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <Info label="Ad Soyad" value={sel.full_name || "—"} />
              <Info label="E-posta" value={sel.email || "—"} />
              <Info label="Telefon" value={sel.phone || "—"} />
              <Info label="Kayıt" value={sel.created_at ? new Date(sel.created_at).toLocaleDateString("tr-TR") : "—"} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/70 p-5 max-w-2xl">
            <h2 className="font-bold text-slate-800 mb-3">Etkinlikleri ({events.length})</h2>
            {events.length === 0 ? <p className="text-sm text-slate-400 py-4">Bu kullanıcının etkinliği yok.</p> : (
              <div className="space-y-2">
                {events.map(e => (
                  <Link key={e.id} href={`/callcenter/etkinlik/${e.id}`} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{(e.bride_first_name || (e.bride_full_name || "").split(" ")[0] || "")} & {(e.groom_first_name || (e.groom_full_name || "").split(" ")[0] || "")}</p>
                      <p className="text-xs text-slate-400">{e.event_date}{e.city && ` · ${e.city}`} · {e.remaining_minutes ?? 0} dk kaldı</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${e.is_live ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"}`}>{e.is_live ? "Canlı" : e.status || "—"}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{label}</p><p className="text-slate-700 font-medium break-words">{value}</p></div>;
}
