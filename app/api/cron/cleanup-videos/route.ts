import { NextResponse } from 'next/server';

// DEVRE DIŞI — silme/temizlik işi artık Supabase edge function "event-lifecycle" tarafından
// yapılıyor (30 gün, protected kontrolü, canlı yayın kaydı + fotoğraf + mesaj + tüm DB).
// Bu route yanlışlıkla tetiklenmesin diye kapatıldı.
export async function GET() {
  return NextResponse.json({ disabled: true, message: 'Handled by Supabase event-lifecycle function.' });
}
