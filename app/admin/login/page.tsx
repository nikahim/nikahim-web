"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (authError) {
      setError("E-posta veya şifre hatalı! Lütfen tekrar deneyin.");
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: userData } = await supabase.from('users').select('is_admin').eq('id', data.user.id).single();
      if (!userData?.is_admin) {
        await supabase.auth.signOut();
        setError("Bu hesap admin yetkisine sahip değil.");
        setLoading(false);
        return;
      }
      router.replace('/admin');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(180deg, #FDFCFA, #F8F5F0, #F5F2ED)' }}>
      <div className="bg-white rounded-3xl p-10 max-w-md w-full" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full.png" alt="Nikahım" className="h-24 mx-auto mb-2 object-contain" />
          <p className="text-base font-semibold text-gray-700">Admin Paneli</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-600 text-center">{error}</div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-rose-400 text-sm"
              placeholder="info.nikahim@gmail.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-rose-400 text-sm"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full font-semibold text-white text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #D17075, #C8686E, #C06068)', boxShadow: '0 8px 24px rgba(200,104,110,0.3)' }}
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
