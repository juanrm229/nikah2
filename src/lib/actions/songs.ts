"use server";

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { line, looksLikeBot } from "@/lib/validate";

/**
 * Request lagu — hiburan dalam kabin.
 *
 * Berbeda dari buku tamu: daftar lagu **sengaja tidak bisa dibaca anon**
 * (tabel `songs` tidak punya policy apa pun, lihat supabase/schema.sql).
 * Kalau daftarnya dipajang, kolom request berubah jadi ajang adu request —
 * tamu melihat lagu orang lain lalu ikut menimpanya, dan yang paling banyak
 * mengirim yang menang. Panitia melihat daftarnya di /admin; tamu hanya
 * melihat lagu yang ia kirim sendiri.
 */

export type SongResult =
  | { status: "idle" }
  | { status: "ok"; song: SentSong }
  | { status: "error"; message: string };

/** Lagu yang baru dikirim, dikembalikan supaya tamu melihat kirimannya sendiri. */
export type SentSong = { id: string; title: string; artist: string | null };

const MAX_TITLE = 120;
const MAX_ARTIST = 120;
const MAX_REQUESTER = 60;

/** Jeda minimum antar request dari satu peramban. */
const COOLDOWN_MS = 15_000;
const COOKIE = "song_at";

export async function submitSong(
  slug: string | null,
  _prev: SongResult,
  fd: FormData,
): Promise<SongResult> {
  const title = line(fd, "title").slice(0, MAX_TITLE);
  const artist = line(fd, "artist").slice(0, MAX_ARTIST) || null;
  const requester = line(fd, "requester").slice(0, MAX_REQUESTER) || null;

  if (!title) return { status: "error", message: "Judul lagunya masih kosong." };

  const jar = await cookies();
  const last = Number.parseInt(jar.get(COOKIE)?.value ?? "", 10);
  const now = Date.now();
  if (Number.isFinite(last) && now - last < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
    return { status: "error", message: `Tunggu ${wait} detik sebelum request lagi.` };
  }

  if (looksLikeBot(fd)) {
    // Balasan menyerupai sukses, tapi tidak ada yang ditulis.
    return { status: "ok", song: { id: "honeypot", title, artist } };
  }

  const admin = supabaseAdmin();

  // guest_id diturunkan dari slug di server, tidak pernah dari klien.
  let guestId: string | null = null;
  if (slug) {
    const { data: guest } = await admin
      .from("guests")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    guestId = (guest?.id as string | undefined) ?? null;
  }

  const { data, error } = await admin
    .from("songs")
    .insert({ guest_id: guestId, title, artist, requester })
    .select("id, title, artist")
    .single();

  if (error || !data) return { status: "error", message: "Gagal mengirim. Coba lagi ya." };

  jar.set(COOKIE, String(now), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return { status: "ok", song: data as SentSong };
}
