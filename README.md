# Undangan Pernikahan — Tenun × Paspor

Undangan pernikahan digital berbentuk **paspor**: sampul bermotif tenun ikat, halaman
data diri mempelai dengan baris MRZ asli (ICAO 9303 TD3), stempel imigrasi yang membubuh
saat digulir, papan jadwal split-flap ala bandara, dan rute perjalanan cinta yang digambar
sebagai jalur penerbangan.

Motif ikatnya diturunkan dari kain yang dipakai mempelai di foto prewedding, digambar
sebagai **geometri SVG** — bukan foto kain yang ditempel.

## Teknologi

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS v4 · GSAP · Lenis ·
Motion · Supabase · `qrcode` · `@zxing/browser`

> **Ini bukan Next.js yang biasa.** Versi 16 punya perubahan yang memutus kompatibilitas:
> `params`/`searchParams` sekarang Promise dan wajib di-`await`, `middleware.ts` berganti
> nama menjadi `proxy.ts`, dan runtime `edge` tidak didukung. Baca panduan di
> `node_modules/next/dist/docs/` sebelum menulis kode — lihat [AGENTS.md](AGENTS.md).

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000.

Verifikasi kualitas sebelum commit:

```bash
./node_modules/.bin/tsc --noEmit && npm run lint
```

> Pakai biner TypeScript lokal seperti di atas. `npx tsc` akan mengunduh paket `tsc`
> yang salah (bukan milik TypeScript).

## Konfigurasi

### Isi undangan

Semua teks, tanggal, foto, dan data mempelai berada di satu tempat:
[`src/config/wedding.ts`](src/config/wedding.ts). Saat ini masih ada **32 penanda `TODO`**
berisi placeholder — nama, tanggal, alamat venue, cerita perjalanan, dan nomor rekening di
sana belum data asli.

### Variabel lingkungan

Salin `.env.example` menjadi `.env.local`, lalu isi dari Supabase → Project Settings → API:

| Variabel | Keterangan |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Aman terekspos ke browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Aman terekspos ke browser |
| `SUPABASE_SERVICE_ROLE_KEY` | **Rahasia.** Menembus RLS. Server saja — jangan pernah diberi awalan `NEXT_PUBLIC_` |
| `ADMIN_PASSWORD` | Kata sandi halaman petugas (`/scan`) dan panel moderasi (`/admin`) |
| `NEXT_PUBLIC_SITE_URL` | Alamat produksi, dipakai membentuk isi QR check-in |

Tanpa env ini undangan tetap jalan: `liveEnabled` di
[`src/lib/supabase/client.ts`](src/lib/supabase/client.ts) mendeteksi env kosong dan
menyembunyikan fitur live.

### Database

1. Buat proyek Supabase.
2. Tempel isi [`supabase/schema.sql`](supabase/schema.sql) ke SQL Editor, jalankan.
   Skemanya membuat tabel `guests`, `rsvps`, `wishes`, `songs`, `photos`, `checkins`
   beserta policy RLS-nya.
3. Buat bucket storage bernama `wall` dengan setelan **private**, lalu jalankan bagian
   storage policy di akhir `schema.sql`.

## Struktur

```
src/
  config/wedding.ts        ← satu-satunya sumber isi undangan
  app/
    layout.tsx             ← font, metadata (robots: noindex)
    page.tsx               ← undangan umum
    globals.css            ← token desain + utilitas (foil, mrz, perforated-y, grain)
  components/
    invitation.tsx         ← rangka; mengatur sampul vs isi
    sections/              ← cover, bismillah, couple, journey, countdown,
                             rundown, venue, gallery
    passport/              ← PassportPage, stamp, split-flap
    tenun/                 ← motif ikat SVG + emblem medali tenun
    motion/                ← scroll provider, reveal, use-reduced-motion
  lib/
    mrz.ts                 ← ICAO 9303, generik & teruji dengan vektor resmi
    wedding-mrz.ts         ← pemetaan field paspor ke makna pernikahan
    datetime.ts            ← format tanggal, countdown, haversine, berkas .ics
    supabase/              ← client (anon), admin (service role, server-only), types
supabase/schema.sql
```

## Keputusan yang jangan diubah tanpa alasan

**Daftar tamu tidak boleh sampai ke browser.** Tabel `guests` sengaja tidak punya policy
anon — hanya service role yang bisa mengaksesnya, dan rute `/to/[slug]` wajib dirender di
server. Kalau daftar tamu dibuka ke klien, siapa pun yang menerima link bisa memanen nama
dan nomor meja semua tamu. QR check-in memakai `checkin_code` acak yang terpisah dari
`slug`, supaya URL check-in orang lain tidak bisa ditebak.

**Lokasi tamu tidak pernah dikirim ke mana pun.** Geolocation hanya diminta setelah tamu
menekan tombol, tidak pernah otomatis, dan perhitungan jaraknya selesai di perangkat tamu.

**`robots: { index: false }`** di `layout.tsx` — undangan tidak boleh terindeks mesin pencari.

**Masa berlaku MRZ `991231`** bukan angka asal: 31 Desember 2099, cara terdekat yang bisa
dikatakan format paspor untuk "selamanya". Easter egg — biarkan.

## Status

Sudah jalan: sampul paspor (miring mengikuti gyro HP / kursor desktop), halaman Bismillah,
halaman data diri mempelai, rute perjalanan, hitung mundur, papan keberangkatan split-flap,
kartu keberangkatan (peta + simpan ke kalender + jarak tamu ke lokasi), galeri lembar visa,
sistem stempel, MRZ, dan skema database.

Belum dikerjakan: boarding pass personal `/to/[slug]`, halaman petugas `/scan`, layar venue
`/live`, panel `/admin`, RSVP, request lagu, photo wall, amplop digital QRIS, buku tamu,
section penutup, dan pemutar musik latar.
