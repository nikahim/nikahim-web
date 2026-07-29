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

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    const email = `${username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, "")}@ekip.nikahim.com`;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) { setErr("Kullanıcı adı veya şifre hatalı! Lütfen tekrar deneyin."); setBusy(false); return; }
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(180deg, #FDFCFA, #F8F5F0, #F5F2ED)' }}>
      <div className="bg-white rounded-3xl p-10 max-w-md w-full" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full.png" alt="Nikahım" className="h-24 mx-auto mb-2 object-contain" />
          <p className="text-base font-semibold text-gray-700">Nikahım Uzmanı Girişi</p>
        </div>

        {err && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-600 text-center">{err}</div>
        )}

        <form onSubmit={login} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Kullanıcı adı</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="kullaniciadi"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-rose-400 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Şifre</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-rose-400 text-sm" />
          </div>
          <button type="submit" disabled={busy || !username || !password}
            className="w-full py-3.5 rounded-full font-semibold text-white text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #D17075, #C8686E, #C06068)', boxShadow: '0 8px 24px rgba(200,104,110,0.3)' }}>
            {busy ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-5">Yalnızca yetkili Nikahım Destek Uzmanları içindir.</p>
      </div>
    </div>
  );
}
