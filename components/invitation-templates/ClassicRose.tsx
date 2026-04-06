import { InvitationData } from './types';

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ClassicRose({ data }: { data: InvitationData }) {
  return (
    <div id="invitation-render" style={{
      width: 1080, height: 1920,
      background: 'linear-gradient(180deg, #FFF5F5 0%, #FFF0F0 30%, #FFFFFF 50%, #FFF0F0 70%, #FFF5F5 100%)',
      fontFamily: "'Playfair Display', Georgia, serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Dekoratif köşe süsleri */}
      <div style={{ position: 'absolute', top: 40, left: 40, width: 120, height: 120, borderTop: '3px solid #C8686E', borderLeft: '3px solid #C8686E', opacity: 0.3 }} />
      <div style={{ position: 'absolute', top: 40, right: 40, width: 120, height: 120, borderTop: '3px solid #C8686E', borderRight: '3px solid #C8686E', opacity: 0.3 }} />
      <div style={{ position: 'absolute', bottom: 40, left: 40, width: 120, height: 120, borderBottom: '3px solid #C8686E', borderLeft: '3px solid #C8686E', opacity: 0.3 }} />
      <div style={{ position: 'absolute', bottom: 40, right: 40, width: 120, height: 120, borderBottom: '3px solid #C8686E', borderRight: '3px solid #C8686E', opacity: 0.3 }} />

      {/* Üst dekoratif çizgi */}
      <div style={{ width: 200, height: 2, background: 'linear-gradient(to right, transparent, #C8686E, transparent)', marginBottom: 40 }} />

      {/* Tür */}
      <p style={{ fontSize: 28, color: '#C8686E', letterSpacing: 8, textTransform: 'uppercase', marginBottom: 20, fontWeight: 400 }}>
        {data.eventType === 'dugun' ? 'Düğün Davetiyesi' : 'Nikah Davetiyesi'}
      </p>

      {/* Aileler */}
      <div style={{ display: 'flex', gap: 80, marginBottom: 50, textAlign: 'center' }}>
        <div>
          <p style={{ fontSize: 22, color: '#999', marginBottom: 8 }}>Gelin Ailesi</p>
          <p style={{ fontSize: 26, color: '#333', fontWeight: 600 }}>
            {data.brideFatherName || ''} & {data.brideMotherName || ''}
          </p>
        </div>
        <div>
          <p style={{ fontSize: 22, color: '#999', marginBottom: 8 }}>Damat Ailesi</p>
          <p style={{ fontSize: 26, color: '#333', fontWeight: 600 }}>
            {data.groomFatherName || ''} & {data.groomMotherName || ''}
          </p>
        </div>
      </div>

      {/* Çizgi */}
      <div style={{ width: 300, height: 1, background: 'linear-gradient(to right, transparent, #C8686E40, transparent)', marginBottom: 40 }} />

      {/* Kızlarının / Oğullarının */}
      <p style={{ fontSize: 24, color: '#999', marginBottom: 15 }}>kızları ve oğullarının</p>

      {/* İsimler */}
      <h1 style={{ fontSize: 72, color: '#C8686E', fontWeight: 700, marginBottom: 5, letterSpacing: 2 }}>
        {data.brideFirstName}
      </h1>
      <p style={{ fontSize: 36, color: '#C8686E', margin: '10px 0', fontStyle: 'italic' }}>&</p>
      <h1 style={{ fontSize: 72, color: '#C8686E', fontWeight: 700, marginBottom: 40, letterSpacing: 2 }}>
        {data.groomFirstName}
      </h1>

      {/* Çizgi */}
      <div style={{ width: 300, height: 1, background: 'linear-gradient(to right, transparent, #C8686E40, transparent)', marginBottom: 40 }} />

      {/* Nikah bilgileri */}
      <p style={{ fontSize: 24, color: '#999', marginBottom: 10 }}>
        {data.eventType === 'dugun' ? 'düğün törenlerine' : 'nikah törenlerine'}
      </p>
      <p style={{ fontSize: 22, color: '#999', marginBottom: 30 }}>davet ederler</p>

      {/* Tarih */}
      <p style={{ fontSize: 36, color: '#333', fontWeight: 600, marginBottom: 10 }}>
        {formatDate(data.eventDate)}
      </p>
      <p style={{ fontSize: 30, color: '#666', marginBottom: 30 }}>Saat {data.eventTime}</p>

      {/* Mekan */}
      {data.venueName && (
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <p style={{ fontSize: 28, color: '#333', fontWeight: 600 }}>{data.venueName}</p>
          {data.venueAddress && <p style={{ fontSize: 22, color: '#999', marginTop: 8 }}>{data.venueAddress}</p>}
          {data.venueCity && <p style={{ fontSize: 22, color: '#999', marginTop: 4 }}>{data.venueCity}</p>}
        </div>
      )}

      {/* Çizgi */}
      <div style={{ width: 200, height: 2, background: 'linear-gradient(to right, transparent, #C8686E, transparent)', marginTop: 20, marginBottom: 30 }} />

      {/* Canlı Yayın Linki */}
      <p style={{ fontSize: 20, color: '#999', marginBottom: 8 }}>Canlı Yayın</p>
      <p style={{ fontSize: 24, color: '#C8686E', fontWeight: 600 }}>nikahim.com/canli/{data.eventLink}</p>
    </div>
  );
}
