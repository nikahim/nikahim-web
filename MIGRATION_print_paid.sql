-- Tahsilat: fotoğrafçı bir davetlinin baskılarının ücretini tahsil ettiğinde işaretler.
-- Supabase SQL Editor'da RUN without RLS ile çalıştır.
alter table print_requests add column if not exists paid boolean not null default false;
