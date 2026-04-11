"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unanswered' | 'answered'>('all');

  useEffect(() => { fetchMessages(); }, [filter]);

  const fetchMessages = async () => {
    setLoading(true);
    let query = supabase.from('shop_messages').select('*, shops(name)').order('created_at', { ascending: false });
    if (filter === 'unanswered') query = query.is('reply', null);
    else if (filter === 'answered') query = query.not('reply', 'is', null);
    const { data } = await query;
    if (data) setMessages(data);
    setLoading(false);
  };

  const formatDate = (str: string) => new Date(str).toLocaleString('tr-TR');

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Mesajlar</h1>
        <p className="text-gray-500 text-sm mt-1">Tüm mağaza mesajları</p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        {[
          { key: 'all', label: 'Tümü' },
          { key: 'unanswered', label: 'Yanıtsız' },
          { key: 'answered', label: 'Yanıtlanmış' },
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
        <div className="space-y-3">
          {messages.map(m => (
            <div key={m.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-800">{m.sender_name}</p>
                  <p className="text-xs text-gray-500">→ {m.shops?.name}</p>
                </div>
                <span className="text-xs text-gray-400">{formatDate(m.created_at)}</span>
              </div>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 mb-2">{m.message}</p>
              {m.reply ? (
                <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-green-600 mb-1">Yanıt:</p>
                  <p className="text-sm text-gray-700">{m.reply}</p>
                </div>
              ) : (
                <p className="text-xs text-amber-600 font-semibold">⏳ Henüz yanıtlanmadı</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
