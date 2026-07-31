"use client";

import { useEffect, useRef, useState } from "react";
import { wedding, type WeddingEvent } from "@/config/wedding";
import { PassportPage, Heading } from "@/components/passport/page";
import { Stamp } from "@/components/passport/stamp";
import { Reveal } from "@/components/motion/reveal";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";
import {
  bearingDeg,
  buildIcs,
  compassLabel,
  distanceKm,
  formatDateLong,
  formatTime,
  zoneLabel,
} from "@/lib/datetime";

/** Lokasi & waktu acara, disajikan sebagai dua lembar tiket. */
export function Venue() {
  return (
    <PassportPage
      uvSeed={17}
      id="acara"
      label="Kartu Keberangkatan"
      page="Hal. 04"
      stampPosition="bottom-left"
      stamp={
        <Stamp
          top="TUJUAN AKHIR"
          bottom={wedding.events[0].venue.toUpperCase()}
          center="04"
          rotate={9}
          size={104}
        />
      }
    >
      <Heading label="Waktu & Tempat" title="Rincian Perjalanan" />

      <div className="mt-9 space-y-6">
        {wedding.events.map((event, i) => (
          <EventTicket key={event.id} event={event} delay={i * 120} />
        ))}
      </div>

      <RouteCard />
    </PassportPage>
  );
}

function EventTicket({ event, delay }: { event: WeddingEvent; delay: number }) {
  const zone = zoneLabel(event.start);

  const saveToCalendar = () => {
    const blob = new Blob([buildIcs(event, wedding.title)], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.id}-${wedding.couple.groom.name}-${wedding.couple.bride.name}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Reveal delay={delay} className="perforated-y relative border border-ink/20 bg-paper-2/50">
      <div className="flex items-stretch">
        {/* Sobekan kiri, dicetak vertikal seperti bonggol tiket */}
        <div className="flex w-9 shrink-0 items-center justify-center border-r border-dashed border-ink/25 bg-ink/[0.05]">
          <span className="field-label rotate-180 text-ink-soft [writing-mode:vertical-rl]">
            {event.name}
          </span>
        </div>

        <div className="min-w-0 flex-1 p-4">
          <p className="display text-[1.3rem] text-ink">{event.venue}</p>
          <p className="mt-1 text-[0.78rem] leading-snug font-light text-ink-soft">
            {event.address}
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-ink/15 pt-3">
            <div>
              <dt className="field-label text-ink-soft/75">Tanggal</dt>
              <dd className="mt-0.5 text-[0.78rem] font-light text-ink-2">
                {formatDateLong(event.start)}
              </dd>
            </div>
            <div>
              <dt className="field-label text-ink-soft/75">Pukul</dt>
              <dd className="mt-0.5 font-mono text-[0.82rem] text-ink-2">
                {formatTime(event.start)} – {formatTime(event.end)} {zone}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={event.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-ink/30 px-4 py-2 transition-colors hover:bg-ink hover:text-paper"
            >
              <span className="field-label text-inherit">Buka Peta</span>
            </a>
            <button
              type="button"
              onClick={saveToCalendar}
              className="rounded-full border border-ink/30 px-4 py-2 transition-colors hover:bg-ink hover:text-paper"
            >
              <span className="field-label text-inherit">Simpan ke Kalender</span>
            </button>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

type RouteState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "done"; km: number; bearing: number; lat: number; lng: number }
  | { status: "error"; message: string };

/**
 * Rute tamu ke lokasi acara, digambar sebagai jalur penerbangan.
 *
 * Melanjutkan bahasa yang sudah dipakai <Journey>: perjalanan di undangan ini
 * selalu berupa busur putus-putus dengan pesawat di atasnya. Bedanya, rute ini
 * bukan cerita — ia dihitung dari tempat tamu benar-benar berdiri.
 *
 * Lokasi HANYA diminta setelah tamu menekan tombol, tidak pernah otomatis, dan
 * koordinatnya tidak dikirim ke mana pun: jarak dan arahnya selesai dihitung di
 * perangkat tamu. Koordinat yang ditampilkan pun dibulatkan ke satu angka di
 * belakang koma — sekitar sebelas kilometer — supaya tangkapan layar yang
 * dibagikan tamu tidak pernah memuat titik rumahnya.
 */
function RouteCard() {
  const [state, setState] = useState<RouteState>({ status: "idle" });
  const target = wedding.events[0].coords;

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setState({ status: "error", message: "Perangkat ini tidak mendukung lokasi." });
      return;
    }
    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const from = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setState({
          status: "done",
          km: distanceKm(from, target),
          bearing: bearingDeg(from, target),
          lat: from.lat,
          lng: from.lng,
        });
      },
      () => setState({ status: "error", message: "Izin lokasi tidak diberikan." }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  };

  return (
    <Reveal delay={200} className="mt-8 border-t border-dashed border-ink/25 pt-6">
      <p className="field-label text-center text-ink-soft">Perjalananmu</p>

      {state.status === "done" ? (
        <RouteStrip
          km={state.km}
          bearing={state.bearing}
          origin={`${Math.abs(state.lat).toFixed(1)}° ${state.lat < 0 ? "LS" : "LU"}  ${Math.abs(state.lng).toFixed(1)}° ${state.lng < 0 ? "BB" : "BT"}`}
        />
      ) : (
        <div className="text-center">
          <p className="mt-2 text-[0.82rem] font-light text-ink-soft">
            {state.status === "error"
              ? state.message
              : "Ingin tahu seberapa jauh perjalananmu ke tempat kami?"}
          </p>
          <button
            type="button"
            onClick={locate}
            disabled={state.status === "locating"}
            className="mt-4 rounded-full border border-ink/30 px-5 py-2 transition-colors hover:bg-ink hover:text-paper disabled:opacity-50"
          >
            <span className="field-label text-inherit">
              {state.status === "locating" ? "Mencari…" : "Gambar Ruteku"}
            </span>
          </button>
          <p className="mt-3 text-[0.65rem] font-light text-ink-soft/60">
            Lokasimu hanya dihitung di perangkat ini dan tidak kami simpan.
          </p>
        </div>
      )}
    </Reveal>
  );
}

/** Lebar & tinggi kanvas rute, dalam satuan viewBox. */
const W = 300;
const H = 104;

/**
 * Kartu rute: busur putus-putus dari tamu ke BPN, dengan pesawat yang
 * benar-benar menyusurinya sekali saat rutenya digambar.
 */
function RouteStrip({
  km,
  bearing,
  origin,
}: {
  km: number;
  bearing: number;
  origin: string;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const planeRef = useRef<SVGGElement>(null);
  const reduced = usePrefersReducedMotion();

  // Busurnya membusung ke atas, seperti rute pada peta maskapai. Titik
  // kendalinya ditaruh di luar kedua ujung supaya lengkungnya rata, bukan
  // menyudut di tengah.
  const path = `M 26 ${H - 34} C 96 ${H - 92}, 204 ${H - 92}, 274 ${H - 34}`;

  useEffect(() => {
    const p = pathRef.current;
    const plane = planeRef.current;
    if (!p || !plane) return;

    const total = p.getTotalLength();

    // Tanpa animasi, pesawatnya langsung berdiri di tujuan — bukan di pangkal,
    // yang akan terbaca sebagai perjalanan yang belum dimulai.
    const put = (at: number) => {
      const point = p.getPointAtLength(at);
      const SPAN = 5;
      const from = p.getPointAtLength(Math.max(0, Math.min(at, total - SPAN)));
      const to = p.getPointAtLength(Math.min(total, at + SPAN));
      const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
      plane.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${angle + 90})`);
    };

    if (reduced) {
      put(total);
      return;
    }

    const DUR = 1700;
    const born = performance.now();
    let raf = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - born) / DUR);
      // Berangkat dan mendarat pelan, cepat di tengah — pesawat yang bergerak
      // rata terbaca sebagai kursor, bukan sebagai penerbangan.
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      put(eased * total);
      p.style.setProperty("--drawn", String(eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return (
    <div className="mt-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        fill="none"
        role="img"
        aria-label={`Rute sejauh ${Math.round(km)} kilometer ke arah ${compassLabel(bearing)}`}
      >
        {/* Jalur pucat: seluruh rute, selalu terlihat */}
        <path
          d={path}
          stroke="var(--color-ink)"
          strokeOpacity={0.18}
          strokeWidth={1.1}
          strokeDasharray="3 5"
          strokeLinecap="round"
        />

        {/* Jalur yang sudah dilalui. Diungkap lewat dashoffset pada garis
            PENUH kedua, bukan dengan mengutak-atik dasharray jalur putus-putus
            di atasnya — kalau dasharray dipakai untuk menganimasi, pola
            putus-putusnya ikut hilang. */}
        <path
          ref={pathRef}
          d={path}
          stroke="var(--color-gold-3)"
          strokeWidth={1.4}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          style={{ strokeDashoffset: `calc(1 - var(--drawn, 0))` }}
        />

        {/* Pangkal: tempat tamu berdiri */}
        <circle cx="26" cy={H - 34} r="3.4" fill="var(--color-ink)" opacity={0.65} />
        <circle
          cx="26"
          cy={H - 34}
          r="7"
          stroke="var(--color-ink)"
          strokeOpacity={0.25}
          strokeWidth={1}
        />

        {/* Tujuan: cincin ganda, sedikit lebih tegas daripada pangkalnya */}
        <circle cx="274" cy={H - 34} r="3.4" fill="var(--color-gold-3)" />
        <circle
          cx="274"
          cy={H - 34}
          r="7.5"
          stroke="var(--color-gold-3)"
          strokeOpacity={0.6}
          strokeWidth={1.2}
        />

        {/* Pesawat yang sama dengan yang menerbangkan cerita di <Journey>. */}
        <g ref={planeRef}>
          <path
            d="M0 -5.6 C0.9 -5.6 1.4 -4.6 1.4 -3.2 L5.6 0 L5.6 1.2 L1.4 0.2 L1.4 2.8 L3 4.2 L3 4.9 L0 4.2 L-3 4.9 L-3 4.2 L-1.4 2.8 L-1.4 0.2 L-5.6 1.2 L-5.6 0 L-1.4 -3.2 C-1.4 -4.6 -0.9 -5.6 0 -5.6 Z"
            fill="var(--color-ink)"
          />
        </g>

        <text
          x="26"
          y={H - 16}
          textAnchor="middle"
          fontSize="9"
          letterSpacing="1.6"
          fontFamily="var(--font-mono)"
          fill="var(--color-ink-soft)"
        >
          POS
        </text>
        <text
          x="274"
          y={H - 16}
          textAnchor="middle"
          fontSize="9"
          letterSpacing="1.6"
          fontFamily="var(--font-mono)"
          fill="var(--color-gold-3)"
        >
          BPN
        </text>
      </svg>

      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-ink/15 pt-3 text-center">
        <div>
          <dt className="field-label text-ink-soft/75">Jarak</dt>
          <dd className="mt-1 font-mono text-[0.9rem] text-ink">
            {km < 1 ? "< 1" : Math.round(km)} km
          </dd>
        </div>
        <div>
          <dt className="field-label text-ink-soft/75">Arah</dt>
          <dd className="mt-1 font-mono text-[0.9rem] text-ink">
            {Math.round(bearing)}°
          </dd>
        </div>
        <div>
          <dt className="field-label text-ink-soft/75">Menuju</dt>
          <dd className="mt-1 text-[0.82rem] font-light text-ink">
            {compassLabel(bearing)}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-center text-[0.68rem] leading-relaxed font-light text-ink-soft/65">
        Titik berangkat {origin} — jarak garis lurus, bukan jarak tempuh jalan.
        Dihitung di perangkatmu sendiri.
      </p>
    </div>
  );
}
