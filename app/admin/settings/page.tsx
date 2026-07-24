"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminSettingsPage() {
  const [email, setEmail] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setEmail(user.email);
    })();
  }, []);

  const strength = (() => {
    let s = 0;
    if (next.length >= 8) s++;
    if (/[A-Z]/.test(next)) s++;
    if (/[0-9]/.test(next)) s++;
    if (/[^A-Za-z0-9]/.test(next)) s++;
    return s; // 0-4
  })();
  const strengthLabel = ["Çok zayıf", "Zayıf", "Orta", "İyi", "Güçlü"][strength];
  const strengthColor = ["#EF4444", "#EF4444", "#F59E0B", "#3B82F6", "#22C55E"][strength];

  const changePassword = async () => {
    if (!current) { showToast("Mevcut şifrenizi girin", "error"); return; }
    if (next.length < 8) { showToast("Yeni şifre en az 8 karakter olmalı", "error"); return; }
    if (next !== confirm) { showToast("Yeni şifreler eşleşmiyor", "error"); return; }
    if (next === current) { showToast("Yeni şifre eskisiyle aynı olamaz", "error"); return; }

    setSaving(true);
    // 1) Mevcut şifreyi doğrula (yeniden giriş)
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: current });
    if (authErr) {
      setSaving(false);
      showToast("Mevcut şifre yanlış", "error");
      return;
    }
    // 2) Yeni şifreyi ayarla
    const { error: updErr } = await supabase.auth.updateUser({ password: next });
    setSaving(false);
    if (updErr) { showToast("Değiştirilemedi: " + updErr.message, "error"); return; }

    showToast("Şifreniz başarıyla değiştirildi ✓");
    setCurrent(""); setNext(""); setConfirm("");
  };

  const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-400";

  return (
    <div className="p-8 max-w-xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Ayarlar</h1>
        <p className="text-gray-500 text-sm mt-1">Hesap ve güvenlik</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold"
            style={{ background: "linear-gradient(135deg, #D17075, #C8686E)" }}>
            {(email[0] || "A").toUpperCase()}
          </div>
          <div>
            <p className="text-xs text-gray-400">Giriş yapılan hesap</p>
            <p className="text-sm font-semibold text-gray-800">{email || "—"}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Şifre Değiştir</h2>
        <p className="text-xs text-gray-400 mb-5">Güvenliğiniz için önce mevcut şifrenizi doğrulayın.</p>

        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Mevcut Şifre</label>
        <input type={show ? "text" : "password"} value={current} onChange={e => setCurrent(e.target.value)}
          placeholder="••••••••" className={inputCls + " mb-4"} />

        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Yeni Şifre</label>
        <input type={show ? "text" : "password"} value={next} onChange={e => setNext(e.target.value)}
          placeholder="En az 8 karakter" className={inputCls + " mb-2"} />
        {next.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${(strength / 4) * 100}%`, backgroundColor: strengthColor }} />
            </div>
            <span className="text-xs font-semibold" style={{ color: strengthColor }}>{strengthLabel}</span>
          </div>
        )}

        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Yeni Şifre (Tekrar)</label>
        <input type={show ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder="••••••••" className={inputCls + " mb-3"} />
        {confirm.length > 0 && confirm !== next && <p className="text-xs text-red-500 mb-3">Şifreler eşleşmiyor</p>}

        <label className="flex items-center gap-2 mb-5 cursor-pointer select-none">
          <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} className="w-4 h-4 rounded accent-rose-500" />
          <span className="text-sm text-gray-600">Şifreleri göster</span>
        </label>

        <button onClick={changePassword} disabled={saving}
          className="py-3 px-8 rounded-full font-semibold text-white text-sm transition-all hover:scale-[1.01] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #D17075, #C8686E)", boxShadow: "0 6px 20px rgba(200,104,110,0.3)" }}>
          {saving ? "Kaydediliyor..." : "🔒 Şifreyi Değiştir"}
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[70]">
          <div className={`px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-semibold ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>{toast.msg}</div>
        </div>
      )}
    </div>
  );
}
