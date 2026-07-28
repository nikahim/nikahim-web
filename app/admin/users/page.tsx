"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  user_type: string;
  is_admin: boolean;
  role?: string | null;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'individual' | 'business' | 'admin'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  };

  const filtered = users.filter(u => {
    if (u.role === 'agent') return false; // destek uzmanları burada değil, Uzmanlar sayfasında
    if (filter === 'individual' && u.user_type !== 'individual') return false;
    if (filter === 'business' && u.user_type !== 'business') return false;
    if (filter === 'admin' && !u.is_admin) return false;
    if (search && !u.email?.toLowerCase().includes(search.toLowerCase()) && !u.full_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const formatDate = (str: string) => new Date(str).toLocaleDateString('tr-TR');

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Kullanıcılar</h1>
        <p className="text-gray-500 text-sm mt-1">Tüm kullanıcı hesapları</p>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {[
          { key: 'all', label: 'Tümü' },
          { key: 'individual', label: 'Bireysel' },
          { key: 'business', label: 'Kurumsal' },
          { key: 'admin', label: 'Adminler' },
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
          placeholder="E-posta veya isim..."
          className="ml-auto px-4 py-2.5 rounded-full border border-gray-200 text-sm w-72 focus:outline-none focus:border-rose-400"
        />
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
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">İsim</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">E-posta</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Telefon</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Tip</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Kayıt</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-5 text-sm font-semibold text-gray-800">{u.full_name || '—'}</td>
                  <td className="py-3 px-5 text-sm text-gray-600">{u.email}</td>
                  <td className="py-3 px-5 text-sm text-gray-600">{u.phone || '—'}</td>
                  <td className="py-3 px-5">
                    {u.is_admin ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-600">Admin</span>
                    ) : u.user_type === 'business' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">Kurumsal</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600">Bireysel</span>
                    )}
                  </td>
                  <td className="py-3 px-5 text-xs text-gray-500">{formatDate(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
