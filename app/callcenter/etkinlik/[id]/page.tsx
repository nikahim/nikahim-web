"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import EventActions from "@/components/EventActions";

export default function CallcenterEventDetail() {
  const { id } = useParams<{ id: string }>();
  const [ev, setEv] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("events").select("*").eq("id", id).single();
    setEv(data); setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F6F7F9]"><div className="w-10 h-10 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;
  if (!ev) return <div className="min-h-screen bg-[#F6F7F9] p-8"><p className="text-slate-400">Etkinlik bulunamadı.</p></div>;

  const couple = `${ev.bride_first_name || (ev.bride_full_name || "").split(" ")[0] || ""} & ${ev.groom_first_name || (ev.groom_full_name || "").split(" ")[0] || ""}`;

  return (
    <div className="min-h-screen bg-[#F6F7F9] p-8">
      <Link href="/callcenter/operasyon" className="text-sm text-slate-500 hover:text-slate-700">← Operasyon</Link>
      <div className="flex items-start justify-between mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{couple}</h1>
          <p className="text-slate-500 text-sm mt-1">{ev.event_date}{ev.event_time && ` · ${String(ev.event_time).slice(0, 5)}`}{ev.city && ` · ${ev.city}`}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ev.is_live ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"}`}>{ev.is_live ? "Canlı" : ev.status || "—"}</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/70 p-5 mb-4">
        <h2 className="font-bold text-slate-800 mb-3">Etkinlik Bilgileri</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6 text-sm">
          <Info label="Kurulum" value={ev.setup_completed ? "Tamam" : "Eksik"} />
          <Info label="Mekan" value={ev.venue || "—"} />
          <Info label="Link" value={ev.event_link || "—"} />
        </div>
      </div>

      {/* Hızlı işlemler + özet (paket / dakika / izleyici hakkı) */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-5">
        <h2 className="font-bold text-slate-800 mb-3">Hızlı İşlemler</h2>
        <EventActions eventId={id} onChange={load} />
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{label}</p><p className="text-slate-700 font-medium break-words">{value}</p></div>;
}
