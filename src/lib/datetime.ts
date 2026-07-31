import type { WeddingEvent } from "@/config/wedding";

/** Offset di ujung string ISO, dalam menit. null kalau tidak ada. */
function offsetMinutes(iso: string) {
  const m = iso.match(/([+-])(\d{2}):(\d{2})$/);
  if (!m) return null;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/**
 * Waktu dinding di lokasi acara, bukan di perangkat tamu.
 *
 * Jam acara HARUS ditampilkan menurut offset yang tertulis di konfigurasi —
 * tamu di Jakarta dan tamu di Balikpapan wajib melihat angka yang sama, dan
 * angka itu harus cocok dengan label WIB/WITA/WIT di sebelahnya. Karena
 * dukungan `timeZone` untuk offset numerik ("+08:00") masih belum merata di
 * semua peramban ponsel, waktunya digeser sebesar offset lalu diformat sebagai
 * UTC — hasilnya sama tapi jalan di mana saja.
 */
function atEventZone(iso: string) {
  const off = offsetMinutes(iso);
  const d = new Date(iso);
  // Tanpa offset, jatuh kembali ke WIB seperti perilaku sebelumnya.
  if (off === null) return { date: d, timeZone: "Asia/Jakarta" };
  return { date: new Date(d.getTime() + off * 60_000), timeZone: "UTC" };
}

/** Format tanggal panjang Indonesia: "Minggu, 15 November 2026". */
export function formatDateLong(iso: string) {
  const { date, timeZone } = atEventZone(iso);
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  });
}

/** Jam lokal acara: "10.00". */
export function formatTime(iso: string) {
  const { date, timeZone } = atEventZone(iso);
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
}

/**
 * Format jam untuk timestamp yang datang dari database.
 *
 * `created_at` Postgres dikembalikan dengan offset `+00:00` (UTC). Kalau
 * dilempar ke `formatTime`, ia dianggap sudah waktu setempat dan tampil apa
 * adanya — check-in pukul 09.15 WITA akan terbaca 01.15. Jadi zonanya diambil
 * dari string acara di konfigurasi, bukan dari timestamp-nya sendiri.
 */
export function formatTimeInEventZone(iso: string, zoneSource: string) {
  const off = offsetMinutes(zoneSource) ?? 420; // jatuh ke WIB kalau config tanpa offset
  const shifted = new Date(new Date(iso).getTime() + off * 60_000);
  return shifted.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

/**
 * Bagian tanggal menurut waktu dinding acara, dua digit.
 *
 * Ada supaya tidak ada lagi tempat yang membaca `getUTCDate()` langsung dari
 * string ISO ber-offset. Untuk acara WITA jam 08.00 hal itu memang kebetulan
 * benar, tapi menggeser jam acara beberapa jam saja sudah cukup membuatnya
 * salah satu hari — jebakan yang sama seperti bug WITA yang pernah terjadi.
 */
export function eventDateParts(iso: string) {
  const { date } = atEventZone(iso);
  return {
    day: String(date.getUTCDate()).padStart(2, "0"),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
    year: String(date.getUTCFullYear()),
  };
}

/** Zona waktu yang dipakai acara, diambil dari offset di konfigurasi. */
export function zoneLabel(iso: string) {
  const off = offsetMinutes(iso);
  if (off === null || off % 60 !== 0) return "";
  return { 7: "WIB", 8: "WITA", 9: "WIT" }[off / 60] ?? "";
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
 * Arah dari `a` ke `b` dalam derajat, 0 = utara, searah jarum jam.
 *
 * Bukan sekadar arctan selisih koordinat: garis bujur menyempit ke arah kutub,
 * jadi selisih derajat bujur yang sama berarti jarak yang berbeda tergantung
 * lintangnya. Untuk Balikpapan yang hampir persis di khatulistiwa selisihnya
 * kecil — tapi tamu bisa saja membuka undangan ini dari mana pun.
 */
export function bearingDeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const COMPASS = [
  "Utara",
  "Timur Laut",
  "Timur",
  "Tenggara",
  "Selatan",
  "Barat Daya",
  "Barat",
  "Barat Laut",
];

/** Nama arah delapan penjuru untuk sudut kompas. */
export function compassLabel(deg: number) {
  // Digeser setengah sektor sebelum dibagi, supaya "Utara" mencakup 337,5°–22,5°
  // dan bukan 0°–45°. Tanpa pergeseran itu, arah tepat ke utara sekalipun bisa
  // terbaca sebagai timur laut.
  return COMPASS[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
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
