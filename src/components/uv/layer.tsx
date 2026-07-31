"use client";

import type { ReactNode } from "react";
import { wedding } from "@/config/wedding";
import { IkatField } from "@/components/tenun/ikat";
import { TenunEmblem } from "@/components/tenun/emblem";
import { useSerial } from "@/components/passport/serial";
import { seeded } from "@/lib/seeded";

/**
 * Lapisan tersembunyi satu permukaan — yang hanya terbaca di bawah lampu UV.
 *
 * Dipasang sebagai anak TERAKHIR dari permukaan yang punya rahasia (halaman
 * kertas, kartu penutup), karena urutannya menentukan segalanya: pemadam harus
 * jatuh di atas isi halaman, dan tinta pendar harus jatuh di atas pemadam.
 * Selama lampu mati, keduanya `opacity: 0` dan tidak ada satu piksel pun yang
 * berubah — lihat aturan `.uv-*` di globals.css.
 *
 * Seluruh isinya deterministik — serat pengaman memakai RNG berbenih, bukan
 * `Math.random()` — jadi susunannya sama persis di server dan di peramban, dan
 * tidak ada satu pun keadaan yang perlu disimpan maupun dihitung ulang setelah
 * gambarnya jadi.
 */
export function UvLayer({
  /** Warna dasar permukaannya, dipakai memilih kepekatan pemadam. */
  tone = "paper",
  /** Benih serat pengaman. Beda per halaman, supaya tak ada dua yang kembar. */
  seed = 11,
  /** Rahasia khusus halaman ini, digambar di atas motif dan segel. */
  children,
}: {
  tone?: "paper" | "cover";
  seed?: number;
  children?: ReactNode;
}) {
  const serial = useSerial();

  return (
    <>
      <div
        aria-hidden
        className="uv-blackout"
        // Sampul navy sudah gelap; memadamkannya sekuat kertas gading membuat
        // kartunya lenyap sama sekali dan tinta pendarnya seolah melayang.
        style={tone === "cover" ? { background: "rgba(9,6,24,0.88)" } : undefined}
      />

      <div aria-hidden className="uv-ink absolute inset-0 overflow-hidden">
        {/* Serat pengaman: benang pendek berpendar yang ditaburkan ke dalam
            bubur kertas. Di kertas asli letaknya memang acak — itu justru
            bagian dari pengamanannya, karena tak ada dua lembar yang sama. */}
        <UvFibers seed={seed} />

        {/* Motif tenun yang sama, sekarang menyala. Bukan motif baru: yang
            membuat ini terasa seperti lapisan KEDUA dari dokumen yang sama,
            bukan gambar lain yang ditempel, adalah karena tamu mengenalinya. */}
        <IkatField
          color="var(--color-uv-glow)"
          opacity={0.22}
          scale={1.35}
          className="h-full w-full"
        />

        {/* Segel besar di tengah — lambang yang di permukaan hanya samar. */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <TenunEmblem
            className="uv-glow text-[var(--color-uv-glow-2)] opacity-80"
            size={132}
          />
          <p className="uv-micro uv-glow text-[var(--color-uv-glow)] opacity-90">
            {wedding.uv.seal}
          </p>
        </div>

        {children}

        {/* Cetakan mikro di kepala dan kaki halaman. */}
        <MicroRule className="top-1.5" seed={seed} serial={serial} />
        <MicroRule className="bottom-1.5" seed={seed} serial={serial} />

        {/* Nomor dokumen, dicetak tegak di tepi kanan seperti nomor perforasi
            paspor. */}
        <p
          className="uv-micro absolute top-1/2 right-1 text-[var(--color-uv-glow-3)] opacity-70"
          style={{ transform: "translateY(-50%) rotate(90deg)", transformOrigin: "center" }}
        >
          No. {serial}
        </p>
      </div>
    </>
  );
}

/** Satu baris cetakan mikro yang diulang sampai selebar halaman. */
function MicroRule({
  className = "",
  seed,
  serial,
}: {
  className?: string;
  seed: number;
  serial: string;
}) {
  const unit = `${wedding.couple.groom.name} · ${wedding.couple.bride.name} · ${serial} · `;
  return (
    <p
      className={`uv-micro absolute inset-x-1 text-[var(--color-uv-glow)] opacity-55 ${className}`}
      // Digeser sedikit per-halaman supaya barisnya tidak pernah putus di kata
      // yang sama dua kali — kalau seragam, mata langsung menangkapnya sebagai
      // teks yang diulang, bukan sebagai cetakan.
      style={{ textIndent: `-${(seed % 7) * 0.6}rem` }}
    >
      {unit.repeat(14)}
    </p>
  );
}

/**
 * Serat pengaman kertas.
 *
 * Digambar di dalam viewBox 100×100 dengan `preserveAspectRatio="none"`, jadi
 * seratnya ikut teregang mengikuti bentuk halaman — yang justru benar: serat
 * tersebar per satuan LUAS, bukan per satuan panjang. Ketebalan garisnya
 * dijaga tetap oleh `vectorEffect`, kalau tidak serat di halaman tinggi akan
 * jadi pita gemuk.
 */
function UvFibers({ seed, count = 30 }: { seed: number; count?: number }) {
  const rnd = seeded(seed);
  const colors = [
    "var(--color-uv-glow)",
    "var(--color-uv-glow-2)",
    "var(--color-uv-glow-3)",
  ];

  const fibers = Array.from({ length: count }, () => {
    const x = rnd() * 100;
    const y = rnd() * 100;
    const len = 2.5 + rnd() * 6;
    const angle = rnd() * Math.PI * 2;
    // Sedikit melengkung, karena serat yang benar-benar jatuh ke bubur kertas
    // tidak pernah lurus. Titik kendalinya digeser tegak lurus terhadap arah
    // seratnya.
    const bend = (rnd() - 0.5) * 3;
    const dx = Math.cos(angle) * len;
    const dy = Math.sin(angle) * len;
    return {
      d: `M ${x.toFixed(2)} ${y.toFixed(2)} q ${(dx / 2 - Math.sin(angle) * bend).toFixed(2)} ${(dy / 2 + Math.cos(angle) * bend).toFixed(2)} ${dx.toFixed(2)} ${dy.toFixed(2)}`,
      color: colors[Math.floor(rnd() * colors.length)],
      opacity: 0.3 + rnd() * 0.45,
    };
  });

  return (
    <svg
      aria-hidden
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      fill="none"
    >
      {fibers.map((f, i) => (
        <path
          key={i}
          d={f.d}
          stroke={f.color}
          strokeOpacity={f.opacity}
          strokeWidth={0.9}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
