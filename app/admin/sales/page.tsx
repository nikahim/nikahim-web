"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminSalesPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthRevenue: 0,
    weekRevenue: 0,
    totalSales: 0,
    monthSales: 0,
    averageOrder: 0,
  });
  const [packageStats, setPackageStats] = useState<{ name: string; count: number; revenue: number }[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    setLoading(true);

    // Tüm transactionları çek
    const { data: txs } = await supabase
      .from('transactions')
      .select('*, packages(name_tr)')
      .order('created_at', { ascending: false });

    if (txs) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const completed = txs.filter((t: any) => t.status === 'completed' || t.status === 'paid');
      const totalRev = completed.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
      const monthRev = completed.filter((t: any) => new Date(t.created_at) >= monthStart).reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
      const weekRev = completed.filter((t: any) => new Date(t.created_at) >= weekStart).reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      setStats({
        totalRevenue: totalRev,
        monthRevenue: monthRev,
        weekRevenue: weekRev,
        totalSales: completed.length,
        monthSales: completed.filter((t: any) => new Date(t.created_at) >= monthStart).length,
        averageOrder: completed.length > 0 ? totalRev / completed.length : 0,
      });

      // Paket bazlı dağılım
      const pkgMap: Record<string, { count: number; revenue: number }> = {};
      completed.forEach((t: any) => {
        const name = t.packages?.name_tr || 'Diğer';
        if (!pkgMap[name]) pkgMap[name] = { count: 0, revenue: 0 };
        pkgMap[name].count++;
        pkgMap[name].revenue += t.amount || 0;
      });
      setPackageStats(Object.entries(pkgMap).map(([name, data]) => ({ name, ...data })));

      setRecentTransactions(txs.slice(0, 10));
    }

    setLoading(false);
  };

  const formatTL = (n: number) => `${n.toLocaleString('tr-TR')} ₺`;
  const formatDate = (str: string) => new Date(str).toLocaleString('tr-TR');

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Satış / Gelir</h1>
        <p className="text-gray-500 text-sm mt-1">Tüm satış ve gelir istatistikleri</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Gelir Kartları */}
          <div className="grid md:grid-cols-3 gap-5 mb-8">
            <div className="bg-white rounded-2xl p-6 border border-gray-100" style={{ background: 'linear-gradient(135deg, #FDFCF8, #F8F3EB)' }}>
              <p className="text-sm text-gray-500 mb-2">Toplam Gelir</p>
              <p className="text-3xl font-bold" style={{ color: '#B8965A' }}>{formatTL(stats.totalRevenue)}</p>
              <p className="text-xs text-gray-400 mt-2">{stats.totalSales} satış</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <p className="text-sm text-gray-500 mb-2">Bu Ay</p>
              <p className="text-3xl font-bold text-green-600">{formatTL(stats.monthRevenue)}</p>
              <p className="text-xs text-gray-400 mt-2">{stats.monthSales} satış</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <p className="text-sm text-gray-500 mb-2">Bu Hafta</p>
              <p className="text-3xl font-bold text-blue-600">{formatTL(stats.weekRevenue)}</p>
              <p className="text-xs text-gray-400 mt-2">Ortalama: {formatTL(stats.averageOrder)}</p>
            </div>
          </div>

          {/* Paket Dağılımı */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Paket Bazlı Satış</h2>
            {packageStats.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Henüz satış yok</p>
            ) : (
              <div className="space-y-3">
                {packageStats.map(pkg => (
                  <div key={pkg.name} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-semibold text-gray-700">{pkg.name}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${(pkg.count / Math.max(...packageStats.map(p => p.count))) * 100}%`,
                        background: 'linear-gradient(90deg, #D17075, #C8686E)',
                      }} />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">{pkg.count} satış</p>
                      <p className="text-xs text-gray-500">{formatTL(pkg.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Son İşlemler */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Son İşlemler</h2>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Tarih</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Paket</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Tutar</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Durum</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx: any) => (
                  <tr key={tx.id} className="border-b border-gray-50">
                    <td className="py-3 px-5 text-xs text-gray-500">{formatDate(tx.created_at)}</td>
                    <td className="py-3 px-5 text-sm text-gray-700">{tx.packages?.name_tr || '—'}</td>
                    <td className="py-3 px-5 text-sm font-bold text-gray-800">{formatTL(tx.amount || 0)}</td>
                    <td className="py-3 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${tx.status === 'completed' || tx.status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentTransactions.length === 0 && <div className="text-center py-12 text-gray-400">İşlem yok</div>}
          </div>
        </>
      )}
    </div>
  );
}
