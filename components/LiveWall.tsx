"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const firstName = (e: any) => (e.bride_first_name || (e.bride_full_name || "").split(" ")[0] || "") + " & " + (e.groom_first_name || (e.groom_full_name || "").split(" ")[0] || "");

// Güvenlik merkezi / izleme duvarı — tüm canlı yayınları tek ekranda izle.
export default function LiveWall({ hrefFor, canStop = false }: { hrefFor: (id: string) => string; canStop?: boolean }) {
  const [tiles, setTiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    const { data: live } = await supabase.from("events")
      .select("id, bride_full_name, groom_full_name, bride_first_name, groom_first_name, city, is_live")
      .eq("is_live", true).limit(12);
    const ids = (live || []).map((e: any) => e.id);
    let streamMap: Record<string, string> = {};
    if (ids.length) {
      const { data: streams } = await supabase.from("streams").select("event_id, live_stream_id, status, created_at").in("event_id", ids).order("created_at", { ascending: false });
      for (const s of streams || []) { if (!streamMap[s.event_id] && s.live_stream_id) streamMap[s.event_id] = s.live_stream_id; }
    }
    setTiles((live || []).map((e: any) => ({ ...e, liveStreamId: streamMap[e.id] })));
    setLoading(false);
  };
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);

  const stopStream = async (eventId: string) => {
    if (!confirm("Bu yayını DURDURMAK istediğine emin misin? Yayın anında kesilir.")) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("agent-action", { body: { action: "stop_stream", event_id: eventId } });
    setBusy(false);
    if (error || data?.error) { setToast("Durdurulamadı: " + (data?.error || error?.message)); setTimeout(() => setToast(null), 4000); return; }
    setToast("Durdurma komutu gönderildi."); setTimeout(() => setToast(null), 4000);
    setSel(null); load();
  };

  if (loading) return <div className="py-16 flex justify-center"><div className="w-10 h-10 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;

  const selTile = tiles.find((t) => t.id === sel);

  return (
    <div>
      {/* Seçili yayın aksiyon çubuğu */}
      {selTile && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl bg-slate-900 text-white sticky top-0 z-20">
          <span className="flex items-center gap-1.5 text-xs font-bold text-rose-300"><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />CANLI</span>
          <span className="font-semibold text-sm">{firstName(selTile)}{selTile.city && ` · ${selTile.city}`}</span>
          <div className="flex-1" />
          <Link href={hrefFor(selTile.id)} className="px-4 py-2 rounded-lg text-xs font-semibold bg-white/15 hover:bg-white/25">Detay</Link>
          {canStop && (
            <button onClick={() => stopStream(selTile.id)} disabled={busy} className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 disabled:opacity-50">■ Yayını Durdur</button>
          )}
          <button onClick={() => setSel(null)} className="px-3 py-2 rounded-lg text-xs text-white/70 hover:text-white">✕</button>
        </div>
      )}

      {tiles.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200/70">
          <p className="text-slate-400">Şu an canlı yayın yok.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {tiles.map((t) => (
            <button key={t.id} onClick={() => setSel(t.id === sel ? null : t.id)}
              className={`relative aspect-video rounded-xl overflow-hidden bg-slate-900 border-2 transition-all ${sel === t.id ? "border-rose-500 ring-2 ring-rose-300" : "border-slate-800 hover:border-slate-500"}`}>
              {t.liveStreamId ? (
                <iframe src={`https://embed.api.video/live/${t.liveStreamId}`} title={firstName(t)} allow="autoplay; fullscreen" className="w-full h-full pointer-events-none" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">Yayın yükleniyor…</div>
              )}
              {/* Üst overlay — çift + şehir */}
              <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-white text-xs font-bold truncate">{firstName(t)}</span>
                </div>
                {t.city && <span className="text-white/70 text-[10px]">{t.city}</span>}
              </div>
              {/* Alt overlay — telemetri (Katman 2'de gelecek) placeholder */}
              <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent pointer-events-none flex items-center justify-between">
                <span className="text-white/60 text-[9px]">📶 —</span>
                <span className="text-white/60 text-[9px]">🔋 —</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {toast && <div className="fixed bottom-6 right-6 z-50"><div className="px-5 py-3 rounded-2xl shadow-xl bg-slate-800 text-white text-sm font-semibold">{toast}</div></div>}
    </div>
  );
}
