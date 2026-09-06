"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AppModal from "@/components/AppModal";

interface Package {
  id: string;
  name_tr: string;
  name_en: string | null;
  description_tr: string | null;
  price_tl: number;
  discount_price: number | null;
  discount_label: string | null;
  duration_minutes: number;
  max_viewers: number;
  video_quality: string;
  has_recording: boolean;
  can_download: boolean;
  has_invitation: boolean;
  has_music: boolean;
  has_gold_gift: boolean;
  has_chat: boolean;
  is_recommended: boolean;
  is_active: boolean;
  display_order: number;
}

const EMPTY_PACKAGE: Partial<Package> = {
  name_tr: '',
  name_en: '',
  description_tr: '',
  price_tl: 0,
  discount_price: null,
  discount_label: '',
  duration_minutes: 60,
  max_viewers: 100,
  video_quality: 'HD',
  has_recording: false,
  can_download: false,
  has_invitation: false,
  has_music: false,
  has_gold_gift: false,
  has_chat: false,
  is_recommended: false,
  is_active: true,
  display_order: 0,
};

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Package> | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Package | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchPackages(); }, []);

  const fetchPackages = async () => {
    setLoading(true);
    const { data } = await supabase.from('packages').select('*').order('display_order', { ascending: true });
    if (data) setPackages(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editing || !editing.name_tr) return;
    setSaving(true);

    const data = {
      name_tr: editing.name_tr,
      name_en: editing.name_en || editing.name_tr,
      description_tr: editing.description_tr,
      price_tl: editing.price_tl,
      discount_price: editing.discount_price || null,
      discount_label: editing.discount_label || null,
      duration_minutes: editing.duration_minutes,
      max_viewers: editing.max_viewers,
      video_quality: editing.video_quality,
      has_recording: editing.has_recording,
      can_download: editing.can_download,
      has_invitation: editing.has_invitation,
      has_music: editing.has_music,
      has_gold_gift: editing.has_gold_gift,
      has_chat: editing.has_chat,
      is_recommended: editing.is_recommended,
      is_active: editing.is_active,
      display_order: editing.display_order,
    };

    if (editing.id) {
      await supabase.from('packages').update(data).eq('id', editing.id);
    } else {
      await supabase.from('packages').insert(data);
    }

    setSaving(false);
    setEditing(null);
    fetchPackages();
  };

  const confirmDelete = async () => {
    const pkg = pendingDelete;
    if (!pkg) return;
    setDeleting(true);
    const prev = packages;
    setPackages(prev.filter(p => p.id !== pkg.id));
    const { error } = await supabase.from('packages').delete().eq('id', pkg.id);
    setDeleting(false);
    setPendingDelete(null);
    if (error) {
      setPackages(prev);
      alert('Silme başarısız: ' + error.message);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Bireysel Paketler</h1>
          <p className="text-gray-500 text-sm mt-1">Canlı yayın paketlerini yönetin</p>
        </div>
        <button
          onClick={() => setEditing({ ...EMPTY_PACKAGE })}
          className="px-6 py-3 rounded-full font-semibold text-white text-sm transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)', boxShadow: '0 8px 24px rgba(200,104,110,0.3)' }}
        >
          + Yeni Paket
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {packages.map(pkg => (
            <div key={pkg.id} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{pkg.name_tr}</h3>
                  {pkg.is_recommended && <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">⭐ En Popüler</span>}
                  {!pkg.is_active && <span className="inline-block mt-1 ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Pasif</span>}
                </div>
                <div className="text-right">
                  {pkg.discount_price ? (
                    <>
                      <p className="text-xs text-gray-400 line-through">{pkg.price_tl} ₺</p>
                      <p className="text-2xl font-bold" style={{ color: '#22C55E' }}>{pkg.discount_price} ₺</p>
                      {pkg.discount_label && <p className="text-xs text-green-600">{pkg.discount_label}</p>}
                    </>
                  ) : (
                    <p className="text-2xl font-bold" style={{ color: '#C8686E' }}>{pkg.price_tl} ₺</p>
                  )}
                </div>
              </div>

              {pkg.description_tr && <p className="text-sm text-gray-600 mb-4">{pkg.description_tr}</p>}

              <div className="space-y-2 mb-4 text-xs text-gray-600">
                <p>⏱ {pkg.duration_minutes} dakika</p>
                <p>👥 {pkg.max_viewers} izleyici</p>
                <p>📹 {pkg.video_quality} kalite</p>
              </div>

              <div className="grid grid-cols-2 gap-1 text-xs mb-4">
                {pkg.has_recording && <span className="text-green-600">✓ Kayıt</span>}
                {pkg.can_download && <span className="text-green-600">✓ İndir</span>}
                {pkg.has_invitation && <span className="text-green-600">✓ Davetiye</span>}
                {pkg.has_music && <span className="text-green-600">✓ Müzik</span>}
                {pkg.has_gold_gift && <span className="text-green-600">✓ Altın Tak</span>}
                {pkg.has_chat && <span className="text-green-600">✓ Sohbet</span>}
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setEditing(pkg)}
                  className="flex-1 py-2 rounded-full font-semibold text-sm border border-gray-200 hover:bg-gray-50"
                >
                  Düzenle
                </button>
                <button
                  onClick={() => setPendingDelete(pkg)}
                  className="px-4 py-2 rounded-full font-semibold text-sm border border-red-200 text-red-500 hover:bg-red-50"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6">{editing.id ? 'Paketi Düzenle' : 'Yeni Paket'}</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Paket Adı (TR) *</label>
                    <input type="text" value={editing.name_tr || ''} onChange={e => setEditing({ ...editing, name_tr: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Paket Adı (EN)</label>
                    <input type="text" value={editing.name_en || ''} onChange={e => setEditing({ ...editing, name_en: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Açıklama</label>
                  <textarea value={editing.description_tr || ''} onChange={e => setEditing({ ...editing, description_tr: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" rows={2} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Fiyat (₺) *</label>
                    <input type="number" value={editing.price_tl || 0} onChange={e => setEditing({ ...editing, price_tl: parseFloat(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">İndirimli Fiyat (₺)</label>
                    <input type="number" value={editing.discount_price || ''} onChange={e => setEditing({ ...editing, discount_price: e.target.value ? parseFloat(e.target.value) : null })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="Boş bırak = indirim yok" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">İndirim Etiketi</label>
                    <input type="text" value={editing.discount_label || ''} onChange={e => setEditing({ ...editing, discount_label: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="%30 İndirim" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Süre (dk)</label>
                    <input type="number" value={editing.duration_minutes || 0} onChange={e => setEditing({ ...editing, duration_minutes: parseInt(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Max İzleyici</label>
                    <input type="number" value={editing.max_viewers || 0} onChange={e => setEditing({ ...editing, max_viewers: parseInt(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Video Kalitesi</label>
                    <select value={editing.video_quality || 'HD'} onChange={e => setEditing({ ...editing, video_quality: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
                      <option>SD</option>
                      <option>HD</option>
                      <option>Full HD</option>
                      <option>4K</option>
                    </select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">İzinler / Özellikler</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'has_recording', label: 'Yayın Kaydı' },
                      { key: 'can_download', label: 'Kayıt İndirme' },
                      { key: 'has_invitation', label: 'Dijital Davetiye' },
                      { key: 'has_music', label: 'Müzik' },
                      { key: 'has_gold_gift', label: 'Altın Takma' },
                      { key: 'has_chat', label: 'Canlı Sohbet' },
                    ].map(p => (
                      <label key={p.key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(editing as any)[p.key] || false}
                          onChange={e => setEditing({ ...editing, [p.key]: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Sıralama</label>
                    <input type="number" value={editing.display_order || 0} onChange={e => setEditing({ ...editing, display_order: parseInt(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                  </div>
                  <div className="flex items-end gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editing.is_recommended || false} onChange={e => setEditing({ ...editing, is_recommended: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm text-gray-700">⭐ Popüler</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editing.is_active !== false} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm text-gray-700">Aktif</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
                <button onClick={() => setEditing(null)} className="flex-1 py-3 rounded-full font-semibold text-sm border border-gray-200 hover:bg-gray-50">İptal</button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-full font-semibold text-white text-sm transition-all hover:scale-[1.02] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)', boxShadow: '0 6px 20px rgba(200,104,110,0.3)' }}
                >
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AppModal
        open={!!pendingDelete}
        variant="destructive"
        title="Paketi Sil?"
        description={pendingDelete ? `"${pendingDelete.name_tr}" paketi kalıcı olarak silinecek. Bu işlem geri alınamaz.` : ''}
        primaryLabel="Sil"
        secondaryLabel="Vazgeç"
        twoButtons
        loading={deleting}
        onPrimary={confirmDelete}
        onSecondary={() => setPendingDelete(null)}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
