"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalShops: 0,
    pendingShops: 0,
    approvedShops: 0,
    totalUsers: 0,
    businessUsers: 0,
    totalEvents: 0,
    activeEvents: 0,
    totalMessages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    const [shops, pending, approved, users, business, events, activeEv, msgs] = await Promise.all([
      supabase.from('shops').select('id', { count: 'exact', head: true }),
      supabase.from('shops').select('id', { count: 'exact', head: true }).eq('is_approved', false),
      supabase.from('shops').select('id', { count: 'exact', head: true }).eq('is_approved', true),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('user_type', 'business'),
      supabase.from('events').select('id', { count: 'exact', head: true }),
      supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'live'),
      supabase.from('shop_messages').select('id', { count: 'exact', head: true }),
    ]);
    setStats({
      totalShops: shops.count ?? 0,
      pendingShops: pending.count ?? 0,
      approvedShops: approved.count ?? 0,
      totalUsers: users.count ?? 0,
      businessUsers: business.count ?? 0,
      totalEvents: events.count ?? 0,
      activeEvents: activeEv.count ?? 0,
      totalMessages: msgs.count ?? 0,
    });
    setLoading(false);
  };

  const cards = [
    { label: 'Toplam Mağaza', value: stats.totalShops, color: '#C8686E', bg: 'rgba(200,104,110,0.08)', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1' },
    { label: 'Onay Bekleyen', value: stats.pendingShops, color: '#D97706', bg: 'rgba(217,119,6,0.08)', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', highlight: true },
    { label: 'Onaylı Mağaza', value: stats.approvedShops, color: '#22C55E', bg: 'rgba(34,197,94,0.08)', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Toplam Kullanıcı', value: stats.totalUsers, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { label: 'Kurumsal Hesap', value: stats.businessUsers, color: '#B8965A', bg: 'rgba(184,150,90,0.08)', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { label: 'Toplam Etkinlik', value: stats.totalEvents, color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { label: 'Aktif Yayın', value: stats.activeEvents, color: '#EF4444', bg: 'rgba(239,68,68,0.08)', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
    { label: 'Mesajlar', value: stats.totalMessages, color: '#06B6D4', bg: 'rgba(6,182,212,0.08)', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
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
        <>
          {/* Pending highlight */}
          {stats.pendingShops > 0 && (
            <Link href="/admin/shops?filter=pending" className="block mb-6 p-5 rounded-2xl border-2 transition-all hover:scale-[1.01]" style={{ borderColor: 'rgba(217,119,6,0.25)', background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)' }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(217,119,6,0.15)' }}>
                  <svg className="w-7 h-7" fill="none" stroke="#D97706" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold" style={{ color: '#92600A' }}>{stats.pendingShops} mağaza onayınızı bekliyor</h3>
                  <p className="text-sm" style={{ color: '#B8860B' }}>İncelemek için tıklayın →</p>
                </div>
              </div>
            </Link>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
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
        </>
      )}
    </div>
  );
}
