"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'live' | 'draft' | 'ended'>('all');

  useEffect(() => { fetchEvents(); }, [filter]);

  const fetchEvents = async () => {
    setLoading(true);
    let query = supabase.from('events').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query;
    if (data) setEvents(data);
    setLoading(false);
  };

  const formatDate = (str: string) => str ? new Date(str).toLocaleDateString('tr-TR') : '—';

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Etkinlikler</h1>
        <p className="text-gray-500 text-sm mt-1">Tüm nikah etkinlikleri</p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        {[
          { key: 'all', label: 'Tümü' },
          { key: 'draft', label: 'Taslak' },
          { key: 'live', label: 'Canlı' },
          { key: 'ended', label: 'Bitti' },
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
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Çift</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Tür</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Tarih</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Şehir</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Durum</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Link</th>
              </tr>
            </thead>
            <tbody>
              {events.map(e => (
                <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-5 text-sm font-semibold text-gray-800">
                    {e.bride_first_name} & {e.groom_first_name}
                  </td>
                  <td className="py-3 px-5 text-sm text-gray-600 capitalize">{e.event_type || '—'}</td>
                  <td className="py-3 px-5 text-sm text-gray-600">{formatDate(e.event_date)}</td>
                  <td className="py-3 px-5 text-sm text-gray-600">{e.city || '—'}</td>
                  <td className="py-3 px-5">
                    {e.status === 'live' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600">● Canlı</span>
                    ) : e.status === 'ended' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Bitti</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">Taslak</span>
                    )}
                  </td>
                  <td className="py-3 px-5">
                    {e.event_link && (
                      <a href={`https://nikahim.com/canli/${e.event_link}`} target="_blank" rel="noopener" className="text-rose-500 text-xs hover:underline">
                        /{e.event_link}
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
