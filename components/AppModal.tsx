'use client';

import React from 'react';

/**
 * Nikahım Modal Design System — tek ortak bileşen.
 * Tüm bilgi/uyarı/onay/başarı/silme modalları bunu kullanır.
 * Beyaz #FFFDFC yüzey + krem overlay + rose #C96F78 CTA + 2D line ikon.
 * Yapı: X → ikon → başlık → kısa açıklama → dolu CTA → arka plansız "Kapat".
 */

export type AppModalVariant = 'success' | 'info' | 'warning' | 'error' | 'destructive';

type AppModalProps = {
  open: boolean;
  variant?: AppModalVariant;
  title: string;
  description?: React.ReactNode;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
  onClose: () => void;
  /** İki buton yan yana (onay/silme akışı). */
  twoButtons?: boolean;
  /** Primary buton yükleniyor durumu (async işlem). */
  loading?: boolean;
  /** İkonu tamamen özelleştirmek istersen (2D line svg ver). */
  icon?: React.ReactNode;
  /** Overlay'e tıklayınca kapanmasın (kritik onaylarda). */
  disableBackdropClose?: boolean;
};

const ROSE = '#C96F78';
const RED = '#D94D55';
const AMBER = '#D79A38';

const VARIANTS: Record<AppModalVariant, { color: string; bg: string; icon: React.ReactNode }> = {
  success: {
    color: ROSE,
    bg: 'rgba(201,111,120,0.10)',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />,
  },
  info: {
    color: ROSE,
    bg: 'rgba(201,111,120,0.10)',
    icon: <><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 11v5" /><circle cx="12" cy="7.6" r="0.6" fill="currentColor" stroke="none" /></>,
  },
  warning: {
    color: AMBER,
    bg: 'rgba(215,154,56,0.12)',
    icon: <><path strokeLinecap="round" strokeLinejoin="round" d="M10.3 3.9L2.4 17.5A2 2 0 004.1 20.5h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 9.5v4" /><circle cx="12" cy="16.6" r="0.6" fill="currentColor" stroke="none" /></>,
  },
  error: {
    color: RED,
    bg: 'rgba(217,77,85,0.10)',
    icon: <><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-6 6M9 9l6 6" /></>,
  },
  destructive: {
    color: RED,
    bg: 'rgba(217,77,85,0.10)',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9.5 7V5.5A1.5 1.5 0 0111 4h2a1.5 1.5 0 011.5 1.5V7M6 7l1 12.5A1.5 1.5 0 008.5 21h7a1.5 1.5 0 001.5-1.4L18 7M10 11v6M14 11v6" />,
  },
};

export default function AppModal({
  open,
  variant = 'info',
  title,
  description,
  primaryLabel,
  secondaryLabel = 'Kapat',
  onPrimary,
  onSecondary,
  onClose,
  twoButtons = false,
  loading = false,
  icon,
  disableBackdropClose = false,
}: AppModalProps) {
  if (!open) return null;
  const v = VARIANTS[variant];
  const isDestructive = variant === 'destructive' || variant === 'error';

  const primaryBg = isDestructive ? RED : ROSE;
  const primaryShadow = isDestructive
    ? '0 5px 14px rgba(217,77,85,0.24)'
    : '0 5px 14px rgba(201,111,120,0.22)';

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-5 animate-fade-in"
      style={{ background: 'rgba(28,22,23,0.42)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      onClick={disableBackdropClose ? undefined : onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full animate-scale-in flex flex-col items-center text-center"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 380,
          background: '#FFFDFC',
          borderRadius: 28,
          padding: '30px 24px 20px',
          border: '1px solid rgba(222,200,202,0.55)',
          boxShadow: '0 24px 60px rgba(57,37,39,0.18), 0 6px 18px rgba(57,37,39,0.08)',
        }}
      >
        {/* Kapat X */}
        <button
          onClick={onClose}
          aria-label="Kapat"
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[rgba(60,45,41,0.06)]"
          style={{ color: '#726A6C' }}
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* İkon */}
        <span
          className="grid place-items-center rounded-full"
          style={{ width: 64, height: 64, background: v.bg, color: v.color, marginBottom: 20 }}
        >
          {icon ? (
            icon
          ) : (
            <svg className="w-[29px] h-[29px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              {v.icon}
            </svg>
          )}
        </span>

        {/* Başlık */}
        <h2 style={{ fontSize: 21, lineHeight: '27px', fontWeight: 700, color: '#211B1D', letterSpacing: '-0.2px', maxWidth: 320 }}>
          {title}
        </h2>

        {/* Açıklama */}
        {description && (
          <p style={{ marginTop: 10, fontSize: 15, lineHeight: '22px', fontWeight: 400, color: '#756B6D', maxWidth: 300 }}>
            {description}
          </p>
        )}

        {/* Aksiyonlar */}
        {twoButtons ? (
          <div className="grid w-full" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 24 }}>
            <button
              onClick={onSecondary ?? onClose}
              className="active:scale-[0.98] transition-transform"
              style={{ height: 52, borderRadius: 16, background: '#FFFFFF', border: '1px solid #E8D9DC', color: '#534B4D', fontSize: 15, fontWeight: 600 }}
            >
              {secondaryLabel}
            </button>
            <button
              onClick={onPrimary}
              disabled={loading}
              className="flex items-center justify-center text-white active:scale-[0.985] transition-transform disabled:opacity-70"
              style={{ height: 52, borderRadius: 16, background: primaryBg, fontSize: 15, fontWeight: 700, boxShadow: primaryShadow }}
            >
              {loading ? <Spinner /> : primaryLabel}
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={onPrimary}
              disabled={loading}
              className="flex items-center justify-center w-full text-white active:scale-[0.985] transition-transform disabled:opacity-70"
              style={{ height: 52, borderRadius: 16, background: primaryBg, fontSize: 16, fontWeight: 700, marginTop: 24, boxShadow: primaryShadow }}
            >
              {loading ? <Spinner /> : primaryLabel}
            </button>
            <button
              onClick={onSecondary ?? onClose}
              className="transition-colors"
              style={{ height: 42, marginTop: 5, fontSize: 15, fontWeight: 600, color: '#62595B' }}
            >
              {secondaryLabel}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />
      <path d="M21 12a9 9 0 00-9-9" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
