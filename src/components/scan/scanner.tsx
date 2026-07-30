"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { checkIn, logout, type CheckinResult } from "@/lib/actions/checkin";
import { formatTimeInEventZone } from "@/lib/datetime";
import { MAIN_DATE } from "@/config/wedding";

const INITIAL: CheckinResult = { status: "idle" };

/**
 * Pemindai QR petugas.
 *
 * QR tamu berisi URL penuh (`…/scan?c=KODE`), bukan kode mentah, supaya petugas
 * bisa memakai aplikasi kamera bawaan HP kalau pemindai di halaman ini gagal.
 * Karena itu hasil pindai selalu diurai dulu untuk mengambil parameter `c`.
 */
export function Scanner({ initialCode = "" }: { initialCode?: string }) {
  const [result, formAction, pending] = useActionState(checkIn, INITIAL);
  const [code, setCode] = useState(initialCode);
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  /** Kirim kode ke Server Action tanpa lewat DOM, jadi tidak ada balapan urutan. */
  const submit = (raw: string) => {
    const fd = new FormData();
    fd.set("code", raw);
    formAction(fd);
  };

  useEffect(() => {
    if (!scanning) return;
    const video = videoRef.current;
    if (!video) return;

    const reader = new BrowserQRCodeReader();
    let controls: { stop: () => void } | null = null;
    let done = false;

    reader
      .decodeFromVideoDevice(undefined, video, (res) => {
        if (done || !res) return;
        done = true;
        const found = extractCode(res.getText());
        setCode(found);
        setScanning(false);
        controls?.stop();
        submit(found);
      })
      .then((c) => {
        controls = c;
        // Kalau QR sudah terbaca sebelum promise ini selesai, hentikan segera.
        if (done) c.stop();
      })
      .catch(() => {
        setCamError("Kamera tidak bisa dibuka. Izinkan akses kamera, atau ketik kodenya manual.");
        setScanning(false);
      });

    return () => {
      done = true;
      controls?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  return (
    <main className="mx-auto w-full max-w-sm px-5 py-8">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <p className="field-label">Meja Penerima</p>
          <h1 className="display mt-1 text-[1.5rem] text-paper">Check-in Tamu</h1>
        </div>
        <form action={logout}>
          <button type="submit" className="field-label underline decoration-dotted">
            Keluar
          </button>
        </form>
      </header>

      {/* ── Kamera ──────────────────────────────────────────────────────────── */}
      <div className="mt-6 overflow-hidden rounded-[3px] border border-paper/20 bg-ink-2">
        <video
          ref={videoRef}
          className={`aspect-square w-full object-cover ${scanning ? "" : "hidden"}`}
          muted
          playsInline
        />
        {!scanning && (
          <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-[0.8rem] font-light text-paper-dim">
              Arahkan kamera ke QR di boarding pass tamu.
            </p>
            <button
              type="button"
              onClick={() => {
                setCamError(null);
                setScanning(true);
              }}
              className="rounded-full border border-paper/30 px-5 py-2 transition-colors hover:bg-paper hover:text-ink"
            >
              <span className="field-label text-inherit">Nyalakan Kamera</span>
            </button>
          </div>
        )}
      </div>

      {scanning && (
        <button
          type="button"
          onClick={() => setScanning(false)}
          className="mt-3 w-full rounded-full border border-paper/25 py-2"
        >
          <span className="field-label text-inherit">Matikan Kamera</span>
        </button>
      )}

      {camError && <p className="mt-3 text-[0.78rem] font-light text-[#d98b8b]">{camError}</p>}

      {/* ── Entri manual ────────────────────────────────────────────────────── */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(code);
        }}
        className="mt-6"
      >
        <label htmlFor="scan-code" className="field-label">
          Atau ketik kode (24 karakter)
        </label>
        <input
          id="scan-code"
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          className="mt-2 w-full border-b border-paper/25 bg-transparent pb-2 font-mono text-[0.85rem] tracking-wider text-paper outline-none focus:border-gold"
        />
        <button
          type="submit"
          disabled={pending || !code}
          className="mt-4 w-full rounded-full border border-paper/30 py-3 transition-colors hover:bg-paper hover:text-ink disabled:opacity-40"
        >
          <span className="field-label text-inherit">{pending ? "Memeriksa…" : "Check-in"}</span>
        </button>
      </form>

      <div aria-live="polite" className="mt-6">
        <Outcome result={result} />
      </div>
    </main>
  );
}

function Outcome({ result }: { result: CheckinResult }) {
  if (result.status === "idle") return null;

  if (result.status === "unauthorized") {
    return <Banner tone="bad" title="Sesi berakhir" body="Muat ulang halaman dan masuk lagi." />;
  }
  if (result.status === "error") {
    return <Banner tone="bad" title="Gagal" body={result.message} />;
  }
  if (result.status === "unknown") {
    return (
      <Banner
        tone="bad"
        title="Kode tidak dikenal"
        body={`Tidak ada tamu dengan kode ini${result.code ? ` (${result.code})` : ""}. Periksa lagi atau cari namanya manual.`}
      />
    );
  }

  const { guest } = result;
  const dup = result.status === "duplicate";

  return (
    <Banner
      tone={dup ? "warn" : "good"}
      title={dup ? "Sudah check-in sebelumnya" : "Selamat datang"}
      body={
        dup
          ? `Tamu ini sudah masuk pukul ${formatTimeInEventZone(result.at, MAIN_DATE)}. Tidak dihitung dua kali.`
          : "Check-in tercatat."
      }
    >
      <p className="display mt-3 text-[1.35rem] break-words text-paper">{guest.name}</p>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        <Cell label="Meja" value={guest.tableNo?.trim() || "—"} />
        <Cell label="Kursi" value={String(guest.seats)} />
        <Cell
          label="RSVP"
          value={guest.rsvp ? `${guest.rsvp.attending} ${guest.rsvp.headcount}` : "belum"}
        />
      </dl>
      {guest.groupName && (
        <p className="field-label mt-3 text-paper-dim/70">Kelompok: {guest.groupName}</p>
      )}
    </Banner>
  );
}

function Banner({
  tone,
  title,
  body,
  children,
}: {
  tone: "good" | "warn" | "bad";
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  const ring = {
    good: "border-[var(--color-stamp)]/60 bg-[var(--color-stamp)]/12",
    warn: "border-gold/60 bg-gold/12",
    bad: "border-[#d98b8b]/50 bg-[#d98b8b]/10",
  }[tone];

  return (
    <div className={`rounded-[3px] border p-4 ${ring}`}>
      <p className="field-label text-paper/80">{title}</p>
      <p className="mt-1 text-[0.82rem] leading-relaxed font-light text-paper-dim">{body}</p>
      {children}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="field-label text-paper-dim/70">{label}</dt>
      <dd className="mt-0.5 truncate font-mono text-[0.9rem] text-paper" title={value}>
        {value}
      </dd>
    </div>
  );
}

/** QR berisi URL `…/scan?c=KODE`; ambil `c`-nya. Kalau bukan URL, pakai apa adanya. */
function extractCode(text: string): string {
  try {
    const u = new URL(text);
    return u.searchParams.get("c") ?? text;
  } catch {
    return text.trim();
  }
}
