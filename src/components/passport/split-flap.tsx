"use client";

import { useEffect, useMemo, useState } from "react";
import { useInView } from "@/components/motion/reveal";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";
import { sfxFlap } from "@/lib/sfx";

const CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.·&-/";

const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * Papan jadwal split-flap ala bandara.
 *
 * Tiap sel berputar melewati deretan karakter sampai berhenti di huruf yang
 * benar. Semua sel digerakkan oleh SATU interval, bukan satu timer per huruf —
 * satu baris jadwal bisa berisi puluhan sel, dan timer sebanyak itu akan
 * membuat ponsel kelas bawah tersendat.
 */
export function SplitFlapText({
  text,
  delay = 0,
  className = "",
  cellClassName = "",
}: {
  text: string;
  /** Jeda sebelum papan mulai berputar, untuk efek beruntun antar baris. */
  delay?: number;
  className?: string;
  cellClassName?: string;
}) {
  const [ref, inView] = useInView<HTMLSpanElement>(0.4);
  const reduced = usePrefersReducedMotion();

  const targets = useMemo(
    () =>
      text
        .toUpperCase()
        .split("")
        .map((c) => Math.max(0, CHARSET.indexOf(c))),
    [text],
  );

  // Sebelum masuk layar semua sel kosong, lalu berputar menuju target.
  const [spun, setSpun] = useState<number[] | null>(null);

  // Tanpa animasi, papan langsung menampilkan teks akhirnya.
  const display = reduced ? targets : (spun ?? targets.map(() => 0));

  useEffect(() => {
    if (!inView || reduced) return;

    let interval: ReturnType<typeof setInterval> | undefined;

    // Seluruh penjadwalan terjadi di dalam callback timer, tidak di badan
    // effect, supaya tidak memicu render berantai saat komponen dipasang.
    const timeout = setTimeout(() => {
      // Tiap sel mulai dari jarak berbeda, jadi berhentinya tidak serempak.
      let cur = targets.map((t, i) => mod(t - (9 + i * 3), CHARSET.length));
      setSpun(cur);

      interval = setInterval(() => {
        let settled = true;
        cur = cur.map((c, i) => {
          if (c === targets[i]) return c;
          settled = false;
          return mod(c + 1, CHARSET.length);
        });
        setSpun([...cur]);
        // Sekali per putaran papan, bukan sekali per sel: satu baris jadwal
        // berisi puluhan sel, dan pembatas lajunya sudah dipasang di dalam
        // sfxFlap. Yang terdengar tetap gemeretak, karena beberapa papan
        // berputar berbarengan dan tiap klak digeser nada & kerasnya.
        if (!settled) sfxFlap();
        if (settled && interval) clearInterval(interval);
      }, 45);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [inView, reduced, targets, delay]);

  return (
    <span ref={ref} className={`inline-flex gap-[2px] ${className}`} aria-label={text}>
      {display.map((idx, i) => (
        <span
          key={i}
          aria-hidden
          className={`relative inline-flex h-[1.6em] w-[0.92em] items-center justify-center overflow-hidden rounded-[1px] bg-ink-3 font-mono text-[0.82em] text-paper tabular-nums ${cellClassName}`}
        >
          {/* Garis belah tempat daun papan terlipat */}
          <span className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px bg-black/55" />
          {/* key memaksa elemen dipasang ulang, sehingga animasi lipat terulang */}
          <span key={idx} className="animate-flap">
            {CHARSET[idx]}
          </span>
        </span>
      ))}
    </span>
  );
}
