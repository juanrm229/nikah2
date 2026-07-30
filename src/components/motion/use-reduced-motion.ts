"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Apakah pengguna meminta gerak dikurangi.
 *
 * Dibaca lewat useSyncExternalStore, bukan setState di dalam useEffect:
 * preferensi ini adalah keadaan di luar React, dan membacanya sebagai state
 * biasa memaksa satu render tambahan setiap komponen bergerak dipasang.
 * Di server selalu dianggap false, lalu dikoreksi saat hidrasi.
 */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
