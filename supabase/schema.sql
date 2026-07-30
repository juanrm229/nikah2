-- ════════════════════════════════════════════════════════════════════════════
-- Skema undangan pernikahan.
-- Jalankan di Supabase → SQL Editor. Aman dijalankan berulang kali (idempoten).
--
-- Prinsip keamanan:
--   1. Daftar tamu TIDAK PERNAH bisa dibaca anon key. Halaman /to/[slug]
--      dirender di server memakai service role, jadi tamu tidak bisa memanen
--      nama & nomor meja tamu lain.
--   2. TIDAK ADA satu pun policy INSERT untuk anon. Seluruh tulisan (RSVP,
--      ucapan, request lagu, foto) masuk lewat Server Action memakai service
--      role. Anon key ikut terkirim ke browser dan bisa dibaca siapa pun, jadi
--      memberinya hak INSERT sama dengan membuka endpoint tulis publik tanpa
--      validasi — orang bisa membanjiri tabel dengan curl. Server Action bisa
--      memvalidasi panjang teks, menolak honeypot, dan meng-upsert RSVP.
--   3. Yang boleh dilakukan anon key HANYA membaca baris yang sudah lolos
--      moderasi — itu perlu supaya Realtime bisa mendorong ucapan & foto baru
--      ke layar venue tanpa polling.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Tamu ────────────────────────────────────────────────────────────────────
create table if not exists guests (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,              -- dipakai di /to/[slug]
  name         text not null,                     -- nama yang dicetak di undangan
  greeting     text,                              -- sapaan khusus, opsional
  table_no     text,                              -- nomor meja
  seats        int  not null default 2,           -- jumlah orang yang diundang
  group_name   text,                              -- keluarga / kantor / teman
  -- Kode rahasia yang ditanam di QR. Bukan slug, supaya orang tidak bisa
  -- menebak URL check-in tamu lain dari link undangan yang tersebar.
  checkin_code text unique not null default encode(gen_random_bytes(12), 'hex'),
  created_at   timestamptz not null default now()
);

create index if not exists guests_slug_idx on guests (slug);

-- ── RSVP ────────────────────────────────────────────────────────────────────
create table if not exists rsvps (
  id         uuid primary key default gen_random_uuid(),
  guest_id   uuid unique references guests (id) on delete cascade,
  name       text not null,
  attending  text not null check (attending in ('hadir', 'tidak', 'ragu')),
  headcount  int  not null default 1 check (headcount between 0 and 20),
  phone      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Buku tamu ───────────────────────────────────────────────────────────────
create table if not exists wishes (
  id         uuid primary key default gen_random_uuid(),
  guest_id   uuid references guests (id) on delete set null,
  name       text not null check (char_length(name) between 1 and 60),
  message    text not null check (char_length(message) between 1 and 500),
  approved   boolean not null default true,  -- ucapan tampil langsung
  created_at timestamptz not null default now()
);

create index if not exists wishes_feed_idx on wishes (approved, created_at desc);

-- ── Request lagu ────────────────────────────────────────────────────────────
create table if not exists songs (
  id         uuid primary key default gen_random_uuid(),
  guest_id   uuid references guests (id) on delete set null,
  title      text not null check (char_length(title) between 1 and 120),
  artist     text check (char_length(artist) <= 120),
  requester  text check (char_length(requester) <= 60),
  played     boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── Photo wall ──────────────────────────────────────────────────────────────
create table if not exists photos (
  id           uuid primary key default gen_random_uuid(),
  guest_id     uuid references guests (id) on delete set null,
  storage_path text not null,                    -- path di bucket "wall"
  caption      text check (char_length(caption) <= 200),
  uploader     text check (char_length(uploader) <= 60),
  -- Foto WAJIB dimoderasi sebelum muncul di layar venue.
  approved     boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists photos_feed_idx on photos (approved, created_at desc);

-- ── Musik latar ─────────────────────────────────────────────────────────────
-- Berkasnya diunggah panitia lewat /admin, bukan ditaruh di /public. Alasannya:
-- mengganti lagu jadi tidak perlu commit + deploy ulang, dan berkas audio
-- beberapa MB tidak ikut membengkakkan repo.
--
-- Boleh ada banyak baris (panitia mencoba beberapa lagu), tapi hanya SATU yang
-- aktif — dijaga indeks unik parsial di bawah, bukan cuma oleh kode aplikasi.
create table if not exists tracks (
  id           uuid primary key default gen_random_uuid(),
  storage_path text unique not null,               -- path di bucket "music"
  title        text check (char_length(title) <= 120),
  artist       text check (char_length(artist) <= 120),
  mime         text not null,
  bytes        bigint not null,
  active       boolean not null default false,
  created_at   timestamptz not null default now()
);

-- "where active" membuat batasnya hanya berlaku pada baris yang aktif, jadi
-- baris nonaktif boleh sebanyak apa pun.
create unique index if not exists tracks_one_active_idx on tracks (active) where active;

-- ── Check-in di pintu ───────────────────────────────────────────────────────
create table if not exists checkins (
  id         uuid primary key default gen_random_uuid(),
  guest_id   uuid not null references guests (id) on delete cascade,
  headcount  int  not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists checkins_recent_idx on checkins (created_at desc);

-- ════════════════════════════════════════════════════════════════════════════
-- Row Level Security
--
-- Service role menembus RLS sepenuhnya, jadi mengaktifkan RLS di sini TIDAK
-- menghalangi Server Action. Yang dibatasi hanya anon key milik browser.
-- ════════════════════════════════════════════════════════════════════════════

alter table guests   enable row level security;
alter table rsvps    enable row level security;
alter table wishes   enable row level security;
alter table songs    enable row level security;
alter table photos   enable row level security;
alter table checkins enable row level security;
alter table tracks   enable row level security;

-- guests, rsvps, songs, checkins, tracks: tanpa policy apa pun → anon tidak bisa
-- membaca maupun menulis. RSVP & request lagu memang tidak perlu dibaca tamu,
-- dan daftar lagu sengaja disembunyikan supaya tidak jadi ajang adu request.
-- `tracks` dibaca server saat merender undangan, jadi anon juga tidak perlu.

-- Sisa policy anon INSERT dari versi awal skema ini dihapus kalau masih ada.
-- (Aman dijalankan di database baru — DROP ... IF EXISTS tidak error.)
drop policy if exists "anon insert rsvp"  on rsvps;
drop policy if exists "anon insert wish"  on wishes;
drop policy if exists "anon insert song"  on songs;
drop policy if exists "anon insert photo" on photos;
drop policy if exists "anon upload wall"  on storage.objects;

-- wishes & photos: anon HANYA boleh membaca yang sudah lolos moderasi.
-- Ini satu-satunya hak anon, dan hanya ada supaya Realtime bisa mendorong
-- baris baru ke layar venue /live.
drop policy if exists "anon read approved wishes" on wishes;
create policy "anon read approved wishes" on wishes for select to anon using (approved);

drop policy if exists "anon read approved photos" on photos;
create policy "anon read approved photos" on photos for select to anon using (approved);

-- ════════════════════════════════════════════════════════════════════════════
-- Realtime — layar venue /live mendengarkan dua tabel ini.
--
-- ALTER PUBLICATION ... ADD TABLE error kalau tabelnya sudah jadi anggota,
-- jadi dibungkus penjaga agar seluruh berkas ini tetap bisa dijalankan ulang.
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  -- Publikasi ini dibuat Supabase sendiri. Kalau belum ada, lewati saja —
  -- fitur lain tetap jalan, hanya dorongan realtime yang tidak aktif.
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'Publikasi supabase_realtime tidak ditemukan; realtime dilewati.';
    return;
  end if;

  for t in select unnest(array['photos', 'wishes']) loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Storage
--
-- Ada DUA bucket, dan keduanya dibuat oleh skrip, bukan tangan:
--
--   npm run setup:storage
--
-- Skrip itu (`scripts/setup-storage.mjs`) idempoten dan memakai service role,
-- jadi ia sekaligus MEMASANG BATAS yang tidak dibawa signed upload URL:
--
--   • wall  — private, 8 MB,  image/jpeg image/png image/webp
--   • music — public,  20 MB, audio/mpeg audio/mp4 audio/aac audio/ogg
--                             audio/wav audio/webm audio/x-m4a
--
-- Batas itu penting karena signed upload URL TIDAK membawa batas ukuran
-- sendiri. Server tetap memeriksa ulang metadata objek sesudahnya
-- (`recordPhoto` / `recordTrack`) dan menghapus yang tidak lolos, tapi
-- pemeriksaan itu baru terjadi setelah kuotanya terpakai.
--
-- TIDAK ada policy storage yang perlu dijalankan. Unggahan foto tamu memakai
-- signed upload URL yang dibuat Server Action (service role), dan foto dibaca
-- lewat signed download URL. Artinya anon key tidak punya hak apa pun atas
-- bucket "wall" — tidak bisa unggah sembarangan, tidak bisa menebak URL berkas.
--
-- Bucket "music" sengaja PUBLIC, dan itu bukan kelalaian: berkasnya satu lagu
-- yang memang diputar ke semua tamu, tidak ada isi pribadi di dalamnya. URL
-- bertanda tangan justru merugikan di sini — ia berbeda untuk tiap tamu
-- sehingga CDN tidak pernah bisa memakai ulang cache-nya, dan ia kedaluwarsa
-- di tengah kunjungan yang panjang. Unggahannya tetap tertutup: hanya panitia
-- yang lolos `isStaff()` yang bisa meminta signed upload URL.
-- ════════════════════════════════════════════════════════════════════════════
