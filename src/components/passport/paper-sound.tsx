"use client";

import { useEffect } from "react";
import { useInView } from "@/components/motion/reveal";
import { sfxPage } from "@/lib/sfx";

/**
 * Gemerisik satu lembar halaman yang masuk ke layar.
 *
 * Berdiri sebagai komponen sendiri, bukan sebagai baris di dalam
 * `PassportPage`, supaya halaman paspornya tetap komponen server: satu-satunya
 * bagian yang butuh dijalankan di peramban adalah span setinggi nol ini.
 *
 * Bunyinya sengaja nyaris tak terdengar dan hanya sekali per halaman. Undangan
 * ini panjang; gemerisik yang cukup keras untuk dikenali sebagai efek akan
 * berubah jadi gangguan pada halaman kelima, dan tamu akan membisukan seluruh
 * undangan gara-gara satu bunyi yang terlalu percaya diri.
 */
export function PaperSound() {
  const [ref, inView] = useInView<HTMLSpanElement>(0.25);

  useEffect(() => {
    if (!inView) return;
    sfxPage();
  }, [inView]);

  return <span ref={ref} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" />;
}
