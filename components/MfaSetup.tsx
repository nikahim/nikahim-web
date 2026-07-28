"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// 2FA kurulum/yönetim — QR üret, Authenticator ile tarat, kodla doğrula. Kaldırma da burada.
export default function MfaSetup() {
  const [factors, setFactors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ m: string; t: "ok" | "err" } | null>(null);

  const say = (m: string, t: "ok" | "err" = "ok") => { setMsg({ m, t }); setTimeout(() => setMsg(null), 4000); };

  const load = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp || []));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const active = factors.find((f) => f.status === "verified");

  const startEnroll = async () => {
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `TOTP-${Date.now()}` });
    setBusy(false);
    if (error) { say(error.message, "err"); return; }
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const confirmEnroll = async () => {
    if (!enroll || code.length < 6) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code });
    setBusy(false);
    if (error) { say("Kod hatalı, tekrar dene.", "err"); return; }
    setEnroll(null); setCode(""); say("2FA etkinleştirildi ✓"); load();
  };

  const remove = async (id: string) => {
    if (!confirm("2FA kaldırılsın mı? Güvenlik azalır.")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) { say(error.message, "err"); return; }
    say("2FA kaldırıldı"); load();
  };

  if (loading) return <div className="py-10 flex justify-center"><div className="w-8 h-8 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-6 max-w-lg">
      <h2 className="font-bold text-slate-800 mb-1">İki Adımlı Doğrulama (2FA)</h2>
      <p className="text-sm text-slate-500 mb-4">Google Authenticator / Authy gibi bir uygulamayla hesabını koru.</p>

      {active && !enroll && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-200">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-sm font-semibold text-emerald-800">2FA aktif</span>
          </div>
          <button onClick={() => remove(active.id)} className="text-sm font-semibold text-red-600 hover:underline">Kaldır</button>
        </div>
      )}

      {!active && !enroll && (
        <button onClick={startEnroll} disabled={busy} className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-50">{busy ? "Hazırlanıyor…" : "2FA'yı Etkinleştir"}</button>
      )}

      {enroll && (
        <div>
          <p className="text-sm text-slate-600 mb-3">1. Authenticator uygulamanla bu QR'ı tarat:</p>
          <div className="flex justify-center mb-3"><div className="p-3 bg-white border border-slate-200 rounded-xl" dangerouslySetInnerHTML={{ __html: enroll.qr }} /></div>
          <p className="text-xs text-slate-400 text-center mb-3">Elle: <span className="font-mono">{enroll.secret}</span></p>
          <p className="text-sm text-slate-600 mb-2">2. Uygulamadaki 6 haneli kodu gir:</p>
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="000000"
            className="w-full text-center text-xl tracking-[0.4em] font-bold py-3 rounded-xl border border-slate-200 outline-none focus:border-slate-400 mb-3" />
          <div className="flex gap-2">
            <button onClick={() => { setEnroll(null); setCode(""); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">Vazgeç</button>
            <button onClick={confirmEnroll} disabled={busy || code.length < 6} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">Doğrula & Etkinleştir</button>
          </div>
        </div>
      )}

      {msg && <div className={`mt-3 text-sm font-semibold ${msg.t === "err" ? "text-red-600" : "text-emerald-600"}`}>{msg.m}</div>}
    </div>
  );
}
