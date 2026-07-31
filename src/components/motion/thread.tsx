"use client";

import { useEffect, useRef } from "react";

/**
 * Benang emas penanda progres di tepi kanan.
 *
 * Bukan scrollbar: yang dicari adalah kesan benang yang ditarik melintasi kain
 * seiring undangan dibaca, dengan satu butir belah ketupat — motif yang sama
 * dengan ikat di seluruh halaman — sebagai kepala benangnya.
 *
 * Progres ditulis ke custom property lewat rAF, bukan ke state React. Undangan
 * ini dibuka sambil digulir di ponsel murah; satu render React per frame
 * membuat scroll-nya tersendat, dan yang tersendat itu justru hal pertama yang
 * terasa murah.
 */
export function ScrollThread() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;

    const measure = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      el.style.setProperty("--p", p.toFixed(4));
      // Benangnya baru muncul setelah tamu benar-benar mulai membaca — di
      // halaman pertama ia hanya akan jadi garis yang tidak dijelaskan.
      el.style.setProperty("--shown", window.scrollY > 240 ? "1" : "0");
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
      {/* Bagian benang yang sudah terlewati */}
      <div
        className="absolute inset-x-0 top-0 origin-top bg-gold/70"
        style={{ height: "100%", transform: "scaleY(var(--p, 0))" }}
      />

      {/* Kepala benang: butir belah ketupat yang ikut turun */}
      <div
        className="absolute -left-[3.5px] h-[7px] w-[7px] rotate-45 bg-gold-2 shadow-[0_0_8px_rgba(216,184,120,0.75)]"
        style={{ top: "calc(var(--p, 0) * 100% - 3.5px)" }}
      />
    </div>
  );
}
