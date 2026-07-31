"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { wedding } from "@/config/wedding";
import { Heading } from "@/components/passport/page";
import { Reveal } from "@/components/motion/reveal";
import { IkatBand } from "@/components/tenun/ikat";
import { useParallax } from "@/components/motion/parallax";

/**
 * Galeri — "lembar visa".
 *
 * Foto ditata tidak rata tinggi supaya terbaca sebagai tempelan di halaman
 * paspor, bukan grid produk. Ditekan untuk melihat penuh.
 */
export function Gallery() {
  const [active, setActive] = useState<number | null>(null);
  const photos = wedding.gallery;
  const gridRef = useParallax<HTMLDivElement>(30);

  const close = useCallback(() => setActive(null), []);

  useEffect(() => {
    if (active === null) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setActive((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft")
        setActive((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    };

    // Kunci scroll latar selama lightbox terbuka.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [active, close, photos.length]);

  return (
    <section id="galeri" className="relative px-4 py-[clamp(4rem,12vh,7rem)]">
      <div className="mx-auto w-full max-w-md">
        <Reveal>
          <Heading label="Lembar Visa" title="Jejak Kami" tone="paper" />
        </Reveal>

        <Reveal delay={120} className="mt-10">
          <IkatBand className="w-full opacity-40" height={16} />
        </Reveal>

        <div ref={gridRef} className="mt-6 grid grid-cols-2 gap-3">
          {photos.map((photo, i) => (
            <Reveal
              key={photo.src}
              delay={i * 70}
              className={i % 3 === 0 ? "col-span-2" : undefined}
            >
              <button
                type="button"
                onClick={() => setActive(i)}
                className="group relative block w-full overflow-hidden border border-paper/12"
                aria-label={`Perbesar foto ${i + 1}`}
              >
                <span
                  className={`relative block w-full ${
                    i % 3 === 0 ? "aspect-[4/3]" : "aspect-[3/4]"
                  }`}
                >
                  {/* Dua lapis, dan pembagiannya disengaja: geseran parallax
                      ditulis per-frame ke pembungkus lewat `--py`, sementara
                      pembesaran hover tetap milik <Image> dengan transisi CSS.
                      Kalau keduanya menumpuk di satu elemen, transisi 700 ms
                      itu ikut memperlambat parallax-nya dan gerakannya jadi
                      tertinggal di belakang jari. */}
                  <span
                    data-parallax
                    className="absolute inset-0"
                    style={{ transform: "translate3d(0, var(--py, 0px), 0)" }}
                  >
                    <Image
                      src={photo.src}
                      alt=""
                      fill
                      sizes="(max-width: 448px) 50vw, 224px"
                      style={{ objectPosition: photo.focus }}
                      className="scale-[1.12] object-cover grayscale transition-transform duration-700 group-hover:scale-[1.18]"
                    />
                  </span>
                </span>
                <span className="pointer-events-none absolute inset-0 bg-ink/15 transition-opacity duration-500 group-hover:opacity-0" />
                <span className="field-label pointer-events-none absolute bottom-2 left-2 text-paper/70">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </button>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120} className="mt-6">
          <IkatBand className="w-full opacity-40" height={16} flip />
        </Reveal>
      </div>

      {active !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Foto diperbesar"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/96 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div className="relative h-full w-full max-w-lg">
            <Image
              src={photos[active].src}
              alt=""
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>
          <button
            type="button"
            onClick={close}
            className="absolute top-5 right-5 rounded-full border border-paper/30 px-4 py-2"
            aria-label="Tutup"
          >
            <span className="field-label text-paper">Tutup</span>
          </button>
        </div>
      )}
    </section>
  );
}
