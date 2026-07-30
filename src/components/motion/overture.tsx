"use client";

import { useEffect, useState } from "react";
import { TenunEmblem } from "@/components/tenun/emblem";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";

/** Panjang tiap babak, dalam milidetik sejak overture dipasang. */
export const OVERTURE = {
  /** Lambang mulai digambar. */
  draw: 120,
  /** Baris MRZ mulai mengunci huruf demi huruf. */
  type: 1150,
  /** Seluruh ritual mengangkat diri. */
  exit: 2050,
  /** Panjang animasi angkat. */
  exitDur: 620,
};

/** Saat sampul boleh mulai naik ke tempatnya. */
export const COVER_ENTER = OVERTURE.exit + 120;

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<<<";

/**
 * Ritual pembuka.
 *
 * Sebelum sampul muncul, lambang tenun menggambar dirinya sendiri di atas
 * hitam, lalu satu baris MRZ mengunci huruf demi huruf di bawahnya. Tiga detik
 * ini bukan hiasan: ia memberi tahu tamu — sebelum satu kata pun dibaca —
 * bahwa yang dipegangnya bukan templat.
 *
 * Bisa dilewati dengan menyentuh layar. Tamu yang sudah pernah membuka
 * undangan ini tidak boleh disandera oleh pertunjukan yang sama dua kali.
 */
export function Overture({ line, onDone }: { line: string; onDone: () => void }) {
  const reduced = usePrefersReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const [locked, setLocked] = useState(0);
  const [noise, setNoise] = useState("");

  useEffect(() => {
    if (reduced) {
      onDone();
      return;
    }

    const timers: number[] = [];

    // Dipanggil dari timer maupun dari sentuhan tamu; keduanya harus berujung
    // pada satu kali onDone, bukan dua.
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setLeaving(true);
      window.setTimeout(onDone, OVERTURE.exitDur);
    };

    // Huruf dikunci dari kiri ke kanan; sisanya terus berganti-ganti sampai
    // gilirannya tiba. Itulah yang membuatnya terbaca sebagai mesin yang
    // sedang membaca, bukan sebagai teks yang memudar masuk.
    const perChar = 620 / Math.max(line.length, 1);
    const spin = window.setInterval(() => {
      setNoise(GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
    }, 55);

    timers.push(
      window.setTimeout(() => {
        let i = 0;
        const step = window.setInterval(() => {
          i += 1;
          setLocked(i);
          if (i >= line.length) window.clearInterval(step);
        }, perChar);
        timers.push(step);
      }, OVERTURE.type),
    );

    timers.push(window.setTimeout(finish, OVERTURE.exit));

    window.addEventListener("pointerdown", finish);

    return () => {
      window.clearInterval(spin);
      // Daftarnya bercampur timeout dan interval, dan keduanya berbagi satu
      // ruang id di peramban — membersihkan dengan dua-duanya aman.
      timers.forEach((id) => {
        window.clearTimeout(id);
        window.clearInterval(id);
      });
      window.removeEventListener("pointerdown", finish);
    };
  }, [line, onDone, reduced]);

  if (reduced) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[70] flex flex-col items-center justify-center bg-ink transition-[opacity,transform] duration-[620ms] ease-[cubic-bezier(0.7,0,0.2,1)] ${
        leaving ? "pointer-events-none -translate-y-6 opacity-0" : ""
      }`}
    >
      {/* Lingkaran cahaya samar di belakang lambang — memberi lambangnya
          tempat berdiri, supaya ia tidak melayang di kehampaan hitam. */}
      <div
        className="pointer-events-none absolute h-[62vmin] w-[62vmin] rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(176,141,79,0.13) 0%, rgba(176,141,79,0.04) 45%, transparent 70%)",
        }}
      />

      {/* Pembungkusnya bulat, bukan kotak: sapuan cahaya dipotong oleh
          overflow-hidden, dan potongan persegi di sekitar lambang yang bundar
          terbaca sebagai kotak terang yang lewat — bukan sebagai cahaya. */}
      <div className="relative overflow-hidden rounded-full p-2">
        <TenunEmblem
          className="h-[clamp(96px,26vmin,168px)] w-auto text-gold"
          size={168}
          draw
          drawDelay={OVERTURE.draw}
        />
        {/* Sapuan cahaya sekali lewat, tepat saat garis terakhir selesai. */}
        <div
          className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(246,230,192,0.5), transparent)",
            animation: `sheen 900ms cubic-bezier(0.4,0,0.2,1) ${OVERTURE.type + 120}ms both`,
          }}
        />
      </div>

      <p className="mrz mt-8 text-[0.6rem] text-gold/45">
        {line.slice(0, locked)}
        {locked < line.length && <span className="text-gold/80">{noise}</span>}
      </p>
    </div>
  );
}
