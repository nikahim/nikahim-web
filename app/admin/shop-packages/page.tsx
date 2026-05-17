"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ShopPackage {
  id: string;
  name_tr: string;
  description_tr: string | null;
  price_monthly: number;
  price_yearly: number | null;
  discount_price: number | null;
  discount_label: string | null;
  max_products: number;
  max_gallery_images: number;
  has_priority_listing: boolean;
  has_featured_badge: boolean;
  has_messaging: boolean;
  has_statistics: boolean;
  has_custom_logo: boolean;
  support_level: string;
  is_recommended: boolean;
  is_active: boolean;
  display_order: number;
}

const EMPTY: Partial<ShopPackage> = {
  name_tr: '',
  description_tr: '',
  price_monthly: 0,
  price_yearly: null,
  discount_price: null,
  discount_label: '',
  max_products: 5,
  max_gallery_images: 5,
  has_priority_listing: false,
  has_featured_badge: false,
  has_messaging: true,
  has_statistics: false,
  has_custom_logo: false,
  support_level: 'basic',
  is_recommended: false,
  is_active: true,
  display_order: 0,
};

export default function AdminShopPackagesPage() {
  const [packages, setPackages] = useState<ShopPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<ShopPackage> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPackages(); }, []);

  const fetchPackages = async () => {
    setLoading(true);
    const { data } = await supabase.from('shop_packages').select('*').order('display_order', { ascending: true });
    if (data) setPackages(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editing || !editing.name_tr) return;
    setSaving(true);

    const data = {
      name_tr: editing.name_tr,
      description_tr: editing.description_tr,
      price_monthly: editing.price_monthly,
      price_yearly: editing.price_yearly || null,
      discount_price: editing.discount_price || null,
      discount_label: editing.discount_label || null,
      max_products: editing.max_products,
      max_gallery_images: editing.max_gallery_images,
      has_priority_listing: editing.has_priority_listing,
      has_featured_badge: editing.has_featured_badge,
      has_messaging: editing.has_messaging,
      has_statistics: editing.has_statistics,
      has_custom_logo: editing.has_custom_logo,
      support_level: editing.support_level,
      is_recommended: editing.is_recommended,
      is_active: editing.is_active,
      display_order: editing.display_order,
    };

    if (editing.id) {
      await supabase.from('shop_packages').update(data).eq('id', editing.id);
    } else {
      await supabase.from('shop_packages').insert(data);
    }

    setSaving(false);
    setEditing(null);
    fetchPackages();
  };

  const handleDelete = async (pkg: ShopPackage) => {
    if (!confirm(`"${pkg.name_tr}" paketini silmek istediğinize emin misiniz?`)) return;
    const prev = packages;
    setPackages(prev.filter(p => p.id !== pkg.id));
    const { error } = await supabase.from('shop_packages').delete().eq('id', pkg.id);
    if (error) {
      setPackages(prev);
      alert('Silme başarısız: ' + error.message);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Kurumsal Paketler</h1>
          <p className="text-gray-500 text-sm mt-1">Mağaza abonelik paketlerini yönetin</p>
        </div>
        <button
          onClick={() => setEditing({ ...EMPTY })}
          className="px-6 py-3 rounded-full font-semibold text-white text-sm transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #D4AF7A, #B8965A)', boxShadow: '0 8px 24px rgba(184,150,90,0.3)' }}
        >
          + Yeni Paket
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: '#B8965A', borderTopColor: 'transparent' }} />
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
                  {pkg.discount_price !== null ? (
                    <>
                      <p className="text-xs text-gray-400 line-through">{pkg.price_monthly} ₺</p>
                      <p className="text-2xl font-bold text-green-600">{pkg.discount_price} ₺</p>
                      {pkg.discount_label && <p className="text-xs text-green-600">{pkg.discount_label}</p>}
                    </>
                  ) : (
                    <p className="text-2xl font-bold" style={{ color: '#B8965A' }}>{pkg.price_monthly === 0 ? 'Ücretsiz' : `${pkg.price_monthly} ₺`}</p>
                  )}
                  {pkg.price_monthly > 0 && <p className="text-xs text-gray-400">aylık</p>}
                </div>
              </div>

              {pkg.description_tr && <p className="text-sm text-gray-600 mb-4">{pkg.description_tr}</p>}

              <div className="space-y-1 mb-4 text-xs text-gray-600">
                <p>📦 {pkg.max_products === 999 ? 'Sınırsız' : pkg.max_products} ürün</p>
                <p>🖼 {pkg.max_gallery_images === 999 ? 'Sınırsız' : pkg.max_gallery_images} galeri foto</p>
                <p>🎯 {pkg.support_level === 'priority' ? 'Öncelikli destek' : 'Normal destek'}</p>
              </div>

              <div className="grid grid-cols-2 gap-1 text-xs mb-4">
                {pkg.has_priority_listing && <span className="text-green-600">✓ Öne Çıkma</span>}
                {pkg.has_featured_badge && <span className="text-green-600">✓ Popüler Rozet</span>}
                {pkg.has_messaging && <span className="text-green-600">✓ Mesajlaşma</span>}
                {pkg.has_statistics && <span className="text-green-600">✓ İstatistikler</span>}
                {pkg.has_custom_logo && <span className="text-green-600">✓ Özel Logo</span>}
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button onClick={() => setEditing(pkg)} className="flex-1 py-2 rounded-full font-semibold text-sm border border-gray-200 hover:bg-gray-50">
                  Düzenle
                </button>
                <button onClick={() => handleDelete(pkg)} className="px-4 py-2 rounded-full font-semibold text-sm border border-red-200 text-red-500 hover:bg-red-50">
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
              <h2 className="text-2xl font-bold mb-6">{editing.id ? 'Paketi Düzenle' : 'Yeni Kurumsal Paket'}</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Paket Adı *</label>
                  <input type="text" value={editing.name_tr || ''} onChange={e => setEditing({ ...editing, name_tr: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Açıklama</label>
                  <textarea value={editing.description_tr || ''} onChange={e => setEditing({ ...editing, description_tr: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" rows={2} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Aylık Fiyat (₺) *</label>
                    <input type="number" value={editing.price_monthly || 0} onChange={e => setEditing({ ...editing, price_monthly: parseFloat(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Yıllık Fiyat (₺)</label>
                    <input type="number" value={editing.price_yearly || ''} onChange={e => setEditing({ ...editing, price_yearly: e.target.value ? parseFloat(e.target.value) : null })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="Opsiyonel" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">İndirimli Fiyat (₺)</label>
                    <input type="number" value={editing.discount_price ?? ''} onChange={e => setEditing({ ...editing, discount_price: e.target.value ? parseFloat(e.target.value) : null })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="Boş bırak = indirim yok" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">İndirim Etiketi</label>
                    <input type="text" value={editing.discount_label || ''} onChange={e => setEditing({ ...editing, discount_label: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="%30 İndirim" />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Limitler</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Max Ürün</label>
                      <input type="number" value={editing.max_products || 0} onChange={e => setEditing({ ...editing, max_products: parseInt(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                      <p className="text-[10px] text-gray-400 mt-1">999 = sınırsız</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Max Galeri</label>
                      <input type="number" value={editing.max_gallery_images || 0} onChange={e => setEditing({ ...editing, max_gallery_images: parseInt(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                      <p className="text-[10px] text-gray-400 mt-1">Foto sayısı</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Destek</label>
                      <select value={editing.support_level || 'basic'} onChange={e => setEditing({ ...editing, support_level: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
                        <option value="basic">Normal</option>
                        <option value="priority">Öncelikli</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Özellikler / İzinler</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'has_priority_listing', label: 'Öne Çıkma (üst sıralarda)' },
                      { key: 'has_featured_badge', label: 'Popüler Rozet' },
                      { key: 'has_messaging', label: 'Mesajlaşma' },
                      { key: 'has_statistics', label: 'İstatistikler' },
                      { key: 'has_custom_logo', label: 'Özel Logo' },
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
                  style={{ background: 'linear-gradient(135deg, #D4AF7A, #B8965A)', boxShadow: '0 6px 20px rgba(184,150,90,0.3)' }}
                >
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
