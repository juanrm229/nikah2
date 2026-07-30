"use client";

import { useEffect, useState } from "react";
import { SplitFlapText } from "@/components/passport/split-flap";
import { IkatField } from "@/components/tenun/ikat";
import { liveFeed, type LiveFeed } from "@/lib/actions/live";
import { formatTimeInEventZone } from "@/lib/datetime";
import { MAIN_DATE, wedding } from "@/config/wedding";

/**
 * Layar venue. Dipasang di TV/proyektor dan ditinggal menyala.
 *
 * Karena tidak ada yang menungguinya, semua di sini dibuat tahan lama:
 * datanya ditarik berkala (URL foto ikut ditandatangani ulang tiap putaran),
 * dan foto berganti sendiri lewat satu indeks yang berjalan — bukan daftar acak
 * yang bisa mengulang gambar yang sama dua kali berturut-turut.
 */

/** Jeda tarik data. Cukup rapat untuk terasa hidup, cukup jarang untuk 5 jam nyala. */
const POLL_MS = 20_000;

/** Jeda ganti foto sorot. */
const ROTATE_MS = 7_000;

/** Baris kedatangan yang muat di layar tanpa mengecilkan huruf. */
const ROWS = 7;

export function LiveScreen({ initial }: { initial: LiveFeed }) {
  const [feed, setFeed] = useState(initial);
  const [slot, setSlot] = useState(0);

  useEffect(() => {
    let alive = true;
    const id = setInterval(() => {
      liveFeed().then((next) => {
        if (alive) setFeed(next);
      });
    }, POLL_MS);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setSlot((s) => s + 1), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const rows = feed.arrivals.slice(0, ROWS);
  const photo = feed.photos.length ? feed.photos[slot % feed.photos.length] : null;
  const wish = feed.wishes.length ? feed.wishes[slot % feed.wishes.length] : null;

  return (
    // `h-dvh` + `overflow-hidden`, bukan `min-h-dvh`: layar venue tidak punya
    // siapa pun untuk menggulirnya. Apa pun yang tidak muat harus terpotong di
    // dalam panelnya sendiri, bukan mendorong panel lain keluar layar.
    <main className="relative flex h-dvh flex-col overflow-hidden p-[3vmin]">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <IkatField color="var(--color-paper)" opacity={0.04} scale={3.4} className="h-full w-full" />
      </div>

      <header className="flex items-end justify-between border-b border-paper/20 pb-[2vmin]">
        <div>
          <p className="field-label text-gold">Papan Kedatangan</p>
          <h1 className="display mt-[1vmin] text-[clamp(1.6rem,3.4vmin,3rem)] text-paper">
            {wedding.title}
          </h1>
        </div>
        <p className="text-right">
          <span className="display block text-[clamp(2rem,6vmin,5rem)] leading-none text-gold">
            {feed.headcount}
          </span>
          <span className="field-label text-paper-dim">tamu sudah hadir</span>
        </p>
      </header>

      {/* Dua kolom ditentukan orientasi, bukan lebar: layar venue selalu
          mendatar, sedangkan lebar pikselnya bisa apa saja dari 1280 sampai 4K. */}
      <div className="grid min-h-0 flex-1 gap-[3vmin] pt-[2vmin] landscape:grid-cols-[3fr_2fr]">
        {/* ── Kedatangan ──────────────────────────────────────────────── */}
        <section className="min-w-0">
          {rows.length === 0 ? (
            <p className="pt-[6vmin] text-center text-[clamp(0.9rem,2vmin,1.4rem)] font-light text-paper-dim/70">
              Menunggu tamu pertama…
            </p>
          ) : (
            <ul>
              {rows.map((a, i) => (
                <li
                  key={a.id}
                  className="flex items-baseline gap-[2vmin] border-b border-paper/10 py-[1.4vmin]"
                >
                  <span className="font-mono text-[clamp(0.8rem,1.9vmin,1.3rem)] text-paper-dim">
                    {formatTimeInEventZone(a.at, MAIN_DATE)}
                  </span>

                  <span className="min-w-0 flex-1 truncate">
                    <SplitFlapText
                      // Kunci ikut nama: baris yang isinya berganti karena tamu
                      // baru masuk harus memutar ulang papannya, bukan diam.
                      key={a.name}
                      text={a.name}
                      delay={i * 60}
                      className="text-[clamp(0.95rem,2.4vmin,1.8rem)] text-paper"
                    />
                  </span>

                  <span className="field-label whitespace-nowrap text-gold">
                    {a.tableNo ? `Meja ${a.tableNo}` : `${a.headcount} orang`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Foto sorot ──────────────────────────────────────────────── */}
        <section className="flex min-h-0 flex-col">
          {photo ? (
            <figure className="grain flex min-h-0 flex-1 flex-col bg-paper-2 p-[1.2vmin] text-ink">
              <div className="grain-layer" />
              {/* eslint-disable-next-line @next/next/no-img-element -- URL bertanda tangan & berumur pendek, tidak bisa lewat optimizer */}
              <img
                key={photo.id}
                src={photo.url}
                alt={photo.caption ?? `Foto dari ${photo.uploader ?? "tamu"}`}
                className="min-h-0 w-full flex-1 object-cover"
              />
              <figcaption className="pt-[1.2vmin]">
                {photo.caption && (
                  <p className="text-[clamp(0.75rem,1.6vmin,1.1rem)] leading-snug font-light text-ink-2">
                    {photo.caption}
                  </p>
                )}
                <p className="field-label mt-[0.6vmin] text-ink-soft/80">
                  {photo.uploader || "tamu"}
                </p>
              </figcaption>
            </figure>
          ) : (
            <div className="flex flex-1 items-center justify-center border border-dashed border-paper/20">
              <p className="field-label text-paper-dim/60">Belum ada foto</p>
            </div>
          )}
        </section>
      </div>

      {/* ── Ucapan berjalan ──────────────────────────────────────────── */}
      <footer className="border-t border-paper/20 pt-[2vmin]">
        {wish ? (
          <p className="text-[clamp(1rem,2.4vmin,1.9rem)] leading-snug font-light text-paper">
            <span className="line-clamp-2">“{wish.message}”</span>
            <span className="field-label mt-[0.8vmin] block text-gold">— {wish.name}</span>
          </p>
        ) : (
          <p className="field-label text-paper-dim/60">Ucapan tamu akan muncul di sini</p>
        )}
      </footer>
    </main>
  );
}
