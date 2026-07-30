import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Sesi petugas untuk /scan (dan nanti /admin).
 *
 * Sengaja BUKAN modul "use server": kalau helper di sini diekspor dari modul
 * Server Action, semuanya otomatis jadi endpoint POST yang bisa dipanggil dari
 * peramban. Yang boleh jadi endpoint hanya `login`/`logout`/`checkIn` di
 * `lib/actions/checkin.ts`.
 *
 * Isi cookie-nya bukan `"true"`, tapi hash dari ADMIN_PASSWORD. Bedanya penting:
 * cookie bernilai `"true"` bisa dikarang siapa pun lewat DevTools, sedangkan
 * hash ini tidak bisa dibentuk tanpa tahu passwordnya. Ganti ADMIN_PASSWORD
 * otomatis membatalkan semua sesi lama.
 */

const COOKIE = "scan_session";
const MAX_AGE = 60 * 60 * 12; // satu hari kerja resepsi

function sha256(s: string) {
  return createHash("sha256").update(s).digest();
}

/** Token sesi yang sah untuk password yang sedang dipakai. */
function expectedToken(): string | null {
  const pwd = process.env.ADMIN_PASSWORD;
  if (!pwd) return null;
  return createHash("sha256").update(`scan-session:${pwd}`).digest("hex");
}

/**
 * Apakah password yang dikirim benar.
 *
 * Dibandingkan sebagai hash, bukan string mentah: `timingSafeEqual` melempar
 * kalau panjang buffer beda, dan panjang password justru tidak boleh ikut
 * terbaca dari lama-tidaknya respons.
 */
export function passwordMatches(input: string): boolean {
  const pwd = process.env.ADMIN_PASSWORD;
  if (!pwd) return false;
  return timingSafeEqual(sha256(input), sha256(pwd));
}

/** Petugas sudah masuk? Aman dipanggil dari Server Component. */
export async function isStaff(): Promise<boolean> {
  const want = expectedToken();
  if (!want) return false;

  const got = (await cookies()).get(COOKIE)?.value ?? "";
  if (got.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(got, "utf8"), Buffer.from(want, "utf8"));
}

/** Hanya boleh dipanggil dari Server Action / Route Handler. */
export async function startSession() {
  const token = expectedToken();
  if (!token) return;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/** ADMIN_PASSWORD terpasang? Dipakai halaman untuk memberi pesan jelas. */
export const adminPasswordSet = !!process.env.ADMIN_PASSWORD;
