"use client";

import LiveWall from "@/components/LiveWall";

export default function AdminIzleme() {
  return (
    <div className="min-h-screen bg-[#F6F7F9] p-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">İzleme Duvarı</h1>
        <p className="text-slate-500 text-sm mt-1">Tüm canlı yayınları tek ekranda izle — güvenlik merkezi</p>
      </div>
      {/* canStop: Katman 3 (mobil kill-switch) hazır olunca true yapılacak */}
      <LiveWall hrefFor={(id) => `/admin/events/${id}`} canStop={false} />
    </div>
  );
}
