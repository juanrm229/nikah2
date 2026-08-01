"use client";

import { useEffect, useRef, useState } from "react";
import { TenunEmblem } from "./emblem";

/** Sama dengan durasi `animate-emblem-turn` di globals.css. */
const TURN_MS = 1400;

/**
 * Lambang yang membalas kalau disentuh: berputar sekali penuh, dan di tengah
 * putaran kedelapan tumpalnya mekar keluar.
 *
 * Tidak ada isyarat apa pun bahwa ia bisa disentuh — tidak ada denyut yang
 * memanggil, tidak ada bayangan yang naik saat kursor lewat. Itu disengaja:
 * kejutan yang menyapa duluan berhenti jadi kejutan, dan tamu yang cuma mau
 * membaca ayat tidak boleh merasa ada tombol yang belum ia tekan.
 *
 * Lambangnya sendiri hiasan, bukan isi halaman — jadi tetap `aria-hidden` dan
 * di luar urutan Tab. Tidak ada apa pun yang hilang bagi tamu yang tidak
 * pernah menyentuhnya.
 */
export function TenunEmblemTap({ className, size }: { className?: string; size?: number }) {
  /** Naik tiap sentuhan; dipakai jadi `key` supaya animasinya benar-benar
   *  mengulang dari awal, bukan meneruskan yang sedang jalan. */
  const [turn, setTurn] = useState(0);
  const busy = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function onTap() {
    // Sentuhan beruntun diabaikan sampai putarannya selesai. Tanpa ini,
    // lambangnya tersendat balik ke 0° tiap kali disentuh — yang terbaca
    // sebagai kerusakan, bukan sebagai mainan.
    if (busy.current) return;
    busy.current = true;
    setTurn((n) => n + 1);
    timer.current = window.setTimeout(() => {
      busy.current = false;
    }, TURN_MS);
  }

  return (
    <button
      type="button"
      aria-hidden
      tabIndex={-1}
      onClick={onTap}
      className="cursor-default bg-transparent p-0 leading-none"
    >
      <span key={turn} className={turn > 0 ? "animate-emblem-turn block" : "block"}>
        <TenunEmblem className={className} size={size} />
      </span>
    </button>
  );
}
