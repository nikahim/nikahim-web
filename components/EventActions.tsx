"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Ortak etkinlik aksiyonları — hem admin hem callcenter. Özet + pozitif işlemler.
export default function EventActions({ eventId, onChange }: { eventId: string; onChange?: () => void }) {
  const [ev, setEv] = useState<any>(null);
  const [pkgs, setPkgs] = useState<any[]>([]);
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [owner, setOwner] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ m: string; t: "ok" | "err" } | null>(null);
  const [minutes, setMinutes] = useState(30);
  const [viewers, setViewers] = useState(50);
  const [pkgId, setPkgId] = useState("");

  const say = (m: string, t: "ok" | "err" = "ok") => { setToast({ m, t }); setTimeout(() => setToast(null), 4000); };

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const [e, p, me] = await Promise.all([
      supabase.from("events").select("id, package_id, remaining_minutes, total_used_minutes, extra_viewers").eq("id", eventId).single(),
      supabase.from("packages").select("id, name_tr, duration_minutes, max_viewers, display_order, is_active").order("display_order"),
      user ? supabase.from("users").select("role, is_admin, permissions").eq("id", user.id).single() : Promise.resolve({ data: null }),
    ]);
    setEv(e.data); setPkgs((p.data || []).filter((x: any) => x.is_active));
    setPerms((me as any).data?.permissions || {});
    setOwner((me as any).data?.role === "owner" || !!(me as any).data?.is_admin);
  };
  useEffect(() => { load(); }, [eventId]);

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

  const refresh = () => { load(); onChange?.(); };
  const grantTime = async () => { if (await call({ action: "grant_time", event_id: eventId, minutes })) { say(`${minutes} dk eklendi`); refresh(); } };
  const grantViewers = async () => { if (await call({ action: "grant_viewers", event_id: eventId, viewers })) { say(`${viewers} izleyici eklendi`); refresh(); } };
  const upgrade = async () => { if (!pkgId) return say("Paket seçin", "err"); if (await call({ action: "upgrade_package", event_id: eventId, package_id: pkgId })) { say("Paket yükseltildi"); refresh(); } };
  const reqDelete = async () => { const reason = prompt("Silme sebebi (owner onayına düşer):"); if (!reason) return; if (await call({ action: "request_approval", action_type: "delete_event", target_type: "event", target_id: eventId, reason })) say("Silme talebi owner onayına gönderildi"); };

  const pkg = pkgs.find((p) => p.id === ev?.package_id);
  const remaining = ev?.remaining_minutes ?? 0;
  const used = ev?.total_used_minutes ?? 0;
  const totalMin = remaining + used;
  const baseViewers = pkg?.max_viewers ?? 0;
  const extraViewers = ev?.extra_viewers ?? 0;
  const totalViewers = baseViewers + extraViewers;

  return (
    <div className="space-y-4">
      {/* Özet — paket + ek + toplam hak */}
      {ev && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Summary label="Paket" value={pkg?.name_tr || "—"} sub={pkg ? `${pkg.duration_minutes} dk · ${pkg.max_viewers} kişi` : ""} tone="slate" />
          <Summary label="Yayın Süresi Hakkı" value={`${totalMin} dk`} sub={`${remaining} dk kaldı · ${used} dk kullanıldı`} tone="emerald" />
          <Summary label="İzleyici Hakkı" value={`${totalViewers} kişi`} sub={`paket ${baseViewers}${extraViewers ? ` + ek ${extraViewers}` : ""}`} tone="blue" />
        </div>
      )}

      {/* Pozitif işlemler */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {can("grant_time") && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <h4 className="font-semibold text-slate-800 text-sm mb-2">Ücretsiz Ek Süre</h4>
            <div className="flex gap-2">
              <input type="number" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="w-16 px-2 py-2 rounded-lg border border-slate-200 text-sm outline-none" />
              <button onClick={grantTime} disabled={busy} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">+ Dk</button>
            </div>
          </div>
        )}
        {can("grant_viewers") && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <h4 className="font-semibold text-slate-800 text-sm mb-2">İzleyici Artır</h4>
            <div className="flex gap-2">
              <input type="number" value={viewers} onChange={(e) => setViewers(Number(e.target.value))} className="w-16 px-2 py-2 rounded-lg border border-slate-200 text-sm outline-none" />
              <button onClick={grantViewers} disabled={busy} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">+ Kişi</button>
            </div>
          </div>
        )}
        {can("grant_package") && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <h4 className="font-semibold text-slate-800 text-sm mb-2">Paket Yükselt</h4>
            <div className="flex gap-2">
              <select value={pkgId} onChange={(e) => setPkgId(e.target.value)} className="flex-1 min-w-0 px-2 py-2 rounded-lg border border-slate-200 text-sm outline-none">
                <option value="">Paket…</option>
                {pkgs.map(p => <option key={p.id} value={p.id}>{p.name_tr} · {p.duration_minutes}dk · {p.max_viewers}k</option>)}
              </select>
              <button onClick={upgrade} disabled={busy} className="py-2 px-3 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">↑</button>
            </div>
          </div>
        )}
        {!owner && (
          <div className="bg-red-50 rounded-xl border border-red-100 p-4">
            <h4 className="font-semibold text-slate-800 text-sm mb-2">Silme Talebi</h4>
            <button onClick={reqDelete} disabled={busy} className="w-full py-2 rounded-lg text-sm font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50">Owner Onayına</button>
          </div>
        )}
      </div>

      {toast && <div className="fixed bottom-6 right-6 z-50"><div className={`px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-semibold ${toast.t === "err" ? "bg-red-500" : "bg-emerald-600"}`}>{toast.m}</div></div>}
    </div>
  );
}

function Summary({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: string }) {
  const c: Record<string, string> = { slate: "text-slate-700", emerald: "text-emerald-700", blue: "text-blue-700" };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{label}</p>
      <p className={`text-lg font-bold ${c[tone] || "text-slate-700"}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}
