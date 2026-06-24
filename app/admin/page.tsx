"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEvents: 0,
    activeEvents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    const [users, events, activeEv] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('events').select('id', { count: 'exact', head: true }),
      supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'live'),
    ]);
    setStats({
      totalUsers: users.count ?? 0,
      totalEvents: events.count ?? 0,
      activeEvents: activeEv.count ?? 0,
    });
    setLoading(false);
  };

  const cards = [
    { label: 'Toplam Kullanıcı', value: stats.totalUsers, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { label: 'Toplam Etkinlik', value: stats.totalEvents, color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { label: 'Aktif Yayın', value: stats.activeEvents, color: '#EF4444', bg: 'rgba(239,68,68,0.08)', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Nikahım platformuna genel bakış</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {cards.map((card, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: card.bg }}>
                  <svg className="w-6 h-6" fill="none" stroke={card.color} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-800">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
