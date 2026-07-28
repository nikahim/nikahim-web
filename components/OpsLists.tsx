"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const firstName = (e: any) => (e.bride_first_name || (e.bride_full_name || "").split(" ")[0] || "") + " & " + (e.groom_first_name || (e.groom_full_name || "").split(" ")[0] || "");
const isEnded = (s?: string) => ["ended", "cancelled", "canceled", "completed"].includes(String(s || "").toLowerCase());

type Tab = "active" | "upcoming" | "done";

// Ortak "3 liste" canlı operasyon görünümü — admin + callcenter kullanır.
export default function OpsLists({ hrefFor }: { hrefFor: (id: string) => string }) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("active");

  const load = async () => {
    const { data } = await supabase.from("events")
      .select("id,bride_full_name,groom_full_name,bride_first_name,groom_first_name,event_type,event_date,event_time,city,status,is_live,stream_started_at,stream_ended_at,setup_completed")
      .order("event_date", { ascending: false }).limit(1000);
    setEvents(data || []); setLoading(false);
  };
  useEffect(() => { load(); const t = setInterval(load, 45000); return () => clearInterval(t); }, []);

  const td = todayStr();
  const active = events.filter(e => e.is_live);
  const upcoming = events.filter(e => !e.is_live && !isEnded(e.status) && (e.event_date || "") >= td).sort((a, b) => (a.event_date || "").localeCompare(b.event_date || ""));
  const done = events.filter(e => !e.is_live && (isEnded(e.status) || e.stream_ended_at));

  const tabs: { key: Tab; label: string; count: number; dot: string }[] = [
    { key: "active", label: "Aktif Canlı", count: active.length, dot: "bg-rose-500" },
    { key: "upcoming", label: "Yaklaşan", count: upcoming.length, dot: "bg-indigo-500" },
    { key: "done", label: "Tamamlanmış", count: done.length, dot: "bg-slate-400" },
  ];
  const list = tab === "active" ? active : tab === "upcoming" ? upcoming : done;

  if (loading) return <div className="py-16 flex items-center justify-center"><div className="w-10 h-10 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === t.key ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
            <span className={`w-2 h-2 rounded-full ${t.dot} ${t.key === "active" && t.count > 0 ? "animate-pulse" : ""}`} />
            {t.label}
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{t.count}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/70 p-5">
        {list.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">{tab === "active" ? "Şu an canlı yayın yok" : tab === "upcoming" ? "Yaklaşan yayın yok" : "Tamamlanmış yayın yok"}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-3 font-semibold">Tarih / Saat</th>
                  <th className="py-2 pr-3 font-semibold">Çift</th>
                  <th className="py-2 pr-3 font-semibold">Şehir</th>
                  <th className="py-2 pr-3 font-semibold">Durum</th>
                  <th className="py-2 pr-3 font-semibold text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {list.map(e => {
                  const st = statusOf(e, td);
                  return (
                    <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="py-2.5 pr-3 whitespace-nowrap"><span className="font-medium text-slate-700">{e.event_date}</span>{e.event_time && <span className="text-slate-400"> · {String(e.event_time).slice(0, 5)}</span>}</td>
                      <td className="py-2.5 pr-3 font-semibold text-slate-800">{firstName(e)}</td>
                      <td className="py-2.5 pr-3 text-slate-500">{e.city || "—"}</td>
                      <td className="py-2.5 pr-3"><span className={`inline-block px-2 py-0.5 rounded-lg text-[11px] font-semibold ${st.cls}`}>{st.label}</span></td>
                      <td className="py-2.5 pr-3 text-right"><Link href={hrefFor(e.id)} className="text-xs font-semibold text-blue-600 hover:underline">İncele</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function statusOf(e: any, td: string): { label: string; cls: string } {
  if (e.is_live) return { label: "Canlı", cls: "bg-rose-100 text-rose-700" };
  if (isEnded(e.status) || e.stream_ended_at) return { label: "Tamamlandı", cls: "bg-slate-100 text-slate-500" };
  if ((e.event_date || "") < td) return { label: "Yayın yok", cls: "bg-red-100 text-red-700" };
  if (e.event_date === td) return { label: "Bugün · bekliyor", cls: "bg-indigo-100 text-indigo-700" };
  return { label: "Hazırlanıyor", cls: "bg-emerald-100 text-emerald-700" };
}
