"use client";

import { useEffect, useRef, useState } from "react";
import { wedding } from "@/config/wedding";
import { TenunEmblem } from "@/components/tenun/emblem";
import { paintVisaCard, type VisaCardStamp } from "@/lib/visa-card";
import { sfxStamp } from "@/lib/sfx";

/**
 * Simpan halaman visa jadi gambar.
 *
 * Sama seperti `<ShareCard>`, KARTUNYA DIGAMBAR LEBIH DULU: Safari mensyaratkan
 * `navigator.share()` dipanggil dari gerakan pengguna, dan gerakan itu
 * kedaluwarsa begitu penangannya menunggu sesuatu yang lama.
 *
 * Bedanya di sini kartunya BERUBAH. Tamu yang menitipkan lagu setelah kartunya
 * jadi harus mendapat kartu baru — jadi ia digambar ulang tiap kali daftar
 * capnya berubah, dan tombolnya kembali ke "menyiapkan" selama itu. Kartu lama
 * yang masih memuat tiga cap saat halamannya sudah menunjukkan empat adalah
 * satu-satunya cara fitur ini bisa membuat tamu terlihat bohong.
 */
export function VisaShare({
  name,
  serial,
  stamps,
}: {
  name: string;
  serial: string;
  stamps: readonly VisaCardStamp[];
}) {
  const fileRef = useRef<File | null>(null);
  const urlRef = useRef<string | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  /**
   * Sidik daftar cap. Array-nya dibentuk ulang tiap render, jadi ia tidak
   * pernah cocok sebagai dependensi effect — yang menentukan perlu-tidaknya
   * menggambar ulang adalah ISI-nya.
   */
  const signature = stamps.map((s) => `${s.center}:${s.earned ? 1 : 0}`).join("|");

  /**
   * Sidik kartu yang SUDAH jadi, bukan bendera "sedang menggambar".
   *
   * Bendera harus dinyalakan ulang dari dalam effect tiap kali capnya berubah,
   * dan itu satu render tambahan yang tidak menghasilkan apa pun. Dengan sidik
   * yang disimpan, "sedang menggambar" cukup berarti "sidik yang tersimpan
   * belum sama dengan sidik sekarang" — tidak ada yang perlu dinyalakan.
   */
  const [painted, setPainted] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const state = painted === signature ? "ready" : failed === signature ? "failed" : "painting";

  useEffect(() => {
    let alive = true;

    const paint = async () => {
      const host = hostRef.current;
      if (!host) return;
      const probe = getComputedStyle(host);

      const emblem = host.querySelector("svg");
      const emblemSvg = emblem ? new XMLSerializer().serializeToString(emblem) : null;

      const blob = await paintVisaCard({
        name,
        serial,
        stamps,
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
        setFailed(signature);
        return;
      }

      // URL lama dilepas SEBELUM yang baru dipasang. Halaman visa bisa
      // menggambar ulang empat kali dalam satu kunjungan, dan objek yang tidak
      // dilepas menahan satu bitmap 1080×1350 di memori masing-masing.
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      fileRef.current = new File([blob], fileName(name), { type: "image/png" });
      urlRef.current = URL.createObjectURL(blob);
      setPainted(signature);
    };

    const id = window.setTimeout(paint, 900);

    return () => {
      alive = false;
      window.clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, serial, signature]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const share = () => {
    const file = fileRef.current;
    const url = urlRef.current;
    if (!file || !url) return;

    sfxStamp();

    const earned = stamps.filter((s) => s.earned).length;
    const text = `Halaman visa ${name} — ${earned} dari ${stamps.length} cap, pernikahan ${wedding.title}.`;

    // `canShare` dengan berkasnya: Chrome desktop punya `navigator.share` tapi
    // menolak berkas, dan memanggilnya di sana berakhir sebagai galat alih-alih
    // unduhan.
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
        className="rounded-full border border-paper/30 px-5 py-2 transition-colors hover:bg-paper hover:text-ink disabled:opacity-45"
      >
        <span className="field-label text-inherit">
          {state === "painting"
            ? "Menyiapkan halaman…"
            : state === "failed"
              ? "Halaman tidak tersedia"
              : "Simpan Halaman Visa"}
        </span>
      </button>

      {/* Bahan lambang untuk kartunya. Warnanya dipasang sebagai nilai, bukan
          `currentColor` — begitu markup-nya dilepas dari halaman, tidak ada
          lagi warna yang bisa diwarisi. */}
      <span hidden aria-hidden>
        <TenunEmblem size={76} color="#8a6c39" />
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
  return `halaman-visa-${slug || "tamu"}.png`;
}
