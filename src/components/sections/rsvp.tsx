"use client";

import { useActionState, useEffect, useState } from "react";
import { PassportPage, Heading } from "@/components/passport/page";
import { Stamp } from "@/components/passport/stamp";
import { useSerial } from "@/components/passport/serial";
import { stampTraits } from "@/lib/stamp";
import { Reveal } from "@/components/motion/reveal";
import { submitRsvp, type RsvpResult } from "@/lib/actions/rsvp";
import { liveEnabled } from "@/lib/supabase/client";
import { HONEYPOT } from "@/lib/validate";
import { markVisa } from "@/lib/passport-log";
import type { Attendance } from "@/lib/supabase/types";
import { wedding } from "@/config/wedding";

/**
 * Checkpoint imigrasi — RSVP.
 *
 * Formnya sengaja TIDAK disembunyikan setelah berhasil. Tamu sering berubah
 * pikiran, dan Server Action-nya meng-upsert, jadi mengirim ulang cukup
 * memperbarui jawaban. Menyembunyikan form akan memaksa state "sedang
 * mengubah" yang harus disinkronkan dengan hasil action — sumber bug, tanpa
 * manfaat.
 */

const CHOICES: { value: Attendance; label: string; sub: string }[] = [
  { value: "hadir", label: "Hadir", sub: "AKAN DATANG" },
  { value: "ragu", label: "Masih Ragu", sub: "BELUM PASTI" },
  { value: "tidak", label: "Tidak Hadir", sub: "BERHALANGAN" },
];

const INITIAL: RsvpResult = { status: "idle" };

export function Rsvp({
  slug = null,
  guestName,
  seats,
}: {
  /** Slug tamu kalau dibuka dari /to/[slug]. Dipakai server untuk upsert. */
  slug?: string | null;
  guestName?: string | null;
  /** Jumlah kursi yang diundang; membatasi angka yang bisa dipilih. */
  seats?: number;
}) {
  const [result, formAction, pending] = useActionState(
    submitRsvp.bind(null, slug),
    INITIAL,
  );
  const [attending, setAttending] = useState<Attendance>("hadir");

  const maxSeats = Math.max(1, Math.min(20, seats ?? 10));
  const ok = result.status === "ok";
  const declined = ok && result.attending === "tidak";

  /**
   * Cap milik tamu ini.
   *
   * Sudut miring dan belang tintanya dihitung dari nomor paspornya sendiri,
   * jadi cap yang dibubuhkan untuk satu tamu tidak pernah sama dengan cap tamu
   * lain — dan selalu sama setiap kali ia membuka undangannya. Jalur hijau dan
   * jalur merah dipisahkan lewat `variant`, supaya tamu yang mengubah
   * jawabannya melihat cap yang benar-benar berbeda, bukan cap yang sama
   * berganti warna.
   *
   * Jalur merah dimiringkan ke arah berlawanan: dua cap yang miring ke sisi
   * yang sama di satu halaman terbaca sebagai satu cap yang dicetak dua kali.
   */
  const serial = useSerial();
  const traits = stampTraits(serial, {
    base: declined ? 11 : -9,
    variant: declined ? 1 : 0,
  });

  // Dicatat di halaman visa. Lewat effect, bukan di dalam penangan submit:
  // yang mengirim formnya adalah `useActionState`, dan hasilnya baru diketahui
  // pada render berikutnya. Tamu yang MENOLAK hadir tetap dapat capnya — yang
  // diminta undangan ini adalah kabarnya, bukan kehadirannya.
  useEffect(() => {
    if (ok) markVisa(serial, "rsvp");
  }, [ok, serial]);

  // Tanpa env Supabase, Server Action-nya pasti gagal. Lebih baik section ini
  // tidak ada sama sekali daripada memajang form yang menolak setiap kiriman.
  if (!liveEnabled) return null;

  return (
    <PassportPage id="rsvp" label="Checkpoint Imigrasi" page="Hal. 06" uvSeed={23}>
      <Heading label="Konfirmasi Kehadiran" title="Pemeriksaan Dokumen" />

      <Reveal delay={80} className="relative mt-8">
        {/* Stempel dibiarkan terpasang sejak awal dengan opacity 0. Kalau baru
            dipasang setelah sukses, ia lahir langsung di keadaan akhir dan
            transisinya tidak pernah jalan — jadi tidak terasa "dicap". */}
        <div className="pointer-events-none absolute -top-2 right-0 z-20">
          <Stamp
            active={ok}
            top={declined ? "TERCATAT" : "DITERIMA"}
            bottom={declined ? "TERIMA KASIH" : "SELAMAT DATANG"}
            center={declined ? "NOTED" : "APPROVED"}
            color={declined ? "var(--color-stamp-red)" : "var(--color-stamp)"}
            rotate={traits.rotate}
            seed={traits.seed}
            serial={serial}
            haptic
            size={124}
          />
        </div>

        <form action={formAction} className="space-y-5">
          {/* Jebakan bot: di luar layar, tak terjangkau Tab maupun pembaca layar. */}
          <div aria-hidden className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="rsvp-hp">Alamat web</label>
            <input id="rsvp-hp" name={HONEYPOT} type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <Field label="Nama" htmlFor="rsvp-name">
            <input
              id="rsvp-name"
              name="name"
              type="text"
              required
              maxLength={60}
              defaultValue={guestName ?? ""}
              autoComplete="name"
              placeholder={wedding.site.defaultGuest}
              className="w-full border-b border-ink/25 bg-transparent pb-1.5 font-light text-ink outline-none placeholder:text-ink-soft/45 focus:border-gold-3"
            />
          </Field>

          <fieldset>
            <legend className="field-label text-ink-soft/75">Keterangan</legend>
            {/* Tiga kolom baru muat mulai 360 px. Di bawah itu tiap kolom
                tinggal ~57 px sementara "BERHALANGAN" butuh 81 px, dan huruf
                terakhirnya hilang di balik tepi kartu. Ditumpuk jadi tiga baris
                penuh, teksnya utuh DAN sasaran sentuhnya jadi selebar kartu —
                dua-duanya menang di ponsel terkecil. */}
            <div className="mt-2.5 grid grid-cols-1 gap-2 min-[360px]:grid-cols-3">
              {CHOICES.map((c) => {
                const selected = attending === c.value;
                return (
                  <label
                    key={c.value}
                    className={`cursor-pointer rounded-[2px] border px-2 py-2.5 text-center transition-colors ${
                      selected
                        ? "border-ink/60 bg-ink text-paper"
                        : "border-ink/25 text-ink hover:border-ink/45"
                    }`}
                  >
                    <input
                      type="radio"
                      name="attending"
                      value={c.value}
                      checked={selected}
                      onChange={() => setAttending(c.value)}
                      className="sr-only"
                    />
                    <span className="block text-[0.8rem] font-light">{c.label}</span>
                    <span
                      className={`field-label mt-0.5 block ${
                        selected ? "text-paper/70" : "text-ink-soft/60"
                      }`}
                    >
                      {c.sub}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Yang berhalangan tidak perlu ditanya jumlah orang. */}
          {attending !== "tidak" && (
            <Field
              label={`Jumlah yang datang (maks. ${maxSeats})`}
              htmlFor="rsvp-headcount"
            >
              <input
                id="rsvp-headcount"
                name="headcount"
                type="number"
                inputMode="numeric"
                min={1}
                max={maxSeats}
                defaultValue={Math.min(2, maxSeats)}
                className="w-24 border-b border-ink/25 bg-transparent pb-1.5 font-mono text-ink outline-none focus:border-gold-3"
              />
            </Field>
          )}

          <Field label="Nomor telepon (opsional)" htmlFor="rsvp-phone">
            <input
              id="rsvp-phone"
              name="phone"
              type="tel"
              maxLength={30}
              autoComplete="tel"
              placeholder="08…"
              className="w-full border-b border-ink/25 bg-transparent pb-1.5 font-mono text-[0.9rem] text-ink outline-none placeholder:text-ink-soft/45 focus:border-gold-3"
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full border border-ink/30 px-5 py-2 transition-colors hover:bg-ink hover:text-paper disabled:opacity-50"
            >
              <span className="field-label text-inherit">
                {pending ? "Memeriksa…" : ok ? "Perbarui Jawaban" : "Kirim Konfirmasi"}
              </span>
            </button>
          </div>

          {/* Satu wadah aria-live untuk sukses maupun galat, supaya pembaca
              layar mengumumkan hasilnya tanpa perlu memindah fokus. */}
          <p aria-live="polite" className="min-h-[1.25rem] text-[0.78rem] font-light">
            {result.status === "error" && (
              <span className="text-[var(--color-stamp-red)]">{result.message}</span>
            )}
            {ok && (
              <span className="text-ink-soft">
                {result.attending === "tidak"
                  ? "Terima kasih sudah memberi kabar. Doamu tetap kami terima."
                  : `Tercatat untuk ${result.headcount} orang. Sampai berjumpa di Balikpapan.`}
              </span>
            )}
          </p>
        </form>
      </Reveal>
    </PassportPage>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="field-label text-ink-soft/75">
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
