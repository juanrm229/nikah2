"use client";

import { useEffect, useState } from "react";

/**
 * Cap yang dikumpulkan tamu sendiri.
 *
 * Undangan ini sudah membubuhkan stempel di tiap halaman yang digulir — tapi
 * cap yang didapat hanya dengan menggulir tidak dikumpulkan oleh siapa pun, ia
 * cuma terjadi. Yang dicatat di sini berbeda: cap yang harus DIKERJAKAN.
 * Mengirim konfirmasi, menitipkan ucapan, menitipkan lagu, mengirim foto.
 *
 * Itulah yang membuat halaman visa di penutup layak dipamerkan. Paspor yang
 * penuh karena pemiliknya benar-benar pergi ke sana adalah dokumen; paspor
 * yang penuh karena halamannya di-scroll adalah hiasan.
 *
 * Disimpan di peramban tamu, bukan di server. Tiga alasan, berurutan: server
 * tidak tahu tamu umum tanpa slug itu siapa; menanyakan ke server tiap kali
 * halaman visa dirender berarti satu perjalanan jaringan untuk sesuatu yang
 * tidak boleh membuat penutup terasa lambat; dan catatan ini tidak pernah jadi
 * kebenaran resmi — yang resmi tetap baris di database, ini cuma kenang-kenangan
 * milik peramban yang mengerjakannya.
 */

export type VisaStampId = "rsvp" | "ucapan" | "lagu" | "foto";

export type VisaStamp = {
  id: VisaStampId;
  /** Busur atas cap. */
  top: string;
  /** Busur bawah cap. */
  bottom: string;
  /** Tiga huruf di tengah, seperti kode pos pemeriksaan. */
  center: string;
  /** Ditampilkan di slot yang masih kosong — apa yang harus dikerjakan. */
  hint: string;
};

/**
 * Urutannya bukan selera: dari yang paling diminta ke yang paling sukarela.
 * Slot pertama yang kosong adalah yang paling ingin dilihat mempelai terisi.
 */
export const VISA_STAMPS: readonly VisaStamp[] = [
  {
    id: "rsvp",
    top: "KONFIRMASI HADIR",
    bottom: "PEMERIKSAAN",
    center: "RSVP",
    hint: "Kirim konfirmasi kehadiran",
  },
  {
    id: "ucapan",
    top: "TITIP UCAPAN",
    bottom: "BUKU TAMU",
    center: "MSG",
    hint: "Titipkan satu ucapan",
  },
  {
    id: "lagu",
    top: "TITIP LAGU",
    bottom: "RUANG MUSIK",
    center: "SNG",
    hint: "Titipkan satu lagu",
  },
  {
    id: "foto",
    top: "KIRIM FOTO",
    bottom: "DINDING FOTO",
    center: "PIC",
    hint: "Kirim satu foto",
  },
];

const KEY = (serial: string) => `paspor-visa:${serial}`;

/**
 * Nama kejadian yang memberi tahu halaman visa bahwa ada cap baru.
 *
 * `storage` bawaan peramban tidak cukup: ia hanya menyala di TAB LAIN, tidak di
 * tab yang menulisnya. Padahal justru tab itu yang harus segera memperlihatkan
 * capnya turun — tamu baru saja menekan kirim di halaman yang sama.
 */
const EVENT = "paspor-visa";

const isVisaId = (v: unknown): v is VisaStampId =>
  VISA_STAMPS.some((s) => s.id === v);

export function readVisa(serial: string): VisaStampId[] {
  try {
    const raw = window.localStorage.getItem(KEY(serial));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isVisaId) : [];
  } catch {
    // localStorage bisa dilarang sepenuhnya (mode privat di beberapa peramban,
    // atau kuota penuh). Halaman visanya lalu tampil kosong, dan itu jauh lebih
    // baik daripada penutup yang gagal dirender.
    return [];
  }
}

export function markVisa(serial: string, id: VisaStampId) {
  try {
    const next = readVisa(serial);
    if (next.includes(id)) return;
    next.push(id);
    window.localStorage.setItem(KEY(serial), JSON.stringify(next));
  } catch {
    // Tidak bisa disimpan. Kejadiannya tetap ditembakkan supaya capnya paling
    // tidak turun di layar yang sedang dilihat tamu — hilang saat halaman
    // dimuat ulang, tapi momennya tidak hilang.
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

/**
 * Cap yang sudah terkumpul, ikut berubah saat ada yang baru dibubuhkan.
 *
 * Selalu mulai dari daftar KOSONG, bukan dari isi localStorage. Render pertama
 * di peramban wajib sama persis dengan yang dikirim server, dan server tidak
 * punya localStorage — membacanya lebih awal berarti halaman visa yang
 * berkedip dari penuh ke kosong lalu penuh lagi di detik pertama.
 */
export function useVisa(serial: string) {
  const [ids, setIds] = useState<VisaStampId[]>([]);

  useEffect(() => {
    const sync = () => setIds(readVisa(serial));
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [serial]);

  return ids;
}
