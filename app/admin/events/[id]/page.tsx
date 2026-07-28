"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import EventActions from "@/components/EventActions";

export default function AdminEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [gifts, setGifts] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [photoLikeCounts, setPhotoLikeCounts] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<'info' | 'messages' | 'gifts' | 'photos' | 'video'>('info');

  useEffect(() => { fetchAll(); }, [eventId]);

  const fetchAll = async () => {
    setLoading(true);
    const { data: ev } = await supabase.from('events').select('*').eq('id', eventId).single();
    setEvent(ev);

    const { data: msgs } = await supabase.from('chat_messages').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
    setMessages(msgs || []);

    const { data: gfs } = await supabase.from('gift_payments').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
    setGifts(gfs || []);

    const { data: phs } = await supabase.from('photo_requests').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
    setPhotos(phs || []);

    // Like sayılarını çek (photo_url -> count)
    const { data: likes } = await supabase.from('photo_likes').select('photo_url').eq('event_id', eventId);
    if (likes) {
      const counts: Record<string, number> = {};
      likes.forEach((row: { photo_url: string }) => {
        counts[row.photo_url] = (counts[row.photo_url] || 0) + 1;
      });
      setPhotoLikeCounts(counts);
    }

    setLoading(false);
  };

  const deleteMessage = async (id: string) => {
    if (!confirm('Bu mesajı silmek istediğinize emin misiniz?')) return;
    await supabase.from('chat_messages').delete().eq('id', id);
    fetchAll();
  };

  const deleteGift = async (id: string) => {
    if (!confirm('Bu altın kaydını silmek istediğinize emin misiniz?')) return;
    await supabase.from('gift_payments').delete().eq('id', id);
    fetchAll();
  };

  const deletePhotoRequest = async (id: string) => {
    if (!confirm('Bu fotoğrafı silmek istediğinize emin misiniz?')) return;
    await supabase.from('photo_requests').delete().eq('id', id);
    fetchAll();
  };

  const deleteEvent = async () => {
    if (!confirm(`"${event.bride_first_name} & ${event.groom_first_name}" etkinliğini TAMAMEN silmek istediğinize emin misiniz?`)) return;
    await supabase.from('events').delete().eq('id', eventId);
    router.push('/admin/events');
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!event) return <div className="p-8">Etkinlik bulunamadı</div>;

  const formatDate = (s: string) => new Date(s).toLocaleString('tr-TR');

  return (
    <div className="p-8">
      <Link href="/admin/events" className="text-sm text-rose-500 hover:underline mb-4 inline-block">← Etkinliklere Dön</Link>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{event.bride_first_name} & {event.groom_first_name}</h1>
            <p className="text-sm text-gray-500 mt-1">{event.event_type === 'dugun' ? 'Düğün' : 'Nikah'} · {event.event_date} · {event.event_time}</p>
            <p className="text-sm text-gray-500">{event.venue || '—'} · {event.city || '—'}</p>
            {event.event_link && (
              <a href={`https://nikahim.com/canli/${event.event_link}`} target="_blank" rel="noopener" className="text-sm text-rose-500 hover:underline mt-2 inline-block">
                /canli/{event.event_link} ↗
              </a>
            )}
          </div>
          <button onClick={deleteEvent} className="px-4 py-2 rounded-full text-sm font-semibold border-2 border-red-500 text-red-500 hover:bg-red-50">
            Etkinliği Sil
          </button>
        </div>
      </div>

      {/* Hızlı İşlemler — ücretsiz ek süre / paket yükseltme */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="font-bold text-gray-800 mb-3">Hızlı İşlemler</h2>
        <EventActions eventId={event.id} onChange={fetchAll} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {[
          { key: 'info', label: 'Bilgiler' },
          { key: 'messages', label: `Mesajlar (${messages.length})` },
          { key: 'gifts', label: `Altınlar (${gifts.length})` },
          { key: 'photos', label: `Fotoğraflar (${photos.length})` },
          { key: 'video', label: 'Video Kaydı' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-5 py-3 text-sm font-semibold transition-all border-b-2 ${tab === t.key ? 'border-rose-500 text-rose-500' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="grid grid-cols-2 gap-6">
            <div><h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Gelin Ailesi</h4><p>{event.bride_father_name} & {event.bride_mother_name}</p></div>
            <div><h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Damat Ailesi</h4><p>{event.groom_father_name} & {event.groom_mother_name}</p></div>
            <div><h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Mekan</h4><p>{event.venue || '—'}</p></div>
            <div><h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Adres</h4><p>{event.venue_address || '—'}</p></div>
            <div><h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Durum</h4><p>{event.status}</p></div>
            <div><h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Müzik</h4><p>{event.background_music || '—'}</p></div>
          </div>
        </div>
      )}

      {tab === 'messages' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {messages.length === 0 ? <p className="p-8 text-center text-gray-400">Mesaj yok</p> : messages.map(m => (
            <div key={m.id} className="flex items-start justify-between p-4 border-b border-gray-50">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-gray-800">{m.sender_name}</span>
                  <span className="text-xs text-gray-400">{formatDate(m.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600">{m.message}</p>
              </div>
              <button onClick={() => deleteMessage(m.id)} className="text-red-500 text-xs font-semibold hover:bg-red-50 px-3 py-1 rounded-full ml-4">Sil</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'gifts' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {gifts.length === 0 ? <p className="p-8 text-center text-gray-400">Altın kaydı yok</p> : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Gönderen</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Tip</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Tutar</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Durum</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Tarih</th>
                  <th className="text-right py-3 px-5 text-xs font-semibold text-gray-500 uppercase">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {gifts.map(g => (
                  <tr key={g.id} className="border-b border-gray-50">
                    <td className="py-3 px-5 text-sm">{g.sender_name}{g.anonymous && <span className="ml-1 text-xs text-gray-400">(anonim)</span>}</td>
                    <td className="py-3 px-5 text-sm">{g.gift_type}</td>
                    <td className="py-3 px-5 text-sm font-bold">{g.amount_tl} ₺</td>
                    <td className="py-3 px-5"><span className={`px-2 py-1 rounded-full text-xs ${g.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>{g.status}</span></td>
                    <td className="py-3 px-5 text-xs text-gray-500">{formatDate(g.created_at)}</td>
                    <td className="py-3 px-5 text-right"><button onClick={() => deleteGift(g.id)} className="text-red-500 text-xs font-semibold hover:bg-red-50 px-3 py-1 rounded-full">Sil</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'photos' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.length === 0 ? <p className="col-span-full p-8 text-center text-gray-400">Fotoğraf yok</p> : photos.map(p => {
            const totalLikes = (p.photo_urls || []).reduce((sum: number, url: string) => sum + (photoLikeCounts[url] || 0), 0);
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-3">
                {p.photo_urls && p.photo_urls.length > 0 && (
                  <div className="grid grid-cols-2 gap-1 mb-2">
                    {p.photo_urls.slice(0, 4).map((url: string, i: number) => {
                      const count = photoLikeCounts[url] || 0;
                      return (
                        <div key={i} className="relative">
                          <img src={url} alt="" className="w-full h-20 object-cover rounded-lg" />
                          {count > 0 && (
                            <div className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.6)' }}>
                              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="#E26B72" stroke="#E26B72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                              </svg>
                              <span className="text-white text-[9px] font-semibold tabular-nums">{count}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-gray-700 truncate flex-1">{p.sender_name}</p>
                  {totalLikes > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold flex-shrink-0" style={{ color: '#E26B72' }}>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#E26B72" stroke="#E26B72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                      </svg>
                      {totalLikes}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">{p.status} · {formatDate(p.created_at)}</p>
                <button onClick={() => deletePhotoRequest(p.id)} className="mt-2 w-full text-xs text-red-500 font-semibold py-1 rounded-full border border-red-200 hover:bg-red-50">Sil</button>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'video' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          {event.recording_url || event.recording_video_id ? (
            <div>
              <h3 className="text-lg font-bold mb-4">Yayın Kaydı</h3>
              {event.recording_url && <a href={event.recording_url} target="_blank" rel="noopener" className="text-rose-500 underline">Videoyu Aç ↗</a>}
              {event.recording_video_id && <p className="text-xs text-gray-500 mt-2">Video ID: {event.recording_video_id}</p>}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8">Henüz video kaydı yok</p>
          )}
        </div>
      )}
    </div>
  );
}
