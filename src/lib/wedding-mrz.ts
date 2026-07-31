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

/**
 * Nomor dokumen yang tercetak di seluruh undangan.
 *
 * Sengaja angka yang SAMA dengan nomor dokumen di baris MRZ — kalau nomor di
 * cetakan mikro berbeda dari nomor di zona mesin, dokumennya berhenti masuk
 * akal bagi siapa pun yang iseng mencocokkan keduanya.
 */
export function documentSerial() {
  return docNumberFromDate(AKAD);
}

/**
 * Huruf awal nomor paspor.
 *
 * `I` dan `O` sengaja tidak ada. Nomor ini akan dibacakan orang lewat telepon
 * dan disalin dari layar ponsel ke buku petugas; huruf yang tidak bisa
 * dibedakan dari angka 1 dan 0 adalah kesalahan yang menunggu giliran. Skema
 * nomor seri di dunia nyata membuang keduanya karena alasan yang sama.
 */
const SERIAL_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Nomor paspor milik satu tamu.
 *
 * Diturunkan dari `slug` — bukan disimpan di basis data, bukan diundi. Tiga
 * akibatnya, dan ketiganya disengaja: nomornya tidak pernah berubah walau
 * daftar tamu disusun ulang, memberi nomor tidak butuh satu pun kolom baru,
 * dan tidak ada nomor yang bisa bocor duluan karena ia lahir dari alamat yang
 * memang sudah dipegang tamu itu sendiri.
 *
 * FNV-1a dipilih karena ia sebaran-rata dan muat dalam empat baris. Ini BUKAN
 * pengaman — siapa pun yang tahu slug bisa menghitung nomornya. Memang tidak
 * perlu: yang mengamankan check-in adalah `checkin_code` acak di basis data,
 * dan nomor ini hanya cetakan di atas kertas.
 */
export function guestSerial(slug: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // Huruf diambil dari byte TERATAS dan angka dari sisa bawahnya, supaya dua
  // slug yang kebetulan berdekatan nilainya tidak berujung pada huruf yang
  // sama dengan angka yang cuma beda satu.
  const letter = SERIAL_LETTERS[(h >>> 24) % SERIAL_LETTERS.length];
  return `${letter}${String(h % 10_000_000).padStart(7, "0")}`;
}

/**
 * MRZ gabungan untuk sampul — satu dokumen atas nama berdua.
 *
 * `docNumber` boleh ditimpa dengan nomor paspor tamu. Yang didapat bukan
 * sekadar angka yang cocok di dua tempat: digit pemeriksa di baris kedua
 * DIHITUNG ULANG dari nomor itu, jadi nomor yang tercetak di slip tamu
 * benar-benar terverifikasi oleh baris mesin di kaki sampul. Tamu yang iseng
 * mencocokkannya akan menemukan keduanya sepakat.
 */
export function coupleMrz(docNumber?: string) {
  return buildMrz({
    surname: "PERNIKAHAN",
    givenNames: `${wedding.couple.groom.name} ${wedding.couple.bride.name}`,
    docNumber: docNumber ?? docNumberFromDate(AKAD),
    dateOfBirth: toMrzDate(AKAD),
    dateOfExpiry: FOREVER,
    sex: "<",
  });
}

/**
 * MRZ untuk boarding pass tamu. Jenis kelamin diisi `<` (tidak ditentukan) —
 * kita tidak tahu, dan tidak perlu tahu, untuk mencetak undangan.
 */
export function guestMrz(name: string, docNumber?: string) {
  return personMrz(name, "<", docNumber);
}

/** MRZ per mempelai untuk halaman data diri. */
export function personMrz(fullName: string, sex: "M" | "F" | "<", docNumber?: string) {
  const parts = fullName.trim().split(/\s+/);
  // Kata terakhir diperlakukan sebagai nama utama, sisanya nama depan —
  // konvensi yang dipakai paspor untuk nama tanpa marga.
  const surname = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  const givenNames = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";

  return buildMrz({
    surname,
    givenNames,
    docNumber: docNumber ?? docNumberFromDate(AKAD),
    dateOfBirth: toMrzDate(AKAD),
    dateOfExpiry: FOREVER,
    sex,
  });
}
