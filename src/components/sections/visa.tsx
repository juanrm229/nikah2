"use client";

import { Heading } from "@/components/passport/page";
import { Stamp } from "@/components/passport/stamp";
import { Reveal } from "@/components/motion/reveal";
import { IkatField } from "@/components/tenun/ikat";
import { useSerial } from "@/components/passport/serial";
import { stampTraits } from "@/lib/stamp";
import { VISA_STAMPS, useVisa } from "@/lib/passport-log";
import { VisaShare } from "@/components/sections/visa-share";

/**
 * Halaman visa — cap yang dikumpulkan tamu sendiri.
 *
 * Ini bagian undangan yang paling mungkin dipotret dan dikirim ke orang lain,
 * dan alasannya bukan karena ia paling cantik: karena isinya MILIK TAMU. Yang
 * dipamerkan orang bukan undangan mempelai, melainkan paspornya sendiri yang
 * penuh — dan paspor itu tidak bisa penuh tanpa mengerjakan sesuatu.
 *
 * Slot yang masih kosong sengaja tetap ditampilkan, lengkap dengan apa yang
 * mengisinya. Halaman ini satu-satunya tempat di undangan yang boleh MEMINTA:
 * di sini permintaan itu berbentuk kolom kosong pada dokumen, bukan tombol
 * yang memohon — dan kolom kosong pada paspor punya daya tarik yang tidak
 * dimiliki kalimat ajakan mana pun.
 */
export function Visa({ guestName }: { guestName?: string }) {
  const serial = useSerial();
  const collected = useVisa(serial);
  const bearer = guestName || "Tamu Undangan";

  /**
   * Satu daftar untuk dua tujuan: yang dirender di halaman, dan yang digambar
   * ke kartu. Dihitung sekali di sini supaya sudut miring cap pada gambar
   * benar-benar sudut yang sama dengan yang dilihat tamu di layarnya — dua
   * perhitungan terpisah pasti akan berselisih pada suntingan pertama.
   */
  const stamps = VISA_STAMPS.map((stamp, i) => ({
    ...stamp,
    earned: collected.includes(stamp.id),
    // Cap milik tamu ini, bukan cap contoh: sudut & belang tintanya dihitung
    // dari nomor dokumennya. `variant` membuat empat cap di halaman yang sama
    // tidak jadi empat kembar.
    ...stampTraits(serial, { base: i % 2 ? 9 : -11, variant: i + 41 }),
  }));

  return (
    <section id="visa" className="relative px-4 py-[clamp(4rem,12vh,7rem)]">
      <div className="pointer-events-none absolute inset-0">
        <IkatField color="var(--color-paper)" opacity={0.03} scale={1.5} className="h-full w-full" />
      </div>

      <div className="relative mx-auto w-full max-w-md">
        <Reveal>
          <Heading label="Halaman Visa" title="Cap yang Terkumpul" tone="paper" />
        </Reveal>

        <Reveal delay={140} className="mt-10">
          <div className="grain relative overflow-hidden rounded-[3px] border border-ink/15 bg-paper-2 shadow-[0_28px_56px_-26px_rgba(0,0,0,0.9)]">
            <div className="pointer-events-none absolute inset-0">
              <IkatField color="var(--color-ink)" opacity={0.04} scale={0.8} className="h-full w-full" />
            </div>

            {/* Kepala halaman: siapa pemegangnya. Nama tamu hanya ada di
                undangan yang ditujukan; undangan umum jatuh ke sebutan yang
                sama dengan yang tercetak di slip sampulnya. */}
            <div className="relative flex items-end justify-between gap-3 border-b border-ink/15 px-4 py-3">
              <div className="min-w-0">
                <p className="field-label text-ink-soft/70">Pemegang</p>
                <p className="display truncate text-[1.05rem] leading-tight text-ink">
                  {bearer}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="field-label text-ink-soft/70">No. Dokumen</p>
                <p className="mrz text-[0.7rem] text-ink-2">{serial}</p>
              </div>
            </div>

            <ul className="relative grid grid-cols-2 gap-px bg-ink/10">
              {stamps.map((stamp) => {
                const { earned } = stamp;

                return (
                  <li
                    key={stamp.id}
                    className="flex min-h-[168px] flex-col items-center justify-center gap-2 bg-paper-2 px-3 py-5 text-center"
                  >
                    {earned ? (
                      <Stamp
                        active
                        top={stamp.top}
                        bottom={stamp.bottom}
                        center={stamp.center}
                        rotate={stamp.rotate}
                        seed={stamp.seed}
                        size={104}
                        serial={serial.slice(-4)}
                      />
                    ) : (
                      <>
                        {/* Bekas cap yang belum ada. Garis putus-putus, bukan
                            kotak abu-abu: yang harus terbaca adalah "tempatnya
                            sudah disediakan", bukan "fiturnya sedang dimatikan". */}
                        <span
                          aria-hidden
                          className="flex h-[86px] w-[86px] items-center justify-center rounded-full border border-dashed border-ink/25"
                        >
                          <span className="mrz text-[0.6rem] text-ink-soft/40">
                            {stamp.center}
                          </span>
                        </span>
                        <p className="max-w-[16ch] text-[0.68rem] leading-snug font-light text-ink-soft/70">
                          {stamp.hint}
                        </p>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="relative flex items-center justify-between border-t border-ink/15 px-4 py-2.5">
              <p className="mrz text-[0.55rem] text-ink-soft/70">
                {collected.length} DARI {VISA_STAMPS.length} CAP
              </p>
              <p className="mrz text-[0.55rem] text-ink-soft/45">
                {collected.length === VISA_STAMPS.length ? "LENGKAP" : "BERLAKU"}
              </p>
            </div>
          </div>
        </Reveal>

        <VisaShare name={bearer} serial={serial} stamps={stamps} />

        <p className="mx-auto mt-5 max-w-[34ch] text-center text-[0.72rem] leading-relaxed font-light text-paper-dim/60">
          Cap tersimpan di peranti ini saja. Membuka undangan dari ponsel lain
          berarti mulai dari halaman yang kosong lagi.
        </p>
      </div>
    </section>
  );
}
