/**
 * Lambang undangan — medali tenun.
 *
 * Menggantikan lambang negara pada sampul paspor: cincin konsentris dengan
 * delapan tumpal memancar, belah ketupat di pusat. Dibuat dari geometri,
 * bukan gambar, supaya tajam di semua ukuran layar.
 */

function radial(count: number, radius: number, cx = 60, cy = 60) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius, deg: (i / count) * 360 };
  });
}

/**
 * Keliling tiap bentuk, dipakai sebagai `--dash` saat lambang menggambar
 * dirinya. Satu angka untuk semua bentuk tidak cukup: dengan dasharray yang
 * lebih panjang dari bentuknya, garis pendek selesai jauh lebih cepat dan
 * lambangnya terbaca sebagai beberapa gerakan terpisah, bukan satu tarikan.
 */
const LEN = {
  ring56: 2 * Math.PI * 56,
  ring50: 2 * Math.PI * 50,
  ring26: 2 * Math.PI * 26,
  stem: 10,
  diamond: 4 * Math.SQRT2 * 14,
};

export function TenunEmblem({
  className,
  size = 120,
  color = "currentColor",
  draw = false,
  drawDelay = 0,
}: {
  className?: string;
  size?: number;
  color?: string;
  /**
   * Gambar lambangnya garis demi garis alih-alih menampilkannya utuh.
   * Dipakai di ritual pembuka; di tempat lain lambang harus langsung ada.
   */
  draw?: boolean;
  /** Jeda mulai dalam milidetik, supaya bisa disusun dengan gerakan lain. */
  drawDelay?: number;
}) {
  const spokes = radial(8, 38);
  const dots = radial(16, 52);

  // Garis: dasharray sepanjang bentuknya sendiri, offset penuh, lalu ditarik
  // ke nol. Bentuk berisi tidak punya garis untuk ditarik — ia mengembang.
  const line = (len: number, delay: number) =>
    draw
      ? {
          strokeDasharray: len,
          ["--dash" as string]: len,
          animation: `stroke-draw 1250ms cubic-bezier(0.33,0.9,0.35,1) ${drawDelay + delay}ms both`,
        }
      : undefined;

  const seed = (delay: number) =>
    draw
      ? {
          animation: `seed-in 520ms cubic-bezier(0.16,1,0.3,1) ${drawDelay + delay}ms both`,
          transformOrigin: "60px 60px",
        }
      : undefined;

  return (
    <svg
      aria-hidden
      className={className}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
    >
      <g stroke={color} strokeWidth={1} strokeLinecap="square">
        <circle cx="60" cy="60" r="56" opacity={0.5} style={line(LEN.ring56, 0)} />
        <circle cx="60" cy="60" r="50" style={line(LEN.ring50, 90)} />
        <circle cx="60" cy="60" r="26" opacity={0.6} style={line(LEN.ring26, 240)} />

        {/* Tumpal memancar */}
        {spokes.map((p, i) => (
          <g key={i} transform={`rotate(${p.deg} 60 60)`}>
            <path
              d="M60 18 L67 32 L60 27 L53 32 Z"
              fill={color}
              stroke="none"
              style={seed(760 + i * 55)}
            />
            <path d="M60 34 L60 44" strokeWidth={0.9} style={line(LEN.stem, 700 + i * 55)} />
          </g>
        ))}

        {/* Titik-titik benang di cincin luar */}
        {dots.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={0.9}
            fill={color}
            stroke="none"
            opacity={0.8}
            style={seed(980 + i * 26)}
          />
        ))}

        {/* Pusat: dua belah ketupat bertaut */}
        <path d="M60 46 L74 60 L60 74 L46 60 Z" style={line(LEN.diamond, 420)} />
        <path d="M60 52 L68 60 L60 68 L52 60 Z" fill={color} stroke="none" style={seed(1180)} />
      </g>
    </svg>
  );
}
