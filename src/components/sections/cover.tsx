"use client";

import { useEffect, useRef, useState } from "react";
import { wedding } from "@/config/wedding";
import { withSoftBreaks } from "@/lib/text";
import { IkatBand, IkatField } from "@/components/tenun/ikat";
import { TenunEmblem } from "@/components/tenun/emblem";
import { eventDateParts } from "@/lib/datetime";
import { coupleMrz } from "@/lib/wedding-mrz";

const mrz = coupleMrz();
const coverDate = eventDateParts(wedding.events[0].start);

/**
 * Sampul paspor — layar pertama yang dilihat tamu.
 *
 * Kartu bereaksi pada kemiringan perangkat (gyro) di ponsel dan pada posisi
 * kursor di desktop. Kemiringan itu juga menggeser sapuan foil emas pada
 * nama mempelai, sehingga terasa seperti cetak emas sungguhan yang memantul.
 */
export function Cover({
  guestName,
  onOpen,
}: {
  guestName?: string;
  onOpen: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // rx/ry: derajat kemiringan. fx: posisi sapuan foil (0–100%).
    let raf = 0;
    let target = { rx: 0, ry: 0 };
    const current = { rx: 0, ry: 0 };

    const apply = () => {
      current.rx += (target.rx - current.rx) * 0.08;
      current.ry += (target.ry - current.ry) * 0.08;
      card.style.setProperty("--rx", `${current.rx.toFixed(2)}deg`);
      card.style.setProperty("--ry", `${current.ry.toFixed(2)}deg`);
      card.style.setProperty("--foil-x", `${50 + current.ry * 4}%`);
      raf = requestAnimationFrame(apply);
    };
    raf = requestAnimationFrame(apply);

    const onPointer = (e: PointerEvent) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      target = { rx: -py * 10, ry: px * 12 };
    };

    // Gyro: beta = depan/belakang, gamma = kiri/kanan.
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      const beta = Math.max(-40, Math.min(40, e.beta - 40));
      const gamma = Math.max(-40, Math.min(40, e.gamma));
      target = { rx: -beta * 0.18, ry: gamma * 0.25 };
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("deviceorientation", onOrient, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("deviceorientation", onOrient);
    };
  }, []);

  const handleOpen = () => {
    setLeaving(true);
    // Beri waktu animasi sampul terangkat sebelum isi undangan mengambil alih.
    window.setTimeout(onOpen, 900);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-ink px-6 transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.7,0,0.2,1)] ${
        leaving ? "pointer-events-none -translate-y-8 opacity-0" : ""
      }`}
      style={{ perspective: "1400px" }}
    >
      <div
        ref={cardRef}
        className="relative w-full max-w-sm"
        style={{
          transform: "rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Badan sampul */}
        <div className="relative overflow-hidden rounded-[3px] bg-cover shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)]">
          <div className="pointer-events-none absolute inset-0">
            <IkatField color="var(--color-gold)" opacity={0.07} scale={1.1} className="h-full w-full" />
          </div>

          {/* Kilau permukaan yang ikut bergerak dengan kemiringan */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "linear-gradient(115deg, transparent 35%, rgba(216,184,120,0.16) 48%, transparent 60%)",
              backgroundSize: "220% 100%",
              backgroundPositionX: "var(--foil-x, 50%)",
            }}
          />

          {/* Bingkai ganda ala paspor, berhenti tepat di atas zona MRZ */}
          <div className="relative m-3 border border-gold/35 p-[5px]">
            <div className="flex flex-col items-center border border-gold/15 px-6 py-[clamp(1.75rem,6vh,3rem)] text-center">
              <p className="field-label text-gold/70">Undangan Pernikahan</p>

              <TenunEmblem
                className="mt-[clamp(1.25rem,4vh,2rem)] h-[clamp(72px,13vh,112px)] w-auto text-gold"
                size={112}
              />

              <p className="field-label mt-[clamp(1.25rem,4vh,2rem)] text-gold/60">Mempelai</p>
              <h1 className="display foil mt-3 text-[clamp(1.9rem,7vh,2.6rem)] leading-[1.15]">
                {wedding.couple.groom.name}
                {/* Ampersand tidak boleh memakai opacity: elemen semi-transparan
                    di dalam background-clip:text ikut menghapus gradien foil. */}
                <span className="block font-[350] text-[0.6em] text-gold-3 italic">&amp;</span>
                {wedding.couple.bride.name}
              </h1>

              <div className="mt-[clamp(1.25rem,4vh,2.25rem)] h-px w-16 bg-gold/40" />

              {/* Tanggal lewat eventDateParts, bukan timeZone yang ditulis
                  langsung — offset di konfigurasi yang menentukan, bukan zona
                  perangkat tamu. Untuk acara WITA pagi keduanya kebetulan sama,
                  tapi menggeser jam acara saja sudah cukup memundurkan tanggal. */}
              <p className="mrz mt-[clamp(0.85rem,2.5vh,1.5rem)] text-gold/55">
                {[coverDate.day, coverDate.month, coverDate.year].join(" · ")}
              </p>
            </div>
          </div>

          {/* Zona MRZ dua baris, dicetak di kaki sampul persis seperti paspor */}
          <div className="relative border-t border-gold/20 bg-black/30 px-4 py-2.5">
            {mrz.map((line, i) => (
              <p
                key={i}
                className="mrz text-[0.47rem] leading-[1.7] whitespace-pre text-gold/45"
              >
                {line}
              </p>
            ))}
          </div>
        </div>

        {/* Slip tamu — kartu yang terselip di antara halaman paspor.
            Dimiringkan sedikit, lebih sempit dari sampul, dan bertepi robek
            di bagian atas supaya terbaca sebagai benda terpisah yang
            diselipkan, bukan kotak putih yang ditempel di bawah. */}
        <div className="relative mx-7 -mt-3 -rotate-[1.2deg]">
          <div className="grain torn-top relative overflow-hidden rounded-b-[2px] bg-paper-2 shadow-[0_20px_34px_-16px_rgba(0,0,0,0.9)]">
            <div className="grain-layer" />

            <div className="relative flex items-center gap-3 px-5 pt-5 pb-4">
              <IkatBand
                className="w-4 shrink-0 opacity-35"
                height={44}
                color="var(--color-ink)"
              />

              <div className="min-w-0 flex-1 text-left">
                <p className="field-label text-ink-soft/80">Kepada Yth.</p>
                {/* Nama panjang dibiarkan turun ke baris kedua, bukan dipotong —
                    nama tamu adalah hal terakhir yang boleh dipangkas.
                    `overflow-wrap:anywhere` tetap dipertahankan sebagai jaring
                    pengaman, tapi titik putus setelah garis miring diberikan
                    lebih dulu lewat `withSoftBreaks` — tanpa itu sapaan bawaan
                    "Bapak/Ibu/Saudara/i" patah di tengah kata jadi
                    "Saudar / a/i". */}
                <p className="display mt-1 text-[1.3rem] leading-tight text-balance break-words [overflow-wrap:anywhere] text-ink">
                  {withSoftBreaks(guestName || wedding.site.defaultGuest)}
                </p>
                <p className="mrz mt-1.5 text-[0.45rem] text-ink-soft/55">
                  ADMIT<span className="mx-1">·</span>
                  {wedding.couple.groom.name.toUpperCase()}
                  <span className="mx-1">&amp;</span>
                  {wedding.couple.bride.name.toUpperCase()}
                </p>
              </div>

              <TenunEmblem className="shrink-0 text-gold-3/45" size={34} />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpen}
          className="group mx-auto mt-[clamp(1.25rem,4vh,2rem)] flex items-center gap-3 rounded-full border border-gold/40 px-7 py-3 transition-colors hover:border-gold hover:bg-gold/10"
        >
          <span className="field-label text-gold">Buka Undangan</span>
          <span className="text-gold transition-transform duration-300 group-hover:translate-x-1">
            &rarr;
          </span>
        </button>
      </div>
    </div>
  );
}
