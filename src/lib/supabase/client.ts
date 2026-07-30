import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Klien untuk browser. Memakai anon key, jadi hanya bisa melakukan apa yang
 * diizinkan RLS: kirim RSVP, tulis ucapan, request lagu, unggah foto, serta
 * membaca ucapan & foto yang sudah lolos moderasi.
 *
 * Daftar tamu tidak dapat disentuh dari sini — itu disengaja.
 */

let cached: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi. Lihat .env.example.",
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 4 } },
  });
  return cached;
}

/** Apakah fitur live aktif — dipakai untuk menyembunyikan UI kalau env kosong. */
export const liveEnabled =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
