"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Voucher {
  id: string;
  code: string;
  discount_amount: number;
  discount_type: string;
  is_active: boolean;
  expires_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  created_at: string;
}

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Voucher> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchVouchers(); }, []);

  const fetchVouchers = async () => {
    setLoading(true);
    const { data } = await supabase.from('vouchers').select('*').order('created_at', { ascending: false });
    if (data) setVouchers(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editing || !editing.code) return;
    setSaving(true);

    const data: any = {
      code: editing.code.toUpperCase(),
      discount_amount: editing.discount_amount || 0,
      discount_type: editing.discount_type || 'fixed',
      is_active: editing.is_active !== false,
      expires_at: editing.expires_at || null,
      usage_limit: editing.usage_limit || null,
    };

    if (editing.id) {
      await supabase.from('vouchers').update(data).eq('id', editing.id);
    } else {
      await supabase.from('vouchers').insert(data);
    }

    setSaving(false);
    setEditing(null);
    fetchVouchers();
  };

  const handleDelete = async (v: Voucher) => {
    if (!confirm(`"${v.code}" kuponunu silmek istediğinize emin misiniz?`)) return;
    await supabase.from('vouchers').delete().eq('id', v.id);
    fetchVouchers();
  };

  const toggleActive = async (v: Voucher) => {
    await supabase.from('vouchers').update({ is_active: !v.is_active }).eq('id', v.id);
    fetchVouchers();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Kupon Kodları</h1>
          <p className="text-gray-500 text-sm mt-1">İndirim kuponlarını yönetin</p>
        </div>
        <button
          onClick={() => setEditing({ code: '', discount_amount: 0, discount_type: 'fixed', is_active: true })}
          className="px-6 py-3 rounded-full font-semibold text-white text-sm transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)', boxShadow: '0 8px 24px rgba(200,104,110,0.3)' }}
        >
          + Yeni Kupon
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Kod</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">İndirim</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Kullanım</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Bitiş</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Durum</th>
                <th className="text-right py-3 px-5 text-xs font-semibold text-gray-500 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map(v => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-5">
                    <span className="font-mono font-bold text-sm" style={{ color: '#C8686E' }}>{v.code}</span>
                  </td>
                  <td className="py-3 px-5 text-sm text-gray-700 font-semibold">
                    {v.discount_type === 'percentage' ? `%${v.discount_amount}` : `${v.discount_amount} ₺`}
                  </td>
                  <td className="py-3 px-5 text-sm text-gray-600">
                    {v.usage_count || 0} {v.usage_limit ? `/ ${v.usage_limit}` : ''}
                  </td>
                  <td className="py-3 px-5 text-xs text-gray-500">
                    {v.expires_at ? new Date(v.expires_at).toLocaleDateString('tr-TR') : 'Süresiz'}
                  </td>
                  <td className="py-3 px-5">
                    <button onClick={() => toggleActive(v)} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${v.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      {v.is_active ? 'Aktif' : 'Pasif'}
                    </button>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <button onClick={() => setEditing(v)} className="text-rose-500 hover:text-rose-600 text-sm font-semibold mr-3">Düzenle</button>
                    <button onClick={() => handleDelete(v)} className="text-red-500 hover:text-red-600 text-sm font-semibold">Sil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {vouchers.length === 0 && <div className="text-center py-12 text-gray-400">Henüz kupon yok</div>}
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-3xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6">{editing.id ? 'Kuponu Düzenle' : 'Yeni Kupon'}</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Kupon Kodu *</label>
                  <input
                    type="text"
                    value={editing.code || ''}
                    onChange={e => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono"
                    placeholder="NIKAH50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">İndirim Tipi</label>
                    <select value={editing.discount_type || 'fixed'} onChange={e => setEditing({ ...editing, discount_type: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
                      <option value="fixed">Sabit (₺)</option>
                      <option value="percentage">Yüzde (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">İndirim Miktarı *</label>
                    <input type="number" value={editing.discount_amount || 0} onChange={e => setEditing({ ...editing, discount_amount: parseFloat(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Kullanım Limiti</label>
                    <input type="number" value={editing.usage_limit || ''} onChange={e => setEditing({ ...editing, usage_limit: e.target.value ? parseInt(e.target.value) : null })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="Sınırsız" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Bitiş Tarihi</label>
                    <input type="date" value={editing.expires_at?.split('T')[0] || ''} onChange={e => setEditing({ ...editing, expires_at: e.target.value || null })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editing.is_active !== false} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm text-gray-700">Aktif</span>
                </label>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setEditing(null)} className="flex-1 py-3 rounded-full font-semibold text-sm border border-gray-200 hover:bg-gray-50">İptal</button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-full font-semibold text-white text-sm transition-all hover:scale-[1.02] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #D17075, #C8686E)' }}
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
