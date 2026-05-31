/**
 * Shared FAQ data — used by the ConciergeSheet (full categorized list).
 * The home page has its own curated 8-question list inline in app/page.tsx.
 *
 * keywords: hidden array of synonyms/SEO terms — appended to the search
 * haystack so users can find an item without needing the exact q/a wording.
 * Never rendered in UI.
 *
 * Mobile app has its own copy at /c/nikahim/mobile/app/(tabs)/support.tsx;
 * for now we sync by hand. If we ever need true single-source-of-truth,
 * move to a backend endpoint or a shared package.
 */

export type FaqItem = { q: string; a: string; keywords?: string[] };
export type FaqCategory = { title: string; items: FaqItem[] };

/**
 * Full categorized FAQ — used in the web ConciergeSheet (sağdan açılan
 * Nikahım Destek paneli) and mirrored by the mobile app's individual user
 * support FAQ.
 */
export const fullFaqCategories: FaqCategory[] = [
  {
    title: 'Canlı Yayın',
    items: [
      { q: 'Canlı yayın nasıl başlatılır?', a: 'Nikahım uygulamasını indirdikten sonra Düğününüzü veya Nikahınızı oluşturmanız gerekmektedir. Bu adımı tamamladıktan sonra uygulama ana sayfasındaki Yayına Geç tuşu ile canlı yayın sayfasına geçebilir, tek tuşla direkt yayına geçebilirsiniz. Canlı yayın öncesinde organizasyonun gerçekleşeceği yerde önceden bir adet test yayını yapmanızı tavsiye ederiz. Test yayınları kayıt altına alınmaz ve süre hakkınızdan kullanmaz.',
        keywords: ['canlı yayın', 'düğün canlı yayını', 'nikah canlı yayını', 'online düğün', 'mobil yayın', 'telefonla yayın', 'yayın başlatma', 'düğün yayını', 'nikah yayını', 'canlı yayın uygulaması', 'test yayını'] },
      { q: 'Yayını kim izleyebilir?', a: 'Size özel oluşturulan canlı yayın sayfasının linkini paylaştığınız herkes nikahınızı izleyebilir. Eğer Düğününüzü veya Nikahınızı herkese açık olarak işaretlediyseniz, nikahim.com ana sayfasında nikahınızı arayarak bulan herkes izleyebilir. Eğer sadece davetliler seçeneğini seçtiyseniz, sadece linki paylaştığınız kişiler izleyebilir.',
        keywords: ['yayın linki', 'düğün izleme', 'nikah izleme', 'davetli erişimi', 'özel yayın', 'online davetli', 'canlı düğün izle', 'canlı nikah izle', 'yayın paylaşımı', 'izleyici erişimi', 'herkese açık'] },
      { q: 'Yayın sırasında internet kesilirse ne olur?', a: 'Yayın sırasında internet kesilirse o ana kadar yaptığınız yayın, kayıt altına alınır ve video olarak kaydedilir. Bağlantınız tekrar geldiğinde yeni bir yayın başlatabilir, kaldığınız yerden devam edebilirsiniz. Tüm yayınınız tamamlandığında Canlı Yayın sayfanızda bu durumda iki ayrı video olarak gösterilir canlı yayın kaydınız.',
        keywords: ['internet kesintisi', 'yayın kopması', 'bağlantı sorunu', 'yayın kaydı', 'video kaydı', 'düğün yayını sorunu', 'nikah yayını sorunu', 'yayın devamı', 'internet problemi', 'yayın kurtarma', 'kesilirse', 'koparsa'] },
      { q: 'Yayın kaydı ne kadar süre saklanır?', a: 'Canlı yayın kayıtları Nikahım platformunda 14 gün boyunca saklanır. Bu süre esnasında çiftler uygulama üzerinden kayıtlarını indirebilirler.',
        keywords: ['canlı yayın kaydı', 'düğün videosu', 'nikah videosu', 'yayın arşivi', 'video saklama', 'kayıtlı yayın', 'yayın geçmişi', 'video indirme', 'düğün kaydı', 'nikah kaydı', '14 gün'] },
      { q: 'Yayın kalitesi nasıl ayarlanır?', a: 'Yayın kalitesi canlı yayın sayfasında yayın öncesinde otomatik olarak ayarlanır. Eğer kendiniz manuel olarak değiştirmek isterseniz bunu ayarlar kısmından yapabilirsiniz. Sistem her zaman için bağlantı kalitenize göre donma ve takılma olmadan yayın yapmanızı sağlayacak çözünürlüğü otomatik olarak seçer. Yayın esnasında bağlantı kalitesi düşmesi durumunda yayında kopma olmaması için sistem otomatik olarak çözünürlük ve bitrate değerlerini düşürür ve akıcı bir yayın olması için gereken tüm işlemleri otomatik olarak gerçekleştirir.',
        keywords: ['yayın kalitesi', 'görüntü kalitesi', 'çözünürlük', 'video kalitesi', 'yüksek kalite', 'yayın ayarı', 'akıcı yayın', 'donmadan yayın', 'kaliteli düğün yayını', 'kaliteli nikah yayını', 'bitrate', 'hd', 'full hd', '1080p'] },
      { q: 'Hangi cihazlardan yayın açılabilir?', a: 'Uygulamayı yükleyebildiğiniz tüm cihazlardan canlı yayın açılabilir. Uygulama Android/iOS destekli telefonlarda çalışmaktadır.',
        keywords: ['android yayın', 'ios yayın', 'telefon yayını', 'mobil yayın', 'akıllı telefon', 'uygulama yayını', 'canlı yayın cihazı', 'düğün yayını telefonu', 'nikah yayını telefonu', 'mobil canlı yayın', 'iphone', 'samsung', 'huawei', 'xiaomi'] },
      { q: 'Yayını sonradan tekrar izleyebilir miyim?', a: 'Yayın kaydını 14 gün süresince uygulama içerisindeki Düğünüm/Nikahım bölümünden izleyebilirsiniz.',
        keywords: ['yayın tekrar izleme', 'yayın kaydı', 'düğün videosu izleme', 'nikah videosu izleme', 'video oynatma', 'yayın arşivi', 'geçmiş yayın', 'kayıt görüntüleme', 'düğün anıları', 'nikah anıları'] },
      { q: 'İzleyici sayısı limiti var mı?', a: 'İzleyici sayısı limiti paketinize göre değişmektedir. Standart pakette 100, Premium pakette 200 ve VIP pakette 300 davetli yayınızı izleyebilir.',
        keywords: ['izleyici sayısı', 'davetli limiti', 'yayın kapasitesi', 'online davetli', 'canlı yayın kişi sayısı', 'maksimum izleyici', 'düğün davetlileri', 'nikah davetlileri', 'yayın sınırı', 'katılımcı sayısı', '100 kişi', '200 kişi', '300 kişi'] },
      { q: 'İzleyici sayısı neye göre sayılmaktadır?', a: 'İzleyici sayısı CANLI Yayın linkinize tıklayıp bu sayfaya ad soyad bilgisi vererek giriş yapan kişi sayısını baz almaktadır. Bir kişi bu sayfayı kapatıp tekrar giriş yaptığında aynı cihazdan giriş yapıyorsa sistem bu kişiyi tanır ve yeni bir giriş olarak değerlendirmez ve tekrardan ad soyad sormaz. Aynı kişi farklı bir cihazdan bağlanır ise ikinci bir kez bu yeni bir giriş olarak sayılır ve kişi sayınızdan düşer.',
        keywords: ['izleyici takibi', 'katılımcı sayısı', 'yayın girişleri', 'davetli kontrolü', 'kullanıcı girişi', 'yayın istatistikleri', 'canlı izleyici', 'online katılım', 'yayın analizi', 'izleyici ölçümü', 'ad soyad'] },
      { q: 'Yayın esnasında bağlantım zayıflarsa ne olur?', a: 'Yayın esnasında bağlantınız zayıflarsa sistem otomatik olarak çözünürlük ve bitrate ayarlarını değiştirerek yayın kalitesinden ödün vererek akıcı ve takılma olmadan gerçekleşen bir yayın sunmaya çalışır. Bağlantınız eğer yayın yapamayacak duruma gelirse bağlantınız kopar bu ana kadar gerçekleşen yayın kayıt altına alınır ve sistem otomatik olarak her 5 saniyede bir yeni bir bağlantı kurmaya çalışır. Sistem yeni bağlantı kurulana kadar bu denemeyi yapmaya devam eder telefonunuz internet bağlatısını tekrar sağladığı andan 5 saniye sonra tekrardan yayın başlatabilirsiniz.',
        keywords: ['zayıf internet', 'yayın donması', 'donma', 'donması', 'takılma', 'takılması', 'internet yavaşlığı', 'bağlantı kalitesi', 'yayın performansı', 'kesintisiz yayın', 'akıcı yayın', 'internet sorunu', 'yayın kalitesi', 'bağlantı problemi', 'freeze', 'kasma'] },
      { q: 'Bağlantı koptuğu esnada yayın süreme ne olacak?', a: 'Bağlantınız koptuğu andan itibaren yayın süreniz durur. Siz tekrardan ikinci bir yayın başlattığınız zaman süreniz tekrardan geri saymaya devam eder kaldığı yerden. Bağlantı kopmalarında süre hakkınızdan bir kayıp olmaz.',
        keywords: ['yayın süresi', 'canlı yayın hakkı', 'süre kaybı', 'paket süresi', 'yayın dakikası', 'bağlantı kopması', 'yayın zamanı', 'kullanım süresi', 'düğün yayını süresi', 'nikah yayını süresi', 'süre durur'] },
      { q: 'Yayını telefonumu yatay mı dikey mi tutarak yapmalıyım?', a: 'En iyi izleme deneyimi için telefonun yatay konumda kullanılması tavsiye edilir. Sistem size zaten otomatik olarak yatay konuma geçirmektedir yayın sayfasını açtığınız zaman.',
        keywords: ['yatay çekim', 'dikey çekim', 'telefon kamerası', 'video çekimi', 'canlı yayın çekimi', 'kamera açısı', 'telefon kullanımı', 'yayın görüntüsü', 'düğün çekimi', 'nikah çekimi', 'landscape', 'portre'] },
    ],
  },
  {
    title: 'Altın Takma ve Ödemeler',
    items: [
      { q: 'Altın takma nasıl çalışır?', a: 'Altın takma aslında tamamen davetli ve çift arasındaki bir para transferidir. Nikahım güncel altın fiyatlarını canlı yayın sayfanızda yayınlar. Davetli kişi takmak istediği altını seçer ve bu altının güncel TL olarak karşılığı ekranda gösterilir. Çıkan menüden davetli çifte hangi yöntem ile para göndereceğini seçer ve ardından kendi banka uygulamasından direkt olarak çiftin hesabına para gönderimini yapar. Daha sonrasında tekrardan bu sayfaya gelerek ödemeyi onaylar ve bu online altın takma kayıt altına alınmış olur. Nikahım platformu bu para transferlerine aracılık etmez, sadece çiftin IBAN bilgisini ve Crypto adres bilgisini davetli ile paylaşır.',
        keywords: ['online altın takma', 'dijital altın', 'sanal altın', 'düğünde altın', 'nikahta altın', 'çifte para gönderme', 'iban ödeme', 'altın gönderme', 'düğün hediyesi', 'nikah hediyesi', 'crypto'] },
      { q: 'Para gerçekten bana mı geliyor?', a: 'Canlı yayın sayfasında ödeme bölümünde sizin IBAN veya Crypto cüzdan adres bilgileriniz davetliler ile paylaşılır ve davetliler direkt olarak sizin hesabınıza ödeme yaparlar.',
        keywords: ['iban ödeme', 'hesaba para gönderme', 'doğrudan ödeme', 'banka transferi', 'çifte ödeme', 'güvenli ödeme', 'düğün ödemesi', 'nikah ödemesi', 'hesaba havale', 'ödeme alma'] },
      { q: 'Hangi ödeme yöntemleri var?', a: 'Havale/EFT yöntemi için IBAN kopyalama veya QR kod yöntemini, crypto için direkt olarak crypto borsası üzerinden para transferi yöntemlerini davetliler kullanabilirler.',
        keywords: ['havale', 'eft', 'iban', 'karekod ödeme', 'qr ödeme', 'banka transferi', 'kripto ödeme', 'crypto', 'para gönderme', 'ödeme seçenekleri', 'ödeme yöntemi'] },
      { q: 'Komisyon alınıyor mu?', a: 'Transferler tamamen davetli ile çift arasındaki bir para transferi olduğu için bu ödemelerin hiçbirinden Nikahım bir komisyon almaz. Kendi bankanız eğer para transferinden bir ücret kesiyor ise sadece o komisyonu ödersiniz para transferi esnasında.',
        keywords: ['komisyonsuz ödeme', 'ücretsiz transfer', 'ödeme komisyonu', 'banka masrafı', 'havale ücreti', 'eft ücreti', 'para transferi', 'düğün ödemesi', 'nikah ödemesi', 'kesintisiz ödeme', 'komisyon yok'] },
      { q: 'Davetli yanlış göndermiş, ne yapacağım?', a: 'Bu konuyu bankanız ile çözmeniz gerekir çünkü para transferleri tamamen davetli ve çift arasındaki bir para transferidir.',
        keywords: ['yanlış havale', 'yanlış eft', 'ödeme hatası', 'para iadesi', 'banka işlemi', 'yanlış transfer', 'ödeme sorunu', 'gönderim hatası', 'hesap hatası', 'para gönderme', 'hatalı'] },
      { q: 'Anonim altın takma ne demek?', a: 'Anonim altın takma, davetlinin çifte sistem üzerinden altın taktığı ama yayın esnasında isminin gözükmesini istemediği durumdur. Bu durumda davetlinin ismi ve taktığı altın bilgisi sadece çift ile uygulama üzerinden paylaşılır.',
        keywords: ['anonim altın', 'gizli altın takma', 'isimsiz hediye', 'gizli ödeme', 'anonim bağış', 'özel hediye', 'isimsiz altın', 'gizli davetli', 'altın bildirimi', 'özel gönderim', 'sürpriz takma'] },
      { q: 'QR kod nasıl oluşturulur?', a: 'Davetlilerinizin size altın takma yöntemlerinden biri olan QR kod ile ödeme almak için karekodunuzu kendi banka uygulamanızdan oluşturabilir, daha sonrasında uygulama üzerinden Nikahım sistemine yükleyebilirsiniz.',
        keywords: ['karekod oluşturma', 'qr kod ödeme', 'banka qr', 'ödeme karekodu', 'kolay ödeme', 'mobil ödeme', 'iban alternatifi', 'qr transfer', 'ödeme alma', 'dijital ödeme'] },
    ],
  },
  {
    title: 'Davetiye',
    items: [
      { q: 'Davetiye nasıl oluşturulur?', a: 'Uygulamamız üzerinden Düğün/Nikah oluştururken hazır davetiye şablonlarından birini seçersiniz ve Düğününüz/Nikahınız oluşturulduktan sonra sistem otomatik olarak bu davetiyeyi sizin bilgileriniz ile yeniden oluşturarak uygulamanın Düğünüm/Nikahım bölümüne yükler. Ana sayfadaki davetiye gönder bölümünden hızlı bir şekilde davetiyenizi ve canlı yayın linkinizi kendi mesajınız ile sevdiklerinize iletmeye başlayabilirsiniz.',
        keywords: ['dijital davetiye', 'online davetiye', 'düğün davetiyesi', 'nikah davetiyesi', 'elektronik davetiye', 'davetiye hazırlama', 'davetiye tasarımı', 'davetiye gönderme', 'davetli çağırma', 'davetiye linki'] },
      { q: 'Davetiye şablonunu sonradan değiştirebilir miyim?', a: 'Hayır. Davetiye şablonu seçildikten sonra değiştirilemez, ama davetiyedeki bilgileri dilediğiniz zaman Düğünüm/Nikahım bölümünden değiştirebilirsiniz.',
        keywords: ['davetiye şablonu', 'davetiye düzenleme', 'tasarım seçimi', 'davetiye bilgileri', 'dijital kart', 'nikah kartı', 'düğün kartı', 'davetiye ayarları', 'şablon seçimi', 'online davetiye'] },
      { q: 'Davetiyeyi nasıl paylaşırım?', a: 'Ana sayfada bulunan davetiye gönder bölümünden direk olarak davetiyenizi ve yayın linkinizi paylaşmaya başlayabilirsiniz.',
        keywords: ['davetiye paylaşma', 'davetiye gönderme', 'yayın linki paylaşma', 'davetli daveti', 'online paylaşım', 'düğün duyurusu', 'nikah duyurusu', 'mesaj gönderme', 'davet bağlantısı', 'etkinlik paylaşımı', 'whatsapp', 'sms'] },
      { q: 'Davetiye PDF/PNG olarak indirilebilir mi?', a: 'Evet, PNG olarak telefonunuza Düğünüm/Nikahım bölümünden indirebilirsiniz.',
        keywords: ['png davetiye', 'davetiye indirme', 'telefona kaydetme', 'dijital davetiye', 'görsel indirme', 'davetiye resmi', 'online davetiye', 'nikah kartı', 'düğün kartı', 'paylaşılabilir davetiye', 'pdf'] },
      { q: 'Davetiyedeki bilgileri sonradan değiştirebilir miyim?', a: 'Evet, davetiye üzerindeki bilgileri daha sonrasında değiştirebilirsiniz.',
        keywords: ['davetiye güncelleme', 'isim değiştirme', 'tarih değiştirme', 'düğün bilgileri', 'nikah bilgileri', 'davetiye düzenleme', 'etkinlik bilgileri', 'davetiye ayarları', 'online güncelleme', 'bilgi düzeltme'] },
    ],
  },
  {
    title: 'Paketler ve Ödeme',
    items: [
      { q: 'Hangi paketler var?', a: 'Nikahım çiftlere 3 farklı seviyede paket sunmaktadır. Bunlar Standart, Premium ve VIP paketleridir.',
        keywords: ['standart paket', 'premium paket', 'vip paket', 'düğün paketi', 'nikah paketi', 'yayın paketi', 'canlı yayın hizmeti', 'paket seçenekleri', 'uygulama paketi', 'paket karşılaştırma'] },
      { q: 'Paketler arası fark nedir?', a: 'Paketler arası farklara nikahim.com ana sayfasından ulaşabilirsiniz.',
        keywords: ['paket farkı', 'özellik karşılaştırma', 'premium avantajları', 'vip avantajları', 'paket özellikleri', 'yayın özellikleri', 'izleyici limiti', 'yayın süresi', 'paket seçimi', 'hizmet farkları'] },
      { q: 'Ödeme nasıl yapılır?', a: 'Uygulamamızı indirdikten ve Düğün/Nikah oluşturduktan sonra en son adımda uygulama içi tek seferlik satın alma olarak ödemenizi gerçekleştirirsiniz. Kredi kartı veya banka bilgilerinizi bizimle paylaşmanız gerekmez.',
        keywords: ['uygulama içi ödeme', 'satın alma', 'güvenli ödeme', 'kredi kartı', 'ödeme işlemi', 'paket satın alma', 'dijital ödeme', 'online ödeme', 'uygulama ödemesi', 'ödeme adımı', 'in-app purchase'] },
      { q: 'İade alabilir miyim?', a: 'Mücbir ve teknik sebepler dışında kullanıcı talebi üzerinden iade yapılmamaktadır.',
        keywords: ['iade talebi', 'geri ödeme', 'ödeme iadesi', 'satın alma iadesi', 'iptal işlemi', 'müşteri iadesi', 'ödeme politikası', 'paket iptali', 'teknik sorun', 'iade koşulları', 'refund'] },
      { q: 'Kupon kodu nasıl kullanılır?', a: 'Kupon kodunuzu Düğün/Nikah oluşturmanın son adımı olan ödeme bölümündeki sayfada bulunan "Kupon Kodu" isimli bölüme girerek kullanabilirsiniz.',
        keywords: ['indirim kodu', 'kupon kodu', 'promosyon kodu', 'kampanya', 'indirim', 'ödeme indirimi', 'kupon kullanımı', 'avantaj kodu', 'kampanya kodu', 'fırsat'] },
      { q: 'Paketimi yükseltebilir miyim?', a: 'Evet, eğer davetli sayınızın artacağını veya daha fazla süreye ihtiyaç duyduğunuzu düşünüyorsanız bir üst pakete geçebilir yada ek paketlerden satın alabilirsiniz.',
        keywords: ['paket yükseltme', 'üst pakete geçiş', 'premium yükseltme', 'vip yükseltme', 'ek özellik', 'paket değiştirme', 'daha fazla davetli', 'daha fazla süre', 'yükseltme işlemi', 'paket güncelleme', 'upgrade'] },
      { q: 'Paketim güzel ama daha fazla izleyici ihtiyacım var, ne yapabilirim?', a: 'Uygulama üzerinden Düğünüm/Nikahım bölümünden ek paket satın alarak izleyici sayınızı arttırabilirsiniz.',
        keywords: ['ek davetli', 'izleyici artırma', 'katılımcı artırma', 'yayın kapasitesi', 'ek paket', 'daha fazla izleyici', 'online davetli', 'yayın genişletme', 'davetli limiti', 'ek kontenjan'] },
      { q: 'Paketim güzel ama daha fazla süreye ihtiyacım var, ne yapabilirim?', a: 'Uygulama üzerinden Düğünüm/Nikahım bölümünden ek paket satın alarak sürenizi arttırabilirsiniz.',
        keywords: ['ek süre', 'yayın süresi artırma', 'canlı yayın süresi', 'ek paket', 'uzun yayın', 'düğün yayını süresi', 'nikah yayını süresi', 'süre uzatma', 'yayın hakkı', 'ek kullanım'] },
      { q: 'Paketimi bir alt paketle değiştirebilir miyim?', a: 'Bir üst pakete geçebilirsiniz fakat bir alt pakete inemezsiniz. Bu durumda mevcut paketinizi kullanmak durumundasınız.',
        keywords: ['paket değiştirme', 'alt paket', 'üst paket', 'paket seçimi', 'mevcut paket', 'paket kuralları', 'abonelik', 'hizmet seviyesi', 'paket kullanımı', 'paket işlemleri', 'downgrade'] },
      { q: 'Etkinlik tarihimi değiştirebilir miyim?', a: 'Evet. Yayın başlamadan önce uygulama üzerinden etkinlik bilgilerinizi güncelleyebilirsiniz.',
        keywords: ['etkinlik tarihi', 'düğün tarihi', 'nikah tarihi', 'tarih güncelleme', 'etkinlik düzenleme', 'yayın tarihi', 'organizasyon tarihi', 'takvim güncelleme', 'etkinlik bilgisi', 'tarih değişikliği'] },
    ],
  },
  {
    title: 'Fotoğraf ve Medya',
    items: [
      { q: 'Slayt fotoğraflarını nasıl yüklerim?', a: 'Düğün/Nikah gününüzden fotoğraflarınızı ister siz uygulamamız üzerinden, isterseniz de o gün yanınızda olan arkadaşlarınız canlı yayın linkiniz üzerinden sisteme bu fotoğrafları yükleyebilirler.',
        keywords: ['düğün fotoğrafları', 'nikah fotoğrafları', 'fotoğraf yükleme', 'albüm oluşturma', 'anı fotoğrafları', 'fotoğraf paylaşımı', 'galeri', 'etkinlik fotoğrafı', 'resim yükleme', 'online albüm', 'slayt'] },
      { q: 'Davetliler fotoğraf gönderebilir mi?', a: 'Online davetliler fotoğraf gönderemez, ama nikah günü sizin yanınızda olan davetliler nikahla ilgili fotoğrafları sisteme yükleyebilirler canlı yayın linki üzerinden.',
        keywords: ['fotoğraf gönderme', 'davetli fotoğrafı', 'nikah fotoğrafı', 'düğün fotoğrafı', 'resim paylaşma', 'albüme ekleme', 'etkinlik fotoğrafı', 'fotoğraf katkısı', 'galeri yükleme', 'anı paylaşımı'] },
      { q: 'Foto onayı nasıl çalışır?', a: 'Arkadaşlarınız sisteme fotoğraf yüklediklerinde bu direkt olarak canlı yayın sayfanızda görüntülenmez. Tüm fotoğraflara sizin uygulama üzerinden onay vermeniz gerekir.',
        keywords: ['fotoğraf onayı', 'galeri onayı', 'resim kontrolü', 'içerik onayı', 'fotoğraf yönetimi', 'albüm yönetimi', 'yüklenen fotoğraflar', 'onay sistemi', 'fotoğraf inceleme', 'görsel kontrol', 'moderasyon'] },
      { q: 'Kaç fotoğraf yükleyebilirim?', a: 'Sisteme bir kişi tek seferde 20 fotoğraf yükleyebilir. Sizin hesabınızda toplamda 500 fotoğraf olabilir.',
        keywords: ['fotoğraf limiti', 'yükleme sınırı', 'albüm kapasitesi', 'maksimum fotoğraf', 'galeri kapasitesi', 'resim sayısı', 'yükleme hakkı', 'fotoğraf kotası', 'online albüm', 'fotoğraf depolama', '20 fotoğraf', '500 fotoğraf'] },
      { q: 'Yayın sırasında fotoğraf yüklemek zorunlu mu?', a: 'Hayır. Fotoğraf albümü özelliği isteğe bağlıdır. Dilerseniz hiç fotoğraf yüklemeden yalnızca canlı yayın özelliğini kullanabilirsiniz.',
        keywords: ['fotoğraf albümü', 'isteğe bağlı özellik', 'yalnızca canlı yayın', 'albüm kullanımı', 'fotoğraf paylaşımı', 'düğün albümü', 'nikah albümü', 'fotoğraf ekleme', 'galeri kullanımı', 'medya özellikleri'] },
    ],
  },
  {
    title: 'Nikahım Çarşı',
    items: [
      { q: 'Nikahım Çarşı nedir?', a: 'Nikahım Çarşı, nikahlarına hazırlık yapan çiftlerin en çok ihtiyaç duyabilecekleri ürünleri satan mağazaları bulabilecekleri bir platformdur. Bulunduğunuz şehre göre filtreleyebilir, size en yakın gelinlikçi, kuaför, nikah şekeri üreten vb. dükkanlara ulaşabilirsiniz.',
        keywords: ['gelinlikçi', 'kuaför', 'nikah şekeri', 'düğün mağazası', 'düğün alışverişi', 'nikah alışverişi', 'düğün hazırlığı', 'organizasyon firması', 'yerel işletmeler', 'düğün hizmetleri'] },
      { q: 'Mağazalara nasıl mesaj atarım?', a: 'Nikahım Çarşı bölümünde mağazaların ana sayfasında bulunan mesaj gönder seçeneği ile sistem içinden mesaj atabilir ya da WhatsApp linklerine tıklayarak direkt olarak mağazalar ile iletişime geçebilirsiniz.',
        keywords: ['mağaza mesajı', 'satıcı iletişimi', 'işletme mesajı', 'müşteri iletişimi', 'whatsapp iletişim', 'mesaj gönderme', 'düğün firması', 'satıcı bilgisi', 'iletişim kurma', 'mağaza bağlantısı'] },
    ],
  },
  {
    title: 'Hesap ve Güvenlik',
    items: [
      { q: 'Şifremi nasıl değiştiririm?', a: 'Şifrenizi uygulamamız içindeki Profilim sayfasından kendiniz değiştirebilirsiniz.',
        keywords: ['şifre değiştirme', 'hesap güvenliği', 'profil ayarları', 'giriş bilgileri', 'şifre güncelleme', 'kullanıcı hesabı', 'hesap koruması', 'güvenli giriş', 'profil yönetimi', 'hesap ayarları', 'password'] },
      { q: 'Hesabımı nasıl silerim?', a: 'Hesabınızı silmek için destek@nikahim.com adresine mail atmanız gerekir.',
        keywords: ['hesap silme', 'üyelik iptali', 'kullanıcı hesabı', 'profil kaldırma', 'hesap kapatma', 'üyelik sonlandırma', 'veri silme', 'hesap işlemleri', 'üyelik yönetimi', 'kullanıcı silme', 'delete'] },
      { q: 'E-posta değiştirebilir miyim?', a: 'Evet, e-posta adresinizi Profilim bölümünden değiştirebilirsiniz.',
        keywords: ['e posta değiştirme', 'mail güncelleme', 'hesap bilgileri', 'profil güncelleme', 'iletişim bilgisi', 'e posta adresi', 'hesap ayarları', 'mail değiştirme', 'kullanıcı profili', 'bilgi güncelleme', 'email'] },
      { q: 'Bilgilerim güvende mi?', a: 'Evet, Nikahım platformu bilgilerinizi kesinlikle 3. şahıslarla paylaşmaz.',
        keywords: ['veri güvenliği', 'kişisel bilgiler', 'gizlilik', 'hesap güvenliği', 'kullanıcı koruması', 'bilgi güvenliği', 'güvenli uygulama', 'veri koruma', 'gizlilik politikası', 'güvenli sistem', 'kvkk', 'privacy'] },
    ],
  },
];
