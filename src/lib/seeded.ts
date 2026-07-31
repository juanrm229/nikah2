/**
 * Bilangan acak yang bisa diulang.
 *
 * Dipakai oleh apa pun yang menyebar sesuatu secara "acak" tapi harus
 * menghasilkan susunan yang SAMA di server dan di peramban — debu emas, serat
 * pengaman kertas. `Math.random()` memberi dua jawaban berbeda dan React akan
 * mengeluh soal hidrasi. Mulberry32 dipilih karena cukup satu baris dan tidak
 * butuh dependensi.
 */
export function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
