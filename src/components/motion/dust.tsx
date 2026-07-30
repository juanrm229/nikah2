"use client";

import { useMemo } from "react";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";

/**
 * Bilangan acak yang bisa diulang.
 *
 * Posisi debu harus sama persis di server dan di peramban — `Math.random()`
 * memberi dua jawaban berbeda dan React akan mengeluh soal hidrasi. Mulberry32
 * dipilih karena cukup satu baris dan tidak butuh dependensi.
 */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Debu emas yang melayang pelan di seluruh halaman.
 *
 * Sengaja jarang dan nyaris tak terlihat: yang dicari bukan "efek partikel",
 * tapi kesan bahwa udara di dalam undangan ini punya isi — cahaya yang
 * menangkap sesuatu. Begitu ia cukup terlihat untuk dikenali sebagai partikel,
 * ia sudah terlalu banyak.
 */
export function Dust({
  count = 22,
  seed = 7,
  className = "",
}: {
  count?: number;
  seed?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();

  const motes = useMemo(() => {
    const rnd = seeded(seed);
    return Array.from({ length: count }, () => {
      const size = 1 + rnd() * 2.4;
      return {
        size,
        left: rnd() * 100,
        // Mulai tersebar dari bawah sampai lewat atas layar, supaya tidak ada
        // saat di mana semuanya kebetulan berkumpul di satu ketinggian.
        top: 20 + rnd() * 100,
        dx: (rnd() - 0.5) * 90,
        dy: -(70 + rnd() * 70),
        dur: 22 + rnd() * 26,
        delay: -rnd() * 40,
        // Butir yang lebih besar dibuat lebih redup: kalau tidak, ia terbaca
        // sebagai bintik kotor di layar, bukan sebagai debu yang lebih dekat.
        opacity: 0.5 - (size / 3.4) * 0.28,
      };
    });
  }, [count, seed]);

  if (reduced) return null;

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {motes.map((m, i) => (
        <span
          key={i}
          className="animate-mote absolute rounded-full bg-gold-2"
          style={{
            width: m.size,
            height: m.size,
            left: `${m.left}%`,
            top: `${m.top}%`,
            filter: m.size > 2 ? "blur(0.6px)" : undefined,
            ["--mote-dx" as string]: `${m.dx}px`,
            ["--mote-dy" as string]: `${m.dy}vh`,
            ["--mote-dur" as string]: `${m.dur}s`,
            ["--mote-delay" as string]: `${m.delay}s`,
            ["--mote-o" as string]: m.opacity,
          }}
        />
      ))}
    </div>
  );
}
