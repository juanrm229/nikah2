"use client";

import type { ReactNode } from "react";
import { IkatBand, IkatOrnament } from "@/components/tenun/ikat";
import { Reveal } from "@/components/motion/reveal";
import { UvLayer } from "@/components/uv/layer";
import { PaperSound } from "@/components/passport/paper-sound";
import { useLeafExit, LeafShade } from "@/components/motion/leaf";

/**
 * Satu halaman paspor: kertas gading dengan pita tenun di kepala dan kaki,
 * nomor halaman, dan tanda sudut. Section bertema terang memakai ini;
 * section bertema gelap (galeri, foto) tampil full-bleed tanpa kertas.
 */
export function PassportPage({
  children,
  page,
  label,
  stamp,
  stampPosition = "bottom-right",
  className = "",
  id,
  uv,
  uvSeed = 11,
}: {
  children: ReactNode;
  /** Nomor halaman yang dicetak di kaki kertas. */
  page?: string;
  /** Label kecil di kepala kertas, mis. "HALAMAN PENGESAHAN". */
  label?: string;
  /**
   * Stempel yang dibubuhkan pada halaman ini. Ditempatkan DI DALAM kertas,
   * bukan di sampingnya — di layar ponsel tidak ada ruang di tepi halaman,
   * dan stempel adalah bagian paling menyenangkan dari undangan ini.
   */
  stamp?: ReactNode;
  stampPosition?: "bottom-right" | "bottom-left" | "top-right";
  className?: string;
  id?: string;
  /**
   * Rahasia yang hanya terbaca di bawah lampu UV pada halaman ini. Motif,
   * segel, serat pengaman, dan nomor dokumen sudah dipasang untuk SETIAP
   * halaman — ini tambahan yang khas halaman bersangkutan.
   */
  uv?: ReactNode;
  /** Benih serat pengaman. Beda per halaman; tak ada dua lembar yang kembar. */
  uvSeed?: number;
}) {
  const leaf = useLeafExit<HTMLDivElement>();

  // Kertasnya overflow-hidden, jadi stempel ditaruh di dalam tepi — bukan
  // menggantung keluar, yang hanya akan terpotong separuh.
  const stampPlacement = {
    "bottom-right": "right-3 bottom-9",
    "bottom-left": "left-3 bottom-9",
    "top-right": "right-3 top-16",
  }[stampPosition];

  return (
    // `perspective` di section, bukan di kertasnya: rotasi hanya terlihat
    // kalau titik hilangnya dipasang pada LELUHUR yang bertransformasi.
    <section
      id={id}
      className="relative px-4 py-[clamp(3rem,10vh,6rem)]"
      style={{ perspective: "1600px" }}
    >
      <Reveal className="mx-auto w-full max-w-md" y={26} turn={7}>
        <div
          ref={leaf}
          className={`leaf-exit grain relative overflow-hidden rounded-[2px] bg-paper text-ink shadow-[0_30px_60px_-25px_rgba(0,0,0,0.85)] ${className}`}
        >
          <div className="grain-layer" />

          <PaperSound />

          <IkatBand className="w-full opacity-30" height={14} color="var(--color-ink)" />

          {/* Tanda sudut, meniru cetakan register pada halaman paspor */}
          <Corner className="left-2 top-6" />
          <Corner className="right-2 top-6 rotate-90" />
          <Corner className="bottom-6 left-2 -rotate-90" />
          <Corner className="bottom-6 right-2 rotate-180" />

          <div className="relative px-[clamp(1.5rem,6vw,2.5rem)] py-[clamp(2rem,6vh,3rem)]">
            {label && <p className="field-label mb-6 text-ink-soft">{label}</p>}
            {children}
          </div>

          {page && (
            <p className="field-label relative pb-3 text-center text-ink-soft/70">{page}</p>
          )}

          <IkatBand className="w-full opacity-30" height={14} color="var(--color-ink)" flip />

          {stamp && <div className={`absolute z-10 ${stampPlacement}`}>{stamp}</div>}

          {/* Bayangan lembar berikutnya. Ditaruh SEBELUM lapisan UV: saat lampu
              menyala, pemadamnya harus menang atas segalanya — termasuk atas
              bayangan ini. */}
          <LeafShade />

          {/* Anak terakhir, dan itu bukan kebetulan: pemadam UV harus jatuh di
              atas SELURUH isi halaman — termasuk stempel — kalau tidak, yang
              terlihat di bawah lampu adalah stempel biru yang mengambang di
              ruang gelap. */}
          <UvLayer seed={uvSeed}>{uv}</UvLayer>
        </div>
      </Reveal>
    </section>
  );
}

function Corner({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={`pointer-events-none absolute ${className}`}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
    >
      <path d="M0 5 V0 H5" stroke="var(--color-ink)" strokeWidth="1" opacity="0.28" />
    </svg>
  );
}

/** Judul section: label mono kecil, judul serif, lalu ornamen tenun. */
export function Heading({
  label,
  title,
  align = "center",
  tone = "ink",
}: {
  label?: string;
  title: string;
  align?: "center" | "left";
  tone?: "ink" | "paper";
}) {
  const isCenter = align === "center";
  return (
    <header className={isCenter ? "text-center" : "text-left"}>
      {label && (
        <p className={`field-label ${tone === "ink" ? "text-ink-soft" : ""}`}>{label}</p>
      )}
      <h2
        className={`display mt-3 text-[clamp(1.6rem,5.5vw,2.1rem)] ${
          tone === "ink" ? "text-ink" : "text-paper"
        }`}
      >
        {title}
      </h2>
      <IkatOrnament
        className={`mt-4 ${isCenter ? "mx-auto" : ""}`}
        color={tone === "ink" ? "var(--color-gold-3)" : "var(--color-gold)"}
        width={104}
      />
    </header>
  );
}
