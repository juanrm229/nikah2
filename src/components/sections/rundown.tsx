"use client";

import { wedding } from "@/config/wedding";
import { Heading } from "@/components/passport/page";
import { SplitFlapText } from "@/components/passport/split-flap";
import { Reveal } from "@/components/motion/reveal";
import { IkatField } from "@/components/tenun/ikat";

/**
 * Papan keberangkatan — susunan acara hari itu.
 *
 * Section gelap dan full-bleed supaya terasa seperti berdiri di depan papan
 * jadwal bandara, bukan membaca tabel di selembar kertas.
 */
export function Rundown() {
  return (
    <section id="rundown" className="relative overflow-hidden px-4 py-[clamp(4rem,12vh,7rem)]">
      <div className="pointer-events-none absolute inset-0">
        <IkatField color="var(--color-paper)" opacity={0.035} scale={1.4} className="h-full w-full" />
      </div>

      <div className="relative mx-auto w-full max-w-md">
        <Reveal>
          <Heading label="Susunan Acara" title="Papan Keberangkatan" tone="paper" />
        </Reveal>

        <Reveal delay={140} className="mt-10">
          <div className="overflow-hidden rounded-[3px] border border-paper/12 bg-ink-2/80 shadow-[0_24px_50px_-25px_rgba(0,0,0,0.9)]">
            {/* Kepala papan */}
            <div className="flex items-center justify-between border-b border-paper/12 bg-black/35 px-4 py-2.5">
              <span className="field-label text-gold">Waktu</span>
              <span className="field-label text-gold">Agenda</span>
            </div>

            <ul>
              {wedding.rundown.map((row, i) => (
                <li
                  key={row.time + row.label}
                  className="flex items-center gap-3 border-b border-paper/8 px-4 py-3.5 last:border-b-0"
                >
                  <SplitFlapText
                    text={row.time}
                    delay={i * 160}
                    className="shrink-0 text-[1.05rem]"
                  />

                  <div className="min-w-0 flex-1 text-right">
                    <p className="truncate text-[0.9rem] font-light text-paper">{row.label}</p>
                    <SplitFlapText
                      text={row.sub}
                      delay={i * 160 + 220}
                      className="mt-1 justify-end text-[0.52rem] opacity-70"
                      cellClassName="bg-ink-3/60"
                    />
                  </div>
                </li>
              ))}
            </ul>

            {/* Kaki papan, meniru pita pengumuman di bawah papan bandara */}
            <div className="border-t border-paper/12 bg-black/35 px-4 py-2">
              <p className="mrz-text text-[0.5rem] text-gold/45">
                {wedding.events[0].venue} · Mohon hadir tepat waktu
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
