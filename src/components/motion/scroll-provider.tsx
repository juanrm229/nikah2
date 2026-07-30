"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Smooth scroll. Sengaja lembut tapi tidak lamban — undangan dibaca sambil
 * berdiri di jalan, scroll yang terlalu "melayang" bikin orang hilang tempat.
 *
 * Dimatikan otomatis untuk pengguna yang meminta prefers-reduced-motion.
 */
export function ScrollProvider({ enabled = true }: { enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      touchMultiplier: 1.6,
    });

    let raf = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [enabled]);

  return null;
}
