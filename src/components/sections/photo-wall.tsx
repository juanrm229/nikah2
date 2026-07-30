"use client";

import { useEffect, useRef, useState } from "react";
import { Heading } from "@/components/passport/page";
import { Reveal } from "@/components/motion/reveal";
import { IkatField } from "@/components/tenun/ikat";
import {
  recordPhoto,
  requestUpload,
  signedPhotos,
  type SignedPhoto,
} from "@/lib/actions/photos";
import { liveEnabled, supabaseBrowser } from "@/lib/supabase/client";
import { HONEYPOT } from "@/lib/validate";

/**
 * Dinding kenangan — tamu menitipkan foto.
 *
 * Berbeda dari buku tamu: unggahannya BUKAN satu `action={formAction}`, karena
 * satu kiriman butuh tiga langkah yang harus berurutan (minta tiket → unggah ke
 * bucket → catat baris). Jadi submit-nya ditangani sendiri.
 *
 * Bacanya juga tidak lewat anon key seperti buku tamu: bucket "wall" private,
 * jadi URL tampilnya harus ditandatangani server. Realtime tetap dipakai, tapi
 * hanya sebagai aba-aba untuk mengambil ulang daftar bertanda tangan —
 * payload-nya sendiri tidak cukup untuk merender apa pun.
 */

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

type State =
  | { status: "idle" }
  | { status: "busy"; step: string }
  | { status: "ok" }
  | { status: "error"; message: string };

export function PhotoWall({
  slug = null,
  guestName,
}: {
  slug?: string | null;
  guestName?: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<State>({ status: "idle" });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photos, setPhotos] = useState<SignedPhoto[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Pratinjau lokal. Objek URL dibuat saat berkas dipilih — bukan di effect —
  // dan yang lama langsung dicabut supaya foto besar tidak menahan memori
  // setiap kali tamu berganti pilihan.
  const previewRef = useRef<string | null>(null);

  function pick(next: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next ? URL.createObjectURL(next) : null;
    setFile(next);
    setPreview(previewRef.current);
  }

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  useEffect(() => {
    if (!liveEnabled) return;
    let alive = true;

    const refresh = () =>
      signedPhotos().then((rows) => {
        if (!alive) return;
        setPhotos(rows);
        setLoaded(true);
      });

    refresh();

    // INSERT jarang terpakai (foto lahir belum disetujui), UPDATE-lah yang
    // menandai foto baru saja lolos moderasi. Dua-duanya cuma memicu ambil ulang.
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel("photos-wall")
      .on("postgres_changes", { event: "*", schema: "public", table: "photos" }, () => {
        if (alive) refresh();
      })
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!file) return setState({ status: "error", message: "Pilih fotonya dulu ya." });
    if (file.size > MAX_BYTES) {
      return setState({ status: "error", message: "Ukuran foto maksimal 8 MB." });
    }

    // Berkasnya ikut terbawa ke Server Action kalau tidak dibuang — dan itu
    // berarti foto yang sama terkirim dua kali lewat jaringan.
    const fd = new FormData(form);
    fd.delete("file");

    setState({ status: "busy", step: "Menyiapkan…" });
    const ticket = await requestUpload(file.type, file.size);
    if (ticket.status === "error") return setState({ status: "error", message: ticket.message });

    setState({ status: "busy", step: "Mengunggah…" });
    const { error } = await supabaseBrowser()
      .storage.from("wall")
      .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });

    if (error) {
      return setState({ status: "error", message: "Unggahan gagal. Periksa sinyal, lalu coba lagi." });
    }

    setState({ status: "busy", step: "Menyimpan…" });
    const saved = await recordPhoto(slug, ticket.path, fd);
    if (saved.status === "error") return setState({ status: "error", message: saved.message });

    setState({ status: "ok" });
    pick(null);
    formRef.current?.reset();
  }

  if (!liveEnabled) return null;

  const busy = state.status === "busy";

  return (
    <section id="foto" className="relative overflow-hidden py-[clamp(4rem,12vh,7rem)]">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <IkatField color="var(--color-paper)" opacity={0.05} scale={2.6} className="h-full w-full" />
      </div>

      <div className="mx-auto w-full max-w-md px-5">
        <Reveal>
          <Heading label="Dinding Kenangan" title="Titipkan Foto" tone="paper" />
        </Reveal>

        <Reveal delay={80} className="mt-8">
          <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
            <div aria-hidden className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="photo-hp">Alamat web</label>
              <input id="photo-hp" name={HONEYPOT} type="text" tabIndex={-1} autoComplete="off" />
            </div>

            {/* Kotak pilih foto — bingkai film, isinya pratinjau begitu dipilih */}
            <label
              htmlFor="photo-file"
              className="flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-[3px] border border-dashed border-paper/30 bg-paper/[0.03] transition-colors hover:border-gold"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- objek URL lokal, bukan aset yang bisa dioptimalkan
                <img src={preview} alt="Pratinjau foto pilihanmu" className="h-full w-full object-cover" />
              ) : (
                <span className="field-label text-paper-dim/70">Pilih foto</span>
              )}
            </label>
            <input
              id="photo-file"
              name="file"
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={(e) => {
                pick(e.currentTarget.files?.[0] ?? null);
                setState({ status: "idle" });
              }}
            />

            <div>
              <label htmlFor="photo-uploader" className="field-label">
                Nama
              </label>
              <input
                id="photo-uploader"
                name="uploader"
                type="text"
                maxLength={60}
                defaultValue={guestName ?? ""}
                autoComplete="name"
                className="mt-2 w-full border-b border-paper/25 bg-transparent pb-1.5 font-light text-paper outline-none focus:border-gold"
              />
            </div>

            <div>
              <label htmlFor="photo-caption" className="field-label">
                Keterangan <span className="normal-case">(boleh dikosongkan)</span>
              </label>
              <input
                id="photo-caption"
                name="caption"
                type="text"
                maxLength={200}
                className="mt-2 w-full border-b border-paper/25 bg-transparent pb-1.5 font-light text-paper outline-none focus:border-gold"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="rounded-full border border-paper/30 px-5 py-2 transition-colors hover:bg-paper hover:text-ink disabled:opacity-50"
            >
              <span className="field-label text-inherit">
                {busy ? state.step : "Kirim Foto"}
              </span>
            </button>

            <p aria-live="polite" className="min-h-[2.5rem] text-[0.78rem] font-light">
              {state.status === "error" && <span className="text-[#d98b8b]">{state.message}</span>}
              {state.status === "ok" && (
                <span className="text-paper-dim">
                  Terima kasih — fotonya sudah kami terima dan akan tampil setelah diperiksa.
                </span>
              )}
            </p>
          </form>
        </Reveal>

        <div className="mt-10">
          {photos.length === 0 ? (
            <p className="text-center text-[0.8rem] font-light text-paper-dim/70">
              {loaded ? "Belum ada foto yang tayang." : "Memuat foto…"}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              {photos.map((p, i) => (
                <Slide key={p.id} photo={p} index={i} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/** Satu foto sebagai slide film: bingkai gading, keterangan di bibir bawah. */
function Slide({ photo, index }: { photo: SignedPhoto; index: number }) {
  const tilt = [-1.6, 1.2, -0.8, 1.9][index % 4];

  return (
    <li className="break-inside-avoid">
      <figure
        className="grain rounded-[2px] bg-paper-2 p-2 pb-2.5 text-ink shadow-[0_14px_26px_-14px_rgba(0,0,0,0.75)]"
        style={{ transform: `rotate(${tilt}deg)` }}
      >
        <div className="grain-layer" />
        {/* eslint-disable-next-line @next/next/no-img-element -- URL bertanda tangan & berumur pendek, tidak bisa lewat optimizer */}
        <img
          src={photo.url}
          alt={photo.caption ?? `Foto titipan ${photo.uploader ?? "tamu"}`}
          loading="lazy"
          className="aspect-square w-full object-cover"
        />
        <figcaption className="mt-2 px-0.5">
          {photo.caption && (
            <p className="text-[0.72rem] leading-snug font-light break-words text-ink-2">
              {photo.caption}
            </p>
          )}
          {photo.uploader && (
            <p className="field-label mt-1 text-ink-soft/80">{photo.uploader}</p>
          )}
        </figcaption>
      </figure>
    </li>
  );
}
