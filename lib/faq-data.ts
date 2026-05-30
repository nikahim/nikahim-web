/**
 * Shared FAQ data — used by the ConciergeSheet (full categorized list).
 * The home page has its own curated 8-question list inline in app/page.tsx.
 *
 * Mobile app has its own copy at /c/nikahim/mobile/app/(tabs)/support.tsx;
 * for now we sync by hand. If we ever need true single-source-of-truth,
 * move to a backend endpoint or a shared package.
 */

export type FaqItem = { q: string; a: string };
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
      { q: 'Canlı yayın nasıl başlatılır?', a: 'Nikahım uygulamasını indirdikten sonra Düğününüzü veya Nikahınızı oluşturmanız gerekmektedir. Bu adımı tamamladıktan sonra uygulama ana sayfasındaki Yayına Geç tuşu ile canlı yayın sayfasına geçebilir, tek tuşla direkt yayına geçebilirsiniz. Canlı yayın öncesinde organizasyonun gerçekleşeceği yerde önceden bir adet test yayını yapmanızı tavsiye ederiz. Test yayınları kayıt altına alınmaz ve süre hakkınızdan kullanmaz.' },
      { q: 'Yayını kim izleyebilir?', a: 'Size özel oluşturulan canlı yayın sayfasının linkini paylaştığınız herkes nikahınızı izleyebilir. Eğer Düğününüzü veya Nikahınızı herkese açık olarak işaretlediyseniz, nikahim.com ana sayfasında nikahınızı arayarak bulan herkes izleyebilir. Eğer sadece davetliler seçeneğini seçtiyseniz, sadece linki paylaştığınız kişiler izleyebilir.' },
      { q: 'Yayın sırasında internet kesilirse ne olur?', a: 'Yayın sırasında internet kesilirse o ana kadar yaptığınız yayın, kayıt altına alınır ve video olarak kaydedilir. Bağlantınız tekrar geldiğinde yeni bir yayın başlatabilir, kaldığınız yerden devam edebilirsiniz. Tüm yayınınız tamamlandığında Canlı Yayın sayfanızda bu durumda iki ayrı video olarak gösterilir canlı yayın kaydınız.' },
      { q: 'Yayın kaydı ne kadar süre saklanır?', a: 'Canlı yayın kayıtları Nikahım platformunda 14 gün boyunca saklanır. Bu süre esnasında çiftler uygulama üzerinden kayıtlarını indirebilirler.' },
      { q: 'Yayın kalitesi nasıl ayarlanır?', a: 'Yayın kalitesi canlı yayın sayfasında yayın öncesinde otomatik olarak ayarlanır. Eğer kendiniz manuel olarak değiştirmek isterseniz bunu ayarlar kısmından yapabilirsiniz. Sistem her zaman için bağlantı kalitenize göre donma ve takılma olmadan yayın yapmanızı sağlayacak çözünürlüğü otomatik olarak seçer. Yayın esnasında bağlantı kalitesi düşmesi durumunda yayında kopma olmaması için sistem otomatik olarak çözünürlük ve bitrate değerlerini düşürür ve akıcı bir yayın olması için gereken tüm işlemleri otomatik olarak gerçekleştirir.' },
      { q: 'Hangi cihazlardan yayın açılabilir?', a: 'Uygulamayı yükleyebildiğiniz tüm cihazlardan canlı yayın açılabilir. Uygulama Android/iOS destekli telefonlarda çalışmaktadır.' },
      { q: 'Yayını sonradan tekrar izleyebilir miyim?', a: 'Yayın kaydını 14 gün süresince uygulama içerisindeki Düğünüm/Nikahım bölümünden izleyebilirsiniz.' },
      { q: 'İzleyici sayısı limiti var mı?', a: 'İzleyici sayısı limiti paketinize göre değişmektedir. Standart pakette 100, Premium pakette 200 ve VIP pakette 300 davetli yayınızı izleyebilir.' },
      { q: 'İzleyici sayısı neye göre sayılmaktadır?', a: 'İzleyici sayısı CANLI Yayın linkinize tıklayıp bu sayfaya ad soyad bilgisi vererek giriş yapan kişi sayısını baz almaktadır. Bir kişi bu sayfayı kapatıp tekrar giriş yaptığında aynı cihazdan giriş yapıyorsa sistem bu kişiyi tanır ve yeni bir giriş olarak değerlendirmez ve tekrardan ad soyad sormaz. Aynı kişi farklı bir cihazdan bağlanır ise ikinci bir kez bu yeni bir giriş olarak sayılır ve kişi sayınızdan düşer.' },
      { q: 'Yayın esnasında bağlantım zayıflarsa ne olur?', a: 'Yayın esnasında bağlantınız zayıflarsa sistem otomatik olarak çözünürlük ve bitrate ayarlarını değiştirerek yayın kalitesinden ödün vererek akıcı ve takılma olmadan gerçekleşen bir yayın sunmaya çalışır. Bağlantınız eğer yayın yapamayacak duruma gelirse bağlantınız kopar bu ana kadar gerçekleşen yayın kayıt altına alınır ve sistem otomatik olarak her 5 saniyede bir yeni bir bağlantı kurmaya çalışır. Sistem yeni bağlantı kurulana kadar bu denemeyi yapmaya devam eder telefonunuz internet bağlatısını tekrar sağladığı andan 5 saniye sonra tekrardan yayın başlatabilirsiniz.' },
      { q: 'Bağlantı koptuğu esnada yayın süreme ne olacak?', a: 'Bağlantınız koptuğu andan itibaren yayın süreniz durur. Siz tekrardan ikinci bir yayın başlattığınız zaman süreniz tekrardan geri saymaya devam eder kaldığı yerden. Bağlantı kopmalarında süre hakkınızdan bir kayıp olmaz.' },
      { q: 'Yayını telefonumu yatay mı dikey mi tutarak yapmalıyım?', a: 'En iyi izleme deneyimi için telefonun yatay konumda kullanılması tavsiye edilir. Sistem size zaten otomatik olarak yatay konuma geçirmektedir yayın sayfasını açtığınız zaman.' },
    ],
  },
  {
    title: 'Altın Takma ve Ödemeler',
    items: [
      { q: 'Altın takma nasıl çalışır?', a: 'Altın takma aslında tamamen davetli ve çift arasındaki bir para transferidir. Nikahım güncel altın fiyatlarını canlı yayın sayfanızda yayınlar. Davetli kişi takmak istediği altını seçer ve bu altının güncel TL olarak karşılığı ekranda gösterilir. Çıkan menüden davetli çifte hangi yöntem ile para göndereceğini seçer ve ardından kendi banka uygulamasından direkt olarak çiftin hesabına para gönderimini yapar. Daha sonrasında tekrardan bu sayfaya gelerek ödemeyi onaylar ve bu online altın takma kayıt altına alınmış olur. Nikahım platformu bu para transferlerine aracılık etmez, sadece çiftin IBAN bilgisini ve Crypto adres bilgisini davetli ile paylaşır.' },
      { q: 'Para gerçekten bana mı geliyor?', a: 'Canlı yayın sayfasında ödeme bölümünde sizin IBAN veya Crypto cüzdan adres bilgileriniz davetliler ile paylaşılır ve davetliler direkt olarak sizin hesabınıza ödeme yaparlar.' },
      { q: 'Hangi ödeme yöntemleri var?', a: 'Havale/EFT yöntemi için IBAN kopyalama veya QR kod yöntemini, crypto için direkt olarak crypto borsası üzerinden para transferi yöntemlerini davetliler kullanabilirler.' },
      { q: 'Komisyon alınıyor mu?', a: 'Transferler tamamen davetli ile çift arasındaki bir para transferi olduğu için bu ödemelerin hiçbirinden Nikahım bir komisyon almaz. Kendi bankanız eğer para transferinden bir ücret kesiyor ise sadece o komisyonu ödersiniz para transferi esnasında.' },
      { q: 'Davetli yanlış göndermiş, ne yapacağım?', a: 'Bu konuyu bankanız ile çözmeniz gerekir çünkü para transferleri tamamen davetli ve çift arasındaki bir para transferidir.' },
      { q: 'Anonim altın takma ne demek?', a: 'Anonim altın takma, davetlinin çifte sistem üzerinden altın taktığı ama yayın esnasında isminin gözükmesini istemediği durumdur. Bu durumda davetlinin ismi ve taktığı altın bilgisi sadece çift ile uygulama üzerinden paylaşılır.' },
      { q: 'QR kod nasıl oluşturulur?', a: 'Davetlilerinizin size altın takma yöntemlerinden biri olan QR kod ile ödeme almak için karekodunuzu kendi banka uygulamanızdan oluşturabilir, daha sonrasında uygulama üzerinden Nikahım sistemine yükleyebilirsiniz.' },
    ],
  },
  {
    title: 'Davetiye',
    items: [
      { q: 'Davetiye nasıl oluşturulur?', a: 'Uygulamamız üzerinden Düğün/Nikah oluştururken hazır davetiye şablonlarından birini seçersiniz ve Düğününüz/Nikahınız oluşturulduktan sonra sistem otomatik olarak bu davetiyeyi sizin bilgileriniz ile yeniden oluşturarak uygulamanın Düğünüm/Nikahım bölümüne yükler. Ana sayfadaki davetiye gönder bölümünden hızlı bir şekilde davetiyenizi ve canlı yayın linkinizi kendi mesajınız ile sevdiklerinize iletmeye başlayabilirsiniz.' },
      { q: 'Davetiye şablonunu sonradan değiştirebilir miyim?', a: 'Hayır. Davetiye şablonu seçildikten sonra değiştirilemez, ama davetiyedeki bilgileri dilediğiniz zaman Düğünüm/Nikahım bölümünden değiştirebilirsiniz.' },
      { q: 'Davetiyeyi nasıl paylaşırım?', a: 'Ana sayfada bulunan davetiye gönder bölümünden direk olarak davetiyenizi ve yayın linkinizi paylaşmaya başlayabilirsiniz.' },
      { q: 'Davetiye PDF/PNG olarak indirilebilir mi?', a: 'Evet, PNG olarak telefonunuza Düğünüm/Nikahım bölümünden indirebilirsiniz.' },
      { q: 'Davetiyedeki bilgileri sonradan değiştirebilir miyim?', a: 'Evet, davetiye üzerindeki bilgileri daha sonrasında değiştirebilirsiniz.' },
    ],
  },
  {
    title: 'Paketler ve Ödeme',
    items: [
      { q: 'Hangi paketler var?', a: 'Nikahım çiftlere 3 farklı seviyede paket sunmaktadır. Bunlar Standart, Premium ve VIP paketleridir.' },
      { q: 'Paketler arası fark nedir?', a: 'Paketler arası farklara nikahim.com ana sayfasından ulaşabilirsiniz.' },
      { q: 'Ödeme nasıl yapılır?', a: 'Uygulamamızı indirdikten ve Düğün/Nikah oluşturduktan sonra en son adımda uygulama içi tek seferlik satın alma olarak ödemenizi gerçekleştirirsiniz. Kredi kartı veya banka bilgilerinizi bizimle paylaşmanız gerekmez.' },
      { q: 'İade alabilir miyim?', a: 'Mücbir ve teknik sebepler dışında kullanıcı talebi üzerinden iade yapılmamaktadır.' },
      { q: 'Kupon kodu nasıl kullanılır?', a: 'Kupon kodunuzu Düğün/Nikah oluşturmanın son adımı olan ödeme bölümündeki sayfada bulunan "Kupon Kodu" isimli bölüme girerek kullanabilirsiniz.' },
      { q: 'Paketimi yükseltebilir miyim?', a: 'Evet, eğer davetli sayınızın artacağını veya daha fazla süreye ihtiyaç duyduğunuzu düşünüyorsanız bir üst pakete geçebilir yada ek paketlerden satın alabilirsiniz.' },
      { q: 'Paketim güzel ama daha fazla izleyici ihtiyacım var, ne yapabilirim?', a: 'Uygulama üzerinden Düğünüm/Nikahım bölümünden ek paket satın alarak izleyici sayınızı arttırabilirsiniz.' },
      { q: 'Paketim güzel ama daha fazla süreye ihtiyacım var, ne yapabilirim?', a: 'Uygulama üzerinden Düğünüm/Nikahım bölümünden ek paket satın alarak sürenizi arttırabilirsiniz.' },
      { q: 'Paketimi bir alt paketle değiştirebilir miyim?', a: 'Bir üst pakete geçebilirsiniz fakat bir alt pakete inemezsiniz. Bu durumda mevcut paketinizi kullanmak durumundasınız.' },
      { q: 'Etkinlik tarihimi değiştirebilir miyim?', a: 'Evet. Yayın başlamadan önce uygulama üzerinden etkinlik bilgilerinizi güncelleyebilirsiniz.' },
    ],
  },
  {
    title: 'Fotoğraf ve Medya',
    items: [
      { q: 'Slayt fotoğraflarını nasıl yüklerim?', a: 'Düğün/Nikah gününüzden fotoğraflarınızı ister siz uygulamamız üzerinden, isterseniz de o gün yanınızda olan arkadaşlarınız canlı yayın linkiniz üzerinden sisteme bu fotoğrafları yükleyebilirler.' },
      { q: 'Davetliler fotoğraf gönderebilir mi?', a: 'Online davetliler fotoğraf gönderemez, ama nikah günü sizin yanınızda olan davetliler nikahla ilgili fotoğrafları sisteme yükleyebilirler canlı yayın linki üzerinden.' },
      { q: 'Foto onayı nasıl çalışır?', a: 'Arkadaşlarınız sisteme fotoğraf yüklediklerinde bu direkt olarak canlı yayın sayfanızda görüntülenmez. Tüm fotoğraflara sizin uygulama üzerinden onay vermeniz gerekir.' },
      { q: 'Kaç fotoğraf yükleyebilirim?', a: 'Sisteme bir kişi tek seferde 20 fotoğraf yükleyebilir. Sizin hesabınızda toplamda 500 fotoğraf olabilir.' },
      { q: 'Yayın sırasında fotoğraf yüklemek zorunlu mu?', a: 'Hayır. Fotoğraf albümü özelliği isteğe bağlıdır. Dilerseniz hiç fotoğraf yüklemeden yalnızca canlı yayın özelliğini kullanabilirsiniz.' },
    ],
  },
  {
    title: 'Nikahım Çarşı',
    items: [
      { q: 'Nikahım Çarşı nedir?', a: 'Nikahım Çarşı, nikahlarına hazırlık yapan çiftlerin en çok ihtiyaç duyabilecekleri ürünleri satan mağazaları bulabilecekleri bir platformdur. Bulunduğunuz şehre göre filtreleyebilir, size en yakın gelinlikçi, kuaför, nikah şekeri üreten vb. dükkanlara ulaşabilirsiniz.' },
      { q: 'Mağazalara nasıl mesaj atarım?', a: 'Nikahım Çarşı bölümünde mağazaların ana sayfasında bulunan mesaj gönder seçeneği ile sistem içinden mesaj atabilir ya da WhatsApp linklerine tıklayarak direkt olarak mağazalar ile iletişime geçebilirsiniz.' },
    ],
  },
  {
    title: 'Hesap ve Güvenlik',
    items: [
      { q: 'Şifremi nasıl değiştiririm?', a: 'Şifrenizi uygulamamız içindeki Profilim sayfasından kendiniz değiştirebilirsiniz.' },
      { q: 'Hesabımı nasıl silerim?', a: 'Hesabınızı silmek için destek@nikahim.com adresine mail atmanız gerekir.' },
      { q: 'E-posta değiştirebilir miyim?', a: 'Evet, e-posta adresinizi Profilim bölümünden değiştirebilirsiniz.' },
      { q: 'Bilgilerim güvende mi?', a: 'Evet, Nikahım platformu bilgilerinizi kesinlikle 3. şahıslarla paylaşmaz.' },
    ],
  },
];
