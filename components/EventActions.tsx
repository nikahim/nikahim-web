"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Ortak etkinlik aksiyonları — hem admin hem callcenter kullanır.
// Pozitif (ek süre / paket yükseltme) izinliyse direkt; owner hepsini yapar.
// Eksi (silme) → agent onay talebi açar; owner için burada gösterilmez (admin'de ayrı akış).
export default function EventActions({ eventId, onChange }: { eventId: string; onChange?: () => void }) {
  const [pkgs, setPkgs] = useState<any[]>([]);
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [owner, setOwner] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ m: string; t: "ok" | "err" } | null>(null);
  const [minutes, setMinutes] = useState(30);
  const [pkgId, setPkgId] = useState("");

  const say = (m: string, t: "ok" | "err" = "ok") => { setToast({ m, t }); setTimeout(() => setToast(null), 4000); };

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const [p, me] = await Promise.all([
      supabase.from("packages").select("id, name_tr, duration_minutes").eq("is_active", true).order("display_order"),
      user ? supabase.from("users").select("role, is_admin, permissions").eq("id", user.id).single() : Promise.resolve({ data: null }),
    ]);
    setPkgs(p.data || []);
    setPerms((me as any).data?.permissions || {});
    setOwner((me as any).data?.role === "owner" || !!(me as any).data?.is_admin);
  })(); }, []);

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

  const grantTime = async () => { if (await call({ action: "grant_time", event_id: eventId, minutes })) { say(`${minutes} dk eklendi`); onChange?.(); } };
  const upgrade = async () => { if (!pkgId) return say("Paket seçin", "err"); if (await call({ action: "upgrade_package", event_id: eventId, package_id: pkgId })) { say("Paket yükseltildi"); onChange?.(); } };
  const reqDelete = async () => { const reason = prompt("Silme sebebi (owner onayına düşer):"); if (!reason) return; if (await call({ action: "request_approval", action_type: "delete_event", target_type: "event", target_id: eventId, reason })) say("Silme talebi owner onayına gönderildi"); };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {can("grant_time") && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <h4 className="font-semibold text-slate-800 text-sm mb-2">Ücretsiz Ek Süre</h4>
          <div className="flex gap-2">
            <input type="number" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="w-16 px-2 py-2 rounded-lg border border-slate-200 text-sm outline-none" />
            <button onClick={grantTime} disabled={busy} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">+ Süre Ver</button>
          </div>
        </div>
      )}
      {can("grant_package") && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <h4 className="font-semibold text-slate-800 text-sm mb-2">Paket Yükselt</h4>
          <div className="flex gap-2">
            <select value={pkgId} onChange={(e) => setPkgId(e.target.value)} className="flex-1 min-w-0 px-2 py-2 rounded-lg border border-slate-200 text-sm outline-none">
              <option value="">Paket…</option>
              {pkgs.map(p => <option key={p.id} value={p.id}>{p.name_tr} · {p.duration_minutes}dk</option>)}
            </select>
            <button onClick={upgrade} disabled={busy} className="py-2 px-3 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">Yükselt</button>
          </div>
        </div>
      )}
      {!owner && (
        <div className="bg-red-50 rounded-xl border border-red-100 p-4">
          <h4 className="font-semibold text-slate-800 text-sm mb-2">Silme Talebi</h4>
          <button onClick={reqDelete} disabled={busy} className="w-full py-2 rounded-lg text-sm font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50">Owner Onayına Gönder</button>
        </div>
      )}
      {toast && <div className="fixed bottom-6 right-6 z-50"><div className={`px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-semibold ${toast.t === "err" ? "bg-red-500" : "bg-emerald-600"}`}>{toast.m}</div></div>}
    </div>
  );
}
