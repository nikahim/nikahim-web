"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import MfaChallenge from "@/components/MfaChallenge";

export interface Me { id: string; full_name?: string; username?: string; role?: string; is_admin?: boolean; active?: boolean; permissions?: Record<string, boolean>; }

export default function CallcenterLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [needMfa, setNeedMfa] = useState(false);
  const [loading, setLoading] = useState(true);

  const isLogin = pathname === "/callcenter/login";

  useEffect(() => {
    if (isLogin) { setLoading(false); return; }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/callcenter/login"); return; }
      const { data } = await supabase.from("users").select("id, full_name, username, role, is_admin, active, permissions").eq("id", user.id).single();
      const owner = data?.role === "owner" || data?.is_admin;
      if (!data || (data.role !== "agent" && !owner) || (data.role === "agent" && data.active === false)) {
        await supabase.auth.signOut(); router.replace("/callcenter/login"); return;
      }
      try {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") setNeedMfa(true);
      } catch {}
      setMe(data);
      setLoading(false);
    })();
  }, [pathname]);

  const logout = async () => { await supabase.auth.signOut(); router.replace("/callcenter/login"); };

  if (isLogin) return <>{children}</>;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F6F7F9]"><div className="w-10 h-10 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;
  if (!me) return null;
  if (needMfa) return <MfaChallenge onVerified={() => setNeedMfa(false)} />;
  if (needMfa) return <MfaChallenge onVerified={() => setNeedMfa(false)} />;

  const owner = me.role === "owner" || me.is_admin;
  const can = (p: string) => owner || !!me.permissions?.[p];

  const nav = [
    { href: "/callcenter", label: "Panelim", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", show: true },
    { href: "/callcenter/destek", label: "Destek Talepleri", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", show: can("support") },
    { href: "/callcenter/operasyon", label: "Canlı Operasyon", icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z", show: can("live_ops") },
    { href: "/callcenter/kullanicilar", label: "Kullanıcı Ara", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", show: can("user_lookup") },
    { href: "/callcenter/guvenlik", label: "Güvenlik", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", show: true },
  ].filter((n) => n.show);

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex">
      <aside className="w-60 bg-slate-900 flex flex-col">
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-nikahim.png" alt="Nikahım" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Nikahım</h1>
            <p className="text-[10px] text-slate-400">Destek Uzmanı Paneli</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800"}`}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-semibold text-white truncate">{me.full_name || me.username}</p>
            <p className="text-[11px] text-slate-400">{owner ? "Yönetici" : "Destek Uzmanı"}</p>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Çıkış Yap
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
