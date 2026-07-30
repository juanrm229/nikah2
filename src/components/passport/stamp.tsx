"use client";

import { useId } from "react";
import { useInView } from "@/components/motion/reveal";

/**
 * Stempel imigrasi.
 *
 * Setiap section membubuhkan satu stempel saat tamu menggulir ke sana —
 * jadi undangan ini terasa seperti paspor yang perlahan penuh cap, bukan
 * halaman yang cuma di-scroll.
 *
 * Gerakannya meniru cap sungguhan: turun cepat, menghentak sedikit melewati
 * ukuran akhir, lalu diam. Tintanya tidak rata — itu disengaja.
 */
export function Stamp({
  top,
  bottom,
  center,
  rotate = -14,
  size = 132,
  color = "var(--color-stamp)",
  className = "",
}: {
  /** Teks melengkung di busur atas. */
  top: string;
  /** Teks melengkung di busur bawah. */
  bottom?: string;
  /** Teks lurus di tengah, biasanya tanggal. */
  center?: string;
  rotate?: number;
  size?: number;
  color?: string;
  className?: string;
}) {
  const [ref, inView] = useInView<HTMLDivElement>(0.5);
  const uid = useId().replace(/:/g, "");
  const arcTop = `arc-top-${uid}`;
  const arcBottom = `arc-bottom-${uid}`;
  const ink = `ink-${uid}`;

  return (
    <div
      ref={ref}
      className={`pointer-events-none select-none ${className}`}
      style={{
        width: size,
        height: size,
        opacity: inView ? 0.82 : 0,
        transform: inView
          ? `rotate(${rotate}deg) scale(1)`
          : `rotate(${rotate - 8}deg) scale(1.7)`,
        // Kurva dengan overshoot: inilah yang bikin terasa "dicap", bukan "muncul".
        transition:
          "opacity 220ms ease-out 60ms, transform 460ms cubic-bezier(0.2,1.5,0.4,1) 60ms",
      }}
      aria-hidden
    >
      <svg viewBox="0 0 140 140" width="100%" height="100%" fill="none">
        <defs>
          <path id={arcTop} d="M 70 70 m -50 0 a 50 50 0 1 1 100 0" />
          <path id={arcBottom} d="M 70 70 m -46 0 a 46 46 0 1 0 92 0" />

          {/* Tinta belang: turbulensi memakan sebagian bentuk agar tidak rata */}
          <filter id={ink} x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" seed="7" />
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -1.1 0.85" />
            <feComposite in="SourceGraphic" operator="in" />
          </filter>
        </defs>

        <g filter={`url(#${ink})`} stroke={color} fill={color}>
          <circle cx="70" cy="70" r="66" strokeWidth="2.5" fill="none" />
          <circle cx="70" cy="70" r="58" strokeWidth="1.2" fill="none" />

          <text
            fontSize="10.5"
            letterSpacing="3.2"
            fontFamily="var(--font-mono)"
            fontWeight={500}
            stroke="none"
          >
            <textPath href={`#${arcTop}`} startOffset="50%" textAnchor="middle">
              {top}
            </textPath>
          </text>

          {bottom && (
            <text
              fontSize="9"
              letterSpacing="2.6"
              fontFamily="var(--font-mono)"
              stroke="none"
            >
              <textPath href={`#${arcBottom}`} startOffset="50%" textAnchor="middle">
                {bottom}
              </textPath>
            </text>
          )}

          <path d="M32 70 H108" strokeWidth="1.2" />
          <path d="M42 62 L48 55 L54 62 M86 78 L92 85 L98 78" strokeWidth="1.2" fill="none" />

          {center && (
            <text
              x="70"
              y="86"
              fontSize="13"
              letterSpacing="2"
              fontFamily="var(--font-mono)"
              fontWeight={700}
              textAnchor="middle"
              stroke="none"
            >
              {center}
            </text>
          )}
        </g>
      </svg>
    </div>
  );
}
