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

export function TenunEmblem({
  className,
  size = 120,
  color = "currentColor",
}: {
  className?: string;
  size?: number;
  color?: string;
}) {
  const spokes = radial(8, 38);
  const dots = radial(16, 52);

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
        <circle cx="60" cy="60" r="56" opacity={0.5} />
        <circle cx="60" cy="60" r="50" />
        <circle cx="60" cy="60" r="26" opacity={0.6} />

        {/* Tumpal memancar */}
        {spokes.map((p, i) => (
          <g key={i} transform={`rotate(${p.deg} 60 60)`}>
            <path d="M60 18 L67 32 L60 27 L53 32 Z" fill={color} stroke="none" />
            <path d="M60 34 L60 44" strokeWidth={0.9} />
          </g>
        ))}

        {/* Titik-titik benang di cincin luar */}
        {dots.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={0.9} fill={color} stroke="none" opacity={0.8} />
        ))}

        {/* Pusat: dua belah ketupat bertaut */}
        <path d="M60 46 L74 60 L60 74 L46 60 Z" />
        <path d="M60 52 L68 60 L60 68 L52 60 Z" fill={color} stroke="none" />
      </g>
    </svg>
  );
}
