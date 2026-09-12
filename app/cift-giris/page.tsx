import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Çift Girişi — Nikahım",
  description: "Nikahım çift paneline giriş. Albüm, canlı yayın kaydı, davetli listesi ve masa düzeni tek yerde.",
};

const FEATURES: { label: string; icon: React.ReactNode }[] = [
  {
    label: "Fotoğraf Albümü",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="15" rx="2.5" /><circle cx="8.5" cy="10.5" r="1.5" /><path d="M3 17l5-5 3.5 3.5L15 12l6 6" /></svg>
    ),
  },
  {
    label: "Canlı Yayın Kaydı",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
    ),
  },
  {
    label: "Davetli Listesi",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-3.13a4 4 0 100-8 4 4 0 000 8zm6 0a3 3 0 100-6 3 3 0 000 6zm-12 0a3 3 0 100-6 3 3 0 000 6z" /></svg>
    ),
  },
  {
    label: "Masa Düzeni",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="9" width="18" height="7" rx="2" /><path d="M7 16v2M17 16v2M12 6v3" /><circle cx="12" cy="5" r="1.4" /></svg>
    ),
  },
];

export default function CiftGirisPage() {
  return (
    <main
      className="min-h-screen w-full flex items-center justify-center px-5 py-12"
      style={{ background: "linear-gradient(165deg, #FBF8F5 0%, #F6F0EC 45%, #FDF5F3 100%)" }}
    >
      <div
        className="relative w-full max-w-[440px] rounded-[28px] px-7 sm:px-9 pt-9 pb-8 text-center overflow-hidden"
        style={{ background: "#FFFCF9", border: "1px solid rgba(210,190,185,0.35)", boxShadow: "0 30px 80px rgba(60,40,40,0.12), 0 6px 20px rgba(120,90,90,0.08)" }}
      >
        <div className="flex justify-center mb-5">
          <Image src="/logo-dikey.webp" alt="Nikahım" width={1217} height={639} className="h-[66px] w-auto object-contain" priority />
        </div>

        <div className="mx-auto mb-5 h-px w-[64px] rounded-full" style={{ background: "linear-gradient(90deg, transparent, rgba(201,111,120,0.55), transparent)" }} />

        <h1 className="text-[22px] font-bold" style={{ color: "#1F1F1F" }}>Çift Girişi</h1>
        <p className="mt-2.5 text-[14px] leading-relaxed" style={{ color: "#6E5A5A" }}>
          Bilgisayarınızdan QR kodu telefonunuza okutarak veya hesabınızla giriş yaparak
          büyük gününüzün tüm içeriğine tek yerden ulaşın.
        </p>

        <div className="grid grid-cols-2 gap-2.5 mt-6 text-left">
          {FEATURES.map((f) => (
            <div key={f.label} className="flex items-center gap-2.5 rounded-2xl px-3.5 py-3" style={{ background: "rgba(201,111,120,0.06)", border: "1px solid rgba(201,111,120,0.12)" }}>
              <span className="w-8 h-8 flex-shrink-0 grid place-items-center rounded-full" style={{ background: "#FFFFFF", color: "#C8686E", border: "1px solid rgba(201,111,120,0.16)" }}>
                <span className="block w-[17px] h-[17px]">{f.icon}</span>
              </span>
              <span className="text-[12.5px] font-semibold leading-tight" style={{ color: "#5D4F4C" }}>{f.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12.5px] font-semibold" style={{ background: "rgba(201,111,120,0.10)", color: "#B85258" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#C8686E" }} />
          Çok yakında
        </div>

        <p className="mt-5 text-[12.5px]" style={{ color: "#8A7878" }}>
          Şu an için tüm bu işlemleri Nikahım uygulamasından yönetebilirsiniz.
        </p>

        <Link href="/" className="mt-4 inline-flex items-center justify-center gap-1.5 text-[13.5px] font-semibold transition-opacity hover:opacity-70" style={{ color: "#C8686E" }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Ana sayfaya dön
        </Link>
      </div>
    </main>
  );
}
