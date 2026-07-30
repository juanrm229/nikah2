import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Klien service role — MENEMBUS RLS.
 *
 * Hanya boleh dipakai di Server Component, Route Handler, atau Server Action.
 * Import "server-only" di atas membuat build gagal kalau file ini sampai
 * tertarik ke bundle browser, sehingga kunci tidak mungkin bocor tanpa sadar.
 */

let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi. Lihat .env.example.",
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export const adminConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
