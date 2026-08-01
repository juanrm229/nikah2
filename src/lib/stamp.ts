import { seeded } from "@/lib/seeded";

/**
 * Watak stempel yang diturunkan dari nomor dokumen tamu.
 *
 * Petugas imigrasi yang sama tidak pernah membubuhkan dua cap yang identik:
 * sudutnya berbeda beberapa derajat, tintanya belang di tempat yang berbeda.
 * Di sini perbedaan itu BUKAN acak — ia dihitung dari nomor paspor tamu, jadi
 * stempel milik Fulan selalu stempel yang sama setiap kali ia membuka
 * undangannya, dan tidak pernah sama dengan milik Fulanah.
 *
 * Itu yang membedakannya dari hiasan: nomor yang sama menghasilkan cap yang
 * sama, di server maupun di peramban, hari ini maupun bulan depan. Undangan
 * umum yang tidak ditujukan kepada siapa pun memakai nomor dokumen
 * pernikahannya sendiri — jadi ia pun punya satu cap tetap, bukan cap yang
 * berganti tiap kali halaman dimuat.
 */

/** Ubah string jadi bilangan bulat yang stabil (FNV-1a 32 bit). */
function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type StampTraits = {
  /** Sudut miring akhir, dalam derajat. */
  rotate: number;
  /** Benih turbulensi tinta — menentukan di mana tintanya belang. */
  seed: number;
};

export function stampTraits(
  serial: string,
  {
    base,
    spread = 5,
    /**
     * Pembeda antar-stempel di HALAMAN yang berbeda untuk tamu yang sama.
     * Tanpa ini, tamu yang punya dua stempel akan melihat dua cap kembar —
     * dan dua cap kembar di satu paspor justru lebih mencurigakan daripada
     * dua cap yang seragam.
     */
    variant = 0,
  }: { base: number; spread?: number; variant?: number },
): StampTraits {
  const rand = seeded(hash(serial) + variant * 7919);

  return {
    rotate: Number((base + (rand() * 2 - 1) * spread).toFixed(2)),
    // feTurbulence menerima benih pecahan, tapi membulatkannya sendiri —
    // dibulatkan di sini supaya angka yang dipakai sama dengan angka yang
    // terbaca di DOM saat diperiksa.
    seed: Math.floor(rand() * 100),
  };
}
