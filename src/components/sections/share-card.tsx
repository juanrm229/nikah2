"use client";

import { useEffect, useRef, useState } from "react";
import { wedding } from "@/config/wedding";
import { TenunEmblem } from "@/components/tenun/emblem";
import { paintBoardingCard, type BoardingCardData } from "@/lib/boarding-card";
import { sfxStamp } from "@/lib/sfx";

type Ready = "painting" | "ready" | "failed";

/**
 * Tombol bagikan boarding pass sebagai gambar.
 *
 * KARTUNYA DIGAMBAR LEBIH DULU, sebelum tamu menekan apa pun. Itu bukan
 * pengoptimalan — itu satu-satunya cara fiturnya bekerja di iOS. Safari
 * mensyaratkan `navigator.share()` dipanggil dari gerakan pengguna, dan
 * "gerakan pengguna" itu kedaluwarsa begitu penangannya `await` sesuatu yang
 * lama. Menggambar 1080×1350 piksel plus menunggu font siap jauh melewati batas
 * itu, dan yang didapat tamu adalah `NotAllowedError` tanpa penjelasan. Dengan
 * kartunya sudah jadi dan tersimpan di ref, penangan tombolnya tidak menunggu
 * apa pun dan lembar bagikan terbuka seketika.
 */
export function ShareCard({
  name,
  serial,
  flight,
  tableNo,
  seats,
  dateLong,
  timeText,
  venue,
  mrz,
}: Omit<BoardingCardData, "couple" | "siteUrl" | "emblemSvg" | "fonts">) {
  const fileRef = useRef<File | null>(null);
  const urlRef = useRef<string | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<Ready>("painting");

  useEffect(() => {
    let alive = true;

    const paint = async () => {
      // Font & warna diambil dari elemen yang benar-benar dirender, bukan
      // ditulis ulang sebagai string: nama keluarga font yang dihasilkan
      // next/font di-hash saat build dan tidak bisa ditebak dari sini.
      const host = hostRef.current;
      if (!host) return;
      const probe = getComputedStyle(host);

      // Lambangnya dirender sendiri di bawah, tersembunyi, lalu markup-nya
      // diambil apa adanya. Digambar ulang dengan jalur canvas akan berarti dua
      // salinan motif yang sama — dan yang satu pasti menyimpang dari yang lain
      // pada suntingan pertama.
      const emblem = host.querySelector("svg");
      const emblemSvg = emblem
        ? new XMLSerializer().serializeToString(emblem)
        : null;

      const blob = await paintBoardingCard({
        name,
        serial,
        flight,
        tableNo,
        seats,
        dateLong,
        timeText,
        venue,
        mrz,
        couple: wedding.title,
        siteUrl: wedding.site.url,
        emblemSvg,
        fonts: {
          display: probe.getPropertyValue("--card-display") || "serif",
          mono: probe.getPropertyValue("--card-mono") || "monospace",
          body: probe.getPropertyValue("--card-body") || "sans-serif",
        },
      });

      if (!alive) return;
      if (!blob) {
        setState("failed");
        return;
      }

      fileRef.current = new File([blob], fileName(name), { type: "image/png" });
      urlRef.current = URL.createObjectURL(blob);
      setState("ready");
    };

    // Ditunda sampai jalur utama halaman selesai. Kartunya tidak dibutuhkan
    // sampai tamu menggulir ke sini, dan menggambar 1,4 juta piksel di tengah
    // hidrasi akan terasa sebagai undangan yang tersendat saat dibuka.
    const id = window.setTimeout(paint, 1200);

    return () => {
      alive = false;
      window.clearTimeout(id);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [name, serial, flight, tableNo, seats, dateLong, timeText, venue, mrz]);

  const share = () => {
    const file = fileRef.current;
    const url = urlRef.current;
    if (!file || !url) return;

    sfxStamp();

    const text = `Boarding pass ${name} — pernikahan ${wedding.title}, ${dateLong}.`;

    // `canShare` dengan berkasnya, bukan sekadar `"share" in navigator`:
    // Chrome desktop punya `navigator.share` tapi menolak berkas, dan
    // memanggilnya di sana berakhir sebagai galat alih-alih unduhan.
    if (navigator.canShare?.({ files: [file] })) {
      navigator.share({ files: [file], text }).catch(() => {
        // Tamu menutup lembar bagikan. Itu jawaban yang sah, bukan kegagalan.
      });
      return;
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
  };

  return (
    <div
      ref={hostRef}
      className="mt-6 text-center"
      style={
        {
          // Jembatan ke canvas: nama keluarga font yang sudah diselesaikan
          // next/font, dibaca kembali lewat getComputedStyle di atas.
          "--card-display": "var(--font-display)",
          "--card-mono": "var(--font-mono)",
          "--card-body": "var(--font-body)",
        } as React.CSSProperties
      }
    >
      <button
        type="button"
        onClick={share}
        disabled={state !== "ready"}
        className="rounded-full border border-ink/30 px-5 py-2 transition-colors hover:bg-ink hover:text-paper disabled:opacity-45"
      >
        <span className="field-label text-inherit">
          {state === "painting"
            ? "Menyiapkan kartu…"
            : state === "failed"
              ? "Kartu tidak tersedia"
              : "Bagikan Boarding Pass"}
        </span>
      </button>

      <p className="mt-3 text-[0.68rem] leading-relaxed font-light text-ink-soft/70">
        Kartu yang dibagikan tidak memuat QR check-in — kode itu hanya untuk
        ditunjukkan di pintu masuk.
      </p>

      {/* Bahan lambang untuk kartunya. `hidden` cukup: penyerialan membaca
          markup, bukan piksel, jadi elemen yang tidak dirender tetap bisa
          disalin. Warnanya dipasang sebagai nilai, bukan `currentColor` —
          begitu markup-nya dilepas dari halaman, tidak ada lagi warna yang
          bisa diwarisi. */}
      <span hidden aria-hidden>
        <TenunEmblem size={148} color="#d8b878" />
      </span>
    </div>
  );
}

/** Nama berkas yang aman untuk sistem berkas mana pun. */
function fileName(name: string) {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `boarding-pass-${slug || "tamu"}.png`;
}
