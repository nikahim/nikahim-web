-- Davetli cihaz kimliği: aynı isimli iki farklı davetliyi (ör. iki "Ali Ağa") ayırmak için.
-- Her cihaz localStorage'da benzersiz bir id üretir; yükleme ve baskı taleplerine eklenir.
-- Supabase SQL Editor'da RUN without RLS ile çalıştır.
alter table guest_photos   add column if not exists device_id text;
alter table print_requests add column if not exists device_id text;

-- Sorgu performansı için (opsiyonel ama önerilir)
create index if not exists idx_guest_photos_device   on guest_photos   (event_id, device_id);
create index if not exists idx_print_requests_device on print_requests (event_id, device_id);
