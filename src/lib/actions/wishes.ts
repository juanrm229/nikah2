"use server";

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { line, looksLikeBot, paragraph } from "@/lib/validate";
import type { Wish } from "@/lib/supabase/types";

/**
 * Buku tamu — ucapan berbentuk label bagasi.
 *
 * Menulis lewat service role supaya panjang teks bisa dipangkas dan ada jeda
 * antar kiriman. Membaca justru TIDAK lewat sini: klien membaca sendiri dengan
 * anon key (policy "anon read approved wishes"), karena feed-nya perlu ikut
 * mendengar Realtime.
 */

export type WishResult =
  | { status: "idle" }
  | { status: "ok"; wish: PublicWish }
  | { status: "error"; message: string };

/** Hanya bagian yang benar-benar dirender — guest_id & approved tidak dikirim balik. */
export type PublicWish = Pick<Wish, "id" | "name" | "message" | "created_at">;

const MAX_NAME = 60;
const MAX_MESSAGE = 500;

/** Jeda minimum antar ucapan dari satu peramban. */
const COOLDOWN_MS = 20_000;
const COOKIE = "wish_at";

export async function submitWish(
  slug: string | null,
  _prev: WishResult,
  fd: FormData,
): Promise<WishResult> {
  const name = line(fd, "name").slice(0, MAX_NAME);
  const message = paragraph(fd, "message").slice(0, MAX_MESSAGE);

  if (!name) return { status: "error", message: "Nama masih kosong." };
  if (!message) return { status: "error", message: "Ucapannya masih kosong." };

  const jar = await cookies();
  const last = Number.parseInt(jar.get(COOKIE)?.value ?? "", 10);
  const now = Date.now();
  if (Number.isFinite(last) && now - last < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
    return { status: "error", message: `Tunggu ${wait} detik sebelum menulis lagi.` };
  }

  if (looksLikeBot(fd)) {
    // Balasan dibuat menyerupai sukses, tapi tidak ada yang ditulis.
    return {
      status: "ok",
      wish: { id: "honeypot", name, message, created_at: new Date().toISOString() },
    };
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
    .from("wishes")
    .insert({ guest_id: guestId, name, message })
    .select("id, name, message, created_at")
    .single();

  if (error || !data) return { status: "error", message: "Gagal mengirim. Coba lagi ya." };

  jar.set(COOKIE, String(now), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return { status: "ok", wish: data as PublicWish };
}
