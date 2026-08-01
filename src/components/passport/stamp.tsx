"use client";

import { useEffect, useId } from "react";
import { useInView } from "@/components/motion/reveal";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";
import { sfxStamp } from "@/lib/sfx";

/**
 * Saat karet stempel menyentuh kertas, dalam milidetik sejak animasinya mulai.
 *
 * Angkanya bukan pilihan bebas: 48% dari 560 md, yaitu keyframe `stamp-press`
 * tempat bentuknya menggepeng. Bunyi, getar, dan cincin benturan ketiganya
 * memakai angka ini — kalau salah satu bergeser, yang terdengar atau terasa
 * bukan lagi milik benturan yang sedang dilihat.
 */
const IMPACT_MS = 268;

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
  active,
  seed = 7,
  serial,
  haptic = false,
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
  /**
   * Kendali manual. Dibiarkan kosong, stempel jatuh saat digulir ke layar —
   * itu perilaku bawaan seluruh halaman paspor. Diisi, ia jatuh saat nilainya
   * jadi true; dipakai checkpoint RSVP yang mengecap setelah tamu mengirim.
   */
  active?: boolean;
  /** Benih belang tinta. Lihat `stampTraits` — diturunkan dari nomor tamu. */
  seed?: number;
  /** Nomor kecil di kaki cap, seperti nomor petugas pada cap imigrasi asli. */
  serial?: string;
  /**
   * Getar singkat saat membentur. Sengaja TIDAK menyala dengan sendirinya:
   * stempel bawaan dibubuhkan oleh gulir, dan ponsel yang bergetar tiap kali
   * tamu melewati satu halaman bukan kejutan, melainkan gangguan. Hanya cap
   * yang benar-benar diminta tamu — kiriman RSVP — yang pantas terasa.
   */
  haptic?: boolean;
}) {
  const [ref, inView] = useInView<HTMLDivElement>(0.5);
  const shown = active ?? inView;
  const uid = useId().replace(/:/g, "");
  const reduced = usePrefersReducedMotion();

  /**
   * Bunyi & getar dibunyikan pada saat MEMBENTUR, bukan di awal animasinya.
   *
   * Sebelumnya keduanya dijadwalkan pada 60 md dengan alasan "sama dengan jeda
   * animasinya" — tapi 60 md itu jeda MULAI-nya, bukan saat mendaratnya:
   * transformnya masih berjalan 460 md sesudah itu dan baru menyentuh ukuran
   * akhir sekitar 253 md. Jadi selama ini debumnya terdengar hampir dua ratus
   * milidetik sebelum stempelnya kelihatan mendarat. Persis kesalahan yang
   * diperingatkan komentar lamanya sendiri.
   */
  useEffect(() => {
    if (!shown) return;
    const id = window.setTimeout(() => {
      sfxStamp();
      // Getar hanya kalau memang diminta, perangkatnya mendukung, dan tamu
      // tidak sedang meminta gerak dikurangi.
      if (haptic && !reduced && typeof navigator.vibrate === "function") {
        navigator.vibrate(18);
      }
    }, IMPACT_MS);
    return () => window.clearTimeout(id);
  }, [shown, haptic, reduced]);

  const arcTop = `arc-top-${uid}`;
  const arcBottom = `arc-bottom-${uid}`;
  const ink = `ink-${uid}`;

  return (
    <div
      ref={ref}
      className={`pointer-events-none relative select-none ${
        shown ? "animate-stamp-press" : ""
      } ${className}`}
      style={
        {
          width: size,
          height: size,
          "--stamp-rot": `${rotate}deg`,
          // Sebelum dibubuhkan ia tidak ada sama sekali. Keadaan awal tidak
          // ditulis sebagai transform di sini melainkan di keyframe 0% —
          // kalau ditulis di dua tempat, keduanya akan berselisih setiap kali
          // salah satunya diubah.
          opacity: shown ? undefined : 0,
        } as React.CSSProperties
      }
      aria-hidden
    >
      {/* Hentakan benturan. Dirender hanya saat dibubuhkan supaya animasinya
          benar-benar mulai dari awal — elemen yang sudah ada sejak semula akan
          menghabiskan animasinya sebelum stempelnya sempat turun. */}
      {shown && (
        <span
          className="animate-stamp-impact absolute inset-0 rounded-full border"
          style={{ borderColor: color }}
        />
      )}

      <svg viewBox="0 0 140 140" width="100%" height="100%" fill="none">
        <defs>
          <path id={arcTop} d="M 70 70 m -50 0 a 50 50 0 1 1 100 0" />
          <path id={arcBottom} d="M 70 70 m -46 0 a 46 46 0 1 0 92 0" />

          {/* Tinta belang: turbulensi memakan sebagian bentuk agar tidak rata */}
          <filter id={ink} x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.75"
              numOctaves="4"
              seed={seed}
            />
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

          {/* Nomor petugas. Pada cap imigrasi sungguhan inilah satu-satunya
              bagian yang berbeda antar-penumpang, dan di sini pun begitu:
              nomor paspor tamu yang membuka undangan ini. Sengaja kecil dan
              nyaris tak terbaca — ia ada untuk DITEMUKAN, bukan untuk dibaca
              sekilas. */}
          {serial && (
            <text
              x="70"
              y="99"
              fontSize="6"
              letterSpacing="1.4"
              fontFamily="var(--font-mono)"
              textAnchor="middle"
              stroke="none"
              opacity={0.75}
            >
              {serial}
            </text>
          )}
        </g>
      </svg>
    </div>
  );
}
