import { InvitationData } from './types';

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ElegantNavy({ data }: { data: InvitationData }) {
  return (
    <div id="invitation-render" style={{
      width: 1080, height: 1920,
      background: 'linear-gradient(180deg, #1B2838 0%, #243447 30%, #1B2838 50%, #243447 70%, #1B2838 100%)',
      fontFamily: "'Playfair Display', Georgia, serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Dekoratif glow */}
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.06), transparent 70%)' }} />

      {/* Altın çerçeve */}
      <div style={{ position: 'absolute', top: 40, left: 40, right: 40, bottom: 40, border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8 }} />

      {/* Üst dekoratif */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 40 }}>
        <div style={{ width: 80, height: 1, background: 'linear-gradient(to right, transparent, #D4AF37)' }} />
        <div style={{ fontSize: 24, color: '#D4AF37' }}>✦</div>
        <div style={{ width: 80, height: 1, background: 'linear-gradient(to left, transparent, #D4AF37)' }} />
      </div>

      {/* Tür */}
      <p style={{ fontSize: 22, color: '#D4AF37', letterSpacing: 10, textTransform: 'uppercase', marginBottom: 40, fontWeight: 400 }}>
        {data.eventType === 'dugun' ? 'Düğün Davetiyesi' : 'Nikah Davetiyesi'}
      </p>

      {/* Aileler */}
      <div style={{ display: 'flex', gap: 60, marginBottom: 40, textAlign: 'center' }}>
        <div>
          <p style={{ fontSize: 16, color: '#D4AF3780', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Gelin Ailesi</p>
          <p style={{ fontSize: 22, color: '#E8E0D0' }}>{data.brideFatherName || ''}</p>
          <p style={{ fontSize: 22, color: '#E8E0D0' }}>{data.brideMotherName || ''}</p>
        </div>
        <div style={{ width: 1, background: 'rgba(212,175,55,0.2)' }} />
        <div>
          <p style={{ fontSize: 16, color: '#D4AF3780', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Damat Ailesi</p>
          <p style={{ fontSize: 22, color: '#E8E0D0' }}>{data.groomFatherName || ''}</p>
          <p style={{ fontSize: 22, color: '#E8E0D0' }}>{data.groomMotherName || ''}</p>
        </div>
      </div>

      <p style={{ fontSize: 20, color: '#8898A8', marginBottom: 20, fontStyle: 'italic' }}>kızları ve oğullarının</p>

      {/* İsimler */}
      <h1 style={{ fontSize: 78, color: '#FFFFFF', fontWeight: 700, marginBottom: 0, letterSpacing: 4 }}>
        {data.brideFirstName}
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, margin: '15px 0' }}>
        <div style={{ width: 60, height: 1, background: '#D4AF37' }} />
        <p style={{ fontSize: 30, color: '#D4AF37' }}>&</p>
        <div style={{ width: 60, height: 1, background: '#D4AF37' }} />
      </div>
      <h1 style={{ fontSize: 78, color: '#FFFFFF', fontWeight: 700, marginBottom: 30, letterSpacing: 4 }}>
        {data.groomFirstName}
      </h1>

      <p style={{ fontSize: 20, color: '#8898A8', marginBottom: 40, fontStyle: 'italic' }}>
        {data.eventType === 'dugun' ? 'düğün törenlerine davet ederler' : 'nikah törenlerine davet ederler'}
      </p>

      {/* Altın çizgi */}
      <div style={{ width: 200, height: 1, background: 'linear-gradient(to right, transparent, #D4AF37, transparent)', marginBottom: 40 }} />

      {/* Tarih */}
      <p style={{ fontSize: 36, color: '#FFFFFF', fontWeight: 600, marginBottom: 8 }}>
        {formatDate(data.eventDate)}
      </p>
      <p style={{ fontSize: 26, color: '#8898A8', marginBottom: 35 }}>Saat {data.eventTime}</p>

      {/* Mekan */}
      {data.venueName && (
        <div style={{ textAlign: 'center', marginBottom: 35, padding: '15px 30px', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 12 }}>
          <p style={{ fontSize: 26, color: '#FFFFFF', fontWeight: 600 }}>{data.venueName}</p>
          {data.venueAddress && <p style={{ fontSize: 18, color: '#8898A8', marginTop: 6 }}>{data.venueAddress}</p>}
          {data.venueCity && <p style={{ fontSize: 18, color: '#8898A8', marginTop: 4 }}>{data.venueCity}</p>}
        </div>
      )}

      {/* Link */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginTop: 10 }}>
        <div style={{ width: 40, height: 1, background: '#D4AF3740' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#D4AF3780', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>Canlı Yayın</p>
          <p style={{ fontSize: 20, color: '#D4AF37' }}>nikahim.com/canli/{data.eventLink}</p>
        </div>
        <div style={{ width: 40, height: 1, background: '#D4AF3740' }} />
      </div>

      {/* Alt dekoratif */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginTop: 40 }}>
        <div style={{ width: 80, height: 1, background: 'linear-gradient(to right, transparent, #D4AF37)' }} />
        <div style={{ fontSize: 24, color: '#D4AF37' }}>✦</div>
        <div style={{ width: 80, height: 1, background: 'linear-gradient(to left, transparent, #D4AF37)' }} />
      </div>
    </div>
  );
}
