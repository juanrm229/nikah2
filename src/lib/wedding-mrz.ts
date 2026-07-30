import { wedding } from "@/config/wedding";
import { buildMrz, toMrzDate } from "@/lib/mrz";

/**
 * MRZ khusus undangan ini.
 *
 * Pemetaan field paspor ke makna pernikahan:
 *   nomor dokumen  → tanggal akad, dipadatkan
 *   tanggal lahir  → tanggal akad, hari lahirnya pernikahan
 *   masa berlaku   → 31 Desember 2099
 *
 * Baris terakhir itu sengaja. Paspor selalu punya tanggal kedaluwarsa;
 * pernikahan tidak. 2099 adalah cara paling dekat yang bisa dikatakan
 * format ini untuk "selamanya" — hadiah kecil bagi tamu yang iseng
 * membaca sampai ke digit terakhir.
 */

const AKAD = wedding.events[0].start;
const FOREVER = "991231"; // 31 Desember 2099

/** Nomor dokumen dari tanggal akad: YYYYMMDD, 8 karakter. */
function docNumberFromDate(iso: string) {
  const d = new Date(iso);
  return (
    `${d.getUTCFullYear()}` +
    `${String(d.getUTCMonth() + 1).padStart(2, "0")}` +
    `${String(d.getUTCDate()).padStart(2, "0")}`
  );
}

/** MRZ gabungan untuk sampul — satu dokumen atas nama berdua. */
export function coupleMrz() {
  return buildMrz({
    surname: "PERNIKAHAN",
    givenNames: `${wedding.couple.groom.name} ${wedding.couple.bride.name}`,
    docNumber: docNumberFromDate(AKAD),
    dateOfBirth: toMrzDate(AKAD),
    dateOfExpiry: FOREVER,
    sex: "<",
  });
}

/** MRZ per mempelai untuk halaman data diri. */
export function personMrz(fullName: string, sex: "M" | "F") {
  const parts = fullName.trim().split(/\s+/);
  // Kata terakhir diperlakukan sebagai nama utama, sisanya nama depan —
  // konvensi yang dipakai paspor untuk nama tanpa marga.
  const surname = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  const givenNames = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";

  return buildMrz({
    surname,
    givenNames,
    docNumber: docNumberFromDate(AKAD),
    dateOfBirth: toMrzDate(AKAD),
    dateOfExpiry: FOREVER,
    sex,
  });
}
