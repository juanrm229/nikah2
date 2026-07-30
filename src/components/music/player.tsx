"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";
import type { ActiveTrack } from "@/lib/music";

/**
 * Pemutar musik latar.
 *
 * Komponen ini baru dipasang SETELAH tamu menekan "Buka Undangan". Itu bukan
 * soal rapi-rapian: peramban modern menolak `play()` yang tidak lahir dari
 * gerakan pengguna, dan tekanan tombol sampul adalah gerakan itu. Kalau audio
 * dipasang sejak awal lalu diputar diam-diam, Chrome & Safari menolaknya dan
 * tamu mendapat undangan bisu tanpa tahu kenapa.
 *
 * Kalau penolakan tetap terjadi (mis. pengaturan situs yang membisukan),
 * tombolnya tetap ada dan sekali tekan langsung menyalakan — jadi kegagalan
 * autoplay tidak pernah berujung "tidak ada musik sama sekali".
 *
 * Keadaan main/jeda TIDAK disimpan di state sendiri, tapi diturunkan dari event
 * `play`/`pause` elemen audio. Bedanya terasa saat pengguna menekan tombol
 * media di headset atau lockscreen: state React ikut benar tanpa kode tambahan.
 */

/** Volume akhir. Musik latar, bukan pertunjukan — ia harus bisa ditimpa suara. */
const VOLUME = 0.55;

/** Lama naik/turun volume. Berhenti mendadak terdengar seperti kabel dicabut. */
const FADE_MS = 1400;
const FADE_STEP_MS = 50;

/** Lama nama lagu terpampang sebelum menyusut jadi lingkaran. */
const LABEL_MS = 5000;

export function MusicPlayer({ track }: { track: ActiveTrack }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const labelRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const reduced = usePrefersReducedMotion();

  /** Geser volume pelan-pelan, lalu kerjakan `done` setelah sampai. */
  function fadeTo(target: number, done?: () => void) {
    const el = audioRef.current;
    if (!el) return;

    if (fadeRef.current) clearInterval(fadeRef.current);

    const from = el.volume;
    const steps = Math.max(1, Math.round(FADE_MS / FADE_STEP_MS));
    let i = 0;

    fadeRef.current = setInterval(() => {
      i++;
      const el2 = audioRef.current;
      if (!el2) return;

      el2.volume = Math.min(1, Math.max(0, from + ((target - from) * i) / steps));
      if (i >= steps) {
        if (fadeRef.current) clearInterval(fadeRef.current);
        fadeRef.current = null;
        done?.();
      }
    }, FADE_STEP_MS);
  }

  function start() {
    const el = audioRef.current;
    if (!el) return;

    el.volume = 0;
    el.play()
      .then(() => {
        fadeTo(VOLUME);
        setLabelOpen(true);
        if (labelRef.current) clearTimeout(labelRef.current);
        labelRef.current = setTimeout(() => setLabelOpen(false), LABEL_MS);
      })
      .catch(() => {
        // Autoplay ditolak. Tidak ada yang perlu dikabarkan — tombolnya sudah
        // terlihat, dan menekannya adalah gerakan pengguna yang pasti diterima.
      });
  }

  function toggle() {
    const el = audioRef.current;
    if (!el) return;

    if (el.paused) return start();
    fadeTo(0, () => el.pause());
  }

  // Coba nyalakan begitu terpasang. Aman dari aturan set-state-in-effect:
  // yang memanggil setState adalah callback promise & timer, bukan badan effect.
  useEffect(() => {
    start();
    return () => {
      if (fadeRef.current) clearInterval(fadeRef.current);
      if (labelRef.current) clearTimeout(labelRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sekali saat dipasang
  }, []);

  /**
   * Kendali di lockscreen / notifikasi HP. Tanpa ini, tamu yang mengunci layar
   * hanya melihat "situs web sedang memutar suara" tanpa cara menghentikannya
   * selain menutup tab.
   */
  useEffect(() => {
    const ms = typeof navigator !== "undefined" ? navigator.mediaSession : undefined;
    if (!ms) return;

    ms.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist ?? "Undangan Pernikahan",
    });
    ms.setActionHandler("play", () => start());
    ms.setActionHandler("pause", () => audioRef.current?.pause());

    return () => {
      ms.setActionHandler("play", null);
      ms.setActionHandler("pause", null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start stabil sepanjang umur komponen
  }, [track.title, track.artist]);

  const name = track.artist ? `${track.title} — ${track.artist}` : track.title;

  return (
    <>
      <audio
        ref={audioRef}
        src={track.url}
        loop
        preload="auto"
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      <div className="animate-rise-in fixed right-4 bottom-4 z-40 pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          onClick={toggle}
          onMouseEnter={() => setLabelOpen(true)}
          onMouseLeave={() => setLabelOpen(false)}
          onFocus={() => setLabelOpen(true)}
          onBlur={() => setLabelOpen(false)}
          aria-pressed={playing}
          aria-label={playing ? `Hentikan musik: ${name}` : `Putar musik: ${name}`}
          className="group flex items-center gap-0 rounded-full border border-gold/35 bg-ink-2/85 py-1.5 pr-1.5 pl-1.5 text-paper shadow-[0_6px_24px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-colors hover:border-gold/70"
        >
          {/* Nama lagu — melebar dari nol, jadi tidak pernah menyisakan celah
              saat tertutup. `max-w` yang dianimasikan, bukan width, karena
              lebar isinya tidak diketahui di muka. */}
          <span
            className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-500 ease-out ${
              labelOpen ? "max-w-[min(58vw,15rem)] opacity-100" : "max-w-0 opacity-0"
            }`}
          >
            <span className="field-label block truncate pr-3 pl-3 text-paper-dim">{name}</span>
          </span>

          <span className="relative grid h-9 w-9 shrink-0 place-items-center">
            {/* Cincin putus-putus yang berputar pelan — jarum piringan hitam,
                bukan ikon yang bisa ditemukan di undangan lain. */}
            <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="var(--color-gold)"
                strokeWidth="1"
                strokeDasharray="3 5"
                opacity={playing ? 0.85 : 0.35}
                className={playing && !reduced ? "animate-[spin_9s_linear_infinite]" : ""}
                style={{ transformOrigin: "center" }}
              />
            </svg>

            {/* Tiga batang penyetara. Saat jeda mereka rata — bentuknya sendiri
                sudah mengatakan "berhenti", jadi tidak perlu ikon jeda. */}
            <span className="flex items-end gap-[3px]" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`w-[2px] origin-bottom rounded-full bg-gold-2 transition-[height] duration-300 ${
                    playing ? "animate-eq" : ""
                  }`}
                  style={{
                    height: playing ? "0.85rem" : "0.2rem",
                    animationDelay: `${i * 0.18}s`,
                  }}
                />
              ))}
            </span>
          </span>
        </button>
      </div>
    </>
  );
}
