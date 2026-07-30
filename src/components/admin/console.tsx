"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  addGuest,
  decidePhoto,
  listGuests,
  listSongs,
  pendingPhotos,
  setSongPlayed,
  type AdminGuest,
  type AdminResult,
  type AdminSong,
  type PendingPhoto,
} from "@/lib/actions/admin";
import { logout } from "@/lib/actions/checkin";
import { MusicPanel } from "@/components/admin/music-panel";
import type { TrackList } from "@/lib/actions/music";

/**
 * Ruang panitia. Bukan bagian dari undangan — ini layar kerja, jadi rapat dan
 * datar, tanpa animasi masuk.
 *
 * Data awalnya dirender di server (halaman `force-dynamic`), lalu perubahan
 * ditarik ulang lewat action yang sama alih-alih `router.refresh()`. Bedanya
 * terasa saat memoderasi berturut-turut: yang disegarkan cuma daftarnya, bukan
 * seluruh halaman termasuk posisi gulir.
 */

const INITIAL: AdminResult = { status: "idle" };

export function AdminConsole({
  initialPhotos,
  initialSongs,
  initialGuests,
  initialTracks,
}: {
  initialPhotos: PendingPhoto[];
  initialSongs: AdminSong[];
  initialGuests: AdminGuest[];
  initialTracks: TrackList;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [songs, setSongs] = useState(initialSongs);
  const [guests, setGuests] = useState(initialGuests);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const [added, addAction, adding] = useActionState(addGuest, INITIAL);
  const [, startRefresh] = useTransition();

  // Setiap penambahan tamu yang berhasil menarik ulang daftarnya. `added`
  // adalah objek baru tiap kiriman, jadi kiriman kedua tetap memicu ini
  // walaupun pesannya kebetulan sama.
  useEffect(() => {
    if (added.status !== "ok") return;
    startRefresh(() => {
      listGuests().then(setGuests);
    });
  }, [added]);

  async function decide(id: string, approve: boolean) {
    setBusyId(id);
    const res = await decidePhoto(id, approve);
    setBusyId(null);

    if (res.status === "denied") return setNote("Sesi habis. Muat ulang lalu masuk lagi.");
    if (res.status === "error") return setNote(res.message);

    setNote(res.status === "ok" ? (res.message ?? null) : null);
    // Baris yang sudah diputuskan dibuang lokal, tidak menunggu server —
    // menyetujui 40 foto tidak seharusnya berarti 40 kali muat ulang daftar.
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  async function togglePlayed(song: AdminSong) {
    setBusyId(song.id);
    const res = await setSongPlayed(song.id, !song.played);
    setBusyId(null);

    if (res.status === "denied") return setNote("Sesi habis. Muat ulang lalu masuk lagi.");
    if (res.status === "error") return setNote(res.message);

    // Ditandai di tempat, TIDAK diurutkan ulang. `listSongs` menaruh yang sudah
    // diputar di bawah, jadi mengurutkan ulang di sini akan melempar baris yang
    // baru ditekan ke ujung daftar — persis di bawah jari petugas.
    setSongs((prev) =>
      prev.map((s) => (s.id === song.id ? { ...s, played: !song.played } : s)),
    );
  }

  const unplayed = songs.filter((s) => !s.played).length;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
      <header className="flex items-baseline justify-between gap-4 border-b border-paper/15 pb-4">
        <div>
          <p className="field-label">Khusus Panitia</p>
          <h1 className="display mt-2 text-[1.7rem] text-paper">Ruang Panitia</h1>
        </div>
        <form action={logout}>
          <button type="submit" className="field-label text-paper-dim hover:text-paper">
            Keluar
          </button>
        </form>
      </header>

      <p aria-live="polite" className="min-h-[1.5rem] pt-3 text-[0.78rem] font-light text-paper-dim">
        {note}
      </p>

      {/* ── Moderasi foto ─────────────────────────────────────────────── */}
      <section className="mt-4">
        <h2 className="field-label text-gold">
          Foto menunggu persetujuan ({photos.length})
        </h2>

        {photos.length === 0 ? (
          <p className="mt-3 text-[0.8rem] font-light text-paper-dim/70">
            Tidak ada antrean. Foto yang disetujui langsung tampil di dinding kenangan.
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {photos.map((p) => (
              <li key={p.id} className="border border-paper/15 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL bertanda tangan & berumur pendek, tidak bisa lewat optimizer */}
                <img
                  src={p.url}
                  alt={p.caption ?? `Foto dari ${p.uploader ?? "tamu"}`}
                  loading="lazy"
                  className="aspect-square w-full bg-ink object-contain"
                />
                <p className="mt-2 text-[0.72rem] leading-snug font-light break-words text-paper-dim">
                  {p.caption || <span className="opacity-50">tanpa keterangan</span>}
                </p>
                <p className="field-label mt-1 text-paper-dim/70">{p.uploader || "anonim"}</p>

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => decide(p.id, true)}
                    className="field-label flex-1 border border-paper/25 py-1.5 hover:bg-paper hover:text-ink disabled:opacity-40"
                  >
                    Setujui
                  </button>
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => decide(p.id, false)}
                    className="field-label flex-1 border border-[#d98b8b]/40 py-1.5 text-[#d98b8b] hover:bg-[#d98b8b] hover:text-ink disabled:opacity-40"
                  >
                    Tolak
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => startRefresh(() => { pendingPhotos().then(setPhotos); })}
          className="field-label mt-4 text-paper-dim hover:text-paper"
        >
          Muat ulang antrean
        </button>
      </section>

      {/* ── Request lagu ──────────────────────────────────────────────── */}
      <section className="mt-12 border-t border-paper/15 pt-8">
        <h2 className="field-label text-gold">
          Request lagu ({unplayed} belum diputar dari {songs.length})
        </h2>

        {songs.length === 0 ? (
          <p className="mt-3 text-[0.8rem] font-light text-paper-dim/70">
            Belum ada request. Daftar ini hanya terlihat di sini — undangan tidak
            memajangnya ke tamu.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-paper/10">
            {songs.map((s) => (
              <li key={s.id} className="flex items-baseline gap-3 py-2.5">
                <button
                  type="button"
                  disabled={busyId === s.id}
                  onClick={() => togglePlayed(s)}
                  aria-pressed={s.played}
                  title={s.played ? "Tandai belum diputar" : "Tandai sudah diputar"}
                  className={`field-label shrink-0 border px-2 py-1 disabled:opacity-40 ${
                    s.played
                      ? "border-gold/40 text-gold"
                      : "border-paper/25 text-paper-dim hover:bg-paper hover:text-ink"
                  }`}
                >
                  {s.played ? "✓ Diputar" : "Putar"}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[0.85rem] leading-snug font-light break-words ${
                      s.played ? "text-paper-dim/50 line-through" : "text-paper"
                    }`}
                  >
                    {s.title}
                    {s.artist && <span className="text-paper-dim"> — {s.artist}</span>}
                  </p>
                  <p className="field-label mt-0.5 text-paper-dim/70">
                    {s.requester || "anonim"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => startRefresh(() => { listSongs().then(setSongs); })}
          className="field-label mt-4 text-paper-dim hover:text-paper"
        >
          Muat ulang daftar lagu
        </button>
      </section>

      {/* ── Musik latar ───────────────────────────────────────────────── */}
      <MusicPanel initial={initialTracks} />

      {/* ── Daftar tamu ───────────────────────────────────────────────── */}
      <section className="mt-12 border-t border-paper/15 pt-8">
        <h2 className="field-label text-gold">Daftar tamu ({guests.length})</h2>

        <form action={addAction} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field id="g-name" name="name" label="Nama" required className="col-span-2" />
          <Field id="g-table" name="table_no" label="Meja" />
          <Field id="g-seats" name="seats" label="Kursi" type="number" defaultValue="2" />
          <Field id="g-group" name="group_name" label="Kelompok" className="col-span-2" />
          <Field id="g-greeting" name="greeting" label="Sapaan" className="col-span-2" />

          <div className="col-span-2 flex items-center gap-3 sm:col-span-4">
            <button
              type="submit"
              disabled={adding}
              className="rounded-full border border-paper/30 px-5 py-2 transition-colors hover:bg-paper hover:text-ink disabled:opacity-50"
            >
              <span className="field-label text-inherit">{adding ? "Menyimpan…" : "Tambah Tamu"}</span>
            </button>
            <p aria-live="polite" className="text-[0.78rem] font-light">
              {added.status === "error" && <span className="text-[#d98b8b]">{added.message}</span>}
              {added.status === "denied" && (
                <span className="text-[#d98b8b]">Sesi habis. Muat ulang lalu masuk lagi.</span>
              )}
              {added.status === "ok" && <span className="text-paper-dim">{added.message}</span>}
            </p>
          </div>
        </form>

        {guests.length === 0 ? (
          <p className="mt-6 text-[0.8rem] font-light text-paper-dim/70">
            Belum ada tamu. Tamu yang ditambahkan di sini punya link pribadi /to/&lt;slug&gt;.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-[0.78rem] font-light">
              <thead>
                <tr className="field-label border-b border-paper/15 text-paper-dim/70">
                  <th className="py-2 pr-3">Nama</th>
                  <th className="py-2 pr-3">Meja</th>
                  <th className="py-2 pr-3">RSVP</th>
                  <th className="py-2 pr-3">Hadir</th>
                  <th className="py-2">Link</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => (
                  <tr key={g.id} className="border-b border-paper/10">
                    <td className="py-2 pr-3 text-paper">
                      {g.name}
                      {g.groupName && (
                        <span className="block text-[0.7rem] text-paper-dim/60">{g.groupName}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-paper-dim">{g.tableNo ?? "—"}</td>
                    <td className="py-2 pr-3 text-paper-dim">
                      {g.rsvp ? `${g.rsvp.attending} · ${g.rsvp.headcount}` : "—"}
                      <span className="block text-[0.7rem] text-paper-dim/60">{g.seats} kursi</span>
                    </td>
                    <td className="py-2 pr-3">
                      {g.checkedIn ? (
                        <span className="text-gold">✓</span>
                      ) : (
                        <span className="text-paper-dim/40">—</span>
                      )}
                    </td>
                    <td className="py-2">
                      <a
                        href={`/to/${g.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[0.72rem] text-paper-dim underline decoration-paper/25 underline-offset-2 hover:text-gold"
                      >
                        /to/{g.slug}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  required,
  defaultValue,
  className = "",
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        autoComplete="off"
        className="mt-1.5 w-full border-b border-paper/25 bg-transparent pb-1.5 font-light text-paper outline-none focus:border-gold"
      />
    </div>
  );
}
