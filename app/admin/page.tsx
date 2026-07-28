"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// ── Yardımcılar ──
const TL = (n: number) => "₺" + Math.round(n).toLocaleString("tr-TR");
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const firstName = (e: any) => (e.bride_first_name || (e.bride_full_name || "").split(" ")[0] || "") + " & " + (e.groom_first_name || (e.groom_full_name || "").split(" ")[0] || "");

interface EventRow {
  id: string; user_id: string; bride_full_name?: string; groom_full_name?: string;
  bride_first_name?: string; groom_first_name?: string; event_type?: string;
  event_date?: string; event_time?: string; city?: string; status?: string;
  is_live?: boolean; stream_started_at?: string | null; stream_ended_at?: string | null;
  setup_completed?: boolean; package_id?: string; created_at?: string;
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<any>(null);

  useEffect(() => { fetchAll(); const t = setInterval(fetchAll, 60000); return () => clearInterval(t); }, []);

  const fetchAll = async () => {
    const t0 = startOfToday().toISOString();
    const td = todayStr();
    const win = new Date(); win.setDate(win.getDate() - 21); // son 21 gün + ileri

    const [evRes, openTk, webTk, waitTk, txRes, newU, streamsRes] = await Promise.all([
      supabase.from("events").select("id,user_id,bride_full_name,groom_full_name,bride_first_name,groom_first_name,event_type,event_date,event_time,city,status,is_live,stream_started_at,stream_ended_at,setup_completed,package_id,created_at").gte("event_date", win.toISOString().slice(0, 10)).order("event_date", { ascending: true }).limit(500),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open").eq("source", "web"),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("transactions").select("amount,status,created_at").gte("created_at", t0),
      supabase.from("users").select("id", { count: "exact", head: true }).gte("created_at", t0),
      supabase.from("streams").select("event_id,is_test").limit(2000),
    ]);

    const events: EventRow[] = evRes.data || [];
    const testedIds = new Set((streamsRes.data || []).filter((s: any) => s.is_test).map((s: any) => s.event_id));
    const isEnded = (s?: string) => ["ended", "cancelled", "canceled", "completed"].includes(String(s || "").toLowerCase());

    const todayEvents = events.filter(e => e.event_date === td);
    const liveEvents = events.filter(e => e.is_live);
    const upcoming = events.filter(e => (e.event_date || "") >= td && !isEnded(e.status));

    const in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
    const riskNeverStreamed = events.filter(e => (e.event_date || "9999") <= td && !e.is_live && !e.stream_started_at && !isEnded(e.status) && e.setup_completed);
    const riskNoTest = events.filter(e => (e.event_date || "") >= td && (e.event_date || "") <= in7 && !isEnded(e.status) && !testedIds.has(e.id));

    const txToday = (txRes.data || []).filter((t: any) => ["completed", "paid"].includes(t.status));
    const salesToday = txToday.reduce((s: number, t: any) => s + (t.amount || 0), 0);

    let liveViewers = 0;
    if (liveEvents.length) {
      const { count } = await supabase.from("viewers").select("id", { count: "exact", head: true }).in("event_id", liveEvents.map(e => e.id));
      liveViewers = count || 0;
    }

    setD({
      openTickets: openTk.count || 0, webTickets: webTk.count || 0, waitingTickets: waitTk.count || 0,
      todayEvents, liveEvents, liveViewers, upcoming, riskNeverStreamed, riskNoTest,
      salesToday, salesCountToday: txToday.length, newUsersToday: newU.count || 0, testedIds,
    });
    setLoading(false);
  };

  if (loading || !d) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F6F7F9]"><div className="w-10 h-10 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;
  }

  const td = todayStr();
  const isEnded = (s?: string) => ["ended", "cancelled", "canceled", "completed"].includes(String(s || "").toLowerCase());
  const totalRisk = d.riskNeverStreamed.length + d.riskNoTest.length;

  const kpis = [
    { label: "Açık Destek Talebi", value: d.openTickets, tone: d.openTickets > 0 ? "amber" : "slate", href: "/admin/support",
      subs: [`${d.waitingTickets} cevap bekliyor`, `${d.webTickets} web canlı destek`], icon: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Riskli Etkinlik", value: totalRisk, tone: d.riskNeverStreamed.length > 0 ? "red" : totalRisk > 0 ? "amber" : "green", href: "#riskler",
      subs: [`${d.riskNeverStreamed.length} gün geçti, yayın yok`, `${d.riskNoTest.length} test yapılmamış`], icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
    { label: "Aktif Canlı Yayın", value: d.liveEvents.length, tone: d.liveEvents.length > 0 ? "rose" : "slate", live: d.liveEvents.length > 0, href: "#canli",
      subs: [`${d.liveViewers} aktif izleyici`], icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
    { label: "Bugünkü Etkinlik", value: d.todayEvents.length, tone: "indigo", href: "#canli",
      subs: [`${d.todayEvents.filter((e: any) => e.is_live).length} canlı · ${d.todayEvents.filter((e: any) => isEnded(e.status)).length} tamamlandı`], icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { label: "Bugünkü Satış", value: TL(d.salesToday), tone: "green", href: "/admin/sales",
      subs: [`${d.salesCountToday} paket satışı`], icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1M3 12a9 9 0 1118 0 9 9 0 01-18 0z" },
    { label: "Yeni Kullanıcı", value: d.newUsersToday, tone: "blue", href: "/admin/users",
      subs: ["Bugün kayıt olan"], icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" },
  ];

  return (
    <div className="min-h-screen bg-[#F6F7F9] p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Nikahım platformunun canlı operasyon ve performans özeti</p>
        </div>
        <span className="text-xs text-slate-400 mt-1">Otomatik yenilenir · 60sn</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div id="riskler" className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/70 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <h2 className="font-bold text-slate-800">Dikkat Gerektiren Etkinlikler</h2>
            <span className="text-xs text-slate-400">— şimdi müdahale et</span>
          </div>
          {totalRisk === 0 ? (
            <Empty text="Şu an riskli etkinlik yok 🎉" />
          ) : (
            <div className="space-y-2">
              {d.riskNeverStreamed.map((e: EventRow) => <RiskRow key={"n" + e.id} e={e} level="critical" reason="Etkinlik günü geçti, yayın hiç başlamadı" />)}
              {d.riskNoTest.map((e: EventRow) => <RiskRow key={"t" + e.id} e={e} level="warning" reason="Test yayını yapılmamış" />)}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800">Destek Özeti</h2>
            <Link href="/admin/support" className="text-xs font-semibold text-blue-600 hover:underline">Tümü →</Link>
          </div>
          <div className="space-y-3">
            <SupportStat label="Açık talep" value={d.openTickets} tone="amber" />
            <SupportStat label="Cevap bekleyen" value={d.waitingTickets} tone="red" />
            <SupportStat label="Web canlı destek" value={d.webTickets} tone="blue" />
          </div>
        </div>
      </div>

      <div id="canli" className="bg-white rounded-2xl border border-slate-200/70 p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className={`w-2 h-2 rounded-full ${d.liveEvents.length ? "bg-rose-500 animate-pulse" : "bg-slate-300"}`} />
          <h2 className="font-bold text-slate-800">Canlı Operasyon</h2>
          <span className="text-xs text-slate-400">— bugünkü ve yaklaşan yayınlar</span>
        </div>
        <OpsTable events={d.upcoming.slice(0, 15)} td={td} tested={d.testedIds} />
      </div>
    </div>
  );
}

const TONES: Record<string, { fg: string; bg: string }> = {
  red: { fg: "#DC2626", bg: "rgba(220,38,38,0.08)" },
  amber: { fg: "#D97706", bg: "rgba(217,119,6,0.10)" },
  green: { fg: "#059669", bg: "rgba(5,150,105,0.10)" },
  blue: { fg: "#2563EB", bg: "rgba(37,99,235,0.09)" },
  indigo: { fg: "#4F46E5", bg: "rgba(79,70,229,0.09)" },
  rose: { fg: "#E11D48", bg: "rgba(225,29,72,0.09)" },
  slate: { fg: "#475569", bg: "rgba(71,85,105,0.08)" },
};

function KpiCard({ label, value, subs, icon, tone, href, live }: any) {
  const c = TONES[tone] || TONES.slate;
  return (
    <Link href={href} className="bg-white rounded-2xl border border-slate-200/70 p-4 hover:shadow-md hover:border-slate-300 transition-all block">
      <div className="flex items-start justify-between mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: c.bg }}>
          <svg className="w-5 h-5" fill="none" stroke={c.fg} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} /></svg>
        </div>
        {live && <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />CANLI</span>}
      </div>
      <p className="text-2xl font-bold text-slate-800 leading-tight">{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
      {subs?.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-100 space-y-0.5">
          {subs.map((s: string, i: number) => <p key={i} className="text-[10.5px] text-slate-400 leading-snug">{s}</p>)}
        </div>
      )}
    </Link>
  );
}

function RiskRow({ e, level, reason }: { e: EventRow; level: "critical" | "warning"; reason: string }) {
  const c = level === "critical" ? { b: "border-red-200", d: "bg-red-500", t: "text-red-700", bg: "bg-red-50" } : { b: "border-amber-200", d: "bg-amber-500", t: "text-amber-700", bg: "bg-amber-50" };
  return (
    <Link href={`/admin/events/${e.id}`} className={`flex items-center gap-3 p-3 rounded-xl border ${c.b} ${c.bg} hover:brightness-[0.98] transition-all`}>
      <span className={`w-2 h-2 rounded-full ${c.d} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{firstName(e)}</p>
        <p className={`text-xs ${c.t}`}>{reason}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-medium text-slate-600">{e.event_date}</p>
        {e.event_time && <p className="text-[11px] text-slate-400">{String(e.event_time).slice(0, 5)}</p>}
      </div>
    </Link>
  );
}

function SupportStat({ label, value, tone }: any) {
  const c = TONES[tone] || TONES.slate;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-bold px-2.5 py-0.5 rounded-lg" style={{ color: c.fg, background: c.bg }}>{value}</span>
    </div>
  );
}

function OpsTable({ events, td, tested }: { events: EventRow[]; td: string; tested: Set<string> }) {
  const isEnded = (s?: string) => ["ended", "cancelled", "canceled", "completed"].includes(String(s || "").toLowerCase());
  const statusOf = (e: EventRow): { label: string; cls: string } => {
    if (e.is_live) return { label: "Canlı", cls: "bg-rose-100 text-rose-700" };
    if (isEnded(e.status)) return { label: "Tamamlandı", cls: "bg-slate-100 text-slate-500" };
    if ((e.event_date || "") < td) return { label: "Yayın yok", cls: "bg-red-100 text-red-700" };
    if (e.event_date === td) return { label: "Bugün · bekliyor", cls: "bg-indigo-100 text-indigo-700" };
    if (!tested.has(e.id)) return { label: "Test eksik", cls: "bg-amber-100 text-amber-700" };
    return { label: "Hazırlanıyor", cls: "bg-emerald-100 text-emerald-700" };
  };
  if (!events.length) return <Empty text="Yaklaşan yayın yok" />;
  return (
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
          {events.map((e) => {
            const st = statusOf(e);
            return (
              <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="py-2.5 pr-3 whitespace-nowrap"><span className="font-medium text-slate-700">{e.event_date}</span>{e.event_time && <span className="text-slate-400"> · {String(e.event_time).slice(0, 5)}</span>}</td>
                <td className="py-2.5 pr-3 font-semibold text-slate-800">{firstName(e)}</td>
                <td className="py-2.5 pr-3 text-slate-500">{e.city || "—"}</td>
                <td className="py-2.5 pr-3"><span className={`inline-block px-2 py-0.5 rounded-lg text-[11px] font-semibold ${st.cls}`}>{st.label}</span></td>
                <td className="py-2.5 pr-3 text-right"><Link href={`/admin/events/${e.id}`} className="text-xs font-semibold text-blue-600 hover:underline">İncele</Link></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="py-8 text-center text-sm text-slate-400">{text}</div>;
}
