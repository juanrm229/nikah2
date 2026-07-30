"use client";

import { useEffect, useState } from "react";
import { MAIN_DATE, wedding } from "@/config/wedding";
import { countdownTo, formatDateLong, type Countdown } from "@/lib/datetime";
import { Heading } from "@/components/passport/page";
import { Reveal } from "@/components/motion/reveal";

/**
 * Hitung mundur menuju akad.
 *
 * Angkanya dihitung di klien, tidak dirender di server: kalau server yang
 * menghitung, tamu akan melihat sisa waktu yang beku pada saat halaman
 * dibuat, bukan saat mereka membaca.
 */
export function CountdownSection() {
  const [time, setTime] = useState<Countdown | null>(null);

  useEffect(() => {
    const update = () => setTime(countdownTo(MAIN_DATE));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative px-4 py-[clamp(3.5rem,10vh,6rem)]">
      <div className="mx-auto w-full max-w-md text-center">
        <Reveal>
          <Heading label="Menuju Hari Itu" title="Waktu Keberangkatan" tone="paper" />
        </Reveal>

        <Reveal delay={120}>
          <p className="mt-6 text-[0.9rem] font-light text-paper-dim">
            {formatDateLong(MAIN_DATE)}
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="mt-8 grid grid-cols-4 gap-2">
            {(
              [
                ["Hari", time?.days],
                ["Jam", time?.hours],
                ["Menit", time?.minutes],
                ["Detik", time?.seconds],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-[2px] border border-paper/12 bg-ink-2/70 px-1 py-4"
              >
                <p className="font-mono text-[1.6rem] tabular-nums text-gold-2">
                  {/* Sebelum klien menghitung, tampilkan garis — bukan nol,
                      supaya tidak terbaca "acara sudah lewat". */}
                  {value === undefined ? "––" : String(value).padStart(2, "0")}
                </p>
                <p className="field-label mt-1">{label}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {time?.passed && (
          <Reveal delay={80}>
            <p className="display mt-8 text-xl text-gold-2">
              Hari ini kami menikah. Terima kasih sudah datang.
            </p>
          </Reveal>
        )}

        <Reveal delay={280}>
          <p className="field-label mt-8 text-paper-dim/70">
            {wedding.events[0].venue}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
