import { redirect } from 'next/navigation';

// Destek uzmanı giriş noktası — nikahim.com/uzman → callcenter paneline yönlendirir.
// (İç sayfa yapısı /callcenter altında kalır; uzmanlar bu kısa linkten girer.)
export default function UzmanEntry() {
  redirect('/callcenter');
}
