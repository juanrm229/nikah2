"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { wedding } from "@/config/wedding";
import { withSoftBreaks } from "@/lib/text";
import { IkatBand, IkatField } from "@/components/tenun/ikat";
import { TenunEmblem } from "@/components/tenun/emblem";
import { Overture } from "@/components/motion/overture";
import { Dust } from "@/components/motion/dust";
import { eventDateParts } from "@/lib/datetime";
import { coupleMrz } from "@/lib/wedding-mrz";

const mrz = coupleMrz();
const coverDate = eventDateParts(wedding.events[0].start);

/**
 * Babak membuka sampul, dalam milidetik sejak tombol ditekan.
 *
 * Slip ditarik keluar LEBIH DULU, baru sampulnya berayun. Kalau keduanya
 * berjalan bersamaan, slip tampak tersangkut di daun sampul yang bergerak —
 * dan yang terbaca bukan "paspor dibuka" tapi "dua benda jatuh berbarengan".
 */
const OPEN = {
  slipDur: 420,
  swingAt: 240,
  swingDur: 1180,
  fadeAt: 1220,
  handoff: 1520,
};

/**
 * Sampul paspor — layar pertama yang dilihat tamu.
 *
 * Kartu bereaksi pada kemiringan perangkat (gyro) di ponsel dan pada posisi
 * kursor di desktop. Kemiringan itu juga menggeser sapuan foil emas pada
 * nama mempelai, bayangan di lantai, dan kilau di punggung buku — satu sumber
 * cahaya yang sama menggerakkan semuanya, karena cahaya yang tidak sepakat
 * justru membuat benda terlihat palsu.
 *
 * Menekan tombol tidak memudarkan sampul: sampulnya benar-benar TERBUKA pada
 * engsel di tepi kiri, memperlihatkan halaman pertama di baliknya.
 */
export function Cover({
  guestName,
  onOpen,
}: {
  guestName?: string;
  onOpen: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const handleReady = useCallback(() => setReady(true), []);

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
      // Bayangan bergeser BERLAWANAN dengan miringnya kartu — itulah yang
      // memberi tahu mata bahwa cahaya diam dan bendanya yang bergerak.
      card.style.setProperty("--shadow-x", `${(-current.ry * 1.1).toFixed(2)}px`);
      card.style.setProperty("--glare", `${(50 - current.ry * 2.2).toFixed(1)}%`);
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
    window.setTimeout(onOpen, OPEN.handoff);
  };

  return (
    <>
      {!ready && <Overture line={mrz[0]} onDone={handleReady} />}

      <div
        className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-ink px-7 transition-opacity duration-[420ms] ease-out ${
          leaving ? "pointer-events-none opacity-0" : ""
        }`}
        style={{
          perspective: "1250px",
          perspectiveOrigin: "34% 46%",
          transitionDelay: leaving ? `${OPEN.fadeAt}ms` : "0ms",
        }}
      >
        {/* Cahaya ruangan: satu sumber lembut di kiri atas, supaya sampul punya
            arah terang — bukan mengambang di hitam rata. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 28% 18%, rgba(176,141,79,0.15) 0%, rgba(22,32,58,0.10) 38%, transparent 72%)",
          }}
        />
        <Dust count={18} seed={3} />

        <div
          ref={cardRef}
          className={`relative w-full max-w-sm ${ready ? "animate-cover-settle" : "opacity-0"}`}
          style={{
            transform: "rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))",
            transformStyle: "preserve-3d",
          }}
        >
          {/* ── Tumpukan buku: halaman dalam, blok kertas, lalu daun sampul ── */}
          <div className="relative" style={{ transformStyle: "preserve-3d" }}>
            {/* Bayangan di lantai. Bergeser mengikuti kemiringan. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-[7%] bottom-[-14px] h-10 rounded-[50%] bg-black/80 blur-2xl"
              style={{ transform: "translateX(var(--shadow-x, 0px))" }}
            />

            {/* Blok halaman: tepi kertas yang menyembul di sisi seberang
                punggung. Ditaruh di pembungkus, BUKAN di daun sampul — kertas
                tidak ikut berayun saat sampulnya dibuka. */}
            <div
              aria-hidden
              className="page-block pointer-events-none absolute top-[6px] bottom-[6px] -right-[5px] w-[6px] rounded-r-[2px] opacity-70"
            />

            {/* Halaman pertama, terlihat begitu sampulnya berayun pergi. */}
            <InnerPage revealed={leaving} />

            {/* ── Daun sampul ── */}
            <div
              className="relative"
              style={{
                transformStyle: "preserve-3d",
                transformOrigin: "left center",
                transform: leaving ? "rotateY(-158deg)" : "rotateY(0deg)",
                transition: `transform ${OPEN.swingDur}ms cubic-bezier(0.62,0.02,0.22,1) ${OPEN.swingAt}ms`,
              }}
            >
              {/* Muka belakang sampul — lapisan dalam paspor. Tanpa ini, daun
                  sampul lenyap begitu melewati 90° dan yang terlihat cuma
                  halaman yang tiba-tiba muncul sendiri. */}
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

              {/* Badan sampul */}
              <div
                className="relative overflow-hidden rounded-[3px] bg-cover shadow-[0_44px_90px_-24px_rgba(0,0,0,0.95)]"
                style={{ backfaceVisibility: "hidden" }}
              >
                <div className="pointer-events-none absolute inset-0">
                  <IkatField
                    color="var(--color-gold)"
                    opacity={0.07}
                    scale={1.1}
                    className="h-full w-full"
                  />
                </div>

                {/* Kulit sampul: gelap di tepi, sedikit terangkat di tengah. */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(115% 80% at var(--glare, 50%) 8%, rgba(216,184,120,0.13) 0%, transparent 55%), linear-gradient(160deg, rgba(255,255,255,0.05) 0%, transparent 34%, rgba(0,0,0,0.42) 100%)",
                  }}
                />

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

                {/* Punggung buku di tepi kiri — engsel tempat sampul berputar */}
                <div
                  aria-hidden
                  className="book-spine pointer-events-none absolute inset-y-0 left-0 w-[14px]"
                >
                  <div className="absolute inset-y-[10px] left-[4px] w-px bg-gold/15" />
                  <div className="absolute inset-y-[10px] right-[4px] w-px bg-gold/10" />
                </div>

                {/* Bingkai ganda ala paspor, berhenti tepat di atas zona MRZ */}
                <div className="deboss relative m-3 ml-4 border border-gold/35 p-[5px]">
                  <div className="flex flex-col items-center border border-gold/15 px-6 py-[clamp(1.75rem,6vh,3rem)] text-center">
                    <p className="field-label text-gold/70">Undangan Pernikahan</p>

                    <TenunEmblem
                      className="mt-[clamp(1.25rem,4vh,2rem)] h-[clamp(72px,13vh,112px)] w-auto text-gold drop-shadow-[0_1px_0_rgba(0,0,0,0.6)]"
                      size={112}
                    />

                    <p className="field-label mt-[clamp(1.25rem,4vh,2rem)] text-gold/60">
                      Mempelai
                    </p>
                    <h1 className="display foil mt-3 text-[clamp(1.9rem,7vh,2.6rem)] leading-[1.15]">
                      {wedding.couple.groom.name}
                      {/* Ampersand tidak boleh memakai opacity: elemen semi-transparan
                          di dalam background-clip:text ikut menghapus gradien foil. */}
                      <span className="block font-[350] text-[0.6em] text-gold-3 italic">
                        &amp;
                      </span>
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
                <div className="relative border-t border-gold/20 bg-black/30 px-4 py-2.5 pl-5">
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
            </div>
          </div>

          {/* Slip tamu — kartu yang terselip di antara halaman paspor.
              Dimiringkan sedikit, lebih sempit dari sampul, dan bertepi robek
              di bagian atas supaya terbaca sebagai benda terpisah yang
              diselipkan, bukan kotak putih yang ditempel di bawah. */}
          <div
            className={`relative z-10 mx-7 -mt-3 ${ready && !leaving ? "animate-slip-in" : ""}`}
            style={{
              transform: "rotate(-1.2deg)",
              animationDelay: ready ? "620ms" : undefined,
              ...(leaving
                ? {
                    animation: `slip-out ${OPEN.slipDur}ms cubic-bezier(0.55,0,0.7,0.2) both`,
                  }
                : null),
            }}
          >
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
            disabled={leaving}
            className={`group animate-breathe mx-auto mt-[clamp(1.25rem,4vh,2rem)] flex items-center gap-3 rounded-full border border-gold/40 px-7 py-3 transition-[opacity,border-color,background-color] duration-300 hover:border-gold hover:bg-gold/10 ${
              leaving ? "pointer-events-none opacity-0" : ""
            }`}
          >
            <span className="field-label text-gold">Buka Undangan</span>
            <span className="text-gold transition-transform duration-300 group-hover:translate-x-1">
              &rarr;
            </span>
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * Halaman pertama di balik sampul.
 *
 * Bukan isi undangan yang sebenarnya — ia hanya perlu ada di sana saat daun
 * sampul berayun pergi, supaya yang terlihat adalah kertas, bukan lubang
 * hitam. Warnanya sengaja sama dengan halaman Bismillah yang mengambil alih
 * sesudahnya, sehingga serah terimanya tidak terlihat sebagai potongan.
 */
function InnerPage({ revealed }: { revealed: boolean }) {
  return (
    // Sengaja TANPA utilitas `grain`: ia menyetel position:relative dan
    // mengalahkan `absolute`, sehingga halaman ini ikut mengalir dan mendorong
    // sampulnya turun. `grain-layer` sendiri hanya butuh leluhur berposisi —
    // dan `absolute` sudah memberikannya.
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden rounded-[3px] bg-paper"
    >
      <div className="grain-layer" />
      <IkatBand className="w-full opacity-25" height={12} color="var(--color-ink)" />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        <TenunEmblem className="text-gold-3/25" size={104} />
        <p className="field-label mt-6 text-ink-soft/60">Republik Cinta</p>
        <div className="mt-3 h-px w-12 bg-ink/15" />
        <p className="mrz mt-3 text-[0.5rem] text-ink-soft/40">HAL. 01</p>
      </div>

      <div className="absolute inset-x-0 bottom-0">
        <IkatBand className="w-full opacity-25" height={12} color="var(--color-ink)" flip />
      </div>

      {/* Bayangan daun sampul yang jatuh ke halaman ini, lalu surut ke kiri
          seiring sampulnya terangkat. */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-[900ms] ease-out"
        style={{
          background:
            "linear-gradient(90deg, rgba(4,6,12,0.92) 0%, rgba(4,6,12,0.55) 38%, rgba(4,6,12,0.12) 72%, transparent 100%)",
          opacity: revealed ? 0 : 1,
          transitionDelay: revealed ? `${OPEN.swingAt + 120}ms` : "0ms",
        }}
      />
    </div>
  );
}
