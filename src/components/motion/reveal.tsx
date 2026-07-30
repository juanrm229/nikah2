"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";

/**
 * Memunculkan isi saat masuk layar, sekali saja.
 *
 * Pakai IntersectionObserver, bukan scroll listener, supaya tidak ada kerja
 * per-frame — penting karena undangan ini panjang dan dibuka di ponsel murah.
 */
export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  y = 18,
  className = "",
  once = true,
}: {
  children: ReactNode;
  as?: ElementType;
  /** Jeda dalam milidetik, untuk menyusun urutan munculnya elemen. */
  delay?: number;
  /** Jarak geser awal dalam piksel. 0 untuk fade murni. */
  y?: number;
  className?: string;
  once?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  const reduced = usePrefersReducedMotion();

  // Tanpa animasi, isi langsung tampil — tidak perlu observer sama sekali.
  const visible = reduced || shown;

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          if (once) io.disconnect();
        } else if (!once) {
          setShown(false);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [once, reduced]);

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : `translate3d(0, ${y}px, 0)`,
        transition: reduced
          ? undefined
          : `opacity 900ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 900ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
        willChange: visible ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </Tag>
  );
}

/**
 * Versi khusus teks panjang: baris demi baris memudar masuk.
 * Dipakai untuk terjemahan ayat dan paragraf sambutan.
 */
export function useInView<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, inView] as const;
}
