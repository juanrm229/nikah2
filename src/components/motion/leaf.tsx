"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";

/**
 * Lembar yang terangkat dari tumpukan saat tamu selesai membacanya.
 *
 * Undangan ini sudah punya separuh gerakannya: `Reveal turn={7}` menurunkan
 * kertas yang MASUK, sedikit terangkat lalu merebah, seperti lembar yang baru
 * dibalik. Yang hilang selama ini adalah separuh satunya — kertas yang KELUAR
 * cuma menggulir pergi seperti pita panjang. Di sini ia diangkat: menjauh di
 * tepi seberang, mengecil, dan meredup, persis lembar yang didorong lewat
 * puncak tumpukan.
 *
 * TITIK PUTARNYA DI TEPI BAWAH, dan itu keputusan geometri, bukan selera.
 * Halaman paspor di undangan ini bisa jauh lebih tinggi dari layar; kalau
 * porosnya ditaruh di tepi atas — tempat yang "benar" untuk buku bertumpuk —
 * poros itu sudah berada ratusan piksel di atas layar saat putarannya dimulai,
 * dan bagian yang masih terlihat akan terlempar sejauh ratusan piksel oleh
 * sudut sekecil apa pun. Dengan poros di tepi bawah, yang bergerak justru tepi
 * yang sudah tidak terlihat, dan yang masih dibaca tamu tetap diam di
 * tempatnya.
 *
 * Modul ini hanya mengukur dan menuliskan `--leaf` (0 sampai 1). Sudut,
 * penyusutan, dan bayangannya ditentukan di `globals.css` — angka yang hanya
 * dibaca CSS tidak perlu punya salinan di JavaScript yang bisa ikut basi.
 */

/**
 * Kapan pengangkatan dimulai, sebagai pecahan tinggi layar.
 *
 * Diukur dari KAKI halaman, bukan dari kepalanya: dengan begitu halaman
 * setinggi apa pun mulai terangkat pada saat yang sama dalam pengalaman
 * membaca — yaitu ketika baris terakhirnya sudah lewat tiga perempat layar —
 * bukan ketika kebetulan sudah menggulir sekian ratus piksel.
 */
const START = 0.75;

const sheets = new Set<HTMLElement>();
let queued = false;

function measure() {
  queued = false;
  const start = window.innerHeight * START;

  for (const el of sheets) {
    const bottom = el.getBoundingClientRect().bottom;
    const t = bottom >= start ? 0 : Math.min(1, (start - bottom) / start);
    el.style.setProperty("--leaf", t.toFixed(3));
    // Lapisan komposit hanya dipinjam selama lembarnya benar-benar bergerak.
    // Tujuh halaman kertas yang dipromosikan permanen adalah tujuh tekstur
    // seukuran layar yang menetap di memori GPU ponsel sepanjang undangan.
    el.classList.toggle("is-turning", t > 0 && t < 1);
  }
}

function onScroll() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(measure);
}

/**
 * Satu pendengar untuk semua lembar, bukan satu per halaman.
 *
 * Tujuh IntersectionObserver masih murah; tujuh pendengar `scroll` yang
 * masing-masing memanggil `getBoundingClientRect` di thread yang sama dengan
 * gulir tidak. Pengukurannya dikumpulkan jadi satu lintasan per frame.
 */
function attach() {
  // Pendengarnya cuma dipasang sekali; pengukurannya TIDAK. Lembar yang baru
  // mendaftar harus diukur saat itu juga, bukan menunggu gulir berikutnya —
  // peramban yang memulihkan posisi gulir setelah muat ulang menaruh tamu di
  // tengah undangan tanpa satu pun peristiwa gulir, dan halaman yang seharusnya
  // sudah terangkat akan berdiri tegak sampai tamu menggeser layar.
  if (sheets.size <= 1) {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  }
  measure();
}

function detach() {
  if (sheets.size > 0) return;
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onScroll);
}

/**
 * Daftarkan satu lembar. Pasang ref-nya pada kertas yang sudah ada, bersama
 * kelas `leaf-exit`.
 *
 * Sengaja hook, bukan komponen pembungkus. Pembungkus akan menyisipkan satu
 * div di antara `Reveal` dan kertasnya — dan div itu bukan sekadar tambahan
 * yang tidak berbahaya: ia menaruh transform kedua di tengah rantai, tepat di
 * antara dua transform yang sudah ada, pada elemen yang membungkus setiap
 * halaman paspor di undangan ini.
 */
export function useLeafExit<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    sheets.add(el);
    attach();

    return () => {
      sheets.delete(el);
      // Halaman yang dilepas dalam keadaan setengah terangkat akan membeku di
      // sudut itu kalau nilainya tidak dipulangkan.
      el.style.removeProperty("--leaf");
      el.classList.remove("is-turning");
      detach();
    };
  }, [reduced]);

  return ref;
}

/**
 * Bayangan yang jatuh ke atas lembar seiring ia terangkat.
 *
 * Ditaruh DI DALAM kertas, bukan di pembungkusnya, supaya ia ikut terpotong
 * oleh sudut membulat halaman — bayangan bersudut siku di atas kertas
 * bersudut bulat langsung terbaca sebagai lapisan yang ditempel.
 */
export function LeafShade() {
  return <div aria-hidden className="leaf-shade" />;
}
