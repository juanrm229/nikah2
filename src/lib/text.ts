/**
 * Beri kesempatan putus baris setelah garis miring & tanda hubung.
 *
 * Peramban tidak menganggap "/" sebagai tempat yang boleh dipatahkan, jadi
 * "Bapak/Ibu/Saudara/i" diperlakukan sebagai satu kata raksasa. Di slip nama
 * sampul yang sempit, satu-satunya jalan keluar yang tersisa bagi peramban
 * adalah memotongnya di tengah kata — dan hasilnya terbaca "Saudar / a/i".
 *
 * U+200B (zero-width space) menambahkan titik putus yang SAH di tempat yang
 * masuk akal. Ia tak terlihat, tidak menambah lebar, dan tidak ikut tersalin
 * sebagai spasi di sebagian besar peramban.
 *
 * Sengaja tidak memakai `<wbr>`: nilai ini juga dipakai di tempat yang
 * menerima teks polos (mis. `aria-label`), dan string tetap string.
 */
export function withSoftBreaks(text: string): string {
  return text.replace(/([/\-–—])(?=\S)/g, "$1\u200B");
}
