"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export default function CallcenterHome() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [owner, setOwner] = useState(false);
  const [stats, setStats] = useState({ openTickets: 0, waiting: 0, live: 0, today: 0 });

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: me } = await supabase.from("users").select("full_name, username, role, is_admin, permissions").eq("id", user.id).single();
    setName(me?.full_name || me?.username || "");
    setPerms(me?.permissions || {});
    setOwner(me?.role === "owner" || !!me?.is_admin);

    const td = todayStr();
    const [openTk, waitTk, liveEv, todayEv] = await Promise.all([
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("is_live", true),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("event_date", td),
    ]);
    setStats({ openTickets: openTk.count || 0, waiting: waitTk.count || 0, live: liveEv.count || 0, today: todayEv.count || 0 });
    setLoading(false);
  })(); }, []);

  const can = (p: string) => owner || !!perms[p];

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F6F7F9] p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Merhaba, {name} 👋</h1>
        <p className="text-slate-500 text-sm mt-1">Bugün destek bekleyen ve canlı operasyondaki işlere göz at.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {can("support") && (
          <Link href="/callcenter/destek" className="bg-white rounded-2xl border border-slate-200/70 p-5 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(217,119,6,0.10)" }}>
                <svg className="w-6 h-6" fill="none" stroke="#D97706" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
              <span className="text-xs font-semibold text-blue-600">Aç →</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{stats.openTickets}</p>
            <p className="text-sm text-slate-500 mt-0.5">Açık destek talebi</p>
            <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">{stats.waiting} cevap bekliyor</p>
          </Link>
        )}

        {can("live_ops") && (
          <Link href="/callcenter/operasyon" className="bg-white rounded-2xl border border-slate-200/70 p-5 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(225,29,72,0.09)" }}>
                <svg className="w-6 h-6" fill="none" stroke="#E11D48" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </div>
              {stats.live > 0 && <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />CANLI</span>}
            </div>
            <p className="text-3xl font-bold text-slate-800">{stats.live}</p>
            <p className="text-sm text-slate-500 mt-0.5">Aktif canlı yayın</p>
            <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">{stats.today} bugünkü etkinlik</p>
          </Link>
        )}
      </div>

      {!can("support") && !can("live_ops") && !can("user_lookup") && (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-10 text-center mt-4">
          <p className="text-slate-400 text-sm">Henüz bir izniniz tanımlanmamış. Lütfen yöneticinizle iletişime geçin.</p>
        </div>
      )}
    </div>
  );
}
