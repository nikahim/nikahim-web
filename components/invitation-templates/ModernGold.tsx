import { InvitationData } from './types';

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ModernGold({ data }: { data: InvitationData }) {
  return (
    <div id="invitation-render" style={{
      width: 1080, height: 1920,
      background: 'linear-gradient(180deg, #FFFDF5 0%, #FFF8E7 20%, #FFFFFF 50%, #FFF8E7 80%, #FFFDF5 100%)',
      fontFamily: "'Playfair Display', Georgia, serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Altın çerçeve */}
      <div style={{ position: 'absolute', top: 30, left: 30, right: 30, bottom: 30, border: '2px solid #D4AF3740', borderRadius: 20 }} />
      <div style={{ position: 'absolute', top: 50, left: 50, right: 50, bottom: 50, border: '1px solid #D4AF3720', borderRadius: 16 }} />

      {/* Üst dekoratif */}
      <div style={{ fontSize: 60, color: '#D4AF37', marginBottom: 20, opacity: 0.6 }}>✦</div>

      {/* Tür */}
      <p style={{ fontSize: 26, color: '#D4AF37', letterSpacing: 10, textTransform: 'uppercase', marginBottom: 30, fontWeight: 400 }}>
        {data.eventType === 'dugun' ? 'Düğün Davetiyesi' : 'Nikah Davetiyesi'}
      </p>

      {/* İsimler */}
      <h1 style={{ fontSize: 80, color: '#2D2418', fontWeight: 700, marginBottom: 0, letterSpacing: 3 }}>
        {data.brideFirstName}
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, margin: '15px 0' }}>
        <div style={{ width: 80, height: 1, background: '#D4AF37' }} />
        <p style={{ fontSize: 32, color: '#D4AF37', fontStyle: 'italic' }}>&</p>
        <div style={{ width: 80, height: 1, background: '#D4AF37' }} />
      </div>
      <h1 style={{ fontSize: 80, color: '#2D2418', fontWeight: 700, marginBottom: 40, letterSpacing: 3 }}>
        {data.groomFirstName}
      </h1>

      {/* Soyad */}
      <p style={{ fontSize: 28, color: '#8B7355', marginBottom: 50, letterSpacing: 4 }}>
        {data.brideLastName} — {data.groomLastName}
      </p>

      {/* Aileler */}
      <div style={{ display: 'flex', gap: 60, marginBottom: 50, textAlign: 'center' }}>
        <div>
          <p style={{ fontSize: 18, color: '#D4AF37', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Gelin Ailesi</p>
          <p style={{ fontSize: 24, color: '#4A3C28' }}>{data.brideFatherName || ''}</p>
          <p style={{ fontSize: 24, color: '#4A3C28' }}>{data.brideMotherName || ''}</p>
        </div>
        <div style={{ width: 1, background: '#D4AF3730' }} />
        <div>
          <p style={{ fontSize: 18, color: '#D4AF37', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Damat Ailesi</p>
          <p style={{ fontSize: 24, color: '#4A3C28' }}>{data.groomFatherName || ''}</p>
          <p style={{ fontSize: 24, color: '#4A3C28' }}>{data.groomMotherName || ''}</p>
        </div>
      </div>

      {/* Altın çizgi */}
      <div style={{ width: 250, height: 2, background: 'linear-gradient(to right, transparent, #D4AF37, transparent)', marginBottom: 40 }} />

      {/* Tarih */}
      <p style={{ fontSize: 38, color: '#2D2418', fontWeight: 600, marginBottom: 10 }}>
        {formatDate(data.eventDate)}
      </p>
      <p style={{ fontSize: 28, color: '#8B7355', marginBottom: 35 }}>Saat {data.eventTime}</p>

      {/* Mekan */}
      {data.venueName && (
        <div style={{ textAlign: 'center', marginBottom: 40, padding: '20px 40px', background: '#D4AF3708', borderRadius: 16, border: '1px solid #D4AF3715' }}>
          <p style={{ fontSize: 28, color: '#2D2418', fontWeight: 600 }}>{data.venueName}</p>
          {data.venueAddress && <p style={{ fontSize: 20, color: '#8B7355', marginTop: 8 }}>{data.venueAddress}</p>}
          {data.venueCity && <p style={{ fontSize: 20, color: '#8B7355', marginTop: 4 }}>{data.venueCity}</p>}
        </div>
      )}

      {/* Link */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 18, color: '#8B7355', marginBottom: 8, letterSpacing: 2 }}>CANLI YAYIN</p>
        <p style={{ fontSize: 22, color: '#D4AF37', fontWeight: 600 }}>nikahim.com/canli/{data.eventLink}</p>
      </div>

      {/* Alt dekoratif */}
      <div style={{ fontSize: 60, color: '#D4AF37', marginTop: 30, opacity: 0.6 }}>✦</div>
    </div>
  );
}
