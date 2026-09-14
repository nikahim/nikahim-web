"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import CreateTicketModal from "@/components/CreateTicketModal";

const DONE = ['resolved', 'closed', 'cozuldu', 'çözüldü', 'kapandi', 'kapandı', 'kapali'];
const isDone = (s?: string | null) => DONE.includes(String(s || '').toLowerCase());
const isBot = (who: string) => /bot|elif|assistant|system|admin/i.test(who);

const ChannelIcon = ({ ch, size = 15 }: { ch: string; size?: number }) => {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (ch) {
    case 'mobile': return <svg {...p}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>;
    case 'web': return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
    case 'whatsapp': return <svg {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>;
    case 'email': return <svg {...p}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>;
    case 'phone': return <svg {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.94.36 1.86.7 2.73a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.35-1.35a2 2 0 0 1 2.11-.45c.87.34 1.79.57 2.73.7A2 2 0 0 1 22 16.92z"/></svg>;
    default: return <svg {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
  }
};

interface Reply { text: string; at: string; }
interface Ticket {
  id: string;
  ticket_number: string;
  user_id: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  user_phone?: string | null;
  subject?: string | null;
  status?: string | null;
  message?: string | null;
  admin_message?: string | null;
  admin_replies?: Reply[] | null;
  conversation?: any;
  source?: string | null;
  assigned_to?: string | null;
  assigned_at?: string | null;
  created_at: string;
  resolved_at?: string | null;
}
const isWeb = (t: Ticket) => String(t.source || 'mobile').toLowerCase() === 'web';

// Tek markalı e-posta şablonu — tüm yanıt/duyurular aynı kalıpta, sadece içerik değişir.
// Gönderim: Supabase edge function 'send-email' (Resend) — tam HTML kontrolü + dark mode fix.
interface BrandedMail {
  to_email: string; to_name?: string; subject: string;
  badge?: string; title: string; greeting: string;
  content_label?: string; message: string;
  ticket_ref?: string; ticket_status?: string;
  cta_label?: string; cta_url?: string;
}
async function sendBrandedEmail(p: BrandedMail) {
  if (!p.to_email) throw new Error('Alıcı e-postası yok');
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      to: p.to_email,
      subject: p.subject,
      params: {
        badge: p.badge || '✓',
        email_title: p.title,
        greeting: p.greeting,
        content_label: p.content_label || 'Mesaj',
        message: p.message,
        ticket_ref: p.ticket_ref || '',
        ticket_status: p.ticket_status || '',
        cta_label: p.cta_label || 'Ücretsiz Başla',
        cta_url: p.cta_url || 'https://nikahim.com/?indir=1',
      },
    },
  });
  if (error) throw new Error(error.message || 'E-posta gönderilemedi');
  if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
}

const fmt = (ts?: string | null) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

function normalizeConversation(conv: any): { who: string; text: string }[] {
  if (!conv) return [];
  let arr: any[] = [];
  if (Array.isArray(conv)) arr = conv;
  else if (typeof conv === 'string') { try { const p = JSON.parse(conv); arr = Array.isArray(p) ? p : []; } catch { return [{ who: 'user', text: conv }]; } }
  else if (typeof conv === 'object') arr = conv.messages || conv.items || [];
  return arr.map((m: any) => {
    const who = m.role || m.from || m.sender || m.author || (m.is_bot ? 'bot' : 'user');
    const text = m.content ?? m.text ?? m.message ?? m.body ?? (typeof m === 'string' ? m : JSON.stringify(m));
    return { who: String(who), text: String(text) };
  });
}

// Müşterinin ilk yazdığı mesaj (Elif'inki değil)
function firstCustomerMessage(t: Ticket): string {
  const conv = normalizeConversation(t.conversation);
  const um = conv.find(m => !isBot(m.who));
  return (um?.text || t.message || t.subject || 'Konu belirtilmemiş').trim();
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceTab, setSourceTab] = useState<'all' | 'mobile' | 'web' | 'whatsapp' | 'email' | 'phone'>('all');
  const [tab, setTab] = useState<'open' | 'done' | 'all'>('open');
  const [newTicketOpen, setNewTicketOpen] = useState(false);

  const [active, setActive] = useState<Ticket | null>(null);
  const [activeUser, setActiveUser] = useState<{ full_name?: string | null; email?: string | null; phone?: string | null } | null>(null);
  const [reply, setReply] = useState('');
  const [channels, setChannels] = useState<{ app: boolean; email: boolean; whatsapp: boolean }>({ app: false, email: false, whatsapp: false });
  const [resolveChecked, setResolveChecked] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const [meId, setMeId] = useState<string | null>(null);
  const [staffMap, setStaffMap] = useState<Record<string, string>>({});
  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setMeId(user?.id || null);
    const { data } = await supabase.from('users').select('id, full_name, username').or('role.eq.owner,role.eq.agent,is_admin.eq.true');
    const m: Record<string, string> = {};
    (data || []).forEach((u: any) => { m[u.id] = u.full_name || u.username || 'Uzman'; });
    setStaffMap(m);
  })(); }, []);

  const fetchTickets = async () => {
    const { data, error } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    if (error) { showToast('Talepler yüklenemedi: ' + error.message, 'error'); setLoading(false); return; }
    setTickets(data || []);
    setActive(prev => prev ? (data || []).find((t: Ticket) => t.id === prev.id) || prev : prev);
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
    const ch = supabase.channel('admin_support_tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => fetchTickets())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const openTicket = async (t: Ticket) => {
    setActive(t);
    setReply('');
    setResolveChecked(isDone(t.status));
    setActiveUser(null);
    let u: any = null;
    if (t.user_id) {
      const { data } = await supabase.from('users').select('full_name, email, phone').eq('id', t.user_id).single();
      if (data) { setActiveUser(data); u = data; }
    }
    const email = t.user_email || u?.email || '';
    // Varsayılan kanallar: kayıtlı + mobil kullanıcıya uygulama bildirimi; e-posta varsa e-posta işaretli
    setChannels({ app: !!t.user_id && !isWeb(t), email: !!email, whatsapp: false });
  };

  const sendReply = async () => {
    if (!active || !reply.trim()) return;
    setSending(true);
    const entry: Reply = { text: reply.trim(), at: new Date().toISOString() };
    const nextReplies = [...((active.admin_replies as Reply[]) || []), entry];
    // İlk cevabı yazan talebi üstlenir — atanmamışsa şu anki kullanıcıya ata
    const patch: any = { admin_replies: nextReplies };
    const claimed = !active.assigned_to && meId;
    if (claimed) { patch.assigned_to = meId; patch.assigned_at = new Date().toISOString(); }
    const { error } = await supabase.from('support_tickets').update(patch).eq('id', active.id);
    if (error) { setSending(false); showToast('Gönderilemedi: ' + error.message, 'error'); return; }
    // Teslim: seçilen kanallara göre — uygulama bildirimi ve/veya e-posta
    const recipientEmail = active.user_email || activeUser?.email || '';
    const name = activeUser?.full_name || active.user_name || 'Değerli Kullanıcı';
    const done = isDone(active.status);
    try {
      if (channels.app && active.user_id) {
        await supabase.from('notifications').insert({
          user_id: active.user_id, type: 'ticket_update',
          title: 'Destek Ekibinden Yeni Yanıt', body: entry.text,
          data: { ticket_number: active.ticket_number, subject: active.subject || null },
        });
      }
      if (channels.email && recipientEmail) {
        await sendBrandedEmail({
          to_email: recipientEmail, to_name: name,
          subject: `Destek Talebiniz Yanıtlandı · ${active.ticket_number}`,
          badge: '✓', title: 'Destek Talebiniz Yanıtlandı',
          greeting: `Merhaba ${name},`,
          content_label: 'Destek Ekibimizin Yanıtı',
          message: entry.text,
          ticket_ref: active.ticket_number,
          ticket_status: done ? 'Çözüldü' : 'Yanıtlandı',
          cta_label: 'Ücretsiz Başla', cta_url: 'https://nikahim.com/?indir=1',
        });
      }
    } catch (e: any) {
      setSending(false);
      showToast('Yanıt kaydedildi ama iletilemedi: ' + (e?.message || e), 'error');
      setActive({ ...active, ...patch });
      fetchTickets();
      return;
    }
    setSending(false);
    setReply('');
    setActive({ ...active, ...patch });
    const ch: string[] = [];
    if (channels.app && active.user_id) ch.push('bildirim');
    if (channels.email && recipientEmail) ch.push('e-posta');
    showToast('Yanıt gönderildi ✓' + (ch.length ? ' (' + ch.join(' + ') + ')' : ' (kaydedildi)'));
    fetchTickets();
  };

  const saveStatus = async () => {
    if (!active) return;
    const willResolve = resolveChecked;
    setSavingStatus(true);
    const patch: any = willResolve
      ? { status: 'resolved', resolved_at: new Date().toISOString(), popup_shown: false, read_by_user: false }
      : { status: 'open', resolved_at: null };
    const { error } = await supabase.from('support_tickets').update(patch).eq('id', active.id);
    if (error) { setSavingStatus(false); showToast('Durum kaydedilemedi: ' + error.message, 'error'); return; }
    // Konu kapanınca müşteriye "Yanıtlandı" bildirimi — son mesaj gövde olarak gider
    if (willResolve && active.user_id) {
      const last = activeReplies[activeReplies.length - 1]?.text || 'Destek talebiniz sonuçlandırıldı.';
      await supabase.from('notifications').insert({
        user_id: active.user_id, type: 'ticket_resolved',
        title: 'Destek Talebiniz Yanıtlandı', body: last,
        data: { ticket_number: active.ticket_number, subject: active.subject || null },
      });
    }
    setSavingStatus(false);
    setActive({ ...active, ...patch });
    showToast(willResolve ? 'Talep çözüldü olarak işaretlendi ✓' : 'Talep tekrar açıldı');
    fetchTickets();
  };

  const srcOf = (t: Ticket) => String(t.source || 'mobile').toLowerCase();
  const bySource = useMemo(() => tickets.filter(t => sourceTab === 'all' || srcOf(t) === sourceTab), [tickets, sourceTab]);

  const filtered = useMemo(() => bySource.filter(t => {
    if (tab === 'open') return !isDone(t.status);
    if (tab === 'done') return isDone(t.status);
    return true;
  }), [bySource, tab]);

  const srcCount = (k: string) => tickets.filter(t => (k === 'all' || srcOf(t) === k) && !isDone(t.status)).length;
  const openCount = bySource.filter(t => !isDone(t.status)).length;
  const doneCount = bySource.filter(t => isDone(t.status)).length;
  const allCount = bySource.length;

  const activeDone = active ? isDone(active.status) : false;
  const activeReplies: Reply[] = (active?.admin_replies as Reply[]) || [];
  const conv = active ? normalizeConversation(active.conversation) : [];
  // Durumu Kaydet — çözüldü tik durumu mevcut durumdan farklıysa aktif (yoksa flu)
  const statusDirty = active ? (resolveChecked !== activeDone) : false;

  const uName = activeUser?.full_name || active?.user_name || active?.name || '';
  const uEmail = activeUser?.email || active?.user_email || active?.email || '';
  const uPhone = activeUser?.phone || active?.user_phone || active?.phone || '';

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Destek Talepleri</h1>
          <p className="text-gray-500 text-sm mt-1">Kullanıcı taleplerini yanıtla ve çöz</p>
        </div>
        <button onClick={() => setNewTicketOpen(true)}
          className="flex-shrink-0 py-2.5 px-5 rounded-full font-semibold text-white text-sm transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)', boxShadow: '0 6px 20px rgba(200,104,110,0.3)' }}>
          + Yeni Talep
        </button>
      </div>

      {/* Kaynak tab'ları — Tümü / Mobil / Web / WhatsApp / E-posta */}
      <div className="flex flex-wrap gap-2 mb-5">
        {([['all', 'Tümü'], ['mobile', 'Mobil'], ['web', 'Web'], ['whatsapp', 'WhatsApp'], ['email', 'E-posta'], ['phone', 'Telefon']] as const).map(([k, l]) => {
          const c = srcCount(k);
          return (
            <button key={k} onClick={() => setSourceTab(k as any)}
              className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border-2 inline-flex items-center gap-2 ${sourceTab === k ? 'text-white shadow-lg border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              style={sourceTab === k ? { background: 'linear-gradient(135deg, #D17075, #C8686E)' } : {}}>
              <ChannelIcon ch={k} /> {l}
              {c > 0 && (
                <span className={`ml-2 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-bold ${sourceTab === k ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-600'}`}>{c}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Durum tab'ları */}
      <div className="flex gap-2 mb-4">
        {([['open', `Açık (${openCount})`], ['done', `Çözülen (${doneCount})`], ['all', `Tümü (${allCount})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${tab === k ? 'text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            style={tab === k ? { background: 'linear-gradient(135deg, #D17075, #C8686E)' } : {}}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">Bu kategoride talep yok</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => {
            const done = isDone(t.status);
            const replied = ((t.admin_replies as Reply[]) || []).length > 0;
            return (
              <button key={t.id} onClick={() => openTicket(t)}
                className="w-full text-left bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-rose-50 text-rose-600 font-semibold">{t.ticket_number}</span>
                      {done ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 inline-flex items-center gap-1">✓ Çözüldü</span>
                      ) : replied ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 inline-flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Yanıtlandı</span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 inline-flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Yeni</span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-800 truncate">{firstCustomerMessage(t)}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {(t.user_name || t.name) || 'İsimsiz'}{(t.user_email || t.email) ? ` · ${t.user_email || t.email}` : ''}{(t.user_phone || t.phone) ? ` · ${t.user_phone || t.phone}` : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                    <p className="text-xs text-gray-400">{fmt(t.created_at)}</p>
                    {replied && (
                      <span className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm" title="Yanıtlandı">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detay modal */}
      {active && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]" onClick={() => setActive(null)}>
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-rose-50 text-rose-600 font-semibold">{active.ticket_number}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${activeDone ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {activeDone
                    ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Çözüldü</>
                    : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Açık</>}
                </span>
                {active.assigned_to ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 inline-flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> {active.assigned_to === meId ? 'Siz' : (staffMap[active.assigned_to] || 'Uzman')}</span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Atanmadı</span>
                )}
              </div>
              <button onClick={() => setActive(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <div className="p-6">
              {/* Kullanıcı bilgisi — en üstte, kesin */}
              <div className="rounded-2xl p-4 mb-5 border" style={{ background: 'linear-gradient(135deg, #FFF5F3, #FDECEC)', borderColor: '#F3D5D8' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}>
                    {(uName[0] || 'K').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-800 truncate">{uName || 'İsimsiz Kullanıcı'}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${isWeb(active) ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}`}>
                        <ChannelIcon ch={isWeb(active) ? 'web' : 'mobile'} size={11} /> {isWeb(active) ? 'WEB' : 'MOBİL'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600 mt-0.5">
                      {!isWeb(active) && <span className="inline-flex items-center gap-1.5"><ChannelIcon ch="phone" size={12} /> {uPhone || '—'}</span>}
                      <span className="inline-flex items-center gap-1.5"><ChannelIcon ch="email" size={12} /> {uEmail || '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-rose-100 text-xs text-gray-500 flex flex-wrap gap-x-4">
                  <span>Konu: <b className="text-gray-700">{active.subject || '—'}</b></span>
                  <span>Oluşturma: {fmt(active.created_at)}</span>
                  {active.resolved_at && <span>Çözülme: {fmt(active.resolved_at)}</span>}
                </div>
              </div>

              {/* Elif konuşması */}
              {conv.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Konuşma Geçmişi</h4>
                  <div className="space-y-2 max-h-56 overflow-auto pr-1">
                    {conv.map((m, i) => {
                      const bot = isBot(m.who);
                      return (
                        <div key={i} className={`flex ${bot ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm ${bot ? 'bg-gray-100 text-gray-700' : 'bg-rose-50 text-gray-800 border border-rose-100'}`}>
                            {m.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Admin yanıt thread'i — gönderilen mesaj kartları */}
              {activeReplies.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Gönderilen Yanıtlar</h4>
                  <div className="space-y-2">
                    {activeReplies.map((r, i) => (
                      <div key={i} className="rounded-2xl px-4 py-3 text-white text-sm shadow-sm" style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}>
                        <p className="leading-relaxed whitespace-pre-wrap">{r.text}</p>
                        <p className="text-[10px] text-white/70 mt-1.5 text-right">{fmt(r.at)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mesaj gönder — çözülene kadar açık */}
              {!activeDone ? (
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                    {isWeb(active) ? 'Yeni Yanıt (ziyaretçinin e-postasına gönderilir)' : 'Yeni Yanıt (müşteriye anında bildirim gider)'}
                  </label>
                  <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Mesajınızı yazın..." rows={3} maxLength={1000}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-400 resize-none mb-2" />
                  {/* Kanal seçimi — cevap nereye gitsin */}
                  <div className="flex flex-wrap items-center gap-4 mb-3">
                    <span className="text-xs font-semibold text-gray-400 uppercase">Gönderim:</span>
                    <label className={`flex items-center gap-1.5 text-sm ${(!active.user_id) ? 'opacity-40' : 'cursor-pointer'}`}>
                      <input type="checkbox" disabled={!active.user_id} checked={channels.app} onChange={e => setChannels(c => ({ ...c, app: e.target.checked }))} className="w-4 h-4 rounded accent-rose-500" />
                      <ChannelIcon ch="mobile" size={14} /> Uygulama bildirimi
                    </label>
                    <label className={`flex items-center gap-1.5 text-sm ${(!uEmail) ? 'opacity-40' : 'cursor-pointer'}`}>
                      <input type="checkbox" disabled={!uEmail} checked={channels.email} onChange={e => setChannels(c => ({ ...c, email: e.target.checked }))} className="w-4 h-4 rounded accent-rose-500" />
                      <ChannelIcon ch="email" size={14} /> E-posta
                    </label>
                    <label className="flex items-center gap-1.5 text-sm opacity-40" title="WhatsApp entegrasyonu yakında">
                      <input type="checkbox" disabled className="w-4 h-4 rounded accent-rose-500" />
                      <ChannelIcon ch="whatsapp" size={14} /> WhatsApp <span className="text-[10px] text-gray-400">(yakında)</span>
                    </label>
                  </div>
                  <button onClick={sendReply} disabled={sending || !reply.trim() || (!channels.app && !channels.email)}
                    className="py-2.5 px-7 rounded-full font-semibold text-white text-sm transition-all hover:scale-[1.01] disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)', boxShadow: '0 6px 20px rgba(200,104,110,0.3)' }}>
                    {sending ? 'Gönderiliyor...' : (
                      <span className="inline-flex items-center gap-2"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Gönder</span>
                    )}
                  </button>
                </div>
              ) : (
                <div className="mb-5 rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-700 font-semibold text-center">
                  ✓ Konu kapatıldı — mesaj gönderimi kapalı
                </div>
              )}

              {/* Durum — ayrı aksiyon, tik atılmadan flu */}
              <div className="pt-5 border-t border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer select-none mb-2">
                  <input type="checkbox" checked={resolveChecked} onChange={e => setResolveChecked(e.target.checked)}
                    className="w-5 h-5 rounded accent-rose-500" />
                  <span className="text-sm font-semibold text-gray-700">Bu talep çözüldü olarak işaretlensin</span>
                </label>
                <p className="text-xs text-gray-400 mb-3">{`Kaydedince kullanıcıda "Talebiniz Yanıtlandı" popup'ı çıkar ve konu kapanır.`}</p>
                <button onClick={saveStatus} disabled={savingStatus || !statusDirty}
                  className={`py-2.5 px-7 rounded-full font-semibold text-white text-sm transition-all ${statusDirty ? 'hover:scale-[1.01]' : 'opacity-40 blur-[0.6px] cursor-not-allowed'}`}
                  style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)', boxShadow: statusDirty ? '0 6px 20px rgba(200,104,110,0.3)' : 'none' }}>
                  {savingStatus ? 'Kaydediliyor...' : resolveChecked ? '✓ Durumu Kaydet' : 'Durumu Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Yeni talep oluştur */}
      {newTicketOpen && (
        <CreateTicketModal onClose={() => setNewTicketOpen(false)} onCreated={(num) => { setNewTicketOpen(false); showToast('Talep oluşturuldu ✓ ' + num); fetchTickets(); }} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[70]">
          <div className={`px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-semibold ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{toast.msg}</div>
        </div>
      )}
    </div>
  );
}
