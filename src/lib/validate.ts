/**
 * Pembersih & pemeriksa input untuk Server Action.
 *
 * Server Action adalah endpoint POST publik — siapa pun bisa mengirim body
 * apa saja tanpa lewat form kita. Jadi seluruh isi FormData di sini dianggap
 * tidak dipercaya, termasuk field yang di UI-nya sudah `required`.
 */

/**
 * Karakter kendali yang dibuang. Sengaja TIDAK memuat tab (U+0009),
 * newline (U+000A), dan carriage return (U+000D) — ketiganya ditangani
 * terpisah supaya ucapan multi-baris tidak rusak.
 */
const CONTROL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/** Ambil satu baris teks: kendali dibuang, seluruh spasi dirapatkan. */
export function line(fd: FormData, key: string): string {
  const v = fd.get(key);
  if (typeof v !== "string") return "";
  return v.replace(CONTROL, "").replace(/\s+/g, " ").trim();
}

/**
 * Ambil teks multi-baris. Baris kosong berlebih dipadatkan jadi maksimal satu,
 * supaya satu ucapan tidak bisa mendorong ucapan lain keluar layar venue
 * dengan mengirim 200 baris kosong.
 */
export function paragraph(fd: FormData, key: string): string {
  const v = fd.get(key);
  if (typeof v !== "string") return "";
  return v
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL, "")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Ambil bilangan bulat, dijepit ke rentang yang diizinkan. */
export function integer(fd: FormData, key: string, min: number, max: number, fallback: number) {
  const v = fd.get(key);
  const n = typeof v === "string" ? Number.parseInt(v, 10) : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Nama field jebakan. Tak terlihat & tak terjangkau pembaca layar di UI, jadi
 * tamu sungguhan selalu mengirimnya kosong. Bot pengisi-otomatis mengisinya.
 */
export const HONEYPOT = "alamat_web";

export function looksLikeBot(fd: FormData): boolean {
  const v = fd.get(HONEYPOT);
  return typeof v === "string" && v.trim() !== "";
}

/** Nomor telepon: hanya angka, spasi, dan +-() yang wajar. */
export function phoneOrNull(fd: FormData, key: string): string | null {
  const raw = line(fd, key);
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+\-() ]/g, "").trim();
  if (cleaned.replace(/\D/g, "").length < 7) return null;
  return cleaned.slice(0, 30);
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
