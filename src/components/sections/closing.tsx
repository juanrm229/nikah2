"use client";

import { useEffect, useRef } from "react";
import { wedding } from "@/config/wedding";
import { Reveal } from "@/components/motion/reveal";
import { Stamp } from "@/components/passport/stamp";
import { IkatField } from "@/components/tenun/ikat";
import { TenunEmblem } from "@/components/tenun/emblem";
import { eventDateParts } from "@/lib/datetime";
import { coupleMrz } from "@/lib/wedding-mrz";
import { UvLayer } from "@/components/uv/layer";
import { useSerial } from "@/components/passport/serial";
import { useLeafExit, LeafShade } from "@/components/motion/leaf";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";

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
 *
 * Dan sekarang ia benar-benar MENUTUP. Undangan ini dibuka dengan daun sampul
 * yang berayun di engsel kiri; di sini daun yang sama berayun balik dan
 * mendarat menutupi halaman terakhir. Sumbu putar, jangkauan sudut, dan
 * perspektifnya diambil persis dari <Cover> — kalau salah satunya berbeda,
 * yang terbaca bukan paspor yang sama yang ditutup kembali, melainkan dua
 * benda berbeda yang kebetulan sama-sama navy.
 */

/** Lebar rancangan panggung penutup. Sama perannya dengan DESIGN_W di sampul. */
const DESIGN_W = 340;
/** Jangan pernah membesarkan melebihi ukuran rancangannya. */
const MAX_FIT = 1.12;

/**
 * Babak menutup, sebagai pecahan perjalanan gulir di dalam section.
 *
 * Sebelum `START` daunnya masih terbuka lebar dan halaman terakhir terbaca
 * utuh — tamu tidak boleh dipaksa mengejar tulisan yang sedang ditutupi. Antara
 * `START` dan `END` daunnya berayun. Sesudah `END` masih ada sisa gulir supaya
 * paspor yang sudah tertutup sempat DILIHAT sebentar sebagai benda utuh,
 * bukan langsung tergulir keluar layar di frame yang sama saat ia mendarat.
 */
const SHUT = { start: 0.42, end: 0.9 };

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
  const reduced = usePrefersReducedMotion();

  // Tanpa animasi, tidak ada daun sampul sama sekali — bukan daun yang dibekukan
  // di suatu sudut. Daun yang diam di −160° bukan "gerak yang dimatikan", ia
  // lembaran navy yang menjulur ke samping tanpa alasan. Yang tersisa persis
  // susunan penutup yang sudah terbukti sebelum ini.
  if (reduced) {
    return (
      <section
        id="penutup"
        className="relative px-4 pt-[clamp(3rem,10vh,6rem)] pb-[clamp(2rem,8vh,4rem)]"
      >
        <Reveal className="mx-auto w-full max-w-sm" y={26}>
          <BackCoverCard />
        </Reveal>
      </section>
    );
  }

  return <ClosingBook />;
}

function ClosingBook() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  /**
   * Perkecil panggung supaya muat satu layar — cara yang sama dengan sampul.
   *
   * Diukur dari `offsetWidth`/`offsetHeight`: dua-duanya ukuran TATA LETAK dan
   * tidak terpengaruh transform, jadi menulis `--fit` tidak mengubah angka yang
   * baru saja dibaca. Tanpa sifat itu, ResizeObserver di bawah akan saling
   * memicu tanpa henti.
   */
  useEffect(() => {
    const stage = stageRef.current;
    const frame = stage?.parentElement;
    if (!stage || !frame) return;

    const fit = () => {
      const w = stage.offsetWidth;
      const h = stage.offsetHeight;
      if (!w || !h) return;

      // `clientWidth`/`clientHeight` SUDAH termasuk padding, jadi memakainya
      // apa adanya berarti paspornya diskalakan sampai menyentuh kedua tepi
      // layar dan padding bingkainya tidak pernah berlaku. Diukur dari kotak
      // isinya supaya buku yang tertutup masih punya udara di sekelilingnya —
      // benda yang mepet ke tepi layar berhenti terbaca sebagai benda.
      const cs = getComputedStyle(frame);
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);

      const s = Math.min(
        (frame.clientWidth - padX) / w,
        (frame.clientHeight - padY) / h,
        MAX_FIT,
      );
      stage.style.setProperty("--fit", s.toFixed(4));
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(frame);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  /**
   * Seberapa jauh daun sampul sudah tertutup, 0–1.
   *
   * Ditulis ke custom property lewat rAF, bukan ke state React — alasannya sama
   * dengan benang di tepi kanan: satu render React per frame gulir adalah hal
   * pertama yang terasa murah di ponsel.
   */
  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    let raf = 0;

    const measure = () => {
      raf = 0;
      // Panjang perjalanan gulir selagi panggungnya dipaku: tinggi section
      // dikurangi tinggi layar. Di bawah nol berarti sectionnya lebih pendek
      // dari layar dan tidak ada yang bisa dipaku.
      const travel = section.offsetHeight - window.innerHeight;
      if (travel <= 0) {
        stage.style.setProperty("--shut", "0");
        return;
      }

      const passed = Math.min(travel, Math.max(0, -section.getBoundingClientRect().top));
      const p = passed / travel;
      const shut = Math.min(
        1,
        Math.max(0, (p - SHUT.start) / (SHUT.end - SHUT.start)),
      );
      stage.style.setProperty("--shut", shut.toFixed(4));
    };

    // Jadwal ulang, bukan tolak-kalau-sudah-antre — lihat catatan di <ScrollThread>.
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    // Tinggi berlebih inilah yang memberi daun sampul ruang untuk berayun.
    // Tanpanya penutupnya harus menutup selagi kartunya sendiri sedang meluncur
    // keluar layar — dan tamu tidak pernah benar-benar MELIHAT paspornya
    // tertutup, hanya sempat melihatnya pergi.
    <section ref={sectionRef} id="penutup" className="relative h-[210svh]">
      <div className="sticky top-0 flex h-[100svh] items-center justify-center px-4 py-6">
        <div
          ref={stageRef}
          // `shrink-0` menjaga janji pendekatan ini: yang mengecilkan harus
          // `--fit`, bukan flex. Begitu lebarnya yang berubah, tata letak di
          // dalamnya mengalir ulang dan proporsinya berbeda per perangkat.
          className="shrink-0"
          style={{
            width: DESIGN_W,
            transform: "scale(var(--fit, 1))",
            transformOrigin: "center center",
            perspective: "1250px",
            perspectiveOrigin: "34% 46%",
          }}
        >
          <div className="relative" style={{ transformStyle: "preserve-3d" }}>
            {/* Bayangan di lantai. Mengetat saat daunnya mendarat — buku yang
                tertutup menyentuh meja lebih rapat daripada buku yang menganga. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-[7%] bottom-[-14px] h-10 rounded-[50%] bg-black/80 blur-2xl"
              style={{ transform: "scaleX(calc(1 - var(--shut, 0) * 0.12))" }}
            />

            {/* Blok halaman di sisi seberang punggung. Di pembungkus, bukan di
                daun sampul — kertas tidak ikut berayun. */}
            <div
              aria-hidden
              className="page-block pointer-events-none absolute top-[6px] bottom-[6px] -right-[5px] w-[6px] rounded-r-[2px] opacity-70"
            />

            {/* Halaman terakhir: yang dibaca tamu selagi sampulnya masih terbuka. */}
            <BackCoverCard />

            {/* ── Daun sampul yang menutup ──
                −160° saat terbuka, 0° saat mendarat. Jangkauan yang sama dengan
                <Cover> (yang membuka 0° → −158°), hanya arahnya dibalik. */}
            <div
              className="absolute inset-0"
              style={{
                transformStyle: "preserve-3d",
                transformOrigin: "left center",
                transform: "rotateY(calc(-160deg + var(--shut, 0) * 160deg))",
              }}
            >
              {/* Muka LUAR sampul — yang terlihat saat sudah tertutup. */}
              <div
                className="leather absolute inset-0 overflow-hidden rounded-[3px] bg-cover shadow-[0_44px_90px_-24px_rgba(0,0,0,0.95)]"
                style={{ backfaceVisibility: "hidden" }}
              >
                <div className="grain-dark" />
                <div className="pointer-events-none absolute inset-0">
                  <IkatField
                    color="var(--color-gold)"
                    opacity={0.07}
                    scale={1.1}
                    className="h-full w-full"
                  />
                </div>

                {/* Bingkai ganda yang sama dengan sampul depan dan halaman
                    terakhir. Tanpa bingkai ini muka belakangnya cuma bidang
                    navy dengan tulisan menggantung di tengah — dan yang
                    seharusnya terbaca sebagai "paspor yang sama, ditutup"
                    malah terbaca sebagai kartu lain yang kebetulan senada. */}
                <div className="relative m-3 h-[calc(100%-1.5rem)] border border-gold/35 p-[5px]">
                  <div className="flex h-full flex-col items-center justify-center gap-[clamp(0.9rem,2.5vh,1.5rem)] border border-gold/15 px-6 text-center">
                    <TenunEmblem className="h-16 w-auto text-gold/75" size={72} />
                    <p className="field-label text-gold/60">Sampai Berjumpa</p>
                    <div className="h-px w-14 bg-gold/35" />
                    <p className="display foil text-[1.5rem] leading-[1.2]">
                      {wedding.couple.groom.name}
                      <span className="px-2 font-[350] text-[0.7em] text-gold-3 italic">
                        &amp;
                      </span>
                      {wedding.couple.bride.name}
                    </p>
                    {/* Tanggal yang sama dengan yang tercetak di sampul depan —
                        satu-satunya angka yang dibawa paspor ini dari muka
                        depannya sampai ke punggungnya. */}
                    <p className="mrz text-[0.62rem] text-gold/45">{stampDate()}</p>
                  </div>
                </div>

                {/* Punggung buku di tepi engsel — sisi tempat ia berputar. */}
                <div
                  aria-hidden
                  className="book-spine pointer-events-none absolute inset-y-0 left-0 w-[14px]"
                />
              </div>

              {/* Muka DALAM sampul, yang menghadap tamu selagi masih terbuka.
                  Tanpa muka kedua ini, daunnya lenyap begitu melewati 90° dan
                  yang terlihat cuma halaman yang tiba-tiba tertutup sendiri. */}
              <div
                aria-hidden
                className="absolute inset-0 overflow-hidden rounded-[3px] bg-cover-2"
                style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
              >
                <div className="absolute inset-0 bg-black/45" />
                <IkatField
                  color="var(--color-gold)"
                  opacity={0.05}
                  scale={0.9}
                  className="h-full w-full"
                />
                <div className="absolute inset-3 border border-gold/12" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Isi halaman terakhir — sama persis baik dipakai berdiri sendiri maupun di dalam buku. */
function BackCoverCard() {
  const { groom, bride } = wedding.couple;

  // Nomor yang sama dengan yang tercetak di sampul — termasuk digit
  // pemeriksanya, yang dihitung ulang dari nomor itu. Halaman terakhir meniru
  // sampul sampai ke barisan mesinnya; nomor yang berbeda di antara keduanya
  // akan membatalkan seluruh tiruan itu dalam satu tatapan.
  const serial = useSerial();
  const mrz = coupleMrz(serial);
  const leaf = useLeafExit<HTMLDivElement>();

  return (
    <div
      ref={leaf}
      className="leaf-exit relative overflow-hidden rounded-[3px] bg-cover shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)]"
    >
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
      <div className="mrz-zone relative border-t border-gold/20 bg-black/30 px-4 py-2.5">
        {mrz.map((line, i) => (
          <p
            key={i}
            className="mrz mrz-fit leading-[1.7] whitespace-pre text-gold/45"
            style={{ "--mrz-cap": "0.47rem" } as React.CSSProperties}
          >
            {line}
          </p>
        ))}
      </div>

      <LeafShade />

      {/* Halaman terakhir menyimpan rahasia yang paling pantas ada di sana:
          doa penutup, yang tidak pernah dicetak di permukaan mana pun. */}
      <UvLayer tone="cover" seed={53}>
        <p className="uv-glow absolute inset-x-7 bottom-[13%] text-center text-[0.74rem] leading-relaxed font-light text-[var(--color-uv-glow)]">
          {wedding.uv.blessing}
        </p>
      </UvLayer>
    </div>
  );
}
