"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Shop {
  id: string;
  name: string;
  city: string | null;
}

interface Notification {
  id: string;
  shop_id: string | null;
  title: string;
  body: string;
  type: string;
  created_at: string;
  shops?: { name: string } | null;
  read_count?: number;
}

const TYPE_OPTIONS = [
  { key: 'info',    label: 'Bilgi',      color: '#3B82F6', emoji: 'ℹ️' },
  { key: 'success', label: 'Başarı',     color: '#22C55E', emoji: '✅' },
  { key: 'warning', label: 'Uyarı',      color: '#F59E0B', emoji: '⚠️' },
  { key: 'promo',   label: 'Promosyon',  color: '#B8965A', emoji: '🎁' },
  { key: 'admin',   label: 'Yönetim',    color: '#7C3AED', emoji: '🛡️' },
];

export default function AdminNotificationsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form state
  const [target, setTarget] = useState<'broadcast' | 'individual'>('broadcast');
  const [shopId, setShopId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<string>('info');

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const showToast = (msg: string, t: 'success' | 'error' = 'success') => {
    setToast({ msg, type: t });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    // Mağazaları çek
    const { data: shopsData } = await supabase
      .from('shops')
      .select('id, name, city')
      .eq('is_approved', true)
      .order('name');
    setShops(shopsData || []);

    // Bildirimleri çek (her biri için read count)
    const { data: notifs } = await supabase
      .from('shop_notifications')
      .select('*, shops(name)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (notifs) {
      // Her bildirim için kaç mağaza okumuş
      const withReads = await Promise.all(
        notifs.map(async (n: Notification) => {
          const { count } = await supabase
            .from('shop_notification_reads')
            .select('shop_id', { count: 'exact', head: true })
            .eq('notification_id', n.id);
          return { ...n, read_count: count || 0 };
        })
      );
      setNotifications(withReads);
    }

    setLoading(false);
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      showToast('Başlık ve mesaj boş olamaz', 'error');
      return;
    }
    if (target === 'individual' && !shopId) {
      showToast('Lütfen bir mağaza seçin', 'error');
      return;
    }

    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('shop_notifications').insert({
      shop_id: target === 'broadcast' ? null : shopId,
      title: title.trim(),
      body: body.trim(),
      type,
      created_by: user?.id,
    });

    setSending(false);

    if (error) {
      showToast(`Gönderilemedi: ${error.message}`, 'error');
      console.error('Notification send error:', error);
      return;
    }

    showToast(target === 'broadcast' ? 'Tüm mağazalara gönderildi ✓' : 'Mağazaya gönderildi ✓');
    setTitle('');
    setBody('');
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('shop_notifications').delete().eq('id', id);
    if (error) { showToast(`Silinemedi: ${error.message}`, 'error'); return; }
    showToast('Bildirim silindi');
    setConfirmDelete(null);
    fetchAll();
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const totalShops = shops.length;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Bildirimler</h1>
        <p className="text-gray-500 text-sm mt-1">Mağazalara bildirim gönder</p>
      </div>

      {/* Gönder form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Yeni Bildirim</h2>

        {/* Hedef */}
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Hedef</label>
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setTarget('broadcast')}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${target === 'broadcast' ? 'text-white shadow-md' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
            style={target === 'broadcast' ? { background: 'linear-gradient(135deg, #D17075, #C8686E)' } : {}}
          >
            📢 Tüm Mağazalar ({totalShops})
          </button>
          <button
            onClick={() => setTarget('individual')}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${target === 'individual' ? 'text-white shadow-md' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
            style={target === 'individual' ? { background: 'linear-gradient(135deg, #D17075, #C8686E)' } : {}}
          >
            👤 Belirli Mağaza
          </button>
        </div>

        {/* Mağaza seçimi (individual) */}
        {target === 'individual' && (
          <>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Mağaza</label>
            <select
              value={shopId}
              onChange={e => setShopId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-400 mb-4"
            >
              <option value="">Mağaza seçin...</option>
              {shops.map(s => (
                <option key={s.id} value={s.id}>{s.name} {s.city ? `— ${s.city}` : ''}</option>
              ))}
            </select>
          </>
        )}

        {/* Tür */}
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Tür</label>
        <div className="flex flex-wrap gap-2 mb-4">
          {TYPE_OPTIONS.map(t => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${type === t.key ? 'text-white shadow-md' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
              style={type === t.key ? { backgroundColor: t.color } : {}}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* Başlık */}
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Başlık</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Örn: Yeni özellik eklendi"
          maxLength={80}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-400 mb-4"
        />

        {/* Mesaj */}
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Mesaj</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Detaylı açıklama..."
          maxLength={500}
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-400 mb-4 resize-none"
        />
        <div className="text-xs text-gray-400 text-right mb-4">{body.length}/500</div>

        {/* Gönder butonu */}
        <button
          onClick={handleSend}
          disabled={sending}
          className="w-full py-3 rounded-full font-semibold text-white text-sm transition-all hover:scale-[1.01] disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)', boxShadow: '0 6px 20px rgba(200,104,110,0.3)' }}
        >
          {sending ? 'Gönderiliyor...' : target === 'broadcast' ? `📢 ${totalShops} Mağazaya Gönder` : '📨 Gönder'}
        </button>
      </div>

      {/* Gönderilen bildirimler */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Gönderilen Bildirimler ({notifications.length})</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 text-gray-400">Henüz bildirim gönderilmedi</div>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => {
            const meta = TYPE_OPTIONS.find(t => t.key === n.type) || TYPE_OPTIONS[0];
            return (
              <div key={n.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                      style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
                    >
                      {meta.emoji}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{n.title}</h3>
                      <p className="text-xs text-gray-400">{formatDate(n.created_at)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmDelete(n.id)}
                    className="text-red-500 hover:text-red-600 text-sm font-semibold"
                  >
                    Sil
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">{n.body}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {n.shop_id === null ? (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600">
                      📢 Tüm mağazalar
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">
                      👤 {n.shops?.name || 'Mağaza'}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600">
                    👁 {n.read_count || 0} okundu
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Onay Modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-7 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-red-50">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800 mb-1">Bildirimi Sil</h3>
                <p className="text-sm text-gray-600 leading-relaxed">Bu bildirim tüm alıcılar için kaybolur. Emin misiniz?</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-full font-semibold text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 rounded-full font-semibold text-sm text-white bg-red-500 hover:bg-red-600"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[70]">
          <div className={`px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-semibold ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
