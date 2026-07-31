import { wedding } from "@/config/wedding";
import { PassportPage } from "@/components/passport/page";
import { Stamp } from "@/components/passport/stamp";
import { Reveal } from "@/components/motion/reveal";
import { TenunEmblem } from "@/components/tenun/emblem";

/** Halaman pembuka — ayat, sebelum tamu berkenalan dengan mempelai. */
export function Bismillah() {
  return (
    <PassportPage
      id="pembuka"
      label="Halaman Pengesahan"
      page="Hal. 01"
      stampPosition="bottom-left"
      stamp={
        <Stamp top="DENGAN NAMA ALLAH" bottom="BISMILLAH" center="01" rotate={-13} size={104} />
      }
      uvSeed={3}
      // Doa yang tidak dicetak di permukaan. Tamu yang menemukan lampunya
      // mendapat sesuatu yang tidak dibagikan ke semua orang — itulah seluruh
      // maksudnya.
      uv={
        <p className="uv-glow absolute inset-x-8 bottom-[18%] text-center text-[0.72rem] leading-relaxed font-light text-[var(--color-uv-glow)]">
          {wedding.uv.blessing}
        </p>
      }
    >
      <div className="flex flex-col items-center text-center">
        <TenunEmblem className="text-gold-3/70" size={64} />

        <Reveal delay={120}>
          <p className="mt-7 font-arabic text-2xl leading-loose text-ink">
            بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
          </p>
        </Reveal>

        <Reveal delay={220}>
          <p className="mt-8 font-arabic text-[1.35rem] leading-[2.4] text-ink" dir="rtl">
            {wedding.quran.arabic}
          </p>
        </Reveal>

        <Reveal delay={320}>
          <p className="mt-8 text-[0.9rem] leading-relaxed font-light text-ink-soft">
            {wedding.quran.translation}
          </p>
        </Reveal>

        <Reveal delay={400}>
          <p className="field-label mt-6 text-gold-3">{wedding.quran.source}</p>
        </Reveal>
      </div>
    </PassportPage>
  );
}
