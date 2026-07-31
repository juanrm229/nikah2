"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Smooth scroll. Sengaja lembut tapi tidak lamban — undangan dibaca sambil
 * berdiri di jalan, scroll yang terlalu "melayang" bikin orang hilang tempat.
 *
 * Dimatikan otomatis untuk pengguna yang meminta prefers-reduced-motion.
 */
/**
 * Instans yang sedang hidup, kalau ada.
 *
 * Disimpan di tingkat modul, bukan di context: satu-satunya yang butuh
 * menyentuhnya adalah lampu UV — yang harus MENAHAN gulir selagi tamu menyeret
 * jarinya — dan menyeret seluruh pohon komponen ke dalam provider hanya untuk
 * satu panggilan itu adalah harga yang tidak sepadan.
 */
let running: Lenis | null = null;

/**
 * Tahan atau lepaskan gulir halus.
 *
 * `preventDefault` pada touchmove saja tidak cukup: Lenis memasang
 * pendengarnya lebih dulu, jadi penangannya sudah berjalan sebelum giliran
 * kita tiba. Yang bekerja hanya meminta Lenis berhenti sendiri.
 */
export function setScrollLocked(locked: boolean) {
  if (!running) return;
  if (locked) running.stop();
  else running.start();
}

export function ScrollProvider({ enabled = true }: { enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      touchMultiplier: 1.6,
    });

    running = lenis;

    let raf = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      running = null;
      lenis.destroy();
    };
  }, [enabled]);

  return null;
}
