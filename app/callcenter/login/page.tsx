"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function CallcenterLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const login = async () => {
    setBusy(true); setErr("");
    const email = `${username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, "")}@ekip.nikahim.com`;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) { setErr("Kullanıcı adı veya şifre hatalı."); setBusy(false); return; }
    const { data: me } = await supabase.from("users").select("role, active, is_admin").eq("id", data.user.id).single();
    if (!me || (me.role !== "agent" && me.role !== "owner" && !me.is_admin)) {
      await supabase.auth.signOut(); setErr("Bu panele erişim yetkiniz yok."); setBusy(false); return;
    }
    if (me.role === "agent" && me.active === false) {
      await supabase.auth.signOut(); setErr("Hesabınız pasif durumda. Yöneticinize başvurun."); setBusy(false); return;
    }
    router.replace("/callcenter");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "radial-gradient(1200px 600px at 50% -10%, #1e293b 0%, #0f172a 55%, #0b1120 100%)" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-7">
          <div className="w-20 h-20 rounded-3xl bg-white shadow-xl flex items-center justify-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-nikahim.png" alt="Nikahım" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Nikahım</h1>
          <p className="text-slate-400 text-sm mt-1">Destek Uzmanı Paneli</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Kullanıcı adı</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} placeholder="kullaniciadi" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Şifre</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} type="password" placeholder="••••••" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-400" />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button onClick={login} disabled={busy || !username || !password} className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-50 transition-all">{busy ? "Giriş yapılıyor…" : "Giriş Yap"}</button>
          </div>
        </div>
        <p className="text-center text-xs text-slate-500 mt-4">Yalnızca yetkili Nikahım Destek Uzmanları içindir.</p>
      </div>
    </div>
  );
}
