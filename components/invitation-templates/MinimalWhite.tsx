import { InvitationData } from './types';

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function MinimalWhite({ data }: { data: InvitationData }) {
  return (
    <div id="invitation-render" style={{
      width: 1080, height: 1920,
      background: '#FFFFFF',
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* İnce çerçeve */}
      <div style={{ position: 'absolute', top: 60, left: 60, right: 60, bottom: 60, border: '1px solid #E8E4E0' }} />

      {/* Tür - minimal */}
      <p style={{ fontSize: 16, color: '#999', letterSpacing: 12, textTransform: 'uppercase', marginBottom: 60, fontWeight: 500 }}>
        {data.eventType === 'dugun' ? 'Düğün Davetiyesi' : 'Nikah Davetiyesi'}
      </p>

      {/* İsimler - büyük ve minimal */}
      <h1 style={{ fontSize: 90, color: '#1a1a1a', fontWeight: 300, marginBottom: 0, letterSpacing: 8, fontFamily: "'Playfair Display', Georgia, serif" }}>
        {data.brideFirstName}
      </h1>
      <p style={{ fontSize: 20, color: '#ccc', margin: '25px 0', letterSpacing: 10 }}>— ve —</p>
      <h1 style={{ fontSize: 90, color: '#1a1a1a', fontWeight: 300, marginBottom: 60, letterSpacing: 8, fontFamily: "'Playfair Display', Georgia, serif" }}>
        {data.groomFirstName}
      </h1>

      {/* İnce çizgi */}
      <div style={{ width: 60, height: 1, background: '#ddd', marginBottom: 60 }} />

      {/* Tarih - grid */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginBottom: 50 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 16, color: '#999', letterSpacing: 4, textTransform: 'uppercase' }}>Tarih</p>
          <p style={{ fontSize: 24, color: '#333', fontWeight: 500, marginTop: 8 }}>{formatDate(data.eventDate)}</p>
        </div>
        <div style={{ width: 1, height: 40, background: '#E8E4E0' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 16, color: '#999', letterSpacing: 4, textTransform: 'uppercase' }}>Saat</p>
          <p style={{ fontSize: 24, color: '#333', fontWeight: 500, marginTop: 8 }}>{data.eventTime}</p>
        </div>
      </div>

      {/* Mekan */}
      {data.venueName && (
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <p style={{ fontSize: 16, color: '#999', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8 }}>Mekan</p>
          <p style={{ fontSize: 24, color: '#333', fontWeight: 500 }}>{data.venueName}</p>
          {data.venueAddress && <p style={{ fontSize: 18, color: '#999', marginTop: 6 }}>{data.venueAddress}</p>}
        </div>
      )}

      {/* Aileler */}
      <div style={{ display: 'flex', gap: 80, marginBottom: 50, textAlign: 'center' }}>
        <div>
          <p style={{ fontSize: 14, color: '#bbb', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Gelin Ailesi</p>
          <p style={{ fontSize: 20, color: '#555' }}>{data.brideFatherName || ''} & {data.brideMotherName || ''}</p>
        </div>
        <div>
          <p style={{ fontSize: 14, color: '#bbb', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Damat Ailesi</p>
          <p style={{ fontSize: 20, color: '#555' }}>{data.groomFatherName || ''} & {data.groomMotherName || ''}</p>
        </div>
      </div>

      {/* İnce çizgi */}
      <div style={{ width: 60, height: 1, background: '#ddd', marginBottom: 40 }} />

      {/* Link */}
      <p style={{ fontSize: 14, color: '#bbb', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8 }}>Canlı Yayın</p>
      <p style={{ fontSize: 20, color: '#333', fontWeight: 500 }}>nikahim.com/canli/{data.eventLink}</p>
    </div>
  );
}
