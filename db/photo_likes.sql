-- photo_likes table — davetli fotoğraf beğenileri (anonim, deduped per device)
-- Çalıştırma: Supabase Studio > SQL Editor > paste & run

create table if not exists public.photo_likes (
  id bigserial primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  photo_url text not null,
  viewer_key text not null,
  viewer_name text,
  created_at timestamptz default now()
);

-- Aynı cihazdan aynı fotoğrafa bir kez like (toggle için unique)
create unique index if not exists uniq_photo_likes_event_photo_viewer
  on public.photo_likes(event_id, photo_url, viewer_key);

-- Sayım sorgusu için
create index if not exists idx_photo_likes_event_photo
  on public.photo_likes(event_id, photo_url);

-- RLS — herkes okuyabilir, herkes yazabilir (davetli flow)
alter table public.photo_likes enable row level security;

drop policy if exists "anyone can read photo_likes" on public.photo_likes;
create policy "anyone can read photo_likes"
  on public.photo_likes for select using (true);

drop policy if exists "anyone can insert photo_likes" on public.photo_likes;
create policy "anyone can insert photo_likes"
  on public.photo_likes for insert with check (true);

drop policy if exists "anyone can delete photo_likes" on public.photo_likes;
create policy "anyone can delete photo_likes"
  on public.photo_likes for delete using (true);

-- Realtime publication (canli sayfada sayaç anlık güncellensin)
alter publication supabase_realtime add table public.photo_likes;
