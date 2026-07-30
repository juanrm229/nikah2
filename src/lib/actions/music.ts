"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { isStaff } from "@/lib/scan-session";
import { line, UUID } from "@/lib/validate";
import {
  AUDIO_TYPES,
  MAX_TRACK_BYTES,
  MUSIC_BUCKET,
  TRACK_PATH_RE,
} from "@/lib/music";

/**
 * Musik latar — sisi panitia.
 *
 * Alurnya sama persis dengan photo wall (`photos.ts`): server menerbitkan
 * signed upload URL untuk path yang IA tentukan, peramban mengunggah langsung
 * ke bucket, lalu server memeriksa metadata objeknya sebelum menulis baris.
 *
 * Kenapa tidak menyuruh Server Action menerima berkasnya langsung? Batas body
 * Server Action 1 MB secara bawaan, sementara satu lagu 3–8 MB. Menaikkan batas
 * itu berarti seluruh berkas melewati server Next dua kali — sekali masuk,
 * sekali naik ke Supabase. Unggah langsung ke bucket memotong satu perjalanan.
 *
 * Bedanya dengan foto tamu: SEMUA action di sini staff-only. Tamu tidak pernah
 * menyentuhnya, jadi tidak ada honeypot dan tidak ada jeda antar unggahan —
 * penjaganya `isStaff()`.
 */

export type TrackTicket =
  | { status: "ok"; path: string; token: string }
  | { status: "denied" }
  | { status: "error"; message: string };

export type MusicResult =
  | { status: "ok"; message?: string }
  | { status: "denied" }
  | { status: "error"; message: string };

export type AdminTrack = {
  id: string;
  title: string | null;
  artist: string | null;
  url: string;
  bytes: number;
  active: boolean;
  created_at: string;
};

/**
 * Tabel `tracks` belum ada di database?
 *
 * Dibedakan dari galat lain supaya /admin bisa memberi petunjuk yang tepat
 * ("jalankan schema.sql") alih-alih "gagal memuat" yang tidak menolong.
 *
 * DUA kode, dan keduanya perlu: PostgREST menjawab permintaan ke tabel yang
 * tak dikenal dengan `PGRST205` ("Could not find the table … in the schema
 * cache") — ia tidak pernah sampai ke Postgres, jadi `42P01`
 * (undefined_table) tidak muncul di jalur itu. Sempat hanya `42P01` di sini,
 * dan akibatnya /admin memajang panel unggah yang tampak normal padahal
 * tabelnya belum ada.
 */
function noTable(error: { code?: string } | null): boolean {
  return error?.code === "PGRST205" || error?.code === "42P01";
}

export type TrackList = {
  ready: boolean; // false = tabel `tracks` belum dibuat
  tracks: AdminTrack[];
};

/** Langkah 1: izin unggah satu berkas audio. */
export async function requestTrackUpload(type: string, size: number): Promise<TrackTicket> {
  if (!(await isStaff())) return { status: "denied" };

  const ext = AUDIO_TYPES[type];
  if (!ext) {
    return { status: "error", message: "Format harus MP3, M4A, AAC, OGG, atau WAV." };
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_TRACK_BYTES) {
    return { status: "error", message: "Ukuran lagu maksimal 20 MB." };
  }

  const path = `tracks/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabaseAdmin()
    .storage.from(MUSIC_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return {
      status: "error",
      message: bucketMissing(error)
        ? 'Bucket "music" belum ada. Jalankan: npm run setup:storage'
        : "Gagal menyiapkan unggahan. Coba lagi.",
    };
  }

  return { status: "ok", path, token: data.token };
}

/**
 * Langkah 3: catat lagu yang sudah naik, lalu langsung jadikan yang aktif.
 *
 * Langsung aktif karena itu yang selalu dimaksud panitia saat mengunggah lagu
 * baru — mengunggah lalu harus menekan "Pakai" adalah satu langkah mubazir.
 * Lagu lama tidak dihapus, cuma dinonaktifkan, jadi mengembalikannya tinggal
 * satu klik.
 */
export async function recordTrack(path: string, fd: FormData): Promise<MusicResult> {
  if (!(await isStaff())) return { status: "denied" };
  if (!TRACK_PATH_RE.test(path)) return { status: "error", message: "Unggahan tidak dikenali." };

  const admin = supabaseAdmin();
  const title = line(fd, "title").slice(0, 120);
  const artist = line(fd, "artist").slice(0, 120);

  // Klien bisa berbohong soal tipe & ukuran saat meminta tiket, jadi yang
  // menentukan adalah metadata objek yang benar-benar ada di bucket.
  const slash = path.indexOf("/");
  const { data: found } = await admin.storage
    .from(MUSIC_BUCKET)
    .list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 1 });

  const meta = found?.[0]?.metadata as { size?: number; mimetype?: string } | undefined;
  if (!meta) return { status: "error", message: "Berkasnya tidak sampai. Coba unggah ulang." };

  const bytes = meta.size ?? 0;
  if (!meta.mimetype || !AUDIO_TYPES[meta.mimetype] || bytes > MAX_TRACK_BYTES) {
    await admin.storage.from(MUSIC_BUCKET).remove([path]);
    return { status: "error", message: "Lagu ditolak: format atau ukurannya tidak sesuai." };
  }

  // Nonaktifkan dulu yang lama. Indeks unik parsial `tracks_one_active_idx`
  // menolak dua baris aktif, jadi urutannya tidak boleh dibalik.
  const { error: clearErr } = await admin.from("tracks").update({ active: false }).eq("active", true);
  if (clearErr) {
    await admin.storage.from(MUSIC_BUCKET).remove([path]);
    return { status: "error", message: tableHint(clearErr) };
  }

  const { error } = await admin.from("tracks").insert({
    storage_path: path,
    title: title || null,
    artist: artist || null,
    mime: meta.mimetype,
    bytes,
    active: true,
  });

  if (error) {
    await admin.storage.from(MUSIC_BUCKET).remove([path]);
    return { status: "error", message: tableHint(error) };
  }

  return { status: "ok", message: "Lagu diunggah dan langsung dipakai." };
}

/** Semua lagu yang pernah diunggah, terbaru di atas. */
export async function listTracks(): Promise<TrackList> {
  if (!(await isStaff())) return { ready: true, tracks: [] };

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("tracks")
    .select("id, storage_path, title, artist, bytes, active, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return { ready: !noTable(error), tracks: [] };

  const rows = (data ?? []) as {
    id: string;
    storage_path: string;
    title: string | null;
    artist: string | null;
    bytes: number;
    active: boolean;
    created_at: string;
  }[];

  return {
    ready: true,
    tracks: rows.map((r) => ({
      id: r.id,
      title: r.title,
      artist: r.artist,
      url: admin.storage.from(MUSIC_BUCKET).getPublicUrl(r.storage_path).data.publicUrl,
      bytes: r.bytes,
      active: r.active,
      created_at: r.created_at,
    })),
  };
}

/**
 * Pilih lagu yang diputar, atau matikan musik sama sekali (`id: null`).
 *
 * Mematikan lewat sini, bukan lewat `wedding.music.enabled`, karena yang kedua
 * butuh commit + deploy — sementara ini keputusan yang mungkin diambil satu jam
 * sebelum acara.
 */
export async function setActiveTrack(id: string | null): Promise<MusicResult> {
  if (!(await isStaff())) return { status: "denied" };
  if (id !== null && !UUID.test(id)) return { status: "error", message: "Lagu tidak dikenali." };

  const admin = supabaseAdmin();
  const { error: clearErr } = await admin.from("tracks").update({ active: false }).eq("active", true);
  if (clearErr) return { status: "error", message: tableHint(clearErr) };

  if (id === null) return { status: "ok", message: "Musik latar dimatikan." };

  const { error } = await admin.from("tracks").update({ active: true }).eq("id", id);
  return error
    ? { status: "error", message: tableHint(error) }
    : { status: "ok", message: "Lagu ini yang akan diputar." };
}

/** Hapus lagu — barisnya DAN objeknya, seperti aturan menolak foto. */
export async function deleteTrack(id: string): Promise<MusicResult> {
  if (!(await isStaff())) return { status: "denied" };
  if (!UUID.test(id)) return { status: "error", message: "Lagu tidak dikenali." };

  const admin = supabaseAdmin();

  // Path dibaca dulu — sesudah barisnya hilang tidak ada lagi yang tahu objek
  // mana yang harus ikut dihapus.
  const { data } = await admin.from("tracks").select("storage_path").eq("id", id).maybeSingle();
  const path = (data?.storage_path as string | undefined) ?? null;

  const { error } = await admin.from("tracks").delete().eq("id", id);
  if (error) return { status: "error", message: tableHint(error) };

  if (path) await admin.storage.from(MUSIC_BUCKET).remove([path]);
  return { status: "ok", message: "Lagu dihapus." };
}

/** Galat storage yang berarti bucketnya sendiri belum dibuat. */
function bucketMissing(error: { message?: string } | null): boolean {
  return !!error?.message && /bucket not found/i.test(error.message);
}

function tableHint(error: { code?: string }): string {
  return noTable(error)
    ? "Tabel `tracks` belum ada. Jalankan ulang supabase/schema.sql."
    : "Gagal menyimpan. Coba lagi.";
}
