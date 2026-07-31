"use client";

import { wedding } from "@/config/wedding";
import { Heading } from "@/components/passport/page";
import { SplitFlapText } from "@/components/passport/split-flap";
import { Reveal } from "@/components/motion/reveal";
import { IkatField } from "@/components/tenun/ikat";
import { BOARD_STATUS, useEventClock } from "@/components/live/use-event-clock";
import { hhmmToMinutes } from "@/lib/datetime";

/**
 * Agenda yang sedang berjalan: baris terakhir yang jamnya sudah lewat.
 *
 * Dihitung dari daftar, bukan dari rentang mulai–selesai per baris, karena
 * susunan acara tidak punya jam selesai — satu agenda berjalan sampai agenda
 * berikutnya mengambil alih, persis seperti papan bandara sungguhan.
 */
function runningIndex(minutes: number) {
  let index = -1;
  wedding.rundown.forEach((row, i) => {
    if (minutes >= hhmmToMinutes(row.time)) index = i;
  });
  return index;
}

/** Pita pengumuman di kaki papan, ikut berganti bersama babaknya. */
function footnote(phase?: string) {
  if (phase === "berlangsung") return "Acara sedang berlangsung";
  if (phase === "usai") return "Terima kasih sudah datang";
  if (phase === "menjelang") return "Besok — mohon hadir tepat waktu";
  return "Mohon hadir tepat waktu";
}

/**
 * Papan keberangkatan — susunan acara hari itu.
 *
 * Section gelap dan full-bleed supaya terasa seperti berdiri di depan papan
 * jadwal bandara, bukan membaca tabel di selembar kertas.
 */
export function Rundown() {
  const clock = useEventClock();
  const live = clock?.phase === "berlangsung";
  // Baris hanya disorot selama acara benar-benar berjalan. Di luar hari itu,
  // "pukul 11.00" pada jam dinding mana pun tidak berarti apa-apa — papan yang
  // menyorot "Santap siang" di hari Selasa biasa hanya membingungkan.
  const running = live ? runningIndex(clock.minutes) : -1;

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
            {/* Pita status. Teksnya berubah sendiri saat babaknya berganti,
                dan karena ia split-flap, papannya BERBUNYI saat itu terjadi —
                tamu yang kebetulan sedang membaca akan melihat undangannya
                berpindah babak di depan matanya. */}
            <div className="flex items-center justify-between gap-3 border-b border-paper/12 bg-black/45 px-4 py-2">
              <span className="field-label text-paper-dim/80">Status</span>
              {clock ? (
                <SplitFlapText
                  text={BOARD_STATUS[clock.phase]}
                  className="text-[0.62rem]"
                  cellClassName={live ? "bg-gold/25 text-gold-2" : undefined}
                />
              ) : (
                // Sebelum klien tahu jam berapa sekarang. Bukan "TERJADWAL":
                // menebak babak lalu meralatnya sedetik kemudian jauh lebih
                // buruk daripada diam sebentar.
                <span className="field-label text-paper-dim/50">—</span>
              )}
            </div>

            {/* Kepala papan */}
            <div className="flex items-center justify-between border-b border-paper/12 bg-black/35 px-4 py-2.5">
              <span className="field-label text-gold">Waktu</span>
              <span className="field-label text-gold">Agenda</span>
            </div>

            <ul>
              {wedding.rundown.map((row, i) => {
                const isNow = i === running;
                const done = running > -1 && i < running;

                return (
                  <li
                    key={row.time + row.label}
                    className={`relative flex items-center gap-3 border-b border-paper/8 px-4 py-3.5 transition-[background-color,opacity] duration-700 last:border-b-0 ${
                      isNow ? "bg-gold/10" : ""
                    } ${done ? "opacity-45" : ""}`}
                  >
                    {/* Batang emas di tepi kiri, penanda baris yang sedang
                        berjalan. Bukan panah atau titik: papan bandara menandai
                        baris aktifnya dengan cahaya, bukan dengan ikon. */}
                    {isNow && (
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-[3px] bg-gold shadow-[0_0_14px_0_var(--color-gold)]"
                      />
                    )}

                    <SplitFlapText
                      text={row.time}
                      delay={i * 160}
                      className="shrink-0 text-[1.05rem]"
                    />

                    <div className="min-w-0 flex-1 text-right">
                      <p
                        className={`truncate text-[0.9rem] font-light ${
                          isNow ? "text-gold-2" : "text-paper"
                        }`}
                      >
                        {row.label}
                      </p>
                      <SplitFlapText
                        text={isNow ? "SEKARANG" : row.sub}
                        delay={i * 160 + 220}
                        className="mt-1 justify-end text-[0.52rem] opacity-70"
                        cellClassName={isNow ? "bg-gold/30 text-gold-2" : "bg-ink-3/60"}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Kaki papan, meniru pita pengumuman di bawah papan bandara */}
            <div className="border-t border-paper/12 bg-black/35 px-4 py-2">
              <p className="mrz-text text-[0.5rem] text-gold/45">
                {wedding.events[0].venue} · {footnote(clock?.phase)}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
