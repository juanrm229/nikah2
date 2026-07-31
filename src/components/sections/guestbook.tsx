"use client";

import { useActionState, useEffect, useState } from "react";
import { Heading } from "@/components/passport/page";
import { Reveal } from "@/components/motion/reveal";
import { IkatField } from "@/components/tenun/ikat";
import { submitWish, type PublicWish, type WishResult } from "@/lib/actions/wishes";
import { liveEnabled, supabaseBrowser } from "@/lib/supabase/client";
import { HONEYPOT } from "@/lib/validate";

/**
 * Buku tamu — ucapan sebagai label bagasi yang menggantung.
 *
 * Tulisannya lewat Server Action (service role), tapi BACAANNYA lewat anon key
 * langsung dari peramban. Itu disengaja: feed ini perlu mendengar Realtime,
 * dan policy "anon read approved wishes" memang dibuat untuk keperluan ini.
 * Dengan begitu section ini tetap bisa hidup di dalam <Invitation> yang sudah
 * berupa Client Component, tanpa harus membongkar susunannya.
 */

const INITIAL: WishResult = { status: "idle" };
const FEED_LIMIT = 24;

export function Guestbook({
  slug = null,
  guestName,
}: {
  slug?: string | null;
  guestName?: string | null;
}) {
  const [result, formAction, pending] = useActionState(submitWish.bind(null, slug), INITIAL);
  const [wishes, setWishes] = useState<PublicWish[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!liveEnabled) return;
    const supabase = supabaseBrowser();
    let alive = true;

    /** Sisipkan tanpa duplikat — satu ucapan bisa datang dua kali: sebagai
     *  nilai balik Server Action DAN sebagai dorongan Realtime. */
    const merge = (incoming: PublicWish[]) =>
      setWishes((prev) => {
        const seen = new Set(prev.map((w) => w.id));
        const fresh = incoming.filter((w) => !seen.has(w.id));
        if (!fresh.length) return prev;
        return [...fresh, ...prev].slice(0, FEED_LIMIT);
      });

    supabase
      .from("wishes")
      .select("id, name, message, created_at")
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(FEED_LIMIT)
      .then(({ data }) => {
        if (!alive) return;
        if (data) setWishes(data as PublicWish[]);
        setLoaded(true);
      });

    const channel = supabase
      .channel("wishes-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wishes" },
        (payload) => {
          if (!alive) return;
          const row = payload.new as PublicWish & { approved?: boolean };
          if (row.approved === false) return;
          merge([{ id: row.id, name: row.name, message: row.message, created_at: row.created_at }]);
        },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Ucapan yang baru dikirim langsung ditempel, tanpa menunggu Realtime —
  // supaya tamu melihat tulisannya sendiri seketika di jaringan yang lambat.
  const own = result.status === "ok" && result.wish.id !== "honeypot" ? result.wish : null;
  const feed = own && !wishes.some((w) => w.id === own.id) ? [own, ...wishes] : wishes;

  if (!liveEnabled) return null;

  return (
    <section id="ucapan" className="relative overflow-hidden py-[clamp(4rem,12vh,7rem)]">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <IkatField color="var(--color-paper)" opacity={0.05} scale={2.2} className="h-full w-full" />
      </div>

      <div className="mx-auto w-full max-w-md px-5">
        <Reveal>
          <Heading label="Buku Tamu" title="Titipkan Ucapan" tone="paper" />
        </Reveal>

        <Reveal delay={80} className="relative mt-8">
          <form action={formAction} className="space-y-4">
            <div aria-hidden className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="wish-hp">Alamat web</label>
              <input id="wish-hp" name={HONEYPOT} type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <div>
              <label htmlFor="wish-name" className="field-label">
                Nama
              </label>
              <input
                id="wish-name"
                name="name"
                type="text"
                required
                maxLength={60}
                defaultValue={guestName ?? ""}
                autoComplete="name"
                className="mt-2 w-full border-b border-paper/25 bg-transparent pb-1.5 font-light text-paper outline-none placeholder:text-paper-dim/50 focus:border-gold"
              />
            </div>

            <div>
              <label htmlFor="wish-message" className="field-label">
                Ucapan & doa
              </label>
              <textarea
                id="wish-message"
                name="message"
                required
                rows={3}
                maxLength={500}
                className="mt-2 w-full resize-none border-b border-paper/25 bg-transparent pb-1.5 font-light leading-relaxed text-paper outline-none placeholder:text-paper-dim/50 focus:border-gold"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={pending}
                className="rounded-full border border-paper/30 px-5 py-2 transition-colors hover:bg-paper hover:text-ink disabled:opacity-50"
              >
                <span className="field-label text-inherit">
                  {pending ? "Mengirim…" : "Gantungkan"}
                </span>
              </button>
            </div>

            <p aria-live="polite" className="min-h-[1.25rem] text-[0.78rem] font-light">
              {result.status === "error" && (
                <span className="text-[#d98b8b]">{result.message}</span>
              )}
              {result.status === "ok" && (
                <span className="text-paper-dim">Terima kasih — ucapanmu sudah tergantung.</span>
              )}
            </p>
          </form>
        </Reveal>

        {/* Feed */}
        <div className="mt-12">
          {feed.length === 0 ? (
            <p className="text-center text-[0.8rem] font-light text-paper-dim/70">
              {loaded ? "Belum ada ucapan. Jadilah yang pertama." : "Memuat ucapan…"}
            </p>
          ) : (
            <ul className="columns-2 gap-3 [column-fill:_balance]">
              {feed.map((w, i) => (
                <LuggageTag key={w.id} wish={w} index={i} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Posisi lubang tali, dalam persen lebar kartu. Dipakai bertiga sekaligus —
 * lubangnya, talinya, dan poros ayunannya — dan ketiganya HARUS satu angka:
 * tali yang masuk ke sisi lain lubang, atau kartu yang berayun dari titik yang
 * bukan tempatnya digantung, langsung membatalkan seluruh ilusinya.
 */
const HOLE_X = "22%";
/** Jarak pusat lubang dari tepi atas kartu, dalam piksel. */
const HOLE_Y = 11;
/** Tinggi tali yang terlihat di atas kartu, dalam piksel. */
const CORD_H = 17;

/** Satu label bagasi: tali & lubang di kiri atas, kartu gading, teks ucapan. */
function LuggageTag({ wish, index }: { wish: PublicWish; index: number }) {
  // Angka tetap yang diturunkan dari indeks, bukan acak — hasil render server
  // dan klien harus sama, dan tag tidak boleh berpindah tiap kali daftar
  // diperbarui oleh Realtime.
  const tilt = [-2.4, 1.8, -1.2, 2.6, -3, 1.1][index % 6];
  const dur = [5.2, 6.4, 4.8, 7.1, 5.9, 6.8][index % 6];
  const delay = [0, 0.7, 1.4, 0.35, 1.05, 1.75][index % 6];

  return (
    <li className="relative mb-3 break-inside-avoid" style={{ paddingTop: CORD_H }}>
      {/* Tali gantungannya.
          Kartunya sudah lama punya lubang tali, tapi tidak pernah punya
          talinya — dan lubang yang tidak dilewati apa pun tidak terbaca
          sebagai label bagasi, melainkan sebagai stiker yang kebetulan
          berbintik hitam di pojok.

          Talinya sengaja DI LUAR elemen yang berayun. Yang bergoyang adalah
          kartu yang tergantung, bukan tali yang menggantungnya; kalau
          keduanya ikut berputar, yang terlihat adalah satu benda kaku yang
          dimiringkan bolak-balik. */}
      <span
        aria-hidden
        className="absolute top-0 z-10 -translate-x-1/2"
        style={{ left: HOLE_X }}
      >
        {/* Talinya digambar lebih panjang daripada celah di atas kartu, dan
            berhenti tepat di TEPI lubang — bukan di tepi kartu. Yang berhenti
            di tepi kartu terbaca sebagai tali yang putus sebelum sampai, dan
            lubang di bawahnya kembali jadi bintik yang berdiri sendiri.
            Karena kotaknya `absolute`, tinggi berlebih ini tidak menambah
            tinggi baris — yang mengatur celah tetap `paddingTop` di <li>. */}
        <svg width="14" height={CORD_H + HOLE_Y} viewBox="0 0 14 28" fill="none">
          <circle
            cx="7"
            cy="5"
            r="4"
            stroke="var(--color-paper)"
            strokeOpacity="0.32"
            strokeWidth="1.1"
          />
          <path
            d="M7 9 V23"
            stroke="var(--color-paper)"
            strokeOpacity="0.32"
            strokeWidth="1.1"
          />
        </svg>
      </span>

      <div
        className="animate-sway grain relative rounded-[3px] bg-paper-2 px-3.5 pt-5 pb-3 text-ink shadow-[0_14px_26px_-14px_rgba(0,0,0,0.75)]"
        style={
          {
            "--sway-a": `${tilt - 1.1}deg`,
            "--sway-b": `${tilt + 1.1}deg`,
            "--sway-dur": `${dur}s`,
            "--sway-delay": `${delay}s`,
            "--sway-origin": `${HOLE_X} ${HOLE_Y}px`,
          } as React.CSSProperties
        }
      >
        <div className="grain-layer" />

        {/* Lubang tali, benar-benar dilubangi ke latar gelap di belakangnya */}
        <span
          aria-hidden
          className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink/25 bg-ink"
          style={{ left: HOLE_X, top: HOLE_Y }}
        />

        <p className="text-[0.8rem] leading-snug font-light break-words text-ink-2">
          {wish.message}
        </p>
        <p className="field-label mt-2.5 border-t border-ink/15 pt-2 text-ink-soft/80">
          {wish.name}
        </p>
      </div>
    </li>
  );
}
