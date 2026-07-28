"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function CallcenterEventDetail() {
  const { id } = useParams<{ id: string }>();
  const [ev, setEv] = useState<any>(null);
  const [pkgs, setPkgs] = useState<any[]>([]);
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [owner, setOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ m: string; t: "ok" | "err" } | null>(null);
  const [minutes, setMinutes] = useState(30);
  const [pkgId, setPkgId] = useState("");

  const say = (m: string, t: "ok" | "err" = "ok") => { setToast({ m, t }); setTimeout(() => setToast(null), 4000); };

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const [e, p, me] = await Promise.all([
      supabase.from("events").select("*").eq("id", id).single(),
      supabase.from("packages").select("id, name_tr, duration_minutes, price_tl, display_order").eq("is_active", true).order("display_order"),
      user ? supabase.from("users").select("role, is_admin, permissions").eq("id", user.id).single() : Promise.resolve({ data: null }),
    ]);
    setEv(e.data); setPkgs(p.data || []);
    setPerms((me as any).data?.permissions || {});
    setOwner((me as any).data?.role === "owner" || !!(me as any).data?.is_admin);
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const can = (x: string) => owner || !!perms[x];
  const call = async (payload: any) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("agent-action", { body: payload });
    setBusy(false);
    if (error || data?.error) {
      let msg = data?.error || error?.message || "Hata";
      try { const c = (error as any)?.context; if (c?.json) { const j = await c.json(); if (j?.error) msg = j.error; } } catch {}
      say(msg, "err"); return false;
    }
    return true;
  };

  const grantTime = async () => { if (await call({ action: "grant_time", event_id: id, minutes })) { say(`${minutes} dk eklendi`); load(); } };
  const upgrade = async () => { if (!pkgId) return say("Paket seçin", "err"); if (await call({ action: "upgrade_package", event_id: id, package_id: pkgId })) { say("Paket yükseltildi"); load(); } };
  const requestDelete = async () => { const reason = prompt("Silme sebebi (owner onayına düşer):"); if (!reason) return; if (await call({ action: "request_approval", action_type: "delete_event", target_type: "event", target_id: id, reason })) say("Silme talebi owner onayına gönderildi"); };

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bilgiler */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/70 p-5">
          <h2 className="font-bold text-slate-800 mb-3">Etkinlik Bilgileri</h2>
          <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
            <Info label="Kalan süre" value={`${ev.remaining_minutes ?? 0} dk`} />
            <Info label="Kullanılan süre" value={`${ev.total_used_minutes ?? 0} dk`} />
            <Info label="Kurulum" value={ev.setup_completed ? "Tamam" : "Eksik"} />
            <Info label="Şehir" value={ev.city || "—"} />
            <Info label="Mekan" value={ev.venue || "—"} />
            <Info label="Link" value={ev.event_link || "—"} />
          </div>
        </div>

        {/* İşlemler */}
        <div className="space-y-4">
          {can("grant_time") && (
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5">
              <h3 className="font-semibold text-slate-800 text-sm mb-2">Ücretsiz Ek Süre</h3>
              <div className="flex gap-2">
                <input type="number" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="w-20 px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none" />
                <button onClick={grantTime} disabled={busy} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">+ Süre Ver</button>
              </div>
            </div>
          )}
          {can("grant_package") && (
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5">
              <h3 className="font-semibold text-slate-800 text-sm mb-2">Paket Yükselt</h3>
              <select value={pkgId} onChange={(e) => setPkgId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none mb-2">
                <option value="">Paket seç…</option>
                {pkgs.map(p => <option key={p.id} value={p.id}>{p.name_tr} · {p.duration_minutes}dk</option>)}
              </select>
              <button onClick={upgrade} disabled={busy} className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">Yükselt</button>
            </div>
          )}
          {/* Eksi işlem — onaya düşer */}
          <div className="bg-white rounded-2xl border border-red-100 p-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-2">Eksi İşlem</h3>
            <p className="text-xs text-slate-400 mb-2">Silme/iade owner onayı gerektirir.</p>
            <button onClick={requestDelete} disabled={busy} className="w-full py-2 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100">Silme Talebi Oluştur</button>
          </div>
        </div>
      </div>

      {toast && <div className="fixed bottom-6 right-6 z-50"><div className={`px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-semibold ${toast.t === "err" ? "bg-red-500" : "bg-emerald-600"}`}>{toast.m}</div></div>}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{label}</p><p className="text-slate-700 font-medium">{value}</p></div>;
}
