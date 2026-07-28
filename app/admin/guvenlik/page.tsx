"use client";

import MfaSetup from "@/components/MfaSetup";

export default function AdminSecurityPage() {
  return (
    <div className="min-h-screen bg-[#F6F7F9] p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Güvenlik</h1>
        <p className="text-slate-500 text-sm mt-1">Hesap güvenliği ve iki adımlı doğrulama</p>
      </div>
      <MfaSetup />
    </div>
  );
}
