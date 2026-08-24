-- Fotoğrafçı paneli 4'lü durum akışı: Beklemede -> Baskıda -> Tamamladı -> Teslim Edildi
-- status text değerleri: 'pending' | 'printing' | 'printed' | 'delivered'
-- Teslim edilince paid=true (tahsil edildi) + delivered_at damgalanır.
alter table print_requests add column if not exists delivered_at timestamptz;
