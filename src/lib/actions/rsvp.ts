"use server";

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { UUID, integer, line, looksLikeBot, phoneOrNull } from "@/lib/validate";
import type { Attendance } from "@/lib/supabase/types";

/**
 * Checkpoint imigrasi: tamu menyatakan hadir atau tidak.
 *
 * Ditulis memakai service role, bukan anon key dari browser, karena:
 *   - `rsvps.guest_id` unik, jadi tamu yang mengubah jawabannya butuh UPSERT.
 *     Lewat anon INSERT, kiriman kedua akan ditolak constraint.
 *   - guest_id diturunkan dari slug di server, bukan dikirim klien. Kalau klien
 *     yang mengirim, tamu bisa menuliskan RSVP atas nama guest_id orang lain.
 *   - panjang teks & honeypot bisa diperiksa sebelum menyentuh database.
 */

export type RsvpResult =
  | { status: "idle" }
  | { status: "ok"; attending: Attendance; name: string; headcount: number }
  | { status: "error"; message: string };

const ATTENDING = new Set(["hadir", "tidak", "ragu"]);

/** Menandai RSVP tamu tanpa slug, supaya kiriman kedua mengubah, bukan menumpuk. */
const COOKIE = "rsvp_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 240; // ± 8 bulan, melewati hari acara

export async function submitRsvp(
  /** Slug dari /to/[slug]. Inilah "kredensial" tamu — bukan guest_id dari klien. */
  slug: string | null,
  _prev: RsvpResult,
  fd: FormData,
): Promise<RsvpResult> {
  const name = line(fd, "name").slice(0, 60);
  const rawAttending = line(fd, "attending");
  const phone = phoneOrNull(fd, "phone");

  if (!name) return { status: "error", message: "Nama masih kosong." };
  if (!ATTENDING.has(rawAttending)) {
    return { status: "error", message: "Pilih dulu hadir atau tidak." };
  }
  const attending = rawAttending as Attendance;

  // Yang menyatakan tidak hadir selalu 0, apa pun yang dikirim.
  let headcount = attending === "tidak" ? 0 : integer(fd, "headcount", 1, 20, 1);

  // Jebakan bot: berhenti SETELAH validasi supaya balasannya tidak bisa
  // dipakai membedakan "honeypot kena" dari "kiriman sukses".
  if (looksLikeBot(fd)) return { status: "ok", attending, name, headcount };

  const admin = supabaseAdmin();

  let guestId: string | null = null;
  if (slug) {
    const { data: guest, error } = await admin
      .from("guests")
      .select("id, seats")
      .eq("slug", slug)
      .maybeSingle();

    if (error) return { status: "error", message: "Gagal membaca data tamu." };
    if (guest) {
      guestId = guest.id as string;
      // Dijepit ke jumlah kursi yang diundang — catering dihitung dari sini.
      const seats = typeof guest.seats === "number" ? guest.seats : 2;
      if (attending !== "tidak") headcount = Math.min(headcount, Math.max(1, seats));
    }
  }

  const payload = {
    name,
    attending,
    headcount,
    phone,
    updated_at: new Date().toISOString(),
  };

  // ── Tamu dengan link personal: satu baris per tamu, bisa diperbarui ────────
  if (guestId) {
    const { error } = await admin
      .from("rsvps")
      .upsert({ guest_id: guestId, ...payload }, { onConflict: "guest_id" });

    if (error) return { status: "error", message: "Gagal menyimpan. Coba lagi ya." };
    return { status: "ok", attending, name, headcount };
  }

  // ── Tamu umum: dilacak lewat cookie httpOnly ───────────────────────────────
  const jar = await cookies();
  const prevId = jar.get(COOKIE)?.value;

  if (prevId && UUID.test(prevId)) {
    const { data, error } = await admin
      .from("rsvps")
      .update(payload)
      // `.is("guest_id", null)` penting: mencegah cookie curian dipakai
      // menimpa RSVP tamu yang punya link personal.
      .eq("id", prevId)
      .is("guest_id", null)
      .select("id")
      .maybeSingle();

    if (!error && data) return { status: "ok", attending, name, headcount };
    // Baris sudah hilang (mis. database direset) — jatuh ke insert di bawah.
  }

  const { data: inserted, error: insertError } = await admin
    .from("rsvps")
    .insert({ guest_id: null, ...payload })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { status: "error", message: "Gagal menyimpan. Coba lagi ya." };
  }

  jar.set(COOKIE, inserted.id as string, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return { status: "ok", attending, name, headcount };
}
