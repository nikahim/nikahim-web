import FotografciPanel from "../page";

// Çifte özel fotoğrafçı linki: /fotografci/<slug>
// Fotoğrafçı bu linke gelince arama yapmaz; çift önden yüklenir, sadece 6 haneli kodu girer.
export default async function FotografciSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <FotografciPanel initialSlug={slug} />;
}
