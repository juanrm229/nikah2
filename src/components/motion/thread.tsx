"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Jalur penerbangan di tepi kanan — tulang punggung yang menyambung seluruh
 * undangan.
 *
 * Sebelumnya di undangan ini ada TIGA benda yang membicarakan hal yang sama
 * tanpa saling kenal: benang emas penanda progres di tepi kanan, pesawat yang
 * menyusuri cerita di <Journey>, dan pesawat di kartu rute <Venue>. Tiga garis,
 * tiga pesawat, dan tidak satu pun menjelaskan yang lain.
 *
 * Sekarang benang itu ADALAH jalur penerbangannya, dan yang bergerak di
 * atasnya adalah pesawat yang sama. Satu penerbangan melintasi undangan dari
 * halaman pertama sampai terakhir, digerakkan oleh gulir tamu sendiri — itulah
 * yang membuat halaman-halaman ini terbaca sebagai satu dokumen yang
 * bersambung, bukan sebagai tumpukan kartu yang kebetulan berurutan.
 *
 * Dan ia meninggalkan jejak: tiap section yang dilewati membubuhkan satu
 * stempel kecil di jalurnya. Digulir sampai bawah, tepi kanan itu penuh
 * stempel yang tamu kumpulkan sendiri — halaman yang sudah lewat menitipkan
 * bekas yang dibawa terus oleh halaman sesudahnya.
 *
 * Progres ditulis ke custom property lewat rAF, bukan ke state React. Undangan
 * ini dibuka sambil digulir di ponsel murah; satu render React per frame
 * membuat scroll-nya tersendat, dan yang tersendat itu justru hal pertama yang
 * terasa murah.
 */
export function ScrollThread() {
  const ref = useRef<HTMLDivElement>(null);

  /**
   * Letak tiap stempel pada jalur, sebagai pecahan 0–1.
   *
   * Ini SATU-SATUNYA hal di komponen ini yang lewat state React, dan itu aman:
   * ia hanya berubah saat tinggi dokumen berubah — ukuran layar diputar, atau
   * foto selesai dimuat — bukan tiap frame.
   */
  const [marks, setMarks] = useState<number[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    /** Tinggi dokumen saat stempel terakhir kali diukur. */
    let measuredAt = -1;

    /**
     * Titik tengah tiap section, dibagi jarak gulir maksimum.
     *
     * Dipakai titik TENGAH, bukan tepi atas: stempel harus terbubuh saat
     * tamu benar-benar sedang membaca halaman itu, bukan saat kepalanya baru
     * menyentuh dasar layar.
     */
    const placeMarks = (max: number) => {
      const sections = document.querySelectorAll<HTMLElement>("main > section");
      const next: number[] = [];
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        const middle = rect.top + window.scrollY + rect.height / 2;
        next.push(Math.min(1, Math.max(0, middle / max)));
      }
      setMarks(next);
    };

    const measure = () => {
      raf = 0;
      const height = document.documentElement.scrollHeight;
      const max = height - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      el.style.setProperty("--p", p.toFixed(4));
      // Benangnya baru muncul setelah tamu benar-benar mulai membaca — di
      // halaman pertama ia hanya akan jadi garis yang tidak dijelaskan.
      el.style.setProperty("--shown", window.scrollY > 240 ? "1" : "0");

      // Ukur ulang HANYA saat tinggi dokumennya berubah. Foto galeri yang
      // selesai dimuat menggeser semua section di bawahnya, dan stempel yang
      // masih memakai angka lama akan terbubuh di tempat yang salah.
      if (max > 0 && height !== measuredAt) {
        measuredAt = height;
        placeMarks(max);
      }
    };

    // Jadwal ulang, bukan tolak-kalau-sudah-antre: rAF yang terjeda di tab
    // tersembunyi akan meninggalkan flag antrean yang tidak pernah dibersihkan,
    // dan benangnya berhenti mengikuti scroll tanpa satu pun error.
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="thread-rail pointer-events-none fixed top-[14vh] right-[10px] bottom-[14vh] z-30 w-px transition-opacity duration-500"
      style={{ opacity: "var(--shown, 0)" }}
    >
      {/* Bagian jalur yang sudah diterbangi */}
      <div
        className="absolute inset-x-0 top-0 origin-top bg-gold/70"
        style={{ height: "100%", transform: "scaleY(var(--p, 0))" }}
      />

      {/* Stempel persinggahan. Dibubuhkan SEBELUM pesawatnya dirender supaya
          pesawat selalu lewat di atas stempel, bukan tertimbun di bawahnya. */}
      {marks.map((at, i) => (
        <StopMark key={i} at={at} />
      ))}

      {/* Pesawatnya. Hidungnya menghadap ke bawah — arah perjalanan di dokumen
          yang digulir — dan itu sekaligus arah yang sama dengan pesawat di
          <Journey>, yang juga menuruni rutenya dari atas ke bawah. */}
      <div
        className="absolute -left-[5.5px]"
        style={{ top: "calc(var(--p, 0) * 100% - 6px)" }}
      >
        <svg width="12" height="12" viewBox="-6 -6 12 12" fill="none">
          <path
            d="M0 -5.6 C0.9 -5.6 1.4 -4.6 1.4 -3.2 L5.6 0 L5.6 1.2 L1.4 0.2 L1.4 2.8 L3 4.2 L3 4.9 L0 4.2 L-3 4.9 L-3 4.2 L-1.4 2.8 L-1.4 0.2 L-5.6 1.2 L-5.6 0 L-1.4 -3.2 C-1.4 -4.6 -0.9 -5.6 0 -5.6 Z"
            fill="var(--color-gold-2)"
            transform="rotate(180)"
            style={{ filter: "drop-shadow(0 0 6px rgba(216,184,120,0.75))" }}
          />
        </svg>
      </div>
    </div>
  );
}

/**
 * Satu stempel persinggahan pada jalur.
 *
 * Apakah ia sudah terbubuh dihitung DI CSS, dari selisih `--p` (posisi
 * pesawat) dan `--at` (posisi stempel ini) — bukan di React. Kalau tiap
 * stempel menjadi state, tiap frame gulir akan me-render ulang tiga belas
 * elemen sekaligus, dan justru di ponsel murah — yang paling butuh gulir
 * mulus — biayanya paling terasa. Custom property diwarisi dari rel-nya, jadi
 * satu angka yang ditulis per frame sudah cukup untuk menyalakan semuanya.
 *
 * Pengalinya menentukan seberapa "basah" tintanya: 70 berarti stempel selesai
 * terbubuh dalam 1/70 tinggi dokumen — sekitar dua ratus piksel gulir. Cukup
 * cepat untuk terbaca sebagai DIBUBUHKAN saat pesawat lewat, cukup pelan untuk
 * tidak berkedip.
 */
function StopMark({ at }: { at: number }) {
  const inked = `clamp(0, (var(--p, 0) - ${at.toFixed(4)}) * 70, 1)`;

  return (
    <span
      className="absolute -left-[3.5px] block h-2 w-2"
      style={{ top: `calc(${(at * 100).toFixed(2)}% - 4px)` }}
    >
      {/* Bekas yang belum distempel: cincin nyaris tak terlihat, sekadar
          memberi tahu bahwa masih ada persinggahan di depan. */}
      <span className="absolute inset-0 rounded-full border border-paper/20" />

      {/* Tinta yang terbubuh saat pesawat melewatinya. */}
      <span
        className="absolute inset-0 rounded-full border border-gold-2 bg-gold/45"
        style={{
          opacity: inked,
          transform: `scale(calc(0.55 + ${inked} * 0.45))`,
        }}
      />
    </span>
  );
}
