"use client";

import { useState, useTransition } from "react";
import { liveEnabled, supabaseBrowser } from "@/lib/supabase/client";
import {
  deleteTrack,
  listTracks,
  recordTrack,
  requestTrackUpload,
  setActiveTrack,
  type AdminTrack,
  type MusicResult,
  type TrackList,
} from "@/lib/actions/music";

/**
 * Musik latar — panel panitia.
 *
 * Unggahnya tiga langkah, sama seperti photo wall: minta tiket ke server →
 * unggah langsung ke bucket dengan tiket itu → catat barisnya. Karena path
 * baru diketahui setelah langkah pertama, `useActionState` tidak dipakai di
 * sini (`.bind()` harus sudah jadi sebelum form dirender).
 *
 * Pratinjaunya memakai `<audio controls>` bawaan peramban, bukan pemutar
 * buatan sendiri. Ini layar kerja, bukan undangan — panitia butuh bisa
 * menggeser ke menit ke-2 untuk memastikan lagunya benar, dan kontrol bawaan
 * sudah melakukan itu dengan aksesibilitas yang tidak perlu ditulis ulang.
 */

type State =
  | { status: "idle" }
  | { status: "busy"; step: string }
  | { status: "done"; message: string }
  | { status: "error"; message: string };

const MAX_MB = 20;

export function MusicPanel({ initial }: { initial: TrackList }) {
  const [tracks, setTracks] = useState(initial.tracks);
  const [ready] = useState(initial.ready);
  const [state, setState] = useState<State>({ status: "idle" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startRefresh] = useTransition();

  const active = tracks.find((t) => t.active) ?? null;

  function refresh() {
    startRefresh(() => {
      listTracks().then((res) => setTracks(res.tracks));
    });
  }

  /** Terjemahkan hasil action jadi pesan, dan segarkan daftar kalau berhasil. */
  function settle(res: MusicResult, done: string) {
    if (res.status === "denied") {
      return setState({ status: "error", message: "Sesi habis. Muat ulang lalu masuk lagi." });
    }
    if (res.status === "error") return setState({ status: "error", message: res.message });
    setState({ status: "done", message: res.message ?? done });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return setState({ status: "error", message: "Pilih berkas lagunya dulu." });
    }

    // Berkasnya naik langsung ke bucket, tidak lewat Server Action — jadi ia
    // tidak boleh ikut di FormData yang dikirim ke `recordTrack`. Tanpa baris
    // ini, lagu 6 MB melintasi jaringan dua kali.
    fd.delete("file");

    setState({ status: "busy", step: "Menyiapkan…" });
    const ticket = await requestTrackUpload(file.type, file.size);

    if (ticket.status === "denied") {
      return setState({ status: "error", message: "Sesi habis. Muat ulang lalu masuk lagi." });
    }
    if (ticket.status === "error") {
      return setState({ status: "error", message: ticket.message });
    }

    setState({ status: "busy", step: "Mengunggah…" });
    if (!liveEnabled) {
      return setState({ status: "error", message: "Env Supabase di peramban belum terisi." });
    }

    const { error } = await supabaseBrowser().storage
      .from("music")
      .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });

    if (error) {
      return setState({
        status: "error",
        message: `Unggahan gagal (${error.message}). Cek ukuran & formatnya.`,
      });
    }

    setState({ status: "busy", step: "Menyimpan…" });
    const res = await recordTrack(ticket.path, fd);
    settle(res, "Lagu tersimpan.");

    if (res.status === "ok") {
      form.reset();
      refresh();
    }
  }

  async function choose(id: string | null) {
    setBusyId(id ?? "off");
    const res = await setActiveTrack(id);
    setBusyId(null);
    settle(res, "Tersimpan.");

    // Ditandai lokal supaya tidak menunggu bolak-balik jaringan; indeks unik
    // parsial di database yang memastikan cuma satu yang aktif.
    if (res.status === "ok") {
      setTracks((prev) => prev.map((t) => ({ ...t, active: t.id === id })));
    }
  }

  async function remove(track: AdminTrack) {
    setBusyId(track.id);
    const res = await deleteTrack(track.id);
    setBusyId(null);
    settle(res, "Lagu dihapus.");

    if (res.status === "ok") setTracks((prev) => prev.filter((t) => t.id !== track.id));
  }

  const busy = state.status === "busy";

  return (
    <section className="mt-12 border-t border-paper/15 pt-8">
      <h2 className="field-label text-gold">Musik latar</h2>

      {!ready ? (
        <p className="mt-3 text-[0.8rem] leading-relaxed font-light text-[#d98b8b]">
          Tabel <code className="font-mono">tracks</code> belum ada di database.
          Jalankan ulang <code className="font-mono">supabase/schema.sql</code> di
          Supabase → SQL Editor, lalu muat ulang halaman ini.
        </p>
      ) : (
        <>
          <p className="mt-3 text-[0.8rem] leading-relaxed font-light text-paper-dim/80">
            {active ? (
              <>
                Sedang diputar di undangan:{" "}
                <span className="text-paper">{active.title || "tanpa judul"}</span>
                {active.artist && <span className="text-paper-dim"> — {active.artist}</span>}
              </>
            ) : (
              "Belum ada lagu yang aktif. Undangan tampil tanpa musik sampai salah satu dipakai."
            )}
          </p>

          <form onSubmit={onSubmit} className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="m-file" className="field-label">
                Berkas lagu (maks. {MAX_MB} MB)
              </label>
              <input
                id="m-file"
                name="file"
                type="file"
                accept="audio/*"
                className="mt-1.5 w-full text-[0.78rem] font-light text-paper-dim file:mr-3 file:border file:border-paper/25 file:bg-transparent file:px-3 file:py-1.5 file:text-[0.7rem] file:tracking-[0.14em] file:text-paper file:uppercase hover:file:bg-paper hover:file:text-ink"
              />
            </div>

            <div>
              <label htmlFor="m-title" className="field-label">
                Judul
              </label>
              <input
                id="m-title"
                name="title"
                autoComplete="off"
                className="mt-1.5 w-full border-b border-paper/25 bg-transparent pb-1.5 font-light text-paper outline-none focus:border-gold"
              />
            </div>

            <div>
              <label htmlFor="m-artist" className="field-label">
                Penyanyi
              </label>
              <input
                id="m-artist"
                name="artist"
                autoComplete="off"
                className="mt-1.5 w-full border-b border-paper/25 bg-transparent pb-1.5 font-light text-paper outline-none focus:border-gold"
              />
            </div>

            <div className="flex items-center gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-full border border-paper/30 px-5 py-2 transition-colors hover:bg-paper hover:text-ink disabled:opacity-50"
              >
                <span className="field-label text-inherit">
                  {busy ? state.step : "Unggah & Pakai"}
                </span>
              </button>

              {tracks.length > 0 && active && (
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => choose(null)}
                  className="field-label text-paper-dim hover:text-paper disabled:opacity-40"
                >
                  Matikan musik
                </button>
              )}
            </div>
          </form>

          <p aria-live="polite" className="min-h-[1.4rem] pt-2 text-[0.78rem] font-light">
            {state.status === "error" && <span className="text-[#d98b8b]">{state.message}</span>}
            {state.status === "done" && <span className="text-paper-dim">{state.message}</span>}
          </p>

          {tracks.length === 0 ? (
            <p className="mt-2 text-[0.8rem] font-light text-paper-dim/70">
              Belum ada lagu yang diunggah.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-paper/10">
              {tracks.map((t) => (
                <li key={t.id} className="py-3">
                  <div className="flex items-baseline gap-3">
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => choose(t.active ? null : t.id)}
                      aria-pressed={t.active}
                      title={t.active ? "Matikan musik latar" : "Pakai lagu ini"}
                      className={`field-label shrink-0 border px-2 py-1 disabled:opacity-40 ${
                        t.active
                          ? "border-gold/40 text-gold"
                          : "border-paper/25 text-paper-dim hover:bg-paper hover:text-ink"
                      }`}
                    >
                      {t.active ? "✓ Dipakai" : "Pakai"}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="text-[0.85rem] leading-snug font-light break-words text-paper">
                        {t.title || <span className="text-paper-dim/60">tanpa judul</span>}
                        {t.artist && <span className="text-paper-dim"> — {t.artist}</span>}
                      </p>
                      <p className="field-label mt-0.5 text-paper-dim/70">
                        {(t.bytes / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => remove(t)}
                      className="field-label shrink-0 border border-[#d98b8b]/40 px-2 py-1 text-[#d98b8b] hover:bg-[#d98b8b] hover:text-ink disabled:opacity-40"
                    >
                      Hapus
                    </button>
                  </div>

                  <audio src={t.url} controls preload="none" className="mt-2 h-8 w-full" />
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={refresh}
            className="field-label mt-4 text-paper-dim hover:text-paper"
          >
            Muat ulang daftar lagu latar
          </button>
        </>
      )}
    </section>
  );
}
