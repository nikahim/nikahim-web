import { ImageResponse } from '@vercel/og';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabaseUrl = 'https://haeifluvvazdealsofle.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhZWlmbHV2dmF6ZGVhbHNvZmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNDM2OTcsImV4cCI6MjA4MTcxOTY5N30.p-Lren_jLUuA1BIP1TgRmv5gK4cJuIf-hkZIqo5I1pA';

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function ClassicRoseTemplate(data: any) {
  return (
    <div style={{
      width: 1080, height: 1920, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(180deg, #FFF5F5 0%, #FFF0F0 30%, #FFFFFF 50%, #FFF0F0 70%, #FFF5F5 100%)',
      fontFamily: 'serif', position: 'relative',
    }}>
      <div style={{ width: 200, height: 2, background: '#C8686E', marginBottom: 40, opacity: 0.5, display: 'flex' }} />
      <p style={{ fontSize: 28, color: '#C8686E', letterSpacing: 6, marginBottom: 20 }}>
        {data.eventType === 'dugun' ? 'DÜĞÜN DAVETİYESİ' : 'NİKAH DAVETİYESİ'}
      </p>
      <div style={{ display: 'flex', gap: 80, marginBottom: 50, textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: 22, color: '#999', marginBottom: 8 }}>Gelin Ailesi</p>
          <p style={{ fontSize: 24, color: '#333' }}>{data.brideFatherName || ''} & {data.brideMotherName || ''}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: 22, color: '#999', marginBottom: 8 }}>Damat Ailesi</p>
          <p style={{ fontSize: 24, color: '#333' }}>{data.groomFatherName || ''} & {data.groomMotherName || ''}</p>
        </div>
      </div>
      <div style={{ width: 300, height: 1, background: '#C8686E', marginBottom: 30, opacity: 0.2, display: 'flex' }} />
      <p style={{ fontSize: 24, color: '#999', marginBottom: 15 }}>kızları ve oğullarının</p>
      <p style={{ fontSize: 72, color: '#C8686E', fontWeight: 700, marginBottom: 5, letterSpacing: 2 }}>{data.brideFirstName}</p>
      <p style={{ fontSize: 36, color: '#C8686E', margin: '10px 0' }}>&</p>
      <p style={{ fontSize: 72, color: '#C8686E', fontWeight: 700, marginBottom: 30, letterSpacing: 2 }}>{data.groomFirstName}</p>
      <div style={{ width: 300, height: 1, background: '#C8686E', marginBottom: 30, opacity: 0.2, display: 'flex' }} />
      <p style={{ fontSize: 24, color: '#999', marginBottom: 30 }}>
        {data.eventType === 'dugun' ? 'düğün törenlerine davet ederler' : 'nikah törenlerine davet ederler'}
      </p>
      <p style={{ fontSize: 36, color: '#333', fontWeight: 600, marginBottom: 10 }}>{formatDate(data.eventDate)}</p>
      <p style={{ fontSize: 30, color: '#666', marginBottom: 30 }}>Saat {data.eventTime}</p>
      {data.venueName && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 30 }}>
          <p style={{ fontSize: 28, color: '#333', fontWeight: 600 }}>{data.venueName}</p>
          {data.venueAddress && <p style={{ fontSize: 22, color: '#999', marginTop: 8 }}>{data.venueAddress}</p>}
          {data.venueCity && <p style={{ fontSize: 22, color: '#999', marginTop: 4 }}>{data.venueCity}</p>}
        </div>
      )}
      <div style={{ width: 200, height: 2, background: '#C8686E', marginTop: 20, marginBottom: 30, opacity: 0.5, display: 'flex' }} />
      <p style={{ fontSize: 20, color: '#999', marginBottom: 8 }}>Canlı Yayın</p>
      <p style={{ fontSize: 24, color: '#C8686E', fontWeight: 600 }}>nikahim.com/canli/{data.eventLink}</p>
    </div>
  );
}

function ModernGoldTemplate(data: any) {
  return (
    <div style={{
      width: 1080, height: 1920, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(180deg, #FFFDF5 0%, #FFF8E7 20%, #FFFFFF 50%, #FFF8E7 80%, #FFFDF5 100%)',
      fontFamily: 'serif', position: 'relative',
    }}>
      <p style={{ fontSize: 60, color: '#D4AF37', marginBottom: 20, opacity: 0.6 }}>✦</p>
      <p style={{ fontSize: 26, color: '#D4AF37', letterSpacing: 8, marginBottom: 30 }}>
        {data.eventType === 'dugun' ? 'DÜĞÜN DAVETİYESİ' : 'NİKAH DAVETİYESİ'}
      </p>
      <p style={{ fontSize: 80, color: '#2D2418', fontWeight: 700, letterSpacing: 3 }}>{data.brideFirstName}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, margin: '15px 0' }}>
        <div style={{ width: 80, height: 1, background: '#D4AF37', display: 'flex' }} />
        <p style={{ fontSize: 32, color: '#D4AF37' }}>&</p>
        <div style={{ width: 80, height: 1, background: '#D4AF37', display: 'flex' }} />
      </div>
      <p style={{ fontSize: 80, color: '#2D2418', fontWeight: 700, marginBottom: 30, letterSpacing: 3 }}>{data.groomFirstName}</p>
      <p style={{ fontSize: 28, color: '#8B7355', marginBottom: 50, letterSpacing: 4 }}>{data.brideLastName} — {data.groomLastName}</p>
      <div style={{ display: 'flex', gap: 60, marginBottom: 50, textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: 18, color: '#D4AF37', letterSpacing: 3 }}>GELİN AİLESİ</p>
          <p style={{ fontSize: 24, color: '#4A3C28', marginTop: 10 }}>{data.brideFatherName || ''} & {data.brideMotherName || ''}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: 18, color: '#D4AF37', letterSpacing: 3 }}>DAMAT AİLESİ</p>
          <p style={{ fontSize: 24, color: '#4A3C28', marginTop: 10 }}>{data.groomFatherName || ''} & {data.groomMotherName || ''}</p>
        </div>
      </div>
      <div style={{ width: 250, height: 2, background: '#D4AF37', marginBottom: 40, opacity: 0.3, display: 'flex' }} />
      <p style={{ fontSize: 38, color: '#2D2418', fontWeight: 600, marginBottom: 10 }}>{formatDate(data.eventDate)}</p>
      <p style={{ fontSize: 28, color: '#8B7355', marginBottom: 35 }}>Saat {data.eventTime}</p>
      {data.venueName && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40, padding: '20px 40px' }}>
          <p style={{ fontSize: 28, color: '#2D2418', fontWeight: 600 }}>{data.venueName}</p>
          {data.venueAddress && <p style={{ fontSize: 20, color: '#8B7355', marginTop: 8 }}>{data.venueAddress}</p>}
        </div>
      )}
      <p style={{ fontSize: 18, color: '#8B7355', letterSpacing: 2 }}>CANLI YAYIN</p>
      <p style={{ fontSize: 22, color: '#D4AF37', fontWeight: 600, marginTop: 8 }}>nikahim.com/canli/{data.eventLink}</p>
      <p style={{ fontSize: 60, color: '#D4AF37', marginTop: 30, opacity: 0.6 }}>✦</p>
    </div>
  );
}

function MinimalWhiteTemplate(data: any) {
  return (
    <div style={{
      width: 1080, height: 1920, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: '#FFFFFF', fontFamily: 'sans-serif',
    }}>
      <p style={{ fontSize: 16, color: '#999', letterSpacing: 12, marginBottom: 60 }}>
        {data.eventType === 'dugun' ? 'DÜĞÜN DAVETİYESİ' : 'NİKAH DAVETİYESİ'}
      </p>
      <p style={{ fontSize: 90, color: '#1a1a1a', fontWeight: 300, letterSpacing: 8, fontFamily: 'serif' }}>{data.brideFirstName}</p>
      <p style={{ fontSize: 20, color: '#ccc', margin: '25px 0', letterSpacing: 10 }}>— ve —</p>
      <p style={{ fontSize: 90, color: '#1a1a1a', fontWeight: 300, marginBottom: 60, letterSpacing: 8, fontFamily: 'serif' }}>{data.groomFirstName}</p>
      <div style={{ width: 60, height: 1, background: '#ddd', marginBottom: 60, display: 'flex' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginBottom: 50 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: 16, color: '#999', letterSpacing: 4 }}>TARİH</p>
          <p style={{ fontSize: 24, color: '#333', fontWeight: 500, marginTop: 8 }}>{formatDate(data.eventDate)}</p>
        </div>
        <div style={{ width: 1, height: 40, background: '#E8E4E0', display: 'flex' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: 16, color: '#999', letterSpacing: 4 }}>SAAT</p>
          <p style={{ fontSize: 24, color: '#333', fontWeight: 500, marginTop: 8 }}>{data.eventTime}</p>
        </div>
      </div>
      {data.venueName && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 50 }}>
          <p style={{ fontSize: 16, color: '#999', letterSpacing: 4, marginBottom: 8 }}>MEKAN</p>
          <p style={{ fontSize: 24, color: '#333', fontWeight: 500 }}>{data.venueName}</p>
        </div>
      )}
      <div style={{ display: 'flex', gap: 80, marginBottom: 50 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: 14, color: '#bbb', letterSpacing: 3 }}>GELİN AİLESİ</p>
          <p style={{ fontSize: 20, color: '#555', marginTop: 10 }}>{data.brideFatherName || ''} & {data.brideMotherName || ''}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: 14, color: '#bbb', letterSpacing: 3 }}>DAMAT AİLESİ</p>
          <p style={{ fontSize: 20, color: '#555', marginTop: 10 }}>{data.groomFatherName || ''} & {data.groomMotherName || ''}</p>
        </div>
      </div>
      <div style={{ width: 60, height: 1, background: '#ddd', marginBottom: 40, display: 'flex' }} />
      <p style={{ fontSize: 14, color: '#bbb', letterSpacing: 4, marginBottom: 8 }}>CANLI YAYIN</p>
      <p style={{ fontSize: 20, color: '#333', fontWeight: 500 }}>nikahim.com/canli/{data.eventLink}</p>
    </div>
  );
}

function ElegantNavyTemplate(data: any) {
  return (
    <div style={{
      width: 1080, height: 1920, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(180deg, #1B2838 0%, #243447 30%, #1B2838 50%, #243447 70%, #1B2838 100%)',
      fontFamily: 'serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 40 }}>
        <div style={{ width: 80, height: 1, background: '#D4AF37', display: 'flex' }} />
        <p style={{ fontSize: 24, color: '#D4AF37' }}>✦</p>
        <div style={{ width: 80, height: 1, background: '#D4AF37', display: 'flex' }} />
      </div>
      <p style={{ fontSize: 22, color: '#D4AF37', letterSpacing: 10, marginBottom: 40 }}>
        {data.eventType === 'dugun' ? 'DÜĞÜN DAVETİYESİ' : 'NİKAH DAVETİYESİ'}
      </p>
      <div style={{ display: 'flex', gap: 60, marginBottom: 30 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: 16, color: '#D4AF37', letterSpacing: 3, opacity: 0.6 }}>GELİN AİLESİ</p>
          <p style={{ fontSize: 22, color: '#E8E0D0', marginTop: 10 }}>{data.brideFatherName || ''} & {data.brideMotherName || ''}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: 16, color: '#D4AF37', letterSpacing: 3, opacity: 0.6 }}>DAMAT AİLESİ</p>
          <p style={{ fontSize: 22, color: '#E8E0D0', marginTop: 10 }}>{data.groomFatherName || ''} & {data.groomMotherName || ''}</p>
        </div>
      </div>
      <p style={{ fontSize: 20, color: '#8898A8', marginBottom: 20 }}>kızları ve oğullarının</p>
      <p style={{ fontSize: 78, color: '#FFFFFF', fontWeight: 700, letterSpacing: 4 }}>{data.brideFirstName}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, margin: '15px 0' }}>
        <div style={{ width: 60, height: 1, background: '#D4AF37', display: 'flex' }} />
        <p style={{ fontSize: 30, color: '#D4AF37' }}>&</p>
        <div style={{ width: 60, height: 1, background: '#D4AF37', display: 'flex' }} />
      </div>
      <p style={{ fontSize: 78, color: '#FFFFFF', fontWeight: 700, marginBottom: 20, letterSpacing: 4 }}>{data.groomFirstName}</p>
      <p style={{ fontSize: 20, color: '#8898A8', marginBottom: 40 }}>
        {data.eventType === 'dugun' ? 'düğün törenlerine davet ederler' : 'nikah törenlerine davet ederler'}
      </p>
      <div style={{ width: 200, height: 1, background: '#D4AF37', marginBottom: 40, opacity: 0.3, display: 'flex' }} />
      <p style={{ fontSize: 36, color: '#FFFFFF', fontWeight: 600, marginBottom: 8 }}>{formatDate(data.eventDate)}</p>
      <p style={{ fontSize: 26, color: '#8898A8', marginBottom: 35 }}>Saat {data.eventTime}</p>
      {data.venueName && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 35 }}>
          <p style={{ fontSize: 26, color: '#FFFFFF', fontWeight: 600 }}>{data.venueName}</p>
          {data.venueAddress && <p style={{ fontSize: 18, color: '#8898A8', marginTop: 6 }}>{data.venueAddress}</p>}
        </div>
      )}
      <p style={{ fontSize: 14, color: '#D4AF37', letterSpacing: 3, opacity: 0.6, marginTop: 10 }}>CANLI YAYIN</p>
      <p style={{ fontSize: 20, color: '#D4AF37', marginTop: 6 }}>nikahim.com/canli/{data.eventLink}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginTop: 40 }}>
        <div style={{ width: 80, height: 1, background: '#D4AF37', display: 'flex' }} />
        <p style={{ fontSize: 24, color: '#D4AF37' }}>✦</p>
        <div style={{ width: 80, height: 1, background: '#D4AF37', display: 'flex' }} />
      </div>
    </div>
  );
}

const TEMPLATE_RENDERERS: Record<string, (data: any) => JSX.Element> = {
  classic_rose: ClassicRoseTemplate,
  modern_gold: ModernGoldTemplate,
  minimal_white: MinimalWhiteTemplate,
  elegant_navy: ElegantNavyTemplate,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template, data, eventId } = body;

    if (!template || !data) {
      return NextResponse.json({ error: 'Template ve data gerekli' }, { status: 400 });
    }

    const renderer = TEMPLATE_RENDERERS[template] || TEMPLATE_RENDERERS['classic_rose'];

    const imageResponse = new ImageResponse(renderer(data), {
      width: 1080,
      height: 1920,
    });

    const arrayBuffer = await imageResponse.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // EventId varsa Supabase'e kaydet
    if (eventId) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const fileName = `invitation_${eventId}_${template}.png`;
      await supabase.storage.from('invitation-finals').upload(fileName, uint8Array, {
        contentType: 'image/png',
        upsert: true,
      });

      const { data: urlData } = supabase.storage.from('invitation-finals').getPublicUrl(fileName);

      await supabase.from('events').update({
        invitation_final_url: urlData.publicUrl
      }).eq('id', eventId);

      return NextResponse.json({ success: true, url: urlData.publicUrl });
    }

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="davetiye.png"',
      },
    });

  } catch (error) {
    console.error('Invitation render error:', error);
    return NextResponse.json({ error: 'Render hatası: ' + String(error) }, { status: 500 });
  }
}
