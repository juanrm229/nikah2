"use client";

import { useRef, useState } from "react";
import { PassportPage, Heading } from "@/components/passport/page";
import { Reveal } from "@/components/motion/reveal";
import { submitSong, type SentSong } from "@/lib/actions/songs";
import { liveEnabled } from "@/lib/supabase/client";
import { HONEYPOT } from "@/lib/validate";

/**
 * Request lagu — hiburan dalam kabin.
 *
 * Submit-nya ditangani sendiri, bukan `useActionState`, karena tamu boleh
 * mengirim beberapa lagu dan daftar kirimannya harus MENUMPUK. `useActionState`
 * hanya menyimpan hasil terakhir, jadi menumpuknya butuh effect yang menyalin
 * hasil ke state — dan `react-hooks/set-state-in-effect` melarang itu.
 *
 * Daftar yang tampil di sini hanya lagu yang dikirim dari peramban ini, bukan
 * daftar seluruh tamu: tabel `songs` tidak bisa dibaca anon, dan itu disengaja
 * (lihat lib/actions/songs.ts).
 */

type State =
  | { status: "idle" }
  | { status: "busy" }
  | { status: "ok" }
  | { status: "error"; message: string };

export function Songs({
  slug = null,
  guestName,
}: {
  slug?: string | null;
  guestName?: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<State>({ status: "idle" });
  const [sent, setSent] = useState<SentSong[]>([]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    setState({ status: "busy" });
    const result = await submitSong(slug, { status: "idle" }, fd);

    if (result.status === "error") return setState({ status: "error", message: result.message });
    if (result.status !== "ok") return setState({ status: "idle" });

    setState({ status: "ok" });
    setSent((prev) => [...prev, result.song]);

    // Judul & penyanyi dikosongkan, tapi nama pengirim dibiarkan — tamu yang
    // request tiga lagu tidak perlu menulis namanya tiga kali.
    form.querySelectorAll<HTMLInputElement>('input[data-clear="1"]').forEach((el) => {
      el.value = "";
    });
    form.querySelector<HTMLInputElement>('input[name="title"]')?.focus();
  }

  if (!liveEnabled) return null;

  const busy = state.status === "busy";

  return (
    <PassportPage id="lagu" label="Hiburan Dalam Kabin" page="Hal. 07">
      <Heading label="Permintaan Lagu" title="Daftar Putar Kabin" />

      <Reveal delay={80} className="mt-8">
        <p className="text-center text-[0.82rem] leading-relaxed font-light text-ink-soft">
          Ada lagu yang ingin kamu dengar saat resepsi? Titipkan judulnya —
          akan kami sampaikan ke pemain musik.
        </p>

        <form ref={formRef} onSubmit={onSubmit} className="relative mt-7 space-y-5">
          {/* Jebakan bot: di luar layar, tak terjangkau Tab maupun pembaca layar. */}
          <div aria-hidden className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="song-hp">Alamat web</label>
            <input id="song-hp" name={HONEYPOT} type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <Field label="Judul lagu" htmlFor="song-title">
            <input
              id="song-title"
              name="title"
              type="text"
              required
              maxLength={120}
              data-clear="1"
              autoComplete="off"
              className="w-full border-b border-ink/25 bg-transparent pb-1.5 font-light text-ink outline-none placeholder:text-ink-soft/45 focus:border-gold-3"
            />
          </Field>

          <Field label="Penyanyi (opsional)" htmlFor="song-artist">
            <input
              id="song-artist"
              name="artist"
              type="text"
              maxLength={120}
              data-clear="1"
              autoComplete="off"
              className="w-full border-b border-ink/25 bg-transparent pb-1.5 font-light text-ink outline-none placeholder:text-ink-soft/45 focus:border-gold-3"
            />
          </Field>

          <Field label="Dari (opsional)" htmlFor="song-requester">
            <input
              id="song-requester"
              name="requester"
              type="text"
              maxLength={60}
              defaultValue={guestName ?? ""}
              autoComplete="name"
              className="w-full border-b border-ink/25 bg-transparent pb-1.5 font-light text-ink outline-none placeholder:text-ink-soft/45 focus:border-gold-3"
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full border border-ink/30 px-5 py-2 transition-colors hover:bg-ink hover:text-paper disabled:opacity-50"
            >
              <span className="field-label text-inherit">
                {busy ? "Mengirim…" : sent.length ? "Request Lagi" : "Kirim Request"}
              </span>
            </button>
          </div>

          <p aria-live="polite" className="min-h-[1.25rem] text-[0.78rem] font-light">
            {state.status === "error" && (
              <span className="text-[var(--color-stamp-red)]">{state.message}</span>
            )}
            {state.status === "ok" && (
              <span className="text-ink-soft">Sudah masuk daftar putar. Terima kasih.</span>
            )}
          </p>
        </form>

        {sent.length > 0 && <Playlist songs={sent} />}
      </Reveal>
    </PassportPage>
  );
}

/**
 * Lagu yang dikirim dari peramban ini, ditulis seperti daftar trek di kartu
 * hiburan pesawat. Sengaja tidak bisa dihapus: barisnya sudah ada di database,
 * jadi tombol hapus di sini akan berbohong.
 */
function Playlist({ songs }: { songs: SentSong[] }) {
  return (
    <div className="mt-9 border-t border-dashed border-ink/25 pt-6">
      <p className="field-label text-ink-soft/75">Titipanmu</p>
      <ol className="mt-3 space-y-2.5">
        {songs.map((s, i) => (
          <li key={`${s.id}-${i}`} className="flex items-baseline gap-3">
            <span className="font-mono text-[0.7rem] text-gold-3">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 text-[0.88rem] leading-snug font-light text-ink">
              {s.title}
              {s.artist && <span className="text-ink-soft"> — {s.artist}</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
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
