"use client";

import { useEffect, useRef } from "react";

/**
 * Parallax ringan untuk sekumpulan elemen di dalam satu wadah.
 *
 * Pasang ref-nya di wadah, lalu tandai tiap elemen yang ingin bergerak dengan
 * `data-parallax`. Hook ini menulis `--py` ke elemen itu; komponennya sendiri
 * yang memutuskan mau dipakai untuk apa (biasanya translateY).
 *
 * Tiga keputusan yang membuatnya murah, dan ketiganya penting di ponsel:
 *
 * 1. **Satu listener untuk seluruh wadah**, bukan satu per foto. Delapan
 *    listener scroll yang masing-masing memanggil `getBoundingClientRect()`
 *    adalah delapan kali kerja yang sama.
 * 2. **Menulis ke custom property, bukan ke state React.** Satu render React
 *    per frame membuat scroll tersendat, dan tersendat itulah hal pertama yang
 *    membuat sebuah halaman terasa murah.
 * 3. **Yang di luar layar dilewati.** Elemen yang tidak terlihat tidak perlu
 *    diukur, dan galeri ini seluruhnya di luar layar hampir sepanjang waktu.
 */
export function useParallax<T extends HTMLElement>(amount = 26) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-parallax]"));
    if (targets.length === 0) return;

    let raf = 0;

    const measure = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const el of targets) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -160 || r.top > vh + 160) continue;
        // Nol tepat saat pusat elemen berada di pusat layar, sehingga foto
        // yang sedang dipandang selalu berada di tengah bingkainya.
        const t = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.setProperty("--py", `${(-t * amount).toFixed(2)}px`);
      }
    };

    // Menjadwal ulang, BUKAN menolak jadwal baru selama masih ada yang antre.
    // Versi "kalau sudah antre, abaikan" tampak lebih hemat, tapi ia bertumpu
    // pada satu janji yang tidak selalu ditepati: bahwa rAF yang dijadwalkan
    // pasti jalan. Peramban menjeda rAF di tab yang tersembunyi — dan kalau
    // satu saja terjeda selamanya, flag antreannya tidak pernah dibersihkan
    // dan SELURUH scroll berikutnya diam-diam diabaikan. `cancel` + jadwal
    // ulang tidak punya keadaan yang bisa tersangkut.
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
  }, [amount]);

  return ref;
}
