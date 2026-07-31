"use client";

import { PassportPage, Heading } from "@/components/passport/page";
import { Stamp } from "@/components/passport/stamp";
import { Reveal } from "@/components/motion/reveal";
import { wedding } from "@/config/wedding";
import { eventDateParts, formatDateLong, formatTime, zoneLabel } from "@/lib/datetime";

/**
 * Boarding pass personal — hanya muncul di /to/[slug].
 *
 * Seluruh isinya sudah berupa string yang dibentuk di server. Komponen ini
 * tidak pernah menyentuh Supabase, dan `checkin_code` tidak ikut sebagai prop:
 * yang datang cuma SVG QR yang sudah jadi.
 */
export function BoardingPass({
  name,
  greeting,
  tableNo,
  seats,
  qrSvg,
  mrz,
}: {
  name: string;
  greeting?: string | null;
  tableNo?: string | null;
  seats: number;
  /** Markup SVG QR, dirender `checkinQrSvg()` di server. */
  qrSvg: string;
  /** Dua baris MRZ TD3, seperti halaman data diri. */
  mrz: readonly string[];
}) {
  const event = wedding.events[1] ?? wedding.events[0]; // resepsi
  const flight = flightCode(event.start);

  return (
    <PassportPage
      id="boarding-pass"
      label="Kartu Naik Pesawat"
      page="Hal. 05"
      stampPosition="top-right"
      stamp={<Stamp top="BOARDING" bottom={flight} center="OK" rotate={-12} size={92} />}
    >
      <Heading label="Khusus Untukmu" title="Boarding Pass" />

      {greeting && (
        <p className="mt-5 text-center text-[0.85rem] leading-relaxed font-light text-ink-soft">
          {greeting}
        </p>
      )}

      <Reveal delay={80} className="perforated-y mt-8 border border-ink/20 bg-paper-2/50">
        <div className="flex items-stretch">
          {/* ── Bonggol utama ─────────────────────────────────────────────── */}
          <div className="min-w-0 flex-1 p-4">
            <div className="flex items-baseline justify-between gap-2 border-b border-ink/15 pb-2">
              <span className="field-label text-ink-soft/75">Penumpang</span>
              <span className="font-mono text-[0.7rem] tracking-widest text-ink-soft">
                {flight}
              </span>
            </div>

            <p className="display mt-2 text-[1.35rem] break-words text-ink">{name}</p>

            <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-dashed border-ink/20 pt-3">
              <Cell label="Meja" value={tableNo?.trim() || "—"} />
              <Cell label="Kursi" value={String(seats)} />
              <Cell label="Gerbang" value="BPN" />
            </dl>

            <dl className="mt-3 grid grid-cols-2 gap-2">
              <Cell label="Tanggal" value={formatDateLong(event.start)} small />
              <Cell
                label="Pukul"
                value={`${formatTime(event.start)} ${zoneLabel(event.start)}`}
                small
              />
            </dl>
          </div>

          {/* ── Sobekan QR ────────────────────────────────────────────────── */}
          <div className="flex w-[7.5rem] shrink-0 flex-col items-center justify-center gap-2 border-l border-dashed border-ink/25 bg-ink/[0.04] p-3">
            {/*
              SVG ini dibentuk `qrcode` di server dari URL yang kita susun
              sendiri — tidak ada masukan tamu yang masuk ke dalam markup-nya,
              jadi menyisipkannya langsung aman.
            */}
            <div
              className="w-full [&>svg]:h-auto [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <span className="field-label text-center leading-tight text-ink-soft/70">
              Tunjukkan di pintu
            </span>
          </div>
        </div>

        <div className="mrz-zone border-t border-ink/15 px-3 py-2">
          {mrz.map((line, i) => (
            <p
              key={i}
              className="mrz mrz-fit leading-[1.8] whitespace-pre text-ink-soft/65"
            >
              {line}
            </p>
          ))}
        </div>
      </Reveal>

      <p className="mt-5 text-center text-[0.7rem] leading-relaxed font-light text-ink-soft/70">
        Kartu ini berlaku untuk {seats} orang. Cukup tunjukkan QR di atas kepada
        petugas saat tiba.
      </p>
    </PassportPage>
  );
}

function Cell({
  label,
  value,
  small = false,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="field-label text-ink-soft/75">{label}</dt>
      <dd
        className={`mt-0.5 truncate ${
          small ? "text-[0.72rem] font-light text-ink-2" : "font-mono text-[0.95rem] text-ink"
        }`}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

/** Kode penerbangan dari tanggal acara: AA + DDMM. Inisial kedua mempelai. */
function flightCode(iso: string) {
  const { day: dd, month: mm } = eventDateParts(iso);
  const initials =
    wedding.couple.groom.name.charAt(0).toUpperCase() +
    wedding.couple.bride.name.charAt(0).toUpperCase();
  return `${initials} ${dd}${mm}`;
}
