"use client";

import { useEffect, useRef, useState } from "react";
import { wedding } from "@/config/wedding";
import { Heading } from "@/components/passport/page";
import { Reveal } from "@/components/motion/reveal";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";

/**
 * Perjalanan cinta, digambar sebagai rute penerbangan.
 *
 * Alih-alih daftar tanggal, tiap babak jadi persinggahan dengan kode tiga
 * huruf ala bandara, dirangkai garis putus-putus. Pesawatnya benar-benar
 * menyusuri garis itu mengikuti posisi scroll — bukan animasi yang berjalan
 * sendiri — sehingga tamu merasa merekalah yang menerbangkannya.
 */
export function Journey() {
  const stops = wedding.story;
  const sectionRef = useRef<HTMLElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const planeRef = useRef<SVGGElement>(null);
  const clipRef = useRef<SVGRectElement>(null);
  const reduced = usePrefersReducedMotion();
  const [flownIndex, setFlownIndex] = useState(-1);

  // Tanpa animasi, seluruh rute langsung dianggap sudah dilewati.
  const reachedIndex = reduced ? stops.length - 1 : flownIndex;

  // Tinggi kanvas rute mengikuti jumlah persinggahan.
  const GAP = 158;
  const height = stops.length * GAP;

  /**
   * Lebar jalur di tepi kiri.
   *
   * Versi sebelumnya menaruh rute di TENGAH dengan cerita berselang-seling
   * kiri-kanan. Di desktop itu cantik; di ponsel 320 px tiap kolom cerita hanya
   * ~120 px, dan kalimat seperti "Dari perkenalan yang singkat" pecah jadi enam
   * baris berisi tiga kata. Rute yang dipindah ke tepi memberi cerita seluruh
   * lebar yang tersisa — dan kebetulan justru lebih dekat dengan bentuk yang
   * ditirunya: rute penerbangan pada tiket selalu dibaca dari atas ke bawah di
   * satu sisi, bukan zig-zag.
   */
  const RAIL = 56;
  const X = RAIL / 2;
  /** Seberapa jauh jalur membusur ke samping di antara dua persinggahan. */
  const BOW = 15;

  // Jalur menyentuh TEPAT titik tiap persinggahan, lalu membusur bergantian ke
  // kiri dan kanan di antaranya. Kalau persinggahannya sendiri yang digeser
  // kiri-kanan, kode bandaranya tidak lagi duduk di atas jalur.
  const path = stops
    .map((_, i) => {
      const y = i * GAP + GAP / 2;
      if (i === 0) return `M ${X} ${y}`;
      const prevY = (i - 1) * GAP + GAP / 2;
      const bow = i % 2 ? BOW : -BOW;
      const a = prevY + (y - prevY) * 0.35;
      const b = prevY + (y - prevY) * 0.65;
      return `C ${X + bow} ${a}, ${X - bow} ${b}, ${X} ${y}`;
    })
    .join(" ");

  useEffect(() => {
    const section = sectionRef.current;
    const pathEl = pathRef.current;
    const plane = planeRef.current;
    const clip = clipRef.current;
    if (!section || !pathEl || !plane || !clip) return;

    if (reduced) return;

    const total = pathEl.getTotalLength();
    let raf = 0;
    let queued = false;

    const draw = () => {
      queued = false;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;

      // 0 saat puncak section menyentuh dasar layar, 1 saat kakinya lewat atas.
      const raw = (vh - rect.top) / (vh + rect.height);
      const progress = Math.max(0, Math.min(1, raw));

      const at = progress * total;
      const point = pathEl.getPointAtLength(at);

      // Arah hidung pesawat diukur dari sepotong jalur sepanjang SPAN. Pangkalnya
      // ditarik mundur saat sudah dekat ujung, supaya potongannya selalu punya
      // panjang: kalau pangkal dan ujungnya bertemu di titik yang sama,
      // atan2(0, 0) mengembalikan 0 dan pesawatnya mendadak melintang.
      const SPAN = 6;
      const from = pathEl.getPointAtLength(Math.max(0, Math.min(at, total - SPAN)));
      const to = pathEl.getPointAtLength(Math.min(total, Math.max(at, 0) + SPAN));
      const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;

      plane.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${angle + 90})`);

      // Progres diungkap dengan menaikkan tinggi kotak pemotong, bukan dengan
      // mengutak-atik strokeDasharray — kalau dasharray dipakai untuk animasi,
      // pola garis putus-putusnya ikut hilang dan rutenya jadi garis penuh.
      clip.setAttribute("height", String(point.y + 2));

      // Persinggahan menyala begitu pesawat melewatinya.
      setFlownIndex(Math.floor(progress * stops.length + 0.15) - 1);
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      raf = requestAnimationFrame(draw);
    };

    draw();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduced, stops.length]);

  return (
    <section
      ref={sectionRef}
      id="perjalanan"
      className="relative px-4 py-[clamp(4rem,12vh,7rem)]"
    >
      <div className="mx-auto w-full max-w-md">
        <Reveal>
          <Heading label="Perjalanan Kami" title="Rute Menuju Hari Ini" tone="paper" />
        </Reveal>

        <div className="relative mt-12">
          {/* Kanvas rute, dibentangkan di belakang daftar persinggahan */}
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0"
            width={RAIL}
            height={height}
            viewBox={`0 0 ${RAIL} ${height}`}
            preserveAspectRatio="none"
            style={{ height: "100%" }}
          >
            <defs>
              <clipPath id="rute-terbang">
                <rect ref={clipRef} x="0" y="0" width={RAIL} height="0" />
              </clipPath>
            </defs>

            {/* Jalur pucat: seluruh rute, selalu terlihat */}
            <path
              d={path}
              stroke="var(--color-paper)"
              strokeOpacity={0.15}
              strokeWidth={1.2}
              strokeDasharray="3 6"
              strokeLinecap="round"
              fill="none"
            />

            {/* Jalur emas: bagian yang sudah dilewati pesawat */}
            <g clipPath="url(#rute-terbang)">
              <path
                ref={pathRef}
                d={path}
                stroke="var(--color-gold)"
                strokeWidth={1.5}
                strokeDasharray="3 6"
                strokeLinecap="round"
                fill="none"
              />
            </g>

            <g ref={planeRef}>
              <path
                d="M0 -6.4 C1 -6.4 1.6 -5.2 1.6 -3.6 L6.4 0 L6.4 1.4 L1.6 0.2 L1.6 3.2 L3.4 4.8 L3.4 5.6 L0 4.8 L-3.4 5.6 L-3.4 4.8 L-1.6 3.2 L-1.6 0.2 L-6.4 1.4 L-6.4 0 L-1.6 -3.6 C-1.6 -5.2 -1 -6.4 0 -6.4 Z"
                fill="var(--color-gold-2)"
                stroke="none"
              />
            </g>
          </svg>

          <ol className="relative">
            {stops.map((stop, i) => (
              <li
                key={stop.code + stop.date}
                className="flex items-center gap-4"
                style={{ height: GAP }}
              >
                {/* Kode persinggahan, menyala saat pesawat melewatinya.
                    Lebarnya persis selebar jalur, jadi ia duduk tepat di atas
                    garis alih-alih di sebelahnya. */}
                <div
                  className="flex shrink-0 justify-center"
                  style={{ width: RAIL }}
                >
                  <span
                    className={`mrz rounded-[2px] border px-2 py-1 text-[0.6rem] transition-colors duration-500 ${
                      i <= reachedIndex
                        ? "border-gold/60 bg-gold/15 text-gold-2 shadow-[0_0_18px_-4px_var(--color-gold)]"
                        : "border-paper/15 bg-ink-2 text-paper-dim/60"
                    }`}
                  >
                    {stop.code}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <Reveal delay={i * 60} y={14}>
                    <p className="field-label text-gold/70">{stop.date}</p>
                    <p className="display mt-1 text-[1.2rem] leading-tight text-paper">
                      {stop.title}
                    </p>
                    <p className="mt-1.5 text-[0.8rem] leading-snug font-light text-paper-dim">
                      {stop.text}
                    </p>
                  </Reveal>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
