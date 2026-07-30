"use client";

import { useState } from "react";
import { wedding, type WeddingEvent } from "@/config/wedding";
import { PassportPage, Heading } from "@/components/passport/page";
import { Stamp } from "@/components/passport/stamp";
import { Reveal } from "@/components/motion/reveal";
import { buildIcs, distanceKm, formatDateLong, formatTime, zoneLabel } from "@/lib/datetime";

/** Lokasi & waktu acara, disajikan sebagai dua lembar tiket. */
export function Venue() {
  return (
    <PassportPage
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

      <Journey />
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

type JourneyState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "done"; km: number }
  | { status: "error"; message: string };

/**
 * Jarak tamu ke lokasi acara.
 *
 * Lokasi HANYA diminta setelah tamu menekan tombol, tidak pernah otomatis,
 * dan koordinatnya tidak dikirim ke mana pun — perhitungan selesai di
 * perangkat tamu.
 */
function Journey() {
  const [state, setState] = useState<JourneyState>({ status: "idle" });
  const target = wedding.events[0].coords;

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setState({ status: "error", message: "Perangkat ini tidak mendukung lokasi." });
      return;
    }
    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const km = distanceKm(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          target,
        );
        setState({ status: "done", km });
      },
      () => setState({ status: "error", message: "Izin lokasi tidak diberikan." }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  };

  return (
    <Reveal delay={200} className="mt-8 border-t border-dashed border-ink/25 pt-6 text-center">
      <p className="field-label text-ink-soft">Perjalananmu</p>

      {state.status === "done" ? (
        <>
          <p className="display mt-2 text-[1.6rem] text-ink">
            {state.km < 1 ? "Kurang dari 1" : Math.round(state.km)} km
          </p>
          <p className="mt-1 text-[0.78rem] font-light text-ink-soft">
            dari tempatmu berdiri sekarang ke {wedding.events[0].venue}.
          </p>
        </>
      ) : (
        <>
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
              {state.status === "locating" ? "Mencari…" : "Hitung Jarak"}
            </span>
          </button>
          <p className="mt-3 text-[0.65rem] font-light text-ink-soft/60">
            Lokasimu hanya dihitung di perangkat ini dan tidak kami simpan.
          </p>
        </>
      )}
    </Reveal>
  );
}
