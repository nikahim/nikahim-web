-- Baskı adedi: print_requests tablosuna qty kolonu (davetli "3 adet" seçebiliyor)
-- Supabase SQL Editor'da RUN without RLS ile çalıştır.
alter table print_requests add column if not exists qty integer not null default 1;
