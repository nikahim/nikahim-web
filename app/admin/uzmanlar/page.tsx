"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AppModal from "@/components/AppModal";

const PERMS = [
  { key: "support", label: "Destek talepleri" },
  { key: "live_ops", label: "Canlı operasyon" },
  { key: "user_lookup", label: "Kullanıcı arama / detay" },
  { key: "grant_time", label: "Ücretsiz ek süre" },
  { key: "grant_viewers", label: "İzleyici artırma" },
  { key: "grant_package", label: "Paket yükseltme" },
  { key: "notify_user", label: "Kullanıcıya bildirim" },
];
const DEFAULT_PERMS = Object.fromEntries(PERMS.map((p) => [p.key, true]));

interface Agent { id: string; username?: string; full_name?: string; email?: string; permissions?: Record<string, boolean>; active?: boolean; created_at?: string; }

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ m: string; t: "ok" | "err" } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Agent | null>(null);

  const say = (m: string, t: "ok" | "err" = "ok") => { setToast({ m, t }); setTimeout(() => setToast(null), 4000); };

  const load = async () => {
    const [a, ap] = await Promise.all([
      supabase.from("users").select("id, username, full_name, email, permissions, active, created_at").eq("role", "agent").order("created_at", { ascending: false }),
      supabase.from("approval_requests").select("*").eq("status", "pending").order("created_at", { ascending: false }),
    ]);
    setAgents(a.data || []);
    setApprovals(ap.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const call = async (payload: any) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-agents", { body: payload });
    setBusy(false);
    if (error || data?.error) {
      let msg = data?.error || error?.message || "Hata";
      // Gerçek hata mesajını function yanıtından çek
      try { const ctx = (error as any)?.context; if (ctx?.json) { const j = await ctx.json(); if (j?.error) msg = j.error; } } catch {}
      say(msg, "err");
      return false;
    }
    return true;
  };

  const togglePerm = async (ag: Agent, key: string) => {
    const perms = { ...(ag.permissions || {}), [key]: !(ag.permissions?.[key]) };
    setAgents((prev) => prev.map((x) => x.id === ag.id ? { ...x, permissions: perms } : x)); // optimistic
    const ok = await call({ action: "update", agent_id: ag.id, permissions: perms });
    if (!ok) load();
  };

  const toggleActive = async (ag: Agent) => {
    const ok = await call({ action: "update", agent_id: ag.id, active: !ag.active });
    if (ok) { setAgents((prev) => prev.map((x) => x.id === ag.id ? { ...x, active: !ag.active } : x)); say(ag.active ? "Uzman pasife alındı" : "Uzman aktifleştirildi"); }
  };

  const resetPassword = async (ag: Agent) => {
    const pw = prompt(`${ag.username} için yeni şifre (≥6):`);
    if (!pw) return;
    if (await call({ action: "reset_password", agent_id: ag.id, password: pw })) say("Şifre güncellendi");
  };

  const confirmDelete = async () => {
    const ag = pendingDelete;
    if (!ag) return;
    if (await call({ action: "delete", agent_id: ag.id })) { say("Uzman silindi"); load(); }
    setPendingDelete(null);
  };

  const reviewApproval = async (r: any, status: "approved" | "rejected") => {
    const { data: { user } } = await supabase.auth.getUser();
    // Onaylandıysa ve silme talebiyse — gerçekten sil (owner, service role fonksiyonu)
    if (status === "approved" && r.action_type === "delete_event" && r.target_id) {
      const { data, error } = await supabase.functions.invoke("agent-action", { body: { action: "purge_event", event_id: r.target_id } });
      if (error || data?.error) { say(data?.error || "Silme başarısız", "err"); return; }
    }
    await supabase.from("approval_requests").update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", r.id);
    say(status === "approved" ? "Onaylandı ve uygulandı" : "Talep reddedildi");
    load();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F6F7F9]"><div className="w-10 h-10 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F6F7F9] p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Uzmanlar</h1>
          <p className="text-slate-500 text-sm mt-1">Nikahım Destek Uzmanları — ekip ve izin yönetimi</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 transition-all">+ Uzman Oluştur</button>
      </div>

      {/* Onay kuyruğu */}
      {approvals.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h2 className="font-bold text-slate-800">Onay Bekleyen Talepler</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{approvals.length}</span>
          </div>
          <div className="space-y-2">
            {approvals.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{ACTION_LABEL[r.action_type] || r.action_type}</p>
                  <p className="text-xs text-slate-500">{r.reason || `${r.target_type || ""} ${r.target_id || ""}`}</p>
                </div>
                <button onClick={() => reviewApproval(r, "approved")} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700">Onayla</button>
                <button onClick={() => reviewApproval(r, "rejected")} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-200 hover:bg-slate-300">Reddet</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uzman listesi */}
      {agents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-10 text-center">
          <p className="text-slate-400 text-sm">{'Henüz uzman yok. "+ Uzman Oluştur" ile ekle.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {agents.map((ag) => (
            <div key={ag.id} className="bg-white rounded-2xl border border-slate-200/70 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-800">{ag.full_name || ag.username}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ag.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>{ag.active ? "Aktif" : "Pasif"}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">@{ag.username}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleActive(ag)} disabled={busy} title={ag.active ? "Pasife al" : "Aktifleştir"} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 text-xs font-semibold">{ag.active ? "Durdur" : "Başlat"}</button>
                  <button onClick={() => resetPassword(ag)} disabled={busy} title="Şifre sıfırla" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 text-xs font-semibold">Şifre</button>
                  <button onClick={() => setPendingDelete(ag)} disabled={busy} title="Sil" className="p-2 rounded-lg hover:bg-red-50 text-red-500 text-xs font-semibold">Sil</button>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-2">İzinler</p>
                <div className="grid grid-cols-2 gap-2">
                  {PERMS.map((p) => {
                    const on = !!ag.permissions?.[p.key];
                    return (
                      <button key={p.key} onClick={() => togglePerm(ag, p.key)} disabled={busy}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-all ${on ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-slate-50 text-slate-400 border border-slate-200"}`}>
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 ${on ? "bg-blue-600" : "bg-slate-300"}`}>{on && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}</span>
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); load(); say("Uzman oluşturuldu"); }} call={call} busy={busy} />}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={`px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-semibold ${toast.t === "err" ? "bg-red-500" : "bg-emerald-600"}`}>{toast.m}</div>
        </div>
      )}

      <AppModal
        open={!!pendingDelete}
        variant="destructive"
        title="Uzmanı Sil?"
        description={pendingDelete ? `${pendingDelete.full_name || pendingDelete.username} uzmanı kalıcı olarak silinecek. Bu işlem geri alınamaz.` : ''}
        primaryLabel="Sil"
        secondaryLabel="Vazgeç"
        twoButtons
        loading={busy}
        onPrimary={confirmDelete}
        onSecondary={() => setPendingDelete(null)}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

const ACTION_LABEL: Record<string, string> = {
  delete_event: "Düğün silme talebi", delete_user: "Kullanıcı silme talebi", refund: "İade talebi", suspend_account: "Hesap askıya alma talebi",
};

function CreateModal({ onClose, onDone, call, busy }: any) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [perms, setPerms] = useState<Record<string, boolean>>({ ...DEFAULT_PERMS });

  const submit = async () => {
    const ok = await call({ action: "create", username, display_name: displayName, password, permissions: perms });
    if (ok) onDone();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-800 mb-4">Yeni Uzman</h3>
        <div className="space-y-3">
          <Field label="Görünen ad"><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ör: Elif Yılmaz" className="inp" /></Field>
          <Field label="Kullanıcı adı (giriş için)"><input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))} placeholder="elif" className="inp" /></Field>
          <Field label="Şifre (≥6)"><input value={password} onChange={(e) => setPassword(e.target.value)} type="text" placeholder="••••••" className="inp" /></Field>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-2">İzinler</p>
            <div className="grid grid-cols-2 gap-2">
              {PERMS.map((p) => {
                const on = !!perms[p.key];
                return (
                  <button key={p.key} onClick={() => setPerms((x) => ({ ...x, [p.key]: !x[p.key] }))}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left ${on ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-slate-50 text-slate-400 border border-slate-200"}`}>
                    <span className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 ${on ? "bg-blue-600" : "bg-slate-300"}`}>{on && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}</span>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">Vazgeç</button>
          <button onClick={submit} disabled={busy || username.length < 3 || password.length < 6} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-50">{busy ? "Oluşturuluyor…" : "Oluştur"}</button>
        </div>
      </div>
      <style jsx>{`.inp{width:100%;padding:10px 14px;border:1px solid #E2E8F0;border-radius:12px;font-size:14px;outline:none}.inp:focus{border-color:#94A3B8}`}</style>
    </div>
  );
}

function Field({ label, children }: any) {
  return <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>{children}</div>;
}
