"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

interface Shop {
  id: string;
  name: string;
  category: string;
  description: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  cover_image: string | null;
  images: string[] | null;
  is_approved: boolean;
  is_active: boolean;
  owner_first_name: string | null;
  owner_last_name: string | null;
  owner_id: string | null;
  created_at: string;
  total_views: number;
  total_clicks: number;
}

export default function AdminShopsPage() {
  const params = useSearchParams();
  const initialFilter = params.get('filter') || 'all';

  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'inactive'>(initialFilter as any);
  const [search, setSearch] = useState('');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { fetchShops(); }, [filter]);

  const fetchShops = async () => {
    setLoading(true);
    let query = supabase.from('shops').select('*').order('created_at', { ascending: false });
    if (filter === 'pending') query = query.eq('is_approved', false);
    else if (filter === 'approved') query = query.eq('is_approved', true);
    else if (filter === 'inactive') query = query.eq('is_active', false);
    const { data } = await query;
    if (data) setShops(data);
    setLoading(false);
  };

  const approveShop = async (shop: Shop) => {
    setProcessing(true);
    await supabase.from('shops').update({
      is_approved: true,
      approved_at: new Date().toISOString(),
    }).eq('id', shop.id);
    setProcessing(false);
    setSelectedShop(null);
    fetchShops();
  };

  const rejectShop = async (shop: Shop) => {
    if (!confirm(`"${shop.name}" mağazasını reddetmek istediğinize emin misiniz?`)) return;
    setProcessing(true);
    await supabase.from('shops').update({ is_active: false, is_approved: false }).eq('id', shop.id);
    setProcessing(false);
    setSelectedShop(null);
    fetchShops();
  };

  const deleteShop = async (shop: Shop) => {
    if (!confirm(`"${shop.name}" mağazasını TAMAMEN silmek istediğinize emin misiniz?`)) return;
    setProcessing(true);
    await supabase.from('shops').delete().eq('id', shop.id);
    setProcessing(false);
    setSelectedShop(null);
    fetchShops();
  };

  const toggleActive = async (shop: Shop) => {
    setProcessing(true);
    await supabase.from('shops').update({ is_active: !shop.is_active }).eq('id', shop.id);
    setProcessing(false);
    fetchShops();
  };

  const filtered = shops.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.city?.toLowerCase().includes(search.toLowerCase()) ||
    s.category?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (str: string) => new Date(str).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Mağazalar</h1>
        <p className="text-gray-500 text-sm mt-1">Mağaza onay ve yönetim</p>
      </div>

      {/* Filtreler */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {[
          { key: 'all', label: 'Tümü' },
          { key: 'pending', label: 'Onay Bekleyen' },
          { key: 'approved', label: 'Onaylı' },
          { key: 'inactive', label: 'Pasif' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${filter === f.key ? 'text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}
            style={filter === f.key ? { background: 'linear-gradient(135deg, #D17075, #C8686E)' } : {}}
          >
            {f.label}
          </button>
        ))}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Mağaza adı, şehir, kategori..."
          className="ml-auto px-4 py-2.5 rounded-full border border-gray-200 text-sm w-72 focus:outline-none focus:border-rose-400"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">Mağaza bulunamadı</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Mağaza</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Sahip</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Kategori</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Şehir</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Durum</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Tarih</th>
                <th className="text-right py-3 px-5 text-xs font-semibold text-gray-500 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(shop => (
                <tr key={shop.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      {shop.cover_image ? (
                        <img src={shop.cover_image} alt={shop.name} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" /></svg>
                        </div>
                      )}
                      <span className="font-semibold text-gray-800 text-sm">{shop.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-sm text-gray-600">
                    {shop.owner_first_name ? `${shop.owner_first_name} ${shop.owner_last_name || ''}` : '—'}
                  </td>
                  <td className="py-3 px-5 text-sm text-gray-600">{shop.category}</td>
                  <td className="py-3 px-5 text-sm text-gray-600">{shop.city || '—'}</td>
                  <td className="py-3 px-5">
                    {!shop.is_active ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Pasif</span>
                    ) : shop.is_approved ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-600">Onaylı</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">Bekliyor</span>
                    )}
                  </td>
                  <td className="py-3 px-5 text-xs text-gray-500">{formatDate(shop.created_at)}</td>
                  <td className="py-3 px-5 text-right">
                    <button onClick={() => setSelectedShop(shop)} className="text-rose-500 hover:text-rose-600 text-sm font-semibold">
                      İncele
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detay Modal */}
      {selectedShop && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedShop(null)}>
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            {selectedShop.cover_image && (
              <img src={selectedShop.cover_image} alt={selectedShop.name} className="w-full h-48 object-cover rounded-t-3xl" />
            )}
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedShop.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">{selectedShop.category} · {selectedShop.city}</p>
                </div>
                {!selectedShop.is_active ? (
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Pasif</span>
                ) : selectedShop.is_approved ? (
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-600">Onaylı</span>
                ) : (
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">Bekliyor</span>
                )}
              </div>

              {selectedShop.description && (
                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Açıklama</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{selectedShop.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Sahip</h4>
                  <p className="text-sm text-gray-700">{selectedShop.owner_first_name} {selectedShop.owner_last_name}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Telefon</h4>
                  <p className="text-sm text-gray-700">{selectedShop.phone || '—'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">WhatsApp</h4>
                  <p className="text-sm text-gray-700">{selectedShop.whatsapp || '—'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Instagram</h4>
                  <p className="text-sm text-gray-700">{selectedShop.instagram || '—'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Görüntülenme</h4>
                  <p className="text-sm text-gray-700">{selectedShop.total_views}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Tıklama</h4>
                  <p className="text-sm text-gray-700">{selectedShop.total_clicks}</p>
                </div>
                {selectedShop.address && (
                  <div className="col-span-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Adres</h4>
                    <p className="text-sm text-gray-700">{selectedShop.address}</p>
                  </div>
                )}
              </div>

              {/* Galeri */}
              {selectedShop.images && selectedShop.images.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Galeri ({selectedShop.images.length})</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedShop.images.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img} alt="" className="w-full h-24 object-cover rounded-lg" />
                        <button
                          onClick={async () => {
                            if (!confirm('Bu fotoğrafı silmek istediğinize emin misiniz?')) return;
                            const newImages = selectedShop.images!.filter((_, idx) => idx !== i);
                            await supabase.from('shops').update({ images: newImages }).eq('id', selectedShop.id);
                            setSelectedShop({ ...selectedShop, images: newImages });
                            fetchShops();
                          }}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Aksiyonlar */}
              <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-100">
                {!selectedShop.is_approved && (
                  <button
                    onClick={() => approveShop(selectedShop)}
                    disabled={processing}
                    className="flex-1 py-3 rounded-full font-semibold text-white text-sm transition-all hover:scale-[1.02] disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)', boxShadow: '0 6px 20px rgba(34,197,94,0.3)' }}
                  >
                    ✓ Onayla
                  </button>
                )}
                {selectedShop.is_approved && (
                  <button
                    onClick={() => toggleActive(selectedShop)}
                    disabled={processing}
                    className="flex-1 py-3 rounded-full font-semibold text-sm border-2 transition-all hover:bg-amber-50"
                    style={{ borderColor: '#D97706', color: '#D97706' }}
                  >
                    {selectedShop.is_active ? 'Askıya Al' : 'Aktifleştir'}
                  </button>
                )}
                {!selectedShop.is_approved && (
                  <button
                    onClick={() => rejectShop(selectedShop)}
                    disabled={processing}
                    className="flex-1 py-3 rounded-full font-semibold text-sm border-2 transition-all hover:bg-amber-50"
                    style={{ borderColor: '#D97706', color: '#D97706' }}
                  >
                    Reddet
                  </button>
                )}
                <button
                  onClick={() => deleteShop(selectedShop)}
                  disabled={processing}
                  className="px-5 py-3 rounded-full font-semibold text-sm border-2 transition-all hover:bg-red-50"
                  style={{ borderColor: '#EF4444', color: '#EF4444' }}
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
