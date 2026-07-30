/**
 * Motif tenun ikat, digambar sebagai geometri SVG — bukan foto kain.
 *
 * Motifnya diturunkan dari kain yang dipakai mempelai di foto: kolom panah
 * (tumpal) hitam-putih, belah ketupat kecil di antaranya, dan garis-garis
 * pendek melintang yang meniru "blur" khas benang ikat.
 *
 * Semua ukuran dalam satuan tile. Tile default 48×64 dan bisa diubah skalanya
 * lewat prop `scale` tanpa merusak ketebalan garis.
 */

const TILE_W = 48;
const TILE_H = 64;

/** Panah/tumpal: chevron bertumpuk dengan batang di tengah. */
function arrowPath(cx: number, cy: number, w: number, h: number) {
  const hw = w / 2;
  const hh = h / 2;
  return [
    `M ${cx - hw} ${cy + hh}`,
    `L ${cx} ${cy - hh}`,
    `L ${cx + hw} ${cy + hh}`,
  ].join(" ");
}

/** Belah ketupat kecil. */
function diamondPath(cx: number, cy: number, r: number) {
  return `M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z`;
}

/**
 * Garis-garis pendek yang membuat tepi motif terlihat "kabur" —
 * inilah yang membedakan ikat dari batik cetak.
 */
function featherTicks(cx: number, cy: number, w: number, rows: number, gap: number) {
  const out: Array<[number, number, number, number]> = [];
  for (let i = 0; i < rows; i++) {
    const y = cy + i * gap;
    const half = w / 2 - i * 1.1;
    if (half <= 1) break;
    out.push([cx - half, y, cx - half + 2.4, y]);
    out.push([cx + half - 2.4, y, cx + half, y]);
  }
  return out;
}

type IkatPatternProps = {
  id: string;
  /** Warna motif. Default gading kertas. */
  color?: string;
  /** Pengali ukuran tile. 1 = 48×64. */
  scale?: number;
  /** Ketebalan garis dalam satuan tile. */
  weight?: number;
};

/**
 * Definisi <pattern> yang bisa dirujuk lewat fill="url(#id)".
 * Taruh di dalam <defs> sebuah SVG, atau pakai lewat <IkatField>/<IkatBand>.
 */
export function IkatPattern({
  id,
  color = "var(--color-paper)",
  scale = 1,
  weight = 2,
}: IkatPatternProps) {
  const ticksTop = featherTicks(TILE_W / 2, 6, 18, 4, 2.6);
  const ticksBottom = featherTicks(TILE_W / 2, TILE_H - 14, 18, 4, 2.6);

  return (
    <pattern
      id={id}
      width={TILE_W * scale}
      height={TILE_H * scale}
      patternUnits="userSpaceOnUse"
      viewBox={`0 0 ${TILE_W} ${TILE_H}`}
    >
      <g
        stroke={color}
        strokeWidth={weight}
        fill="none"
        strokeLinecap="square"
        vectorEffect="non-scaling-stroke"
      >
        {/* Kolom panah utama, dua arah berlawanan */}
        <path d={arrowPath(TILE_W / 2, 14, 26, 16)} />
        <path d={arrowPath(TILE_W / 2, 22, 26, 16)} />
        <path
          d={arrowPath(TILE_W / 2, TILE_H - 14, 26, 16)}
          transform={`rotate(180 ${TILE_W / 2} ${TILE_H - 14})`}
        />
        <path
          d={arrowPath(TILE_W / 2, TILE_H - 22, 26, 16)}
          transform={`rotate(180 ${TILE_W / 2} ${TILE_H - 22})`}
        />

        {/* Belah ketupat di pinggang tile */}
        <path d={diamondPath(TILE_W / 2, TILE_H / 2, 5)} fill={color} />
        <path d={diamondPath(0, TILE_H / 2, 3.5)} fill={color} />
        <path d={diamondPath(TILE_W, TILE_H / 2, 3.5)} fill={color} />

        {/* Benang pengunci di tepi kiri-kanan tile */}
        <path d={`M 2 0 L 2 ${TILE_H}`} strokeWidth={weight * 0.6} />
        <path d={`M ${TILE_W - 2} 0 L ${TILE_W - 2} ${TILE_H}`} strokeWidth={weight * 0.6} />

        {/* Kabur khas ikat */}
        <g strokeWidth={weight * 0.75} opacity={0.85}>
          {[...ticksTop, ...ticksBottom].map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
          ))}
        </g>
      </g>
    </pattern>
  );
}

type IkatFieldProps = {
  className?: string;
  color?: string;
  scale?: number;
  opacity?: number;
};

/** Latar bermotif tenun, dipakai sebagai lapisan dekoratif full-bleed. */
export function IkatField({
  className,
  color = "var(--color-paper)",
  scale = 1,
  opacity = 0.08,
}: IkatFieldProps) {
  const id = `ikat-field-${scale}`.replace(".", "-");
  return (
    <svg
      aria-hidden
      className={className}
      style={{ opacity }}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <IkatPattern id={id} color={color} scale={scale} />
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

type IkatBandProps = {
  className?: string;
  color?: string;
  /** Tinggi pita dalam piksel. */
  height?: number;
  flip?: boolean;
};

/**
 * Pita tenun horizontal — pemisah antar section, meniru jalur motif
 * yang membelah kain.
 */
export function IkatBand({
  className,
  color = "var(--color-gold)",
  height = 26,
  flip = false,
}: IkatBandProps) {
  const id = `ikat-band-${height}${flip ? "-f" : ""}`;
  return (
    <svg
      aria-hidden
      className={className}
      width="100%"
      height={height}
      viewBox={`0 0 ${TILE_W * 8} ${TILE_H}`}
      preserveAspectRatio="none"
      style={flip ? { transform: "scaleY(-1)" } : undefined}
    >
      <defs>
        <IkatPattern id={id} color={color} weight={2.4} />
      </defs>
      <rect width="100%" height={TILE_H} fill={`url(#${id})`} />
    </svg>
  );
}

/**
 * Satu motif tunggal sebagai ornamen — dipakai di bawah heading,
 * pengganti garis pemisah biasa.
 */
export function IkatOrnament({
  className,
  color = "var(--color-gold)",
  width = 120,
}: {
  className?: string;
  color?: string;
  width?: number;
}) {
  return (
    <svg
      aria-hidden
      className={className}
      width={width}
      height={width * 0.2}
      viewBox="0 0 120 24"
      fill="none"
    >
      <g stroke={color} strokeWidth={1.2} strokeLinecap="square">
        <path d="M0 12 H36" />
        <path d="M84 12 H120" />
        <path d="M48 12 L54 5 L60 12 L66 5 L72 12" />
        <path d="M48 12 L54 19 L60 12 L66 19 L72 12" />
        <path d={diamondPath(42, 12, 3)} fill={color} />
        <path d={diamondPath(78, 12, 3)} fill={color} />
      </g>
    </svg>
  );
}
