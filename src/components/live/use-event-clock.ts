"use client";

import { useEffect, useState } from "react";
import { MAIN_DATE, wedding } from "@/config/wedding";
import { eventPhase, minutesAtEventZone, type EventPhase } from "@/lib/datetime";

/** Acara terakhir yang menutup rangkaian hari itu. */
const LAST_END = wedding.events[wedding.events.length - 1].end;

/**
 * Dua puluh detik.
 *
 * Bukan satu detik seperti hitung mundur: yang diawasi di sini berubah paling
 * cepat sekali per menit — agenda yang sedang berjalan — dan membangunkan
 * seluruh papan jadwal enam puluh kali lebih sering dari yang dibutuhkan
 * adalah baterai yang dibakar tanpa satu piksel pun berubah.
 */
const TICK = 20_000;

export type EventClock = {
  phase: EventPhase;
  /** Menit sejak tengah malam di lokasi acara. */
  minutes: number;
};

/**
 * Jam acara: babak yang sedang berlaku, dan pukul berapa sekarang di venue.
 *
 * Mengembalikan `null` pada render pertama, dan itu disengaja. Undangan ini
 * dirender di server, dan server menghitung waktu pada saat halaman DIBUAT —
 * bukan saat tamu membacanya. Kalau babaknya ikut dirender di sana, ada satu
 * jendela di mana markup dari server berkata "terjadwal" sementara klien
 * berkata "sedang berlangsung", dan React akan mengeluh soal hidrasi tepat di
 * bagian yang paling ingin kita percaya. `null` adalah keadaan "belum tahu"
 * yang jujur, dan sama-sama benar di kedua sisi.
 */
export function useEventClock(): EventClock | null {
  const [clock, setClock] = useState<EventClock | null>(null);

  useEffect(() => {
    const update = () =>
      setClock({
        phase: eventPhase(MAIN_DATE, LAST_END),
        minutes: minutesAtEventZone(MAIN_DATE),
      });

    update();
    const id = setInterval(update, TICK);
    return () => clearInterval(id);
  }, []);

  return clock;
}

/** Status papan keberangkatan untuk tiap babak. */
export const BOARD_STATUS: Record<EventPhase, string> = {
  jauh: "TERJADWAL",
  menjelang: "BOARDING",
  berlangsung: "SEDANG BERLANGSUNG",
  usai: "SELESAI",
};
