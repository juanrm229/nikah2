import type { WeddingEvent } from "@/config/wedding";

/** Format tanggal panjang Indonesia: "Minggu, 20 Desember 2026". */
export function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

/** Jam lokal acara: "08.00". */
export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

/** Zona waktu yang dipakai acara, diambil dari offset di konfigurasi. */
export function zoneLabel(iso: string) {
  const m = iso.match(/([+-])(\d{2}):(\d{2})$/);
  if (!m) return "";
  const hours = Number(m[2]) * (m[1] === "-" ? -1 : 1);
  return { 7: "WIB", 8: "WITA", 9: "WIT" }[hours] ?? "";
}

export type Countdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Sudah lewat waktu mulai. */
  passed: boolean;
};

export function countdownTo(iso: string, now = Date.now()): Countdown {
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: true };

  const seconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
    passed: false,
  };
}

/** Jarak garis lurus dua titik bumi dalam kilometer (rumus haversine). */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Berkas kalender untuk tombol "Simpan ke kalender".
 * Dibuat di sisi klien sebagai blob, tanpa perlu memanggil server.
 */
export function buildIcs(event: WeddingEvent, title: string) {
  const stamp = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  // Baris ICS wajib dipisah CRLF, dan teks bebas harus meloloskan koma & titik koma.
  const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//undangan//ID",
    "BEGIN:VEVENT",
    `UID:${event.id}-${stamp(event.start)}@undangan`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(event.start)}`,
    `DTEND:${stamp(event.end)}`,
    `SUMMARY:${esc(`${event.name} — ${title}`)}`,
    `LOCATION:${esc(`${event.venue}, ${event.address}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
