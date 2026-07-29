"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

// Girişte 2FA doğrulama ekranı — kullanıcının aktif TOTP faktörü varsa panele girmeden önce kod ister.
export default function MfaChallenge({ onVerified }: { onVerified: () => void }) {
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  const onBox = (i: number, val: string) => {
    const d = val.replace(/\D/g, "").slice(-1);
    const arr = code.padEnd(6, " ").split("");
    arr[i] = d || " ";
    const next = arr.join("").replace(/\s+$/g, "");
    setCode(next.replace(/\s/g, ""));
    setErr("");
    if (d && i < 5) boxes.current[i + 1]?.focus();
  };
  const onKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[i] && i > 0) boxes.current[i - 1]?.focus();
    if (e.key === "Enter") verify();
  };

  useEffect(() => { (async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = (data?.totp || []).find((f: any) => f.status === "verified") || data?.totp?.[0];
    if (totp) setFactorId(totp.id);
  })(); }, []);

  const verify = async () => {
    if (code.length < 6 || !factorId) return;
    setBusy(true); setErr("");
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (error) { setErr("Kod hatalı. Uygulamandaki güncel kodu gir."); setCode(""); return; }
    onVerified();
  };

  const logout = async () => { await supabase.auth.signOut(); window.location.href = "/"; };

  // 6 hane dolunca otomatik doğrula
  useEffect(() => { if (code.length === 6 && factorId && !busy) verify(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [code, factorId]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "radial-gradient(1200px 600px at 50% -10%, #1e293b 0%, #0f172a 55%, #0b1120 100%)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h1 className="text-xl font-bold text-white">İki Adımlı Doğrulama</h1>
          <p className="text-slate-400 text-sm mt-1">Authenticator uygulamandaki 6 haneli kodu gir</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <input key={i} ref={(el) => { boxes.current[i] = el; }} value={code[i] || ""}
                onChange={(e) => onBox(i, e.target.value)} onKeyDown={(e) => onKey(i, e)}
                inputMode="numeric" maxLength={1} autoFocus={i === 0}
                className={`w-11 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-all ${code[i] ? "border-slate-800 bg-slate-50 text-slate-900" : "border-slate-200 text-slate-400"} focus:border-slate-500 focus:ring-2 focus:ring-slate-200`} />
            ))}
          </div>
          {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
          <button onClick={verify} disabled={busy || code.length < 6} className="w-full mt-3 py-3 rounded-xl text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-50">{busy ? "Doğrulanıyor…" : "Doğrula"}</button>
          <button onClick={logout} className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-slate-600">Çıkış yap</button>
        </div>
      </div>
    </div>
  );
}
