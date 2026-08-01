"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/** Berapa lama fotonya bertahan terangkat sebelum turun sendiri. */
const HOLD_MS = 2600;

/**
 * Pas foto yang bisa diangkat di satu sudut, dan di baliknya ada tanda tangan
 * pemegangnya — persis foto yang ditempel di paspor sungguhan.
 *
 * Diangkat lewat sentuhan, turun sendiri setelah beberapa detik, atau langsung
 * turun kalau disentuh lagi. Tidak ada gagang, tidak ada sudut yang menjulur
 * memanggil: tamu yang cuma mau membaca nama orang tua mempelai tidak boleh
 * merasa ada yang belum ia buka.
 *
 * Porosnya di sudut KIRI-BAWAH dan sumbu putarnya dimiringkan (`rotate3d`
 * dengan sedikit komponen X), jadi yang naik duluan adalah sudut kanan-atas.
 * Engsel lurus di satu sisi memberi gerakan pintu; sumbu miring memberi
 * gerakan jari yang menyelipkan kuku di bawah satu ujung — dan cuma yang
 * terakhir yang terbaca sebagai foto yang DIANGKAT.
 *
 * Sudutnya 64°, bukan 40°. Di bawah ±55° punggung fotonya sendiri masih
 * menutupi tanda tangan di baliknya, dan yang terbaca cuma foto yang menciut
 * miring — gerakan tanpa hadiah.
 */
export function PhotoPeel({
  src,
  focus,
  alt,
  signature,
}: {
  src: string;
  focus: string;
  alt: string;
  /** Nama panggilan pemegangnya, ditulis tangan di balik foto. */
  signature: string;
}) {
  const [lifted, setLifted] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function toggle() {
    window.clearTimeout(timer.current);
    if (lifted) {
      setLifted(false);
      return;
    }
    setLifted(true);
    timer.current = window.setTimeout(() => setLifted(false), HOLD_MS);
  }

  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={toggle}
      // `overflow-hidden` yang menahan sudut terangkatnya tetap di dalam bingkai:
      // fotonya terbaca terangkat DI DALAM kolomnya, bukan melayang keluar dan
      // menutupi nama di sebelahnya.
      className="relative w-[clamp(92px,29vw,116px)] shrink-0 cursor-default self-stretch overflow-hidden border border-ink/25 bg-ink/5 p-0 [perspective:520px]"
    >
      {/* Balik foto. Selalu ada di DOM, cuma tertutup — jadi tidak ada jeda
          memuat apa pun saat fotonya diangkat. */}
      <span
        aria-hidden
        // Rata KANAN, dan bukan karena selera: yang tersingkap saat fotonya
        // terangkat cuma paruh kanan kotak ini. Tanda tangan yang ditaruh di
        // tengah akan separuh tertutup punggung fotonya sendiri.
        className="absolute inset-0 flex flex-col items-end justify-end gap-1 bg-paper-2 pr-2 pb-3 pl-1 text-right"
      >
        <span className="font-hand text-[1.45rem] leading-none text-ink">{signature}</span>
        <span className="w-[62%] border-t border-ink/20 pt-1 text-[0.38rem] tracking-[0.14em] text-ink-soft/70 uppercase">
          Tanda Tangan
        </span>
      </span>

      <span
        className={`absolute inset-0 origin-bottom-left transition-transform duration-[620ms] ease-[cubic-bezier(0.2,0.85,0.3,1)] ${
          lifted ? "[transform:rotate3d(0.34,1,0,-64deg)]" : ""
        }`}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="116px"
          style={{ objectPosition: focus }}
          className="object-cover"
        />
        {/* Bayangan yang datang dari sisi yang terangkat. Tanpa ini fotonya
            cuma menciut miring; dengan ini ia punya sisi yang menjauh dari
            kertas. */}
        <span
          aria-hidden
          className={`absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-black/45 transition-opacity duration-[620ms] ${
            lifted ? "opacity-100" : "opacity-0"
          }`}
        />
      </span>
    </button>
  );
}
