import { wedding } from "@/config/wedding";
import { Reveal } from "@/components/motion/reveal";
import { Stamp } from "@/components/passport/stamp";
import { IkatField } from "@/components/tenun/ikat";
import { TenunEmblem } from "@/components/tenun/emblem";
import { eventDateParts } from "@/lib/datetime";
import { coupleMrz } from "@/lib/wedding-mrz";

/**
 * Halaman terakhir paspor — penutup undangan.
 *
 * Sengaja meniru sampul, bukan halaman paspor bagian dalam: warna `cover`,
 * bingkai gandanya, emblem, dan zona MRZ yang sama. Tamu yang menggulir sampai
 * habis harus merasa sedang MENUTUP paspor yang ia buka di awal, bukan berhenti
 * di tengah tumpukan halaman. Itu juga sebabnya section ini tidak memakai
 * `PassportPage`.
 *
 * Bedanya dari sampul hanya satu, dan itu penting: stempel keluar. Sampul masih
 * bersih, halaman terakhir sudah penuh cap — persis paspor yang sudah dipakai.
 */

const mrz = coupleMrz();

/**
 * Tanggal acara untuk badan stempel, mis. "15.11.26".
 *
 * Lewat `eventDateParts`, bukan `toLocaleDateString` dengan zona yang ditulis
 * langsung — tanggalnya harus ikut offset di konfigurasi, bukan zona perangkat
 * tamu maupun zona yang dihardcode.
 */
function stampDate(): string {
  const { day, month, year } = eventDateParts(wedding.events[0].start);
  return `${day}.${month}.${year.slice(-2)}`;
}

export function Closing() {
  const { groom, bride } = wedding.couple;

  return (
    <section id="penutup" className="relative px-4 pt-[clamp(3rem,10vh,6rem)] pb-[clamp(2rem,8vh,4rem)]">
      <Reveal className="mx-auto w-full max-w-sm" y={26}>
        <div className="relative overflow-hidden rounded-[3px] bg-cover shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)]">
          <div className="pointer-events-none absolute inset-0">
            <IkatField color="var(--color-gold)" opacity={0.07} scale={1.1} className="h-full w-full" />
          </div>

          {/* Bingkai ganda, berhenti tepat di atas zona MRZ — sama seperti sampul */}
          <div className="relative m-3 border border-gold/35 p-[5px]">
            <div className="flex flex-col items-center border border-gold/15 px-[clamp(1.25rem,5vw,2rem)] py-[clamp(1.75rem,6vh,3rem)] text-center">
              <p className="field-label text-gold/70">Halaman Terakhir</p>

              <TenunEmblem
                className="mt-[clamp(1rem,3.5vh,1.75rem)] h-[clamp(52px,9vh,72px)] w-auto text-gold/80"
                size={72}
              />

              <p className="mt-[clamp(1.25rem,4vh,2rem)] max-w-[30ch] text-[0.86rem] leading-relaxed font-light text-paper/85">
                {wedding.closing.note}
              </p>

              <div className="mt-[clamp(1.25rem,4vh,2rem)] h-px w-16 bg-gold/40" />

              <p className="field-label mt-[clamp(1.25rem,4vh,2rem)] text-gold/60">
                {wedding.closing.sign}
              </p>
              <p className="display foil mt-3 text-[clamp(1.5rem,5.5vw,2rem)] leading-[1.2]">
                {groom.name}
                {/* Ampersand tanpa opacity: elemen semi-transparan di dalam
                    background-clip:text ikut menghapus gradien foil. */}
                <span className="px-2 font-[350] text-[0.7em] text-gold-3 italic">&amp;</span>
                {bride.name}
              </p>

              {/* Kedua keluarga, ditulis sebagai dua baris terpisah supaya di
                  layar sempit tidak jadi satu paragraf panjang yang sulit dibaca. */}
              <div className="mt-5 space-y-1.5">
                <p className="text-[0.78rem] leading-snug font-light text-paper-dim">
                  Kel. {groom.father} &amp; {groom.mother}
                </p>
                <p className="text-[0.78rem] leading-snug font-light text-paper-dim">
                  Kel. {bride.father} &amp; {bride.mother}
                </p>
              </div>

              {/* Stempel keluar. Ditaruh di dalam bingkai, bukan menggantung di
                  tepinya — di layar ponsel tidak ada ruang di luar kartu. */}
              <Stamp
                className="mt-[clamp(1.5rem,5vh,2.5rem)]"
                top="SAMPAI BERJUMPA"
                bottom="BALIKPAPAN · BPN"
                center={stampDate()}
                color="var(--color-gold-2)"
                rotate={-6}
                size={116}
              />

              <p className="mt-[clamp(1rem,3.5vh,1.75rem)] max-w-[28ch] text-[0.78rem] leading-relaxed font-light text-paper/70">
                {wedding.closing.thanks}
              </p>
            </div>
          </div>

          {/* Zona MRZ, penutup yang sama dengan kaki sampul */}
          <div className="relative border-t border-gold/20 bg-black/30 px-4 py-2.5">
            {mrz.map((line, i) => (
              <p key={i} className="mrz text-[0.47rem] leading-[1.7] whitespace-pre text-gold/45">
                {line}
              </p>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
