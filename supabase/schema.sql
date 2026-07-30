-- ════════════════════════════════════════════════════════════════════════════
-- Skema undangan pernikahan.
-- Jalankan sekali di Supabase → SQL Editor.
--
-- Prinsip keamanan:
--   Daftar tamu TIDAK PERNAH bisa dibaca oleh anon key. Halaman /to/[slug]
--   dirender di server memakai service role, jadi tamu tidak bisa memanen
--   nama & nomor meja tamu lain. Yang boleh dilakukan anon key hanya:
--   mengisi RSVP, menulis ucapan, request lagu, dan unggah foto.
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
-- ════════════════════════════════════════════════════════════════════════════

alter table guests   enable row level security;
alter table rsvps    enable row level security;
alter table wishes   enable row level security;
alter table songs    enable row level security;
alter table photos   enable row level security;
alter table checkins enable row level security;

-- guests: tanpa policy apa pun untuk anon → hanya service role yang bisa akses.

-- rsvps: tamu boleh mengirim, tidak boleh membaca punya orang lain.
drop policy if exists "anon insert rsvp" on rsvps;
create policy "anon insert rsvp" on rsvps for insert to anon with check (true);

-- wishes: boleh menulis, dan boleh membaca yang sudah disetujui.
drop policy if exists "anon insert wish" on wishes;
create policy "anon insert wish" on wishes for insert to anon with check (true);

drop policy if exists "anon read approved wishes" on wishes;
create policy "anon read approved wishes" on wishes for select to anon using (approved);

-- songs: boleh request, tidak boleh melihat daftar (biar tidak jadi ajang adu).
drop policy if exists "anon insert song" on songs;
create policy "anon insert song" on songs for insert to anon with check (true);

-- photos: boleh unggah, hanya bisa melihat yang lolos moderasi.
drop policy if exists "anon insert photo" on photos;
create policy "anon insert photo" on photos for insert to anon with check (true);

drop policy if exists "anon read approved photos" on photos;
create policy "anon read approved photos" on photos for select to anon using (approved);

-- checkins: murni service role (dipakai route /scan yang dijaga password).

-- ════════════════════════════════════════════════════════════════════════════
-- Realtime — layar venue /live mendengarkan dua tabel ini.
-- ════════════════════════════════════════════════════════════════════════════
alter publication supabase_realtime add table photos;
alter publication supabase_realtime add table wishes;

-- ════════════════════════════════════════════════════════════════════════════
-- Storage: bucket foto tamu.
-- Jalankan setelah membuat bucket "wall" (public: false) lewat dashboard.
-- ════════════════════════════════════════════════════════════════════════════
-- Tamu boleh unggah, tidak boleh menimpa atau menghapus file orang lain.
drop policy if exists "anon upload wall" on storage.objects;
create policy "anon upload wall" on storage.objects
  for insert to anon with check (bucket_id = 'wall');
