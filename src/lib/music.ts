import "server-only";
import { supabaseAdmin, adminConfigured } from "@/lib/supabase/admin";

/**
 * Musik latar — bagian yang dibaca saat merender undangan.
 *
 * Sengaja BUKAN modul "use server". Semua yang diekspor dari modul Server
 * Action otomatis jadi endpoint POST publik, dan aturan main proyek ini
 * (lihat `scan-session.ts`) adalah: yang jadi endpoint hanya yang memang perlu
 * dipanggil dari peramban. `activeTrack()` cuma dipanggil server saat render.
 *
 * Tetapan bucket & format ditaruh di sini, lalu diimpor `lib/actions/music.ts`,
 * supaya tidak ada dua daftar MIME yang bisa berbeda diam-diam.
 */

export const MUSIC_BUCKET = "music";

/**
 * Format yang benar-benar bisa diputar `<audio>` di peramban tamu.
 *
 * `audio/x-m4a` ikut karena itulah yang dikirim Safari & sebagian Android untuk
 * berkas .m4a — sama isinya dengan `audio/mp4`, beda namanya saja.
 */
export const AUDIO_TYPES: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "weba",
};

export const MAX_TRACK_BYTES = 20 * 1024 * 1024;

/** Path yang kita terbitkan sendiri: `tracks/<uuid>.<ext>`. */
export const TRACK_PATH_RE = /^tracks\/[0-9a-f-]{36}\.(mp3|m4a|aac|ogg|wav|weba)$/;

/** Yang diseberangkan ke peramban tamu. Path storage tidak ikut. */
export type ActiveTrack = {
  url: string;
  title: string;
  artist: string | null;
};

/**
 * Lagu yang sedang aktif, siap dipasang ke `<audio>`.
 *
 * Mengembalikan `null` untuk SEMUA kegagalan yang wajar — env belum diisi,
 * tabel `tracks` belum dibuat, belum ada lagu yang diunggah. Undangan tidak
 * boleh gagal dirender hanya karena musiknya belum siap; pemutarnya cukup
 * tidak muncul.
 */
export async function activeTrack(): Promise<ActiveTrack | null> {
  if (!adminConfigured) return null;

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("tracks")
    .select("storage_path, title, artist")
    .eq("active", true)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as { storage_path: string; title: string | null; artist: string | null };
  const { data: pub } = admin.storage.from(MUSIC_BUCKET).getPublicUrl(row.storage_path);
  if (!pub?.publicUrl) return null;

  return {
    url: pub.publicUrl,
    title: row.title?.trim() || "Musik latar",
    artist: row.artist?.trim() || null,
  };
}
