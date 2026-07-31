"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { wedding } from "@/config/wedding";
import { withSoftBreaks } from "@/lib/text";
import { IkatBand, IkatField } from "@/components/tenun/ikat";
import { TenunEmblem } from "@/components/tenun/emblem";
import { Overture } from "@/components/motion/overture";
import { Dust } from "@/components/motion/dust";
import { eventDateParts } from "@/lib/datetime";
import { coupleMrz } from "@/lib/wedding-mrz";
import { armSfx, sfxCover } from "@/lib/sfx";

const coverDate = eventDateParts(wedding.events[0].start);

/**
 * Babak membuka sampul, dalam milidetik sejak tombol ditekan.
 *
 * Urutannya sengaja berjenjang, bukan serempak. Slip ditarik keluar LEBIH
 * DULU, lalu sampulnya berayun, lalu dua lembar halaman ikut terbalik
 * menyusul — riffle itulah yang membuat benda ini terbaca sebagai buku, bukan
 * sebagai satu kartu yang berputar. Kalau semuanya berjalan bersamaan yang
 * terlihat cuma beberapa benda jatuh berbarengan.
 */
const OPEN = {
  slipDur: 420,
  swingAt: 240,
  swingDur: 1080,
  /** Lembar pertama & kedua menyusul, setelah daun sampul melewati puncaknya. */
  leafAt: [720, 880],
  leafDur: 640,
  /** Cahaya yang menyembur dari halaman yang baru terbuka. */
  bloomAt: 1180,
  fadeAt: 1460,
  handoff: 1820,
};

/** Batas atas pembesaran sampul di layar lapang. */
const MAX_FIT = 1.18;

/**
 * Kedalaman tiap lembar dalam tumpukan, dalam piksel Z.
 *
 * Di dalam konteks `preserve-3d`, urutan gambar ditentukan oleh POSISI DI RUANG,
 * bukan oleh `z-index` maupun urutan DOM. Menumpuk lembar-lembar ini pada z = 0
 * yang sama membuat peramban bebas memilih, dan yang dipilihnya adalah lembar
 * kertas putih menutupi seluruh sampul navy — sampulnya lenyap sebelum tamu
 * sempat melihatnya. Memberi tiap lembar kedalamannya sendiri menyelesaikan itu
 * sekaligus memberi bukunya tebal yang sungguhan.
 */
const DEPTH = { leaf: [-1.5, -3], inner: -4.5 };

/**
 * Lebar rancangan sampul, dalam piksel.
 *
 * Sampul ini SATU benda dengan proporsi tetap, bukan tata letak yang mengalir.
 * Semua ukuran di dalamnya ditulis dalam piksel pada lebar ini, lalu SELURUH
 * susunannya diperkecil sekaligus agar muat dalam satu layar (lihat `--fit`).
 * Versi sebelumnya memakai `clamp(…vh…)` pada tiap ukuran, dan hasilnya sampul
 * yang proporsinya berubah-ubah per perangkat — di layar 640 px tombol "Buka
 * Undangan" bahkan terpotong keluar layar dan undangannya tidak bisa dibuka
 * sama sekali.
 */
const DESIGN_W = 320;

/**
 * Sampul paspor — layar pertama yang dilihat tamu.
 *
 * Kartu bereaksi pada kemiringan perangkat (gyro) di ponsel dan pada posisi
 * kursor di desktop. Kemiringan itu menggeser sapuan foil emas pada nama
 * mempelai, bayangan di lantai, kilau di punggung buku, DAN warna lambang di
 * tengah sampul — satu sumber cahaya yang sama menggerakkan semuanya, karena
 * cahaya yang tidak sepakat justru membuat benda terlihat palsu.
 *
 * Menekan tombol tidak memudarkan sampul: sampulnya benar-benar TERBUKA pada
 * engsel di tepi kiri, halaman-halamannya ikut terbalik, dan cahaya dari
 * dalamnya yang menyerahkan layar ke isi undangan.
 */
export function Cover({
  guestName,
  serial,
  onOpen,
}: {
  guestName?: string;
  /**
   * Nomor paspor tamu ini. Dibiarkan kosong pada undangan umum — di sana yang
   * berlaku adalah nomor dokumen pernikahannya sendiri.
   */
  serial?: string;
  onOpen: () => void;
}) {
  // Dihitung per render, bukan sekali di tingkat modul: nomor dokumennya
  // berbeda per tamu, dan digit pemeriksa di baris kedua ikut berubah
  // bersamanya.
  const mrz = useMemo(() => coupleMrz(serial), [serial]);

  const cardRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const handleReady = useCallback(() => setReady(true), []);

  /**
   * Perkecil seluruh susunan sampul supaya muat dalam satu layar.
   *
   * Diukur dari `offsetWidth`/`offsetHeight` — dua-duanya ukuran TATA LETAK dan
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
      const s = Math.min(frame.clientWidth / w, frame.clientHeight / h, MAX_FIT);
      stage.style.setProperty("--fit", s.toFixed(4));
    };

    fit();

    // Dua-duanya perlu diawasi: bingkainya berubah saat layar diputar atau bilah
    // alamat ponsel menyusut, dan panggungnya berubah saat font display selesai
    // dimuat — nama mempelai adalah bagian tertinggi dari susunan ini.
    const ro = new ResizeObserver(fit);
    ro.observe(frame);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // rx/ry: derajat kemiringan. Dari keduanya diturunkan seluruh perilaku
    // cahaya di sampul, supaya tidak ada dua efek yang mengaku disinari dari
    // arah berbeda.
    let raf = 0;
    let target = { rx: 0, ry: 0 };
    const current = { rx: 0, ry: 0 };

    /**
     * Sampul bergerak sendiri sampai ada yang menggerakkannya.
     *
     * Ini bukan hiasan tambahan — ini yang menyelamatkan seluruh efeknya di
     * separuh perangkat tamu. Sejak iOS 13, Safari TIDAK mengirim
     * `deviceorientation` sebelum `DeviceOrientationEvent.requestPermission()`
     * dipanggil dari sebuah gerakan pengguna. Di iPhone, sampul yang dirancang
     * miring mengikuti tangan justru berdiri kaku sepenuhnya, dan foil emas
     * yang seharusnya menyapu nama mempelai tidak pernah bergerak sedikit pun.
     * Tidak ada pesan galat; ia hanya diam.
     *
     * Jadi bawaannya adalah bergerak: dua gelombang dengan periode yang tidak
     * sepadan (0.55 dan 0.41) sehingga lintasannya tidak pernah mengulang persis
     * — yang terbaca sebagai benda yang dipegang tangan, bukan benda yang
     * dianimasikan. Begitu ada masukan sungguhan, tangan itu mengambil alih dan
     * tidak dikembalikan.
     */
    let live = false;
    const born = performance.now();

    const apply = () => {
      if (!live) {
        const t = (performance.now() - born) / 1000;
        target = { rx: Math.sin(t * 0.55) * 3.2, ry: Math.cos(t * 0.41) * 5 };
      }
      current.rx += (target.rx - current.rx) * 0.08;
      current.ry += (target.ry - current.ry) * 0.08;
      card.style.setProperty("--rx", `${current.rx.toFixed(2)}deg`);
      card.style.setProperty("--ry", `${current.ry.toFixed(2)}deg`);
      card.style.setProperty("--foil-x", `${50 + current.ry * 4}%`);
      // Bayangan bergeser BERLAWANAN dengan miringnya kartu — itulah yang
      // memberi tahu mata bahwa cahaya diam dan bendanya yang bergerak.
      card.style.setProperty("--shadow-x", `${(-current.ry * 1.1).toFixed(2)}px`);
      card.style.setProperty("--glare", `${(50 - current.ry * 2.2).toFixed(1)}%`);
      // Tinta optically-variable: pada paspor sungguhan, lambang yang dicetak
      // dengan tinta OVD berubah warna saat dimiringkan. Rona emas digeser
      // sedikit ke hijau di satu sisi dan ke merah jambu di sisi lain —
      // takarannya kecil, karena begitu ia terbaca sebagai "pelangi" ia
      // berhenti terbaca sebagai logam.
      card.style.setProperty("--ovd-h", `${(current.ry * 2.6).toFixed(1)}deg`);
      card.style.setProperty(
        "--ovd-b",
        (1 + Math.max(0, 1 - Math.abs(current.ry) / 7) * 0.22).toFixed(3),
      );
      // Kinegram: tambalan laminasi difraksi. Ia tidak memudar masuk-keluar
      // mengikuti kemiringan secara lurus — ia menyala hanya pada SATU PITA
      // sudut yang sempit di sekitar 6°, lalu padam lagi di kedua sisinya.
      // Itulah yang membedakannya dari kilau biasa: hologram sungguhan punya
      // sudut pandang yang benar, dan tamu yang memiringkan ponselnya
      // menemukan sudut itu sendiri.
      const tilt = Math.abs(current.ry);
      card.style.setProperty("--kine", Math.max(0, 1 - Math.abs(tilt - 6) / 4.2).toFixed(3));
      card.style.setProperty("--kine-x", `${(50 - current.ry * 7).toFixed(1)}%`);
      raf = requestAnimationFrame(apply);
    };
    raf = requestAnimationFrame(apply);

    const onPointer = (e: PointerEvent) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      live = true;
      target = { rx: -py * 10, ry: px * 12 };
    };

    // Gyro: beta = depan/belakang, gamma = kiri/kanan.
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      const beta = Math.max(-40, Math.min(40, e.beta - 40));
      const gamma = Math.max(-40, Math.min(40, e.gamma));
      live = true;
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
    // Mesin suara lahir DI SINI, di dalam penangan tekanan tombol. Ini
    // satu-satunya tempat yang sah: AudioContext yang dibuat di luar gerakan
    // pengguna lahir dalam keadaan `suspended`, dan derit sampul — bunyi
    // pertama yang didengar tamu — hilang tanpa pesan galat apa pun.
    armSfx();
    sfxCover();
    // Getaran sependek dua ketukan: kunci yang terbuka, lalu sampul yang
    // berayun. Hanya Android; iOS mengabaikannya tanpa mengeluh.
    navigator.vibrate?.([11, 46, 18]);

    setLeaving(true);
    window.setTimeout(onOpen, OPEN.handoff);
  };

  return (
    <>
      {!ready && <Overture line={mrz[0]} onDone={handleReady} />}

      <div
        className={`fixed inset-x-0 top-0 z-50 overflow-hidden bg-ink transition-opacity duration-[420ms] ease-out ${
          leaving ? "pointer-events-none opacity-0" : ""
        }`}
        style={{
          // `100svh` — TINGGI TERKECIL viewport, yaitu saat bilah alamat ponsel
          // masih tampak. `inset-0` memakai tinggi terbesar, dan selisih ~60 px
          // itulah yang dulu memotong tombol "Buka Undangan" di bawah layar.
          height: "100svh",
          // Tidak ada yang bisa digulir di sini, dan sentuhan yang melewati
          // sampul tidak boleh menyeret dokumen di belakangnya.
          touchAction: "none",
          overscrollBehavior: "none",
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

        {/* Takik layar dan bilah gestur dipotong DI SINI, lewat padding. */}
        <div
          className="absolute inset-0"
          style={{
            paddingTop: "max(env(safe-area-inset-top), 14px)",
            paddingBottom: "max(env(safe-area-inset-bottom), 14px)",
            paddingLeft: "max(env(safe-area-inset-left), 18px)",
            paddingRight: "max(env(safe-area-inset-right), 18px)",
          }}
        >
          {/* Bingkai ini sengaja TANPA padding sendiri: `clientHeight` ikut
              menghitung padding elemennya, jadi mengukur ruang tersedia pada
              elemen yang berpadding akan mengembalikan tinggi penuh layar —
              sampul lalu diskalakan sampai menyentuh kedua tepi dan seluruh
              perhitungan safe-area di atas jadi sia-sia. */}
          <div className="flex h-full w-full items-center justify-center">
            <div
              ref={stageRef}
              // `shrink-0` menjaga janji seluruh pendekatan ini. Tanpanya, di
              // layar sempit flex MENGECILKAN panggungnya alih-alih membiarkan
              // `--fit` yang mengecilkan — dan begitu lebarnya berubah, tata
              // letak di dalamnya mengalir ulang: nama mempelai pindah baris,
              // tingginya berubah, dan proporsi paspornya ikut berubah per
              // perangkat. Yang diinginkan justru sebaliknya: satu benda dengan
              // proporsi tetap, dilihat dari jarak yang berbeda-beda.
              className="shrink-0"
              style={{
                width: DESIGN_W,
                transform: "scale(var(--fit, 1))",
                transformOrigin: "center center",
                perspective: "1250px",
                perspectiveOrigin: "34% 46%",
              }}
            >
              <div
                ref={cardRef}
                className={`relative ${ready ? "animate-cover-settle" : "opacity-0"}`}
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
                    punggung. Ditaruh di pembungkus, BUKAN di daun sampul —
                    kertas tidak ikut berayun saat sampulnya dibuka. */}
                  <div
                    aria-hidden
                    className="page-block pointer-events-none absolute top-[6px] bottom-[6px] -right-[5px] w-[6px] rounded-r-[2px] opacity-70"
                  />

                  {/* Halaman terdalam, terlihat setelah semua lembar terbalik.
                      Didorong paling jauh ke belakang — lihat catatan tebal
                      halaman di <Leaf>. */}
                  <InnerPage revealed={leaving} depth={DEPTH.inner} />

                  {/* ── Lembar halaman yang ikut terbalik menyusul sampul ── */}
                  {OPEN.leafAt.map((at, i) => (
                    <Leaf key={i} index={i} turning={leaving} at={at} />
                  ))}

                  {/* Cahaya dari dalam buku. Lahir di engsel, bukan di tengah:
                      di sanalah halaman terbuka paling lebar. Duduk di depan
                      seluruh tumpukan supaya kilatannya menyapu semuanya
                      sekaligus; sampai gilirannya tiba ia tak terlihat, karena
                      `both` menahan animasinya di keadaan awal (opacity 0). */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 overflow-hidden rounded-[3px]"
                    style={{ transform: "translateZ(2px)" }}
                  >
                    {leaving && (
                      <div
                        className="animate-bloom absolute top-1/2 left-0 h-[130%] w-[130%] -translate-y-1/2 rounded-full"
                        style={{
                          background:
                            "radial-gradient(circle, rgba(255,247,228,0.92) 0%, rgba(232,203,140,0.45) 34%, transparent 70%)",
                          animationDelay: `${OPEN.bloomAt}ms`,
                        }}
                      />
                    )}
                  </div>

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
                    {/* Muka belakang sampul — lapisan dalam paspor. Tanpa ini,
                      daun sampul lenyap begitu melewati 90° dan yang terlihat
                      cuma halaman yang tiba-tiba muncul sendiri. */}
                    <div
                      aria-hidden
                      className="absolute inset-0 overflow-hidden rounded-[3px] bg-cover-2"
                      style={{
                        transform: "rotateY(180deg)",
                        backfaceVisibility: "hidden",
                      }}
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
                      className="leather relative overflow-hidden rounded-[3px] bg-cover shadow-[0_44px_90px_-24px_rgba(0,0,0,0.95)]"
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

                      {/* Pori kulit. Tipis, tapi tanpanya kilau yang melintas
                        tidak punya apa pun untuk dipantulkan dan permukaannya
                        terbaca sebagai bidang warna. */}
                      <div aria-hidden className="grain-dark" />

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

                      {/* Tambalan kinegram, membentang miring melintasi muka
                          sampul. Ditaruh SEBELUM bingkai dan isinya di urutan
                          DOM tapi tetap terlihat di atasnya karena
                          `color-dodge` hanya menaikkan piksel yang sudah
                          terang — yang dinaikkannya justru garis emas dan
                          cetakan foil, bukan kulit navy di sekitarnya. */}
                      <div
                        aria-hidden
                        className="kinegram pointer-events-none absolute inset-x-2 top-[26%] h-[96px]"
                        style={{ transform: "rotate(-6deg)" }}
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
                      <div className="deboss relative m-3 ml-4 overflow-hidden border border-gold/35 p-[5px]">
                        {/* Kilau setipis rambut menyusuri bingkai sekali tiap
                          beberapa detik. Ia yang membuat sampul terasa HIDUP
                          saat tamu sedang membaca, bukan hanya saat digerakkan. */}
                        <div
                          aria-hidden
                          className="animate-hairline pointer-events-none absolute inset-x-0 top-0 h-1/3"
                          style={{
                            background:
                              "linear-gradient(180deg, transparent, rgba(246,230,192,0.09), transparent)",
                          }}
                        />

                        <div className="relative flex flex-col items-center border border-gold/15 px-6 py-11 text-center">
                          <p className="field-label text-gold/70">Undangan Pernikahan</p>

                          {/* Lambang bertinta OVD: rona & terangnya digeser oleh
                            kemiringan yang sama yang menggerakkan foil. */}
                          <TenunEmblem
                            className="mt-7 h-24 w-auto text-gold drop-shadow-[0_1px_0_rgba(0,0,0,0.6)]"
                            size={96}
                            style={{
                              filter:
                                "hue-rotate(var(--ovd-h, 0deg)) brightness(var(--ovd-b, 1))",
                            }}
                          />

                          <p className="field-label mt-7 text-gold/60">Mempelai</p>
                          <h1 className="display foil mt-3 text-[2.3rem] leading-[1.15]">
                            {wedding.couple.groom.name}
                            {/* Ampersand tidak boleh memakai opacity: elemen
                              semi-transparan di dalam background-clip:text ikut
                              menghapus gradien foil. */}
                            <span className="block font-[350] text-[0.6em] text-gold-3 italic">
                              &amp;
                            </span>
                            {wedding.couple.bride.name}
                          </h1>

                          <div className="mt-7 h-px w-16 bg-gold/40" />

                          {/* Tanggal lewat eventDateParts, bukan timeZone yang
                            ditulis langsung — offset di konfigurasi yang
                            menentukan, bukan zona perangkat tamu. Untuk acara
                            WITA pagi keduanya kebetulan sama, tapi menggeser jam
                            acara saja sudah cukup memundurkan tanggal. */}
                          <p className="mrz mt-4 text-gold/55">
                            {[coverDate.day, coverDate.month, coverDate.year].join(" · ")}
                          </p>
                        </div>
                      </div>

                      {/* Zona MRZ dua baris, dicetak di kaki sampul persis seperti paspor */}
                      <div className="mrz-zone relative border-t border-gold/20 bg-black/30 px-4 py-2.5 pl-5">
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
                    </div>
                  </div>
                </div>

                {/* Slip tamu — kartu yang terselip di antara halaman paspor.
                  Dimiringkan sedikit, lebih sempit dari sampul, dan bertepi
                  robek di bagian atas supaya terbaca sebagai benda terpisah yang
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
                        {/* Nama panjang dibiarkan turun ke baris kedua, bukan
                          dipotong — nama tamu adalah hal terakhir yang boleh
                          dipangkas. `overflow-wrap:anywhere` tetap dipertahankan
                          sebagai jaring pengaman, tapi titik putus setelah garis
                          miring diberikan lebih dulu lewat `withSoftBreaks` —
                          tanpa itu sapaan bawaan "Bapak/Ibu/Saudara/i" patah di
                          tengah kata jadi "Saudar / a/i". */}
                        <p className="display mt-1 text-[1.3rem] leading-tight text-balance break-words [overflow-wrap:anywhere] text-ink">
                          {withSoftBreaks(guestName || wedding.site.defaultGuest)}
                        </p>
                        <p className="mrz-text mt-1.5 text-[0.45rem] text-ink-soft/55">
                          ADMIT<span className="mx-1">·</span>
                          {wedding.couple.groom.name.toUpperCase()}
                          <span className="mx-1">&amp;</span>
                          {wedding.couple.bride.name.toUpperCase()}
                        </p>

                        {/* Nomor paspor tamu. Hanya muncul di undangan personal
                            — pada undangan umum tidak ada seorang pun yang
                            paspornya sedang dipegang, dan nomor yang sama untuk
                            semua orang justru membatalkan seluruh maksudnya. */}
                        {serial && (
                          <p className="mrz-text mt-1 text-[0.45rem] text-gold-3/75">
                            No. Paspor<span className="mx-1">·</span>
                            {serial}
                          </p>
                        )}
                      </div>

                      <TenunEmblem className="shrink-0 text-gold-3/45" size={34} />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpen}
                  disabled={leaving}
                  // `min-h-12` bukan hiasan: itu ambang sasaran sentuh yang bisa
                  // ditekan tanpa meleset di ponsel. `active:` memberi umpan balik
                  // yang hilang bersama tap-highlight bawaan.
                  className={`group animate-breathe mx-auto mt-7 flex min-h-12 items-center gap-3 rounded-full border border-gold/40 px-7 py-3 transition-[opacity,border-color,background-color,transform] duration-300 hover:border-gold hover:bg-gold/10 active:scale-[0.97] active:bg-gold/15 ${
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
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Satu lembar halaman yang ikut terbalik setelah daun sampul.
 *
 * Riffle inilah yang membedakan "sampul berputar" dari "buku dibuka". Tiap
 * lembar butuh muka depan DAN muka belakang: begitu melewati 90° yang
 * menghadap tamu adalah punggung kertasnya, dan tanpa muka kedua lembarnya
 * lenyap di tengah putaran — jebakan yang sama pernah menggigit daun sampul.
 */
function Leaf({ index, turning, at }: { index: number; turning: boolean; at: number }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        transformStyle: "preserve-3d",
        transformOrigin: "left center",
        // translateZ ditulis LEBIH DULU: ia harus diukur di ruang tumpukan,
        // bukan di ruang lembar yang sudah berputar — kalau dibalik, lembar
        // yang terbuka 172° malah bergeser ke arah tamu.
        transform: `translateZ(${DEPTH.leaf[index]}px) rotateY(${turning ? -172 : 0}deg)`,
        transition: `transform ${OPEN.leafDur}ms cubic-bezier(0.55,0.06,0.28,1) ${at}ms`,
      }}
    >
      {/* Muka belakang: sisi kertas yang menghadap tamu setelah lembar lewat
          setengah putaran. Lebih gelap, karena ia menghadap ke dalam buku. */}
      <div
        className="absolute inset-0 overflow-hidden rounded-[3px] bg-paper-3"
        style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
      >
        <div className="absolute inset-0 bg-ink/25" />
      </div>

      {/* Muka depan */}
      <div
        className="absolute inset-0 overflow-hidden rounded-[3px] bg-paper"
        style={{ backfaceVisibility: "hidden" }}
      >
        <div className="grain-layer" />
        <IkatBand className="w-full opacity-20" height={10} color="var(--color-ink)" />
        <div className="absolute inset-0 flex items-center justify-center">
          <TenunEmblem className="text-gold-3/15" size={88} />
        </div>
        {/* Lipatan di dekat engsel: kertas selalu lebih gelap di punggungnya. */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-10"
          style={{
            background:
              "linear-gradient(90deg, rgba(20,16,12,0.30) 0%, transparent 100%)",
          }}
        />
      </div>
    </div>
  );
}

/**
 * Halaman terdalam di balik sampul.
 *
 * Bukan isi undangan yang sebenarnya — ia hanya perlu ada di sana saat lembar
 * terakhir berayun pergi, supaya yang terlihat adalah kertas, bukan lubang
 * hitam. Warnanya sengaja sama dengan halaman Bismillah yang mengambil alih
 * sesudahnya, sehingga serah terimanya tidak terlihat sebagai potongan.
 */
function InnerPage({ revealed, depth }: { revealed: boolean; depth: number }) {
  return (
    // Sengaja TANPA utilitas `grain`: ia menyetel position:relative dan
    // mengalahkan `absolute`, sehingga halaman ini ikut mengalir dan mendorong
    // sampulnya turun. `grain-layer` sendiri hanya butuh leluhur berposisi —
    // dan `absolute` sudah memberikannya.
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden rounded-[3px] bg-paper"
      style={{ transform: `translateZ(${depth}px)` }}
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
        <IkatBand
          className="w-full opacity-25"
          height={12}
          color="var(--color-ink)"
          flip
        />
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
