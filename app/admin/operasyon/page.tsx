"use client";

import OpsLists from "@/components/OpsLists";

export default function AdminOps() {
  return (
    <div className="min-h-screen bg-[#F6F7F9] p-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">Canlı Operasyon</h1>
        <p className="text-slate-500 text-sm mt-1">Aktif, yaklaşan ve tamamlanmış yayınlar — otomatik yenilenir</p>
      </div>
      <OpsLists hrefFor={(id) => `/admin/events/${id}`} />
    </div>
  );
}
